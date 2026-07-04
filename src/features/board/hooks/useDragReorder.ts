import { useCallback } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useMutation } from '@apollo/client';
import { UPDATE_INSIGHT } from '../graphql/mutations';
import type { Insight } from '@/shared/types/domain';
import { echoSuppressor } from '@/lib/supabase/echoSuppression';

export function useDragReorder(insights: Insight[], onReordered: (reordered: Insight[]) => void) {
  const [updateInsight] = useMutation(UPDATE_INSIGHT);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = insights.findIndex((i) => i.id === active.id);
    const newIndex = insights.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(insights, oldIndex, newIndex);
    onReordered(reordered); // optimistic update

    // Persist new column_order for ALL items so AscNullsLast ordering is reliable
    reordered.forEach((ins) => echoSuppressor.tag(ins.id));

    try {
      await Promise.all(
        reordered.map((ins, idx) =>
          updateInsight({
            variables: {
              filter: { id: { eq: ins.id } },
              set: { columnOrder: idx },
            },
          })
        )
      );
    } catch (e) {
      console.error('[useDragReorder] failed to persist order', e);
      onReordered(insights); // revert
    }
  }, [insights, onReordered, updateInsight]);

  return { handleDragEnd };
}
