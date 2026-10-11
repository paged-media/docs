import { entryText, type IdmlPackage, type PackageEntry } from './unzip';

/**
 * What a package holds, read from its own parts (display only; validation is the
 * renderer's job):
 *
 * - the format version, from designmap's `<?aid ?>` instruction and the
 *   `<Document DOMVersion>` attribute;
 * - counts of spreads, master spreads, stories, pages, layers, styles, swatches;
 * - fonts: what Resources/Fonts.xml declares, cross-checked against the
 *   `AppliedFont` the styles and stories use (written either as an attribute or
 *   as a `<Properties><AppliedFont>` child) and the faces under `Document fonts/`;
 * - links to placed files, from `<Link LinkResourceURI StoredState>`;
 * - part sizes, and parts the design map names that the package lacks.
 *
 * The small parts (designmap, Fonts, Styles, Graphic) go through `DOMParser`; the
 * scans across every story and spread are plain regular expressions, which stay
 * fast on multi-megabyte parts.
 */
export interface FontFace {
  style: string;
  postScriptName?: string;
  name?: string;
  status?: string;
  type?: string;
  /** Path of the matching face under `Document fonts/`, if any. */
  embedded?: string;
}

export interface FontRow {
  family: string;
  /** Declared in Resources/Fonts.xml. */
  declared: boolean;
  faces: FontFace[];
  /** How many times an `AppliedFont` names this family. */
  uses: number;
}

export interface EmbeddedFont {
  path: string;
  family: string;
  style?: string;
  size: number;
}

export interface LinkRow {
  uri: string;
  /** The file name, decoded, for display. */
  file: string;
  state?: string;
  format?: string;
  part: string;
}

export interface Count {
  label: string;
  value: number;
  note?: string;
}

export interface Summary {
  domVersion?: string;
  /** From `<?aid … product="…"?>`: the InDesign build that wrote the file. */
  product?: string;
  readerVersion?: string;
  counts: Count[];
  fonts: FontRow[];
  embeddedFonts: EmbeddedFont[];
  links: LinkRow[];
  totalBytes: number;
  largest: { path: string; size: number }[];
  /** Things a reader should know: missing parts, unparsable XML. */
  notes: string[];
}

const parser = (): DOMParser | null => (typeof DOMParser === 'undefined' ? null : new DOMParser());

function parseXml(text: string): Document | null {
  const p = parser();
  if (!p) return null;
  const doc = p.parseFromString(text, 'application/xml');
  return doc.getElementsByTagName('parsererror').length ? null : doc;
}

/** `a="1" b='2'` → { a: '1', b: '2' } */
export function attrsOf(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out[m[1]] = decodeEntities(m[2] ?? m[3] ?? '');
  return out;
}

function decodeEntities(s: string): string {
  if (!s.includes('&')) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (all, e: string) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : all;
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[e.toLowerCase()] ?? all;
  });
}

function countTags(doc: Document | null, tag: string): number {
  return doc ? doc.getElementsByTagName(tag).length : 0;
}

function countMatches(text: string, re: RegExp): number {
  let n = 0;
  re.lastIndex = 0;
  while (re.exec(text)) n++;
  return n;
}

const xmlParts = (pkg: IdmlPackage, prefix: string): PackageEntry[] =>
  pkg.entries.filter((e) => e.kind === 'xml' && e.path.startsWith(prefix));

/** `MinionPro-BoldIt.otf` → { family: 'MinionPro', style: 'BoldIt' }: a last resort when Fonts.xml has no match. */
function faceFromFileName(path: string): { family: string; style?: string } {
  const base = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  const dash = base.lastIndexOf('-');
  return dash > 0 ? { family: base.slice(0, dash), style: base.slice(dash + 1) } : { family: base };
}

function fileOfUri(uri: string): string {
  const last = uri.split(/[/\\:]/).filter(Boolean).pop() ?? uri;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function summarize(pkg: IdmlPackage): Summary {
  const notes: string[] = [];
  const text = (path: string): string | null => {
    const e = pkg.byPath.get(path);
    return e ? entryText(e) : null;
  };

  // ── designmap.xml ──
  const designmapText = text('designmap.xml') ?? '';
  const designmap = parseXml(designmapText);
  if (!designmap) notes.push('designmap.xml is not well-formed XML; the counts below come from a text scan.');

  const aidMatch = designmapText.match(/<\?aid\s([^?]*)\?>/);
  const aid = aidMatch ? attrsOf(aidMatch[1]) : {};
  const docTag = designmapText.match(/<Document\s([^>]*)>/);
  const docAttrs = docTag ? attrsOf(docTag[1]) : {};

  // Parts the design map names, by kind.
  const refs = new Map<string, string[]>();
  for (const m of designmapText.matchAll(/<idPkg:(\w+)\s+src\s*=\s*"([^"]*)"/g)) {
    const list = refs.get(m[1]) ?? [];
    list.push(decodeEntities(m[2]));
    refs.set(m[1], list);
  }
  const missing = [...refs.values()].flat().filter((src) => !pkg.byPath.has(src));
  if (missing.length) {
    notes.push(
      `The design map names ${missing.length} part${missing.length === 1 ? '' : 's'} the package lacks: ` +
        missing.slice(0, 5).join(', ') +
        (missing.length > 5 ? ', …' : '') +
        '.',
    );
  }

  // ── resources ──
  const styles = parseXml(text('Resources/Styles.xml') ?? '');
  const graphic = parseXml(text('Resources/Graphic.xml') ?? '');
  const spreads = xmlParts(pkg, 'Spreads/');
  const masters = xmlParts(pkg, 'MasterSpreads/');
  const pageCount = spreads.reduce((n, e) => n + countMatches(entryText(e), /<Page\s/g), 0);
  const masterPageCount = masters.reduce((n, e) => n + countMatches(entryText(e), /<Page\s/g), 0);

  const counts: Count[] = [
    { label: 'Spreads', value: refs.get('Spread')?.length ?? spreads.length },
    { label: 'Pages', value: pageCount },
    { label: 'Master spreads', value: refs.get('MasterSpread')?.length ?? masters.length, note: `${masterPageCount} master pages` },
    { label: 'Stories', value: refs.get('Story')?.length ?? xmlParts(pkg, 'Stories/').length },
    { label: 'Layers', value: designmap ? countTags(designmap, 'Layer') : countMatches(designmapText, /<Layer\s/g) },
    { label: 'Paragraph styles', value: countTags(styles, 'ParagraphStyle') },
    { label: 'Character styles', value: countTags(styles, 'CharacterStyle') },
    { label: 'Object styles', value: countTags(styles, 'ObjectStyle') },
    { label: 'Table + cell styles', value: countTags(styles, 'TableStyle') + countTags(styles, 'CellStyle') },
    {
      label: 'Swatches',
      value: countTags(graphic, 'Color') + countTags(graphic, 'Tint') + countTags(graphic, 'Gradient') + countTags(graphic, 'MixedInk'),
      note: `${countTags(graphic, 'Color')} colours`,
    },
  ];

  // ── fonts ──
  const rows = new Map<string, FontRow>();
  const row = (family: string): FontRow => {
    let r = rows.get(family);
    if (!r) rows.set(family, (r = { family, declared: false, faces: [], uses: 0 }));
    return r;
  };
  const fontsDoc = parseXml(text('Resources/Fonts.xml') ?? '');
  if (fontsDoc) {
    for (const f of Array.from(fontsDoc.getElementsByTagName('Font'))) {
      const family = f.getAttribute('FontFamily') ?? f.parentElement?.getAttribute('Name') ?? '';
      if (!family) continue;
      const r = row(family);
      r.declared = true;
      r.faces.push({
        style: f.getAttribute('FontStyleName') ?? '',
        postScriptName: f.getAttribute('PostScriptName') ?? undefined,
        name: f.getAttribute('Name') ?? undefined,
        status: f.getAttribute('Status') ?? undefined,
        type: f.getAttribute('FontType') ?? undefined,
      });
    }
  }

  // Every AppliedFont, attribute or Properties child, outside Fonts.xml itself.
  const appliedAttr = /\bAppliedFont\s*=\s*"([^"]*)"/g;
  const appliedChild = /<AppliedFont\b[^>]*>([^<]*)<\/AppliedFont>/g;
  for (const e of pkg.entries) {
    if (e.kind !== 'xml' || e.path === 'Resources/Fonts.xml') continue;
    const t = entryText(e);
    if (!t.includes('AppliedFont')) continue;
    for (const re of [appliedAttr, appliedChild]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(t))) {
        const family = decodeEntities(m[1]).trim();
        // `$ID/…` values are InDesign's internal placeholders, not a family.
        if (family && !family.startsWith('$ID/')) row(family).uses++;
      }
    }
  }

  // Faces shipped inside the package, matched to a declared face by PostScript name.
  const byPostScript = new Map<string, { row: FontRow; face: FontFace }>();
  for (const r of rows.values()) {
    for (const face of r.faces) {
      if (face.postScriptName) byPostScript.set(face.postScriptName.toLowerCase(), { row: r, face });
      if (face.name) byPostScript.set(face.name.toLowerCase(), { row: r, face });
    }
  }
  const embeddedFonts: EmbeddedFont[] = [];
  for (const e of pkg.entries) {
    if (!e.path.startsWith('Document fonts/') || e.kind !== 'font') continue;
    const base = e.path.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase();
    const hit = byPostScript.get(base);
    if (hit) {
      hit.face.embedded = e.path;
      embeddedFonts.push({ path: e.path, family: hit.row.family, style: hit.face.style || undefined, size: e.size });
    } else {
      embeddedFonts.push({ path: e.path, ...faceFromFileName(e.path), size: e.size });
    }
  }

  const fonts = [...rows.values()].sort((a, b) => b.uses - a.uses || a.family.localeCompare(b.family));

  // ── links ──
  const links: LinkRow[] = [];
  for (const e of pkg.entries) {
    if (e.kind !== 'xml') continue;
    const t = entryText(e);
    if (!t.includes('<Link')) continue;
    for (const m of t.matchAll(/<Link\s([^>]*)>/g)) {
      const a = attrsOf(m[1]);
      const uri = a.LinkResourceURI ?? '';
      links.push({ uri, file: fileOfUri(uri), state: a.StoredState, format: a.LinkResourceFormat, part: e.path });
    }
  }

  // ── sizes ──
  const totalBytes = pkg.entries.reduce((n, e) => n + e.size, 0);
  const largest = [...pkg.entries]
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map((e) => ({ path: e.path, size: e.size }));

  if (!pkg.mimetypeFirstAndStored) {
    notes.push('The mimetype entry is not the first, uncompressed entry, as InDesign writes it. Most readers accept this; some strict ones do not.');
  }

  return {
    domVersion: docAttrs.DOMVersion,
    product: aid.product,
    readerVersion: aid.readerVersion,
    counts,
    fonts,
    embeddedFonts,
    links,
    totalBytes,
    largest,
    notes,
  };
}
