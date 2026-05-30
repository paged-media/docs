/**
 * Schematic, theme-aware diagrams (briefing §6.6). Drawn with `currentColor` so
 * they follow the text color in light/dark; muted elements use opacity. Each is a
 * server component, framed and labeled in monospace. Authored, not decorative —
 * one per load-bearing concept.
 */
import type { ReactNode } from 'react';

function Figure({ caption, children, viewBox }: { caption: string; children: ReactNode; viewBox: string }) {
  return (
    <figure className="not-prose my-6 rounded-lg border border-fd-border p-4 text-fd-foreground">
      <svg viewBox={viewBox} className="mx-auto block w-full max-w-2xl" role="img" aria-label={caption}>
        <style>{`.dlabel{font:600 11px ui-monospace,monospace;fill:currentColor}.dsub{font:10px ui-monospace,monospace;fill:currentColor;opacity:.6}.dbox{fill:none;stroke:currentColor;stroke-width:1.2}.dmut{stroke:currentColor;stroke-width:1.2;opacity:.45}.dfill{fill:currentColor;opacity:.07}`}</style>
        {children}
      </svg>
      <figcaption className="mt-3 text-center text-xs text-fd-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

function arrow(id: string) {
  return (
    <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
    </marker>
  );
}

/** designmap.xml → the parts it references by idPkg src. */
export function PackageGraph() {
  return (
    <Figure caption="The design map names every other part; parts reference each other by id." viewBox="0 0 640 280">
      <defs>{arrow('pg')}</defs>
      <rect className="dbox dfill" x="250" y="16" width="140" height="34" rx="4" />
      <text className="dlabel" x="320" y="37" textAnchor="middle">designmap.xml</text>
      {[
        ['Resources/Graphic.xml', 40],
        ['Resources/Styles.xml', 190],
        ['Spreads/Spread_*.xml', 340],
        ['Stories/Story_*.xml', 490],
      ].map(([label, x]) => (
        <g key={label as string}>
          <line className="dmut" markerEnd="url(#pg)" x1="320" y1="50" x2={(x as number) + 70} y2="120" />
          <rect className="dbox" x={x as number} y="122" width="140" height="32" rx="4" />
          <text className="dsub" x={(x as number) + 70} y="142" textAnchor="middle">{label}</text>
        </g>
      ))}
      <line className="dmut" markerEnd="url(#pg)" x1="410" y1="154" x2="270" y2="210" />
      <rect className="dbox" x="200" y="212" width="140" height="32" rx="4" />
      <text className="dsub" x="270" y="232" textAnchor="middle">ParentStory → Story</text>
      <text className="dsub" x="470" y="232" textAnchor="middle">(TextFrame in a spread</text>
      <text className="dsub" x="470" y="246" textAnchor="middle">points at its story)</text>
    </Figure>
  );
}

/** Page coordinate space: origin top-left, Y down, a frame placed by ItemTransform. */
export function CoordinateSpace() {
  return (
    <Figure caption="IDML units are points; the origin is the page's top-left and Y grows downward. ItemTransform places a frame." viewBox="0 0 460 320">
      <defs>{arrow('cs')}</defs>
      <rect className="dbox dfill" x="40" y="40" width="300" height="240" />
      <text className="dsub" x="44" y="34">origin (0, 0)</text>
      <circle cx="40" cy="40" r="3" fill="currentColor" />
      <line className="dbox" markerEnd="url(#cs)" x1="40" y1="40" x2="150" y2="40" />
      <text className="dlabel" x="156" y="44">X →</text>
      <line className="dbox" markerEnd="url(#cs)" x1="40" y1="40" x2="40" y2="150" />
      <text className="dlabel" x="46" y="150">Y ↓</text>
      <line className="dmut" markerEnd="url(#cs)" strokeDasharray="3 3" x1="40" y1="40" x2="160" y2="120" />
      <text className="dsub" x="92" y="96">tx, ty</text>
      <rect className="dbox" x="160" y="120" width="140" height="100" />
      <text className="dsub" x="230" y="174" textAnchor="middle">TextFrame</text>
    </Figure>
  );
}

/** BasedOn resolution order, with a local override winning. */
export function StyleCascade() {
  return (
    <Figure caption="A run resolves through the BasedOn chain; a local override on the range wins over both." viewBox="0 0 600 150">
      <defs>{arrow('sc')}</defs>
      <rect className="dbox dfill" x="20" y="50" width="130" height="44" rx="4" />
      <text className="dlabel" x="85" y="70" textAnchor="middle">[No paragraph</text>
      <text className="dlabel" x="85" y="84" textAnchor="middle">style] (root)</text>
      <line className="dmut" markerEnd="url(#sc)" x1="150" y1="72" x2="210" y2="72" />
      <text className="dsub" x="180" y="64" textAnchor="middle">BasedOn</text>
      <rect className="dbox dfill" x="212" y="50" width="120" height="44" rx="4" />
      <text className="dlabel" x="272" y="76" textAnchor="middle">"Body"</text>
      <line className="dmut" markerEnd="url(#sc)" x1="332" y1="72" x2="392" y2="72" />
      <text className="dsub" x="362" y="64" textAnchor="middle">applied</text>
      <rect className="dbox" x="394" y="50" width="120" height="44" rx="4" />
      <text className="dlabel" x="454" y="76" textAnchor="middle">the run</text>
      <line className="dmut" markerEnd="url(#sc)" x1="454" y1="40" x2="454" y2="48" />
      <text className="dsub" x="454" y="32" textAnchor="middle">PointSize="18" (local override wins)</text>
    </Figure>
  );
}

/** One story threaded across two frames via NextTextFrame. */
export function StoryThreading() {
  return (
    <Figure caption="A single story flows through a chain of frames; NextTextFrame links one frame to the next." viewBox="0 0 520 200">
      <defs>{arrow('st')}</defs>
      <rect className="dbox dfill" x="30" y="40" width="170" height="120" />
      <text className="dsub" x="115" y="60" textAnchor="middle">TextFrame A</text>
      {[78, 96, 114, 132].map((y) => (
        <line key={y} className="dmut" x1="50" y1={y} x2="180" y2={y} />
      ))}
      <line className="dbox" markerEnd="url(#st)" x1="200" y1="100" x2="318" y2="100" />
      <text className="dsub" x="259" y="92" textAnchor="middle">NextTextFrame</text>
      <rect className="dbox dfill" x="320" y="40" width="170" height="120" />
      <text className="dsub" x="405" y="60" textAnchor="middle">TextFrame B</text>
      {[78, 96, 114].map((y) => (
        <line key={y} className="dmut" x1="340" y1={y} x2="470" y2={y} />
      ))}
      <text className="dsub" x="405" y="150" textAnchor="middle">(overset if it still doesn't fit)</text>
    </Figure>
  );
}
