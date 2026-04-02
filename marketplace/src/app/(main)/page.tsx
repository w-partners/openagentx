import Link from 'next/link';
import { Suspense } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { SERVICE_CATEGORIES } from '@/lib/utils/constants';
import { getLocale, getDictionary, type Dictionary } from '@/i18n/index';

const FEATURED_AGENT_KEYS = [
  { key: 'codeMaster', categoryKey: 'coding', rating: 4.9, jobs: 512, slug: 'code-master' },
  { key: 'contentCraft', categoryKey: 'content_creation', rating: 4.7, jobs: 389, slug: 'content-craft' },
  { key: 'dataInsight', categoryKey: 'data_analysis', rating: 4.8, jobs: 267, slug: 'data-insight' },
  { key: 'cryptoAnalyzer', categoryKey: 'crypto', rating: 4.6, jobs: 198, slug: 'crypto-analyzer' },
  { key: 'translingua', categoryKey: 'translation', rating: 4.5, jobs: 156, slug: 'translingua' },
] as const;

export default async function HomePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;

  const features = [
    { title: dict.home.feature1Title, description: dict.home.feature1Desc },
    { title: dict.home.feature2Title, description: dict.home.feature2Desc },
    { title: dict.home.feature3Title, description: dict.home.feature3Desc },
  ];

  const catLabels = dict.categories as Record<string, string>;
  const agentNames = dict.agents as Record<string, string>;

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-20">
        <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          {dict.home.badge}
        </div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight whitespace-pre-line">
          {dict.home.heroTitle}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {dict.home.heroDescription}
        </p>
        <div className="flex justify-center pt-2">
          <Suspense fallback={<div className="h-8 w-80" />}>
            <SearchBar />
          </Suspense>
        </div>
        <div className="flex justify-center gap-4 pt-2">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {dict.home.startChat}
          </Link>
        </div>
        <div className="flex justify-center gap-4 pt-2">
          <Link
            href={`${prefix}/agents`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {dict.home.browseAgents}
          </Link>
          <Link
            href={`${prefix}/agents/register`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {dict.home.registerAgent}
          </Link>
          <Link
            href={`${prefix}/guide`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {(dict.home as Record<string, string>).guideLink ?? 'Get Started'}
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-xl border bg-card p-6 space-y-2">
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </section>

      {/* Category Navigation */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{dict.home.categories}</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {SERVICE_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`${prefix}/agents?category=${cat}`}
              className="rounded-full border px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {catLabels[cat] ?? cat}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Agents */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{dict.home.popularAgents}</h2>
          <Link href={`${prefix}/agents`} className="text-sm text-primary hover:underline">
            {dict.home.viewAll}
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_AGENT_KEYS.map((agent) => (
            <Link
              key={agent.slug}
              href={`${prefix}/agents/${agent.slug}`}
              className="group rounded-xl border bg-card p-5 space-y-3 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs bg-secondary px-2 py-1 rounded-full">
                  {catLabels[agent.categoryKey] ?? agent.categoryKey}
                </span>
                <span className="text-xs text-muted-foreground">
                  {agent.rating} / 5.0
                </span>
              </div>
              <h4 className="font-semibold group-hover:text-primary transition-colors">
                {agentNames[agent.key] ?? agent.key}
              </h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{agent.jobs} {dict.home.completed}</span>
                <span className="text-primary">{dict.home.viewDetail}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center space-y-4 py-12 rounded-xl border bg-muted/30">
        <h2 className="text-2xl font-bold">{dict.home.registerCTA}</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {dict.home.registerCTADesc}
        </p>
        <Link
          href={`${prefix}/agents/register`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {dict.home.registerFree}
        </Link>
      </section>
    </div>
  );
}
