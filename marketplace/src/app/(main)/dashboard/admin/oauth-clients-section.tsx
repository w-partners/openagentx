'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface OAuthClient {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  redirect_uris: string[];
  scopes: string[];
  logo_url: string | null;
  homepage_url: string | null;
  is_confidential: boolean;
  created_at: string;
}

const ALL_SCOPES = [
  { value: 'agents:read', label: '에이전트 목록 조회' },
  { value: 'agents:execute', label: '에이전트 실행' },
  { value: 'balance:read', label: '잔액 조회' },
  { value: 'balance:write', label: '잔액 변경' },
];

export default function OAuthClientsSection() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [redirectUris, setRedirectUris] = useState('');
  const [scopes, setScopes] = useState<string[]>(['agents:read', 'agents:execute', 'balance:read']);
  const [logoUrl, setLogoUrl] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [createdSecret, setCreatedSecret] = useState<{ client_id: string; client_secret: string } | null>(null);

  const fetchList = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/oauth-clients')
      .then((r) => r.json())
      .then((d) => {
        if (d.clients) setClients(d.clients);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const toggleScope = (s: string) => {
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleCreate = async () => {
    setError('');
    if (!name || name.length < 2) { setError('이름을 입력하세요 (2자 이상)'); return; }
    const uris = redirectUris.split('\n').map((s) => s.trim()).filter(Boolean);
    if (uris.length === 0) { setError('redirect_uri 를 최소 1개 입력하세요'); return; }
    if (scopes.length === 0) { setError('scope 를 최소 1개 선택하세요'); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/oauth-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          redirect_uris: uris,
          scopes,
          logo_url: logoUrl || undefined,
          homepage_url: homepageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '등록 실패');
        return;
      }
      setCreatedSecret({ client_id: data.client_id, client_secret: data.client_secret });
      setShowCreate(false);
      setName(''); setDescription(''); setRedirectUris('');
      setScopes(['agents:read', 'agents:execute', 'balance:read']);
      setLogoUrl(''); setHomepageUrl('');
      fetchList();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, displayName: string) => {
    if (!confirm(`"${displayName}" 클라이언트를 삭제하시겠습니까? 모든 토큰이 즉시 무효화됩니다.`)) return;
    const res = await fetch(`/api/admin/oauth-clients/${id}`, { method: 'DELETE' });
    if (res.ok) fetchList();
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => alert('복사됨'));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>OAuth 2.0 클라이언트 (외부 앱)</CardTitle>
            <CardDescription>
              ChatGPT Custom GPT 등 외부 OAuth 앱이 OpenAgentX 사용자 계정에 접근할 수 있도록 등록합니다.
            </CardDescription>
          </div>
          <Button onClick={() => { setShowCreate(true); setError(''); }}>+ 새 클라이언트 등록</Button>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
          {!loading && clients.length === 0 && (
            <p className="text-sm text-muted-foreground">등록된 클라이언트가 없습니다.</p>
          )}
          {!loading && clients.length > 0 && (
            <div className="space-y-3">
              {clients.map((c) => (
                <div key={c.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{c.name}</div>
                      {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{c.client_id}</code>
                        <Button variant="outline" size="sm" onClick={() => copy(c.client_id)}>복사</Button>
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id, c.name)}>
                      삭제
                    </Button>
                  </div>

                  <div className="text-xs">
                    <div className="text-muted-foreground">Redirect URIs:</div>
                    <ul className="ml-3 list-disc">
                      {c.redirect_uris.map((u) => <li key={u}><code>{u}</code></li>)}
                    </ul>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    {c.scopes.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    등록: {new Date(c.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog (inline) */}
      {showCreate && (
        <Card className="border-blue-300">
          <CardHeader>
            <CardTitle>새 OAuth 클라이언트</CardTitle>
            <CardDescription>등록 후 client_secret 은 1회만 표시되니 즉시 복사하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="text-sm font-medium">이름 *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My ChatGPT" />
            </div>
            <div>
              <label className="text-sm font-medium">설명</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(선택)" />
            </div>
            <div>
              <label className="text-sm font-medium">Redirect URIs * (한 줄에 1개)</label>
              <textarea
                value={redirectUris}
                onChange={(e) => setRedirectUris(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                placeholder={'https://chat.openai.com/aip/g-XXXX/oauth/callback'}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Scopes *</label>
              <div className="space-y-1 mt-1">
                {ALL_SCOPES.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={scopes.includes(s.value)}
                      onChange={() => toggleScope(s.value)}
                    />
                    <span><code className="text-xs">{s.value}</code> — {s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Logo URL</label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Homepage URL</label>
                <Input value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>취소</Button>
              <Button onClick={handleCreate} disabled={creating}>{creating ? '등록 중...' : '등록'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secret display modal */}
      {createdSecret && (
        <Card className="border-green-400 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="text-green-700">클라이언트 등록 완료</CardTitle>
            <CardDescription className="text-red-600">
              client_secret 은 지금 한 번만 표시됩니다. 즉시 복사해 안전하게 보관하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs font-semibold">Client ID</div>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded flex-1 break-all">{createdSecret.client_id}</code>
                <Button size="sm" onClick={() => copy(createdSecret.client_id)}>복사</Button>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold">Client Secret</div>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded flex-1 break-all">{createdSecret.client_secret}</code>
                <Button size="sm" onClick={() => copy(createdSecret.client_secret)}>복사</Button>
              </div>
            </div>
            <Button variant="outline" onClick={() => setCreatedSecret(null)}>확인</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
