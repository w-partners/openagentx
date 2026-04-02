import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';

export default async function GuidePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;
  const g = dict.beginnerGuide;

  const cards = [
    {
      title: g.cardUserTitle,
      desc: g.cardUserDesc,
      btn: g.cardUserBtn,
      href: `${prefix}/guide/user`,
      icon: '\uD83D\uDC64',
      color: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    },
    {
      title: g.cardProviderTitle,
      desc: g.cardProviderDesc,
      btn: g.cardProviderBtn,
      href: `${prefix}/guide/provider`,
      icon: '\uD83D\uDEE0\uFE0F',
      color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    },
    {
      title: g.cardAgentTitle,
      desc: g.cardAgentDesc,
      btn: g.cardAgentBtn,
      href: `${prefix}/guide/agent`,
      icon: '\uD83E\uDD16',
      color: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-8">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{g.title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{g.subtitle}</p>
      </section>

      {/* 3 Perspective Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group rounded-2xl border bg-gradient-to-b ${card.color} p-8 space-y-4 transition-all hover:scale-[1.02] hover:shadow-lg`}
          >
            <div className="text-5xl">{card.icon}</div>
            <h2 className="text-xl font-bold">{card.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
            <span className="inline-flex items-center text-sm font-medium text-primary group-hover:underline">
              {card.btn} &rarr;
            </span>
          </Link>
        ))}
      </section>

      {/* Quick link to concepts */}
      <section className="text-center py-8">
        <Link
          href={`${prefix}/guide/concepts`}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {g.navConcepts} &rarr;
        </Link>
      </section>
    </div>
  );
}
