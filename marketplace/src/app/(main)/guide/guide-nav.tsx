'use client';

import Link from 'next/link';
import type { Dictionary, Locale } from '@/i18n/config';

interface GuideNavProps {
  dict: Dictionary;
  locale: Locale;
  current: 'main' | 'user' | 'provider' | 'agent' | 'concepts';
}

const NAV_ITEMS = [
  { key: 'user' as const, href: '/guide/user', dictKey: 'navUser' as const },
  { key: 'provider' as const, href: '/guide/provider', dictKey: 'navProvider' as const },
  { key: 'agent' as const, href: '/guide/agent', dictKey: 'navAgent' as const },
  { key: 'concepts' as const, href: '/guide/concepts', dictKey: 'navConcepts' as const },
];

export function GuideNav({ dict, locale, current }: GuideNavProps) {
  const prefix = `/${locale}`;
  const g = dict.beginnerGuide;

  return (
    <nav className="flex flex-wrap justify-center gap-2 border-b pb-4">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === current;
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
            {g[item.dictKey]}
          </Link>
        );
      })}
    </nav>
  );
}
