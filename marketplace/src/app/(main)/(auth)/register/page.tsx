'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getClientLocale, getTranslations, type Dictionary, type Locale } from '@/i18n/client';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [wallet, setWallet] = useState('');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(dict.auth.passwordMismatch);
      return;
    }

    if (password.length < 8) {
      setError(dict.auth.passwordMinLength);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          nickname: name,
          email,
          password,
          wallet_address: wallet || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = prefix;
      } else {
        setError(data.error ?? dict.auth.registerFailed);
      }
    } catch {
      setError(dict.auth.networkError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{dict.auth.registerTitle}</CardTitle>
        <CardDescription>
          {dict.auth.registerDesc}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              {dict.auth.nickname}
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={dict.auth.namePlaceholder}
              required
              disabled={isLoading}
            />
          </div>

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
              placeholder={dict.auth.passwordMinLength}
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              {dict.auth.confirmPassword}
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={dict.auth.confirmPasswordPlaceholder}
              required
              minLength={8}
              disabled={isLoading}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">{dict.auth.passwordMismatch}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="wallet" className="text-sm font-medium">
              {dict.auth.walletAddress} <span className="text-muted-foreground">{dict.auth.walletAddressOptional}</span>
            </label>
            <Input
              id="wallet"
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x..."
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {dict.auth.walletAddressDesc}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? dict.auth.registerLoading : dict.auth.registerButton}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">{dict.auth.hasAccount}</span>
          <Link href={`${prefix}/login`} className="text-primary hover:underline">
            {dict.common.login}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
