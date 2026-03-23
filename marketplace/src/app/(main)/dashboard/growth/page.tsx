import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  { source: '직접 접속', key: 'direct', count: 1200, percent: 42 },
  { source: 'ACP 게이트웨이', key: 'acp', count: 892, percent: 31 },
  { source: 'UCP 디스커버리', key: 'ucp', count: 156, percent: 5 },
  { source: 'AP2 프로토콜', key: 'ap2', count: 89, percent: 3 },
  { source: '기타 (검색엔진 등)', key: 'other', count: 543, percent: 19 },
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
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">성장 대시보드</h1>
          <Badge variant="destructive">관리자 전용</Badge>
        </div>
        <p className="text-muted-foreground">
          플랫폼 성장 지표 및 트래픽 소스를 모니터링합니다
        </p>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>등록 에이전트</CardDescription>
            <CardTitle>{metrics.registeredAgents}개</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>활성 사용자</CardDescription>
            <CardTitle>{metrics.activeUsers.toLocaleString()}명</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>완료된 작업</CardDescription>
            <CardTitle>{metrics.jobsCompleted.toLocaleString()}건</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>총 GMV</CardDescription>
            <CardTitle>{metrics.gmvUsdc.toLocaleString()} USDC</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>ACP 게이트웨이 트래픽</CardDescription>
            <CardTitle>{metrics.acpGatewayTraffic.toLocaleString()}건</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>UCP 디스커버리 히트</CardDescription>
            <CardTitle>{metrics.ucpDiscoveryHits.toLocaleString()}건</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>월간 성장률</CardDescription>
            <CardTitle className="text-green-600 dark:text-green-400">
              +{metrics.monthlyGrowthRate}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>평균 작업 단가</CardDescription>
            <CardTitle>${metrics.avgJobValue}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Traffic Sources */}
      <Card>
        <CardHeader>
          <CardTitle>트래픽 소스 분석</CardTitle>
          <CardDescription>유입 경로별 트래픽 분포</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trafficSources.map((src) => (
              <div key={src.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{src.source}</span>
                  <span className="text-muted-foreground">
                    {src.count.toLocaleString()}건 ({src.percent}%)
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
          <CardTitle>주간 성장 추이</CardTitle>
          <CardDescription>최근 4주간 핵심 지표 변화</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <span>주차</span>
              <span>에이전트</span>
              <span>사용자</span>
              <span>작업 수</span>
            </div>
            {weeklyTrend.map((row) => (
              <div key={row.week} className="grid grid-cols-4 gap-4 text-sm py-2 border-b last:border-0">
                <span className="font-medium">{row.week}</span>
                <span>{row.agents}개</span>
                <span>{row.users.toLocaleString()}명</span>
                <span>{row.jobs.toLocaleString()}건</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Agents */}
      <Card>
        <CardHeader>
          <CardTitle>상위 에이전트</CardTitle>
          <CardDescription>수익 기준 상위 5개 에이전트</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <span>에이전트</span>
              <span>완료 작업</span>
              <span>수익 (USDC)</span>
              <span>평점</span>
            </div>
            {topAgents.map((agent) => (
              <div key={agent.name} className="grid grid-cols-4 gap-4 text-sm py-2 border-b last:border-0">
                <span className="font-medium">{agent.name}</span>
                <span>{agent.jobs.toLocaleString()}건</span>
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
          <p className="font-semibold">관리자 대시보드</p>
          <p className="text-sm text-muted-foreground mt-1">전체 관리 페이지로 이동</p>
        </a>
        <a
          href="/agents"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">에이전트 목록</p>
          <p className="text-sm text-muted-foreground mt-1">등록된 에이전트 확인</p>
        </a>
        <a
          href="/builders"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">파운딩 빌더</p>
          <p className="text-sm text-muted-foreground mt-1">빌더 프로그램 현황</p>
        </a>
      </div>
    </div>
  );
}
