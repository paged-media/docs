/**
 * <ScriptingLab /> — paged.* scripts run against the real editor, in the V5 lab
 * look (app/edition.css, "The scripting lab").
 *
 *   <ScriptingLab themes="all" />
 *       the ten themes of settable paths (data/scripting/themes.ts) as tabs,
 *       each with its paths and its showcase script
 *   <ScriptingLab id="first-script-read" seed="one-text-frame-selected"
 *                 lookFor="…" script={`…`} />
 *       one script, no tabs (single-snippet mode)
 *
 * Every lab on a page shares one editor, loaded only when a reader presses Run
 * (scripting-lab-stage.ts). Until then a lab shows its recorded result,
 * `public/scripting/lab/<id>.webp`, when that still exists, and otherwise says
 * what Run will do. Server component: it reads the catalog and looks for the
 * stills; the client island is scripting-lab-client.tsx.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getScripting } from '@/lib/generated';
import { PATH_THEMES, themeForPath } from '@/data/scripting/themes';
import type { SeedId } from '@/data/scripting/examples';
import { ScriptingLabClient, type LabItem } from './scripting-lab-client';

/** The order the themes are read in: what a reader changes first, first. */
export const LAB_THEME_ORDER = [
  'fills',
  'strokes',
  'transform',
  'corners-fitting',
  'effects',
  'blend-opacity',
  'text-paragraph',
  'tables-cells',
  'anchored-textwrap',
  'styles-layers',
] as const;

/** Each starter document in words, for the stage before Run. */
const SEED_WORDS: Record<SeedId, string> = {
  blank: 'a blank page',
  'one-text-frame-selected': 'a page with one selected text frame',
  'two-frames': 'a page with a text frame and a tinted frame',
  'styled-story': 'a page with a styled two-paragraph story',
  'swatches-and-styles': 'a page with a row of swatch chips',
  'image-frame': 'a page with an empty image frame',
  'a-table': 'a page with a text frame holding a table',
  flyer: 'a flyer',
  'article-spread': 'a two-column article',
  'report-page': 'a report page with a table',
  catalog: 'a catalogue page of six tiles',
  'starter-page': 'a page with a header band, a rule and a footer',
};

/** The recorded result of a lab script, when it has been captured. */
export function labPoster(id: string): string | null {
  const file = join(process.cwd(), 'public', 'scripting', 'lab', `${id}.webp`);
  return existsSync(file) ? `/scripting/lab/${id}.webp` : null;
}

export function ScriptingLab({
  themes,
  id,
  title,
  script = '',
  seed = 'blank',
  lookFor,
}: {
  /** `all`, or theme ids separated by commas: tabs mode. */
  themes?: string;
  /** Single-snippet mode: the script's id (its still is public/scripting/lab/<id>.webp). */
  id?: string;
  title?: string;
  script?: string;
  seed?: SeedId;
  lookFor?: string;
}) {
  if (themes) {
    const wanted = themes === 'all' ? [...LAB_THEME_ORDER] : themes.split(',').map((t) => t.trim());
    const { settablePaths } = getScripting();
    const items: LabItem[] = wanted.flatMap((tid) => {
      const t = PATH_THEMES.find((x) => x.id === tid);
      if (!t) return [];
      return [
        {
          id: t.id,
          title: t.title,
          summary: t.summary,
          seed: t.seed,
          seedLabel: SEED_WORDS[t.seed],
          script: t.script,
          lookFor: t.lookFor,
          paths: settablePaths.filter((p) => themeForPath(p).id === t.id),
          demoPaths: t.demoPaths,
          poster: labPoster(t.id),
        },
      ];
    });
    if (!items.length) return null;
    return <ScriptingLabClient items={items} tabs label="Scripting lab: settable paths by theme" />;
  }

  const sid = id ?? 'script';
  const item: LabItem = {
    id: sid,
    title: title ?? '',
    seed,
    seedLabel: SEED_WORDS[seed],
    script: script.trim(),
    lookFor,
    poster: labPoster(sid),
  };
  return <ScriptingLabClient items={[item]} tabs={false} label={title ? `Scripting lab: ${title}` : 'Scripting lab'} />;
}
