'use client';
/**
 * The scripting lab's stage: ONE Paged editor per page, in a frame from
 * play.paged.media, shared by every lab on the page (components/mdx/scripting-lab.tsx).
 *
 * Nothing loads until a reader presses Run. The first Run makes the frame and
 * connects to it; the frame then sits over the stage of whichever lab ran last
 * (it is positioned over that lab's stage slot, not moved into it, because a
 * moved iframe reloads). Every run blanks the document, runs the seed's prelude
 * and then the script, so a script always starts from the same page.
 *
 * Two ways to talk to the editor sit behind one adapter, `StageEditor`:
 *   connect  the embedding API (embed.html, lib/editor-embed.ts): the viewer
 *            profile, so the frame is the canvas alone; `seed` in the frame's
 *            config; `fitSelection()` after each run.
 *   legacy   the older `?embed=script&seed=<name>` page and its `paged:run`
 *            message: the whole editor, drawn at half size, no fit.
 */
import { connectEditor, type ScriptResult } from '@/lib/editor-embed';
import { seedPrelude } from '@/data/scripting/seeds';
import type { SeedId } from '@/data/scripting/examples';

export const PLAYGROUND_ORIGIN = process.env.NEXT_PUBLIC_PLAYGROUND_URL || 'https://play.paged.media';

export type EmbedMode = 'connect' | 'legacy';

/**
 * The protocol the lab speaks. 'legacy' until play.paged.media serves the
 * embedding API with `seed` and `fitSelection` and lets docs.paged.media frame
 * `embed.html` (VITE_EMBED_ORIGINS); then 'connect'.
 *
 * REMOVE-LEGACY: when this is 'connect' and the deploy is verified, delete
 * `legacyStage`, `legacyUrl` and the `scale` of the legacy frame. Until then
 * `?lab-embed=connect` on a docs page tries the embedding API without a rebuild.
 */
export const LAB_EMBED: EmbedMode = 'legacy';

/** US Letter, the size of the editor's blank document (`paged.file.new`). */
const PAGE_PT = [612, 792] as const;

export function embedMode(): EmbedMode {
  try {
    const asked = new URLSearchParams(window.location.search).get('lab-embed');
    if (asked === 'connect' || asked === 'legacy') return asked;
  } catch {
    // no location: the default
  }
  return LAB_EMBED;
}

/** Where "Open in the editor" goes: the seeded document in the whole editor. */
export function openInEditorHref(seed: SeedId): string {
  return `${PLAYGROUND_ORIGIN}/?embed=script&seed=${encodeURIComponent(seed)}`;
}

export interface StageEditor {
  readonly mode: EmbedMode;
  /** Blank the document and run the seed's prelude, then the script unless it is null. */
  play(seed: SeedId, source: string | null): Promise<ScriptResult | null>;
  /** Zoom to the selection, where the frame can. */
  fit(): Promise<void>;
  dispose(): void;
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} did not answer in ${Math.round(ms / 1000)} s`)), ms);
    promise.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e)),
    );
  });
}

/** The embedding API: embed.html with the viewer profile. */
async function connectStage(iframe: HTMLIFrameElement, seed: SeedId): Promise<StageEditor> {
  iframe.src = `${PLAYGROUND_ORIGIN}/embed.html`;
  const editor = await connectEditor(
    iframe,
    // The viewer profile draws the canvas alone; its role changes nothing, so
    // the session is an editor's, which a script needs to write.
    { profile: 'viewer', role: 'editor', seed, storage: 'memory' },
    { origin: PLAYGROUND_ORIGIN },
  );
  return {
    mode: 'connect',
    async play(next, source) {
      await withTimeout(editor.call('newDocument', PAGE_PT[0], PAGE_PT[1]), 30_000, 'The editor');
      // The docs' copy of the editor's seed registry (data/scripting/seeds.ts,
      // byte-identical and run by `pnpm validate:scripting`).
      const prelude = seedPrelude(next);
      if (prelude) {
        const seeded = await withTimeout(editor.runScript(prelude), 30_000, 'The editor');
        if (seeded.error) throw new Error(`the starter document did not build: ${seeded.error}`);
      }
      return source === null ? null : withTimeout(editor.runScript(source), 30_000, 'The editor');
    },
    async fit() {
      await editor.call('fitSelection').catch(() => undefined);
    },
    dispose: () => editor.dispose(),
  };
}

/** REMOVE-LEGACY: the `?embed=script&seed=` page. */
function legacyUrl(seed: SeedId): string {
  return `${PLAYGROUND_ORIGIN}/?embed=script&seed=${encodeURIComponent(seed)}`;
}

/** REMOVE-LEGACY: the `paged:run` protocol of the editor's playground/IframeScriptBridge.tsx. */
async function legacyStage(iframe: HTMLIFrameElement, seed: SeedId): Promise<StageEditor> {
  let current = seed;
  let seq = 0;
  const pending = new Map<number, (r: ScriptResult) => void>();
  let markReady: () => void = () => undefined;
  let ready = new Promise<void>((r) => (markReady = r));
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== PLAYGROUND_ORIGIN || e.source !== iframe.contentWindow) return;
    const data = e.data as { type?: string; id?: number; output?: string[]; error?: string | null };
    if (data?.type === 'paged:ready') markReady();
    else if (data?.type === 'paged:result' && typeof data.id === 'number') {
      pending.get(data.id)?.({ output: data.output ?? [], error: data.error ?? null });
      pending.delete(data.id);
    }
  };
  window.addEventListener('message', onMessage);
  const load = (next: SeedId) => {
    ready = new Promise<void>((r) => (markReady = r));
    current = next;
    iframe.src = legacyUrl(next);
    return withTimeout(ready, 60_000, 'The editor');
  };
  const send = (source: string, reseed: boolean) =>
    withTimeout(
      new Promise<ScriptResult>((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        iframe.contentWindow?.postMessage({ type: 'paged:run', id, source, reseed }, PLAYGROUND_ORIGIN);
      }),
      30_000,
      'The editor',
    );
  try {
    await load(seed);
  } catch (err) {
    window.removeEventListener('message', onMessage);
    throw err;
  }
  return {
    mode: 'legacy',
    async play(next, source) {
      // The page's seed is in its address: another seed means another page,
      // which seeds itself as it boots.
      if (next !== current) {
        await load(next);
        return source === null ? null : send(source, false);
      }
      const result = await send(source ?? '', true);
      return source === null ? null : result;
    },
    async fit() {
      // The legacy page has no fit.
    },
    dispose() {
      window.removeEventListener('message', onMessage);
    },
  };
}

// ── The page's one stage ────────────────────────────────────────────────────

export type StageStatus = 'idle' | 'loading' | 'ready' | 'failed';
export interface StageState {
  status: StageStatus;
  /** The lab whose stage the frame sits over. */
  owner: string | null;
  mode: EmbedMode | null;
  error: string | null;
}

let state: StageState = { status: 'idle', owner: null, mode: null, error: null };
const subscribers = new Set<() => void>();
const SERVER_STATE: StageState = { status: 'idle', owner: null, mode: null, error: null };

function setState(patch: Partial<StageState>) {
  state = { ...state, ...patch };
  for (const fn of [...subscribers]) fn();
}

export const stageStore = {
  subscribe(fn: () => void) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
  get: () => state,
  getServer: () => SERVER_STATE,
};

let editor: Promise<StageEditor> | null = null;
let host: HTMLDivElement | null = null;
let slot: HTMLElement | null = null;
let frameId = 0;
let queue: Promise<unknown> = Promise.resolve();

/** Keeps the frame over the owner's stage slot, every frame, while there is one. */
function follow() {
  cancelAnimationFrame(frameId);
  let last = '';
  const step = () => {
    if (!host) return;
    const r = slot?.isConnected ? slot.getBoundingClientRect() : null;
    const visible = !!r && r.width > 0 && r.height > 0;
    const key = visible ? `${r.left + window.scrollX},${r.top + window.scrollY},${r.width},${r.height}` : 'hidden';
    if (key !== last) {
      last = key;
      host.hidden = !visible;
      if (visible) {
        host.style.left = `${r.left + window.scrollX}px`;
        host.style.top = `${r.top + window.scrollY}px`;
        host.style.width = `${r.width}px`;
        host.style.height = `${r.height}px`;
      }
    }
    frameId = requestAnimationFrame(step);
  };
  frameId = requestAnimationFrame(step);
}

function makeFrame(mode: EmbedMode): HTMLIFrameElement {
  host = document.createElement('div');
  host.className = 'paged-stage-frame';
  host.dataset.mode = mode;
  const iframe = document.createElement('iframe');
  iframe.title = 'The Paged editor, running the lab’s script';
  // Before the frame loads: an allow list on a loaded frame is ignored.
  iframe.setAttribute('allow', 'cross-origin-isolated; clipboard-write');
  host.append(iframe);
  document.body.append(host);
  return iframe;
}

/**
 * The page's editor over `owner`'s stage slot, made on first use. Resolves once
 * the editor is ready; rejects when it cannot start (and the next call tries
 * again).
 */
export function claimStage(owner: string, stageSlot: HTMLElement, seed: SeedId): Promise<StageEditor> {
  slot = stageSlot;
  setState({ owner });
  if (!editor) {
    const mode = embedMode();
    setState({ status: 'loading', mode, error: null });
    const iframe = makeFrame(mode);
    follow();
    editor = (mode === 'connect' ? connectStage : legacyStage)(iframe, seed).then(
      (made) => {
        setState({ status: 'ready' });
        return made;
      },
      (err: unknown) => {
        setState({ status: 'failed', error: err instanceof Error ? err.message : String(err) });
        cancelAnimationFrame(frameId);
        host?.remove();
        host = null;
        editor = null;
        throw err;
      },
    );
  }
  return editor;
}

/** A lab leaves the page: the frame stops following its slot. */
export function releaseStage(owner: string) {
  if (state.owner !== owner) return;
  slot = null;
  setState({ owner: null });
}

/** Runs `job` on the page's editor after every job before it, so runs never interleave. */
export function onStage<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}
