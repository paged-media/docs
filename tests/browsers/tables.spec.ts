import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * No table is wider than its column (app/global.css). Every page in this
 * build's sitemap, at 1440 and at 390 wide: a table may be wider than the box
 * it sits in only inside a labelled, focusable scroll region (role="region",
 * an accessible name, tabindex="0", overflow-x auto or scroll). At 390 no page
 * scrolls sideways either.
 *
 * The pages are read from out/sitemap.xml (the export these tests serve) and
 * walked in groups, so a failure names the page and the table.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SITEMAP = join(resolve(HERE, "..", ".."), "out", "sitemap.xml");
const OUT = join(resolve(HERE, "..", ".."), "out");
const PATHS = [
  ...readFileSync(SITEMAP, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g),
].map((m) => new URL(m[1]).pathname);
const GROUP = 12;

/** Whether the exported page has a table at all. */
function hasTable(path: string): boolean {
  try {
    return readFileSync(join(OUT, path, "index.html"), "utf8").includes(
      "<table",
    );
  } catch {
    return true;
  }
}
/**
 * Chromium walks every page. Firefox and WebKit walk a sample of the pages
 * that have a table: every fifth, plus every scripting, state and compare page,
 * where the widest tables live. Their layout differs from Chromium's in how
 * long words break, which a sample of each kind of table shows; walking all
 * 308 idml pages in all three engines does not fit the job's time.
 */
const SAMPLE = PATHS.filter(hasTable).filter(
  (path, i) =>
    i % 5 === 0 || /\/(scripting|state|compare|sdk|api)\//.test(path),
);

/** Runs in the page: each table wider than the box it overflows, outside a labelled scroll region. */
function wideTables(): string[] {
  const found: string[] = [];
  const isRegion = (el: Element) =>
    el.getAttribute("role") === "region" &&
    !!(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) &&
    el.getAttribute("tabindex") === "0" &&
    /auto|scroll/.test(getComputedStyle(el).overflowX);
  for (const table of document.querySelectorAll("table")) {
    if (!table.getClientRects().length) continue; // in a closed tab or <details>
    const width = table.getBoundingClientRect().width;
    for (
      let box = table.parentElement;
      box && box !== document.body;
      box = box.parentElement
    ) {
      if (isRegion(box)) break;
      const display = getComputedStyle(box).display;
      if (display === "contents" || display.startsWith("inline")) continue;
      if (width > box.clientWidth + 1) {
        const heads = [...table.querySelectorAll("th")]
          .slice(0, 4)
          .map((th) => (th.textContent ?? "").trim())
          .join(" | ");
        const name = `${box.tagName.toLowerCase()}${box.id ? `#${box.id}` : ""}${typeof box.className === "string" && box.className ? `.${box.className.trim().split(/\s+/).join(".")}` : ""}`;
        found.push(
          `table [${heads}] is ${Math.round(width)}px in a ${box.clientWidth}px ${name.slice(0, 80)}`,
        );
        break;
      }
    }
  }
  return found;
}

for (const width of [1440, 390]) {
  test.describe(`tables fit their column at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const [label, list, full] of [
      ["every page", PATHS, true],
      ["a sample", SAMPLE, false],
    ] as const) {
      for (let i = 0; i < list.length; i += GROUP) {
        const group = list.slice(i, i + GROUP);
        test(`${label}: pages ${i + 1}–${i + group.length} of ${list.length}`, async ({
          page,
          browserName,
        }) => {
          test.skip(
            (browserName === "chromium") !== full,
            full
              ? "Chromium walks every page"
              : "the sample is for Firefox and WebKit",
          );
          test.setTimeout(120_000);
          const problems: string[] = [];
          for (const path of group) {
            const res = await page.goto(path);
            expect(res?.status(), `${path} status`).toBe(200);
            await page.waitForLoadState("load");
            for (const p of await page.evaluate(wideTables))
              problems.push(`${path}: ${p}`);
            if (width < 720) {
              const { sw, iw } = await page.evaluate(() => ({
                sw: document.documentElement.scrollWidth,
                iw: window.innerWidth,
              }));
              if (sw > iw + 1)
                problems.push(
                  `${path}: the page is ${sw}px wide in a ${iw}px viewport`,
                );
            }
          }
          expect(
            problems,
            "tables wider than their column, outside a labelled scroll region",
          ).toEqual([]);
        });
      }
    }
  });
}
