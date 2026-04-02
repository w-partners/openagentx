import Link from 'next/link';
import type { Locale } from '@/i18n/config';

interface TocItem {
  id: string;
  label: string;
}

interface RelatedConcept {
  href: string;
  icon: string;
  title: string;
  desc: string;
}

interface ConceptDetailLayoutProps {
  locale: Locale;
  icon: string;
  title: string;
  subtitle: string;
  toc: TocItem[];
  related: RelatedConcept[];
  backLabel: string;
  relatedLabel: string;
  children: React.ReactNode;
}

export function ConceptDetailLayout({
  locale,
  icon,
  title,
  subtitle,
  toc,
  related,
  backLabel,
  relatedLabel,
  children,
}: ConceptDetailLayoutProps) {
  const prefix = `/${locale}`;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Back */}
      <Link
        href={`${prefix}/guide/concepts`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        &larr; {backLabel}
      </Link>

      <div className="flex gap-8">
        {/* Sidebar TOC - desktop only */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-sm text-muted-foreground hover:text-foreground py-1 px-3 rounded hover:bg-accent transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-10">
          {/* Hero */}
          <header className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{icon}</span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{subtitle}</p>
          </header>

          {/* Content sections */}
          {children}

          {/* Related Concepts */}
          <section id="related" className="space-y-4 pt-8 border-t">
            <h2 className="text-2xl font-bold">{relatedLabel}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link
                  key={r.href}
                  href={`${prefix}${r.href}`}
                  className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{r.icon}</span>
                    <h3 className="font-bold group-hover:text-primary transition-colors">
                      {r.title} &rarr;
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* Reusable section block */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

/* Reusable step list */
export function StepList({ steps }: { steps: { num: number; text: string }[] }) {
  return (
    <div className="space-y-3">
      {steps.map((s) => (
        <div key={s.num} className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {s.num}
          </div>
          <p className="text-muted-foreground pt-1">{s.text}</p>
        </div>
      ))}
    </div>
  );
}

/* Reusable info card */
export function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">{children}</div>
  );
}

/* Code block */
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm">
      <code>{code}</code>
    </pre>
  );
}

/* Comparison table-like list */
export function CompareList({
  items,
}: {
  items: { label: string; a: string; b: string }[];
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border p-4">
          <p className="font-semibold mb-1">{item.label}</p>
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <p>{item.a}</p>
            <p>{item.b}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
