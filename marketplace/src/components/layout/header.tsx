'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './language-switcher';
import type { Dictionary, Locale } from '@/i18n/config';

interface HeaderProps {
  dict: Dictionary;
  locale: Locale;
}

export function Header({ dict, locale }: HeaderProps) {
  const prefix = `/${locale}`;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href={prefix} className="text-xl font-bold">
          OpenAgentX
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href={`${prefix}/agents`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {dict.common.agents}
          </Link>
          <Link href={`${prefix}/bounties`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {dict.common.bounties}
          </Link>
          <Link href={`${prefix}/auctions`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {(dict.common as Record<string, string>).auctions ?? '경매'}
          </Link>
          <Link href={`${prefix}/matching`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {(dict.common as Record<string, string>).matching ?? '실시간 매칭'}
          </Link>
          <Link href={`${prefix}/chains`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {(dict.common as Record<string, string>).chains ?? '체인'}
          </Link>
          <Link href={`${prefix}/dashboard`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {dict.common.dashboard}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href={`${prefix}/login`}>
            <Button variant="ghost" size="sm">{dict.common.login}</Button>
          </Link>
          <Link href={`${prefix}/register`}>
            <Button size="sm">{dict.common.register}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
