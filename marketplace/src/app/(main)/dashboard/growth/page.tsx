'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';

// Placeholder growth metrics (replace with API fetch)
const metrics = {
  registeredAgents: 12,
  activeUsers: 348,
  jobsCompleted: 1567,
  gmvUsdc: 23450,
  acpGatewayTraffic: 892,
  ucpDiscoveryHits: 156,
  monthlyGrowthRate: 24.5,
  avgJobValue: 14.97,
};

const trafficSources = [
  { source: 'Direct Access', key: 'direct', count: 1200, percent: 42 },
  { source: 'ACP Gateway', key: 'acp', count: 892, percent: 31 },
  { source: 'UCP Discovery', key: 'ucp', count: 156, percent: 5 },
  { source: 'AP2 Protocol', key: 'ap2', count: 89, percent: 3 },
  { source: 'Other (Search engines etc.)', key: 'other', count: 543, percent: 19 },
];

const weeklyTrend = [
  { week: 'W1', agents: 3, users: 45, jobs: 120 },
  { week: 'W2', agents: 5, users: 89, jobs: 287 },
  { week: 'W3', agents: 8, users: 156, jobs: 445 },
  { week: 'W4', agents: 12, users: 348, jobs: 715 },
];

const topAgents = [
  { name: 'CryptoLens', jobs: 342, revenue: 5680, rating: 4.8 },
  { name: 'SignalForge', jobs: 289, revenue: 4320, rating: 4.6 },
  { name: 'DeFi Yield Finder', jobs: 267, revenue: 3890, rating: 4.7 },
  { name: 'ChainScope', jobs: 198, revenue: 2940, rating: 4.5 },
  { name: 'NFT Appraiser', jobs: 156, revenue: 2100, rating: 4.3 },
];

export default function GrowthDashboardPage() {
  const dict = useDict();
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{dict.growthPage.title}</h1>
          <Badge variant="destructive">{dict.growthPage.adminOnly}</Badge>
        </div>
        <p className="text-muted-foreground">
          {dict.growthPage.description}
        </p>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>{dict.growthPage.registeredAgents}</CardDescription>
            <CardTitle>{metrics.registeredAgents}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{dict.growthPage.activeUsers}</CardDescription>
            <CardTitle>{metrics.activeUsers.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{dict.growthPage.completedJobs}</CardDescription>
            <CardTitle>{metrics.jobsCompleted.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{dict.growthPage.totalGmv}</CardDescription>
            <CardTitle>${metrics.gmvUsdc.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{dict.growthPage.acpTraffic}</CardDescription>
            <CardTitle>{metrics.acpGatewayTraffic.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{dict.growthPage.ucpDiscovery}</CardDescription>
            <CardTitle>{metrics.ucpDiscoveryHits.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{dict.growthPage.monthlyGrowth}</CardDescription>
            <CardTitle className="text-green-600 dark:text-green-400">
              +{metrics.monthlyGrowthRate}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{dict.growthPage.avgJobValue}</CardDescription>
            <CardTitle>${metrics.avgJobValue}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Traffic Sources */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.growthPage.trafficSources}</CardTitle>
          <CardDescription>{dict.growthPage.trafficSourcesDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trafficSources.map((src) => (
              <div key={src.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{src.source}</span>
                  <span className="text-muted-foreground">
                    {src.count.toLocaleString()} ({src.percent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${src.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trend (placeholder table) */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.growthPage.weeklyTrend}</CardTitle>
          <CardDescription>{dict.growthPage.weeklyTrendDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <span>Week</span>
              <span>Agents</span>
              <span>Users</span>
              <span>Jobs</span>
            </div>
            {weeklyTrend.map((row) => (
              <div key={row.week} className="grid grid-cols-4 gap-4 text-sm py-2 border-b last:border-0">
                <span className="font-medium">{row.week}</span>
                <span>{row.agents}</span>
                <span>{row.users.toLocaleString()}</span>
                <span>{row.jobs.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Agents */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.growthPage.topAgents}</CardTitle>
          <CardDescription>{dict.growthPage.topAgentsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <span>Agent</span>
              <span>Completed Jobs</span>
              <span>Revenue (USD)</span>
              <span>Rating</span>
            </div>
            {topAgents.map((agent) => (
              <div key={agent.name} className="grid grid-cols-4 gap-4 text-sm py-2 border-b last:border-0">
                <span className="font-medium">{agent.name}</span>
                <span>{agent.jobs.toLocaleString()}</span>
                <span>{agent.revenue.toLocaleString()}</span>
                <span>{agent.rating.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/dashboard/admin"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">{dict.growthPage.adminDashboard}</p>
          <p className="text-sm text-muted-foreground mt-1">{dict.growthPage.adminDashboardDesc}</p>
        </a>
        <a
          href="/agents"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">{dict.growthPage.agentList}</p>
          <p className="text-sm text-muted-foreground mt-1">{dict.growthPage.agentListDesc}</p>
        </a>
        <a
          href="/builders"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">{dict.growthPage.foundingBuilders}</p>
          <p className="text-sm text-muted-foreground mt-1">{dict.growthPage.foundingBuildersDesc}</p>
        </a>
      </div>
    </div>
  );
}
