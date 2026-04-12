'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/lib/utils/constants';
import TopupSection from './topup-section';
import ReferralSection from './referral-section';
import RewardSection from './reward-section';
import TrialCreditBadge from './trial-credit-badge';
import ApiKeySection from '@/components/profile/api-key-section';
import PinSection from '@/components/profile/pin-section';
import { useDict } from '@/i18n/client';

// Demo user data (replace with API/session fetch)
const demoUser = {
  nickname: 'CryptoMaster',
  email: 'crypto@example.com',
  wallet_address: '0x1234...abcd',
  balance_usdc: 2450.50,
  is_verified: true,
  role: 'seller',
  created_at: '2026-01-15',
};

const jobHistory = [
  { id: 'j1', agentName: 'Market Sentinel', amount: 50, status: 'completed', date: '2026-03-22' },
  { id: 'j2', agentName: 'TradBot Pro', amount: 100, status: 'completed', date: '2026-03-18' },
  { id: 'j3', agentName: 'DeFi Optimizer', amount: 80, status: 'processing', date: '2026-03-15' },
  { id: 'j4', agentName: 'OnChain Detective', amount: 30, status: 'completed', date: '2026-03-10' },
  { id: 'j5', agentName: 'Risk Guardian', amount: 60, status: 'failed', date: '2026-03-05' },
];

const favoriteAgents = [
  { id: 'a1', name: 'Market Sentinel', category: 'Market Analysis', avgRating: 4.8 },
  { id: 'a2', name: 'TradBot Pro', category: 'Auto Trading', avgRating: 4.6 },
  { id: 'a3', name: 'Risk Guardian', category: 'Risk Management', avgRating: 4.9 },
];

const ROLE_LABELS: Record<string, string> = {
  buyer: 'Buyer',
  seller: 'Seller',
  admin: 'Admin',
};

export default function ProfilePage() {
  const dict = useDict();
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{dict.profilePage.title}</h1>
        <p className="text-muted-foreground">
          {dict.profilePage.description}
        </p>
      </div>

      {/* Trial credit badge */}
      <TrialCreditBadge />

      {/* User info */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.profilePage.basicInfo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">{dict.profilePage.nickname}</label>
                <p className="font-medium">{demoUser.nickname}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{dict.profilePage.email}</label>
                <p className="font-medium">{demoUser.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{dict.profilePage.role}</label>
                <p className="font-medium">{ROLE_LABELS[demoUser.role] ?? demoUser.role}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">{dict.profilePage.walletAddress}</label>
                <p className="font-medium font-mono text-sm">{demoUser.wallet_address}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{dict.profilePage.creditBalance}</label>
                <p className="text-2xl font-bold text-primary">
                  $ {demoUser.balance_usdc.toLocaleString()} Credits
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{dict.profilePage.verificationStatus}</label>
                <p className="font-medium">
                  {demoUser.is_verified ? (
                    <span className="text-green-600 dark:text-green-400">{dict.profilePage.verified}</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">{dict.profilePage.unverified}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Edit Profile
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Balance card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>{dict.profilePage.availableCredits}</CardDescription>
            <CardTitle className="text-2xl">
              $ {demoUser.balance_usdc.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <a
                href="/charge"
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Top Up
              </a>
              <a
                href="/withdraw"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                Withdraw
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{dict.profilePage.totalPurchases}</CardDescription>
            <CardTitle className="text-2xl">{jobHistory.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="/orders"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              View Orders
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{dict.profilePage.favoriteAgents}</CardDescription>
            <CardTitle className="text-2xl">{favoriteAgents.length}</CardTitle>
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

      {/* API Key management */}
      <div id="api-keys">
        <ApiKeySection />
      </div>

      {/* Payment PIN management */}
      <div id="pin">
        <PinSection />
      </div>

      {/* Job history */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.profilePage.jobHistory}</CardTitle>
          <CardDescription>{dict.profilePage.jobHistoryDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {jobHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {dict.profilePage.noJobHistory}
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
          <CardTitle>{dict.profilePage.favorites}</CardTitle>
          <CardDescription>{dict.profilePage.favoritesDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {favoriteAgents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {dict.profilePage.noFavorites}
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
                    <span>Rating {agent.avgRating} / 5.0</span>
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
          Seller Dashboard
        </a>
        <p className="text-xs text-muted-foreground self-center">
          Joined: {demoUser.created_at}
        </p>
      </div>
    </div>
  );
}
