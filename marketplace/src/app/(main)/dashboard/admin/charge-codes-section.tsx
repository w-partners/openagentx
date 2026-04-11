'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AdminPagination from '@/components/admin/pagination';

interface ChargeCodeRow {
  id: string;
  code: string;
  points: number;
  status: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  used_by_email: string | null;
  used_by_nickname: string | null;
}

export default function ChargeCodesSection() {
  const [codes, setCodes] = useState<ChargeCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');

  // Create form
  const [newPoints, setNewPoints] = useState('1000');
  const [newCount, setNewCount] = useState('1');
  const [creating, setCreating] = useState(false);
  const [createdCodes, setCreatedCodes] = useState<string[]>([]);

  const fetchCodes = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/admin/charge-codes?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.codes) {
          setCodes(d.codes);
          setTotal(d.total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit, statusFilter]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreate = async () => {
    const points = parseInt(newPoints, 10);
    const count = parseInt(newCount, 10);
    if (!points || points <= 0) { alert('포인트를 입력하세요'); return; }
    if (!count || count < 1 || count > 100) { alert('수량은 1~100 사이여야 합니다'); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/charge-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, count }),
      });
      const d = await res.json();
      if (res.ok) {
        setCreatedCodes(d.codes ?? []);
        fetchCodes();
      } else {
        alert(d.error ?? '오류 발생');
      }
    } catch {
      alert('네트워크 오류');
    } finally {
      setCreating(false);
    }
  };

  const copyAll = () => {
    navigator.clipboard.writeText(createdCodes.join('\n')).catch(() => {});
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">충전 코드 관리</h2>
        <p className="text-muted-foreground">충전 코드 생성 및 관리</p>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle>충전 코드 생성</CardTitle>
          <CardDescription>새로운 충전 코드를 일괄 생성합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">포인트</label>
              <Input
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(e.target.value)}
                className="w-32 h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">수량</label>
              <Input
                type="number"
                value={newCount}
                onChange={(e) => setNewCount(e.target.value)}
                className="w-24 h-9 text-sm"
              />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="h-9">
              {creating ? '생성 중...' : '코드 생성'}
            </Button>
          </div>

          {/* Created codes display */}
          {createdCodes.length > 0 && (
            <div className="rounded-md border p-4 bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">생성된 코드 ({createdCodes.length}개)</span>
                <Button variant="outline" size="sm" onClick={copyAll}>
                  전체 복사
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {createdCodes.map((code, i) => (
                  <code key={i} className="block text-sm font-mono">{code}</code>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>충전 코드 목록</CardTitle>
              <CardDescription>총 {total}개의 코드</CardDescription>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-input bg-white dark:bg-zinc-900 text-foreground px-3 text-sm [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground"
            >
              <option value="">전체</option>
              <option value="active">미사용</option>
              <option value="used">사용됨</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-4">로딩 중...</p>
          ) : codes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">코드가 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-[1fr_80px_80px_1fr_120px] gap-2 px-4 py-2 bg-muted rounded-t-md text-sm font-medium">
                  <span>코드</span>
                  <span>포인트</span>
                  <span>상태</span>
                  <span>사용자</span>
                  <span>생성일</span>
                </div>
                {codes.map((c) => (
                  <div key={c.id} className="grid grid-cols-[1fr_80px_80px_1fr_120px] gap-2 px-4 py-2 border-b items-center text-sm">
                    <code className="font-mono text-xs">{c.code}</code>
                    <span className="font-mono">{c.points.toLocaleString()}</span>
                    <span>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                        {c.status === 'active' ? '미사용' : '사용됨'}
                      </Badge>
                    </span>
                    <span className="text-xs truncate">
                      {c.used_by_nickname
                        ? `${c.used_by_nickname} (${c.used_by_email ?? '-'})`
                        : '-'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
