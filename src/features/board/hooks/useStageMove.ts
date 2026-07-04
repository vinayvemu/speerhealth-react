import { useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_INSIGHT, LOG_ACTIVITY } from '../graphql/mutations';
import { echoSuppressor } from '@/lib/supabase/echoSuppression';
import { apolloClient } from '@/lib/apollo/client';
import { nextStage, prevStage } from '@/shared/types/domain';
import type { Stage, Insight } from '@/shared/types/domain';
import { LIST_INSIGHTS, GET_STAGE_COUNTS, GET_INSIGHT } from '../graphql/queries';

interface UseStageMoveOptions {
  onSuccess?: (insight: Insight, toStage: Stage) => void;
  onError?: (message: string) => void;
  userId: string;
}

export function useStageMove({ onSuccess, onError, userId }: UseStageMoveOptions) {
  const [updateInsight] = useMutation(UPDATE_INSIGHT);
  const [logActivity] = useMutation(LOG_ACTIVITY);
  const pendingRef = useRef<Set<string>>(new Set());

  const performMove = useCallback(async (insight: Insight, toStage: Stage) => {
    const insightId = insight.id;
    if (pendingRef.current.has(insightId)) return;

    pendingRef.current.add(insightId);

    // Concurrency check: fetch fresh record before committing the move
    try {
      const fresh = await apolloClient.query<{ insightsCollection: { edges: Array<{ node: { updatedAt: string } }> } }>({
        query: GET_INSIGHT,
        variables: { id: insightId },
        fetchPolicy: 'network-only',
      });
      const freshUpdatedAt = fresh.data?.insightsCollection?.edges?.[0]?.node?.updatedAt;
      if (freshUpdatedAt && freshUpdatedAt !== insight.updatedAt) {
        // Another user updated this insight since it was loaded
        pendingRef.current.delete(insightId);
        onError?.('Insight was updated by another user — move cancelled');
        apolloClient.refetchQueries({ include: [LIST_INSIGHTS, GET_STAGE_COUNTS] });
        return;
      }
    } catch {
      // Non-critical check failure — proceed with move
    }

    echoSuppressor.tag(insightId);

    const fromStage = insight.stage;
    evictFromStageCache(insightId);

    try {
      const { data } = await updateInsight({
        variables: {
          filter: { id: { eq: insightId } },
          set: { stage: toStage },
        },
      });

      const updated = data?.updateInsightsCollection?.records?.[0] as Insight | undefined;
      if (!updated) throw new Error('No record returned');

      logActivity({
        variables: {
          objects: [{
            insightId,
            userId,
            action: 'updated',
            fieldName: 'stage',
            oldValue: fromStage,
            newValue: toStage,
          }],
        },
      }).catch(() => { /* non-critical */ });

      onSuccess?.(updated, toStage);
    } catch (e) {
      console.error('[useStageMove] mutation failed', e);
      apolloClient.refetchQueries({ include: [LIST_INSIGHTS, GET_STAGE_COUNTS] });
      onError?.('Failed to move insight — reverting');
    } finally {
      pendingRef.current.delete(insightId);
    }
  }, [updateInsight, logActivity, onSuccess, onError, userId]);

  const move = useCallback(async (insight: Insight, direction: 'forward' | 'backward') => {
    const toStage = direction === 'forward'
      ? nextStage(insight.stage)
      : prevStage(insight.stage);
    if (!toStage) return;
    await performMove(insight, toStage);
  }, [performMove]);

  const moveToStage = useCallback(async (insight: Insight, toStage: Stage) => {
    if (toStage === insight.stage) return;
    await performMove(insight, toStage);
  }, [performMove]);

  return { move, moveToStage };
}

function evictFromStageCache(insightId: string) {
  apolloClient.cache.evict({
    id: apolloClient.cache.identify({ __typename: 'Insights', id: insightId }),
  });
  apolloClient.cache.gc();
}
