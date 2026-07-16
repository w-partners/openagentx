import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';

export default async function GuidePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;
  const g = dict.beginnerGuide as Record<string, string>;
  const isKo = locale === 'ko';

  // i18n with safe fallbacks
  const t = (key: string, ko: string, en: string) =>
    g[key] ?? (isKo ? ko : en);

  // 6 ways to use OpenAgentX
  const usageCards = [
    {
      title: t('usageWebTitle', '웹 마켓플레이스', 'Web Marketplace'),
      desc: t(
        'usageWebDesc',
        'openagentx.org에서 가입 후 브라우저로 바로 시작. 가장 빠른 방법.',
        'Sign up at openagentx.org and start in your browser. The fastest way.',
      ),
      btn: t('usageWebBtn', '에이전트 둘러보기', 'Browse agents'),
      href: `${prefix}/agents`,
      icon: '🌐',
      badge: null as string | null,
      type: t('usageWebType', '일반 사용자', 'Anyone'),
      ease: t('usageWebEase', '회원가입만 하면 즉시', 'Just sign up — instant'),
      color: 'from-sky-500/10 to-sky-600/5 border-sky-500/20',
    },
    {
      title: t('usageGptTitle', 'ChatGPT Custom GPT', 'ChatGPT Custom GPT'),
      desc: t(
        'usageGptDesc',
        'ChatGPT 안에서 자연어로 에이전트 호출. 설치 없이 가장 쉬움.',
        'Call agents from ChatGPT with natural language. No install required.',
      ),
      btn: t('usageGptBtn', '5분 안에 시작', 'Start in 5 minutes'),
      href: `${prefix}/guide/customgpt`,
      icon: '🤖',
      badge: t('badgeEasiest', '가장 쉬움', 'Easiest'),
      type: t('usageGptType', 'ChatGPT Plus 사용자', 'ChatGPT Plus users'),
      ease: t('usageGptEase', '5분 설정', '5-min setup'),
      color: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    },
    {
      title: t('usageMcpTitle', 'IDE MCP 연동', 'IDE MCP Integration'),
      desc: t(
        'usageMcpDesc',
        'Claude Code · Cursor · Codex CLI에서 MCP로 에이전트 사용.',
        'Use agents from Claude Code, Cursor, or Codex CLI via MCP.',
      ),
      btn: t('usageMcpBtn', 'MCP 설정 보기', 'View MCP setup'),
      href: `${prefix}/guide/mcp`,
      icon: '🛠️',
      badge: t('badgeDeveloper', '개발자', 'Developer'),
      type: t('usageMcpType', '개발자', 'Developers'),
      ease: t('usageMcpEase', 'JSON 한 블록', 'One JSON block'),
      color: 'from-violet-500/10 to-violet-600/5 border-violet-500/20',
    },
    {
      title: t('usageApiTitle', 'API 직접 호출', 'Direct API Call'),
      desc: t(
        'usageApiDesc',
        'curl · Python · JavaScript로 직접 호출. 자동화·스크립트 친화.',
        'Call directly with curl, Python, or JavaScript. Automation-friendly.',
      ),
      btn: t('usageApiBtn', 'API 문서 보기', 'View API docs'),
      href: `${prefix}/guide/api`,
      icon: '🐍',
      badge: t('badgeDeveloper', '개발자', 'Developer'),
      type: t('usageApiType', '개발자 / 자동화', 'Developers / Automation'),
      ease: t('usageApiEase', 'curl 한 줄', 'One curl line'),
      color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    },
    {
      title: t('usageExtTitle', 'Chrome Extension', 'Chrome Extension'),
      desc: t(
        'usageExtDesc',
        '모든 웹페이지에서 우클릭 한 번으로 에이전트 호출.',
        'Right-click any webpage to invoke agents instantly.',
      ),
      btn: t('usageExtBtn', '확장 설치하기', 'Install extension'),
      href: `${prefix}/guide/chrome-extension`,
      icon: '🧩',
      badge: t('badgeNew', 'NEW', 'NEW'),
      type: t('usageExtType', '콘텐츠 제작자 / 일반', 'Creators / Anyone'),
      ease: t('usageExtEase', '한 번 설치, 모든 페이지', 'Install once, use anywhere'),
      color: 'from-rose-500/10 to-rose-600/5 border-rose-500/20',
    },
    {
      title: t('usageEmbedTitle', 'Embed Widget', 'Embed Widget'),
      desc: t(
        'usageEmbedDesc',
        'script 한 줄로 내 사이트 방문자에게 AI 챗 제공.',
        'Add a single script tag to embed an AI chat on your site.',
      ),
      btn: t('usageEmbedBtn', '위젯 만들기', 'Create widget'),
      href: `${prefix}/guide/embed`,
      icon: '💬',
      badge: t('badgeNew', 'NEW', 'NEW'),
      type: t('usageEmbedType', '사이트 운영자', 'Site owners'),
      ease: t('usageEmbedEase', 'script 한 줄', 'One script tag'),
      color: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20',
    },
  ];

  // "어떤 방법이 나에게 맞을까?" matrix
  const fitRows = [
    {
      who: t('fitTryWho', '가입 없이 한 번 써보고 싶다', 'Want to try without signing up'),
      pick: t('fitTryPick', '웹 마켓플레이스', 'Web Marketplace'),
      href: `${prefix}/agents`,
    },
    {
      who: t('fitGptWho', 'ChatGPT Plus 구독자', 'ChatGPT Plus subscriber'),
      pick: t('fitGptPick', 'Custom GPT (자기 ChatGPT 안에서)', 'Custom GPT (inside your ChatGPT)'),
      href: `${prefix}/guide/customgpt`,
    },
    {
      who: t('fitDevWho', '자주 쓰고 자동화하고 싶다', 'Use often, want automation'),
      pick: t('fitDevPick', 'API 또는 MCP', 'API or MCP'),
      href: `${prefix}/guide/api`,
    },
    {
      who: t('fitExtWho', '모든 사이트에서 빠르게 호출', 'Call from any site quickly'),
      pick: t('fitExtPick', 'Chrome Extension', 'Chrome Extension'),
      href: `${prefix}/guide/chrome-extension`,
    },
    {
      who: t('fitEmbedWho', '내 사이트 방문자에게 제공', 'Offer to my site visitors'),
      pick: t('fitEmbedPick', 'Embed Widget', 'Embed Widget'),
      href: `${prefix}/guide/embed`,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-14 py-8">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          {t('mainHeroTitle', 'OpenAgentX 사용하기 — 6가지 방법', 'Use OpenAgentX — 6 Ways')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t(
            'mainHeroSubtitle',
            '한 계정·한 API Key로 웹·ChatGPT·IDE·API·확장·임베드까지 모두 사용할 수 있습니다.',
            'One account & API key works across web, ChatGPT, IDE, API, extension, and embed.',
          )}
        </p>
      </section>

      {/* 6 usage cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {usageCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative rounded-2xl border bg-gradient-to-b ${card.color} p-6 space-y-3 transition-all hover:scale-[1.02] hover:shadow-lg`}
          >
            {card.badge && (
              <span className="absolute top-3 right-3 rounded-full bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">
                {card.badge}
              </span>
            )}
            <div className="text-4xl">{card.icon}</div>
            <h3 className="text-lg font-bold leading-snug">{card.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed min-h-[2.5rem]">
              {card.desc}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {card.type}
              </span>
              <span className="rounded-full border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {card.ease}
              </span>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-primary group-hover:underline pt-1">
              {card.btn} &rarr;
            </span>
          </Link>
        ))}
      </section>

      {/* Which method fits me? */}
      <section className="space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
          {t('fitTitle', '어떤 방법이 나에게 맞을까?', 'Which method fits me?')}
        </h2>
        <div className="rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {t('fitColUser', '사용자', 'User')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t('fitColPick', '추천 방법', 'Recommended')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fitRows.map((row) => (
                <tr key={row.who} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{row.who}</td>
                  <td className="px-4 py-3">
                    <Link href={row.href} className="font-medium text-primary hover:underline">
                      {row.pick} &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Discover section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          href={`${prefix}/agents`}
          className="rounded-2xl border bg-card p-6 space-y-2 hover:shadow-md transition-all"
        >
          <h3 className="text-lg font-bold">
            {t('discoverAgentsTitle', '어떤 에이전트가 있나?', 'What agents are available?')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(
              'discoverAgentsDesc',
              '코드 리뷰, 콘텐츠 생성, 데이터 분석, 번역 등 다양한 AI 에이전트를 둘러보세요.',
              'Browse AI agents for code review, content creation, data analysis, translation, and more.',
            )}
          </p>
          <span className="inline-flex items-center text-sm font-medium text-primary">
            {t('discoverAgentsBtn', '에이전트 보기', 'View agents')} &rarr;
          </span>
        </Link>
        <Link
          href={`${prefix}/prompts`}
          className="rounded-2xl border bg-card p-6 space-y-2 hover:shadow-md transition-all"
        >
          <h3 className="text-lg font-bold">
            {t('discoverPromptsTitle', '어떤 프롬프트가 있나?', 'What prompts are available?')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(
              'discoverPromptsDesc',
              '재사용 가능한 프롬프트를 검색하고 즉시 실행하세요.',
              'Search and instantly run reusable prompts.',
            )}
          </p>
          <span className="inline-flex items-center text-sm font-medium text-primary">
            {t('discoverPromptsBtn', '프롬프트 보기', 'View prompts')} &rarr;
          </span>
        </Link>
      </section>

      {/* Concepts link */}
      <section className="text-center py-4">
        <Link
          href={`${prefix}/guide/concepts`}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {g.navConcepts ?? (isKo ? '핵심 개념' : 'Core Concepts')} &rarr;
        </Link>
      </section>
    </div>
  );
}
