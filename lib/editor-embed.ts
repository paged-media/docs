/**
 * The host side of the Paged editor's iframe bridge, for the docs' scripting
 * lab (components/mdx/scripting-lab.tsx).
 *
 * A docs-side copy of `connectEditor` and of the message types it speaks, from
 * paged-media/paged `apps/editor/apps/canvas/src/embed/connect.ts` and
 * `apps/editor/apps/canvas/src/embed/protocol.ts` (the embedding plan's E6; the
 * docs page `/docs/paged/embedding/iframe`). `@paged-media/editor` ships the
 * same function from its `./iframe` entry; it is not on npm yet, so this file
 * speaks the protocol itself. Keep the types and the handshake in step with
 * those two files: the host waits for `paged:loaded`, sends `paged:init` with
 * the frame's config, and once `paged:ready` arrives calls the handle's methods
 * as `paged:call`, answered by `paged:reply` with the same id.
 *
 * Only what the lab needs is copied: no host actions (`paged:action`), and the
 * handle's methods are reached by name through `call`.
 */

/** The editor handle's methods a host reaches through the frame (protocol.ts BRIDGED_METHODS). */
export const BRIDGED_METHODS = [
  'load',
  'newDocument',
  'save',
  'exportPdf',
  'fields',
  'getFieldValues',
  'setFieldValues',
  'setRole',
  'setTheme',
  // The view method the docs' lab asks for (editor ADR 212, amendment: one
  // automation surface): zoom to the selected frame.
  'fitSelection',
] as const;
export type BridgedMethod = (typeof BRIDGED_METHODS)[number];

/** Runs `paged.*` source in the frame (dev and demo builds of the editor; protocol.ts SCRIPT_METHOD). */
export const SCRIPT_METHOD = 'runScript';

/** The session roles of the engine's template policy. */
export type Role = 'author' | 'editor' | 'filler' | 'viewer';

/** What the frame's editor is made with (protocol.ts FrameConfig, the fields the docs use). */
export interface FrameConfig {
  /** A preset id (`viewer`, `template-fill`, `solo:draw`, …), or a profile that
   *  extends one (the editor's EditorProfile; the docs use `extends` and `canvas`). */
  profile?: string | { extends: string; canvas?: { thumbnails?: boolean; rulers?: boolean } };
  /** The session's role; overrides the profile's. */
  role?: Role;
  /** A named seed prelude (the editor's `playground/seeds.ts`) run after the blank document. */
  seed?: string;
  /** Where the editor keeps its settings; `memory` keeps nothing on the host's origin. */
  storage?: 'local' | 'memory' | 'none';
  locale?: string;
  actions?: readonly ('save' | 'submit' | 'close' | 'back')[];
}

export type HostToFrame =
  | { type: 'paged:init'; config: FrameConfig }
  | { type: 'paged:call'; id: number; method: BridgedMethod | typeof SCRIPT_METHOD; args: unknown[] }
  | { type: 'paged:action-reply'; id: number; ok: boolean; error?: string };

export type FrameToHost =
  | { type: 'paged:loaded' }
  | { type: 'paged:ready' }
  | { type: 'paged:failed'; error: string; code?: string }
  | { type: 'paged:reply'; id: number; ok: boolean; value?: unknown; error?: string }
  | { type: 'paged:event'; event: { type: string } }
  | { type: 'paged:action'; id: number; action: string };

export interface ScriptResult {
  output: string[];
  error: string | null;
}

/** The handle over the frame (connect.ts RemoteEditorHandle, by method name). */
export interface RemoteEditor {
  call<T = unknown>(method: BridgedMethod, ...args: unknown[]): Promise<T>;
  runScript(source: string): Promise<ScriptResult>;
  on(listener: (event: { type: string }) => void): () => void;
  dispose(): void;
}

export interface ConnectOptions {
  /** The frame's origin; else the iframe's `src` origin. */
  origin?: string;
  /** How long to wait for the frame, in ms (default 60 s). */
  timeout?: number;
}

/**
 * Connects to an editor frame (`embed.html`) and resolves, once the editor is
 * up, to its handle. Call it before the iframe loads: like the original it adds
 * `cross-origin-isolated` to the frame's `allow`, which a loaded frame ignores.
 */
export function connectEditor(iframe: HTMLIFrameElement, config: FrameConfig = {}, options: ConnectOptions = {}): Promise<RemoteEditor> {
  const { timeout = 60_000 } = options;
  const origin = options.origin ?? new URL(iframe.src, location.href).origin;
  const allow = new Set(
    (iframe.getAttribute('allow') ?? '')
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean),
  );
  if (![...allow].some((p) => p.startsWith('cross-origin-isolated'))) {
    allow.add('cross-origin-isolated');
    iframe.setAttribute('allow', [...allow].join('; '));
  }
  const frame = () => iframe.contentWindow;
  const send = (msg: HostToFrame) => frame()?.postMessage(msg, origin);
  let nextCall = 1;
  const calls = new Map<number, { resolve(v: unknown): void; reject(e: Error): void }>();
  const listeners = new Set<(event: { type: string }) => void>();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error(`the editor did not become ready in ${Math.round(timeout / 1000)} s`));
    }, timeout);
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame() || e.origin !== origin) return;
      const msg = e.data as FrameToHost;
      if (!msg || typeof msg !== 'object') return;
      switch (msg.type) {
        case 'paged:loaded':
          send({ type: 'paged:init', config: { ...config, actions: [] } });
          return;
        case 'paged:ready':
          clearTimeout(timer);
          resolve(handle);
          return;
        case 'paged:failed':
          clearTimeout(timer);
          window.removeEventListener('message', onMessage);
          reject(new Error(msg.error));
          return;
        case 'paged:reply': {
          const pending = calls.get(msg.id);
          calls.delete(msg.id);
          if (msg.ok) pending?.resolve(msg.value);
          else pending?.reject(new Error(msg.error ?? 'the call failed'));
          return;
        }
        case 'paged:event':
          for (const l of [...listeners]) l(msg.event);
          return;
        case 'paged:action':
          // The lab gives the editor no host actions; answer so it never waits.
          send({ type: 'paged:action-reply', id: msg.id, ok: false, error: 'no host actions in the docs' });
          return;
      }
    };
    window.addEventListener('message', onMessage);

    const call = (method: BridgedMethod | typeof SCRIPT_METHOD, args: unknown[]) =>
      new Promise((res, rej) => {
        const id = nextCall++;
        calls.set(id, { resolve: res, reject: rej });
        send({ type: 'paged:call', id, method, args });
      });
    const handle: RemoteEditor = {
      call: <T,>(method: BridgedMethod, ...args: unknown[]) => call(method, args) as Promise<T>,
      runScript: (source: string) => call(SCRIPT_METHOD, [source]) as Promise<ScriptResult>,
      on(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      dispose() {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        listeners.clear();
        for (const c of calls.values()) c.reject(new Error('disposed'));
        calls.clear();
      },
    };
  });
}
