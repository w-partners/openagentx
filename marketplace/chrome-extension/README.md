# OpenAgentX Chrome Extension

어떤 웹페이지든 클릭 한 번으로 OpenAgentX의 22+ AI 에이전트와 프롬프트로 분석/변환합니다.

## 설치

### 개발자 모드 (unpacked)
1. Chrome에서 `chrome://extensions/` 접속
2. 우측 상단 **개발자 모드** 활성화
3. **압축 해제된 확장 프로그램 로드** 클릭
4. `marketplace/chrome-extension/` 폴더 선택

### Chrome Web Store
(준비 중) zip 빌드:
```bash
cd marketplace
zip -r chrome-extension/openagentx-extension-v1.0.0.zip chrome-extension/* -x "chrome-extension/*.zip"
```
생성된 zip을 [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)에 업로드하여 심사 요청.

## API Key 발급

1. https://openagentx.org 가입/로그인
2. 우측 상단 프로필 → `https://openagentx.org/profile`
3. **API Keys** 섹션에서 **Create new key** 클릭
4. `oax_xxx...` 형태의 키 복사
5. 확장 아이콘 우클릭 → **옵션** → 키 붙여넣기 → **저장** → **키 테스트**

## 사용법

### 시나리오
1. **뉴스 기사 요약**: 기사 페이지에서 OpenAgentX 아이콘 → "요약 에이전트" 카드 클릭 → side panel에 핵심 요약 표시
2. **코드 리뷰**: GitHub PR diff 페이지에서 → "Code Reviewer" 에이전트 → 리뷰 코멘트 자동 생성
3. **번역**: 영문 블로그에서 텍스트 선택 → 우클릭 **선택 영역 분석** → 번역 프롬프트 실행
4. **시장 분석**: 코인 차트 페이지에서 → "Crypto Analyst" 에이전트 → 매수/매도 시그널 분석
5. **SEO 진단**: 자사 랜딩 페이지에서 → "SEO Auditor" 에이전트 → 개선안 제시

### 기본 흐름
1. 웹페이지에서 툴바의 **OpenAgentX** 아이콘 클릭
2. 검색바로 에이전트/프롬프트 필터링 또는 탭 전환
3. 카드 클릭 → 자동으로 페이지 콘텐츠 추출 → API 호출
4. **side panel**(브라우저 우측)에 결과 표시
5. 📋 복사, ♻️ 다시 실행, 🔄 다른 에이전트로 전환

### 우클릭 메뉴
- **OpenAgentX로 분석**: 현재 페이지 전체 추출 → side panel 오픈
- **선택 영역 분석**: 선택한 텍스트만 분석

## 권한 안내

| 권한 | 용도 |
|------|------|
| `activeTab` | 현재 탭 콘텐츠 추출 |
| `storage` | API 키 로컬 저장 (chrome.storage.local) |
| `scripting` | 동적 content script 주입 |
| `contextMenus` | 우클릭 메뉴 |
| `sidePanel` | 결과 side panel 표시 |
| `<all_urls>` | 모든 페이지에서 동작 |

## 파일 구조

```
chrome-extension/
├── manifest.json          # MV3 manifest
├── popup.html / .css / .js   # 카탈로그 popup (320x500)
├── content.js             # 페이지 추출 (text, meta, headings, JSON-LD)
├── background.js          # service worker (API 호출, 컨텍스트 메뉴)
├── sidepanel.html / .css / .js  # 결과 표시 (markdown 렌더)
├── options.html / .css / .js    # API 키 설정
└── icons/
    ├── icon.svg
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## 개발

- 빌드 도구 없음 (vanilla JS)
- 변경 후 `chrome://extensions/`에서 **새로고침** 클릭
- 디버깅: popup/options 우클릭 → **검사**, background는 확장 카드의 **service worker** 링크

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| `401 키 만료/무효` | 옵션에서 키 재입력 + 테스트 |
| `402 잔액 부족` | openagentx.org/profile에서 충전 |
| 카탈로그 비어있음 | 키 테스트 OK인지 확인, 콘솔 로그 확인 |
| side panel 안 열림 | Chrome 114+ 필요 |

## 라이선스

내부 사용 (OpenAgentX 프로젝트)
