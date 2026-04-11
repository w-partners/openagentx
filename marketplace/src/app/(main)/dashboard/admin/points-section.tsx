'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AdminPagination from '@/components/admin/pagination';

interface PointRecord {
  id: string;
  user_id: string;
  payment_type: string;
  amount: number;
  currency: string;
  status: string;
  metadata: { reason?: string; adminId?: string; balanceChange?: number } | null;
  created_at: string;
  user_email: string | null;
  user_nickname: string;
}

interface UserOption {
  id: string;
  email: string | null;
  nickname: string;
}

export default function PointsSection() {
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  // User selector
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // New grant form
  const [userId, setUserId] = useState('');
  const [selectedUserLabel, setSelectedUserLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'grant' | 'revoke'>('grant');
  const [submitting, setSubmitting] = useState(false);

  // Fetch all users for the selector
  useEffect(() => {
    fetch('/api/admin/users?page=1&limit=9999')
      .then((r) => r.json())
      .then((d) => {
        if (d.users) {
          setAllUsers(d.users.map((u: { id: string; email: string | null; nickname: string }) => ({
            id: u.id,
            email: u.email,
            nickname: u.nickname,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const filteredUsers = allUsers.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.nickname.toLowerCase().includes(q) ||
      (u.email?.toLowerCase().includes(q) ?? false) ||
      u.id.toLowerCase().startsWith(q)
    );
  });

  const selectUser = (u: UserOption) => {
    setUserId(u.id);
    setSelectedUserLabel(`${u.nickname} (${u.email ?? '-'}) — ${u.id.slice(0, 8)}...`);
    setUserSearch('');
    setShowUserDropdown(false);
  };

  const clearUser = () => {
    setUserId('');
    setSelectedUserLabel('');
    setUserSearch('');
  };

  const fetchRecords = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/points?page=${page}&limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.records) {
          setRecords(d.records);
          setTotal(d.total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!userId || !amt || amt <= 0 || !reason) {
      alert('사용자, 금액, 사유를 모두 입력하세요');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: amt, type, reason }),
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message ?? '완료');
        clearUser();
        setAmount('');
        setReason('');
        fetchRecords();
      } else {
        alert(d.error ?? '오류 발생');
      }
    } catch {
      alert('네트워크 오류');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">포인트 관리</h2>
        <p className="text-muted-foreground">포인트 지급/차감 및 내역 조회</p>
      </div>

      {/* Grant/Revoke form */}
      <Card>
        <CardHeader>
          <CardTitle>포인트 지급/차감</CardTitle>
          <CardDescription>특정 사용자에게 포인트를 지급하거나 차감합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap items-start">
            {/* User selector */}
            <div className="relative w-80">
              {userId ? (
                <div className="flex items-center gap-2 h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <span className="truncate flex-1">{selectedUserLabel}</span>
                  <button
                    type="button"
                    onClick={clearUser}
                    className="text-muted-foreground hover:text-foreground text-xs shrink-0"
                  >
                    X
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="사용자 검색 (닉네임, 이메일)..."
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                    onFocus={() => setShowUserDropdown(true)}
                    className="w-full h-9 text-sm"
                  />
                  {showUserDropdown && (
                    <div className="absolute z-50 top-10 left-0 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border rounded-md shadow-lg">
                      {filteredUsers.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">검색 결과 없음</div>
                      ) : (
                        filteredUsers.slice(0, 50).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted truncate"
                            onClick={() => selectUser(u)}
                          >
                            <span className="font-medium">{u.nickname}</span>
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({u.email ?? '-'}) — {u.id.slice(0, 8)}...
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <Input
              type="number"
              placeholder="금액"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 h-9 text-sm"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'grant' | 'revoke')}
              className="h-9 rounded-md border border-input bg-white dark:bg-zinc-900 text-foreground px-3 text-sm [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground"
            >
              <option value="grant">지급</option>
              <option value="revoke">차감</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="사유"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex-1 h-9 text-sm"
            />
            <Button onClick={handleSubmit} disabled={submitting} className="h-9">
              {submitting ? '처리 중...' : type === 'grant' ? '지급하기' : '차감하기'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>포인트 지급/차감 내역</CardTitle>
          <CardDescription>관리자 포인트 조작 이력 (총 {total}건)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-4">로딩 중...</p>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">내역이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {r.user_nickname}
                      {r.user_email && (
                        <span className="text-muted-foreground font-normal ml-2 text-xs">({r.user_email})</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.metadata?.reason ?? '-'} | {new Date(r.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.payment_type === 'admin_grant' ? 'default' : 'destructive'}>
                      {r.payment_type === 'admin_grant' ? '+' : '-'}{Number(r.amount).toLocaleString()}
                    </Badge>
                  </div>
                </div>
              ))}
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
        </CardContent>
      </Card>
    </div>
  );
}
