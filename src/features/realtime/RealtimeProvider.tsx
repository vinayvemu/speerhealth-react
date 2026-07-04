import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePresence } from './hooks/usePresence';
import { useBroadcast } from './hooks/useBroadcast';
import { useBoardSync } from './hooks/useBoardSync';
import { useActivityFeed } from './hooks/useActivityFeed';
import { useToast } from '@/shared/components/ui/Toast';
import type { PresenceUser, CardRealtimeState } from './types';
import type { Stage } from '@/shared/types/domain';
import { STAGE_LABELS } from '@/shared/types/domain';
import type { FeedActivity } from './hooks/useActivityFeed';

interface RealtimeContextValue {
  onlineUsers: PresenceUser[];
  getCardState: (cardId: string) => CardRealtimeState;
  broadcastViewing: (cardId: string) => void;
  broadcastStoppedViewing: (cardId: string) => void;
  broadcastEditing: (cardId: string) => void;
  broadcastStoppedEditing: (cardId: string) => void;
  broadcastSwiping: (cardId: string, direction: 'left' | 'right', progress: number) => void;
  broadcastStoppedSwiping: (cardId: string) => void;
  // Activity feed
  activities: FeedActivity[];
  unreadCount: number;
  activityFeedOpen: boolean;
  openActivityFeed: () => void;
  closeActivityFeed: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be inside RealtimeProvider');
  return ctx;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, teamId } = useAuth();
  const { toast } = useToast();

  const userName = user?.email?.split('@')[0] ?? 'User';

  const { onlineUsers } = usePresence({ teamId, userId: user?.id ?? '', userName });

  const broadcast = useBroadcast({ teamId, userId: user?.id ?? '', userName });

  const { activities, unreadCount, isOpen: activityFeedOpen, open: openActivityFeed, close: closeActivityFeed } = useActivityFeed(teamId);

  useBoardSync({
    teamId,
    onCardMoved: (_id, _from: Stage, toStage: Stage) => {
      toast(`Someone moved a card to ${STAGE_LABELS[toStage]}`, 'info');
    },
    onCardCreated: (_id, stage: Stage) => {
      toast(`New insight added to ${STAGE_LABELS[stage]}`, 'info');
    },
    onCardEdited: () => { },
  });

  const value = useMemo<RealtimeContextValue>(() => ({
    onlineUsers,
    ...broadcast,
    activities,
    unreadCount,
    activityFeedOpen,
    openActivityFeed,
    closeActivityFeed,
  }), [onlineUsers, broadcast, activities, unreadCount, activityFeedOpen, openActivityFeed, closeActivityFeed]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
