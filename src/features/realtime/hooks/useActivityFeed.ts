import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { supabase } from '@/lib/supabase/client';
import type { Stage } from '@/shared/types/domain';

const GET_RECENT_ACTIVITIES = gql`
  query GetRecentActivities {
    insightActivitiesCollection(
      orderBy: [{ createdAt: DescNullsLast }]
      first: 30
    ) {
      edges {
        node {
          nodeId
          id
          insightId
          userId
          action
          fieldName
          oldValue
          newValue
          createdAt
        }
      }
    }
  }
`;

export interface FeedActivity {
  nodeId: string;
  id: string;
  insightId: string;
  userId: string;
  action: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  stage?: Stage;
}

interface ActivitiesData {
  insightActivitiesCollection: {
    edges: Array<{ node: FeedActivity }>;
  };
}

export function useActivityFeed(teamId: string | null) {
  const { data, refetch } = useQuery<ActivitiesData>(GET_RECENT_ACTIVITIES, {
    fetchPolicy: 'cache-and-network',
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const lastSeenRef = useRef<string | null>(null);

  const activities = data?.insightActivitiesCollection?.edges?.map((e) => e.node) ?? [];

  // Subscribe to new activities in real-time
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`activities:${teamId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'insight_activities' }, () => {
        refetch();
        if (!isOpen) setUnreadCount((c) => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamId, isOpen, refetch]);

  const open = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
    lastSeenRef.current = activities[0]?.id ?? null;
  }, [activities]);

  const close = useCallback(() => setIsOpen(false), []);

  return { activities, unreadCount, isOpen, open, close };
}
