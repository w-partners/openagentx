'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getClientLocale, getTranslations, type Dictionary, type Locale } from '@/i18n/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [locale, setLocale] = useState<Locale>('en');
  const [dict, setDict] = useState<Dictionary>(getTranslations('en'));

  useEffect(() => {
    const l = getClientLocale();
    setLocale(l);
    setDict(getTranslations(l));
  }, []);

  const prefix = `/${locale}`;

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = prefix;
      } else {
        setError(data.error ?? dict.auth.loginFailed);
      }
    } catch {
      setError(dict.auth.networkError);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWalletConnect() {
    setError('');

    const win = window as unknown as Record<string, unknown>;
    if (typeof window === 'undefined' || !win.ethereum) {
      setError(dict.auth.walletNotInstalled);
      return;
    }

    try {
      setIsLoading(true);
      const ethereum = win.ethereum as {
        request: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
      };

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      const nonceRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wallet-nonce', address }),
      });
      const nonceData = await nonceRes.json();

      if (!nonceData.success) {
        setError(nonceData.error ?? dict.auth.nonceFailed);
        return;
      }

      const message = `OpenAgentX Login\n\nNonce: ${nonceData.data.nonce}`;
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      const loginRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'wallet-login',
          address,
          signature: signature[0] ?? signature,
          nonce: nonceData.data.nonce,
        }),
      });
      const loginData = await loginRes.json();

      if (loginData.success) {
        window.location.href = prefix;
      } else {
        setError(loginData.error ?? dict.auth.walletLoginFailed);
      }
    } catch {
      setError(dict.auth.walletConnectError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{dict.auth.loginTitle}</CardTitle>
        <CardDescription>{dict.auth.loginDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {dict.auth.email}
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {dict.auth.password}
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={dict.auth.passwordPlaceholder}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? dict.auth.loginLoading : dict.auth.loginButton}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{dict.common.or}</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleWalletConnect}
          disabled={isLoading}
        >
          {dict.auth.walletConnect}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">{dict.auth.noAccount}</span>
          <Link href={`${prefix}/register`} className="text-primary hover:underline">
            {dict.common.register}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
