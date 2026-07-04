import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useThrottle } from '@/shared/hooks/useThrottle';
import type { BoardBroadcastEvent, CardRealtimeState } from '../types';

interface UseBroadcastOptions {
  teamId: string | null;
  userId: string;
  userName: string;
}

export function useBroadcast({ teamId, userId, userName }: UseBroadcastOptions) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Map of cardId → realtime state
  const [cardStates, setCardStates] = useState<Map<string, CardRealtimeState>>(new Map());

  useEffect(() => {
    if (!teamId) return;

    const channel = supabase.channel(`board:${teamId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'viewing' }, ({ payload }: { payload: Extract<BoardBroadcastEvent, { event: 'viewing' }> }) => {
        if (payload.userId === userId) return;
        setCardStates((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.cardId) ?? emptyState();
          next.set(payload.cardId, {
            ...existing,
            viewingUsers: [...existing.viewingUsers.filter((u) => u.userId !== payload.userId), { userId: payload.userId, name: payload.name }],
          });
          return next;
        });
      })
      .on('broadcast', { event: 'stopped_viewing' }, ({ payload }: { payload: Extract<BoardBroadcastEvent, { event: 'stopped_viewing' }> }) => {
        if (payload.userId === userId) return;
        setCardStates((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.cardId);
          if (!existing) return prev;
          next.set(payload.cardId, { ...existing, viewingUsers: existing.viewingUsers.filter((u) => u.userId !== payload.userId) });
          return next;
        });
      })
      .on('broadcast', { event: 'editing' }, ({ payload }: { payload: Extract<BoardBroadcastEvent, { event: 'editing' }> }) => {
        if (payload.userId === userId) return;
        setCardStates((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.cardId) ?? emptyState();
          next.set(payload.cardId, { ...existing, editingUser: { userId: payload.userId, name: payload.name } });
          return next;
        });
      })
      .on('broadcast', { event: 'stopped_editing' }, ({ payload }: { payload: Extract<BoardBroadcastEvent, { event: 'stopped_editing' }> }) => {
        if (payload.userId === userId) return;
        setCardStates((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.cardId);
          if (!existing) return prev;
          next.set(payload.cardId, { ...existing, editingUser: null });
          return next;
        });
      })
      .on('broadcast', { event: 'swiping' }, ({ payload }: { payload: Extract<BoardBroadcastEvent, { event: 'swiping' }> }) => {
        if (payload.userId === userId) return;
        setCardStates((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.cardId) ?? emptyState();
          next.set(payload.cardId, { ...existing, isBeingSwiped: true });
          return next;
        });
      })
      .on('broadcast', { event: 'stopped_swiping' }, ({ payload }: { payload: Extract<BoardBroadcastEvent, { event: 'stopped_swiping' }> }) => {
        if (payload.userId === userId) return;
        setCardStates((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.cardId);
          if (!existing) return prev;
          next.set(payload.cardId, { ...existing, isBeingSwiped: false });
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [teamId, userId]);

  const sendRaw = useCallback((event: BoardBroadcastEvent) => {
    channelRef.current?.send({ type: 'broadcast', event: event.event, payload: event });
  }, []);

  const throttledSend = useThrottle(sendRaw, 300);

  const broadcastViewing = useCallback((cardId: string) => {
    sendRaw({ event: 'viewing', cardId, userId, name: userName });
  }, [sendRaw, userId, userName]);

  const broadcastStoppedViewing = useCallback((cardId: string) => {
    sendRaw({ event: 'stopped_viewing', cardId, userId });
  }, [sendRaw, userId]);

  const broadcastEditing = useCallback((cardId: string) => {
    sendRaw({ event: 'editing', cardId, userId, name: userName });
  }, [sendRaw, userId, userName]);

  const broadcastStoppedEditing = useCallback((cardId: string) => {
    sendRaw({ event: 'stopped_editing', cardId, userId });
  }, [sendRaw, userId]);

  const broadcastSwiping = useCallback((cardId: string, direction: 'left' | 'right', progress: number) => {
    throttledSend({ event: 'swiping', cardId, userId, direction, progress });
  }, [throttledSend, userId]);

  const broadcastStoppedSwiping = useCallback((cardId: string) => {
    sendRaw({ event: 'stopped_swiping', cardId, userId });
  }, [sendRaw, userId]);

  const getCardState = useCallback((cardId: string): CardRealtimeState =>
    cardStates.get(cardId) ?? emptyState(),
  [cardStates]);

  return {
    getCardState,
    broadcastViewing,
    broadcastStoppedViewing,
    broadcastEditing,
    broadcastStoppedEditing,
    broadcastSwiping,
    broadcastStoppedSwiping,
  };
}

function emptyState(): CardRealtimeState {
  return { viewingUsers: [], editingUser: null, isBeingSwiped: false };
}
