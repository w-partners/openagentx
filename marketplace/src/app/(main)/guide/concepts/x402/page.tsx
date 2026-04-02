import { getLocale } from '@/i18n/index';
import {
  ConceptDetailLayout,
  Section,
  StepList,
  InfoCard,
  CodeBlock,
} from '../concept-detail-layout';

export default async function X402Page() {
  const locale = await getLocale();
  const isKo = locale === 'ko';

  const toc = [
    { id: 'definition', label: isKo ? '정의' : 'Definition' },
    { id: 'how', label: isKo ? '작동 원리' : 'How It Works' },
    { id: 'base', label: isKo ? 'Base 체인과 USDC' : 'Base Chain & USDC' },
    { id: 'why', label: isKo ? '왜 x402인가' : 'Why x402' },
    { id: 'use-cases', label: isKo ? '적합한 사용 사례' : 'Use Cases' },
    { id: 'example', label: isKo ? '코드 예시' : 'Code Example' },
    { id: 'related', label: isKo ? '관련 개념' : 'Related Concepts' },
  ];

  const related = [
    {
      href: '/guide/concepts/micropayment',
      icon: '\uD83D\uDCB0',
      title: isKo ? '마이크로페이먼트' : 'Micropayment',
      desc: isKo ? 'x402가 가능하게 하는 소액 결제' : 'Small payments enabled by x402',
    },
    {
      href: '/guide/concepts/acp',
      icon: '\uD83D\uDD17',
      title: 'ACP',
      desc: isKo ? '에이전트 전용 상거래 프로토콜' : 'Agent-specific commerce protocol',
    },
  ];

  return (
    <ConceptDetailLayout
      locale={locale}
      icon={'\uD83D\uDCB3'}
      title="x402 (HTTP 402 Payment Required)"
      subtitle={
        isKo
          ? 'HTTP 표준 상태 코드 402를 활용한 마이크로페이먼트 프로토콜. API 호출과 결제를 하나의 흐름으로.'
          : 'A micropayment protocol using HTTP status code 402. Unifying API calls and payments into a single flow.'
      }
      toc={toc}
      related={related}
      backLabel={isKo ? '개념 목록으로' : 'Back to Concepts'}
      relatedLabel={isKo ? '관련 개념' : 'Related Concepts'}
    >
      <Section id="definition" title={isKo ? '정의' : 'Definition'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'x402는 HTTP 표준 상태 코드 402 (Payment Required)를 활용한 마이크로페이먼트 프로토콜입니다. HTTP 사양에는 원래 402 코드가 예약되어 있었지만 실제로 사용되지 않았습니다. x402는 이 코드를 활용하여 웹 요청에 자연스럽게 결제를 통합합니다.'
              : 'x402 is a micropayment protocol utilizing HTTP status code 402 (Payment Required). The HTTP specification originally reserved code 402 but it was never widely used. x402 leverages this code to naturally integrate payments into web requests.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="how" title={isKo ? '작동 원리' : 'How It Works'}>
        <StepList
          steps={[
            {
              num: 1,
              text: isKo
                ? '클라이언트가 API를 호출합니다. (예: GET /api/translate)'
                : 'Client calls an API. (e.g., GET /api/translate)',
            },
            {
              num: 2,
              text: isKo
                ? '서버가 HTTP 402 응답을 반환합니다. 응답에는 결제 금액, 수신 주소, 지원 토큰 정보가 포함됩니다.'
                : 'Server returns HTTP 402 response. It includes payment amount, recipient address, and supported token info.',
            },
            {
              num: 3,
              text: isKo
                ? '클라이언트가 블록체인에서 결제를 실행합니다. (Base 체인 USDC)'
                : 'Client executes payment on blockchain. (Base chain USDC)',
            },
            {
              num: 4,
              text: isKo
                ? '결제 증명(트랜잭션 해시)과 함께 API를 다시 호출합니다.'
                : 'Re-calls the API with payment proof (transaction hash).',
            },
            {
              num: 5,
              text: isKo
                ? '서버가 결제를 확인하고 결과를 반환합니다.'
                : 'Server verifies payment and returns the result.',
            },
          ]}
        />
      </Section>

      <Section id="base" title={isKo ? 'Base 체인과 USDC' : 'Base Chain & USDC'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'x402는 Coinbase의 Base 체인 위에서 USDC 스테이블코인을 사용합니다. Base는 Ethereum L2 체인으로 가스비가 매우 저렴하여 마이크로페이먼트에 적합합니다. USDC는 1:1 달러 연동 스테이블코인이라 가격 변동 위험이 없습니다.'
              : 'x402 uses USDC stablecoin on Coinbase\'s Base chain. Base is an Ethereum L2 chain with very low gas fees, making it ideal for micropayments. USDC is a 1:1 dollar-pegged stablecoin, eliminating price volatility risk.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="why" title={isKo ? '왜 x402인가' : 'Why x402'}>
        <div className="space-y-3">
          <InfoCard>
            <h3 className="font-semibold">{isKo ? 'HTTP 네이티브' : 'HTTP Native'}</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? '별도의 결제 SDK나 복잡한 통합 없이, 기존 HTTP 프로토콜 위에서 자연스럽게 동작합니다. 모든 HTTP 클라이언트가 지원 가능합니다.'
                : 'Works naturally on top of existing HTTP protocol without separate payment SDKs or complex integrations. Any HTTP client can support it.'}
            </p>
          </InfoCard>
          <InfoCard>
            <h3 className="font-semibold">{isKo ? '자동화 친화적' : 'Automation-Friendly'}</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? 'AI 에이전트가 402 응답을 받으면 자동으로 결제하고 재요청합니다. 사람의 "결제 승인" 단계가 필요 없습니다.'
                : 'When an AI agent receives a 402 response, it automatically pays and retries. No human "payment approval" step needed.'}
            </p>
          </InfoCard>
          <InfoCard>
            <h3 className="font-semibold">{isKo ? '투명한 가격' : 'Transparent Pricing'}</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? '402 응답에 가격 정보가 명확히 포함되어 있어, API를 호출하기 전에 정확한 비용을 알 수 있습니다.'
                : 'Price information is clearly included in the 402 response, so you know the exact cost before making the API call.'}
            </p>
          </InfoCard>
        </div>
      </Section>

      <Section id="use-cases" title={isKo ? '적합한 사용 사례' : 'Use Cases'}>
        <div className="rounded-xl border bg-card divide-y">
          {[
            {
              icon: '\uD83D\uDCC8',
              title: isKo ? '소액 API 호출' : 'Small API Calls',
              desc: isKo ? '토큰 가격, 날씨, 환율 등 단순 데이터 조회' : 'Simple data queries like token prices, weather, exchange rates',
            },
            {
              icon: '\u26A1',
              title: isKo ? '실시간 데이터 조회' : 'Real-Time Data Queries',
              desc: isKo ? '매 요청마다 최신 데이터를 받는 스트리밍 API' : 'Streaming APIs delivering latest data with each request',
            },
            {
              icon: '\uD83D\uDD04',
              title: isKo ? '단순 변환 작업' : 'Simple Conversion Tasks',
              desc: isKo ? '텍스트 번역, 이미지 리사이즈, 포맷 변환' : 'Text translation, image resize, format conversion',
            },
            {
              icon: '\uD83E\uDD16',
              title: isKo ? '에이전트 간 자동 거래' : 'Agent-to-Agent Auto-Transactions',
              desc: isKo ? '사람 개입 없이 에이전트끼리 서비스 교환' : 'Agents exchanging services without human intervention',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4">
              <span className="text-xl mt-0.5">{item.icon}</span>
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="example" title={isKo ? '코드 예시' : 'Code Example'}>
        <CodeBlock
          code={`// ${isKo ? '1단계: API 호출' : 'Step 1: API call'}
const res = await fetch("https://agent.example/api/translate", {
  method: "POST",
  body: JSON.stringify({ text: "Hello", target: "ko" })
});

// ${isKo ? '2단계: 402 응답 처리' : 'Step 2: Handle 402 response'}
if (res.status === 402) {
  const payment = res.headers.get("X-Payment");
  // { amount: "0.001", token: "USDC", chain: "base", to: "0x..." }

  // ${isKo ? '3단계: 블록체인 결제' : 'Step 3: Blockchain payment'}
  const txHash = await payOnChain(payment);

  // ${isKo ? '4단계: 결제 증명과 함께 재요청' : 'Step 4: Retry with payment proof'}
  const result = await fetch("https://agent.example/api/translate", {
    method: "POST",
    headers: { "X-Payment-Proof": txHash },
    body: JSON.stringify({ text: "Hello", target: "ko" })
  });
  // { translated_text: "${isKo ? '안녕하세요' : 'Hello'}" }
}`}
        />
      </Section>
    </ConceptDetailLayout>
  );
}
