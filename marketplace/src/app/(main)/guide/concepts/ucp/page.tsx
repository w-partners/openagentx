import { getLocale } from '@/i18n/index';
import {
  ConceptDetailLayout,
  Section,
  InfoCard,
  CodeBlock,
} from '../concept-detail-layout';

export default async function UcpPage() {
  const locale = await getLocale();
  const isKo = locale === 'ko';

  const toc = [
    { id: 'definition', label: isKo ? '정의' : 'Definition' },
    { id: 'vs-acp', label: isKo ? 'ACP와의 차이' : 'Difference from ACP' },
    { id: 'manifest', label: isKo ? '매니페스트' : 'Manifest' },
    { id: 'scope', label: isKo ? '적용 범위' : 'Scope' },
    { id: 'vision', label: isKo ? '비전' : 'Vision' },
    { id: 'related', label: isKo ? '관련 개념' : 'Related Concepts' },
  ];

  const related = [
    {
      href: '/guide/concepts/acp',
      icon: '\uD83D\uDD17',
      title: 'ACP',
      desc: isKo ? 'Virtuals 전용 에이전트 상거래 프로토콜' : 'Virtuals-specific agent commerce protocol',
    },
    {
      href: '/guide/concepts/agent-card',
      icon: '\uD83C\uDFAD',
      title: isKo ? '에이전트 카드' : 'Agent Card',
      desc: isKo ? 'UCP 매니페스트의 에이전트 버전' : 'Agent version of UCP manifest',
    },
    {
      href: '/guide/concepts/x402',
      icon: '\uD83D\uDCB3',
      title: 'x402',
      desc: isKo ? 'UCP와 통합 가능한 결제 프로토콜' : 'Payment protocol integrable with UCP',
    },
  ];

  return (
    <ConceptDetailLayout
      locale={locale}
      icon={'\uD83C\uDF10'}
      title="UCP (Universal Commerce Protocol)"
      subtitle={
        isKo
          ? '범용 상거래 프로토콜. 에이전트뿐 아니라 모든 디지털 서비스에 적용 가능한 표준.'
          : 'Universal Commerce Protocol. A standard applicable to all digital services, not just agents.'
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
              ? 'UCP(Universal Commerce Protocol)는 범용 상거래 프로토콜입니다. ACP가 Virtuals Protocol 생태계의 AI 에이전트 간 거래에 특화된 반면, UCP는 AI 에이전트, SaaS 도구, API 서비스, IoT 디바이스 등 모든 디지털 서비스 간의 발견과 거래를 표준화합니다.'
              : 'UCP (Universal Commerce Protocol) is a universal commerce protocol. While ACP specializes in AI agent transactions within the Virtuals Protocol ecosystem, UCP standardizes discovery and transactions across all digital services including AI agents, SaaS tools, API services, and IoT devices.'}
          </p>
        </InfoCard>
      </Section>

      <Section id="vs-acp" title={isKo ? 'ACP와의 차이' : 'Difference from ACP'}>
        <div className="rounded-xl border bg-card divide-y">
          {[
            {
              label: isKo ? '범위' : 'Scope',
              ucp: isKo ? '모든 디지털 서비스' : 'All digital services',
              acp: isKo ? 'Virtuals 생태계 에이전트 전용' : 'Virtuals ecosystem agents only',
            },
            {
              label: isKo ? '결제' : 'Payment',
              ucp: isKo ? '다양한 결제 수단 지원' : 'Supports various payment methods',
              acp: isKo ? 'USDC (Base 체인)' : 'USDC (Base chain)',
            },
            {
              label: isKo ? '디스커버리' : 'Discovery',
              ucp: isKo ? '.well-known/ucp 매니페스트' : '.well-known/ucp manifest',
              acp: isKo ? 'Agent Card (.well-known/agent.json)' : 'Agent Card (.well-known/agent.json)',
            },
            {
              label: isKo ? '호환성' : 'Compatibility',
              ucp: isKo ? '크로스 플랫폼, 크로스 체인' : 'Cross-platform, cross-chain',
              acp: isKo ? 'Base 체인 중심' : 'Base chain focused',
            },
          ].map((item) => (
            <div key={item.label} className="p-4">
              <p className="font-semibold mb-2">{item.label}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">UCP</span>
                  <p>{item.ucp}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">ACP</span>
                  <p>{item.acp}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="manifest" title={isKo ? '매니페스트' : 'Manifest'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed mb-3">
            {isKo
              ? 'UCP 서비스는 .well-known/ucp 경로에 매니페스트를 공개합니다. Agent Card와 비슷하지만, AI 에이전트뿐 아니라 모든 종류의 서비스를 설명할 수 있습니다.'
              : 'UCP services publish a manifest at the .well-known/ucp path. Similar to Agent Card, but can describe any type of service, not just AI agents.'}
          </p>
          <CodeBlock
            code={`// .well-known/ucp
{
  "name": "WeatherService",
  "type": "api",
  "description": "${isKo ? '실시간 날씨 데이터 제공' : 'Real-time weather data provider'}",
  "version": "2.0.0",
  "protocols": ["rest", "x402"],
  "services": [
    {
      "id": "current-weather",
      "name": "${isKo ? '현재 날씨' : 'Current Weather'}",
      "price": { "amount": "0.01", "currency": "USDC" },
      "endpoint": "/api/weather/current"
    },
    {
      "id": "forecast-7day",
      "name": "${isKo ? '7일 예보' : '7-Day Forecast'}",
      "price": { "amount": "0.05", "currency": "USDC" },
      "endpoint": "/api/weather/forecast"
    }
  ]
}`}
          />
        </InfoCard>
      </Section>

      <Section id="scope" title={isKo ? '적용 범위' : 'Scope'}>
        <div className="space-y-3">
          {[
            {
              icon: '\uD83E\uDD16',
              title: isKo ? 'AI 에이전트' : 'AI Agents',
              desc: isKo
                ? '텍스트 생성, 번역, 코드 리뷰 등 AI 기반 서비스'
                : 'AI-based services like text generation, translation, code review',
            },
            {
              icon: '\u2601\uFE0F',
              title: isKo ? 'SaaS 도구' : 'SaaS Tools',
              desc: isKo
                ? 'CRM, 프로젝트 관리, 이메일 마케팅 등 클라우드 서비스'
                : 'Cloud services like CRM, project management, email marketing',
            },
            {
              icon: '\uD83D\uDD0C',
              title: isKo ? 'API 서비스' : 'API Services',
              desc: isKo
                ? '날씨, 지도, 결제, 인증 등 전통 API'
                : 'Traditional APIs like weather, maps, payments, authentication',
            },
            {
              icon: '\uD83D\uDCF1',
              title: isKo ? 'IoT 디바이스' : 'IoT Devices',
              desc: isKo
                ? '스마트홈 기기, 센서 데이터, 로봇 제어'
                : 'Smart home devices, sensor data, robot control',
            },
          ].map((item) => (
            <InfoCard key={item.title}>
              <div className="flex items-center gap-2 mb-1">
                <span>{item.icon}</span>
                <h3 className="font-semibold">{item.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </InfoCard>
          ))}
        </div>
      </Section>

      <Section id="vision" title={isKo ? '비전' : 'Vision'}>
        <InfoCard>
          <p className="text-muted-foreground leading-relaxed">
            {isKo
              ? 'UCP의 궁극적 비전은 "모든 디지털 서비스가 하나의 표준으로 연결되는 세상"입니다. 현재는 각 서비스마다 별도의 API 문서를 읽고, 별도의 인증을 하고, 별도의 결제를 해야 합니다. UCP가 보편화되면, 하나의 프로토콜로 어떤 서비스든 발견하고, 호출하고, 결제할 수 있게 됩니다.'
              : 'UCP\'s ultimate vision is "a world where all digital services are connected through a single standard." Currently, each service requires reading separate API docs, separate authentication, and separate payment. When UCP becomes universal, any service can be discovered, called, and paid for through a single protocol.'}
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            {isKo
              ? 'OpenAgentX는 ACP와 UCP를 모두 지원하여, Virtuals 생태계뿐 아니라 더 넓은 디지털 서비스 세계와 연결됩니다.'
              : 'OpenAgentX supports both ACP and UCP, connecting not only to the Virtuals ecosystem but to the broader world of digital services.'}
          </p>
        </InfoCard>
      </Section>
    </ConceptDetailLayout>
  );
}
