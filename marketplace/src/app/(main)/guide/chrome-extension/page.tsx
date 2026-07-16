import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../guide-nav';

export const metadata = {
  title: 'Chrome Extension 가이드 - OpenAgentX',
  description: '모든 웹페이지에서 우클릭 한 번으로 OpenAgentX 에이전트를 호출하세요.',
};

export default async function GuideChromeExtensionPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;

  const useCases = [
    {
      icon: '✍️',
      title: 'SNS 글 → 다른 콘텐츠로 변환',
      desc: 'Twitter/X 글을 선택 → 우클릭 → "블로그 포스트로 확장" 또는 "Threads 톤으로 재작성".',
    },
    {
      icon: '📊',
      title: '페이지 GEO/SEO 분석',
      desc: '현재 페이지 URL을 GEO Audit 에이전트에 전달해 검색 노출도와 개선 포인트를 즉시 받기.',
    },
    {
      icon: '🧪',
      title: '코드 페이지 → review-bot',
      desc: 'GitHub PR diff 화면에서 우클릭 → review-bot 으로 전달 → 코드 리뷰 코멘트 자동 생성.',
    },
    {
      icon: '🌐',
      title: '영문 페이지 → 한국어 번역',
      desc: '영어 본문을 선택 → translingua 에이전트로 자연스러운 한국어 번역을 사이드 패널에 표시.',
    },
    {
      icon: '🔍',
      title: '선택한 텍스트 → 즉시 분석',
      desc: '문서·뉴스 어디서든 텍스트를 선택해 추천 에이전트로 요약·해설·인사이트를 받기.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-8">
      {/* Hero */}
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
          <span>NEW</span>
          <span>·</span>
          <span>모든 페이지에서</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Chrome Extension으로 OpenAgentX 사용하기
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          어떤 웹페이지에서든 우클릭 한 번으로 OpenAgentX 에이전트를 호출할 수 있습니다.
          선택한 텍스트·현재 URL·페이지 본문이 자동으로 컨텍스트로 전달됩니다.
        </p>
      </section>

      <GuideNav dict={dict} locale={locale} current="chrome-extension" />

      {/* What & Why */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">무엇이고 왜 좋은가</h2>
        <div className="rounded-2xl border bg-card p-6 space-y-3 text-sm leading-relaxed">
          <p>
            OpenAgentX Chrome Extension은 브라우저에 설치하는 가벼운 확장입니다.
            마켓플레이스에 등록된 모든 에이전트를 <strong>주소창·우클릭 메뉴·사이드 패널</strong>에서 바로 호출할 수 있습니다.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>웹사이트를 떠나지 않고 AI 작업을 실행 — 복사/붙여넣기 불필요.</li>
            <li>현재 페이지 URL·선택 텍스트·페이지 본문이 자동으로 입력으로 전달.</li>
            <li>한 번 발급받은 API Key로 모든 에이전트 사용 — 추가 결제 불필요.</li>
            <li>결과는 사이드 패널에 즉시 표시, 마크다운 그대로 복사 가능.</li>
          </ul>
        </div>
      </section>

      {/* Install */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">설치 방법</h2>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <strong className="text-amber-700 dark:text-amber-400">Note:</strong>{' '}
          현재는 Chrome Web Store 미배포 상태입니다.
          개발자 모드로 unpacked 폴더를 직접 로드해 사용하세요. 배포 후 링크를 추가할 예정입니다.
        </div>
        <ol className="space-y-3 list-decimal pl-6 text-sm leading-relaxed">
          <li>
            <strong>확장 폴더 다운로드</strong> —{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">
              /home/llm/projects/cryptointel/marketplace/chrome-extension/
            </code>{' '}
            (저장소 clone 후 사용)
          </li>
          <li>
            Chrome 주소창에{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">chrome://extensions/</code>{' '}
            입력 → 우측 상단 <strong>개발자 모드</strong> 토글 ON
          </li>
          <li>
            <strong>"압축해제된 확장 프로그램을 로드합니다"</strong> 버튼 클릭 →{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">chrome-extension/</code>{' '}
            폴더 선택
          </li>
          <li>
            확장 아이콘을 우클릭 → <strong>옵션</strong> → API Key 입력 후 저장
          </li>
        </ol>
      </section>

      {/* API Key */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">API Key 발급</h2>
        <ol className="space-y-2 list-decimal pl-6 text-sm leading-relaxed">
          <li>
            <Link href={`${prefix}/profile`} className="text-primary hover:underline font-medium">
              프로필 페이지
            </Link>{' '}
            → <strong>API Keys</strong> 섹션 이동
          </li>
          <li>
            <strong>"새 키 발급"</strong> 클릭 → 이름 입력 (예: "chrome-ext")
          </li>
          <li>
            발급된 키 (<code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">oax_xxxxxx...</code>)를 복사
          </li>
          <li>
            확장 옵션 페이지에 붙여넣고 <strong>저장</strong>
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">
          ⚠️ API Key는 한 번만 표시됩니다. 분실 시 새로 발급해야 합니다.
        </p>
      </section>

      {/* Use Cases */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">사용 예시</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {useCases.map((u) => (
            <div key={u.title} className="rounded-2xl border bg-card p-5 space-y-2">
              <div className="text-3xl">{u.icon}</div>
              <h3 className="font-bold text-base">{u.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{u.desc}</p>
              <div className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 p-3 text-[11px] text-muted-foreground italic">
                [스크린샷 자리: 추후 추가 예정]
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">트러블슈팅</h2>
        <div className="rounded-2xl border bg-card divide-y">
          <div className="p-4 space-y-1">
            <p className="font-semibold text-sm">우클릭 메뉴에 "OpenAgentX"가 보이지 않아요.</p>
            <p className="text-sm text-muted-foreground">
              chrome://extensions/ 에서 확장이 활성화되어 있는지 확인하세요. 비활성화 시 메뉴가 사라집니다.
              브라우저를 새로고침(F5)한 뒤에도 안 보이면 확장을 한 번 끄고 다시 켜보세요.
            </p>
          </div>
          <div className="p-4 space-y-1">
            <p className="font-semibold text-sm">"401 Unauthorized" 에러가 떠요.</p>
            <p className="text-sm text-muted-foreground">
              API Key가 잘못되었거나 만료된 경우입니다. 옵션 페이지에서 키를 다시 입력하거나,
              프로필에서 새 키를 발급받으세요.
            </p>
          </div>
          <div className="p-4 space-y-1">
            <p className="font-semibold text-sm">"402 Payment Required" 에러가 떠요.</p>
            <p className="text-sm text-muted-foreground">
              포인트 잔액이 부족합니다.{' '}
              <Link href={`${prefix}/charge`} className="text-primary hover:underline">
                충전 페이지
              </Link>
              에서 잔액을 충전하세요.
            </p>
          </div>
          <div className="p-4 space-y-1">
            <p className="font-semibold text-sm">사이드 패널이 열리지 않아요.</p>
            <p className="text-sm text-muted-foreground">
              사이드 패널은 Chrome 114+ 에서 지원됩니다. 브라우저를 최신 버전으로 업데이트하세요.
            </p>
          </div>
        </div>
      </section>

      {/* Web Store Coming Soon */}
      <section className="rounded-2xl border-2 border-dashed border-muted-foreground/30 p-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          🚀 Chrome Web Store 배포 준비 중입니다.
        </p>
        <p className="text-xs text-muted-foreground">
          공식 등록 후 원클릭 설치 링크를 이곳에 추가할 예정입니다.
        </p>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-4">
        <Link
          href={`${prefix}/profile`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          API Key 발급하기 &rarr;
        </Link>
        <div>
          <Link
            href={`${prefix}/guide`}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            &larr; 다른 사용 방법 보기
          </Link>
        </div>
      </section>
    </div>
  );
}
