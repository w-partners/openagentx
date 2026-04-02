'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminTopupSection from './admin-topup-section';
import AdminShareSection from './admin-share-section';
import RewardsConfigSection from './rewards-config';
import QualitySection from './quality-section';
import AlgorithmSection from './algorithm-section';
import PagesSection from './pages-section';
import LanguagesSection from './languages-section';
import CurrencySection from './currency-section';
import { useDict } from '@/i18n/client';

/* ─── Types ─── */
interface AdminUser {
  id: string;
  email: string | null;
  nickname: string;
  role: string;
  created_at: string;
  is_active: boolean;
}


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

/* ─── Users Tab ─── */
function UsersTab({ dict }: { dict: ReturnType<typeof useDict> }) {
  const ap = dict.adminPanel as Record<string, Record<string, string>>;
  const ut = ap.users;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setUsers(d.users);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateRole', userId, role: newRole }),
    });
    if (res.ok) {
      fetchUsers();
    }
  };

  const handleToggleActive = async (userId: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleActive', userId }),
    });
    if (res.ok) {
      fetchUsers();
    }
  };

  if (loading) return <p className="text-muted-foreground py-8 text-center">{dict.common.loading}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{ut.title}</h2>
        <p className="text-muted-foreground">{ut.description}</p>
      </div>

      {users.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{ut.noUsers}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_100px_100px_120px_160px] gap-2 px-4 py-2 bg-muted rounded-t-md text-sm font-medium">
              <span>{ut.email}</span>
              <span>{ut.nickname}</span>
              <span>{ut.role}</span>
              <span>{ut.status}</span>
              <span>{ut.createdAt}</span>
              <span>{ut.actions}</span>
            </div>
            {/* Table rows */}
            {users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_1fr_100px_100px_120px_160px] gap-2 px-4 py-3 border-b items-center text-sm"
              >
                <span className="truncate">{user.email ?? '-'}</span>
                <span className="truncate">{user.nickname}</span>
                <span>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </span>
                <span>
                  <Badge variant={user.is_active ? 'default' : 'destructive'}>
                    {user.is_active ? ut.active : ut.inactive}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() =>
                      handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')
                    }
                  >
                    {user.role === 'admin' ? ut.makeUser : ut.makeAdmin}
                  </Button>
                  <Button
                    variant={user.is_active ? 'destructive' : 'default'}
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => handleToggleActive(user.id)}
                  >
                    {user.is_active ? ut.deactivate : ut.activate}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Agents Tab ─── */
function AgentsTab({ dict }: { dict: ReturnType<typeof useDict> }) {
  const ap = dict.adminPanel as Record<string, Record<string, string>>;
  const at = ap.agents;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{at.title}</h2>
        <p className="text-muted-foreground">{at.description}</p>
      </div>
      <p className="text-muted-foreground text-center py-8">{at.noAgents}</p>
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
          <TabsTrigger value="agents">{tabs.agents}</TabsTrigger>
          <TabsTrigger value="pages">{tabs.pages}</TabsTrigger>
          <TabsTrigger value="languages">{tabs.languages}</TabsTrigger>
          <TabsTrigger value="algorithm">{tabs.algorithm}</TabsTrigger>
          <TabsTrigger value="currency">{tabs.currency ?? 'Currency'}</TabsTrigger>
          <TabsTrigger value="settings">{tabs.settings}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab dict={dict} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab dict={dict} />
        </TabsContent>
        <TabsContent value="agents">
          <AgentsTab dict={dict} />
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
        <TabsContent value="settings">
          <SettingsTab dict={dict} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
