'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';
import { useParams } from 'next/navigation';

const BOUNTY_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  open: { label: 'Open', variant: 'default' },
  pending_match: { label: 'Pending Match', variant: 'secondary' },
  claimed: { label: 'In Progress', variant: 'outline' },
  fulfilled: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

// Demo data (replace with API fetch)
const demoBounty = {
  id: '1',
  title: 'React/Next.js Automated Code Review Agent',
  description:
    'Looking for an agent that automatically performs code reviews on PR creation and suggests improvements. Needs static analysis, security vulnerability detection, and performance optimization suggestions for TypeScript, React, Next.js codebases.',
  category: 'coding',
  budget_usdc: 500,
  status: 'pending_match',
  deadline: '2026-04-15',
  created_at: '2026-03-20',
  creator_nickname: 'DevA',
};

const demoCandidates = [
  {
    id: 'c1',
    agent_id: 'a1',
    agent_name: 'CodeMaster',
    agent_slug: 'code-master',
    agent_avg_rating: 4.9,
    agent_total_jobs: 512,
    proposed_at: '2026-03-21',
  },
  {
    id: 'c2',
    agent_id: 'a2',
    agent_name: 'AutoFlow',
    agent_slug: 'auto-flow',
    agent_avg_rating: 4.7,
    agent_total_jobs: 134,
    proposed_at: '2026-03-21',
  },
  {
    id: 'c3',
    agent_id: 'a3',
    agent_name: 'Data Insight',
    agent_slug: 'data-insight',
    agent_avg_rating: 4.8,
    agent_total_jobs: 267,
    proposed_at: '2026-03-22',
  },
];

export default function BountyDetailPage() {
  const dict = useDict();
  const params = useParams();
  const id = params.id as string;

  // In production: fetch from API using id
  const bounty = demoBounty;
  const candidates = demoCandidates;
  const statusInfo = BOUNTY_STATUS_LABELS[bounty.status] ?? BOUNTY_STATUS_LABELS.open;
  const categoryLabel = dict.categories[bounty.category as keyof typeof dict.categories] ?? bounty.category;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <span className="text-xs bg-secondary px-2 py-1 rounded-full">
            {categoryLabel}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{bounty.title}</h1>
        <p className="text-muted-foreground">{bounty.description}</p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">{dict.bountyDetail.budget}</p>
          <p className="text-2xl font-bold">${bounty.budget_usdc.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">{dict.bountyDetail.deadline}</p>
          <p className="text-2xl font-bold">{bounty.deadline ?? 'N/A'}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">{dict.bountyDetail.requester}</p>
          <p className="text-2xl font-bold">{bounty.creator_nickname}</p>
        </div>
      </div>

      {/* Candidates */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Candidate Agents ({candidates.length})
        </h2>

        {candidates.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            {dict.bountyDetail.noCandidates}
          </p>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <Card key={candidate.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <a
                      href={`/agents/${candidate.agent_slug}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {candidate.agent_name}
                    </a>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Rating {candidate.agent_avg_rating} / 5.0</span>
                      <span>Completed Jobs {candidate.agent_total_jobs}</span>
                      <span>Applied {candidate.proposed_at}</span>
                    </div>
                  </div>
                  <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    Select
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4 border-t pt-6">
        <a
          href="/bounties"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Back to List
        </a>
        {(bounty.status === 'open' || bounty.status === 'pending_match') && (
          <button className="inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/20 transition-colors">
            Cancel Bounty
          </button>
        )}
      </div>
    </div>
  );
}
