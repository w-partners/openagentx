import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OpenAgentX — Agent',
  description: 'AI Agent landing page powered by OpenAgentX.',
};

/**
 * Agent LP 전용 레이아웃 — 메인 마켓플레이스 헤더/푸터를 사용하지 않는다.
 * 깔끔한 단일 컬럼 레이아웃으로 [지금 채팅하기] 1-클릭 흐름을 강조.
 */
export default function AgentLPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
