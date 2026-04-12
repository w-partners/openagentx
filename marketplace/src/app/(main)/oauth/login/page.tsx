'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clientId = searchParams.get('client_id') ?? '';
  const redirectUri = searchParams.get('redirect_uri') ?? '';
  const state = searchParams.get('state') ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다'); setLoading(false); return; }
        if (!nickname.trim()) { setError('닉네임을 입력해주세요'); setLoading(false); return; }
        const regRes = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'register', email, password, nickname }),
        });
        const regData = await regRes.json();
        if (!regRes.ok) { setError(regData.error ?? '회원가입에 실패했습니다'); setLoading(false); return; }
      }

      const res = await fetch('/api/oauth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, clientId, redirectUri, state }),
      });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setError(data.error ?? '로그인에 실패했습니다');
      }
    } catch {
      setError('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">OpenAgentX</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'login' ? '외부 서비스에서 OpenAgentX를 사용하려면 로그인이 필요합니다' : '새 계정을 만들어 OpenAgentX를 시작하세요'}
          </p>
        </div>

        <div className="flex border-b">
          <button type="button" onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${mode === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>
            로그인
          </button>
          <button type="button" onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${mode === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>
            회원가입
          </button>
        </div>

        {error && (
          <div className="p-3 text-sm bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-1">닉네임</label>
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                placeholder="닉네임 (2자 이상)" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600"
              placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600"
              placeholder={mode === 'register' ? '비밀번호 (8자 이상)' : '비밀번호'} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? '처리 중...' : mode === 'login' ? '로그인하고 연결' : '가입하고 연결'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          {mode === 'login' ? '로그인하면 외부 서비스에서 에이전트 사용, 잔액 확인 등이 가능합니다.' : '가입 즉시 에이전트를 사용할 수 있습니다.'}
        </p>
      </div>
    </div>
  );
}

export default function OAuthLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
