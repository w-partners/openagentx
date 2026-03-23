'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getChatLocale, getChatMessages, type ChatMessages } from './chat-i18n';

interface PasscodeScreenProps {
  profileId: string;
  displayName: string;
  onSuccess: (data: { profileId: string; displayName: string; mode: string; history: Array<{ role: string; content: string }> }) => void;
  onReset: () => void;
}

export function PasscodeScreen({ profileId, displayName, onSuccess, onReset }: PasscodeScreenProps) {
  const [t, setT] = useState<ChatMessages | null>(null);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const locale = getChatLocale();
    setT(getChatMessages(locale));
  }, []);

  const handleSubmit = async () => {
    if (passcode.length < 4 || !t) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', profileId, passcode }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || t.passcodeWrong);
        setPasscode('');
        return;
      }

      onSuccess(data.data);
    } catch {
      if (t) setError(t.serverError);
    } finally {
      setLoading(false);
    }
  };

  if (!t) return null;

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-background">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t.welcomeBack}</h1>
          <p className="text-sm text-muted-foreground">{t.passcodePrompt(displayName)}</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={passcode}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPasscode(v);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={t.passcodeInputPlaceholder}
            className={cn(
              'w-full text-center text-2xl tracking-[0.5em] rounded-2xl border border-input',
              'bg-muted/50 px-4 py-3 outline-none',
              'focus:border-ring focus:ring-2 focus:ring-ring/30',
              error && 'border-destructive',
            )}
            autoFocus
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || passcode.length < 4}
            className={cn(
              'w-full rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-30 disabled:pointer-events-none',
            )}
          >
            {loading ? t.verifying : t.login}
          </button>

          <button
            onClick={onReset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.switchAccount}
          </button>
        </div>
      </div>
    </div>
  );
}
