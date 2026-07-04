import { describe, it, expect } from 'vitest';
import {
  groupByStage, weeklyBuckets, groupByCategory,
  topHcps, avgPipelineTimeDays, mostActiveHcp,
  type AnalyticsInsight,
} from '@/features/analytics/utils/transforms';

const makeInsight = (overrides: Partial<AnalyticsInsight>): AnalyticsInsight => ({
  id: Math.random().toString(),
  stage: 'observation',
  priority: 'P3',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  drugName: null,
  hcp: null,
  category: null,
  ...overrides,
});

describe('groupByStage', () => {
  it('groups insights by stage correctly', () => {
    const insights = [
      makeInsight({ stage: 'observation' }),
      makeInsight({ stage: 'observation' }),
      makeInsight({ stage: 'insight' }),
      makeInsight({ stage: 'impact' }),
    ];
    const result = groupByStage(insights);
    expect(result.observation).toHaveLength(2);
    expect(result.insight).toHaveLength(1);
    expect(result.actionable).toHaveLength(0);
    expect(result.impact).toHaveLength(1);
  });

  it('returns empty arrays for stages with no insights', () => {
    const result = groupByStage([]);
    expect(result.observation).toHaveLength(0);
    expect(result.impact).toHaveLength(0);
  });
});

describe('weeklyBuckets', () => {
  it('returns N buckets', () => {
    const buckets = weeklyBuckets([], 8);
    expect(buckets).toHaveLength(8);
  });

  it('counts insights in the correct week', () => {
    const now = new Date();
    const insight = makeInsight({ createdAt: now.toISOString() });
    const buckets = weeklyBuckets([insight], 4);
    const total = buckets.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(1);
  });
});

describe('groupByCategory', () => {
  it('groups and sorts by count descending', () => {
    const insights = [
      makeInsight({ category: { id: '1', name: 'Efficacy' } }),
      makeInsight({ category: { id: '1', name: 'Efficacy' } }),
      makeInsight({ category: { id: '2', name: 'Safety' } }),
    ];
    const result = groupByCategory(insights);
    expect(result[0].name).toBe('Efficacy');
    expect(result[0].count).toBe(2);
    expect(result[1].name).toBe('Safety');
  });

  it('handles insights with no category', () => {
    const insights = [makeInsight({ category: null })];
    const result = groupByCategory(insights);
    expect(result[0].name).toBe('Uncategorized');
  });
});

describe('topHcps', () => {
  it('returns top N HCPs by insight count', () => {
    const insights = [
      makeInsight({ hcp: { id: '1', name: 'Dr. A' } }),
      makeInsight({ hcp: { id: '1', name: 'Dr. A' } }),
      makeInsight({ hcp: { id: '2', name: 'Dr. B' } }),
    ];
    const result = topHcps(insights, 5);
    expect(result[0].name).toBe('Dr. A');
    expect(result[0].count).toBe(2);
  });
});

describe('avgPipelineTimeDays', () => {
  it('returns 0 when no impact insights', () => {
    expect(avgPipelineTimeDays([])).toBe(0);
  });

  it('calculates average correctly', () => {
    const created = new Date('2026-06-01T00:00:00Z').toISOString();
    const updated = new Date('2026-06-11T00:00:00Z').toISOString(); // 10 days
    const insight = makeInsight({ stage: 'impact', createdAt: created, updatedAt: updated });
    expect(avgPipelineTimeDays([insight])).toBe(10);
  });
});

describe('mostActiveHcp', () => {
  it('returns the HCP with most insights', () => {
    const insights = [
      makeInsight({ hcp: { id: '1', name: 'Dr. Top' } }),
      makeInsight({ hcp: { id: '1', name: 'Dr. Top' } }),
      makeInsight({ hcp: { id: '2', name: 'Dr. Low' } }),
    ];
    expect(mostActiveHcp(insights)).toBe('Dr. Top');
  });

  it('returns — when no HCPs', () => {
    expect(mostActiveHcp([])).toBe('—');
  });
});
