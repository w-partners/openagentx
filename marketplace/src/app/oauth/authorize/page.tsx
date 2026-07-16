/**
 * GET /oauth/authorize
 *
 * 표준 OAuth 2.0 Authorization Endpoint.
 * - 미로그인 사용자 → /login?next=현재URL
 * - 로그인 사용자  → 동의 화면 표시 (클라이언트/스코프)
 *
 * Query params:
 *   client_id (필수)
 *   redirect_uri (필수, 화이트리스트 매칭)
 *   response_type=code (필수)
 *   scope (필수, space-separated)
 *   state (선택, 클라이언트가 주는 그대로 redirect 에 포함)
 *   code_challenge, code_challenge_method (선택, PKCE)
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth/jwt';
import {
  getClientByClientId,
  isRedirectAllowed,
  parseScope,
  validateScopes,
  buildRedirect,
  SCOPE_LABELS_KO,
} from '@/lib/auth/oauth-provider';
import * as usersRepo from '@/lib/db/repositories/users';
import ConsentForm from './consent-form';

interface SP {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function asStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function AuthorizePage({ searchParams }: SP) {
  const sp = await searchParams;
  const clientId = asStr(sp.client_id);
  const redirectUri = asStr(sp.redirect_uri);
  const responseType = asStr(sp.response_type) ?? 'code';
  const scope = asStr(sp.scope) ?? '';
  const state = asStr(sp.state);
  const codeChallenge = asStr(sp.code_challenge);
  const codeChallengeMethod = asStr(sp.code_challenge_method);

  // Basic validation — fatal errors render an error page (cannot redirect).
  if (!clientId || !redirectUri) {
    return <ErrorPage title="잘못된 요청" message="client_id 또는 redirect_uri 가 누락되었습니다." />;
  }
  if (responseType !== 'code') {
    return (
      <ErrorPage
        title="지원되지 않는 response_type"
        message={`response_type 은 'code' 만 지원합니다. (received: ${responseType})`}
      />
    );
  }

  const client = await getClientByClientId(clientId);
  if (!client) {
    return <ErrorPage title="알 수 없는 클라이언트" message={`client_id=${clientId} 를 찾을 수 없습니다.`} />;
  }

  if (!isRedirectAllowed(client, redirectUri)) {
    return (
      <ErrorPage
        title="허용되지 않은 redirect_uri"
        message={`이 redirect_uri 는 화이트리스트에 등록되지 않았습니다.`}
      />
    );
  }

  const requestedScopes = parseScope(scope);
  const scopeCheck = validateScopes(
    requestedScopes.length ? requestedScopes : client.scopes,
    client.scopes,
  );
  if (!scopeCheck.ok) {
    redirect(
      buildRedirect(redirectUri, {
        error: 'invalid_scope',
        error_description: `허용되지 않은 scope: ${scopeCheck.invalid.join(',')}`,
        state,
      }),
    );
  }
  const finalScopes = scopeCheck.valid;

  // Auth check
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('access_token')?.value;
  let userId: string | null = null;
  if (tokenCookie) {
    const payload = await verifyToken(tokenCookie);
    if (payload?.userId) userId = payload.userId;
  }

  if (!userId) {
    const next =
      `/oauth/authorize?` +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: finalScopes.join(' '),
        ...(state ? { state } : {}),
        ...(codeChallenge ? { code_challenge: codeChallenge } : {}),
        ...(codeChallengeMethod ? { code_challenge_method: codeChallengeMethod } : {}),
      }).toString();
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const user = await usersRepo.findById(userId);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-3">
          {client.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.logo_url} alt={client.name} className="w-16 h-16 mx-auto rounded-lg" />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-lg bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
              {client.name.charAt(0)}
            </div>
          )}
          <h1 className="text-xl font-bold">{client.name}</h1>
          {client.homepage_url && (
            <a href={client.homepage_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
              {client.homepage_url}
            </a>
          )}
          {client.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{client.description}</p>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          <p className="text-sm font-medium">
            <span className="font-semibold">{user?.email ?? '사용자'}</span> 으로 로그인 됨.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold">{client.name}</span> 이(가) 다음 권한을 요청합니다:
          </p>
          <ul className="space-y-2">
            {finalScopes.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>
                  <span className="font-medium">{SCOPE_LABELS_KO[s] ?? s}</span>
                  <code className="ml-1 text-xs text-gray-400">{s}</code>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <ConsentForm
          clientId={clientId}
          redirectUri={redirectUri}
          scope={finalScopes.join(' ')}
          state={state}
          codeChallenge={codeChallenge}
          codeChallengeMethod={codeChallengeMethod}
        />

        <p className="text-xs text-gray-400 text-center">
          허용하면 이 앱이 위 권한으로 OpenAgentX 계정에 접근할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-4 text-center">
        <h1 className="text-xl font-bold text-red-600">{title}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      </div>
    </div>
  );
}
