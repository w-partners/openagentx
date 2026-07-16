'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/chat/chat-window';

function ChatPageInner() {
  const searchParams = useSearchParams();
  const agentSlug = searchParams.get('agent') ?? null;
  const promptSlug = searchParams.get('prompt') ?? null;
  return <ChatWindow agentSlug={agentSlug} promptSlug={promptSlug} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}
