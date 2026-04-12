'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PinSection() {
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/user/pin');
    if (res.ok) { const json = await res.json(); setHasPin(json.data?.hasPin ?? false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const savePin = async () => {
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setMessage({ type: 'error', text: 'PIN은 4~6자리 숫자여야 합니다.' }); return;
    }
    if (pin !== confirmPin) {
      setMessage({ type: 'error', text: 'PIN이 일치하지 않습니다.' }); return;
    }
    setLoading(true);
    const res = await fetch('/api/user/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    if (res.ok) {
      setMessage({ type: 'success', text: 'PIN이 등록되었습니다.' });
      setHasPin(true); setEditing(false); setPin(''); setConfirmPin('');
    } else {
      setMessage({ type: 'error', text: 'PIN 등록에 실패했습니다.' });
    }
    setLoading(false);
  };

  const deletePin = async () => {
    const res = await fetch('/api/user/pin', { method: 'DELETE' });
    if (res.ok) { setHasPin(false); setMessage({ type: 'success', text: 'PIN이 삭제되었습니다.' }); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>결제 PIN 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">ChatGPT/외부 서비스에서 포인트 충전 시 사용하는 비밀번호입니다.</p>

        <div className="flex items-center gap-2">
          <span className="text-sm">상태:</span>
          {hasPin ? (
            <span className="text-sm text-green-600 font-medium">PIN 등록됨</span>
          ) : (
            <span className="text-sm text-red-600 font-medium">미등록</span>
          )}
        </div>

        {message && (
          <div className={`rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
            {message.text}
          </div>
        )}

        {editing ? (
          <div className="space-y-3">
            <Input type="password" placeholder="PIN 입력 (4~6자리 숫자)" value={pin} onChange={e => setPin(e.target.value)} maxLength={6} inputMode="numeric" />
            <Input type="password" placeholder="PIN 확인" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} maxLength={6} inputMode="numeric" />
            <div className="flex gap-2">
              <Button onClick={savePin} disabled={loading}>저장</Button>
              <Button variant="outline" onClick={() => { setEditing(false); setPin(''); setConfirmPin(''); }}>취소</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setEditing(true)}>{hasPin ? 'PIN 변경' : 'PIN 등록'}</Button>
            {hasPin && <Button variant="destructive" onClick={deletePin}>PIN 삭제</Button>}
          </div>
        )}

        <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-4 space-y-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">보안 주의사항</p>
          <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5">
            <li>PIN은 절대 다른 사람에게 공유하지 마세요</li>
            <li>ChatGPT 대화에서 PIN을 입력하면 즉시 결제됩니다</li>
            <li>PIN을 5회 연속 틀리면 30분간 잠금됩니다</li>
            <li>의심스러운 결제가 있으면 즉시 PIN을 변경하세요</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
