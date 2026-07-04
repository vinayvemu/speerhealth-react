import { useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_INSIGHT, LOG_ACTIVITY } from '../graphql/mutations';
import { echoSuppressor } from '@/lib/supabase/echoSuppression';
import { apolloClient } from '@/lib/apollo/client';
import { nextStage, prevStage } from '@/shared/types/domain';
import type { Stage, Insight } from '@/shared/types/domain';
import { LIST_INSIGHTS, GET_STAGE_COUNTS } from '../graphql/queries';

interface UseStageMoveOptions {
  onSuccess?: (insight: Insight, toStage: Stage) => void;
  onError?: (message: string) => void;
  userId: string;
}

export function useStageMove({ onSuccess, onError, userId }: UseStageMoveOptions) {
  const [updateInsight] = useMutation(UPDATE_INSIGHT);
  const [logActivity] = useMutation(LOG_ACTIVITY);
  const pendingRef = useRef<Set<string>>(new Set());

  const move = useCallback(async (insight: Insight, direction: 'forward' | 'backward') => {
    const toStage = direction === 'forward'
      ? nextStage(insight.stage)
      : prevStage(insight.stage);

    if (!toStage) return; // already at boundary

    const insightId = insight.id;
    if (pendingRef.current.has(insightId)) return; // prevent double-fire

    pendingRef.current.add(insightId);
    echoSuppressor.tag(insightId);

    // Optimistic cache update — remove from current stage list
    const fromStage = insight.stage;
    evictFromStageCache(insightId, fromStage);

    try {
      const { data } = await updateInsight({
        variables: {
          filter: { id: { eq: insightId } },
          set: { stage: toStage },
        },
      });

      const updated = data?.updateInsightsCollection?.records?.[0] as Insight | undefined;
      if (!updated) throw new Error('No record returned');

      // Log activity
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
      // Revert — add back to original stage
      console.error('[useStageMove] mutation failed', e);
      apolloClient.refetchQueries({
        include: [LIST_INSIGHTS, GET_STAGE_COUNTS],
      });
      onError?.('Failed to move insight — reverting');
    } finally {
      pendingRef.current.delete(insightId);
    }
  }, [updateInsight, logActivity, onSuccess, onError, userId]);

  return { move };
}

function evictFromStageCache(insightId: string, _stage: Stage) {
  // Evict the specific insight from Apollo cache so it disappears immediately
  apolloClient.cache.evict({
    id: apolloClient.cache.identify({ __typename: 'Insights', id: insightId }),
  });
  apolloClient.cache.gc();
}
