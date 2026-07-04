import { useState, useEffect, useCallback } from 'react';
import { apolloClient } from '@/lib/apollo/client';
import { GET_ALL_INSIGHTS_FOR_ANALYTICS } from '../graphql/queries';
import {
  groupByStage, weeklyBuckets, groupByCategory,
  priorityByStageHeatmap, topHcps, avgPipelineTimeDays, mostActiveHcp,
  type AnalyticsInsight, type WeekBucket, type CategoryCount,
  type HeatmapCell, type HcpCount,
} from '../utils/transforms';
import type { Stage } from '@/shared/types/domain';

export interface DateRange {
  dateFrom: string | null;
  dateTo: string | null;
}

export interface AnalyticsData {
  totalCount: number;
  byStage: Record<Stage, AnalyticsInsight[]>;
  weekly: WeekBucket[];
  byCategory: CategoryCount[];
  heatmap: HeatmapCell[];
  hcpLeaderboard: HcpCount[];
  avgPipelineDays: number;
  topHcp: string;
}

interface PageInfo { hasNextPage: boolean; endCursor: string }
interface InsightsPage {
  edges: Array<{ node: AnalyticsInsight }>;
  pageInfo: PageInfo;
}

async function fetchOnePage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter: Record<string, any> | undefined,
  cursor: string | null,
): Promise<InsightsPage> {
  const result = await apolloClient.query<{ insightsCollection: InsightsPage }>({
    query: GET_ALL_INSIGHTS_FOR_ANALYTICS,
    variables: { cursor, ...(filter ? { filter } : {}) },
    fetchPolicy: 'network-only',
  });
  return result.data.insightsCollection;
}

async function fetchAllInsights(dateRange?: DateRange): Promise<AnalyticsInsight[]> {
  const all: AnalyticsInsight[] = [];
  let cursor: string | null = null;

  // Build filter from date range
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filter: Record<string, any> | undefined;
  if (dateRange?.dateFrom || dateRange?.dateTo) {
    filter = { createdAt: {} };
    if (dateRange.dateFrom) filter.createdAt.gte = `${dateRange.dateFrom}T00:00:00Z`;
    if (dateRange.dateTo) filter.createdAt.lte = `${dateRange.dateTo}T23:59:59Z`;
  }

  let page: InsightsPage;
  do {
    // eslint-disable-next-line no-await-in-loop
    page = await fetchOnePage(filter, cursor);
    page.edges.forEach((e) => all.push(e.node));
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor !== null);

  return all;
}

export function useAnalyticsData(dateRange?: DateRange) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const insights = await fetchAllInsights(dateRange);
      setData({
        totalCount: insights.length,
        byStage: groupByStage(insights),
        weekly: weeklyBuckets(insights, 8),
        byCategory: groupByCategory(insights),
        heatmap: priorityByStageHeatmap(insights),
        hcpLeaderboard: topHcps(insights, 10),
        avgPipelineDays: avgPipelineTimeDays(insights),
        topHcp: mostActiveHcp(insights),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange?.dateFrom, dateRange?.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
