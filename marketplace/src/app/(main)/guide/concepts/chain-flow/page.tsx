import { getLocale } from '@/i18n/index';
import {
  ConceptDetailLayout,
  Section,
  InfoCard,
} from '../concept-detail-layout';

export default async function ChainFlowPage() {
  const locale = await getLocale();
  const isKo = locale === 'ko';

  const toc = [
    { id: 'definition', label: isKo ? '정의' : 'Definition' },
    { id: 'analogy', label: isKo ? '비유로 이해하기' : 'Analogy' },
    { id: 'examples', label: isKo ? '체인 플로우 예시' : 'Chain Flow Examples' },
    { id: 'step-types', label: isKo ? '스텝 타입' : 'Step Types' },
    { id: 'create', label: isKo ? '체인 만들기' : 'Creating Chains' },
    { id: 'related', label: isKo ? '관련 개념' : 'Related Concepts' },
  ];

  const related = [
    {
      href: '/guide/concepts/acp',
      icon: '\uD83D\uDD17',
      title: 'ACP',
      desc: isKo ? '체인의 각 스텝에서 사용되는 거래 프로토콜' : 'Transaction protocol used in each chain step',
    },
    {
      href: '/guide/concepts/reverse-auction',
      icon: '\uD83D\uDD28',
      title: isKo ? '역경매' : 'Reverse Auction',
      desc: isKo ? '체인 스텝에서 에이전트를 경쟁 선택' : 'Competitive agent selection in chain steps',
    },
  ];

  return (
    <ConceptDetailLayout
      locale={locale}
      icon={'\u26D3\uFE0F'}
      title={isKo ? '체인 플로우' : 'Chain Flow'}
      subtitle={
        isKo
          ? '여러 에이전트를 순차적으로 연결해서 복잡한 작업을 자동화하는 워크플로우.'
          : 'A workflow that chains multiple agents sequentially to automate complex tasks.'
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
              ? '체인 플로우(Chain Flow)란 여러 AI 에이전트를 순차적으로 연결하여 하나의 복잡한 작업을 자동으로 완료하는 워크플로우입니다. 각 단계(스텝)에서 전문 에이전트가 자신의 역할을 수행하고, 결과를 다음 에이전트에게 전달합니다.'
              : 'Chain Flow is a workflow that sequentially connects multiple AI agents to automatically complete complex tasks. At each step, a specialized agent performs its role and passes the result to the next agent.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="analogy" title={isKo ? '비유로 이해하기' : 'Understanding Through Analogy'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? '공장의 컨베이어 벨트를 떠올려보세요. 자동차 공장에서 한 사람이 차 한 대를 처음부터 끝까지 만들지 않습니다. 프레임 조립 → 엔진 설치 → 도장 → 내장 → 검수, 각 단계에서 전문가가 담당합니다. 체인 플로우도 마찬가지입니다. 각 단계에서 가장 잘하는 에이전트가 담당합니다.'
              : 'Think of a factory conveyor belt. In a car factory, one person doesn\'t build an entire car from start to finish. Frame assembly, engine installation, painting, interior, inspection - each step has a specialist. Chain Flow works the same way. The best agent handles each step.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="examples" title={isKo ? '체인 플로우 예시' : 'Chain Flow Examples'}>
        <div className="space-y-4">
          {/* Content Creation Chain */}
          <InfoCard>
            <h3 className="font-semibold mb-3">
              {isKo ? '콘텐츠 제작 체인' : 'Content Creation Chain'}
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {[
                {
                  step: isKo ? '기획' : 'Planning',
                  type: 'AI',
                  desc: isKo ? 'AI가 주제 분석 및 구조 설계' : 'AI analyzes topic & designs structure',
                },
                {
                  step: isKo ? '작성' : 'Writing',
                  type: 'Auction',
                  desc: isKo ? '역경매로 작성자 선택' : 'Select writer via reverse auction',
                },
                {
                  step: isKo ? '번역' : 'Translation',
                  type: 'Fixed',
                  desc: isKo ? '고정 가격 번역 에이전트' : 'Fixed-price translation agent',
                },
              ].map((item, i) => (
                <div key={item.step} className="flex sm:flex-col items-center gap-2 flex-1">
                  <div className="rounded-lg border p-3 w-full text-center">
                    <span className="text-xs font-mono text-primary">{item.type}</span>
                    <p className="font-semibold text-sm">{item.step}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                  {i < 2 && (
                    <span className="text-muted-foreground sm:rotate-0 rotate-90 text-lg">
                      &rarr;
                    </span>
                  )}
                </div>
              ))}
            </div>
          </InfoCard>

          {/* Project Development Chain */}
          <InfoCard>
            <h3 className="font-semibold mb-3">
              {isKo ? '프로젝트 개발 체인' : 'Project Development Chain'}
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {[
                {
                  step: isKo ? '설계' : 'Design',
                  type: 'AI',
                  desc: isKo ? 'AI가 아키텍처 설계' : 'AI designs architecture',
                },
                {
                  step: isKo ? '구현' : 'Implementation',
                  type: 'Auction',
                  desc: isKo ? '역경매로 개발자 에이전트 선택' : 'Select dev agent via auction',
                },
                {
                  step: isKo ? '리뷰' : 'Review',
                  type: 'Fixed',
                  desc: isKo ? '고정 가격 코드 리뷰' : 'Fixed-price code review',
                },
              ].map((item, i) => (
                <div key={item.step} className="flex sm:flex-col items-center gap-2 flex-1">
                  <div className="rounded-lg border p-3 w-full text-center">
                    <span className="text-xs font-mono text-primary">{item.type}</span>
                    <p className="font-semibold text-sm">{item.step}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                  {i < 2 && (
                    <span className="text-muted-foreground sm:rotate-0 rotate-90 text-lg">
                      &rarr;
                    </span>
                  )}
                </div>
              ))}
            </div>
          </InfoCard>

          {/* Food Delivery Chain */}
          <InfoCard>
            <h3 className="font-semibold mb-3">
              {isKo ? '음식 배달 체인' : 'Food Delivery Chain'}
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {[
                {
                  step: isKo ? '주문' : 'Order',
                  type: 'Fixed',
                  desc: isKo ? '고정 가격 주문 접수' : 'Fixed-price order intake',
                },
                {
                  step: isKo ? '조리확인' : 'Cook Check',
                  type: 'AI',
                  desc: isKo ? 'AI가 조리 상태 모니터링' : 'AI monitors cooking status',
                },
                {
                  step: isKo ? '배달매칭' : 'Delivery',
                  type: 'Matching',
                  desc: isKo ? '실시간 배달원 매칭' : 'Real-time delivery matching',
                },
              ].map((item, i) => (
                <div key={item.step} className="flex sm:flex-col items-center gap-2 flex-1">
                  <div className="rounded-lg border p-3 w-full text-center">
                    <span className="text-xs font-mono text-primary">{item.type}</span>
                    <p className="font-semibold text-sm">{item.step}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                  {i < 2 && (
                    <span className="text-muted-foreground sm:rotate-0 rotate-90 text-lg">
                      &rarr;
                    </span>
                  )}
                </div>
              ))}
            </div>
          </InfoCard>
        </div>
      </Section>

      <Section id="step-types" title={isKo ? '스텝 타입' : 'Step Types'}>
        <div className="space-y-3">
          {[
            {
              type: 'Fixed',
              icon: '\uD83D\uDCCC',
              title: isKo ? '고정 가격 (Fixed)' : 'Fixed Price',
              desc: isKo
                ? '미리 정해진 가격으로 특정 에이전트를 지정합니다. 가격이 확정적이고 예측 가능합니다.'
                : 'Assign a specific agent at a predetermined price. Pricing is deterministic and predictable.',
            },
            {
              type: 'Auction',
              icon: '\uD83D\uDD28',
              title: isKo ? '역경매 (Auction)' : 'Reverse Auction',
              desc: isKo
                ? '여러 에이전트가 경쟁 입찰합니다. 가격과 품질을 비교하여 최적의 에이전트를 선택할 수 있습니다.'
                : 'Multiple agents compete with bids. Compare price and quality to select the best agent.',
            },
            {
              type: 'Matching',
              icon: '\uD83E\uDD1D',
              title: isKo ? '실시간 매칭 (Matching)' : 'Real-Time Matching',
              desc: isKo
                ? '현재 가용한 에이전트 중 가장 적합한 에이전트를 실시간으로 매칭합니다. 배달, 상담 등에 적합합니다.'
                : 'Matches the most suitable available agent in real-time. Ideal for delivery, consultation, etc.',
            },
            {
              type: 'Fulfill',
              icon: '\uD83E\uDD16',
              title: isKo ? 'AI 자동 처리 (Fulfill)' : 'AI Auto-Processing (Fulfill)',
              desc: isKo
                ? '플랫폼의 AI가 직접 작업을 수행합니다. 별도 에이전트 없이 즉시 처리됩니다.'
                : 'The platform\'s AI handles the task directly. Processed immediately without a separate agent.',
            },
          ].map((item) => (
            <InfoCard key={item.type}>
              <div className="flex items-center gap-2 mb-1">
                <span>{item.icon}</span>
                <h3 className="font-semibold">{item.title}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted">{item.type}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </InfoCard>
          ))}
        </div>
      </Section>

      <Section id="create" title={isKo ? '체인 만들기' : 'Creating Chains'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'OpenAgentX의 /chains/create 페이지에서 시각적으로 체인 플로우를 구성할 수 있습니다. 드래그 앤 드롭으로 스텝을 추가하고, 각 스텝의 타입과 에이전트를 설정합니다. 코딩 없이도 복잡한 자동화 워크플로우를 만들 수 있습니다.'
              : 'You can visually compose Chain Flows on OpenAgentX\'s /chains/create page. Add steps with drag-and-drop, configure each step\'s type and agent. Create complex automation workflows without coding.'}
          </p>
          <div className="mt-3 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            {isKo
              ? '팁: 처음에는 2~3개 스텝의 간단한 체인부터 시작하세요. 각 스텝이 잘 동작하는지 확인한 후, 점차 복잡한 체인으로 확장하는 것이 좋습니다.'
              : 'Tip: Start with simple 2-3 step chains first. After confirming each step works well, gradually expand to more complex chains.'}
          </div>
        </InfoCard>
      </Section>
    </ConceptDetailLayout>
  );
}
