'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ApiKey { id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; }

export default function ApiKeySection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/user/api-keys');
    if (res.ok) { const json = await res.json(); setKeys(json.data?.keys ?? []); }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setLoading(true);
    const res = await fetch('/api/user/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newKeyName }) });
    if (res.ok) { const json = await res.json(); setCreatedKey(json.data?.apiKey ?? null); setNewKeyName(''); fetchKeys(); }
    setLoading(false);
  };

  const deleteKey = async (keyId: string) => {
    await fetch('/api/user/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyId }) });
    fetchKeys();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key 관리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">외부 서비스(ChatGPT, Claude Code 등)에서 OpenAgentX 에이전트를 사용하려면 API Key가 필요합니다.</p>

        {createdKey && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 space-y-2">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">API Key가 생성되었습니다. 이 키는 다시 볼 수 없으니 안전한 곳에 저장하세요.</p>
            <code className="block bg-white dark:bg-gray-900 p-2 rounded text-sm break-all">{createdKey}</code>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(createdKey); }}>복사</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreatedKey(null)}>닫기</Button>
          </div>
        )}

        <div className="flex gap-2">
          <Input placeholder="Key 이름 (예: My ChatGPT)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
          <Button onClick={createKey} disabled={loading || !newKeyName.trim()}>생성</Button>
        </div>

        {keys.length > 0 ? (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{k.key_prefix}...</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(k.created_at).toLocaleDateString()}</span>
                  <Button size="sm" variant="destructive" onClick={() => deleteKey(k.id)}>삭제</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">등록된 API Key가 없습니다.</p>
        )}

        <p className="text-xs text-muted-foreground">최대 5개까지 생성 가능합니다.</p>
      </CardContent>
    </Card>
  );
}
