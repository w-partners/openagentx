import * as agentsRepo from '@/lib/db/repositories/agents';

export interface SeedAgent {
  name: string;
  description: string;
  description_ko: string;
  category: string;
  tags: string[];
  sample_services: { name: string; price_usdc: number; description: string }[];
  commission_rate: number;
}

export const SEED_AGENTS: SeedAgent[] = [
  {
    name: 'CodeMaster',
    description: 'Full-stack coding assistant — code review, bug fixing, refactoring, and test generation.',
    description_ko: '풀스택 코딩 어시스턴트 — 코드 리뷰, 버그 수정, 리팩토링, 테스트 생성을 제공합니다.',
    category: 'coding',
    tags: ['코딩', '풀스택', '코드리뷰'],
    sample_services: [
      { name: 'code_review', price_usdc: 5, description: '코드 리뷰 및 개선 제안' },
      { name: 'bug_fix', price_usdc: 10, description: '버그 탐지 및 수정' },
    ],
    commission_rate: 5,
  },
  {
    name: 'DataInsight',
    description: 'Data analysis agent — data collection, cleaning, visualization, and statistical analysis.',
    description_ko: '데이터 분석 에이전트 — 데이터 수집, 정제, 시각화, 통계 분석을 제공합니다.',
    category: 'data_analysis',
    tags: ['데이터분석', '시각화', '통계'],
    sample_services: [
      { name: 'data_report', price_usdc: 10, description: '데이터 분석 리포트' },
      { name: 'visualization', price_usdc: 5, description: '데이터 시각화' },
    ],
    commission_rate: 7,
  },
  {
    name: 'ContentCraft',
    description: 'AI content creation — blog posts, social media, marketing copy, email newsletters.',
    description_ko: 'AI 콘텐츠 생성 — 블로그 포스트, SNS 게시물, 마케팅 카피, 이메일 뉴스레터를 제공합니다.',
    category: 'content_creation',
    tags: ['콘텐츠', '카피라이팅', 'SNS'],
    sample_services: [
      { name: 'blog_post', price_usdc: 3, description: '블로그 글 작성' },
      { name: 'sns_pack', price_usdc: 5, description: 'SNS 콘텐츠 세트' },
    ],
    commission_rate: 6,
  },
  {
    name: 'TransLingua',
    description: 'Professional translation agent — Korean/English/Japanese/Chinese with domain-specific terminology.',
    description_ko: '전문 번역 에이전트 — 한국어/영어/일본어/중국어 도메인 특화 용어를 지원합니다.',
    category: 'translation',
    tags: ['번역', '로컬라이제이션', '다국어'],
    sample_services: [
      { name: 'translate_doc', price_usdc: 2, description: '문서 번역' },
      { name: 'localize_ui', price_usdc: 5, description: 'UI 로컬라이제이션' },
    ],
    commission_rate: 4,
  },
  {
    name: 'SEO Booster',
    description: 'Marketing and SEO agent — keyword analysis, SEO optimization, content strategy.',
    description_ko: '마케팅/SEO 에이전트 — 키워드 분석, SEO 최적화, 콘텐츠 전략을 제공합니다.',
    category: 'marketing',
    tags: ['SEO', '마케팅', '키워드'],
    sample_services: [
      { name: 'keyword_analysis', price_usdc: 5, description: '키워드 분석' },
      { name: 'seo_audit', price_usdc: 8, description: 'SEO 사이트 감사' },
    ],
    commission_rate: 6,
  },
  {
    name: 'CryptoLens',
    description: 'Real-time crypto market analysis with risk scoring, price trends, and on-chain tracking.',
    description_ko: '실시간 암호화폐 시장 분석 — 리스크 스코어링, 가격 추세, 온체인 추적을 제공합니다.',
    category: 'crypto',
    tags: ['암호화폐', '시장분석', '온체인'],
    sample_services: [
      { name: 'quick_scan', price_usdc: 2, description: '토큰 빠른 스캔' },
      { name: 'deep_analysis', price_usdc: 10, description: '종합 분석 리포트' },
    ],
    commission_rate: 5,
  },
  {
    name: 'FinanceGuru',
    description: 'Financial analysis agent — financial statement analysis, investment research, portfolio analysis.',
    description_ko: '금융 분석 에이전트 — 재무제표 분석, 투자 리서치, 포트폴리오 분석을 제공합니다.',
    category: 'finance',
    tags: ['금융', '투자분석', '재무'],
    sample_services: [
      { name: 'financial_report', price_usdc: 10, description: '재무 분석 리포트' },
      { name: 'portfolio_review', price_usdc: 5, description: '포트폴리오 리뷰' },
    ],
    commission_rate: 8,
  },
  {
    name: 'AutoFlow',
    description: 'Automation agent — repetitive task automation, workflow design, RPA solutions.',
    description_ko: '자동화 에이전트 — 반복 업무 자동화, 워크플로우 설계, RPA 솔루션을 제공합니다.',
    category: 'automation',
    tags: ['자동화', '워크플로우', 'RPA'],
    sample_services: [
      { name: 'workflow_design', price_usdc: 15, description: '워크플로우 설계' },
      { name: 'task_automation', price_usdc: 10, description: '업무 자동화 설정' },
    ],
    commission_rate: 5,
  },
];

const SYSTEM_OWNER_ID = '00000000-0000-0000-0000-000000000001';

export async function seedInitialAgents(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const seed of SEED_AGENTS) {
    const existing = await agentsRepo.findAll({
      category: seed.category,
      limit: 100,
      offset: 0,
    });

    const alreadyExists = existing.agents.some(
      (a: { name: string }) => a.name === seed.name,
    );

    if (alreadyExists) {
      skipped++;
      continue;
    }

    await agentsRepo.createAgent({
      owner_id: SYSTEM_OWNER_ID,
      name: seed.name,
      description: seed.description,
      description_ko: seed.description_ko,
      category: seed.category,
      tags: seed.tags,
      commission_rate: seed.commission_rate,
    });

    inserted++;
  }

  return { inserted, skipped };
}
