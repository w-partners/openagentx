'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatBubble } from './chat-bubble';
import { ChatInput } from './chat-input';
import { BootstrapFlow } from './bootstrap-flow';
import { PasscodeScreen } from './passcode-screen';
import { getChatLocale, getChatMessages, type ChatMessages } from './chat-i18n';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentInfo {
  slug: string;
  name: string;
  description?: string;
  logo_url?: string | null;
}

type Screen = 'loading' | 'bootstrap' | 'passcode' | 'chat';

interface ChatWindowProps {
  agentSlug?: string | null;
  promptSlug?: string | null;
}

export function ChatWindow({ agentSlug = null, promptSlug = null }: ChatWindowProps = {}) {
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [t, setT] = useState<ChatMessages | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [profileId, setProfileId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Initialize locale + check session
  useEffect(() => {
    const locale = getChatLocale();
    setT(getChatMessages(locale));

    const savedId = localStorage.getItem('chat_profileId');
    const savedName = localStorage.getItem('chat_displayName');

    if (savedId && savedName) {
      setProfileId(savedId);
      setDisplayName(savedName);
      setScreen('passcode');
    } else {
      setScreen('bootstrap');
    }
  }, []);

  // Fetch agent or prompt info if slug provided
  useEffect(() => {
    const slug = agentSlug ?? promptSlug;
    const lookupUrl = promptSlug
      ? `/api/prompts/lookup?slug=${encodeURIComponent(promptSlug)}`
      : agentSlug
        ? `/api/agents/lookup?slug=${encodeURIComponent(agentSlug)}`
        : null;

    if (!slug || !lookupUrl) {
      setAgent(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(lookupUrl);
        if (!res.ok) {
          if (!cancelled) {
            setAgent({ slug, name: slug });
          }
          return;
        }
        const data = await res.json();
        const a = data?.data;
        if (a && !cancelled) {
          setAgent({
            slug: a.slug ?? slug,
            name: a.name ?? slug,
            description: a.description ?? undefined,
            logo_url: a.logo_url ?? null,
          });
        } else if (!cancelled) {
          setAgent({ slug, name: slug });
        }
      } catch {
        if (!cancelled) setAgent({ slug, name: slug });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentSlug, promptSlug]);

  const handleBootstrapComplete = useCallback((data: { profileId: string; displayName: string; mode: string }) => {
    setProfileId(data.profileId);
    setDisplayName(data.displayName);
    setMessages([]);
    setScreen('chat');
  }, []);

  const handlePasscodeSuccess = useCallback((data: { profileId: string; displayName: string; mode: string; history: Array<{ role: string; content: string }> }) => {
    setProfileId(data.profileId);
    setDisplayName(data.displayName);
    setMessages(
      (data.history || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    );
    setScreen('chat');
  }, []);

  const handleReset = useCallback(() => {
    localStorage.removeItem('chat_profileId');
    localStorage.removeItem('chat_displayName');
    setProfileId('');
    setDisplayName('');
    setMessages([]);
    setScreen('bootstrap');
  }, []);

  const handleSend = useCallback(async (message: string) => {
    if (!profileId || !t) return;

    const userMsg: Message = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          profileId,
          message,
          ...(agentSlug ? { agentSlug } : {}),
          ...(promptSlug ? { promptSlug } : {}),
        }),
      });
      const data = await res.json();

      if (data.success && data.data?.response) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.data.response }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error || t.noResponse },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t?.networkError ?? 'Network error.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [profileId, t, agentSlug, promptSlug]);

  // Loading screen
  if (screen === 'loading' || !t) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">{t?.loading ?? '...'}</div>
      </div>
    );
  }

  // Bootstrap (onboarding)
  if (screen === 'bootstrap') {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="absolute top-4 right-4 z-10">
          <span className="text-xs font-medium text-muted-foreground/60">OpenAgentX</span>
        </div>
        <BootstrapFlow onComplete={handleBootstrapComplete} />
      </div>
    );
  }

  // Passcode login
  if (screen === 'passcode') {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="absolute top-4 right-4 z-10">
          <span className="text-xs font-medium text-muted-foreground/60">OpenAgentX</span>
        </div>
        <PasscodeScreen
          profileId={profileId}
          displayName={displayName}
          onSuccess={handlePasscodeSuccess}
          onReset={handleReset}
        />
      </div>
    );
  }

  // Main chat
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground/60">OpenAgentX</span>
          {agent && (
            <>
              <span className="text-xs text-muted-foreground/40">/</span>
              <span className="text-xs font-semibold text-foreground">
                {agent.name} 에이전트와 채팅
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{displayName}</span>
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            {t.logout}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
        <div className="mx-auto max-w-2xl space-y-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
              <p className="text-muted-foreground/50 text-sm">{t.emptyChat(displayName)}</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
                <span className="animate-pulse opacity-60">{t.thinking}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={loading} placeholder={t.messagePlaceholder} />
    </div>
  );
}
