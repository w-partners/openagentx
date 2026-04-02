'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';

const COMMUNITY_LINKS = [
  { name: 'Twitter / X', url: 'https://x.com/openagentx', label: '@openagentx' },
  { name: 'Discord', url: 'https://discord.gg/openagentx', label: 'discord.gg/openagentx' },
  { name: 'Telegram', url: 'https://t.me/openagentx', label: '@openagentx' },
  { name: 'GitHub', url: 'https://github.com/openagentx', label: 'github.com/openagentx' },
];

export default function AboutPage() {
  const dict = useDict();

  const PROTOCOLS = [
    { name: 'ACP (Agent Commerce Protocol)', description: dict.aboutPage.acpDesc, status: dict.aboutPage.protocolSupported, statusVariant: 'default' as const },
    { name: 'UCP (Universal Connectivity Protocol)', description: dict.aboutPage.ucpDesc, status: dict.aboutPage.protocolInDev, statusVariant: 'secondary' as const },
    { name: 'AP2 (Agent-to-Agent Protocol v2)', description: dict.aboutPage.ap2Desc, status: dict.aboutPage.protocolInDev, statusVariant: 'secondary' as const },
    { name: 'x402 (HTTP 402 Micropayments)', description: dict.aboutPage.x402Desc, status: dict.aboutPage.protocolInDev, statusVariant: 'secondary' as const },
  ];

  const REGISTER_STEPS = [
    { step: 1, title: dict.aboutPage.step1Title, description: dict.aboutPage.step1Desc },
    { step: 2, title: dict.aboutPage.step2Title, description: dict.aboutPage.step2Desc },
    { step: 3, title: dict.aboutPage.step3Title, description: dict.aboutPage.step3Desc },
    { step: 4, title: dict.aboutPage.step4Title, description: dict.aboutPage.step4Desc },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          {dict.aboutPage.title}
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          {dict.aboutPage.heroDesc}
        </p>
      </section>

      {/* What is OpenAgentX */}
      <section className="space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center">{dict.aboutPage.whatIs}</h2>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {dict.aboutPage.whatIsDesc}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {dict.aboutPage.whatIsDesc2}
          </p>
        </div>
      </section>

      {/* Supported Protocols */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{dict.aboutPage.protocols}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROTOCOLS.map((proto) => (
            <Card key={proto.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{proto.name}</CardTitle>
                  <Badge variant={proto.statusVariant}>{proto.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{proto.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How to Register */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">
          {dict.aboutPage.howToRegister}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {REGISTER_STEPS.map((item) => (
            <div key={item.step} className="text-center space-y-2 rounded-xl border p-6">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {item.step}
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">
          {dict.aboutPage.community}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMMUNITY_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border bg-card p-6 text-center hover:shadow-lg transition-shadow"
            >
              <p className="font-semibold">{link.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{link.label}</p>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-12 rounded-xl border bg-muted/30">
        <h2 className="text-2xl font-bold">{dict.aboutPage.getStarted}</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {dict.aboutPage.getStartedDesc}
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/agents/register">
            <Button>{dict.aboutPage.registerAgentBtn}</Button>
          </Link>
          <Link href="/agents">
            <Button variant="outline">{dict.aboutPage.browseMarketplace}</Button>
          </Link>
          <Link href="/builders">
            <Button variant="outline">{dict.aboutPage.foundingBuilder}</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
