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

async function fetchAllInsights(): Promise<AnalyticsInsight[]> {
  const all: AnalyticsInsight[] = [];
  let cursor: string | null = null;

  do {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await apolloClient.query<{
      insightsCollection: {
        edges: Array<{ node: AnalyticsInsight }>;
        pageInfo: PageInfo;
      };
    }>({
      query: GET_ALL_INSIGHTS_FOR_ANALYTICS,
      variables: { cursor },
      fetchPolicy: 'network-only',
    });
    all.push(...data.insightsCollection.edges.map((e) => e.node));
    cursor = data.insightsCollection.pageInfo.hasNextPage
      ? data.insightsCollection.pageInfo.endCursor
      : null;
  } while (cursor !== null);

  return all;
}

export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const insights = await fetchAllInsights();
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
