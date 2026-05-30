import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-wide text-fd-muted-foreground">
        Paged · paged media, IDML first
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">
        The IDML living documentation
      </h1>
      <p className="mt-4 text-lg text-fd-muted-foreground">
        An independent, technically deep reference for the IDML file format and the
        Paged native renderer — authored from first principles, learning in public
        as the renderer teaches us. Every example is one our renderer accepts.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/docs/foundations"
          className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground"
        >
          Start here →
        </Link>
        <Link
          href="/docs"
          className="rounded-lg border border-fd-border px-5 py-2.5 font-medium"
        >
          Browse the reference
        </Link>
      </div>
      <p className="mt-10 text-sm text-fd-muted-foreground">
        Three reader tiers — 🟢 Beginner · 🟡 Intermediate · 🔴 Pro — each page one
        tier and one job. Work in progress; unfinished pages are excluded from
        search.
      </p>
    </main>
  );
}
