'use client';

import { useMemo, useState } from 'react';
import { formatBytes, type PackageEntry } from '@/lib/inspector/unzip';
import { mono, muted } from './styles';

/**
 * The package as a folder tree: every entry with its uncompressed size, folders
 * with their entry count and total. Clicking an entry selects it for the part
 * view. A folder of more than `OPEN_LIMIT` entries starts closed (a long book
 * can carry thousands of stories).
 */
interface Folder {
  name: string;
  path: string;
  folders: Folder[];
  files: PackageEntry[];
  size: number;
  count: number;
}

const OPEN_LIMIT = 40;

function buildTree(entries: PackageEntry[]): Folder {
  const root: Folder = { name: '', path: '', folders: [], files: [], size: 0, count: 0 };
  for (const e of entries) {
    const parts = e.path.split('/');
    let at = root;
    at.size += e.size;
    at.count++;
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join('/');
      let next = at.folders.find((f) => f.name === parts[i]);
      if (!next) at.folders.push((next = { name: parts[i], path, folders: [], files: [], size: 0, count: 0 }));
      next.size += e.size;
      next.count++;
      at = next;
    }
    at.files.push(e);
  }
  const sort = (f: Folder) => {
    // The two parts every reader starts from, then folders, then files by name.
    const rank = (p: string) => (p === 'mimetype' ? 0 : p === 'designmap.xml' ? 1 : 2);
    f.files.sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path, 'en', { numeric: true }));
    f.folders.sort((a, b) => a.name.localeCompare(b.name));
    f.folders.forEach(sort);
  };
  sort(root);
  return root;
}

const row = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  width: '100%',
  padding: '2px 6px',
  border: 0,
  borderRadius: 2,
  background: selected ? 'var(--color-accent-soft)' : 'transparent',
  boxShadow: selected ? 'inset 2px 0 0 var(--color-accent)' : 'none',
  color: selected ? 'var(--color-ink)' : 'var(--color-ink-soft)',
  textAlign: 'left',
  cursor: 'pointer',
  ...mono,
  lineHeight: 1.6,
});

const size: React.CSSProperties = { ...muted, marginLeft: 'auto', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

function FileRow({ entry, selected, onSelect }: { entry: PackageEntry; selected: boolean; onSelect: (p: string) => void }) {
  return (
    <li>
      <button type="button" style={row(selected)} onClick={() => onSelect(entry.path)} aria-current={selected ? 'true' : undefined} title={entry.path}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{entry.path.split('/').pop()}</span>
        <span style={size}>{formatBytes(entry.size)}</span>
      </button>
    </li>
  );
}

function FolderNode({ folder, selected, onSelect }: { folder: Folder; selected: string | null; onSelect: (p: string) => void }) {
  const holdsSelection = selected?.startsWith(folder.path + '/') ?? false;
  const [open, setOpen] = useState(folder.count <= OPEN_LIMIT || holdsSelection);
  return (
    <li>
      <button type="button" style={{ ...row(false), color: 'var(--color-ink)' }} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span aria-hidden style={{ width: 10, display: 'inline-block', ...muted }}>
          {open ? '▾' : '▸'}
        </span>
        <span>{folder.name}/</span>
        <span style={size}>
          {folder.count} · {formatBytes(folder.size)}
        </span>
      </button>
      {open && (
        <ul style={{ listStyle: 'none', margin: '0 0 0 9px', padding: '0 0 0 6px', borderLeft: '1px solid var(--color-rule)' }}>
          <Contents folder={folder} selected={selected} onSelect={onSelect} />
        </ul>
      )}
    </li>
  );
}

function Contents({ folder, selected, onSelect }: { folder: Folder; selected: string | null; onSelect: (p: string) => void }) {
  return (
    <>
      {folder.files.map((e) => (
        <FileRow key={e.path} entry={e} selected={e.path === selected} onSelect={onSelect} />
      ))}
      {folder.folders.map((f) => (
        <FolderNode key={f.path} folder={f} selected={selected} onSelect={onSelect} />
      ))}
    </>
  );
}

export function PackageTree({
  entries,
  selected,
  onSelect,
}: {
  entries: PackageEntry[];
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const root = useMemo(() => buildTree(entries), [entries]);
  return (
    <nav aria-label="Package contents">
      <ul style={{ listStyle: 'none', margin: 0, padding: '8px 6px' }}>
        <Contents folder={root} selected={selected} onSelect={onSelect} />
      </ul>
    </nav>
  );
}
