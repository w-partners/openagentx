'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDict } from '@/i18n/client';

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

interface MatchingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  connection_fee: number;
  status: string;
  expires_at: string;
  created_at: string;
  requester_name?: string;
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// --- Create Request Form ---
function CreateRequestForm({ onCreated }: { onCreated: () => void }) {
  const dict = useDict();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('coding');
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', title, description, category, urgency }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(dict.matchingPage.requestSuccess);
        setTitle('');
        setDescription('');
        onCreated();
      } else {
        setError(data.error || dict.matchingPage.requestFailed);
      }
    } catch {
      setError(dict.common.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{dict.matchingPage.needHelp}</CardTitle>
        <CardDescription>
          {dict.matchingPage.needHelpDesc}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{dict.matchingPage.titleLabel}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={dict.matchingPage.titlePlaceholder}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
              minLength={5}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{dict.matchingPage.descriptionLabel}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={dict.matchingPage.descriptionPlaceholder}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[100px]"
              required
              minLength={10}
              maxLength={5000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{dict.matchingPage.categoryLabel}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(dict.categories).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{dict.matchingPage.urgencyLabel}</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries({low: dict.matchingPage.urgencyLow, normal: dict.matchingPage.urgencyNormal, urgent: dict.matchingPage.urgencyUrgent, critical: dict.matchingPage.urgencyCritical}).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? dict.matchingPage.submitting : dict.matchingPage.submitRequest}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---
export default function MatchingPage() {
  const dict = useDict();
  const [requests, setRequests] = useState<MatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadRequests = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    fetch(`/api/matching?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setRequests(res.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  useEffect(() => {
    loadRequests();
    // Auto-refresh every 15 seconds
    const interval = setInterval(loadRequests, 15000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{dict.matchingPage.title}</h1>
        <p className="text-muted-foreground">
          {dict.matchingPage.description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Create Request */}
        <div className="lg:col-span-1">
          <CreateRequestForm onCreated={loadRequests} />
        </div>

        {/* Right: Waiting Requests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{dict.matchingPage.waitingRequests}</h2>
            <Button variant="outline" size="sm" onClick={loadRequests}>
              Refresh
            </Button>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              All
            </button>
            {Object.entries(dict.categories).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedCategory === key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Request list */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{dict.common.loading}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{dict.matchingPage.noWaitingRequests}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <Link key={req.id} href={`/matching/${req.id}`} className="block">
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge className={URGENCY_COLORS[req.urgency] ?? ''}>
                          {({low: dict.matchingPage.urgencyLow, normal: dict.matchingPage.urgencyNormal, urgent: dict.matchingPage.urgencyUrgent, critical: dict.matchingPage.urgencyCritical} as Record<string, string>)[req.urgency] ?? req.urgency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {dict.categories[req.category as keyof typeof dict.categories] ?? req.category}
                        </span>
                      </div>
                      <CardTitle className="text-base mt-2">{req.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs">
                        {req.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-primary">
                          {dict.matchingPage.connectionFee.replace('{fee}', Number(req.connection_fee).toFixed(2))}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        {timeRemaining(req.expires_at)}
                      </span>
                      <Button size="sm" variant="default">
                        Accept
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
