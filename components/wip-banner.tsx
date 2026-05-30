/**
 * Site-wide work-in-progress banner (briefing §8 / §11 Phase 0 soft-launch).
 * Public from day one, honest about it: pages without a difficulty label are
 * unfinished and `noindex`'d.
 */
export function WipBanner() {
  return (
    <div
      role="status"
      className="w-full border-b border-amber-300/60 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
    >
      Work in progress — this reference is being written in the open. Unfinished
      pages are excluded from search engines.
    </div>
  );
}
