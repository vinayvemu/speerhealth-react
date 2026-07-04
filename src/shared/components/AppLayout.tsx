import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { Sidebar } from './AppLayout/Sidebar';
import { OfflineBanner } from './OfflineBanner/OfflineBanner';
import { RealtimeProvider } from '@/features/realtime/RealtimeProvider';
import { ActivityFeedDrawer } from '@/features/realtime/components/ActivityFeedDrawer/ActivityFeedDrawer';
import { useBoardFilters } from '@/features/board/hooks/useBoardFilters';
import { useQuery } from '@apollo/client';
import { GET_STAGE_COUNTS } from '@/features/board/graphql/queries';
import type { Stage } from '@/shared/types/domain';

interface CountData {
  observation: { totalCount: number };
  insight: { totalCount: number };
  actionable: { totalCount: number };
  impact: { totalCount: number };
}

function AppLayoutInner() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { filters, setStage } = useBoardFilters();

  const { data } = useQuery<CountData>(GET_STAGE_COUNTS, {
    fetchPolicy: 'cache-and-network',
  });

  const stageCounts: Record<Stage, number> = {
    observation: data?.observation?.totalCount ?? 0,
    insight: data?.insight?.totalCount ?? 0,
    actionable: data?.actionable?.totalCount ?? 0,
    impact: data?.impact?.totalCount ?? 0,
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#F5F7FF' }}>
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((v) => !v)}
        activeStage={filters.stage}
        onStageChange={setStage}
        stageCounts={stageCounts}
      />

      {/* Main area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <OfflineBanner />
        <Outlet />
      </Box>

      <ActivityFeedDrawer />
    </Box>
  );
}

export function AppLayout() {
  return (
    <RealtimeProvider>
      <AppLayoutInner />
    </RealtimeProvider>
  );
}
