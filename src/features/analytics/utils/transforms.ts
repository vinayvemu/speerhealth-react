import type { Stage, Priority } from '@/shared/types/domain';
import { STAGES } from '@/shared/types/domain';

export interface AnalyticsInsight {
  id: string;
  stage: Stage;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  drugName: string | null;
  hcp: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
}

// Group insights by stage
export function groupByStage(insights: AnalyticsInsight[]): Record<Stage, AnalyticsInsight[]> {
  return STAGES.reduce((acc, stage) => {
    acc[stage] = insights.filter((i) => i.stage === stage);
    return acc;
  }, {} as Record<Stage, AnalyticsInsight[]>);
}

// Weekly buckets — last N weeks
export interface WeekBucket {
  week: string; // "Mon Jun 23"
  count: number;
}

export function weeklyBuckets(insights: AnalyticsInsight[], weeks = 8): WeekBucket[] {
  const now = new Date();
  const buckets: WeekBucket[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7 - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999); // include full last day of week

    const count = insights.filter((ins) => {
      const d = new Date(ins.createdAt);
      return d >= weekStart && d <= weekEnd;
    }).length;

    buckets.push({
      week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    });
  }
  return buckets;
}

// Category distribution
export interface CategoryCount {
  name: string;
  count: number;
}

export function groupByCategory(insights: AnalyticsInsight[]): CategoryCount[] {
  const map = new Map<string, number>();
  insights.forEach((i) => {
    const name = i.category?.name ?? 'Uncategorized';
    map.set(name, (map.get(name) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// Priority × Stage heatmap
export interface HeatmapCell {
  stage: Stage;
  priority: Priority;
  count: number;
}

export function priorityByStageHeatmap(insights: AnalyticsInsight[]): HeatmapCell[] {
  const priorities: Priority[] = ['P1', 'P2', 'P3', 'P4'];
  const cells: HeatmapCell[] = [];
  for (const stage of STAGES) {
    for (const priority of priorities) {
      cells.push({
        stage,
        priority,
        count: insights.filter((i) => i.stage === stage && i.priority === priority).length,
      });
    }
  }
  return cells;
}

// Top HCPs by insight count
export interface HcpCount {
  name: string;
  count: number;
}

export function topHcps(insights: AnalyticsInsight[], limit = 10): HcpCount[] {
  const map = new Map<string, number>();
  insights.forEach((i) => {
    if (i.hcp) map.set(i.hcp.name, (map.get(i.hcp.name) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Average pipeline time (createdAt → updatedAt for impact insights, in days)
export function avgPipelineTimeDays(insights: AnalyticsInsight[]): number {
  const impactInsights = insights.filter((i) => i.stage === 'impact');
  if (impactInsights.length === 0) return 0;
  const totalMs = impactInsights.reduce((sum, i) => {
    return sum + (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime());
  }, 0);
  return Math.round(totalMs / impactInsights.length / 86_400_000);
}

// Most active HCP
export function mostActiveHcp(insights: AnalyticsInsight[]): string {
  const top = topHcps(insights, 1);
  return top[0]?.name ?? '—';
}
