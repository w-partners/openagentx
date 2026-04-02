'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './language-switcher';
import { CurrencySwitcher } from './currency-switcher';
import type { Dictionary, Locale } from '@/i18n/config';

interface HeaderProps {
  dict: Dictionary;
  locale: Locale;
  isLoggedIn?: boolean;
  userRole?: string;
  enabledPages?: string[];
}

export function Header({ dict, locale, isLoggedIn, userRole, enabledPages = [] }: HeaderProps) {
  const prefix = `/${locale}`;
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // If enabledPages is empty (DB not available), show all pages. Otherwise filter.
  const isAdmin = userRole === 'admin';
  const showPage = (page: string) => isAdmin || enabledPages.length === 0 || enabledPages.includes(page);

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    window.location.href = prefix;
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href={prefix} className="text-xl font-bold">
          OpenAgentX
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {showPage('agents') && (
            <Link href={`${prefix}/agents`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {dict.common.agents}
            </Link>
          )}
          {showPage('bounties') && (
            <Link href={`${prefix}/bounties`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {dict.common.bounties}
            </Link>
          )}
          {showPage('auctions') && (
            <Link href={`${prefix}/auctions`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {(dict.common as Record<string, string>).auctions ?? 'Auctions'}
            </Link>
          )}
          {showPage('matching') && (
            <Link href={`${prefix}/matching`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {(dict.common as Record<string, string>).matching ?? 'Live Matching'}
            </Link>
          )}
          {showPage('chains') && (
            <Link href={`${prefix}/chains`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {(dict.common as Record<string, string>).chains ?? 'Chains'}
            </Link>
          )}
          {showPage('guide') && (
            <Link href={`${prefix}/guide`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {(dict.common as Record<string, string>).guide ?? 'Guide'}
            </Link>
          )}
          {showPage('dashboard') && (
            <Link href={`${prefix}/dashboard`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {dict.common.dashboard}
            </Link>
          )}
          {isAdmin && (
            <Link href={`${prefix}/dashboard/admin`} className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors">
              {(dict.common as Record<string, string>).admin ?? 'Admin'}
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <CurrencySwitcher />
          <LanguageSwitcher />
          {isLoggedIn ? (
            <>
              <Link href={`${prefix}/dashboard`}>
                <Button variant="ghost" size="sm">{dict.common.dashboard}</Button>
              </Link>
              <Link href={`${prefix}/profile`}>
                <Button variant="ghost" size="sm">
                  {(dict.common as Record<string, string>).profile ?? 'Profile'}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                {(dict.common as Record<string, string>).logout ?? 'Logout'}
              </Button>
            </>
          ) : (
            <>
              <Link href={`${prefix}/login`}>
                <Button variant="ghost" size="sm">{dict.common.login}</Button>
              </Link>
              <Link href={`${prefix}/register`}>
                <Button size="sm">{dict.common.register}</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-accent md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {showPage('agents') && (
              <Link href={`${prefix}/agents`} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                {dict.common.agents}
              </Link>
            )}
            {showPage('bounties') && (
              <Link href={`${prefix}/bounties`} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                {dict.common.bounties}
              </Link>
            )}
            {showPage('auctions') && (
              <Link href={`${prefix}/auctions`} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                {(dict.common as Record<string, string>).auctions ?? 'Auctions'}
              </Link>
            )}
            {showPage('matching') && (
              <Link href={`${prefix}/matching`} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                {(dict.common as Record<string, string>).matching ?? 'Live Matching'}
              </Link>
            )}
            {showPage('chains') && (
              <Link href={`${prefix}/chains`} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                {(dict.common as Record<string, string>).chains ?? 'Chains'}
              </Link>
            )}
            {showPage('guide') && (
              <Link href={`${prefix}/guide`} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                {(dict.common as Record<string, string>).guide ?? 'Guide'}
              </Link>
            )}
            {showPage('dashboard') && (
              <Link href={`${prefix}/dashboard`} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                {dict.common.dashboard}
              </Link>
            )}
            {isAdmin && (
              <Link href={`${prefix}/dashboard/admin`} className="rounded-md px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-accent font-medium transition-colors" onClick={() => setIsMenuOpen(false)}>
                {(dict.common as Record<string, string>).admin ?? 'Admin'}
              </Link>
            )}

            <div className="my-2 border-t" />

            <div className="flex items-center gap-3 px-3 py-2">
              <CurrencySwitcher />
              <LanguageSwitcher />
            </div>

            <div className="my-2 border-t" />

            {isLoggedIn ? (
              <div className="flex flex-col gap-1">
                <Link href={`${prefix}/dashboard`} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                  {dict.common.dashboard}
                </Link>
                <Link href={`${prefix}/profile`} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                  {(dict.common as Record<string, string>).profile ?? 'Profile'}
                </Link>
                <button className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={() => { setIsMenuOpen(false); handleLogout(); }}>
                  {(dict.common as Record<string, string>).logout ?? 'Logout'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-3">
                <Link href={`${prefix}/login`} onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">{dict.common.login}</Button>
                </Link>
                <Link href={`${prefix}/register`} onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full">{dict.common.register}</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
