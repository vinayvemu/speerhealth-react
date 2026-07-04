import { Box, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import type { FeedActivity } from '../../hooks/useActivityFeed';
import { formatDistanceToNow } from '@/features/board/utils/time';
import { useRealtime } from '../../RealtimeProvider';
import { AppDrawer } from '@/shared/components/ui/AppDrawer';

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

export function ActivityFeedDrawer() {
  const { activities, activityFeedOpen, closeActivityFeed } = useRealtime();

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
              <ListItem alignItems="flex-start" sx={{ py: 1.5, px: 3 }}>
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#E8EAF6' }}>
                    <ActivityIcon activity={activity} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={500} color="#1A237E">
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
