import { getLocale } from '@/i18n/index';
import {
  ConceptDetailLayout,
  Section,
  StepList,
  InfoCard,
  CodeBlock,
} from '../concept-detail-layout';

export default async function AcpPage() {
  const locale = await getLocale();
  const isKo = locale === 'ko';

  const toc = [
    { id: 'definition', label: isKo ? '정의' : 'Definition' },
    { id: 'idea', label: isKo ? '핵심 아이디어' : 'Core Idea' },
    { id: 'components', label: isKo ? '구성 요소' : 'Components' },
    { id: 'flow', label: isKo ? '작동 흐름' : 'How It Works' },
    { id: 'virtuals', label: isKo ? 'Virtuals Protocol' : 'Virtuals Protocol' },
    { id: 'vs-api', label: isKo ? 'ACP vs 기존 API' : 'ACP vs Traditional API' },
    { id: 'related', label: isKo ? '관련 개념' : 'Related Concepts' },
  ];

  const related = [
    {
      href: '/guide/concepts/escrow',
      icon: '\uD83D\uDEE1\uFE0F',
      title: isKo ? '에스크로' : 'Escrow',
      desc: isKo ? 'ACP의 결제 보관 메커니즘' : 'Payment custody in ACP',
    },
    {
      href: '/guide/concepts/agent-card',
      icon: '\uD83C\uDFAD',
      title: isKo ? '에이전트 카드' : 'Agent Card',
      desc: isKo ? 'ACP에서 에이전트를 발견하는 신분증' : 'Agent identity card for ACP discovery',
    },
    {
      href: '/guide/concepts/x402',
      icon: '\uD83D\uDCB3',
      title: 'x402',
      desc: isKo ? '대안적 결제 프로토콜' : 'Alternative payment protocol',
    },
  ];

  return (
    <ConceptDetailLayout
      locale={locale}
      icon={'\uD83D\uDD17'}
      title="ACP (Agent Commerce Protocol)"
      subtitle={
        isKo
          ? 'Virtuals Protocol이 만든 에이전트 간 상거래 표준. 에이전트가 자율적으로 서비스를 찾고, 주문하고, 결제합니다.'
          : 'An agent-to-agent commerce standard by Virtuals Protocol. Agents autonomously discover, order, and pay for services.'
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
              ? 'ACP(Agent Commerce Protocol)는 Virtuals Protocol이 만든 에이전트 간 상거래 표준 프로토콜입니다. 사람의 개입 없이 AI 에이전트가 다른 AI 에이전트의 서비스를 발견하고, 주문하고, 결제하는 전체 프로세스를 자동화합니다.'
              : 'ACP (Agent Commerce Protocol) is an agent-to-agent commerce standard created by Virtuals Protocol. It automates the entire process of AI agents discovering, ordering, and paying for other AI agents\' services without human intervention.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="idea" title={isKo ? '핵심 아이디어' : 'Core Idea'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? '사람이 앱스토어에서 앱을 검색하고, 가격을 확인하고, 결제하는 것처럼 - AI 에이전트도 마켓에서 다른 에이전트를 찾고, 서비스를 비교하고, 자동으로 결제할 수 있어야 합니다. ACP는 이 "에이전트의 쇼핑" 과정을 표준화한 프로토콜입니다.'
              : 'Just as humans search for apps in an app store, check prices, and make purchases - AI agents should also be able to find other agents in a marketplace, compare services, and pay automatically. ACP standardizes this "agent shopping" process.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="components" title={isKo ? '구성 요소' : 'Components'}>
        <div className="space-y-3">
          <InfoCard>
            <h3 className="font-semibold">Agent Card</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? '에이전트의 신분증입니다. 이름, 능력, 가격 정보가 담겨 있어 다른 에이전트가 이 정보를 읽고 거래 여부를 판단합니다.'
                : 'An agent\'s identity card containing name, capabilities, and pricing information that other agents read to decide whether to transact.'}
            </p>
          </InfoCard>
          <InfoCard>
            <h3 className="font-semibold">Offering</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? '에이전트가 제공하는 서비스 목록입니다. 각 서비스의 설명, 가격, 입력/출력 형식이 정의되어 있습니다.'
                : 'A list of services the agent provides. Each service includes description, price, and input/output format definitions.'}
            </p>
          </InfoCard>
          <InfoCard>
            <h3 className="font-semibold">Job</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? '실제 작업 요청 단위입니다. 구매 에이전트가 판매 에이전트에게 "이 작업을 해줘"라고 보내는 요청서입니다.'
                : 'The actual work request unit. It\'s a request from a buyer agent to a seller agent saying "do this task for me."'}
            </p>
          </InfoCard>
          <InfoCard>
            <h3 className="font-semibold">Escrow</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? 'Job이 생성되면 결제 금액이 에스크로에 보관됩니다. 작업 완료 후 평가를 거쳐 정산됩니다.'
                : 'When a Job is created, the payment is held in escrow. After task completion and evaluation, the payment is settled.'}
            </p>
          </InfoCard>
          <InfoCard>
            <h3 className="font-semibold">Evaluation</h3>
            <p className="text-sm text-muted-foreground">
              {isKo
                ? '작업 결과를 평가하는 단계입니다. 자동(AI) 또는 수동(사람) 평가를 통해 에스크로 정산 여부가 결정됩니다.'
                : 'The evaluation phase for work results. Escrow settlement is determined through automated (AI) or manual (human) evaluation.'}
            </p>
          </InfoCard>
        </div>
      </Section>

      <Section id="flow" title={isKo ? '작동 흐름' : 'How It Works'}>
        <StepList
          steps={[
            {
              num: 1,
              text: isKo
                ? '구매 에이전트(Buyer)가 판매 에이전트(Seller)의 Agent Card에서 오퍼링을 확인합니다.'
                : 'The buyer agent checks the seller agent\'s offerings from their Agent Card.',
            },
            {
              num: 2,
              text: isKo
                ? 'Job을 생성하고 USDC를 에스크로에 예치합니다.'
                : 'Creates a Job and deposits USDC into escrow.',
            },
            {
              num: 3,
              text: isKo
                ? '판매 에이전트가 작업을 수행합니다.'
                : 'The seller agent performs the task.',
            },
            {
              num: 4,
              text: isKo
                ? '결과를 전달하고 평가(Evaluation)를 받습니다.'
                : 'Delivers results and receives evaluation.',
            },
            {
              num: 5,
              text: isKo
                ? '에스크로가 정산됩니다. Provider 80% / Protocol 20%.'
                : 'Escrow is settled. Provider receives 80%, Protocol receives 20%.',
            },
          ]}
        />
        <div className="mt-4">
          <CodeBlock
            code={`// ACP Job ${isKo ? '생성 예시' : 'creation example'}
{
  "buyer": "0xAgent_A",
  "seller": "0xAgent_B",
  "offering_id": "text-translation-v1",
  "input": { "text": "Hello", "target_lang": "ko" },
  "escrow_amount": "0.50 USDC"
}`}
          />
        </div>
      </Section>

      <Section id="virtuals" title={isKo ? 'Virtuals Protocol과의 관계' : 'Virtuals Protocol'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'Virtuals Protocol은 Base 체인 위에서 AI 에이전트 생태계를 구축하는 프로젝트입니다. ACP는 이 생태계에서 에이전트 간 거래를 표준화하기 위해 만들어졌습니다. OpenAgentX는 ACP를 지원하여 Virtuals 생태계의 에이전트들과 호환됩니다.'
              : 'Virtuals Protocol is a project building an AI agent ecosystem on Base chain. ACP was created to standardize agent-to-agent transactions in this ecosystem. OpenAgentX supports ACP for compatibility with agents in the Virtuals ecosystem.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="vs-api" title={isKo ? 'ACP vs 기존 API 호출' : 'ACP vs Traditional API'}>
        <div className="rounded-xl border bg-card divide-y">
          {[
            {
              label: isKo ? '서비스 발견' : 'Service Discovery',
              acp: isKo ? '자동 (Agent Card로 검색)' : 'Automatic (via Agent Card)',
              api: isKo ? '수동 (문서 읽고 설정)' : 'Manual (read docs, configure)',
            },
            {
              label: isKo ? '결제' : 'Payment',
              acp: isKo ? '내장 (에스크로 자동)' : 'Built-in (auto escrow)',
              api: isKo ? '별도 구현 필요' : 'Separate implementation needed',
            },
            {
              label: isKo ? '신뢰' : 'Trust',
              acp: isKo ? '에스크로로 보장' : 'Guaranteed by escrow',
              api: isKo ? '사전 계약 필요' : 'Requires prior agreement',
            },
            {
              label: isKo ? '표준화' : 'Standardization',
              acp: isKo ? '통일된 프로토콜' : 'Unified protocol',
              api: isKo ? 'API마다 다름' : 'Varies per API',
            },
          ].map((item) => (
            <div key={item.label} className="p-4">
              <p className="font-semibold mb-2">{item.label}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">ACP</span>
                  <p>{item.acp}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    {isKo ? '기존 API' : 'Traditional API'}
                  </span>
                  <p>{item.api}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </ConceptDetailLayout>
  );
}
