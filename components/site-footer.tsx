import { WhatIsPaged } from '@/components/what-is-paged';

/**
 * The bottom of every page: the "What is Paged" mission statement (which carries
 * the project's vendor disclaimer) plus the licensing split (content CC BY 4.0,
 * code MIT — recommended defaults pending legal review).
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-fd-border bg-fd-card px-6 py-10 text-sm text-fd-muted-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <WhatIsPaged />
        <p className="text-xs">
          Documentation content is licensed CC BY 4.0; site code is licensed MIT.
        </p>
      </div>
    </footer>
  );
}
