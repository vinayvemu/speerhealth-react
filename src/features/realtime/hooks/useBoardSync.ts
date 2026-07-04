import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { apolloClient } from '@/lib/apollo/client';
import { echoSuppressor } from '@/lib/supabase/echoSuppression';
import { GET_STAGE_COUNTS, LIST_INSIGHTS } from '@/features/board/graphql/queries';
import type { Stage } from '@/shared/types/domain';

interface InsightPayload {
  id: string;
  stage: Stage;
  title: string;
  [key: string]: unknown;
}

interface BoardSyncOptions {
  teamId: string | null;
  onCardMoved?: (insightId: string, fromStage: Stage, toStage: Stage, movedByName?: string) => void;
  onCardCreated?: (insightId: string, stage: Stage) => void;
  onCardEdited?: (insightId: string) => void;
}

export function useBoardSync({ teamId, onCardMoved, onCardCreated, onCardEdited }: BoardSyncOptions) {
  const previousStages = useRef<Map<string, Stage>>(new Map());

  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`insights:${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'insights' },
        (payload) => {
          const newRecord = payload.new as InsightPayload | null;
          const oldRecord = payload.old as InsightPayload | null;
          const insightId = newRecord?.id ?? oldRecord?.id ?? '';

          // Skip own mutations
          if (echoSuppressor.isMine(insightId)) return;

          if (payload.eventType === 'INSERT' && newRecord) {
            // Card created by another user
            onCardCreated?.(newRecord.id, newRecord.stage);
            refetchBoard();
          } else if (payload.eventType === 'UPDATE' && newRecord && oldRecord) {
            const prevStage = previousStages.current.get(insightId) ?? oldRecord.stage;
            if (prevStage !== newRecord.stage) {
              // Stage changed
              onCardMoved?.(newRecord.id, prevStage, newRecord.stage);
            } else {
              // Field edit only
              onCardEdited?.(newRecord.id);
            }
            previousStages.current.set(insightId, newRecord.stage);
            refetchBoard();
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            evictFromCache(oldRecord.id);
            refetchBoard();
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamId, onCardMoved, onCardCreated, onCardEdited]);
}

function refetchBoard() {
  apolloClient.refetchQueries({ include: [LIST_INSIGHTS, GET_STAGE_COUNTS] });
}

function evictFromCache(insightId: string) {
  apolloClient.cache.evict({
    id: apolloClient.cache.identify({ __typename: 'Insights', id: insightId }),
  });
  apolloClient.cache.gc();
}
