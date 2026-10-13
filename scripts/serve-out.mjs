#!/usr/bin/env node
/**
 * serve-out — serves a static export (`out/`) the way Cloudflare Pages does
 * for the browser tests: `/x/` → x/index.html, 404.html for misses, and the
 * response headers from out/_headers (public/_headers), so the page is
 * cross-origin isolated exactly as in production. Host-scoped rules
 * (`https://…`) are production-only and skipped.
 *
 *   node scripts/serve-out.mjs [dir=out] [port=3210]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'out');
const PORT = Number(process.argv[3] ?? 3210);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/** `_headers` → [{ pattern, headers }] for path rules (`/…`); `*` matches any run. */
function readRules() {
  const file = join(ROOT, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: {} });
      continue;
    }
    const m = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (m && rules.length) rules[rules.length - 1].headers[m[1].toLowerCase()] = m[2];
  }
  return rules
    .filter((r) => r.pattern.startsWith('/'))
    .map((r) => ({ re: new RegExp(`^${r.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`), headers: r.headers }));
}
const RULES = readRules();

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const headers = Object.assign({}, ...RULES.filter((r) => r.re.test(path)).map((r) => r.headers));
  const candidates = path.endsWith('/')
    ? [join(ROOT, path, 'index.html')]
    : [join(ROOT, path), join(ROOT, `${path}.html`), join(ROOT, path, 'index.html')];
  for (const file of candidates) {
    if (!file.startsWith(ROOT)) break;
    try {
      if (!(await stat(file)).isFile()) continue;
      res.writeHead(200, { ...headers, 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
      return;
    } catch {
      // try the next candidate
    }
  }
  res.writeHead(404, { ...headers, 'content-type': TYPES['.html'] });
  res.end(await readFile(join(ROOT, '404.html')).catch(() => 'Not found'));
}).listen(PORT, () => console.log(`serve-out: ${ROOT} on http://localhost:${PORT}/`));
