import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_LABELS } from '@/lib/utils/constants';
import AdminTopupSection from './admin-topup-section';
import AdminShareSection from './admin-share-section';
import RewardsConfigSection from './rewards-config';
import QualitySection from './quality-section';

// Demo admin stats (replace with API fetch)
const platformStats = {
  totalUsers: 1247,
  totalAgents: 86,
  activeAgents: 72,
  pendingAgents: 8,
  totalJobs: 3456,
  totalRevenue: 89450,
  monthlyRevenue: 12300,
  totalBounties: 134,
  openBounties: 23,
  activeDisputes: 3,
  totalSubscriptions: 312,
};

const pendingAgents = [
  {
    id: 'pa1',
    name: '크립토 알파 스캐너',
    owner: '개발자A',
    category: 'market_intelligence',
    submitted_at: '2026-03-21',
  },
  {
    id: 'pa2',
    name: '토큰 밸류에이터',
    owner: '개발자B',
    category: 'token_analysis',
    submitted_at: '2026-03-20',
  },
  {
    id: 'pa3',
    name: 'MEV 디텍터',
    owner: '개발자C',
    category: 'on_chain_forensics',
    submitted_at: '2026-03-19',
  },
];

const recentDisputes = [
  {
    id: 'd1',
    jobId: 'j1',
    agentName: '마켓 센티넬',
    buyer: '사용자X',
    reason: '결과물 품질 불만족',
    amount: 50,
    created_at: '2026-03-22',
  },
  {
    id: 'd2',
    jobId: 'j2',
    agentName: '트레이드 봇 프로',
    buyer: '사용자Y',
    reason: '응답 시간 초과',
    amount: 100,
    created_at: '2026-03-21',
  },
  {
    id: 'd3',
    jobId: 'j3',
    agentName: 'DeFi 옵티마이저',
    buyer: '사용자Z',
    reason: '기능 미구현',
    amount: 80,
    created_at: '2026-03-20',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">
          플랫폼 전체 현황을 모니터링하고 관리하세요
        </p>
      </div>

      {/* Platform overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>전체 사용자</CardDescription>
            <CardTitle>{platformStats.totalUsers.toLocaleString()}명</CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription>활성 에이전트</CardDescription>
            <CardTitle>{platformStats.activeAgents}개</CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription>총 작업</CardDescription>
            <CardTitle>{platformStats.totalJobs.toLocaleString()}건</CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription>총 수익</CardDescription>
            <CardTitle>$ {platformStats.totalRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription>이번 달 수익</CardDescription>
            <CardTitle>$ {platformStats.monthlyRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>대기 중 에이전트</CardDescription>
            <CardTitle className="text-orange-600 dark:text-orange-400">
              {platformStats.pendingAgents}개
            </CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription>진행 중 분쟁</CardDescription>
            <CardTitle className="text-red-600 dark:text-red-400">
              {platformStats.activeDisputes}건
            </CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription>오픈 바운티</CardDescription>
            <CardTitle>{platformStats.openBounties}개</CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription>활성 구독</CardDescription>
            <CardTitle>{platformStats.totalSubscriptions}건</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Top-up requests management */}
      <AdminTopupSection />

      {/* Share verification management */}
      <AdminShareSection />

      {/* Reward configuration */}
      <RewardsConfigSection />

      {/* Quality management */}
      <QualitySection />

      {/* Pending agents review */}
      <Card>
        <CardHeader>
          <CardTitle>승인 대기 에이전트</CardTitle>
          <CardDescription>검토가 필요한 에이전트 목록</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingAgents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              대기 중인 에이전트가 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {pendingAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{agent.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>제출자: {agent.owner}</span>
                      <span>{CATEGORY_LABELS[agent.category] ?? agent.category}</span>
                      <span>{agent.submitted_at}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      승인
                    </button>
                    <button className="inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/20 transition-colors">
                      거부
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active disputes */}
      <Card>
        <CardHeader>
          <CardTitle>진행 중 분쟁</CardTitle>
          <CardDescription>해결이 필요한 분쟁 목록</CardDescription>
        </CardHeader>
        <CardContent>
          {recentDisputes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              진행 중인 분쟁이 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {recentDisputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {dispute.agentName}
                      <span className="text-muted-foreground font-normal">
                        {' '}vs {dispute.buyer}
                      </span>
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>사유: {dispute.reason}</span>
                      <span>금액: $ {dispute.amount}</span>
                      <span>{dispute.created_at}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="destructive">분쟁 중</Badge>
                    <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                      상세보기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/dashboard"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">판매자 대시보드</p>
          <p className="text-sm text-muted-foreground mt-1">판매자 뷰로 전환</p>
        </a>
        <a
          href="/agents"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">에이전트 관리</p>
          <p className="text-sm text-muted-foreground mt-1">전체 에이전트 목록 관리</p>
        </a>
        <a
          href="/bounties"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">바운티 관리</p>
          <p className="text-sm text-muted-foreground mt-1">바운티 목록 확인 및 관리</p>
        </a>
      </div>
    </div>
  );
}
