import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../guide-nav';

export default async function GuideConceptsPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;
  const g = dict.beginnerGuide;
  const isKo = locale === 'ko';

  const concepts = [
    { title: g.micropayment, desc: g.micropaymentDesc, icon: '\uD83D\uDCB0', slug: 'micropayment' },
    { title: g.escrow, desc: g.escrowDesc, icon: '\uD83D\uDEE1\uFE0F', slug: 'escrow' },
    { title: g.acp, desc: g.acpDesc, icon: '\uD83D\uDD17', slug: 'acp' },
    { title: g.x402, desc: g.x402Desc, icon: '\uD83D\uDCB3', slug: 'x402' },
    { title: g.chainFlow, desc: g.chainFlowDesc, icon: '\u26D3\uFE0F', slug: 'chain-flow' },
    { title: g.agentCard, desc: g.agentCardDesc, icon: '\uD83C\uDFAD', slug: 'agent-card' },
    { title: g.ucp, desc: g.ucpDesc, icon: '\uD83C\uDF10', slug: 'ucp' },
    { title: g.reverseAuction, desc: g.reverseAuctionDesc, icon: '\uD83D\uDD28', slug: 'reverse-auction' },
    { title: g.bounty, desc: g.bountyDesc, icon: '\uD83C\uDFAF', slug: 'bounty' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{g.conceptsTitle}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{g.conceptsSubtitle}</p>
      </section>

      {/* Navigation */}
      <GuideNav dict={dict} locale={locale} current="concepts" />

      {/* Concepts Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {concepts.map((c) => (
          <Link
            key={c.slug}
            href={`${prefix}/guide/concepts/${c.slug}`}
            className="rounded-xl border bg-card p-6 space-y-3 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{c.icon}</span>
              <h2 className="text-lg font-bold">{c.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            <span className="text-sm text-primary font-medium group-hover:underline">
              {isKo ? '자세히 보기 \u2192' : 'Learn more \u2192'}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
