import { describe, it, expect } from 'vitest';
import { nextStage, prevStage, stageIndex } from '@/shared/types/domain';

// Test the domain helpers that useBoardFilters depends on
describe('stage navigation helpers', () => {
  it('nextStage advances correctly', () => {
    expect(nextStage('observation')).toBe('insight');
    expect(nextStage('insight')).toBe('actionable');
    expect(nextStage('actionable')).toBe('impact');
    expect(nextStage('impact')).toBeNull();
  });

  it('prevStage retreats correctly', () => {
    expect(prevStage('impact')).toBe('actionable');
    expect(prevStage('actionable')).toBe('insight');
    expect(prevStage('insight')).toBe('observation');
    expect(prevStage('observation')).toBeNull();
  });

  it('stageIndex is correct', () => {
    expect(stageIndex('observation')).toBe(0);
    expect(stageIndex('insight')).toBe(1);
    expect(stageIndex('actionable')).toBe(2);
    expect(stageIndex('impact')).toBe(3);
  });
});

describe('graphql filter builder', () => {
  it('builds stage filter', () => {
    // Inline the logic from useBoardFilters to test it in isolation
    function buildFilter(stage: string, search: string, priorities: string[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filter: Record<string, any> = {
        stage: { eq: stage },
        isArchived: { eq: false },
      };
      if (search) {
        filter.or = [
          { title: { ilike: `%${search}%` } },
          { description: { ilike: `%${search}%` } },
        ];
      }
      if (priorities.length > 0) {
        filter.priority = { in: priorities };
      }
      return filter;
    }

    const basic = buildFilter('observation', '', []);
    expect(basic.stage).toEqual({ eq: 'observation' });
    expect(basic.or).toBeUndefined();

    const withSearch = buildFilter('insight', 'Johnson', []);
    expect(withSearch.or).toBeDefined();
    expect(withSearch.or[0].title.ilike).toContain('Johnson');

    const withPriority = buildFilter('observation', '', ['P1', 'P2']);
    expect(withPriority.priority).toEqual({ in: ['P1', 'P2'] });
  });
});
