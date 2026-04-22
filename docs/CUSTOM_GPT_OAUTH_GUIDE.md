# ChatGPT Custom GPT 연동 완전 가이드

티업이 자기 프로젝트에서 동일하게 구현할 수 있도록 구체적으로 정리합니다.

---

## 전체 구조 개요

ChatGPT Custom GPT에서 외부 API를 호출하려면 "Actions"를 설정합니다.
인증 방식은 2가지: **API Key** (간단) / **OAuth** (사용자별 로그인)

---

## 방법 1: API Key 인증 (간단)

### 개념
- 서버에서 API Key 발급 → GPT에 하드코딩
- 모든 GPT 사용자가 같은 키로 호출됨 (단일 계정)
- 빠르게 연동할 때 적합

### 서버에서 준비할 것

**1) OpenAPI Spec 엔드포인트** (`GET /api/v1/openapi.json`)

ChatGPT가 이 JSON을 읽어서 어떤 API가 있는지 파악합니다:

```json
{
  "openapi": "3.1.0",
  "info": { "title": "내 서비스 API", "version": "1.0.0" },
  "servers": [{ "url": "https://내도메인.com" }],
  "paths": {
    "/api/v1/hello": {
      "get": {
        "operationId": "sayHello",
        "summary": "인사하기",
        "responses": { "200": { "description": "성공" } },
        "security": [{ "bearerAuth": [] }]
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "description": "API Key"
      }
    }
  }
}
```

중요: CORS 헤더 필수!
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

**2) API Key 검증 미들웨어**

```typescript
// 요청에서 키 추출
const apiKey = req.headers['authorization']?.replace('Bearer ', '')
              || req.headers['x-api-key'];

// DB에서 해시로 비교
const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
const user = await db.query('SELECT * FROM api_keys WHERE key_hash = $1', [hash]);
```

**3) API Key 발급 기능**

```typescript
const rawKey = 'myapp_' + crypto.randomBytes(16).toString('hex');
// → "myapp_a1b2c3d4e5f6..." 형태
// DB에는 SHA-256 해시만 저장, 원본은 사용자에게 한 번만 보여줌
```

### ChatGPT에서 설정하는 법

1. `chat.openai.com` → 왼쪽 메뉴 "Explore GPTs" → "Create"
2. Configure 탭:
   - Name: 내 GPT 이름
   - Instructions: GPT가 어떻게 동작할지 프롬프트 작성
3. **Actions** 섹션 → "Create new action"
4. **Authentication** 클릭:
   - Type: **API Key**
   - Auth Type: **Bearer**
   - API Key: `myapp_a1b2c3d4e5f6...` (발급받은 키 붙여넣기)
5. **Schema** 섹션:
   - "Import from URL" 클릭 → `https://내도메인.com/api/v1/openapi.json` 입력
   - 또는 JSON을 직접 붙여넣기
6. "Test" 버튼으로 확인 → Save → Publish

---

## 방법 2: OAuth 인증 (사용자별 로그인)

### 개념
- GPT 사용자 각각이 자기 계정으로 로그인
- 개인별 데이터/잔액/권한 분리 가능
- ChatGPT가 표준 OAuth 2.0 Authorization Code Flow를 수행

### 전체 흐름 (시퀀스)

```
사용자가 GPT 사용 시도
    ↓
[1] ChatGPT → GET /api/oauth/authorize
    ?client_id=chatgpt
    &redirect_uri=https://chat.openai.com/aip/g-xxxxx/oauth/callback
    &state=랜덤값
    &response_type=code
    ↓
[2] 서버 → 로그인 페이지로 리다이렉트 (302)
    Location: https://내도메인.com/oauth/login?client_id=...&redirect_uri=...&state=...
    ↓
[3] 사용자가 이메일/비밀번호 입력 → 로그인
    ↓
[4] 서버 → auth code 생성 → redirect_uri로 리다이렉트
    Location: https://chat.openai.com/aip/g-xxxxx/oauth/callback?code=AUTH_CODE&state=원래state
    ↓
[5] ChatGPT(백엔드) → POST /api/oauth/token
    body: grant_type=authorization_code&code=AUTH_CODE&client_id=...&client_secret=...
    ↓
[6] 서버 → access_token + refresh_token 반환
    { "access_token": "xxx", "token_type": "bearer", "expires_in": 3600, "refresh_token": "yyy" }
    ↓
[7] 이후 API 호출시 ChatGPT가 자동으로 Authorization: Bearer xxx 붙여서 호출
    ↓
[8] 토큰 만료시 ChatGPT가 자동으로 refresh_token으로 갱신
```

### 서버에서 구현해야 할 엔드포인트 4개

#### 엔드포인트 1: Authorization (GET /api/oauth/authorize)

ChatGPT가 처음 호출하는 URL. 로그인 페이지로 리다이렉트만 하면 됨.

```typescript
// GET /api/oauth/authorize
export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');

  // 로그인 페이지로 보내면서 파라미터 전달
  const loginUrl = new URL('https://내도메인.com/oauth/login');
  loginUrl.searchParams.set('client_id', clientId);
  loginUrl.searchParams.set('redirect_uri', redirectUri);
  loginUrl.searchParams.set('state', state);

  return Response.redirect(loginUrl.toString(), 302);
}
```

#### 엔드포인트 2: 로그인 페이지 (/oauth/login)

일반 웹 페이지. 이메일/비밀번호 폼. 로그인 성공하면 /api/oauth/login에 POST.

```html
<form onSubmit="handleLogin()">
  <input type="email" name="email" />
  <input type="password" name="password" />
  <button type="submit">로그인하고 연결</button>
</form>

<script>
async function handleLogin() {
  const res = await fetch('/api/oauth/login', {
    method: 'POST',
    body: JSON.stringify({
      email, password,
      redirectUri: URL파라미터에서가져온값,
      state: URL파라미터에서가져온값
    })
  });
  const data = await res.json();
  // 서버가 돌려준 redirectUrl로 이동 (ChatGPT 콜백으로 돌아감)
  window.location.href = data.redirectUrl;
}
</script>
```

#### 엔드포인트 3: 로그인 처리 (POST /api/oauth/login)

로그인 검증 → auth code 생성 → redirect URL 조립

```typescript
// POST /api/oauth/login
export async function POST(request: Request) {
  const { email, password, redirectUri, state } = await request.json();

  // 1. 로그인 검증
  const user = await verifyLogin(email, password);
  if (!user) return Response.json({ error: '로그인 실패' }, { status: 401 });

  // 2. 일회용 코드 생성 (32바이트 랜덤)
  const code = crypto.randomBytes(32).toString('hex');

  // 3. DB에 해시로 저장 (5분 만료)
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  await db.query(
    `INSERT INTO oauth_codes (user_id, code_hash, redirect_uri, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')`,
    [user.id, codeHash, redirectUri]
  );

  // 4. ChatGPT 콜백 URL 조립
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set('code', code);
  callbackUrl.searchParams.set('state', state);

  return Response.json({ redirectUrl: callbackUrl.toString() });
}
```

#### 엔드포인트 4: Token 발급 (POST /api/oauth/token)

ChatGPT가 code → token 교환, 또는 refresh 할 때 호출.
**중요: Content-Type이 `application/x-www-form-urlencoded`로 올 수 있음!**

```typescript
// POST /api/oauth/token
export async function POST(request: Request) {
  // form-urlencoded 또는 JSON 둘 다 처리
  const contentType = request.headers.get('content-type') || '';
  let body;
  if (contentType.includes('form-urlencoded')) {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries());
  } else {
    body = await request.json();
  }

  if (body.grant_type === 'authorization_code') {
    // code → token 교환
    const codeHash = crypto.createHash('sha256').update(body.code).digest('hex');

    // DB에서 코드 확인 (미사용 + 미만료)
    const result = await db.query(
      `SELECT user_id FROM oauth_codes
       WHERE code_hash = $1 AND used = FALSE AND expires_at > NOW()`,
      [codeHash]
    );
    if (result.rows.length === 0) {
      return Response.json({ error: 'invalid_grant' }, { status: 400 });
    }

    // 코드 사용 처리
    await db.query(`UPDATE oauth_codes SET used = TRUE WHERE code_hash = $1`, [codeHash]);

    // 토큰 생성
    const accessToken = 'myapp_at_' + crypto.randomBytes(32).toString('hex');
    const refreshToken = 'myapp_rt_' + crypto.randomBytes(32).toString('hex');

    // DB에 해시로 저장
    await db.query(
      `INSERT INTO oauth_tokens (user_id, access_token_hash, refresh_token_hash,
        access_token_expires_at, refresh_token_expires_at)
       VALUES ($1, $2, $3, NOW() + '1 hour', NOW() + '30 days')`,
      [result.rows[0].user_id,
       crypto.createHash('sha256').update(accessToken).digest('hex'),
       crypto.createHash('sha256').update(refreshToken).digest('hex')]
    );

    return Response.json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: refreshToken
    });
  }

  if (body.grant_type === 'refresh_token') {
    // refresh token → 새 토큰 발급
    const rtHash = crypto.createHash('sha256').update(body.refresh_token).digest('hex');
    const result = await db.query(
      `SELECT id, user_id FROM oauth_tokens
       WHERE refresh_token_hash = $1 AND refresh_token_expires_at > NOW()`,
      [rtHash]
    );
    if (result.rows.length === 0) {
      return Response.json({ error: 'invalid_grant' }, { status: 400 });
    }

    // 기존 토큰 삭제 (rotation)
    await db.query(`DELETE FROM oauth_tokens WHERE id = $1`, [result.rows[0].id]);

    // 새 토큰 발급
    const newAt = 'myapp_at_' + crypto.randomBytes(32).toString('hex');
    const newRt = 'myapp_rt_' + crypto.randomBytes(32).toString('hex');

    await db.query(
      `INSERT INTO oauth_tokens (user_id, access_token_hash, refresh_token_hash,
        access_token_expires_at, refresh_token_expires_at)
       VALUES ($1, $2, $3, NOW() + '1 hour', NOW() + '30 days')`,
      [result.rows[0].user_id,
       crypto.createHash('sha256').update(newAt).digest('hex'),
       crypto.createHash('sha256').update(newRt).digest('hex')]
    );

    return Response.json({
      access_token: newAt,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: newRt
    });
  }

  return Response.json({ error: 'unsupported_grant_type' }, { status: 400 });
}
```

### DB 테이블 (2개 필요)

```sql
-- 인증 코드 (임시, 5분 만료)
CREATE TABLE oauth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  code_hash VARCHAR(255) NOT NULL,
  redirect_uri TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 토큰 (access 1시간, refresh 30일)
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  access_token_hash VARCHAR(255) NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API 요청 시 토큰 검증

```typescript
// 모든 API 엔드포인트에서 사용
async function validateToken(request: Request) {
  const auth = request.headers.get('authorization');
  const token = auth?.replace('Bearer ', '');
  if (!token) return null;

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await db.query(
    `SELECT user_id FROM oauth_tokens
     WHERE access_token_hash = $1 AND access_token_expires_at > NOW()`,
    [hash]
  );
  return result.rows[0]?.user_id || null;
}
```

### ChatGPT에서 OAuth 설정하는 법

1. GPT 생성 → Configure → Actions → "Create new action"
2. **Authentication** 클릭:
   - Type: **OAuth**
   - Client ID: `chatgpt` (아무 값 — 서버에서 검증 안하면 상관없음)
   - Client Secret: `아무값` (같은 이유)
   - Authorization URL: `https://내도메인.com/api/oauth/authorize`
   - Token URL: `https://내도메인.com/api/oauth/token`
   - Scope: 비워두기
   - Token Exchange Method: **default (POST request)**
3. Schema: OpenAPI Spec URL 임포트
4. Save

### 주의사항

- Authorization URL, Token URL은 반드시 HTTPS여야 함
- Token 엔드포인트는 `application/x-www-form-urlencoded` 파싱 필수 (ChatGPT가 이 형식으로 보냄)
- `redirect_uri`는 ChatGPT가 `https://chat.openai.com/aip/g-{GPT_ID}/oauth/callback` 형태로 보냄 — 이걸 허용해야 함
- Privacy Policy URL 필수 (GPT 등록 시)

---

## 어떤 걸 선택해야 하나?

- **API Key**: 내부용/테스트용, 빠른 연동, 단일 사용자
- **OAuth**: 여러 사용자가 각자 로그인해서 쓸 때, 상용 서비스
- **추천**: 처음엔 API Key로 빠르게 연동 확인 → 나중에 OAuth 추가
