import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { PresenceUser } from '../types';

interface UsePresenceOptions {
  teamId: string | null;
  userId: string;
  userName: string;
}

export function usePresence({ teamId, userId, userName }: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  const handleVisibilityChange = useCallback(() => {
    // Handled inside useEffect via closure
  }, []);

  useEffect(() => {
    if (!teamId) return;

    const channel = supabase.channel(`presence:${teamId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users = Object.values(state)
          .flat()
          .filter((u) => u.userId !== userId); // exclude self
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            name: userName,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    const onVisibilityChange = async () => {
      if (document.hidden) {
        await channel.untrack();
      } else {
        await channel.track({ userId, name: userName, onlineAt: new Date().toISOString() });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [teamId, userId, userName, handleVisibilityChange]);

  return { onlineUsers };
}
