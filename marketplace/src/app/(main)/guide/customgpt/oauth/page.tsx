/**
 * ChatGPT Custom GPT OAuth 2.0 연동 가이드
 *
 * - 마스터(개발자) 입장: GPT Builder 에서 OAuth 등록 단계
 * - 사용자 입장: 사용 시 흐름
 */

export default function CustomGPTOAuthGuidePage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">ChatGPT Custom GPT — OAuth 연동 가이드</h1>
        <p className="text-muted-foreground">
          OpenAgentX 를 ChatGPT Custom GPT 의 Actions OAuth Provider 로 연결합니다.
          사용자는 자신의 OpenAgentX 계정으로 인증하고, GPT 호출 시 본인 잔액에서 차감됩니다.
        </p>
      </div>

      {/* === Builder 섹션 === */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">1. GPT 빌더 (개발자) 설정</h2>
        <ol className="space-y-3 list-decimal list-inside">
          <li>
            <strong>관리자 페이지에서 OAuth 클라이언트 등록</strong>
            <br />
            <code className="text-xs">/dashboard/admin → OAuth Apps 탭 → + 새 클라이언트 등록</code>
            <br />
            <span className="text-sm text-muted-foreground">
              임시 redirect_uri (예: <code>https://openagentx.org/oauth/test-callback</code>) 를 넣고 일단 등록하세요.
              실제 ChatGPT callback URL 은 GPT 저장 후 표시됩니다.
            </span>
          </li>
          <li>
            <strong>등록 직후 표시되는 Client ID / Client Secret 을 복사</strong>
            <span className="text-red-600 text-sm"> (Secret 은 한 번만 표시!)</span>
          </li>
          <li>
            <strong>ChatGPT GPT Builder 에서 Authentication = OAuth 선택</strong>
            <div className="ml-4 mt-2 space-y-1 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded border">
              <div><strong>Client ID:</strong> <code>oac_xxxxxxxx</code> (위에서 복사한 값)</div>
              <div><strong>Client Secret:</strong> <code>**********</code> (위에서 복사한 값)</div>
              <div><strong>Authorization URL:</strong> <code>https://openagentx.org/oauth/authorize</code></div>
              <div><strong>Token URL:</strong> <code>https://openagentx.org/api/oauth/token</code></div>
              <div><strong>Scope:</strong> <code>agents:read agents:execute balance:read</code></div>
              <div><strong>Token Exchange Method:</strong> <code>POST</code></div>
              <div><strong>Custom Headers:</strong> 없음</div>
            </div>
          </li>
          <li>
            <strong>GPT 저장 → ChatGPT 가 표시하는 callback URL 을 복사</strong>
            <br />
            <code className="text-xs">https://chat.openai.com/aip/g-XXXX/oauth/callback</code> 형식
          </li>
          <li>
            <strong>관리자 페이지에서 해당 OAuth 클라이언트 편집</strong>
            <br />
            redirect_uris 목록에 위에서 복사한 callback URL 추가
            <span className="text-sm text-muted-foreground"> (이 단계 빠뜨리면 인증 실패!)</span>
          </li>
          <li>
            <strong>OpenAPI 스펙 등록</strong>
            <br />
            <code className="text-xs">https://openagentx.org/api/v1/openapi.json</code> URL 을 GPT Actions schema 에 import
          </li>
        </ol>
      </section>

      {/* === User 섹션 === */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">2. 사용자 흐름</h2>
        <ol className="space-y-2 list-decimal list-inside text-sm">
          <li>사용자가 GPT 사용 시도 → ChatGPT 가 &quot;Sign in with OpenAgentX&quot; 버튼 표시</li>
          <li>버튼 클릭 → <code>openagentx.org</code> 동의 화면으로 이동</li>
          <li>로그인 안 되어 있으면 로그인 → 동의 화면 → [허용] 클릭</li>
          <li>ChatGPT 로 자동 복귀 → 이후 GPT 가 사용자 잔액으로 에이전트 실행</li>
        </ol>
      </section>

      {/* === Scopes 섹션 === */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">3. 지원 Scope</h2>
        <table className="w-full text-sm border">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left p-2 border">Scope</th>
              <th className="text-left p-2 border">설명</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="p-2 border"><code>agents:read</code></td><td className="p-2 border">에이전트 목록 조회</td></tr>
            <tr><td className="p-2 border"><code>agents:execute</code></td><td className="p-2 border">에이전트 실행 (포인트 차감)</td></tr>
            <tr><td className="p-2 border"><code>balance:read</code></td><td className="p-2 border">잔액 조회</td></tr>
            <tr><td className="p-2 border"><code>balance:write</code></td><td className="p-2 border">잔액 변경 (충전/차감)</td></tr>
          </tbody>
        </table>
      </section>

      {/* === 트러블슈팅 === */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">4. 트러블슈팅</h2>
        <ul className="space-y-2 list-disc list-inside text-sm">
          <li><strong>&quot;invalid_client&quot;:</strong> Client ID/Secret 불일치 → 관리자 페이지에서 새로 등록</li>
          <li><strong>&quot;허용되지 않은 redirect_uri&quot;:</strong> ChatGPT callback URL 이 redirect_uris 목록에 없음 → 추가</li>
          <li><strong>토큰 만료:</strong> ChatGPT 가 자동으로 refresh_token 으로 갱신 (TTL: access 1시간 / refresh 30일)</li>
        </ul>
      </section>
    </div>
  );
}
