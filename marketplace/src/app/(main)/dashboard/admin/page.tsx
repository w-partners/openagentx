'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminTopupSection from './admin-topup-section';
import AdminShareSection from './admin-share-section';
import RewardsConfigSection from './rewards-config';
import QualitySection from './quality-section';
import AlgorithmSection from './algorithm-section';
import PagesSection from './pages-section';
import LanguagesSection from './languages-section';
import CurrencySection from './currency-section';
import GPTSection from './gpt-section';
import UsersSection from './users-section';
import PointsSection from './points-section';
import ChargeCodesSection from './charge-codes-section';
import AgentsManageSection from './agents-section';
import PaymentsSection from './payments-section';
import TopupManageSection from './topup-section';
import { useDict } from '@/i18n/client';


/* ─── Overview Tab ─── */
function OverviewTab({ dict }: { dict: ReturnType<typeof useDict> }) {
  const ap = dict.adminPanel as Record<string, Record<string, string>>;
  const ov = ap.overview;
  const stats = [
    { label: ov.totalUsers, value: '-' },
    { label: ov.totalAgents, value: '-' },
    { label: ov.totalTransactions, value: '-' },
    { label: ov.totalRevenue, value: '-' },
  ];

  const [counts, setCounts] = useState<{ users: number; agents: number }>({ users: 0, agents: 0 });

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setCounts({ users: d.users.length, agents: 0 });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{ov.title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i} size="sm">
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle>
                {i === 0 ? counts.users : s.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* PagesTab and LanguagesTab are now separate components: PagesSection, LanguagesSection */


/* ─── Settings Tab (existing sections) ─── */
function SettingsTab({ dict }: { dict: ReturnType<typeof useDict> }) {
  const ap = dict.adminPanel as Record<string, Record<string, string>>;
  const st = ap.settings;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{st.title}</h2>
        <p className="text-muted-foreground">{st.description}</p>
      </div>
      <AdminTopupSection />
      <AdminShareSection />
      <RewardsConfigSection />
      <QualitySection />
    </div>
  );
}

/* ─── Main Admin Page ─── */
export default function AdminDashboardPage() {
  const dict = useDict();
  const ap = dict.adminPanel as Record<string, Record<string, string>>;
  const tabs = ap.tabs;
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{dict.adminPage.title}</h1>
        <p className="text-muted-foreground">{dict.adminPage.description}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="overview">{tabs.overview}</TabsTrigger>
          <TabsTrigger value="users">{tabs.users}</TabsTrigger>
          <TabsTrigger value="points">포인트</TabsTrigger>
          <TabsTrigger value="charge-codes">충전코드</TabsTrigger>
          <TabsTrigger value="agents">{tabs.agents}</TabsTrigger>
          <TabsTrigger value="payments">결제내역</TabsTrigger>
          <TabsTrigger value="topup">충전요청</TabsTrigger>
          <TabsTrigger value="pages">{tabs.pages}</TabsTrigger>
          <TabsTrigger value="languages">{tabs.languages}</TabsTrigger>
          <TabsTrigger value="algorithm">{tabs.algorithm}</TabsTrigger>
          <TabsTrigger value="currency">{tabs.currency ?? 'Currency'}</TabsTrigger>
          <TabsTrigger value="gpt">GPT</TabsTrigger>
          <TabsTrigger value="settings">{tabs.settings}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab dict={dict} />
        </TabsContent>
        <TabsContent value="users">
          <UsersSection />
        </TabsContent>
        <TabsContent value="points">
          <PointsSection />
        </TabsContent>
        <TabsContent value="charge-codes">
          <ChargeCodesSection />
        </TabsContent>
        <TabsContent value="agents">
          <AgentsManageSection />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsSection />
        </TabsContent>
        <TabsContent value="topup">
          <TopupManageSection />
        </TabsContent>
        <TabsContent value="pages">
          <PagesSection />
        </TabsContent>
        <TabsContent value="languages">
          <LanguagesSection />
        </TabsContent>
        <TabsContent value="algorithm">
          <AlgorithmSection />
        </TabsContent>
        <TabsContent value="currency">
          <CurrencySection />
        </TabsContent>
        <TabsContent value="gpt">
          <GPTSection />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab dict={dict} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
