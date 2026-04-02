'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/lib/utils/constants';
import { useDict } from '@/i18n/client';

// Demo stats (replace with API fetch)
const stats = {
  totalRevenue: 12450,
  monthlyRevenue: 3200,
  totalJobs: 187,
  completedJobs: 165,
  activeJobs: 12,
  pendingJobs: 10,
  avgRating: 4.7,
  totalReviews: 143,
  activeSubscribers: 28,
};

const recentJobs = [
  { id: '1', agentName: 'Market Sentinel', buyer: 'UserA', amount: 50, status: 'completed', date: '2026-03-22' },
  { id: '2', agentName: 'TradBot Pro', buyer: 'UserB', amount: 100, status: 'processing', date: '2026-03-21' },
  { id: '3', agentName: 'Market Sentinel', buyer: 'UserC', amount: 50, status: 'completed', date: '2026-03-20' },
  { id: '4', agentName: 'DeFi Optimizer', buyer: 'UserD', amount: 80, status: 'pending', date: '2026-03-19' },
  { id: '5', agentName: 'OnChain Detective', buyer: 'UserE', amount: 30, status: 'completed', date: '2026-03-18' },
];

export default function DashboardPage() {
  const dict = useDict();
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{dict.dashboardPage.title}</h1>
        <p className="text-muted-foreground">
          {dict.dashboardPage.description}
        </p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>{dict.dashboardPage.totalRevenue}</CardDescription>
            <CardTitle className="text-2xl">
              ${stats.totalRevenue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{dict.dashboardPage.monthlyRevenue}</CardDescription>
            <CardTitle className="text-2xl">
              ${stats.monthlyRevenue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{dict.dashboardPage.avgRating}</CardDescription>
            <CardTitle className="text-2xl">
              {stats.avgRating} / 5.0
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{dict.dashboardPage.activeSubscribers}</CardDescription>
            <CardTitle className="text-2xl">
              {stats.activeSubscribers}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Job stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>{dict.dashboardPage.totalJobs}</CardDescription>
            <CardTitle className="text-2xl">{stats.totalJobs}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>{dict.dashboardPage.completed}</span>
                <span>{stats.completedJobs}</span>
              </div>
              <div className="flex justify-between">
                <span>{dict.dashboardPage.inProgress}</span>
                <span>{stats.activeJobs}</span>
              </div>
              <div className="flex justify-between">
                <span>{dict.dashboardPage.pending}</span>
                <span>{stats.pendingJobs}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{dict.dashboardPage.completionRate}</CardDescription>
            <CardTitle className="text-2xl">
              {((stats.completedJobs / stats.totalJobs) * 100).toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${(stats.completedJobs / stats.totalJobs) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{dict.dashboardPage.reviews}</CardDescription>
            <CardTitle className="text-2xl">{stats.totalReviews}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Excellent rating with an average of {stats.avgRating} out of 5
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboardPage.revenueTrend}</CardTitle>
          <CardDescription>{dict.dashboardPage.revenueTrendDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg text-muted-foreground text-sm">
            {dict.dashboardPage.chartPlaceholder}
          </div>
        </CardContent>
      </Card>

      {/* Recent jobs */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboardPage.recentJobs}</CardTitle>
          <CardDescription>{dict.dashboardPage.recentJobsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{job.agentName}</p>
                  <p className="text-xs text-muted-foreground">
                    Buyer: {job.buyer} / {job.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${JOB_STATUS_COLORS[job.status] ?? ''}`}>
                    {JOB_STATUS_LABELS[job.status] ?? job.status}
                  </span>
                  <span className="text-sm font-medium">${job.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/agents"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">{dict.dashboardPage.manageAgents}</p>
          <p className="text-sm text-muted-foreground mt-1">{dict.dashboardPage.manageAgentsDesc}</p>
        </a>
        <a
          href="/bounties"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">{dict.dashboardPage.checkBounties}</p>
          <p className="text-sm text-muted-foreground mt-1">{dict.dashboardPage.checkBountiesDesc}</p>
        </a>
        <a
          href="/profile"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">{dict.dashboardPage.profileSettings}</p>
          <p className="text-sm text-muted-foreground mt-1">{dict.dashboardPage.profileSettingsDesc}</p>
        </a>
      </div>
    </div>
  );
}
