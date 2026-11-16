#!/usr/bin/env node
/**
 * gen-idml-reference — builds the IDML element reference (idml.paged.media
 * /reference/<element>/) from four sources, none of them hand-written prose:
 *
 *   data/idml-census.json          what real documents contain: every element,
 *                                  the parts and parents it appears in, its
 *                                  attributes, how many of the corpus's documents
 *                                  use each, and closed-vocabulary values
 *                                  (aggregates only; corpus/harness/attr-census.mjs).
 *                                  Schema /1 or /2; /2 adds each attribute's parts
 *                                  and how many documents depart from its usual value
 *   idml-coverage (engine/core)     which (element, attribute) pairs Paged's IDML
 *                                  importer reads and its exporter writes, and
 *                                  (newer files) from which package parts
 *   core-catalog propertySchemas   the typed property behind an attribute: type,
 *                                  enum members, range, default, `paged.set` path
 *   data/idml-reference-overrides.json  reviewed notes: `Element@Attribute` for one
 *                                  element, `*@Attribute` shared by all (optional)
 *
 * and, for the separate Paged support panel only (ADR 809): the capability
 * record (cockpit public.json; a feature is linked when its title names the
 * element), the importer and exporter source lines idml-coverage records, the
 * engine release in core.pin, and the commits sources.lock.json resolved.
 *
 * Writes .generated/idml-reference.json, and one stub page per element under
 * content/docs/idml/reference/ (gitignored; regenerated before every build), so
 * the pages get search, the sidebar, llms.txt and the sitemap like any other.
 * A stub is the entry's outline: one heading per section, in the order a reader
 * needs them (definition, structure, visualization, behavior, evidence, then
 * Paged support), so each section has an anchor and a place in the page's
 * contents. Element pages link back to the chapter pages that discuss the
 * element and to the examples that show it, both found by scanning the content
 * and manifests; an example's InDesign stamp counts only while its parts hash
 * still matches (ADR 806).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
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
const record = readJSON(join(GEN, 'sources', 'cockpit', 'public.json'));
const lock = readJSON(join(GEN, 'sources.lock.json'));
const enginePin = (() => {
  try {
    return readFileSync(join(ROOT, 'core.pin'), 'utf8').match(/Currently: (v[0-9.]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
})();
const ORG_REPO = 'https://github.com/paged-media/paged';

/**
 * An attribute's note: the element's own (`Element@Attribute`), else the one
 * the attribute shares across elements (`*@Attribute`), unless that lists
 * the element in `except` or the chapters already describe the attribute here.
 */
function noteOf(element, name, explained) {
  const own = overrides[`${element}@${name}`]?.note;
  if (own) return own;
  const shared = overrides[`*@${name}`];
  if (!shared?.note || shared.except?.includes(element) || explained?.description) return null;
  return shared.note;
}

if (!census) {
  console.warn('gen-idml-reference: data/idml-census.json missing — no element reference generated');
  process.exit(0);
}
// /2 keeps every /1 field and adds per-attribute `parts` and `nonModalDocs`.
const CENSUS_SCHEMAS = ['paged.idml-census/1', 'paged.idml-census/2'];
if (!CENSUS_SCHEMAS.includes(census.schema)) {
  console.error(`gen-idml-reference: data/idml-census.json has schema ${census.schema}; this generator reads ${CENSUS_SCHEMAS.join(' and ')}`);
  process.exit(1);
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

// ── Paged's reader and writer: (element, attribute) → {imported, exported, readParts, sources} ──
// `readParts` (the package parts the importer reads it from) comes with newer
// coverage files; null when the file predates it. `importSource` and
// `exportSource` are the first line (engine/core-relative) that reads or
// writes it, as idml-coverage found them.
const srcOf = (s) => (s && typeof s.file === 'string' && Number.isInteger(s.line) ? { file: s.file, line: s.line } : null);
const pagedAttr = new Map();
const pagedElements = new Set();
for (const row of coverage?.rows ?? []) {
  const key = `${row.element}@${row.attribute}`;
  const prev = pagedAttr.get(key) ?? { imported: false, exported: false, readParts: null, importSource: null, exportSource: null };
  const readParts = Array.isArray(row.importParts) ? [...new Set([...(prev.readParts ?? []), ...row.importParts])].sort() : prev.readParts;
  pagedAttr.set(key, {
    imported: prev.imported || !!row.imported,
    exported: prev.exported || !!row.exported,
    readParts,
    importSource: prev.importSource ?? (row.imported ? srcOf(row.source) : null),
    exportSource: prev.exportSource ?? (row.exported ? srcOf(row.exportSource) : null),
  });
  if (row.imported) pagedElements.add(row.element);
}
/** Read, but from none of the parts the census finds it in. */
const misplacedRead = (paged, parts) =>
  !!(paged?.imported && paged.readParts?.length && parts?.length && !paged.readParts.some((p) => parts.includes(p)));

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
  return { href: `/docs/idml/${rel}`, title, src, sections: sectionsOf(src.replace(/^---[\s\S]*?---/, '')) };
});
/**
 * A page's prose as sections (## / ### headings) of blocks — paragraphs and list
 * items — skipping fenced code and JSX lines. Each heading keeps the anchor the
 * site gives it (github-slugger rules over the heading's plain text).
 */
function sectionsOf(src) {
  const out = [{ heading: null, anchor: null, blocks: [] }];
  let cur = [];
  let fence = false;
  const flush = () => {
    if (cur.length) out[out.length - 1].blocks.push(cur.join(' ').trim());
    cur = [];
  };
  for (const line of src.split('\n')) {
    if (/^\s*```/.test(line)) {
      fence = !fence;
      flush();
      continue;
    }
    if (fence) continue;
    const h = line.match(/^#{2,3}\s+(.*)$/);
    if (h) {
      flush();
      const heading = h[1].trim();
      out.push({ heading, anchor: slugify(plainText(heading)), blocks: [] });
      continue;
    }
    if (/^\s*$/.test(line) || /^\s*([-*]|\d+\.)\s/.test(line) || /^\s*>/.test(line) || /^\s*<[A-Z/]/.test(line)) flush();
    if (/^\s*$/.test(line) || /^\s*<[A-Z/]/.test(line)) continue;
    cur.push(line.trim());
  }
  flush();
  return out;
}
/** Markdown → plain text, keeping code spans' text. */
function plainText(md) {
  return md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/`([^`]*)`/g, '$1');
}
/** github-slugger, which Fumadocs uses for heading anchors. */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/ /g, '-');
}
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
// Each with its concept, the page section that embeds it, and — while the
// InDesign stamp still matches the parts (ADR 806) — the stamp and InDesign's
// page 1 raster (staged to /examples/<id>/ by stage-verified.mjs).

/** sha256 over the sorted `<path>\0<sha256>\n` lines of a package's parts (lib/parts-hash.ts). */
function partsHash(dir) {
  const files = [];
  const walkParts = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walkParts(p);
      else if (name !== '.DS_Store') files.push(relative(dir, p).split(sep).join('/'));
    }
  };
  walkParts(dir);
  const lines = files.sort().map((rel) => `${rel}\0${createHash('sha256').update(readFileSync(join(dir, rel))).digest('hex')}\n`);
  return `sha256:${createHash('sha256').update(lines.join('')).digest('hex')}`;
}

/** A WebP's pixel size from its header (VP8, VP8L or VP8X), or null. */
function webpSize(file) {
  try {
    const b = readFileSync(file);
    if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  } catch {
    /* no raster */
  }
  return null;
}

/** The first page section that embeds an example: `{ href, page }`, or null. */
function embedOf(id) {
  const re = new RegExp(`<ExampleEmbed[^>]*\\bexample=["']${escRe(id)}["']`);
  for (const p of pageInfo) {
    const m = p.src.match(re);
    if (!m) continue;
    const before = p.src.slice(0, m.index).replace(/^---[\s\S]*?---/, '');
    let fence = false;
    let heading = null;
    for (const line of before.split('\n')) {
      if (/^\s*```/.test(line)) fence = !fence;
      const h = !fence && line.match(/^#{2,3}\s+(.*)$/);
      if (h) heading = h[1].trim();
    }
    return { href: `${p.href}${heading ? `#${slugify(plainText(heading))}` : ''}`, page: p.title };
  }
  return null;
}

const examplesFor = new Map();
for (const id of existsSync(EXAMPLES) ? readdirSync(EXAMPLES).sort() : []) {
  const m = readJSON(join(EXAMPLES, id, 'example.json'));
  if (!m) continue;
  const v = m.verified;
  const current = v?.status === 'verified' && existsSync(join(EXAMPLES, id, m.packageDir ?? 'package')) && v.partsHash === partsHash(join(EXAMPLES, id, m.packageDir ?? 'package'));
  const size = current ? webpSize(join(EXAMPLES, id, '_verified', 'p1.webp')) : null;
  const embed = embedOf(id);
  const entry = {
    id,
    title: m.title,
    concept: m.concept ?? null,
    href: embed?.href ?? null,
    page: embed?.page ?? null,
    verified: current
      ? {
          status: v.status,
          indesignVersion: v.indesignVersion ?? null,
          verifiedAt: v.verifiedAt ?? null,
          pages: v.pages ?? null,
          roundTrip: !!v.roundTrip,
          fidelity: v.fidelity ?? null,
        }
      : null,
    raster: size
      ? {
          src: `/examples/${id}/p1.webp`,
          src3x: existsSync(join(EXAMPLES, id, '_verified', 'p1@3x.webp')) ? `/examples/${id}/p1@3x.webp` : null,
          ...size,
        }
      : null,
  };
  const declared = m.elements ?? [];
  declared.forEach((el, pos) => {
    if (!examplesFor.has(el)) examplesFor.set(el, []);
    examplesFor.get(el).push({ entry, pos, of: declared.length });
  });
}
/**
 * An element's examples, the most focused first: those that declare it earlier
 * in their `elements`, then those about fewer elements. The first with an
 * InDesign raster is the entry's specimen.
 */
const examplesOf = (name) =>
  (examplesFor.get(name) ?? [])
    .slice()
    .sort((a, b) => a.pos - b.pos || a.of - b.of || a.entry.id.localeCompare(b.entry.id))
    .map((x) => x.entry);

// ── Capability record features that name the element in their title ──
// Only features of the record's format chapters (group `format`): an editor
// panel or a spreadsheet feature may say "Cell" or "Image" about something else.
// `TextFrame AutoSizing` names TextFrame; `Page-item kinds` does not name Page.
const formatChapters = new Set((record?.chapters ?? []).filter((c) => c.group === 'format').map((c) => c.id));
const recordFeatures = (Array.isArray(record?.features) ? record.features : []).filter((f) => formatChapters.has(f.chapter));
function featuresNaming(name) {
  const re = new RegExp(`(?<![\\w-])${escRe(name)}(?![\\w-])`);
  return recordFeatures.filter((f) => typeof f.title === 'string' && re.test(f.title)).map((f) => f.id);
}

// ── Where an attribute is explained: a section of our own prose ──
// A section counts for (element, attribute) when its heading names the element
// ("The `Page` element", "`<GradientStop>`"), or when it names no element at
// all and sits on one of the two pages that discuss the element most. That
// keeps Page from borrowing what a "The `Spread` element" section says about
// ItemTransform. Inside it, a block that LEADS with the attribute in bold
// (`- **\`TextColumnCount\`**: the number of columns`) is its description; any
// mention in code is enough for a link.
const censusNames = new Set(census.elements.map((e) => e.element));
const headingElements = (heading) =>
  new Set([...(heading ?? '').matchAll(/`<?\/?([A-Za-z_][\w:.-]*)[^`]*`/g)].map((m) => m[1]).filter((n) => censusNames.has(n)));

function explanationOf(elName, attr, topPages) {
  const lead = new RegExp('^(?:[-*]\\s+)?\\*\\*`' + escRe(attr) + '(?:="[^"]*")?`');
  const mention = new RegExp('`' + escRe(attr) + '(?:="[^"]*")?`');
  let link = null;
  for (const page of pageInfo) {
    const top = topPages.includes(page.href);
    for (const sec of page.sections) {
      const named = headingElements(sec.heading);
      if (!(named.has(elName) || (named.size === 0 && top))) continue;
      const at = { href: `${page.href}${sec.anchor ? `#${sec.anchor}` : ''}`, page: page.title, section: sec.heading ? plainText(sec.heading) : null };
      const block = sec.blocks.find((b) => lead.test(b));
      if (block) return { ...at, description: describe(block, attr) };
      if (!link && sec.blocks.some((b) => mention.test(b))) link = at;
    }
  }
  return link ? { ...link, description: null } : null;
}

/**
 * The description a bold-led block gives an attribute, dictionary-style:
 *   `- **\`A\`**: the number of columns.`        → `The number of columns.`
 *   `- **\`A\`**, the layer it is on;`           → `The layer it is on.`
 *   `- **\`A\`** is the horizontal offset of …`  → `The horizontal offset of …`
 *   `- **\`A\`** decides whether …`             → `Decides whether …`
 * A lead that shares its sentence with other names keeps the whole sentence
 * (`\`Self\` and \`Name\` work as on a <Color>`). First sentence only.
 */
function describe(block, attr) {
  const m = block.match(/^(?:[-*]\s+)?\*\*(.+?)\*\*(.*)$/);
  if (!m) return null;
  const onlyAttr = new RegExp('^' + escRe(attr) + '(="[^"]*")?$').test(m[1].replace(/`/g, '').trim());
  const after = m[2];
  let text;
  // "and `Name` work as…", "with `X`: …" — the sentence is about more than A.
  const shared = /^\s+(and|or|plus|with)\b/.test(after) || /,\s+(is|are)\s/.test(after);
  if (onlyAttr && !shared && /^\s*[:—–]\s*/.test(after)) text = after.replace(/^\s*[:—–]\s*/, '');
  else if (onlyAttr && !shared && /^\s*,\s+[a-z]/.test(after)) text = after.replace(/^\s*,\s+/, '');
  else if (onlyAttr && !shared && /^\s+[a-z]/.test(after)) text = after.trim().replace(/^(is|are)\s+/, '');
  else text = `${m[1]}${after}`;
  text = text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .trim();
  let sentence = text.split(/(?<=[.!?])\s+(?=[A-Z`])/)[0].replace(/[;,:]\s*$/, '');
  if (!sentence || sentence.length < 8) return null;
  if (!/[.!?…]$/.test(sentence)) sentence += '.';
  if (sentence.length > 220) sentence = `${sentence.slice(0, 217).replace(/\s+\S*$/, '')}…`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// ── Selection: elements with something to say ──
// The census observes every element; an entry needs one that appears outside
// META-INF and either recurs (MIN_DOCS documents, with attributes or children
// of its own) or is read by Paged's importer. CensusMethod states this rule.
const MIN_DOCS = 3;
const metadataOnly = (e) => Object.keys(e.parts).every((p) => p === 'META-INF');
const recurs = (e) => e.docCount >= MIN_DOCS && (Object.keys(e.attributes).length > 0 || Object.keys(e.children ?? {}).length > 0);
const selected = census.elements.filter((e) => !metadataOnly(e) && (pagedElements.has(e.element) || recurs(e)));
const selectedNames = new Set(selected.map((e) => e.element));
const selection = {
  observed: census.elements.length,
  selected: selected.length,
  minDocs: MIN_DOCS,
  metadataOnly: census.elements.filter(metadataOnly).length,
  byImporterOnly: selected.filter((e) => !recurs(e)).length,
};

const pct = (n) => Math.round((n / DOCS) * 1000) / 10;

const elements = selected
  .map((e) => {
    const pages = pagesMentioning(e.element);
    const topPages = pages.slice(0, 2).map((p) => p.href);
    const attributes = Object.entries(e.attributes)
      .map(([name, a]) => {
        const key = `${e.element}@${name}`;
        const paged = pagedAttr.get(key) ?? null;
        const parts = a.parts ? Object.keys(a.parts) : null;
        const explained = explanationOf(e.element, name, topPages);
        return {
          name,
          kind: a.kinds?.['properties-child'] && !a.kinds?.attribute ? 'properties-child' : 'attribute',
          docCount: a.docCount,
          share: pct(a.docCount),
          types: Object.keys(a.types ?? {}),
          values: a.values ?? null,
          refKinds: a.refKinds ? Object.keys(a.refKinds) : null,
          propertyTypes: a.propertyTypes ? Object.keys(a.propertyTypes) : null,
          // census /2: where documents keep it, and how many depart from its usual value
          parts: a.parts
            ? Object.entries(a.parts)
                .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
                .map(([part, n]) => ({ part, docCount: n }))
            : null,
          nonModalDocs: typeof a.nonModalDocs === 'number' ? a.nonModalDocs : null,
          paged: coverage
            ? {
                imported: !!paged?.imported,
                exported: !!paged?.exported,
                readParts: paged?.readParts ?? null,
                misplaced: misplacedRead(paged, parts),
                importSource: paged?.importSource ?? null,
                exportSource: paged?.exportSource ?? null,
              }
            : null,
          typed: typed.get(key) ?? null,
          note: noteOf(e.element, name, explained),
          explained,
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
            attributesMisplaced: attributes.filter((a) => a.paged?.misplaced).length,
          }
        : null,
      examples: examplesOf(e.element),
      features: featuresNaming(e.element),
      pages,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// What the Paged support panel reflects, so it can say so (ADR 809).
const lockOf = (name) => lock?.sources?.[name] ?? null;
const coverageSha = lockOf('idml-coverage')?.sha ?? null;
const support = {
  engineVersion: enginePin,
  coverage: coverage
    ? {
        sha: coverageSha,
        pulledAt: lock?.generatedAt ? lock.generatedAt.slice(0, 10) : null,
        url: `${ORG_REPO}/blob/${coverageSha ?? 'main'}/engine/core/docs/reference/idml-coverage.json`,
        sourceBase: `${ORG_REPO}/blob/${coverageSha ?? 'main'}/engine/core/`,
      }
    : null,
  catalog: catalog ? { sha: lockOf('core-catalog')?.sha ?? null } : null,
  record: record ? { generatedAt: typeof record.generated_at === 'string' ? record.generated_at.slice(0, 10) : null } : null,
};

mkdirSync(GEN, { recursive: true });
writeFileSync(
  join(GEN, 'idml-reference.json'),
  JSON.stringify(
    {
      documents: DOCS,
      censusSchema: census.schema,
      censusDate: census.generatedAt,
      census: {
        date: census.generatedAt,
        schema: census.schema,
        documents: DOCS,
        byGroup: census.totals.byGroup ?? null,
        xmlParts: census.totals.xmlParts ?? null,
        elementsObserved: census.totals.elements ?? census.elements.length,
        attributesObserved: census.totals.attributes ?? null,
        rules: census.rules ?? null,
      },
      selection,
      coverage: coverage ? { rows: coverage.rows?.length ?? 0 } : null,
      typedLinks: typed.size,
      support,
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
/**
 * An entry's outline. The headings are written here, not by the component, so
 * each section gets the site's heading anchor, a permalink and a line in the
 * page's contents. A section with nothing to show for this element is left out.
 */
function entryOf(el) {
  const call = (section) => `<ElementReference name=${yaml(el.name)} section="${section}" />`;
  const out = ['## Definition', call('definition'), '## Structure'];
  if (el.parents.length || el.children.length) out.push('### Relationships', call('relationships'));
  out.push('### Attributes', call('attributes'));
  if (el.examples.some((x) => x.raster)) out.push('## Visualization', call('visualization'));
  if (el.examples.length) out.push('## Behavior', call('behavior'));
  out.push('## Evidence', call('evidence'), '## Paged support', call('support'));
  return out.join('\n\n');
}
for (const el of elements) {
  const n = el.attributes.length;
  const description = `The ${el.name} element in IDML: where it appears (${partWord(el)}), its ${n} attribute${n === 1 ? '' : 's'}, their values, and how real documents use them.`.slice(0, 160);
  writeFileSync(
    join(PAGES, `${el.slug}.mdx`),
    `---\ntitle: ${yaml(el.name)}\ndescription: ${yaml(description)}\ntier: pro\ndiataxis: reference\nstatus: published\nowner: paged-docs\n---\n\n${entryOf(el)}\n`,
  );
}
writeFileSync(
  join(PAGES, 'index.mdx'),
  `---\ntitle: "Element reference"\ndescription: ${yaml(`${elements.length} of the ${census.elements.length} IDML elements a census of ${DOCS} documents observed: where each lives in the package, its attributes and values.`)}\ntier: pro\ndiataxis: reference\nstatus: published\nowner: paged-docs\n---\n\n<ElementIndex />\n`,
);
writeFileSync(
  join(PAGES, 'meta.json'),
  JSON.stringify({ title: 'Element reference', icon: 'xml', pages: ['index', ...elements.map((e) => e.slug)] }, null, 2) + '\n',
);

const misplacedCount = elements.reduce((n, e) => n + (e.paged?.attributesMisplaced ?? 0), 0);
const withFeatures = elements.filter((e) => e.features.length).length;
const withRaster = elements.filter((e) => e.examples.some((x) => x.raster)).length;
console.log(
  `gen-idml-reference: ${elements.length} element pages (of ${census.elements.length} in the census, ${census.schema})` +
    `, coverage ${coverage ? `yes (${coverageSha?.slice(0, 7) ?? 'unpinned'})` : 'no'}, ${typed.size} typed links` +
    `, ${withFeatures} with capability features, ${withRaster} with an InDesign specimen` +
    (misplacedCount ? `, ${misplacedCount} attributes read from the wrong part` : ''),
);
