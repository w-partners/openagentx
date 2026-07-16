'use client';

import { useState } from 'react';

interface Props {
  clientId: string;
  redirectUri: string;
  scope: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export default function ConsentForm({
  clientId,
  redirectUri,
  scope,
  state,
  codeChallenge,
  codeChallengeMethod,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (decision: 'allow' | 'deny') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/oauth/authorize/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
        }),
      });
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      setError(data.error ?? '처리 중 오류가 발생했습니다');
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => submit('deny')}
          disabled={loading}
          className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          거부
        </button>
        <button
          type="button"
          onClick={() => submit('allow')}
          disabled={loading}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '처리 중...' : '허용'}
        </button>
      </div>
    </div>
  );
}
