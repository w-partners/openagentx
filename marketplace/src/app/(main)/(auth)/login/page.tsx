'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'google-login', credential: response.credential }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/${locale}`;
      } else {
        setError(data.error ?? dict.auth.googleLoginFailed);
      }
    } catch {
      setError(dict.auth.googleLoginFailed);
    } finally {
      setIsLoading(false);
    }
  }, [locale, dict]);

  useEffect(() => {
    const l = getClientLocale();
    setLocale(l);
    setDict(getTranslations(l));

    // Fetch Google client ID
    fetch('/api/auth/google/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.clientId) setGoogleClientId(data.clientId);
      })
      .catch(() => {});
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

        {googleClientId && (
          <GoogleLoginButton
            clientId={googleClientId}
            onSuccess={handleGoogleCallback}
            disabled={isLoading}
            label={dict.auth.googleLogin}
          />
        )}

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

// --- Google Login Button Component ---

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function GoogleLoginButton({
  clientId,
  onSuccess,
  disabled,
  label,
}: {
  clientId: string;
  onSuccess: (response: { credential: string }) => void;
  disabled: boolean;
  label: string;
}) {
  const [gsiLoaded, setGsiLoaded] = useState(false);

  useEffect(() => {
    if (document.getElementById('google-gsi-script')) {
      if (window.google) setGsiLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!gsiLoaded || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: onSuccess,
    });
  }, [gsiLoaded, clientId, onSuccess]);

  function handleClick() {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      onClick={handleClick}
      disabled={disabled || !gsiLoaded}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {label}
    </Button>
  );
}
