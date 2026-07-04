import { useQuery } from '@apollo/client';
import { Box, Typography, Skeleton, Avatar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import { GET_INSIGHT_ACTIVITIES } from '../../graphql/queries';
import { formatDistanceToNow } from '@/features/board/utils/time';

interface ActivityNode {
  nodeId: string;
  id: string;
  insightId: string;
  userId: string;
  action: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

interface ActivitiesData {
  insightActivitiesCollection: {
    edges: Array<{ node: ActivityNode }>;
  };
}

interface Props { insightId: string }

function getActivityIcon(activity: ActivityNode) {
  if (activity.action === 'created') return <AddCircleOutlineIcon sx={{ fontSize: 16, color: '#4CAF50' }} />;
  if (activity.fieldName === 'stage') return <SwapHorizIcon sx={{ fontSize: 16, color: '#3F51B5' }} />;
  return <EditIcon sx={{ fontSize: 16, color: '#607D8B' }} />;
}

function getActivityText(activity: ActivityNode): string {
  if (activity.action === 'created') return 'Created insight';
  if (activity.fieldName === 'stage') return `Moved from ${activity.oldValue} → ${activity.newValue}`;
  if (activity.fieldName) return `Updated ${activity.fieldName}: ${activity.oldValue ?? '—'} → ${activity.newValue ?? '—'}`;
  return 'Updated insight';
}

export function ActivityTimeline({ insightId }: Props) {
  const { data, loading } = useQuery<ActivitiesData>(GET_INSIGHT_ACTIVITIES, {
    variables: { insightId },
    fetchPolicy: 'cache-and-network',
  });

  const activities = data?.insightActivitiesCollection?.edges?.map((e) => e.node) ?? [];

  if (loading && activities.length === 0) {
    return (
      <Box sx={{ px: 2 }}>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
            <Skeleton variant="circular" width={28} height={28} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={14} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  if (activities.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>No activity yet</Typography>;
  }

  return (
    <Box sx={{ px: 2 }}>
      {activities.slice(0, 5).map((activity, i) => (
        <Box key={activity.id} sx={{ display: 'flex', gap: 1.5, mb: 1.5, position: 'relative' }}>
          {i < activities.length - 1 && (
            <Box sx={{ position: 'absolute', left: 13, top: 28, bottom: -6, width: 2, bgcolor: '#E3E7FF' }} />
          )}
          <Avatar sx={{ width: 28, height: 28, bgcolor: '#E8EAF6', flexShrink: 0 }}>
            {getActivityIcon(activity)}
          </Avatar>
          <Box>
            <Typography variant="caption" sx={{ display: 'block', color: '#1A237E', fontWeight: 500 }}>
              {getActivityText(activity)}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {formatDistanceToNow(activity.createdAt)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
