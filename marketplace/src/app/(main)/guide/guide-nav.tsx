'use client';

import Link from 'next/link';
import type { Dictionary, Locale } from '@/i18n/config';

interface GuideNavProps {
  dict: Dictionary;
  locale: Locale;
  current: 'main' | 'user' | 'provider' | 'agent' | 'concepts' | 'mcp' | 'customgpt' | 'api' | 'embed' | 'chrome-extension';
}

type NavItem = {
  key: 'user' | 'provider' | 'agent' | 'concepts' | 'customgpt' | 'mcp' | 'api' | 'embed' | 'chrome-extension';
  href: string;
  dictKey?: 'navUser' | 'navProvider' | 'navAgent' | 'navConcepts' | 'navMcp';
  fallback: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'user', href: '/guide/user', dictKey: 'navUser', fallback: '사용자' },
  { key: 'provider', href: '/guide/provider', dictKey: 'navProvider', fallback: '제공자' },
  { key: 'agent', href: '/guide/agent', dictKey: 'navAgent', fallback: '에이전트' },
  { key: 'concepts', href: '/guide/concepts', dictKey: 'navConcepts', fallback: '개념' },
  { key: 'customgpt', href: '/guide/customgpt', fallback: 'ChatGPT GPT' },
  { key: 'mcp', href: '/guide/mcp', dictKey: 'navMcp', fallback: 'MCP 연동' },
  { key: 'api', href: '/guide/api', fallback: 'API 직접 호출' },
  { key: 'chrome-extension', href: '/guide/chrome-extension', fallback: 'Chrome Extension' },
  { key: 'embed', href: '/guide/embed', fallback: '임베드 위젯' },
];

export function GuideNav({ dict, locale, current }: GuideNavProps) {
  const prefix = `/${locale}`;
  const g = dict.beginnerGuide as Record<string, string> | undefined;

  return (
    <nav className="flex flex-wrap justify-center gap-2 border-b pb-4">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === current;
        const label = (item.dictKey && g?.[item.dictKey]) || item.fallback;
        return (
          <Link
            key={item.key}
            href={`${prefix}${item.href}`}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'border hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
