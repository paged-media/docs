#!/usr/bin/env node
/**
 * gen-idml-reference — builds the IDML element reference (idml.paged.media
 * /reference/<element>/) from four sources, none of them hand-written prose:
 *
 *   data/idml-census.json          what real documents contain: every element,
 *                                  the parts and parents it appears in, its
 *                                  attributes, how many of the corpus's documents
 *                                  use each, and closed-vocabulary values
 *                                  (aggregates only; corpus/harness/attr-census.mjs)
 *   idml-coverage (plugin-publish)  which (element, attribute) pairs Paged's IDML
 *                                  importer reads and its exporter writes
 *   core-catalog propertySchemas   the typed property behind an attribute: type,
 *                                  enum members, range, default, `paged.set` path
 *   data/idml-reference-overrides.json  reviewed per-attribute notes (optional)
 *
 * Writes .generated/idml-reference.json, and one stub page per element under
 * content/docs/idml/reference/ (gitignored; regenerated before every build), so
 * the pages get search, the sidebar, llms.txt and the sitemap like any other.
 * Element pages link back to the chapter pages that discuss the element and to
 * the examples that show it, both found by scanning the content and manifests.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GEN = join(ROOT, '.generated');
const CONTENT = join(ROOT, 'content', 'docs', 'idml');
const PAGES = join(CONTENT, 'reference');
const EXAMPLES = join(ROOT, 'examples');

const readJSON = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

const census = readJSON(join(ROOT, 'data', 'idml-census.json'));
const coverage = readJSON(join(GEN, 'sources', 'idml-coverage', 'idml-coverage.json'));
const catalog = readJSON(join(GEN, 'sources', 'core-catalog', 'catalog.json'));
const overrides = readJSON(join(ROOT, 'data', 'idml-reference-overrides.json')) ?? {};

if (!census) {
  console.warn('gen-idml-reference: data/idml-census.json missing — no element reference generated');
  process.exit(0);
}
const DOCS = census.totals.documents;

/** TextFramePreference → text-frame-preference; idPkg:Story → idpkg-story; XMLTag → xml-tag. */
export function slugOf(name) {
  return name
    .replace(/:/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

// ── Paged's reader and writer: (element, attribute) → {imported, exported} ──
const pagedAttr = new Map();
const pagedElements = new Set();
for (const row of coverage?.rows ?? []) {
  const key = `${row.element}@${row.attribute}`;
  const prev = pagedAttr.get(key) ?? { imported: false, exported: false };
  pagedAttr.set(key, { imported: prev.imported || !!row.imported, exported: prev.exported || !!row.exported });
  if (row.imported) pagedElements.add(row.element);
}

// ── Typed properties: (element, attribute) → schema row ──
const typed = new Map();
for (const row of catalog?.propertySchemas ?? []) {
  for (const m of row.idml ?? []) {
    typed.set(`${m.element}@${m.attribute}`, {
      path: row.path,
      type: row.type,
      range: row.range ?? null,
      default: row.default ?? null,
      access: row.access ?? null,
    });
  }
}
// Older catalogs: the curated `elements` rows still link ~46 attributes to a path.
for (const el of catalog?.elements ?? []) {
  for (const a of el.attributes ?? []) {
    const key = `${el.name}@${a.name}`;
    if (!typed.has(key) && a.settablePath) typed.set(key, { path: a.settablePath, typeHint: a.typeHint });
  }
}
const curated = new Map((catalog?.elements ?? []).map((el) => [el.name, el]));

// ── Which pages discuss an element: count `ElementName` / <ElementName mentions ──
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (p !== PAGES) walk(p, out);
    } else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}
const pageInfo = walk(CONTENT).map((file) => {
  const src = readFileSync(file, 'utf8');
  const title = src.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '') ?? '';
  const rel = relative(CONTENT, file).replace(/\\/g, '/').replace(/\.mdx$/, '').replace(/(^|\/)index$/, '');
  return { href: `/docs/idml/${rel}`, title, src };
});
function pagesMentioning(name) {
  const re = new RegExp('[`<]' + name.replace(/[:]/g, '\\:') + '[\\s`>/]', 'g');
  return pageInfo
    .map((p) => ({ href: p.href, title: p.title, n: (p.src.match(re) ?? []).length }))
    .filter((p) => p.n > 0)
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title))
    .slice(0, 6)
    .map(({ href, title }) => ({ href, title }));
}

// ── Examples that declare the element ──
const examplesFor = new Map();
for (const id of existsSync(EXAMPLES) ? readdirSync(EXAMPLES) : []) {
  const m = readJSON(join(EXAMPLES, id, 'example.json'));
  for (const el of m?.elements ?? []) {
    if (!examplesFor.has(el)) examplesFor.set(el, []);
    examplesFor.get(el).push({ id, title: m.title });
  }
}

// ── Selection: elements with something to say ──
const metadataOnly = (e) => Object.keys(e.parts).every((p) => p === 'META-INF');
const selected = census.elements.filter((e) => {
  if (metadataOnly(e)) return false;
  if (pagedElements.has(e.element)) return true;
  const hasContent = Object.keys(e.attributes).length > 0 || Object.keys(e.children ?? {}).length > 0;
  return e.docCount >= 3 && hasContent;
});
const selectedNames = new Set(selected.map((e) => e.element));

const pct = (n) => Math.round((n / DOCS) * 1000) / 10;

const elements = selected
  .map((e) => {
    const attributes = Object.entries(e.attributes)
      .map(([name, a]) => {
        const key = `${e.element}@${name}`;
        const paged = pagedAttr.get(key) ?? null;
        return {
          name,
          kind: a.kinds?.['properties-child'] && !a.kinds?.attribute ? 'properties-child' : 'attribute',
          docCount: a.docCount,
          share: pct(a.docCount),
          types: Object.keys(a.types ?? {}),
          values: a.values ?? null,
          refKinds: a.refKinds ? Object.keys(a.refKinds) : null,
          propertyTypes: a.propertyTypes ? Object.keys(a.propertyTypes) : null,
          paged: coverage ? { imported: !!paged?.imported, exported: !!paged?.exported } : null,
          typed: typed.get(key) ?? null,
          note: overrides[key]?.note ?? null,
        };
      })
      .sort((a, b) => b.docCount - a.docCount || a.name.localeCompare(b.name));
    const link = (names) =>
      Object.entries(names ?? {})
        .sort((a, b) => b[1] - a[1])
        .map(([name, n]) => ({ name, docCount: n, slug: selectedNames.has(name) ? slugOf(name) : null }));
    return {
      name: e.element,
      slug: slugOf(e.element),
      summary: curated.get(e.element)?.summary ?? overrides[e.element]?.summary ?? null,
      docCount: e.docCount,
      share: pct(e.docCount),
      // XML/ holds the backing story every InDesign file carries, so it outnumbers
      // the real content parts; it ranks last unless it is the only place.
      parts: Object.entries(e.parts)
        .sort((a, b) => (a[0] === 'XML') - (b[0] === 'XML') || b[1] - a[1])
        .map(([part, n]) => ({ part, docCount: n })),
      parents: link(e.parents),
      children: link(e.children),
      attributes,
      paged: coverage
        ? {
            reads: pagedElements.has(e.element),
            attributesRead: attributes.filter((a) => a.paged?.imported).length,
            attributesWritten: attributes.filter((a) => a.paged?.exported).length,
          }
        : null,
      examples: examplesFor.get(e.element) ?? [],
      pages: pagesMentioning(e.element),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

mkdirSync(GEN, { recursive: true });
writeFileSync(
  join(GEN, 'idml-reference.json'),
  JSON.stringify(
    {
      documents: DOCS,
      censusDate: census.generatedAt,
      coverage: coverage ? { rows: coverage.rows?.length ?? 0 } : null,
      typedLinks: typed.size,
      elements,
    },
    null,
    1,
  ),
);

// ── Stub pages ──
rmSync(PAGES, { recursive: true, force: true });
mkdirSync(PAGES, { recursive: true });
const yaml = (s) => JSON.stringify(s);
const partWord = (e) => e.parts[0]?.part ?? 'the package';
for (const el of elements) {
  const n = el.attributes.length;
  const description = `The ${el.name} element in IDML: where it appears (${partWord(el)}), its ${n} attribute${n === 1 ? '' : 's'}, their values, and how real documents use them.`.slice(0, 160);
  writeFileSync(
    join(PAGES, `${el.slug}.mdx`),
    `---\ntitle: ${yaml(el.name)}\ndescription: ${yaml(description)}\ntier: pro\ndiataxis: reference\nstatus: published\nowner: paged-docs\n---\n\n<ElementReference name=${yaml(el.name)} />\n`,
  );
}
writeFileSync(
  join(PAGES, 'index.mdx'),
  `---\ntitle: "Element reference"\ndescription: ${yaml(`Every IDML element found in ${DOCS} real documents: where it lives in the package, its attributes and values, and what Paged reads and writes.`)}\ntier: pro\ndiataxis: reference\nstatus: published\nowner: paged-docs\n---\n\n<ElementIndex />\n`,
);
writeFileSync(
  join(PAGES, 'meta.json'),
  JSON.stringify({ title: 'Element reference', icon: 'xml', pages: ['index', ...elements.map((e) => e.slug)] }, null, 2) + '\n',
);

console.log(
  `gen-idml-reference: ${elements.length} element pages (of ${census.elements.length} in the census)` +
    `, coverage ${coverage ? 'yes' : 'no'}, ${typed.size} typed links`,
);
