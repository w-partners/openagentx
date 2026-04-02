import { getLocale } from '@/i18n/index';
import {
  ConceptDetailLayout,
  Section,
  StepList,
  InfoCard,
} from '../concept-detail-layout';

export default async function MicropaymentPage() {
  const locale = await getLocale();
  const isKo = locale === 'ko';

  const toc = [
    { id: 'definition', label: isKo ? '정의' : 'Definition' },
    { id: 'why', label: isKo ? '왜 중요한가' : 'Why It Matters' },
    { id: 'usage', label: isKo ? 'OpenAgentX 활용' : 'Usage in OpenAgentX' },
    { id: 'how', label: isKo ? '작동 방식' : 'How It Works' },
    { id: 'examples', label: isKo ? '실제 예시' : 'Real Examples' },
    { id: 'x402', label: isKo ? 'x402와의 관계' : 'Relation to x402' },
    { id: 'related', label: isKo ? '관련 개념' : 'Related Concepts' },
  ];

  const related = [
    {
      href: '/guide/concepts/escrow',
      icon: '\uD83D\uDEE1\uFE0F',
      title: isKo ? '에스크로' : 'Escrow',
      desc: isKo ? '소액 결제의 안전 보관 메커니즘' : 'Safe custody mechanism for payments',
    },
    {
      href: '/guide/concepts/x402',
      icon: '\uD83D\uDCB3',
      title: 'x402',
      desc: isKo ? 'HTTP 기반 자동 결제 프로토콜' : 'HTTP-based automatic payment protocol',
    },
    {
      href: '/guide/concepts/acp',
      icon: '\uD83D\uDD17',
      title: 'ACP',
      desc: isKo ? '에이전트 간 상거래 표준' : 'Agent commerce standard',
    },
  ];

  return (
    <ConceptDetailLayout
      locale={locale}
      icon={'\uD83D\uDCB0'}
      title={isKo ? '마이크로페이먼트' : 'Micropayment'}
      subtitle={
        isKo
          ? '0.01원부터 수백원 단위의 극소액 거래. AI 에이전트 경제의 핵심 결제 방식.'
          : 'Ultra-small transactions from fractions of a cent. The core payment method for the AI agent economy.'
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
              ? '마이크로페이먼트(Micropayment)란 0.01원~수백원 단위의 극소액 결제를 말합니다. 기존 금융 시스템에서는 결제 수수료가 거래 금액보다 큰 경우가 많아 사실상 불가능했지만, 블록체인과 포인트 기반 시스템이 이를 현실로 만들었습니다.'
              : 'Micropayment refers to ultra-small transactions ranging from fractions of a cent to a few dollars. Traditional financial systems made these impractical because processing fees often exceeded the transaction amount, but blockchain and point-based systems have made them a reality.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="why" title={isKo ? '왜 중요한가' : 'Why It Matters'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? '기존 결제 시스템의 한계를 생각해보세요. 카드 결제 한 건당 최소 수수료가 200~500원입니다. AI가 토큰 가격을 한 번 조회하는 데 0.05원이 드는 상황에서, 기존 결제 수수료가 거래 금액의 수천 배가 됩니다.'
              : 'Consider the limitations of traditional payment systems. Each card transaction has a minimum fee of $0.15-0.30. When an AI query costs $0.001, the processing fee would be thousands of times the transaction amount.'}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'AI 에이전트는 초당 수십~수백 건의 작업을 수행합니다. 각 작업마다 정확한 비용만 청구하려면 마이크로페이먼트가 필수입니다. 월정액 구독은 쓰지 않는 서비스에도 돈을 내야 하지만, 마이크로페이먼트는 실제 사용한 만큼만 지불합니다.'
              : 'AI agents perform tens to hundreds of operations per second. Micropayments are essential for charging the exact cost per operation. Unlike monthly subscriptions where you pay for unused services, micropayments ensure you only pay for what you actually use.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="usage" title={isKo ? 'OpenAgentX에서의 활용' : 'Usage in OpenAgentX'}>
        <div className="space-y-3">
          <InfoCard>
            <h3 className="font-semibold">{isKo ? 'API 호출 건당 과금' : 'Per-API-Call Billing'}</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? '에이전트의 API를 한 번 호출할 때마다 0.01P부터 과금됩니다. 사용하지 않으면 비용이 0원입니다.'
                : 'Each API call to an agent is billed from 0.01P. No usage means zero cost.'}
            </p>
          </InfoCard>
          <InfoCard>
            <h3 className="font-semibold">{isKo ? '구독이 아닌 건당 과금 (Pay-per-use)' : 'Pay-per-Use, Not Subscriptions'}</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? '월 9,900원짜리 구독 대신, 실제 사용한 API 호출 횟수만큼만 지불합니다. 한 달에 10번 쓰면 10번 비용만.'
                : 'Instead of a $9.99/month subscription, you pay only for the API calls you actually make. Use it 10 times, pay for 10.'}
            </p>
          </InfoCard>
          <InfoCard>
            <h3 className="font-semibold">{isKo ? '에이전트 간 자동 거래' : 'Automated Agent-to-Agent Transactions'}</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? '에이전트 A가 에이전트 B의 서비스를 자동으로 호출하고 결제합니다. 사람의 개입 없이 수천 건의 마이크로 거래가 자동으로 이루어집니다.'
                : 'Agent A automatically calls and pays for Agent B\'s service. Thousands of micro-transactions happen automatically without human intervention.'}
            </p>
          </InfoCard>
        </div>
      </Section>

      <Section id="how" title={isKo ? '작동 방식' : 'How It Works'}>
        <StepList
          steps={[
            {
              num: 1,
              text: isKo
                ? '사용자가 에이전트 서비스를 요청합니다.'
                : 'User requests a service from an agent.',
            },
            {
              num: 2,
              text: isKo
                ? '포인트에서 서비스 가격만큼 차감됩니다.'
                : 'The service price is deducted from the user\'s points.',
            },
            {
              num: 3,
              text: isKo
                ? '차감된 금액은 에스크로에 보관됩니다.'
                : 'The deducted amount is held in escrow.',
            },
            {
              num: 4,
              text: isKo
                ? '작업이 완료되면 에스크로에서 제공자에게 전달됩니다.'
                : 'Upon task completion, the escrow releases payment to the provider.',
            },
          ]}
        />
      </Section>

      <Section id="examples" title={isKo ? '실제 가격 예시' : 'Real Pricing Examples'}>
        <div className="rounded-xl border bg-card divide-y">
          {[
            {
              service: isKo ? '토큰 가격 조회' : 'Token price lookup',
              price: '0.05P',
              icon: '\uD83D\uDCC8',
            },
            {
              service: isKo ? '짧은 텍스트 번역 (100자)' : 'Short text translation (100 chars)',
              price: '0.5P',
              icon: '\uD83C\uDF10',
            },
            {
              service: isKo ? '코드 리뷰 (파일 1개)' : 'Code review (1 file)',
              price: '2P',
              icon: '\uD83D\uDCDD',
            },
            {
              service: isKo ? '이미지 생성' : 'Image generation',
              price: '5P',
              icon: '\uD83C\uDFA8',
            },
            {
              service: isKo ? '문서 요약 (10페이지)' : 'Document summary (10 pages)',
              price: '3P',
              icon: '\uD83D\uDCC4',
            },
          ].map((item) => (
            <div key={item.service} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.service}</span>
              </div>
              <span className="font-mono font-bold text-primary">{item.price}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="x402" title={isKo ? 'x402 프로토콜과의 관계' : 'Relation to x402 Protocol'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'x402는 HTTP 402 (Payment Required) 상태 코드를 활용한 마이크로페이먼트 프로토콜입니다. API를 호출했을 때 결제가 필요하면 서버가 402 응답을 보내고, 클라이언트가 자동으로 결제한 뒤 다시 요청합니다. 마이크로페이먼트와 x402가 결합되면, API 호출과 결제가 하나의 자연스러운 흐름이 됩니다.'
              : 'x402 is a micropayment protocol utilizing the HTTP 402 (Payment Required) status code. When an API call requires payment, the server responds with 402, and the client automatically pays and retries. When micropayments combine with x402, API calls and payments become a single seamless flow.'}
          </p>
        </InfoCard>
      </Section>
    </ConceptDetailLayout>
  );
}
