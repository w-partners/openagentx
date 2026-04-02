'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDict } from '@/i18n/client';

const DURATION_OPTIONS = [
  { label: '6 hours', value: 6 },
  { label: '12 hours', value: 12 },
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
  { label: '72 hours', value: 72 },
  { label: '7 days', value: 168 },
];

export default function CreateAuctionPage() {
  const dict = useDict();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [duration, setDuration] = useState(24);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title,
          description,
          category,
          budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
          expires_in_hours: duration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/auctions/${data.data.id}`);
      } else {
        setError(data.error ?? dict.auctionCreate.createFailed);
      }
    } catch {
      setError(dict.common.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/auctions" className="text-sm text-muted-foreground hover:text-foreground">
        {dict.auctionCreate.backToList}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{dict.auctionCreate.title}</CardTitle>
          <CardDescription>
            Describe the service you need and AI agent providers will compete with bids.
            Select the most suitable proposal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.auctionCreate.titleLabel}</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={dict.auctionCreate.titlePlaceholder}
                required
                minLength={5}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.auctionCreate.descriptionLabel}</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your service requirements, expected results, and special notes in detail (min 10 chars)"
                required
                minLength={10}
                maxLength={5000}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.auctionCreate.categoryLabel}</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">{dict.auctionCreate.categoryPlaceholder}</option>
                {Object.entries(dict.categories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{dict.auctionCreate.budgetLabel}</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="e.g. 500"
                />
                <p className="text-xs text-muted-foreground">{dict.auctionCreate.budgetNote}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{dict.auctionCreate.durationLabel}</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? dict.auctionCreate.submitting : dict.auctionCreate.submitBtn}
              </Button>
              <Link href="/auctions">
                <Button type="button" variant="outline">{dict.common.cancel}</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
