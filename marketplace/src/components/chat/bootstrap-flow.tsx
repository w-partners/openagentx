'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChatBubble } from './chat-bubble';
import { ChatInput } from './chat-input';
import { getChatLocale, getChatMessages, type ChatMessages } from './chat-i18n';
import { cn } from '@/lib/utils';

type BootstrapStep = 'name' | 'mode' | 'passcode' | 'complete';

interface BootstrapFlowProps {
  onComplete: (data: { profileId: string; displayName: string; mode: string }) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function BootstrapFlow({ onComplete }: BootstrapFlowProps) {
  const [t, setT] = useState<ChatMessages | null>(null);
  const [step, setStep] = useState<BootstrapStep>('name');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [, setPasscode] = useState('');
  const [selectedMode, setSelectedMode] = useState<'user' | 'provider' | 'both'>('user');

  // Initialize locale on mount (client-side only)
  useEffect(() => {
    const locale = getChatLocale();
    const msgs = getChatMessages(locale);
    setT(msgs);
    setMessages([{ role: 'assistant', content: msgs.welcome }]);
  }, []);

  const addMessages = useCallback((...msgs: Message[]) => {
    setMessages((prev) => [...prev, ...msgs]);
  }, []);

  const handlePasscodeComplete = useCallback(async (code: string, msgs: Message[]) => {
    if (!t) return;
    setMessages((prev) => [...prev, ...msgs]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bootstrap', name, passcode: code, mode: selectedMode }),
      });
      const data = await res.json();

      if (!data.success) {
        addMessages({ role: 'assistant', content: t.bootstrapError(data.message) });
        setLoading(false);
        return;
      }

      addMessages({
        role: 'assistant',
        content: t.bootstrapSuccess(data.data.signupBonus),
      });
      setStep('complete');

      localStorage.setItem('chat_profileId', data.data.profileId);
      localStorage.setItem('chat_displayName', data.data.displayName);

      setTimeout(() => {
        onComplete({
          profileId: data.data.profileId,
          displayName: data.data.displayName,
          mode: data.data.mode,
        });
      }, 1500);
    } catch {
      addMessages({ role: 'assistant', content: t.serverError });
    } finally {
      setLoading(false);
    }
  }, [name, selectedMode, t, onComplete, addMessages]);

  const handleSend = useCallback(async (input: string) => {
    if (!t) return;
    setError('');

    if (step === 'name') {
      const trimmed = input.trim();
      if (trimmed.length < 1 || trimmed.length > 100) {
        setError(t.nameError);
        return;
      }
      setName(trimmed);
      addMessages(
        { role: 'user', content: trimmed },
        { role: 'assistant', content: t.modePrompt },
      );
      setStep('mode');
      return;
    }

    if (step === 'passcode') {
      const code = input.replace(/\D/g, '').slice(0, 6);
      if (code.length < 4 || code.length > 6) {
        setError(t.passcodeError);
        return;
      }
      setPasscode(code);
      await handlePasscodeComplete(code, [
        { role: 'user', content: '\u2022'.repeat(code.length) },
      ]);
      return;
    }
  }, [step, t, addMessages, handlePasscodeComplete]);

  const handleModeSelect = useCallback((mode: 'user' | 'provider' | 'both') => {
    if (!t) return;
    const labels = { user: t.modeLabelUser, provider: t.modeLabelProvider, both: t.modeLabelBoth };
    setSelectedMode(mode);
    addMessages(
      { role: 'user', content: labels[mode] },
      { role: 'assistant', content: t.passcodePromptSetup },
    );
    setStep('passcode');
  }, [t, addMessages]);

  if (!t) return null;

  const modeOptions = [
    { value: 'user' as const, emoji: '\uD83D\uDE4B', label: t.modeUser },
    { value: 'provider' as const, emoji: '\uD83C\uDFEA', label: t.modeProvider },
    { value: 'both' as const, emoji: '\uD83D\uDD04', label: t.modeBoth },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
                <span className="animate-pulse opacity-60">...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <span className="text-xs text-destructive">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mode selection buttons */}
      {step === 'mode' && !loading && (
        <div className="px-4 pb-2">
          <div className="mx-auto max-w-2xl space-y-2">
            {modeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleModeSelect(opt.value)}
                className={cn(
                  'w-full rounded-2xl border px-4 py-3 text-sm text-left',
                  'hover:bg-accent hover:text-accent-foreground transition-colors',
                )}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {step !== 'mode' && step !== 'complete' && (
        <ChatInput
          onSend={handleSend}
          disabled={loading}
          placeholder={
            step === 'name' ? t.namePlaceholder
            : step === 'passcode' ? t.passcodePlaceholder
            : t.messagePlaceholder
          }
        />
      )}
    </div>
  );
}
