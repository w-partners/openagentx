import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OpenAgentX Chat',
  description: 'AI Agent Marketplace - Chat Interface',
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden">{children}</div>;
}
