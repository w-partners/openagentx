import { inngest } from '../client';
import { runAutoImprovement } from '../../src/lib/quality/prompt-optimizer';

/**
 * 주간 품질 자동 개선 크론
 * 매주 월요일 03:00 UTC에 실행
 * 피드백 10개 이상, 평균 평점 3.0 이하인 카테고리의 프롬프트를 자동 개선
 */
export const qualityImprovement = inngest.createFunction(
  { id: 'weekly-quality-improvement' },
  { cron: '0 3 * * 1' }, // 매주 월요일 03:00 UTC
  async ({ step }) => {
    const result = await step.run('auto-improve-prompts', async () => {
      return runAutoImprovement();
    });

    // 개선 결과 로깅
    await step.run('log-results', async () => {
      const improved = result.results.filter((r) => r.improved).length;
      const total = result.results.length;
      console.log(
        `[Quality Improvement] ${improved}/${total} 카테고리 프롬프트 개선 완료`,
      );
      return { improved, total };
    });

    return result;
  },
);
