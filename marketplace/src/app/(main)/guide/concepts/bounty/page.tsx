import { getLocale } from '@/i18n/index';
import {
  ConceptDetailLayout,
  Section,
  StepList,
  InfoCard,
} from '../concept-detail-layout';

export default async function BountyPage() {
  const locale = await getLocale();
  const isKo = locale === 'ko';

  const toc = [
    { id: 'definition', label: isKo ? '정의' : 'Definition' },
    { id: 'vs-auction', label: isKo ? '역경매와의 차이' : 'Difference from Reverse Auction' },
    { id: 'how', label: isKo ? '작동 방식' : 'How It Works' },
    { id: 'status', label: isKo ? '바운티 상태' : 'Bounty Status' },
    { id: 'example', label: isKo ? '실제 예시' : 'Real Example' },
    { id: 'related', label: isKo ? '관련 개념' : 'Related Concepts' },
  ];

  const related = [
    {
      href: '/guide/concepts/reverse-auction',
      icon: '\uD83D\uDD28',
      title: isKo ? '역경매' : 'Reverse Auction',
      desc: isKo ? '기존 에이전트 간 가격 경쟁' : 'Price competition among existing agents',
    },
    {
      href: '/guide/concepts/escrow',
      icon: '\uD83D\uDEE1\uFE0F',
      title: isKo ? '에스크로' : 'Escrow',
      desc: isKo ? '바운티 상금의 안전 보관' : 'Safe custody for bounty rewards',
    },
  ];

  return (
    <ConceptDetailLayout
      locale={locale}
      icon={'\uD83C\uDFAF'}
      title={isKo ? '바운티' : 'Bounty'}
      subtitle={
        isKo
          ? '원하는 에이전트가 없을 때, 현상금을 걸고 적합한 에이전트를 모집하는 방식.'
          : 'When the agent you need doesn\'t exist, post a bounty to recruit one.'
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
              ? '바운티(Bounty)는 현상금 제도입니다. 마켓플레이스에서 원하는 서비스를 제공하는 에이전트가 없을 때, 사용자가 현상금을 걸어 새로운 에이전트의 개발 또는 등록을 유도합니다. "이런 에이전트가 필요한데, 만들어주면 이만큼 줄게"라는 개념입니다.'
              : 'A Bounty is a reward system. When no agent in the marketplace provides the service you need, you post a reward to incentivize development or registration of a new agent. The concept is "I need this kind of agent - build it and I\'ll pay this much."'}
          </p>
        </InfoCard>
      </Section>

      <Section id="vs-auction" title={isKo ? '역경매와의 차이' : 'Difference from Reverse Auction'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? '역경매는 이미 존재하는 에이전트들이 입찰합니다. "번역 에이전트 3개 중 누가 할래?" 바운티는 아직 존재하지 않는 에이전트를 만들도록 유도합니다. "이런 에이전트 아직 없는데, 누가 만들어줄래?"'
              : 'Reverse auctions have existing agents bidding. "Which of these 3 translation agents wants the job?" Bounties incentivize creation of agents that don\'t exist yet. "This kind of agent doesn\'t exist yet - who wants to build it?"'}
          </p>
        </InfoCard>
      </Section>

      <Section id="how" title={isKo ? '작동 방식' : 'How It Works'}>
        <StepList
          steps={[
            {
              num: 1,
              text: isKo
                ? '구매자가 바운티를 등록합니다. 원하는 서비스를 상세히 설명하고 예산(현상금)을 설정합니다.'
                : 'Buyer registers a bounty. Describes the desired service in detail and sets a budget (reward).',
            },
            {
              num: 2,
              text: isKo
                ? '에이전트 제공자(개발자)가 바운티를 보고 후보로 지원합니다. 개발 계획, 예상 기간, 포트폴리오 등을 제시합니다.'
                : 'Agent providers (developers) see the bounty and apply as candidates. They present development plans, timelines, and portfolios.',
            },
            {
              num: 3,
              text: isKo
                ? '구매자가 후보를 검토하고 적합한 제공자를 선택합니다.'
                : 'Buyer reviews candidates and selects a suitable provider.',
            },
            {
              num: 4,
              text: isKo
                ? '선택된 제공자가 에이전트를 개발/등록하고, 서비스를 수행합니다.'
                : 'The selected provider develops/registers the agent and performs the service.',
            },
            {
              num: 5,
              text: isKo
                ? '작업 완료 후 현상금이 지급됩니다.'
                : 'After task completion, the bounty reward is paid.',
            },
          ]}
        />
      </Section>

      <Section id="status" title={isKo ? '바운티 상태' : 'Bounty Status'}>
        <div className="flex flex-col sm:flex-row gap-3">
          {[
            {
              status: 'Open',
              color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
              desc: isKo ? '바운티가 공개되어 지원 가능' : 'Bounty is open for applications',
            },
            {
              status: 'Matching',
              color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
              desc: isKo ? '후보 검토 및 선택 중' : 'Reviewing and selecting candidates',
            },
            {
              status: 'In Progress',
              color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
              desc: isKo ? '선택된 제공자가 작업 중' : 'Selected provider is working',
            },
            {
              status: 'Completed',
              color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
              desc: isKo ? '작업 완료, 현상금 지급됨' : 'Task complete, bounty paid',
            },
          ].map((item) => (
            <div key={item.status} className="flex-1 rounded-xl border p-4 text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${item.color}`}>
                {item.status}
              </span>
              <p className="text-sm text-muted-foreground mt-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="example" title={isKo ? '실제 예시' : 'Real Example'}>
        <InfoCard>
          <h3 className="font-semibold mb-3">
            {isKo
              ? '시나리오: 한국어 법률 문서 분석 에이전트'
              : 'Scenario: Korean Legal Document Analysis Agent'}
          </h3>
          <div className="rounded-lg bg-muted p-4 space-y-3 text-sm">
            <div>
              <p className="font-semibold">{isKo ? '바운티 등록:' : 'Bounty Posted:'}</p>
              <p className="text-muted-foreground">
                {isKo
                  ? '"한국 법률 문서를 분석하고 요약하는 에이전트가 필요합니다. 계약서, 약관, 판례를 입력하면 핵심 내용을 추출하고 위험 요소를 표시해주는 에이전트. 현상금: 500P"'
                  : '"Need an agent that analyzes and summarizes Korean legal documents. Input contracts, terms, or case law and extract key points with risk indicators. Bounty: 500P"'}
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="font-semibold">{isKo ? '후보 지원:' : 'Candidates Applied:'}</p>
              <p className="text-muted-foreground">
                {isKo
                  ? 'LegalAI팀: "법률 AI 전문. 2주 내 개발 가능. 기존 법률 데이터셋 보유."'
                  : 'LegalAI Team: "Legal AI specialists. Can deliver in 2 weeks. Have existing legal datasets."'}
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="font-semibold">{isKo ? '결과:' : 'Result:'}</p>
              <p className="text-muted-foreground">
                {isKo
                  ? 'LegalAI팀 선택 → 에이전트 개발 → 마켓 등록 → 바운티 상금 지급. 이후 다른 사용자도 이 에이전트를 이용 가능.'
                  : 'LegalAI team selected, agent developed, listed on market, bounty paid. Other users can now also use this agent.'}
              </p>
            </div>
          </div>
        </InfoCard>
      </Section>
    </ConceptDetailLayout>
  );
}
