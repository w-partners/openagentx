'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/lib/utils/constants';

const URGENCY_LABELS: Record<string, string> = {
  low: '낮음',
  normal: '보통',
  urgent: '긴급',
  critical: '매우 긴급',
};

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  waiting: '대기 중',
  matched: '매칭 완료',
  cancelled: '취소됨',
  expired: '만료됨',
};

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  matched: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

interface MatchingDetail {
  id: string;
  requester_id: string | null;
  requester_contact: Record<string, unknown> | null;
  title: string;
  description: string;
  category: string;
  urgency: string;
  connection_fee: number;
  status: string;
  matched_provider_id: string | null;
  matched_agent_id: string | null;
  matched_at: string | null;
  expires_at: string;
  created_at: string;
  requester_name?: string;
  provider_name?: string;
  agent_name?: string;
  agent_slug?: string;
}

interface AgentOption {
  id: string;
  name: string;
  slug: string;
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '만료됨';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
}

export default function MatchingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [request, setRequest] = useState<MatchingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [acceptResult, setAcceptResult] = useState<Record<string, unknown> | null>(null);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');

  const loadRequest = useCallback(() => {
    fetch(`/api/matching?id=${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setRequest(res.data);
        else setError(res.error || '요청을 불러올 수 없습니다');
      })
      .catch(() => setError('네트워크 오류'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadRequest();
    // Load provider's agents for accept form
    fetch('/api/agents?my=true')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setAgents(res.data.map((a: { id: string; name: string; slug: string }) => ({
            id: a.id, name: a.name, slug: a.slug,
          })));
          if (res.data.length > 0) setSelectedAgent(res.data[0].id);
        }
      })
      .catch(() => {});
  }, [loadRequest]);

  const handleAccept = async () => {
    if (!selectedAgent) {
      setError('에이전트를 선택해 주세요');
      return;
    }
    setAccepting(true);
    setError('');

    try {
      const res = await fetch('/api/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', request_id: id, agent_id: selectedAgent }),
      });
      const data = await res.json();
      if (data.success) {
        setAcceptResult(data.data);
        loadRequest();
      } else {
        setError(data.error || '수락에 실패했습니다');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setAccepting(false);
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch('/api/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', request_id: id }),
      });
      const data = await res.json();
      if (data.success) {
        loadRequest();
      } else {
        setError(data.error || '취소에 실패했습니다');
      }
    } catch {
      setError('네트워크 오류');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">매칭 요청을 찾을 수 없습니다</p>
        <Link href="/matching"><Button>목록으로 돌아가기</Button></Link>
      </div>
    );
  }

  const isWaiting = request.status === 'waiting';
  const isMatched = request.status === 'matched';
  const isExpired = request.status === 'expired';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/matching" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; 실시간 매칭 목록
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={STATUS_COLORS[request.status] ?? ''}>
              {STATUS_LABELS[request.status] ?? request.status}
            </Badge>
            <Badge className={URGENCY_COLORS[request.urgency] ?? ''}>
              {URGENCY_LABELS[request.urgency] ?? request.urgency}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {CATEGORY_LABELS[request.category] ?? request.category}
            </span>
          </div>
          <CardTitle className="text-2xl mt-3">{request.title}</CardTitle>
          <CardDescription>
            {request.requester_name && <span>요청자: {request.requester_name} | </span>}
            {new Date(request.created_at).toLocaleString('ko-KR')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">설명</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">연결 수수료:</span>{' '}
              <span className="text-primary font-semibold">
                {Number(request.connection_fee).toFixed(2)} USDC
              </span>
            </div>
            <div>
              <span className="font-medium">
                {isExpired ? '만료 시간:' : '남은 시간:'}
              </span>{' '}
              <span>{timeRemaining(request.expires_at)}</span>
            </div>
          </div>

          {/* Matched info */}
          {isMatched && (
            <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4 space-y-2">
              <h3 className="font-semibold text-green-800 dark:text-green-200">매칭 완료!</h3>
              <div className="text-sm space-y-1">
                {request.provider_name && (
                  <p>제공자: <span className="font-medium">{request.provider_name}</span></p>
                )}
                {request.agent_name && (
                  <p>
                    에이전트:{' '}
                    <Link href={`/agents/${request.agent_slug}`} className="font-medium text-primary hover:underline">
                      {request.agent_name}
                    </Link>
                  </p>
                )}
                {request.matched_at && (
                  <p>매칭 시간: {new Date(request.matched_at).toLocaleString('ko-KR')}</p>
                )}
              </div>
            </div>
          )}

          {/* Accept result info */}
          {acceptResult && (
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">연결 정보</h3>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(acceptResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Expired */}
          {isExpired && (
            <div className="rounded-lg border bg-red-50 dark:bg-red-950 p-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                이 요청은 만료되었습니다. 새 요청을 등록해 주세요.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {error && <p className="text-sm text-red-500 w-full">{error}</p>}

          {/* Provider accept form */}
          {isWaiting && agents.length > 0 && (
            <div className="w-full space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">에이전트 선택</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full"
              >
                {accepting
                  ? '수락 처리 중...'
                  : `수락하기 (${Number(request.connection_fee).toFixed(2)} USDC 차감)`}
              </Button>
            </div>
          )}

          {/* Requester cancel */}
          {isWaiting && (
            <Button variant="outline" onClick={handleCancel} className="w-full">
              요청 취소
            </Button>
          )}

          <Link href="/matching" className="w-full">
            <Button variant="ghost" className="w-full">목록으로</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
