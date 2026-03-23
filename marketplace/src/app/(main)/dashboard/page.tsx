import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/lib/utils/constants';

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
  { id: '1', agentName: '마켓 센티넬', buyer: '사용자A', amount: 50, status: 'completed', date: '2026-03-22' },
  { id: '2', agentName: '트레이드 봇 프로', buyer: '사용자B', amount: 100, status: 'processing', date: '2026-03-21' },
  { id: '3', agentName: '마켓 센티넬', buyer: '사용자C', amount: 50, status: 'completed', date: '2026-03-20' },
  { id: '4', agentName: 'DeFi 옵티마이저', buyer: '사용자D', amount: 80, status: 'pending', date: '2026-03-19' },
  { id: '5', agentName: '온체인 탐정', buyer: '사용자E', amount: 30, status: 'completed', date: '2026-03-18' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">판매자 대시보드</h1>
        <p className="text-muted-foreground">
          에이전트 수익 및 작업 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>총 수익</CardDescription>
            <CardTitle className="text-2xl">
              {stats.totalRevenue.toLocaleString()} USDC
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>이번 달 수익</CardDescription>
            <CardTitle className="text-2xl">
              {stats.monthlyRevenue.toLocaleString()} USDC
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>평균 평점</CardDescription>
            <CardTitle className="text-2xl">
              {stats.avgRating} / 5.0
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>활성 구독자</CardDescription>
            <CardTitle className="text-2xl">
              {stats.activeSubscribers}명
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Job stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>전체 작업</CardDescription>
            <CardTitle className="text-2xl">{stats.totalJobs}건</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>완료</span>
                <span>{stats.completedJobs}건</span>
              </div>
              <div className="flex justify-between">
                <span>진행 중</span>
                <span>{stats.activeJobs}건</span>
              </div>
              <div className="flex justify-between">
                <span>대기 중</span>
                <span>{stats.pendingJobs}건</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>완료율</CardDescription>
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
            <CardDescription>리뷰</CardDescription>
            <CardTitle className="text-2xl">{stats.totalReviews}개</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              평균 평점 {stats.avgRating}점으로 우수한 평가를 받고 있습니다
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>수익 추이</CardTitle>
          <CardDescription>최근 30일간 수익 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg text-muted-foreground text-sm">
            차트 영역 (추후 구현 예정)
          </div>
        </CardContent>
      </Card>

      {/* Recent jobs */}
      <Card>
        <CardHeader>
          <CardTitle>최근 작업</CardTitle>
          <CardDescription>최근 완료된 작업 목록</CardDescription>
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
                    구매자: {job.buyer} / {job.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${JOB_STATUS_COLORS[job.status] ?? ''}`}>
                    {JOB_STATUS_LABELS[job.status] ?? job.status}
                  </span>
                  <span className="text-sm font-medium">{job.amount} USDC</span>
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
          <p className="font-semibold">내 에이전트 관리</p>
          <p className="text-sm text-muted-foreground mt-1">에이전트 등록 및 설정</p>
        </a>
        <a
          href="/bounties"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">바운티 확인</p>
          <p className="text-sm text-muted-foreground mt-1">새로운 바운티에 지원하기</p>
        </a>
        <a
          href="/profile"
          className="rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-shadow"
        >
          <p className="font-semibold">프로필 설정</p>
          <p className="text-sm text-muted-foreground mt-1">계정 정보 및 지갑 관리</p>
        </a>
      </div>
    </div>
  );
}
