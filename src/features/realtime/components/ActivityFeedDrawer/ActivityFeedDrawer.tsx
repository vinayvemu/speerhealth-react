import { Box, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import type { FeedActivity } from '../../hooks/useActivityFeed';
import { formatDistanceToNow } from '@/features/board/utils/time';
import { useRealtime } from '../../RealtimeProvider';
import { AppDrawer } from '@/shared/components/ui/AppDrawer';
import type { Stage } from '@/shared/types/domain';

interface Props {
  onActivityClick?: (stage: Stage) => void;
}

function ActivityIcon({ activity }: { activity: FeedActivity }) {
  if (activity.action === 'created') return <AddCircleOutlineIcon sx={{ fontSize: 16, color: '#4CAF50' }} />;
  if (activity.fieldName === 'stage') return <SwapHorizIcon sx={{ fontSize: 16, color: '#3F51B5' }} />;
  return <EditIcon sx={{ fontSize: 16, color: '#607D8B' }} />;
}

function activityText(a: FeedActivity): string {
  if (a.action === 'created') return 'Created a new insight';
  if (a.fieldName === 'stage') return `Moved insight → ${a.newValue ?? ''}`;
  if (a.fieldName) return `Updated ${a.fieldName}`;
  return 'Updated insight';
}

function getActivityStage(a: FeedActivity): Stage {
  // If it's a stage move, navigate to the destination stage
  if (a.fieldName === 'stage' && a.newValue) return a.newValue as Stage;
  // Otherwise navigate to whatever stage context we have, default to observation
  return 'observation';
}

export function ActivityFeedDrawer({ onActivityClick }: Props) {
  const { activities, activityFeedOpen, closeActivityFeed } = useRealtime();

  const handleItemClick = (activity: FeedActivity) => {
    if (onActivityClick) {
      onActivityClick(getActivityStage(activity));
      closeActivityFeed();
    }
  };

  return (
    <AppDrawer
      open={activityFeedOpen}
      onClose={closeActivityFeed}
      title="Activity Feed"
      subtitle="All board activity in real-time"
    >
      {activities.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress size={24} sx={{ color: '#3F51B5' }} />
        </Box>
      ) : (
        <List disablePadding sx={{ mx: -3, mt: -2.5 }}>
          {activities.map((activity, i) => (
            <Box key={activity.id}>
              <ListItem
                alignItems="flex-start"
                onClick={() => handleItemClick(activity)}
                sx={{
                  py: 1.5, px: 3,
                  cursor: onActivityClick ? 'pointer' : 'default',
                  transition: 'background-color 0.12s',
                  '&:hover': onActivityClick ? { bgcolor: '#F5F5F5' } : {},
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#E8EAF6' }}>
                    <ActivityIcon activity={activity} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1A237E' }}>
                      {activityText(activity)}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.disabled">
                      {formatDistanceToNow(activity.createdAt)}
                    </Typography>
                  }
                />
              </ListItem>
              {i < activities.length - 1 && <Divider component="li" />}
            </Box>
          ))}
        </List>
      )}
    </AppDrawer>
  );
}
