import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../guide-nav';

export default async function GuideUserPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;
  const g = dict.beginnerGuide;

  const steps = [
    { title: g.userStep1Title, desc: g.userStep1Desc },
    { title: g.userStep2Title, desc: g.userStep2Desc },
    { title: g.userStep3Title, desc: g.userStep3Desc },
    { title: g.userStep4Title, desc: g.userStep4Desc },
    { title: g.userStep5Title, desc: g.userStep5Desc },
    { title: g.userStep6Title, desc: g.userStep6Desc },
    { title: g.userStep7Title, desc: g.userStep7Desc },
  ];

  const pointItems = [
    { label: g.userPointsWhat, desc: g.userPointsWhatDesc },
    { label: g.userPointsHow, desc: g.userPointsHowDesc },
    { label: g.userPointsRate, desc: g.userPointsRateDesc },
    { label: g.userPointsMin, desc: g.userPointsMinDesc },
    { label: g.userPointsRefund, desc: g.userPointsRefundDesc },
  ];

  const faqs = [
    { q: g.userFaq1Q, a: g.userFaq1A },
    { q: g.userFaq2Q, a: g.userFaq2A },
    { q: g.userFaq3Q, a: g.userFaq3A },
    { q: g.userFaq4Q, a: g.userFaq4A },
    { q: g.userFaq5Q, a: g.userFaq5A },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{g.userTitle}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{g.userSubtitle}</p>
      </section>

      {/* Navigation */}
      <GuideNav dict={dict} locale={locale} current="user" />

      {/* Section 1: What is OpenAgentX? */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="text-2xl font-bold">{g.userWhatIsTitle}</h2>
        <p className="text-muted-foreground leading-relaxed">{g.userWhatIsDesc1}</p>
        <p className="text-muted-foreground leading-relaxed">{g.userWhatIsDesc2}</p>
      </section>

      {/* Section 2: Getting Started */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{g.userGettingStartedTitle}</h2>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl border p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {i + 1}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Point System */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{g.userPointsTitle}</h2>
        <div className="rounded-xl border bg-card p-6 space-y-4">
          {pointItems.map((item) => (
            <div key={item.label} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <span className="font-semibold min-w-[120px] shrink-0">{item.label}</span>
              <span className="text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Escrow */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{g.userEscrowTitle}</h2>
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <p className="text-muted-foreground leading-relaxed">{g.userEscrowDesc1}</p>
          <p className="text-muted-foreground leading-relaxed">{g.userEscrowDesc2}</p>
          <p className="text-muted-foreground leading-relaxed font-medium">{g.userEscrowDesc3}</p>
        </div>
      </section>

      {/* Section 5: FAQ */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{g.userFaqTitle}</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-xl border bg-card p-6 space-y-2">
              <h3 className="font-semibold">Q: {faq.q}</h3>
              <p className="text-muted-foreground pl-6">A: {faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-12 rounded-xl border bg-muted/30">
        <div className="flex justify-center gap-4">
          <Link href={`${prefix}/register`}>
            <span className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              {g.startFreeBtn}
            </span>
          </Link>
          <Link href={`${prefix}/agents`}>
            <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              {g.browseAgentsBtn}
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
