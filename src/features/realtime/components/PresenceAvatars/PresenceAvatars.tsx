import { useState } from 'react';
import { AvatarGroup, Avatar, Tooltip, Drawer, Box, Typography, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import type { PresenceUser } from '../../types';

interface Props {
  users: PresenceUser[];
}

function getAvatarColor(userId: string): string {
  const colors = ['#3F51B5', '#E91E63', '#009688', '#FF5722', '#795548', '#607D8B'];
  const idx = userId.charCodeAt(0) % colors.length;
  return colors[idx];
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function PresenceAvatars({ users }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (users.length === 0) return null;

  return (
    <>
      <Tooltip title={`${users.length} online`} arrow>
        <AvatarGroup
          max={3}
          onClick={() => setDrawerOpen(true)}
          sx={{ cursor: 'pointer', '& .MuiAvatar-root': { width: 30, height: 30, fontSize: '0.75rem', border: '2px solid #fff' } }}
          aria-label={`${users.length} team members online`}
        >
          {users.map((u) => (
            <Avatar key={u.userId} sx={{ bgcolor: getAvatarColor(u.userId) }}>
              {getInitials(u.name)}
            </Avatar>
          ))}
        </AvatarGroup>
      </Tooltip>

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px 16px 0 0', maxHeight: '60vh' } }}
      >
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Online Now ({users.length})
          </Typography>
          <List disablePadding>
            {users.map((u) => (
              <ListItem key={u.userId} disablePadding sx={{ mb: 1 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: getAvatarColor(u.userId), width: 36, height: 36 }}>
                    {getInitials(u.name)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={u.name}
                  secondary={`Online since ${new Date(u.onlineAt).toLocaleTimeString()}`}
                  primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4CAF50' }} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
