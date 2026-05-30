import { ATTRIBUTION, DIFFERENTIATION } from '@/app/layout.config';

/**
 * The two required lines (briefing §6.1) on every page: the single vendor
 * attribution and the prominent Paged.js differentiation. Plus the licensing
 * split (content CC BY 4.0, code MIT — recommended defaults pending legal review).
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-fd-border bg-fd-card px-6 py-8 text-sm text-fd-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <p className="font-medium text-fd-foreground">{DIFFERENTIATION}</p>
        <p>{ATTRIBUTION}</p>
        <p className="text-xs">
          Documentation content is licensed CC BY 4.0; site code is licensed MIT.
          An independent project of the Paged team.
        </p>
      </div>
    </footer>
  );
}
