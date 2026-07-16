import Link from 'next/link';

export default function AgentLPNotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center space-y-6">
      <div className="text-6xl">🤔</div>
      <h1 className="text-3xl font-bold">이 에이전트를 찾을 수 없습니다</h1>
      <p className="text-muted-foreground">
        요청하신 에이전트가 존재하지 않거나 비활성화되었을 수 있습니다.
      </p>
      <div>
        <Link
          href="https://openagentx.org/ko/agents"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          에이전트 마켓 둘러보기
        </Link>
      </div>
    </main>
  );
}
