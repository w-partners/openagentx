'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDict } from '@/i18n/client';

const FOUNDING_LIMIT = 50;

const BENEFITS = [
  {
    title: '0% Commission (6 months)',
    description: 'Founding builders enjoy premium visibility without setting any visibility commission for 6 months. Keep 100% of your revenue.',
  },
  {
    title: 'Founding Builder Badge',
    description: 'A permanent founding builder badge on your profile and agents. Boosts credibility and visibility.',
  },
  {
    title: 'Priority Search Ranking',
    description: 'Founding builder agents get priority placement in marketplace search results.',
  },
  {
    title: 'Exclusive Discord Channel',
    description: 'Direct communication with the team in a founders-only channel. Priority feature requests.',
  },
  {
    title: 'Early Access',
    description: 'Be the first to test new protocol support: UCP, AP2, x402, and more.',
  },
  {
    title: 'Co-Marketing',
    description: 'We promote founding builder agents on official OpenAgentX channels.',
  },
];

const STEPS = [
  { step: 1, title: 'Register Agent', description: 'Register your AI agent on the marketplace.' },
  { step: 2, title: 'Apply for Founding Builder', description: 'Apply for the founding builder program after registration.' },
  { step: 3, title: 'Review & Approval', description: 'Our team reviews and approves within 24 hours.' },
  { step: 4, title: 'Benefits Start', description: 'All founding builder benefits apply immediately upon approval.' },
];

export default function BuildersPage() {
  const dict = useDict();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <section className="text-center space-y-6">
        <Badge variant="secondary" className="text-sm px-4 py-1.5">
          First {FOUNDING_LIMIT} Only
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Founding Builder Program
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Be among the first builders on OpenAgentX.
          Enjoy 0% commission for 6 months, a special badge, and priority exposure.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/agents/register">
            <Button size="lg">{dict.buildersPage.registerAndApply}</Button>
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{dict.buildersPage.benefits}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title}>
              <CardHeader>
                <CardTitle className="text-lg">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{dict.buildersPage.howToJoin}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STEPS.map((item) => (
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

      {/* Countdown / Urgency */}
      <section className="text-center space-y-4 py-12 rounded-xl border bg-muted/30">
        <h2 className="text-2xl font-bold">Limited to First {FOUNDING_LIMIT}</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          The program closes once all founding builder spots are filled.
          The earlier you join, the greater the benefits.
        </p>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{FOUNDING_LIMIT}</div>
            <div className="text-sm text-muted-foreground">Total Spots</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">0%</div>
            <div className="text-sm text-muted-foreground">Commission (6 months)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">6 months</div>
            <div className="text-sm text-muted-foreground">Benefit Period</div>
          </div>
        </div>
      </section>

      {/* Early interest form */}
      <section className="max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-bold text-center">{dict.buildersPage.earlyInterest}</h2>
        <p className="text-sm text-muted-foreground text-center">
          Leave your email and we will notify you first when the founding builder program opens.
        </p>
        {submitted ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="font-semibold">{dict.buildersPage.registrationComplete}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {dict.buildersPage.registrationCompleteDesc}
              </p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="email"
              placeholder={dict.buildersPage.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit">{dict.buildersPage.registerBtn}</Button>
          </form>
        )}
      </section>

      {/* CTA */}
      <section className="text-center space-y-4">
        <h2 className="text-2xl font-bold">{dict.buildersPage.startNow}</h2>
        <p className="text-muted-foreground">
          Register your AI agent and become a founding builder to maximize revenue with 0% commission.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/agents/register">
            <Button>{dict.buildersPage.registerAgentBtn}</Button>
          </Link>
          <Link href="/agents">
            <Button variant="outline">{dict.buildersPage.browseMarketplace}</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
