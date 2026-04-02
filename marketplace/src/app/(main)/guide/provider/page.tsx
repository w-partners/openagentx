import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../guide-nav';

export default async function GuideProviderPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;
  const g = dict.beginnerGuide;

  const prereqs = [
    g.providerPrereq1,
    g.providerPrereq2,
    g.providerPrereq3,
    g.providerPrereq4,
  ];

  const commissionGuide = [
    g.providerStep4Guide1,
    g.providerStep4Guide2,
    g.providerStep4Guide3,
    g.providerStep4Guide4,
  ];

  const protocols = [
    g.providerProtocolAcp,
    g.providerProtocolX402,
    g.providerProtocolUcp,
    g.providerProtocolDirect,
  ];

  const faqs = [
    { q: g.providerFaq1Q, a: g.providerFaq1A },
    { q: g.providerFaq2Q, a: g.providerFaq2A },
    { q: g.providerFaq3Q, a: g.providerFaq3A },
    { q: g.providerFaq4Q, a: g.providerFaq4A },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{g.providerTitle}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{g.providerSubtitle}</p>
      </section>

      {/* Navigation */}
      <GuideNav dict={dict} locale={locale} current="provider" />

      {/* Section 1: What is Agent Registration? */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="text-2xl font-bold">{g.providerWhatIsTitle}</h2>
        <p className="text-muted-foreground leading-relaxed">{g.providerWhatIsDesc1}</p>
        <p className="text-muted-foreground leading-relaxed">{g.providerWhatIsDesc2}</p>
      </section>

      {/* Section 2: Prerequisites */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{g.providerPrereqTitle}</h2>
        <div className="rounded-xl border bg-card p-6">
          <ul className="space-y-3">
            {prereqs.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-primary mt-0.5">&#x2713;</span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 3: Registration Steps */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{g.providerStepsTitle}</h2>

        {/* Step 1 */}
        <div className="flex items-start gap-4 rounded-xl border p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
          <div className="space-y-1">
            <h3 className="font-semibold">{g.providerStep1Title}</h3>
            <p className="text-sm text-muted-foreground">{g.providerStep1Desc}</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4 rounded-xl border p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
          <div className="space-y-2">
            <h3 className="font-semibold">{g.providerStep2Title}</h3>
            <ul className="space-y-1 text-sm text-muted-foreground ml-2">
              <li>- {g.providerStep2Name}</li>
              <li>- {g.providerStep2Desc2}</li>
              <li>- {g.providerStep2Cat}</li>
              <li>- {g.providerStep2Tags}</li>
            </ul>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-4 rounded-xl border p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
          <div className="space-y-1">
            <h3 className="font-semibold">{g.providerStep3Title}</h3>
            <p className="text-sm text-muted-foreground">{g.providerStep3Desc}</p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex items-start gap-4 rounded-xl border p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">4</div>
          <div className="space-y-2">
            <h3 className="font-semibold">{g.providerStep4Title}</h3>
            <p className="text-sm text-muted-foreground">{g.providerStep4Desc}</p>
            <ul className="space-y-1 text-sm text-muted-foreground ml-2">
              {commissionGuide.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Step 5 */}
        <div className="flex items-start gap-4 rounded-xl border p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">5</div>
          <div className="space-y-1">
            <h3 className="font-semibold">{g.providerStep5Title}</h3>
            <p className="text-sm text-muted-foreground">{g.providerStep5Desc}</p>
          </div>
        </div>
      </section>

      {/* Section 4: Protocol Settings */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{g.providerProtocolTitle}</h2>
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <ul className="space-y-2">
            {protocols.map((item) => (
              <li key={item} className="text-muted-foreground text-sm">- {item}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground font-medium pt-2">{g.providerProtocolWhere}</p>
        </div>
      </section>

      {/* Section 5: Pricing Strategy */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{g.providerPricingTitle}</h2>
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <p className="text-muted-foreground leading-relaxed">{g.providerPricingDesc1}</p>
          <p className="text-muted-foreground leading-relaxed">{g.providerPricingDesc2}</p>
          <p className="text-muted-foreground leading-relaxed">{g.providerPricingDesc3}</p>
        </div>
      </section>

      {/* Section 6: Revenue Structure */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{g.providerRevenueTitle}</h2>
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <p className="text-muted-foreground font-mono text-sm">{g.providerRevenueFormula}</p>
          <p className="text-muted-foreground text-sm">{g.providerRevenueExample}</p>
          <p className="text-muted-foreground text-sm">{g.providerRevenueSettlement}</p>
        </div>
      </section>

      {/* Section 7: FAQ */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{g.providerFaqTitle}</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-xl border bg-card p-6 space-y-2">
              <h3 className="font-semibold">Q: {faq.q}</h3>
              <p className="text-muted-foreground pl-6">A: {faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Server Guide Link */}
      <section className="rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 space-y-3">
        <h2 className="text-2xl font-bold">{g.serverGuideLink}</h2>
        <p className="text-muted-foreground text-sm">{g.serverGuideLinkDesc}</p>
        <Link href={`${prefix}/guide/provider/server`}>
          <span className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mt-2">
            {g.serverGuideLink} &rarr;
          </span>
        </Link>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-12 rounded-xl border bg-muted/30">
        <div className="flex justify-center gap-4">
          <Link href={`${prefix}/agents/register`}>
            <span className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              {g.registerAgentBtn}
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
