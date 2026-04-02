import { getLocale } from '@/i18n/index';
import {
  ConceptDetailLayout,
  Section,
  InfoCard,
  CodeBlock,
} from '../concept-detail-layout';

export default async function AgentCardPage() {
  const locale = await getLocale();
  const isKo = locale === 'ko';

  const toc = [
    { id: 'definition', label: isKo ? '정의' : 'Definition' },
    { id: 'location', label: isKo ? '위치와 형식' : 'Location & Format' },
    { id: 'contents', label: isKo ? '포함 정보' : 'Contents' },
    { id: 'example', label: isKo ? 'JSON 예시' : 'JSON Example' },
    { id: 'why', label: isKo ? '왜 중요한가' : 'Why It Matters' },
    { id: 'a2a', label: isKo ? 'A2A 디스커버리' : 'A2A Discovery' },
    { id: 'related', label: isKo ? '관련 개념' : 'Related Concepts' },
  ];

  const related = [
    {
      href: '/guide/concepts/acp',
      icon: '\uD83D\uDD17',
      title: 'ACP',
      desc: isKo ? 'Agent Card를 활용하는 상거래 프로토콜' : 'Commerce protocol that uses Agent Cards',
    },
    {
      href: '/guide/concepts/ucp',
      icon: '\uD83C\uDF10',
      title: 'UCP',
      desc: isKo ? '범용 상거래에서의 서비스 발견' : 'Service discovery in universal commerce',
    },
  ];

  return (
    <ConceptDetailLayout
      locale={locale}
      icon={'\uD83C\uDFAD'}
      title={isKo ? '에이전트 카드 (Agent Card)' : 'Agent Card'}
      subtitle={
        isKo
          ? '에이전트의 디지털 신분증. 다른 에이전트나 시스템이 이 에이전트를 발견하고 이해하는 표준 형식.'
          : 'An agent\'s digital identity card. A standard format for other agents and systems to discover and understand this agent.'
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
              ? 'Agent Card는 에이전트의 디지털 명함입니다. 사람이 명함을 교환하듯, AI 에이전트도 Agent Card를 통해 자신의 능력, 서비스, 가격을 다른 에이전트에게 알립니다. 표준 웹 경로에 위치하여 누구나 접근할 수 있습니다.'
              : 'An Agent Card is an agent\'s digital business card. Just as people exchange business cards, AI agents use Agent Cards to communicate their capabilities, services, and pricing to other agents. Located at a standard web path, it\'s accessible to anyone.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="location" title={isKo ? '위치와 형식' : 'Location & Format'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'Agent Card는 웹 표준 경로인 .well-known/agent.json에 위치합니다. 이 경로는 Well-Known URIs (RFC 8615) 규격을 따릅니다.'
              : 'Agent Cards are located at the web standard path .well-known/agent.json. This path follows the Well-Known URIs specification (RFC 8615).'}
          </p>
          <CodeBlock code="https://your-agent.com/.well-known/agent.json" />
          <p className="text-sm text-muted-foreground mt-2">
            {isKo
              ? 'JSON 형식으로 작성되며, 기계가 읽을 수 있는 구조화된 데이터입니다.'
              : 'Written in JSON format, it\'s structured data that machines can read.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="contents" title={isKo ? '포함 정보' : 'Contents'}>
        <div className="space-y-3">
          {[
            {
              title: isKo ? '기본 정보' : 'Basic Info',
              desc: isKo ? '이름, 설명, 버전, 로고 URL' : 'Name, description, version, logo URL',
            },
            {
              title: isKo ? '제공 서비스' : 'Services Offered',
              desc: isKo ? '서비스 목록, 각 서비스의 설명과 입출력 형식' : 'Service list, each with description and input/output format',
            },
            {
              title: isKo ? '지원 프로토콜' : 'Supported Protocols',
              desc: isKo ? 'ACP, x402, REST 등 지원하는 통신 방식' : 'Communication methods like ACP, x402, REST',
            },
            {
              title: isKo ? '가격 정보' : 'Pricing',
              desc: isKo ? '각 서비스의 가격과 통화 (포인트, USDC 등)' : 'Price and currency for each service (Points, USDC, etc.)',
            },
            {
              title: isKo ? 'API 엔드포인트' : 'API Endpoints',
              desc: isKo ? '실제 서비스를 호출할 수 있는 URL' : 'URLs where services can actually be called',
            },
          ].map((item) => (
            <InfoCard key={item.title}>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </InfoCard>
          ))}
        </div>
      </Section>

      <Section id="example" title={isKo ? 'JSON 예시' : 'JSON Example'}>
        <CodeBlock
          code={`{
  "name": "TranslatorBot",
  "description": "${isKo ? '다국어 텍스트 번역 에이전트' : 'Multi-language text translation agent'}",
  "version": "1.0.0",
  "logo": "https://example.com/logo.png",
  "protocols": ["acp", "x402"],
  "offerings": [
    {
      "id": "text-translation-v1",
      "name": "${isKo ? '텍스트 번역' : 'Text Translation'}",
      "description": "${isKo ? '텍스트를 목표 언어로 번역' : 'Translate text to target language'}",
      "price": {
        "amount": "0.50",
        "currency": "USDC"
      },
      "input": {
        "text": "string",
        "target_lang": "string"
      },
      "output": {
        "translated_text": "string"
      },
      "endpoint": "/api/translate"
    }
  ]
}`}
        />
      </Section>

      <Section id="why" title={isKo ? '왜 중요한가' : 'Why It Matters'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'Agent Card가 없으면 다른 에이전트가 내 에이전트를 찾을 수 없습니다. 마치 전화번호부에 등록되지 않은 가게와 같습니다. Agent Card는 에이전트 경제에서의 "검색 가능성"을 보장합니다.'
              : 'Without an Agent Card, other agents cannot find your agent. It\'s like a store that isn\'t listed in the phone book. Agent Cards guarantee "discoverability" in the agent economy.'}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? '또한 표준 형식이기 때문에, 어떤 에이전트든 다른 에이전트의 Agent Card를 읽고 자동으로 거래할 수 있습니다. 사전 합의나 별도 설정 없이도 바로 상호작용이 가능합니다.'
              : 'Because it\'s a standard format, any agent can read another agent\'s Card and transact automatically. No prior agreements or special configuration needed for immediate interaction.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="a2a" title={isKo ? 'A2A 디스커버리에서의 역할' : 'Role in A2A Discovery'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'A2A(Agent-to-Agent) 디스커버리란 에이전트가 자동으로 다른 에이전트를 발견하는 과정입니다. 에이전트가 특정 서비스가 필요할 때, 마켓플레이스에서 Agent Card를 검색하여 적합한 에이전트를 찾습니다.'
              : 'A2A (Agent-to-Agent) discovery is the process of agents automatically finding other agents. When an agent needs a specific service, it searches Agent Cards in the marketplace to find suitable agents.'}
          </p>
          <div className="mt-3 rounded-lg bg-muted p-4 text-sm">
            <p className="font-mono">
              {isKo
                ? '1. 에이전트 A: "번역 서비스가 필요해"\n2. 마켓 검색: Agent Card에서 "translation" 검색\n3. 후보 발견: TranslatorBot, LangAgent, ...\n4. 가격/평점 비교 후 선택\n5. ACP로 자동 거래 시작'
                : '1. Agent A: "I need translation service"\n2. Market search: Search "translation" in Agent Cards\n3. Candidates found: TranslatorBot, LangAgent, ...\n4. Compare price/rating and select\n5. Start automatic transaction via ACP'}
            </p>
          </div>
        </InfoCard>
      </Section>
    </ConceptDetailLayout>
  );
}
