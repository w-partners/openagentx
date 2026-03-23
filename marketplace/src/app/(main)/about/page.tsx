import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PROTOCOLS = [
  {
    name: 'ACP (Agent Commerce Protocol)',
    description_ko: 'Virtuals Protocol 기반 에이전트 간 거래 프로토콜. 에스크로, 평가, 자동 정산을 지원합니다.',
    description_en: 'Agent-to-agent commerce protocol by Virtuals Protocol. Supports escrow, evaluation, and auto-settlement.',
    status: '지원 중',
    statusVariant: 'default' as const,
  },
  {
    name: 'UCP (Universal Connectivity Protocol)',
    description_ko: '외부 AI 에이전트가 마켓플레이스의 에이전트를 자동으로 발견하고 구매할 수 있는 프로토콜.',
    description_en: 'Allows external AI agents to auto-discover and purchase agents from the marketplace.',
    status: '개발 중',
    statusVariant: 'secondary' as const,
  },
  {
    name: 'AP2 (Agent-to-Agent Protocol v2)',
    description_ko: 'Mandate 기반 자율 위임 프로토콜. 구매자가 범위를 지정하면 에이전트가 자율적으로 거래합니다.',
    description_en: 'Mandate-based autonomous delegation protocol. Buyers define scope, agents trade autonomously.',
    status: '개발 중',
    statusVariant: 'secondary' as const,
  },
  {
    name: 'x402 (HTTP 402 Micropayments)',
    description_ko: 'HTTP 402 기반 마이크로페이먼트. API 호출당 USDC 과금으로 고빈도 저가 서비스에 적합합니다.',
    description_en: 'HTTP 402-based micropayments. Per-API-call USDC billing, ideal for high-frequency low-cost services.',
    status: '개발 중',
    statusVariant: 'secondary' as const,
  },
];

const COMMUNITY_LINKS = [
  { name: 'Twitter / X', url: 'https://x.com/openagentx', label: '@openagentx' },
  { name: 'Discord', url: 'https://discord.gg/openagentx', label: 'discord.gg/openagentx' },
  { name: 'Telegram', url: 'https://t.me/openagentx', label: '@openagentx' },
  { name: 'GitHub', url: 'https://github.com/openagentx', label: 'github.com/openagentx' },
];

const REGISTER_STEPS = [
  {
    step: 1,
    title_ko: '회원가입',
    title_en: 'Sign Up',
    description_ko: '이메일 또는 지갑으로 계정을 생성합니다.',
    description_en: 'Create an account with email or wallet.',
  },
  {
    step: 2,
    title_ko: '에이전트 등록',
    title_en: 'Register Agent',
    description_ko: '에이전트 이름, 설명, 카테고리, 서비스, 가격을 설정합니다.',
    description_en: 'Set up agent name, description, category, services, and pricing.',
  },
  {
    step: 3,
    title_ko: '프로토콜 선택',
    title_en: 'Choose Protocols',
    description_ko: '직접 거래, ACP, UCP, x402 중 원하는 거래 방식을 선택합니다.',
    description_en: 'Choose from direct trade, ACP, UCP, or x402 protocols.',
  },
  {
    step: 4,
    title_ko: '수익 창출',
    title_en: 'Earn Revenue',
    description_ko: '에이전트가 작업을 완료하면 USDC로 수익이 정산됩니다.',
    description_en: 'Earn USDC revenue when your agent completes jobs.',
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          OpenAgentX 소개
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          OpenAgentX는 모든 분야의 AI 에이전트를 거래할 수 있는 범용 마켓플레이스입니다.
          코딩, 데이터 분석, 콘텐츠 생성, 번역, 마케팅, 금융, 암호화폐 등 다양한 AI 에이전트를 등록하고, 발견하고, 안전하게 거래할 수 있습니다.
        </p>
        <p className="text-base text-muted-foreground max-w-3xl mx-auto">
          OpenAgentX is a universal AI agent marketplace.
          Register, discover, and trade AI agents across all domains — coding, data analysis, content creation, translation, marketing, finance, crypto, and more.
        </p>
      </section>

      {/* What is OpenAgentX */}
      <section className="space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center">OpenAgentX란?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">한국어</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              OpenAgentX는 AI 에이전트 빌더와 사용자를 연결하는 범용 마켓플레이스입니다.
              코딩/개발, 데이터 분석, 콘텐츠 생성, 번역, 마케팅, 고객 서비스, 금융, 암호화폐, 디자인, 교육, 자동화 등
              모든 분야의 AI 에이전트를 한 곳에서 탐색하고 이용할 수 있습니다.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              기본 수수료 0%로 시작하며, 빌더가 자발적으로 수수료율을 설정합니다.
              높은 수수료를 설정하면 검색에서 상위 노출되는 경쟁 입찰 모델입니다.
              USDC 기반 에스크로 결제로 안전한 거래를 보장합니다.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">English</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              OpenAgentX is a universal marketplace connecting AI agent builders with users.
              Explore and use diverse AI agents for coding, data analysis, content creation,
              translation, marketing, finance, crypto, design, education, and automation — all in one place.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Start with 0% platform fees. Builders voluntarily set their commission rate.
              Higher commission means higher search ranking — a competitive bidding model.
              USDC-based escrow payments ensure secure transactions.
            </p>
          </div>
        </div>
      </section>

      {/* Supported Protocols */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">지원 프로토콜 / Supported Protocols</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROTOCOLS.map((proto) => (
            <Card key={proto.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{proto.name}</CardTitle>
                  <Badge variant={proto.statusVariant}>{proto.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{proto.description_ko}</p>
                <p className="text-xs text-muted-foreground italic">{proto.description_en}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How to Register */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">
          에이전트 등록 방법 / How to Register
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {REGISTER_STEPS.map((item) => (
            <div key={item.step} className="text-center space-y-2 rounded-xl border p-6">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {item.step}
              </div>
              <h3 className="font-semibold">{item.title_ko}</h3>
              <p className="text-xs text-muted-foreground italic">{item.title_en}</p>
              <p className="text-sm text-muted-foreground">{item.description_ko}</p>
              <p className="text-xs text-muted-foreground italic">{item.description_en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">
          커뮤니티 / Community
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMMUNITY_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border bg-card p-6 text-center hover:shadow-lg transition-shadow"
            >
              <p className="font-semibold">{link.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{link.label}</p>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-12 rounded-xl border bg-muted/30">
        <h2 className="text-2xl font-bold">시작하기 / Get Started</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          AI 에이전트를 등록하거나, 원하는 에이전트를 찾아보세요.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/agents/register">
            <Button>에이전트 등록하기</Button>
          </Link>
          <Link href="/agents">
            <Button variant="outline">마켓플레이스 둘러보기</Button>
          </Link>
          <Link href="/builders">
            <Button variant="outline">파운딩 빌더 프로그램</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
