import { unzip } from 'fflate';

/**
 * Open an IDML package in the browser: check it is one, then unzip it with
 * fflate's async `unzip` (off the main thread for the larger entries).
 *
 * Nothing here trusts the archive. The entry count and the declared sizes are
 * capped before anything is inflated, and fflate inflates each entry into a
 * buffer of exactly its declared size, so a forged header cannot grow the
 * output past the cap (a zip bomb). Every refusal comes back as a
 * `PackageError` whose message is meant for the reader, not the console.
 */
export const IDML_MIMETYPE = 'application/vnd.adobe.indesign-idml-package';

export const LIMITS = {
  /** The dropped file itself. */
  fileBytes: 300 * 1024 * 1024,
  entries: 20_000,
  /** Sum of the declared uncompressed sizes. */
  totalBytes: 512 * 1024 * 1024,
};

export type EntryKind = 'xml' | 'text' | 'font' | 'image' | 'binary';

export interface PackageEntry {
  path: string;
  /** Uncompressed size in bytes. */
  size: number;
  /** Size inside the archive. */
  compressedSize: number;
  /** 0 = stored, 8 = deflated. */
  compression: number;
  kind: EntryKind;
  bytes: Uint8Array;
}

export interface IdmlPackage {
  name: string;
  fileSize: number;
  /** The archive bytes as dropped; the renderer reads these. */
  bytes: Uint8Array;
  /** In archive (central directory) order. */
  entries: PackageEntry[];
  byPath: Map<string, PackageEntry>;
  /** InDesign writes `mimetype` first and uncompressed; other writers may not. */
  mimetypeFirstAndStored: boolean;
}

export class PackageError extends Error {
  constructor(
    message: string,
    /** What the reader can do about it. */
    readonly hint?: string,
  ) {
    super(message);
    this.name = 'PackageError';
  }
}

const FONT_EXT = /\.(otf|ttf|ttc|otc|pfb|pfm|dfont)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?|svg)$/i;

function kindOf(path: string): EntryKind {
  if (/\.xml$/i.test(path)) return 'xml';
  if (path === 'mimetype' || /\.(txt|json)$/i.test(path)) return 'text';
  if (FONT_EXT.test(path)) return 'font';
  if (IMAGE_EXT.test(path)) return 'image';
  return 'binary';
}

const decoder = new TextDecoder('utf-8');
const texts = new WeakMap<PackageEntry, string>();

/** An entry's UTF-8 text, decoded once (BOM stripped). */
export function entryText(entry: PackageEntry): string {
  let t = texts.get(entry);
  if (t === undefined) {
    t = decoder.decode(entry.bytes);
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    texts.set(entry, t);
  }
  return t;
}

// A binary InDesign document (.indd / .indt) starts with this 16-byte GUID.
const INDD_MAGIC = [0x06, 0x06, 0xed, 0xf5, 0xd8, 0x1d, 0x46, 0xe5, 0xbd, 0x31, 0xef, 0xe7, 0xfe, 0x74, 0xb7, 0x1d];
const EXPORT_HINT = 'In InDesign, choose File ▸ Save As… (or Export…) and pick “InDesign Markup (IDML)”.';

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  return sig.every((b, i) => bytes[i] === b);
}

/** Name the thing that was dropped when it is not a ZIP at all. */
function notAZip(bytes: Uint8Array): PackageError {
  if (startsWith(bytes, INDD_MAGIC)) {
    return new PackageError('This is a binary InDesign document (.indd), not an IDML package.', EXPORT_HINT);
  }
  const head = decoder.decode(bytes.subarray(0, 512)).trimStart();
  if (head.startsWith('<?xml') || head.startsWith('<')) {
    return new PackageError(
      'This is a single XML file, not an IDML package.',
      'An IDML package is a ZIP of many XML parts. A lone XML file may be an InDesign snippet (.idms) or one part taken out of a package.',
    );
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) {
    return new PackageError('This is a PDF, not an IDML package.', EXPORT_HINT);
  }
  return new PackageError('This file is not a ZIP archive, so it cannot be an IDML package.', EXPORT_HINT);
}

/** Name the package when it is a ZIP of some other kind. */
function otherPackage(mimetype: string | undefined, paths: string[]): PackageError {
  if (mimetype === 'application/epub+zip') {
    return new PackageError('This is an EPUB, not an IDML package.', EXPORT_HINT);
  }
  if (mimetype?.startsWith('application/vnd.oasis.opendocument')) {
    return new PackageError(`This is an OpenDocument file (${mimetype}), not an IDML package.`);
  }
  if (paths.includes('[Content_Types].xml')) {
    return new PackageError('This is a Microsoft Office file (Word, Excel or PowerPoint), not an IDML package.');
  }
  if (mimetype) {
    return new PackageError(`This ZIP declares the type “${mimetype.slice(0, 80)}”, not an IDML package.`);
  }
  return new PackageError(
    'This ZIP has no mimetype entry, so it is not an IDML package.',
    'Every IDML package carries a “mimetype” file naming its type. ' + EXPORT_HINT,
  );
}

/** Unzip `bytes` and confirm it is an IDML package. Rejects with a `PackageError`. */
export async function readIdmlPackage(bytes: Uint8Array, name: string): Promise<IdmlPackage> {
  if (bytes.length > LIMITS.fileBytes) {
    throw new PackageError(
      `This file is ${formatBytes(bytes.length)}; the inspector opens packages up to ${formatBytes(LIMITS.fileBytes)}.`,
    );
  }
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && !startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) throw notAZip(bytes);

  type Info = { path: string; size: number; compressedSize: number; compression: number };
  const infos: Info[] = [];
  let declared = 0;
  let refused: PackageError | undefined;

  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(
      bytes,
      {
        // Runs for every central-directory entry before any is inflated.
        filter(file) {
          if (refused) return false;
          if (file.name.endsWith('/')) return false; // directory record
          infos.push({ path: file.name, size: file.originalSize, compressedSize: file.size, compression: file.compression });
          declared += file.originalSize;
          if (infos.length > LIMITS.entries) {
            refused = new PackageError(`This archive has more than ${LIMITS.entries.toLocaleString('en')} entries; the inspector stops there.`);
          } else if (declared > LIMITS.totalBytes) {
            refused = new PackageError(
              `This archive unpacks to more than ${formatBytes(LIMITS.totalBytes)}; the inspector stops there.`,
            );
          } else if (file.compression !== 0 && file.compression !== 8) {
            refused = new PackageError(`The entry “${file.name}” uses a compression method (${file.compression}) the inspector cannot read.`);
          }
          return !refused;
        },
      },
      (err, out) => (err ? reject(err) : resolve(out)),
    );
  }).catch((e: unknown) => {
    if (e instanceof PackageError) throw e;
    throw new PackageError('This ZIP archive is damaged and cannot be read.', e instanceof Error ? e.message : undefined);
  });
  if (refused) throw refused;

  const entries: PackageEntry[] = infos
    .filter((i) => files[i.path])
    .map((i) => ({ ...i, kind: kindOf(i.path), bytes: files[i.path] }));
  const byPath = new Map(entries.map((e) => [e.path, e]));

  const mt = byPath.get('mimetype');
  const mimetype = mt ? entryText(mt).trim() : undefined;
  if (mimetype !== IDML_MIMETYPE) throw otherPackage(mimetype, entries.map((e) => e.path));
  if (!byPath.has('designmap.xml')) {
    throw new PackageError(
      'This package says it is IDML but has no designmap.xml, the part that names every other part.',
      'It may be truncated or written by a tool that does not follow the format.',
    );
  }

  return {
    name,
    fileSize: bytes.length,
    bytes,
    entries,
    byPath,
    mimetypeFirstAndStored: infos[0]?.path === 'mimetype' && infos[0].compression === 0,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
