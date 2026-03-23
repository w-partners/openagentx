import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/lib/utils/constants';
import TopupSection from './topup-section';
import ReferralSection from './referral-section';
import RewardSection from './reward-section';
import TrialCreditBadge from './trial-credit-badge';

// Demo user data (replace with API/session fetch)
const demoUser = {
  nickname: '크립토마스터',
  email: 'crypto@example.com',
  wallet_address: '0x1234...abcd',
  balance_usdc: 2450.50,
  is_verified: true,
  role: 'seller',
  created_at: '2026-01-15',
};

const jobHistory = [
  { id: 'j1', agentName: '마켓 센티넬', amount: 50, status: 'completed', date: '2026-03-22' },
  { id: 'j2', agentName: '트레이드 봇 프로', amount: 100, status: 'completed', date: '2026-03-18' },
  { id: 'j3', agentName: 'DeFi 옵티마이저', amount: 80, status: 'processing', date: '2026-03-15' },
  { id: 'j4', agentName: '온체인 탐정', amount: 30, status: 'completed', date: '2026-03-10' },
  { id: 'j5', agentName: '리스크 가디언', amount: 60, status: 'failed', date: '2026-03-05' },
];

const favoriteAgents = [
  { id: 'a1', name: '마켓 센티넬', category: '시장 분석', avgRating: 4.8 },
  { id: 'a2', name: '트레이드 봇 프로', category: '자동 거래', avgRating: 4.6 },
  { id: 'a3', name: '리스크 가디언', category: '리스크 관리', avgRating: 4.9 },
];

const ROLE_LABELS: Record<string, string> = {
  buyer: '구매자',
  seller: '판매자',
  admin: '관리자',
};

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">내 프로필</h1>
        <p className="text-muted-foreground">
          계정 정보를 확인하고 관리하세요
        </p>
      </div>

      {/* 체험 크레딧 배지 */}
      <TrialCreditBadge />

      {/* User info */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">닉네임</label>
                <p className="font-medium">{demoUser.nickname}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">이메일</label>
                <p className="font-medium">{demoUser.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">역할</label>
                <p className="font-medium">{ROLE_LABELS[demoUser.role] ?? demoUser.role}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">지갑 주소</label>
                <p className="font-medium font-mono text-sm">{demoUser.wallet_address}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">크레딧 잔액</label>
                <p className="text-2xl font-bold text-primary">
                  $ {demoUser.balance_usdc.toLocaleString()} 크레딧
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">인증 상태</label>
                <p className="font-medium">
                  {demoUser.is_verified ? (
                    <span className="text-green-600 dark:text-green-400">인증 완료</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">미인증</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              프로필 수정
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Balance card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>가용 크레딧</CardDescription>
            <CardTitle className="text-2xl">
              $ {demoUser.balance_usdc.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <a
                href="#topup"
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                충전하기
              </a>
              <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                출금
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>총 구매 작업</CardDescription>
            <CardTitle className="text-2xl">{jobHistory.length}건</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>즐겨찾기 에이전트</CardDescription>
            <CardTitle className="text-2xl">{favoriteAgents.length}개</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Top-up section */}
      <div id="topup">
        <TopupSection />
      </div>

      {/* Referral & Share reward section */}
      <div id="referral">
        <ReferralSection />
      </div>

      {/* Reward history section */}
      <div id="rewards">
        <RewardSection />
      </div>

      {/* Job history */}
      <Card>
        <CardHeader>
          <CardTitle>작업 내역</CardTitle>
          <CardDescription>최근 이용한 에이전트 작업 기록</CardDescription>
        </CardHeader>
        <CardContent>
          {jobHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              아직 이용 내역이 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {jobHistory.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{job.agentName}</p>
                    <p className="text-xs text-muted-foreground">{job.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${JOB_STATUS_COLORS[job.status] ?? ''}`}>
                      {JOB_STATUS_LABELS[job.status] ?? job.status}
                    </span>
                    <span className="text-sm font-medium">$ {job.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Favorites */}
      <Card>
        <CardHeader>
          <CardTitle>즐겨찾기</CardTitle>
          <CardDescription>관심 에이전트 목록</CardDescription>
        </CardHeader>
        <CardContent>
          {favoriteAgents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              즐겨찾기한 에이전트가 없습니다
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {favoriteAgents.map((agent) => (
                <a
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="rounded-lg border bg-card p-4 hover:shadow-lg transition-shadow"
                >
                  <p className="font-medium">{agent.name}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{agent.category}</span>
                    <span>평점 {agent.avgRating} / 5.0</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account actions */}
      <div className="flex gap-4 border-t pt-6">
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          판매자 대시보드
        </a>
        <p className="text-xs text-muted-foreground self-center">
          가입일: {demoUser.created_at}
        </p>
      </div>
    </div>
  );
}
