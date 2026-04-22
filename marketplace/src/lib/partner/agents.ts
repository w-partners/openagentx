export interface PartnerAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  sampleInput: string;
  sampleOutput: string;
  resultType: string;
  pricePoints: number;
  tags: string[];
  capabilities: string[];
}

export const DEFAULT_AGENTS: PartnerAgent[] = [
  {
    id: 'content-creator',
    name: 'SNS 콘텐츠 크리에이터',
    description:
      'SNS 플랫폼에 최적화된 텍스트 콘텐츠를 생성합니다. 해시태그, 이모지, CTA 포함.',
    category: 'content',
    sampleInput: '인스타그램용 카페 신메뉴 홍보 글 작성해줘',
    sampleOutput:
      '☕ 새로운 시그니처 라떼가 찾아왔어요!\n\n달콤한 캐러멜과 고소한 에스프레소의 완벽한 만남 💛\n오늘부터 2주간 런칭 특가 20% OFF!\n\n📍 전 매장에서 만나보세요\n#카페신메뉴 #시그니처라떼 #커피스타그램',
    resultType: 'text',
    pricePoints: 100,
    tags: ['sns', 'content', 'copywriting', 'instagram', 'threads'],
    capabilities: [
      '텍스트 콘텐츠 생성',
      '플랫폼별 최적화',
      '해시태그 추천',
      'CTA 포함',
      '톤앤매너 조절',
    ],
  },
  {
    id: 'marketing-analyst',
    name: '마케팅 분석가',
    description:
      'SNS 마케팅 전략을 분석하고 개선 방안을 제시합니다. 경쟁사 분석, 트렌드 파악 포함.',
    category: 'analysis',
    sampleInput:
      '우리 인스타 계정 @example_shop의 최근 게시물 성과를 분석해줘',
    sampleOutput:
      '📊 계정 분석 결과\n\n- 평균 도달률: 상위 30% (업종 대비 양호)\n- 최고 성과 콘텐츠: 릴스(영상) 형태\n- 개선 포인트: 포스팅 시간대 조정 권장 (오후 7-9시)\n- 추천 전략: UGC 콘텐츠 비율 확대',
    resultType: 'analysis',
    pricePoints: 200,
    tags: ['marketing', 'analysis', 'strategy', 'insights'],
    capabilities: [
      '계정 성과 분석',
      '경쟁사 벤치마킹',
      '콘텐츠 전략 제안',
      '트렌드 분석',
      'KPI 리포트',
    ],
  },
  {
    id: 'post-optimizer',
    name: '포스팅 최적화 도우미',
    description:
      '기존 콘텐츠를 각 SNS 플랫폼에 맞게 최적화합니다. 크로스 포스팅 지원.',
    category: 'content',
    sampleInput:
      '이 블로그 글을 인스타, 스레드, X에 맞게 변환해줘: [블로그 원문]',
    sampleOutput:
      '[Instagram]\n📸 핵심 내용 + 이미지 설명 + 해시태그 30개\n\n[Threads]\n🧵 스레드 형식 3개 연결 포스트\n\n[X]\n280자 이내 임팩트 있는 요약 + 링크',
    resultType: 'text',
    pricePoints: 150,
    tags: ['optimization', 'cross-posting', 'platform-specific'],
    capabilities: [
      '플랫폼별 포맷 변환',
      '글자수 최적화',
      '해시태그 전략',
      '크로스 포스팅',
      'A/B 테스트 문구',
    ],
  },
  {
    id: 'account-advisor',
    name: '계정 성장 어드바이저',
    description:
      'SNS 계정 성장을 위한 전략을 수립하고 실행 계획을 제안합니다.',
    category: 'marketing',
    sampleInput: '팔로워 1000명에서 10000명으로 성장하려면?',
    sampleOutput:
      '🚀 30일 성장 플랜\n\n1주차: 콘텐츠 감사 + 프로필 최적화\n2주차: 릴스 집중 + 협업 DM\n3주차: UGC 캠페인 + 스토리 전략\n4주차: 광고 테스트 + 데이터 분석\n\n핵심: 주 5회 릴스 + 매일 스토리 3회',
    resultType: 'report',
    pricePoints: 300,
    tags: ['growth', 'strategy', 'followers', 'engagement'],
    capabilities: [
      '성장 전략 수립',
      '콘텐츠 캘린더',
      '참여율 개선',
      '팔로워 획득 전략',
      '브랜딩 가이드',
    ],
  },
  {
    id: 'feed-analyzer',
    name: '피드 분석기',
    description:
      'SNS 피드의 시각적 일관성, 콘텐츠 믹스, 참여도를 분석합니다.',
    category: 'analysis',
    sampleInput: '내 인스타그램 피드를 분석해줘',
    sampleOutput:
      '🎨 피드 분석\n\n- 색감 일관성: 7/10 (따뜻한 톤 유지 양호)\n- 콘텐츠 믹스: 제품 60%, 라이프스타일 30%, UGC 10%\n- 추천: UGC 비율 25%로 확대\n- 그리드 레이아웃: 3열 패턴 추천',
    resultType: 'analysis',
    pricePoints: 200,
    tags: ['feed', 'visual', 'analysis', 'instagram', 'aesthetic'],
    capabilities: [
      '피드 시각 분석',
      '콘텐츠 믹스 평가',
      '색감 일관성 체크',
      '그리드 전략',
      '경쟁사 피드 비교',
    ],
  },
];

import { runClaude } from './claude-runner';

const USE_CLAUDE = process.env.AGENT_ENGINE !== 'gemini'; // 기본: claude -p

export async function executeAgent(
  agentId: string,
  input: string,
): Promise<string> {
  const agent = DEFAULT_AGENTS.find((a) => a.id === agentId);
  if (!agent) throw new Error('에이전트를 찾을 수 없습니다');

  const systemPrompt = `당신은 "${agent.name}"입니다. ${agent.description}\n기능: ${agent.capabilities.join(', ')}\n한국어로 전문적이고 실용적으로 답변하세요.`;

  if (USE_CLAUDE) {
    return runClaude({
      systemPrompt,
      input,
      model: 'sonnet',
      maxTurns: 5,
    });
  }

  const { callGeminiProxy } = await import('@/lib/ai/gemini-proxy');
  return callGeminiProxy([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: input },
  ]);
}

/** Execute a custom agent using its system prompt */
export async function executeCustomAgent(
  systemPrompt: string,
  _agentName: string,
  input: string,
  allowedTools?: string[],
): Promise<string> {
  if (USE_CLAUDE) {
    return runClaude({
      systemPrompt,
      input,
      model: 'sonnet',
      maxTurns: 15,
      allowedTools: allowedTools ?? [],
    });
  }

  const { callGeminiProxy } = await import('@/lib/ai/gemini-proxy');
  return callGeminiProxy([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: input },
  ]);
}
