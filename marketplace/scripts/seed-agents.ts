/**
 * Seed Agents Script
 * 8개 에이전트 + 각각 2~3개 서비스를 PostgreSQL에 삽입
 *
 * Usage: npx tsx scripts/seed-agents.ts
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from marketplace root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5434/openagentx';
const ADMIN_OWNER_ID = '0c83d721-7b78-4561-97da-2e5d90d22539';

const pool = new Pool({ connectionString: DATABASE_URL });

interface ServiceDef {
  name: string;
  name_ko: string;
  description: string;
  description_ko: string;
  price_usdc: number;
  input_schema: object;
  output_schema: object;
}

interface AgentDef {
  name: string;
  description: string;
  description_ko: string;
  category: string;
  tags: string[];
  commission_rate: number;
  metadata: { system_prompt: string };
  services: ServiceDef[];
}

const INPUT_SCHEMA_PROMPT = {
  type: 'object',
  properties: { prompt: { type: 'string', description: '요청 내용' } },
  required: ['prompt'],
};

const OUTPUT_SCHEMA_TEXT = {
  type: 'object',
  properties: { result: { type: 'string', description: 'AI 응답 결과' } },
};

const SEED_AGENTS: AgentDef[] = [
  {
    name: 'CodeMaster',
    description: 'Full-stack coding assistant — code review, bug fixing, and refactoring.',
    description_ko: '코드마스터 — 코드 리뷰, 버그 수정, 리팩토링을 전문으로 하는 풀스택 코딩 어시스턴트입니다.',
    category: 'coding',
    tags: ['코딩', '풀스택', '코드리뷰', '버그수정', '리팩토링'],
    commission_rate: 5,
    metadata: {
      system_prompt: `당신은 CodeMaster, 전문 풀스택 코딩 어시스턴트입니다.
코드 리뷰, 버그 수정, 리팩토링에 특화되어 있습니다.

응답 규칙:
1. 코드 블록은 언어를 명시하세요 (예: \`\`\`typescript)
2. 문제점과 개선안을 구체적으로 설명하세요
3. 보안 취약점이 있으면 반드시 지적하세요
4. 성능 최적화 방안을 제시하세요
5. 한국어로 응답하되, 코드와 기술 용어는 영어를 유지하세요`,
    },
    services: [
      {
        name: 'code_review',
        name_ko: '코드 리뷰',
        description: 'Comprehensive code review with improvement suggestions',
        description_ko: '코드 품질, 보안, 성능을 분석하고 개선안을 제시합니다',
        price_usdc: 5,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'bug_fix',
        name_ko: '버그 수정',
        description: 'Detect and fix bugs in your code',
        description_ko: '코드의 버그를 탐지하고 수정 방안을 제공합니다',
        price_usdc: 8,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'refactoring',
        name_ko: '리팩토링',
        description: 'Refactor code for better readability and maintainability',
        description_ko: '코드를 더 읽기 좋고 유지보수하기 쉽게 리팩토링합니다',
        price_usdc: 7,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
    ],
  },
  {
    name: 'ContentCraft',
    description: 'AI content creation — blog posts, social media, and marketing copy.',
    description_ko: '콘텐츠 크래프트 — 블로그 포스트, SNS 콘텐츠, 마케팅 카피를 전문으로 생성합니다.',
    category: 'content_creation',
    tags: ['콘텐츠', '블로그', 'SNS', '마케팅카피', '카피라이팅'],
    commission_rate: 6,
    metadata: {
      system_prompt: `당신은 ContentCraft, 전문 콘텐츠 크리에이터입니다.
블로그 포스트, SNS 콘텐츠, 마케팅 카피 작성에 특화되어 있습니다.

응답 규칙:
1. 타겟 독자층을 고려한 톤앤매너를 사용하세요
2. SEO를 고려한 키워드를 자연스럽게 포함하세요
3. 매력적인 제목/헤드라인을 제안하세요
4. CTA(Call to Action)를 포함하세요
5. 플랫폼별 최적 길이를 준수하세요 (블로그: 1500자+, SNS: 280자 이내)
6. 한국어로 응답하세요`,
    },
    services: [
      {
        name: 'blog_post',
        name_ko: '블로그 포스트',
        description: 'SEO-optimized blog post creation',
        description_ko: 'SEO 최적화된 블로그 포스트를 작성합니다',
        price_usdc: 3,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'sns_content',
        name_ko: 'SNS 콘텐츠',
        description: 'Social media content pack (Instagram, Twitter, etc.)',
        description_ko: 'SNS 플랫폼별 최적화된 콘텐츠 세트를 제공합니다',
        price_usdc: 2,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'marketing_copy',
        name_ko: '마케팅 카피',
        description: 'Persuasive marketing copy for ads and landing pages',
        description_ko: '광고 및 랜딩페이지용 설득력 있는 마케팅 카피를 작성합니다',
        price_usdc: 4,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
    ],
  },
  {
    name: 'DataInsight',
    description: 'Data analysis agent — data summary, chart analysis, and statistical insights.',
    description_ko: '데이터 인사이트 — 데이터 요약, 차트 분석, 통계적 인사이트를 전문으로 제공합니다.',
    category: 'data_analysis',
    tags: ['데이터분석', '시각화', '통계', '차트분석', '인사이트'],
    commission_rate: 7,
    metadata: {
      system_prompt: `당신은 DataInsight, 전문 데이터 분석 에이전트입니다.
데이터 요약, 차트 분석, 통계적 인사이트 제공에 특화되어 있습니다.

응답 규칙:
1. 데이터를 정량적으로 분석하세요 (수치, 비율, 트렌드)
2. 핵심 인사이트를 3~5개로 요약하세요
3. 가능하면 시각화 제안(차트 유형, 축 설정)을 포함하세요
4. 이상치나 주목할 패턴을 별도로 강조하세요
5. 데이터 기반 의사결정을 위한 추천 액션을 제시하세요
6. 한국어로 응답하세요`,
    },
    services: [
      {
        name: 'data_summary',
        name_ko: '데이터 요약',
        description: 'Summarize and extract insights from your data',
        description_ko: '데이터를 분석하여 핵심 인사이트를 추출합니다',
        price_usdc: 5,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'chart_analysis',
        name_ko: '차트 분석',
        description: 'Analyze charts and data visualizations',
        description_ko: '차트와 데이터 시각화를 분석하고 해석합니다',
        price_usdc: 4,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
    ],
  },
  {
    name: 'CryptoAnalyzer',
    description: 'Crypto market analysis — token scanning, market analysis, and risk scoring.',
    description_ko: '크립토 애널라이저 — 토큰 스캔, 시장 분석, 리스크 스코어링을 전문으로 제공합니다.',
    category: 'crypto',
    tags: ['암호화폐', '시장분석', '토큰분석', '리스크', '온체인'],
    commission_rate: 5,
    metadata: {
      system_prompt: `당신은 CryptoAnalyzer, 전문 암호화폐 분석 에이전트입니다.
토큰 스캔, 시장 분석, 리스크 스코어링에 특화되어 있습니다.

응답 규칙:
1. 토큰 분석 시: 시가총액, 거래량, 유동성, 홀더 분포를 포함하세요
2. 리스크 스코어를 1-10으로 평가하세요 (1=매우 안전, 10=매우 위험)
3. 온체인 데이터 기반 인사이트를 제공하세요
4. 투자 조언이 아님을 명시하세요 (NFA/DYOR)
5. 프로젝트의 펀더멘탈(팀, 기술, 로드맵)도 평가하세요
6. 한국어로 응답하세요`,
    },
    services: [
      {
        name: 'token_scan',
        name_ko: '토큰 스캔',
        description: 'Quick token scan with risk scoring',
        description_ko: '토큰의 기본 정보와 리스크 스코어를 빠르게 제공합니다',
        price_usdc: 2,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'market_analysis',
        name_ko: '시장 분석',
        description: 'Comprehensive crypto market analysis report',
        description_ko: '암호화폐 시장 종합 분석 리포트를 제공합니다',
        price_usdc: 8,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
    ],
  },
  {
    name: 'TransLingua',
    description: 'Professional translation agent — Korean/English/Japanese/Chinese with domain expertise.',
    description_ko: '트랜스링구아 — 한/영/일/중 전문 번역과 로컬라이제이션을 제공합니다.',
    category: 'translation',
    tags: ['번역', '로컬라이제이션', '다국어', '한영번역', '기술번역'],
    commission_rate: 4,
    metadata: {
      system_prompt: `당신은 TransLingua, 전문 번역 에이전트입니다.
한국어, 영어, 일본어, 중국어 간 전문 번역에 특화되어 있습니다.

응답 규칙:
1. 원문의 의미와 뉘앙스를 정확히 전달하세요
2. 도메인별 전문 용어를 올바르게 사용하세요
3. 문화적 맥락을 고려한 자연스러운 번역을 하세요
4. 번역이 어려운 표현은 역주를 달아주세요
5. 원문과 번역문을 병렬로 제시하세요
6. 요청된 언어로 응답하세요 (기본: 한국어)`,
    },
    services: [
      {
        name: 'translate',
        name_ko: '번역',
        description: 'Professional translation between Korean/English/Japanese/Chinese',
        description_ko: '한/영/일/중 간 전문 번역을 제공합니다',
        price_usdc: 2,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'localize',
        name_ko: '로컬라이제이션',
        description: 'UI/UX localization with cultural adaptation',
        description_ko: 'UI/UX 로컬라이제이션 및 문화적 적응을 제공합니다',
        price_usdc: 5,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
    ],
  },
  {
    name: 'MarketingPro',
    description: 'Marketing and SEO agent — SEO audit, ad copy, and content strategy.',
    description_ko: '마케팅 프로 — SEO 감사, 광고 카피, 콘텐츠 전략을 전문으로 제공합니다.',
    category: 'marketing',
    tags: ['SEO', '마케팅', '광고', '키워드', '콘텐츠전략'],
    commission_rate: 6,
    metadata: {
      system_prompt: `당신은 MarketingPro, 전문 마케팅/SEO 에이전트입니다.
SEO 감사, 광고 카피 작성, 콘텐츠 전략 수립에 특화되어 있습니다.

응답 규칙:
1. SEO 분석 시: 키워드 밀도, 메타태그, 구조화 데이터를 점검하세요
2. 구체적인 개선 액션 아이템을 제시하세요
3. 경쟁사 분석 관점을 포함하세요
4. ROI 기반 우선순위를 제안하세요
5. 광고 카피는 A/B 테스트용 2~3개 버전을 제공하세요
6. 한국어로 응답하세요`,
    },
    services: [
      {
        name: 'seo_audit',
        name_ko: 'SEO 감사',
        description: 'Comprehensive SEO audit with actionable recommendations',
        description_ko: 'SEO 종합 감사 및 실행 가능한 개선안을 제공합니다',
        price_usdc: 6,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'ad_copy',
        name_ko: '광고 카피',
        description: 'High-converting ad copy for Google/Meta/Naver ads',
        description_ko: '전환율 높은 광고 카피를 작성합니다 (구글/메타/네이버)',
        price_usdc: 3,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
    ],
  },
  {
    name: 'AutoFlow',
    description: 'Automation agent — workflow design, script generation, and RPA solutions.',
    description_ko: '오토플로우 — 워크플로우 설계, 스크립트 생성, RPA 솔루션을 전문으로 제공합니다.',
    category: 'automation',
    tags: ['자동화', '워크플로우', 'RPA', '스크립트', '효율화'],
    commission_rate: 5,
    metadata: {
      system_prompt: `당신은 AutoFlow, 전문 자동화 에이전트입니다.
워크플로우 설계, 스크립트 생성, 업무 자동화에 특화되어 있습니다.

응답 규칙:
1. 워크플로우를 단계별로 명확하게 설계하세요
2. 자동화 스크립트는 실행 가능한 코드로 제공하세요
3. 에러 핸들링과 재시도 로직을 포함하세요
4. 필요한 도구/라이브러리를 명시하세요
5. 시간 절감 효과를 예상치로 제시하세요
6. 한국어로 응답하되, 코드와 기술 용어는 영어를 유지하세요`,
    },
    services: [
      {
        name: 'workflow_design',
        name_ko: '워크플로우 설계',
        description: 'Design automated workflows for your business processes',
        description_ko: '비즈니스 프로세스를 위한 자동화 워크플로우를 설계합니다',
        price_usdc: 10,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'script_generation',
        name_ko: '스크립트 생성',
        description: 'Generate automation scripts (Python, Bash, Node.js)',
        description_ko: '자동화 스크립트를 생성합니다 (Python, Bash, Node.js)',
        price_usdc: 5,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
    ],
  },
  {
    name: 'EduTutor',
    description: 'Education agent — concept explanation, quiz creation, and learning guidance.',
    description_ko: '에듀튜터 — 개념 설명, 퀴즈 생성, 학습 가이드를 전문으로 제공합니다.',
    category: 'education',
    tags: ['교육', '튜터링', '퀴즈', '학습', '개념설명'],
    commission_rate: 4,
    metadata: {
      system_prompt: `당신은 EduTutor, 전문 교육 튜터 에이전트입니다.
개념 설명, 퀴즈 생성, 학습 가이드 제공에 특화되어 있습니다.

응답 규칙:
1. 복잡한 개념을 단계별로 쉽게 설명하세요
2. 실생활 예시와 비유를 활용하세요
3. 핵심 용어는 정의와 함께 제시하세요
4. 퀴즈는 난이도별(초급/중급/고급)로 제공하세요
5. 오답에 대한 상세한 해설을 포함하세요
6. 추가 학습 자료를 추천하세요
7. 한국어로 응답하세요`,
    },
    services: [
      {
        name: 'explain_concept',
        name_ko: '개념 설명',
        description: 'Clear, step-by-step concept explanation with examples',
        description_ko: '예시와 함께 단계별로 개념을 명확하게 설명합니다',
        price_usdc: 1,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
      {
        name: 'create_quiz',
        name_ko: '퀴즈 생성',
        description: 'Generate quizzes with multiple difficulty levels',
        description_ko: '난이도별 퀴즈를 생성하고 상세 해설을 제공합니다',
        price_usdc: 2,
        input_schema: INPUT_SCHEMA_PROMPT,
        output_schema: OUTPUT_SCHEMA_TEXT,
      },
    ],
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let agentCount = 0;
    let serviceCount = 0;

    for (const agent of SEED_AGENTS) {
      const slug = generateSlug(agent.name);

      // Upsert agent (skip if slug already exists)
      const existing = await client.query('SELECT id FROM agents WHERE slug = $1', [slug]);
      let agentId: string;

      if (existing.rows.length > 0) {
        agentId = existing.rows[0].id;
        // Update metadata to ensure system_prompt is set
        await client.query(
          `UPDATE agents SET metadata = $1, status = 'active', updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(agent.metadata), agentId],
        );
        console.log(`  [UPDATE] ${agent.name} (${agentId})`);
      } else {
        const rankingScore = agent.commission_rate * 0.5;
        const result = await client.query<{ id: string }>(
          `INSERT INTO agents (owner_id, name, slug, description, description_ko, category, tags, status, commission_rate, ranking_score, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10)
           RETURNING id`,
          [
            ADMIN_OWNER_ID,
            agent.name,
            slug,
            agent.description,
            agent.description_ko,
            agent.category,
            agent.tags,
            agent.commission_rate,
            rankingScore,
            JSON.stringify(agent.metadata),
          ],
        );
        agentId = result.rows[0].id;
        agentCount++;
        console.log(`  [INSERT] ${agent.name} (${agentId})`);
      }

      // Insert services (skip duplicates by name+agent_id)
      for (const svc of agent.services) {
        const existingSvc = await client.query(
          'SELECT id FROM agent_services WHERE agent_id = $1 AND name = $2',
          [agentId, svc.name],
        );

        if (existingSvc.rows.length > 0) {
          // Update existing service
          await client.query(
            `UPDATE agent_services SET name_ko = $1, description = $2, description_ko = $3, price_usdc = $4,
             input_schema = $5, output_schema = $6, is_active = true WHERE id = $7`,
            [svc.name_ko, svc.description, svc.description_ko, svc.price_usdc,
             JSON.stringify(svc.input_schema), JSON.stringify(svc.output_schema), existingSvc.rows[0].id],
          );
          console.log(`    [UPDATE] service: ${svc.name}`);
        } else {
          await client.query(
            `INSERT INTO agent_services (agent_id, name, name_ko, description, description_ko, price_usdc, input_schema, output_schema, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
            [agentId, svc.name, svc.name_ko, svc.description, svc.description_ko, svc.price_usdc,
             JSON.stringify(svc.input_schema), JSON.stringify(svc.output_schema)],
          );
          serviceCount++;
          console.log(`    [INSERT] service: ${svc.name} ($${svc.price_usdc} USDC)`);
        }
      }
    }

    await client.query('COMMIT');
    console.log(`\nSeed complete: ${agentCount} agents, ${serviceCount} services inserted.`);

    // Verify
    const verification = await pool.query(`
      SELECT a.name, a.category, a.status, COUNT(s.id) as service_count
      FROM agents a
      LEFT JOIN agent_services s ON s.agent_id = a.id AND s.is_active = true
      WHERE a.owner_id = $1
      GROUP BY a.id
      ORDER BY a.name
    `, [ADMIN_OWNER_ID]);

    console.log('\nVerification:');
    for (const row of verification.rows) {
      console.log(`  ${row.name} [${row.category}] — ${row.status} — ${row.service_count} services`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
