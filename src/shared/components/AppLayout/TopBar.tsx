import { Box, Typography, InputBase, IconButton, Button, Tooltip, Badge } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import type { Stage } from '@/shared/types/domain';
import { STAGES, STAGE_LABELS } from '@/shared/types/domain';
import { STAGE_ICONS } from './Sidebar';
import { PresenceAvatars } from '@/features/realtime/components/PresenceAvatars/PresenceAvatars';
import { useRealtime } from '@/features/realtime/RealtimeProvider';

type ViewMode = 'list' | 'grid';

interface Props {
  activeStage: Stage;
  activeCount: number;
  search: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  onLogInsight: () => void;
}

export function TopBar({ activeStage, activeCount, search, onSearchChange, viewMode, onViewModeChange, onLogInsight }: Props) {
  const { onlineUsers, unreadCount, openActivityFeed } = useRealtime();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        height: 64,
        bgcolor: '#fff',
        borderBottom: '1px solid #E8EBF4',
        flexShrink: 0,
      }}
    >
      {/* Stage title + badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box sx={{ color: '#3F51B5', display: 'flex', alignItems: 'center' }}>
          {STAGE_ICONS[activeStage]}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0D1729', mr: 0.5 }}>
          {STAGE_LABELS[activeStage]}
        </Typography>
        <Box sx={{
          minWidth: 24, height: 24, borderRadius: '12px',
          bgcolor: '#3F51B5', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0.75,
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.72rem', lineHeight: 1 }}>
            {activeCount}
          </Typography>
        </Box>
      </Box>

      {/* Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        {STAGES.map((s, i) => (
          <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {i > 0 && <ChevronRightIcon sx={{ fontSize: 14, color: '#CFD8DC' }} />}
            <Typography sx={{
              fontSize: '0.8125rem',
              fontWeight: s === activeStage ? 700 : 400,
              color: s === activeStage ? '#1A237E' : '#90A4AE',
            }}>
              {STAGE_LABELS[s]}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* Search */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        bgcolor: '#F5F7FF', borderRadius: '10px',
        px: 1.5, py: 0.75, minWidth: 220, maxWidth: 320,
        border: '1px solid #E8EBF4',
        '&:focus-within': { borderColor: '#3F51B5', bgcolor: '#fff' },
        transition: 'border-color 0.15s, background 0.15s',
      }}>
        <SearchIcon sx={{ fontSize: 16, color: '#90A4AE', flexShrink: 0 }} />
        <InputBase
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search insights, HCPs…"
          sx={{ fontSize: '0.875rem', color: '#0D1729', flex: 1, '& input::placeholder': { color: '#90A4AE' } }}
          inputProps={{ 'aria-label': 'Search insights' }}
        />
      </Box>

      {/* View mode toggle */}
      <Box sx={{ display: 'flex', borderRadius: '8px', border: '1px solid #E8EBF4', overflow: 'hidden', flexShrink: 0 }}>
        <Tooltip title="List view">
          <IconButton onClick={() => onViewModeChange('list')} size="small" aria-label="List view"
            sx={{
              borderRadius: 0, px: 1.2, py: 0.8,
              bgcolor: viewMode === 'list' ? '#E8EAF6' : 'transparent',
              color: viewMode === 'list' ? '#3F51B5' : '#90A4AE',
              '&:hover': { bgcolor: '#E8EAF6', color: '#3F51B5' },
            }}>
            <ViewListIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Grid view">
          <IconButton onClick={() => onViewModeChange('grid')} size="small" aria-label="Grid view"
            sx={{
              borderRadius: 0, px: 1.2, py: 0.8,
              bgcolor: viewMode === 'grid' ? '#E8EAF6' : 'transparent',
              color: viewMode === 'grid' ? '#3F51B5' : '#90A4AE',
              '&:hover': { bgcolor: '#E8EAF6', color: '#3F51B5' },
            }}>
            <GridViewIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Presence avatars */}
      <PresenceAvatars users={onlineUsers} />

      {/* Notification bell — opens activity feed drawer */}
      <Tooltip title="Activity feed">
        <IconButton onClick={openActivityFeed} size="small" aria-label="Open activity feed" sx={{ color: '#607D8B' }}>
          <Badge badgeContent={unreadCount > 0 ? unreadCount : undefined} color="error" max={99}>
            <NotificationsNoneIcon sx={{ fontSize: 20 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* CTA */}
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onLogInsight}
        aria-label="Log new insight"
        sx={{
          bgcolor: '#1A237E', '&:hover': { bgcolor: '#0D1729' },
          borderRadius: '10px', px: 2, py: 1, fontWeight: 600,
          fontSize: '0.875rem', textTransform: 'none', whiteSpace: 'nowrap',
          flexShrink: 0, boxShadow: 'none',
        }}
      >
        Log Insight
      </Button>
    </Box>
  );
}
