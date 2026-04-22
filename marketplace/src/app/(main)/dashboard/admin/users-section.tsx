'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AdminPagination from '@/components/admin/pagination';

interface AdminUser {
  id: string;
  email: string | null;
  nickname: string;
  role: string;
  balance_usdc: number;
  created_at: string;
  is_active: boolean;
}

export default function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [grantTarget, setGrantTarget] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);

    fetch(`/api/admin/users?${params}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = d?.error ?? `HTTP ${r.status}`;
          throw new Error(
            r.status === 401
              ? '인증이 필요합니다. 다시 로그인하세요.'
              : r.status === 403
                ? '관리자 권한이 필요합니다.'
                : `서버 오류 (${r.status}): ${msg}`,
          );
        }
        if (Array.isArray(d.users)) {
          setUsers(d.users);
          setTotal(d.total ?? d.users.length);
        } else {
          throw new Error('응답 형식이 올바르지 않습니다');
        }
      })
      .catch((e: Error) => {
        console.error('Admin users fetch error:', e);
        setError(e.message || '알 수 없는 오류');
        setUsers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateRole', userId, role: newRole }),
    });
    if (res.ok) fetchUsers();
  };

  const handleToggleActive = async (userId: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleActive', userId }),
    });
    if (res.ok) fetchUsers();
  };

  const handleGrantPoints = async (userId: string) => {
    const amount = parseFloat(grantAmount);
    if (!amount || amount <= 0 || !grantReason) {
      alert('금액과 사유를 입력하세요');
      return;
    }
    const res = await fetch('/api/admin/points', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, type: 'grant', reason: grantReason }),
    });
    if (res.ok) {
      setGrantTarget(null);
      setGrantAmount('');
      setGrantReason('');
      fetchUsers();
    } else {
      const d = await res.json();
      alert(d.error ?? '오류가 발생했습니다');
    }
  };

  const startEdit = (user: AdminUser) => {
    setEditTarget(user.id);
    setEditNickname(user.nickname);
    setEditEmail(user.email ?? '');
  };

  const handleUpdateUser = async (userId: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateUser', userId, nickname: editNickname, email: editEmail }),
    });
    if (res.ok) {
      setEditTarget(null);
      fetchUsers();
    } else {
      const d = await res.json();
      alert(d.error ?? '수정 실패');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">회원 관리</h2>
        <p className="text-muted-foreground">회원 목록, 검색, 역할 변경, 포인트 지급</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="이메일 또는 닉네임 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          <strong className="font-semibold">회원 목록을 불러오지 못했습니다.</strong>
          <div className="mt-1 text-xs opacity-90">{error}</div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">로딩 중...</p>
      ) : users.length === 0 && !error ? (
        <p className="text-muted-foreground text-center py-8">회원이 없습니다</p>
      ) : users.length === 0 ? null : (
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_80px_100px_100px_100px_260px] gap-2 px-4 py-2 bg-muted rounded-t-md text-sm font-medium">
              <span>이메일</span>
              <span>닉네임</span>
              <span>역할</span>
              <span>잔액</span>
              <span>상태</span>
              <span>가입일</span>
              <span>관리</span>
            </div>
            {/* Table rows */}
            {users.map((user) => (
              <div key={user.id}>
                <div className="grid grid-cols-[1fr_1fr_80px_100px_100px_100px_260px] gap-2 px-4 py-3 border-b items-center text-sm">
                  <span className="truncate">{user.email ?? '-'}</span>
                  <span className="truncate">{user.nickname}</span>
                  <span>
                    {user.role === 'admin' ? (
                      <Badge variant="destructive">관리자</Badge>
                    ) : (
                      <Badge variant="secondary">{user.role}</Badge>
                    )}
                  </span>
                  <span className="font-mono text-xs">
                    {Number(user.balance_usdc).toLocaleString()}
                  </span>
                  <span>
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? '활성' : '비활성'}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}
                    >
                      {user.role === 'admin' ? '일반으로' : '관리자로'}
                    </Button>
                    <Button
                      variant={user.is_active ? 'destructive' : 'default'}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => handleToggleActive(user.id)}
                    >
                      {user.is_active ? '비활성화' : '활성화'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => startEdit(user)}
                    >
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setGrantTarget(grantTarget === user.id ? null : user.id)}
                    >
                      포인트
                    </Button>
                  </div>
                </div>
                {/* Edit user inline form */}
                {editTarget === user.id && (
                  <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border-b flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">닉네임</span>
                    <Input
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      className="w-36 h-8 text-sm"
                      placeholder="닉네임"
                    />
                    <span className="text-xs font-medium text-muted-foreground">이메일</span>
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-48 h-8 text-sm"
                      placeholder="이메일"
                    />
                    <Button size="sm" className="h-8 text-xs" onClick={() => handleUpdateUser(user.id)}>
                      저장
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditTarget(null)}>
                      취소
                    </Button>
                  </div>
                )}
                {/* Grant points inline form */}
                {grantTarget === user.id && (
                  <div className="px-4 py-3 bg-muted/50 border-b flex items-center gap-2 flex-wrap">
                    <Input
                      type="number"
                      placeholder="금액"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(e.target.value)}
                      className="w-24 h-8 text-sm"
                    />
                    <Input
                      placeholder="지급 사유"
                      value={grantReason}
                      onChange={(e) => setGrantReason(e.target.value)}
                      className="w-48 h-8 text-sm"
                    />
                    <Button size="sm" className="h-8 text-xs" onClick={() => handleGrantPoints(user.id)}>
                      지급
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setGrantTarget(null)}>
                      취소
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
      />
    </div>
  );
}
