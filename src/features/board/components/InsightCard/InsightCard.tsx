import { useRef, useState, useCallback } from 'react';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import { Box, Typography, Chip, Tooltip, Paper, Menu, MenuItem } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MedicationIcon from '@mui/icons-material/Medication';
import type { Insight } from '@/shared/types/domain';
import { PRIORITY_COLORS, STAGES } from '@/shared/types/domain';
import { nextStage, prevStage } from '@/shared/types/domain';
import { formatDistanceToNow } from '@/features/board/utils/time';
import { useRealtime } from '@/features/realtime/RealtimeProvider';

const SWIPE_THRESHOLD = 80;
const MAX_DRAG = 120;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CAT_PALETTE: Record<string, { bg: string; text: string }> = {
  'Patient Journey':   { bg: '#EDE7F6', text: '#6A1B9A' },
  'Access':            { bg: '#E8F5E9', text: '#2E7D32' },
  'Efficacy':          { bg: '#E3F2FD', text: '#1565C0' },
  'Safety':            { bg: '#FFF3E0', text: '#E65100' },
  'Competitive Intel': { bg: '#FCE4EC', text: '#AD1457' },
  'Market Dynamics':   { bg: '#E8EAF6', text: '#283593' },
};

function getCatColors(name: string) {
  return CAT_PALETTE[name] ?? { bg: '#ECEFF1', text: '#455A64' };
}

function initials(name: string): string {
  return name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function avatarBg(name: string): string {
  const palette = ['#3F51B5', '#303F9F', '#00838F', '#558B2F', '#6A1B9A', '#C62828', '#0277BD'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return palette[h % palette.length];
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  insight: Insight;
  onSwipe: (direction: 'forward' | 'backward') => void;
  onClick: () => void;
  onMoveTo?: (stage: string) => void;
  view?: 'list' | 'grid';
  viewingUsers?: Array<{ userId: string; name: string }>;
  editingUser?: { userId: string; name: string } | null;
  isBeingSwiped?: boolean;
  isHighlighted?: boolean;
}

// ─── Grid card ───────────────────────────────────────────────────────────────

function GridCard({ insight, onClick, onMoveTo, editingUser, viewingUsers = [], isBeingSwiped = false, isHighlighted = false }: Omit<Props, 'onSwipe' | 'view'>) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    longPressTimer.current = setTimeout(() => {
      setMenuAnchor(e.currentTarget as HTMLElement);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuAnchor(e.currentTarget as HTMLElement);
  }, []);

  const otherStages = STAGES.filter((s) => s !== insight.stage);
  const p = PRIORITY_COLORS[insight.priority];
  const catColors = insight.category ? getCatColors(insight.category.name) : null;
  const tags = insight.tags ?? [];

  return (
    <>
    <Paper
      elevation={0}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
      sx={{
        borderLeft: `3px solid ${p.text}`,
        borderRadius: '10px',
        p: 2,
        cursor: 'pointer',
        bgcolor: isHighlighted ? '#FFFDE7' : '#fff',
        boxShadow: isBeingSwiped
          ? '0 0 0 2px #3F51B5'
          : isHighlighted
          ? '0 0 0 2px #FFC107'
          : '0 1px 4px rgba(13,23,41,0.07)',
        transition: 'box-shadow 0.14s, transform 0.14s, background-color 0.3s',
        animation: isHighlighted ? 'cardFlash 1.5s ease-out' : 'none',
        '@keyframes cardFlash': {
          '0%': { backgroundColor: '#FFF9C4' },
          '100%': { backgroundColor: '#fff' },
        },
        '&:hover': { boxShadow: '0 4px 18px rgba(63,81,181,0.14)', transform: 'translateY(-1px)' },
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Top row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box
          sx={{
            flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
            bgcolor: p.bg, border: `1.5px solid ${p.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 700, color: p.text }}>
            {insight.priority}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: '0.875rem', fontWeight: 500, color: '#0D1729',
            lineHeight: 1.4, flex: 1,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {insight.title}
        </Typography>
      </Box>

      {/* Realtime */}
      {editingUser && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#FFC107' }} />
          <Typography variant="caption" color="warning.main" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
            {editingUser.name} editing…
          </Typography>
        </Box>
      )}
      {viewingUsers.length > 0 && !editingUser && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4CAF50' }} />
          <Typography variant="caption" color="success.main" sx={{ fontSize: '0.7rem' }}>
            {viewingUsers[0].name} viewing
          </Typography>
        </Box>
      )}

      {/* HCP */}
      {insight.hcp && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 18, height: 18, borderRadius: '50%', bgcolor: avatarBg(insight.hcp.name),
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.45rem' }}>
              {initials(insight.hcp.name)}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.78rem', color: '#607D8B' }} noWrap>{insight.hcp.name}</Typography>
          {insight.hcp.specialty && (
            <Typography sx={{ fontSize: '0.75rem', color: '#90A4AE' }} noWrap>· {insight.hcp.specialty}</Typography>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 'auto' }}>
        {catColors && insight.category && (
          <Chip
            label={insight.category.name}
            size="small"
            sx={{ bgcolor: catColors.bg, color: catColors.text, fontSize: '0.68rem', fontWeight: 600, height: 20, '& .MuiChip-label': { px: 0.75 } }}
          />
        )}
        {tags.slice(0, 1).map((tag) => (
          <Chip key={tag.id} label={tag.name} size="small"
            sx={{ bgcolor: '#E8EAF6', color: '#3F51B5', fontSize: '0.68rem', height: 20, '& .MuiChip-label': { px: 0.75 } }}
          />
        ))}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.3, color: '#90A4AE' }}>
          <AccessTimeIcon sx={{ fontSize: 12 }} />
          <Typography sx={{ fontSize: '0.72rem', color: '#90A4AE' }}>{formatDistanceToNow(insight.createdAt)}</Typography>
        </Box>
      </Box>
    </Paper>
    {onMoveTo && (
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem disabled sx={{ fontSize: '0.75rem', color: '#90A4AE', py: 0.5 }}>Move to…</MenuItem>
        {otherStages.map((s) => (
          <MenuItem key={s} onClick={() => { setMenuAnchor(null); onMoveTo(s); }} sx={{ fontSize: '0.875rem' }}>
            {s}
          </MenuItem>
        ))}
      </Menu>
    )}
    </>
  );
}

// ─── List card (swipeable) ────────────────────────────────────────────────────

export function InsightCard({ insight, onSwipe, onClick, onMoveTo, view = 'list', viewingUsers = [], editingUser = null, isBeingSwiped = false, isHighlighted = false }: Props) {
  const { broadcastSwiping, broadcastStoppedSwiping } = useRealtime();
  const p = PRIORITY_COLORS[insight.priority];
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track pointer start to distinguish tap from drag on the inner Box
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const otherStages = STAGES.filter((s) => s !== insight.stage);

  const canGoForward = nextStage(insight.stage) !== null;
  const canGoBack = prevStage(insight.stage) !== null;

  const [{ x }, api] = useSpring(() => ({ x: 0, config: { tension: 320, friction: 32 } }));

  const bind = useDrag(
    ({ movement: [mx], last, cancel }) => {
      if (mx > 0 && !canGoForward) { api.start({ x: Math.min(mx * 0.12, 16) }); if (last) api.start({ x: 0 }); return; }
      if (mx < 0 && !canGoBack) { api.start({ x: Math.max(mx * 0.12, -16) }); if (last) api.start({ x: 0 }); return; }

      const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, mx));
      api.start({ x: clamped, immediate: !last });

      const dir = mx > 10 ? 'right' : mx < -10 ? 'left' : null;
      if (dir) broadcastSwiping(insight.id, dir, Math.abs(mx) / MAX_DRAG);

      if (last) {
        broadcastStoppedSwiping(insight.id);
        if (mx > SWIPE_THRESHOLD && canGoForward) { api.start({ x: 400 }); onSwipe('forward'); }
        else if (mx < -SWIPE_THRESHOLD && canGoBack) { api.start({ x: -400 }); onSwipe('backward'); }
        else { api.start({ x: 0 }); }
        cancel?.();
      }
    },
    { axis: 'x', filterTaps: true, threshold: 8 },
  );

  if (view === 'grid') {
    return <GridCard insight={insight} onClick={onClick} onMoveTo={onMoveTo} viewingUsers={viewingUsers} editingUser={editingUser} isBeingSwiped={isBeingSwiped} isHighlighted={isHighlighted} />;
  }

  // Handlers on the inner Box — unaffected by gesture system's native listeners on animated.div
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => setMenuAnchor(e.currentTarget as HTMLElement), 500);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    // Only treat as a tap if pointer barely moved (not a swipe/drag)
    if (dx < 8 && dy < 8) onClick();
  };
  const handlePointerLeave = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    pointerStart.current = null;
  };
  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); setMenuAnchor(e.currentTarget as HTMLElement); };
  const catColors = insight.category ? getCatColors(insight.category.name) : null;
  const tags = insight.tags ?? [];
  const hcpIni = insight.hcp ? initials(insight.hcp.name) : '';
  const hcpBg = insight.hcp ? avatarBg(insight.hcp.name) : '#607D8B';

  return (
    <>
    <animated.div
      {...bind()}
      style={{ x, touchAction: 'pan-y' }}
    >
      <Box
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={handleContextMenu}
        sx={{
          bgcolor: '#fff',
          borderRadius: '10px',
          mb: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 1.75, py: 1.125,
          borderLeft: `3px solid ${p.text}`,
          bgcolor: isHighlighted ? '#FFFDE7' : '#fff',
          boxShadow: isBeingSwiped
            ? '0 0 0 2px #3F51B5, 0 2px 8px rgba(63,81,181,0.15)'
            : isHighlighted
            ? '0 0 0 2px #FFC107'
            : '0 1px 3px rgba(13,23,41,0.06)',
          cursor: 'pointer',
          transition: 'box-shadow 0.14s, transform 0.14s, background-color 0.3s',
          animation: isBeingSwiped
            ? 'ibPulse 1.2s infinite'
            : isHighlighted
            ? 'cardFlash 1.5s ease-out'
            : 'none',
          '@keyframes ibPulse': {
            '0%, 100%': { boxShadow: '0 0 0 2px #3F51B5' },
            '50%': { boxShadow: '0 0 0 2px #9FA8DA' },
          },
          '@keyframes cardFlash': {
            '0%': { backgroundColor: '#FFF9C4' },
            '100%': { backgroundColor: '#fff' },
          },
          '&:hover': { boxShadow: '0 4px 18px rgba(63,81,181,0.13)', transform: 'translateY(-1px)' },
        }}
      >
        {/* Priority badge */}
        <Box sx={{
          flexShrink: 0, width: 34, height: 34, borderRadius: '50%',
          bgcolor: p.bg, border: `1.5px solid ${p.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 700, color: p.text, lineHeight: 1 }}>
            {insight.priority}
          </Typography>
        </Box>

        {/* Title + HCP */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {editingUser && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#FFC107' }} />
              <Typography variant="caption" color="warning.main" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                {editingUser.name} is editing…
              </Typography>
            </Box>
          )}
          {viewingUsers.length > 0 && !editingUser && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4CAF50' }} />
              <Typography variant="caption" color="success.main" sx={{ fontSize: '0.7rem' }}>
                {viewingUsers.map((u) => u.name).join(', ')} viewing
              </Typography>
            </Box>
          )}
          <Typography sx={{
            fontSize: '0.9375rem', fontWeight: 500, color: '#0D1729',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', mb: 0.35,
          }}>
            {insight.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>
            {insight.hcp && (
              <>
                <Box sx={{
                  width: 18, height: 18, borderRadius: '50%', bgcolor: hcpBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.45rem' }}>{hcpIni}</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.8125rem', color: '#607D8B' }} noWrap>{insight.hcp.name}</Typography>
                {insight.hcp.specialty && (
                  <Typography sx={{ fontSize: '0.8rem', color: '#90A4AE' }} noWrap>· {insight.hcp.specialty}</Typography>
                )}
              </>
            )}
            {insight.drugName && (
              <>
                {insight.hcp && <Typography sx={{ color: '#CFD8DC', fontSize: '0.75rem' }}>·</Typography>}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <MedicationIcon sx={{ fontSize: 13, color: '#3F51B5' }} />
                  <Typography sx={{ fontSize: '0.75rem', color: '#3F51B5', fontWeight: 500 }}>{insight.drugName}</Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* Right side */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {catColors && insight.category && (
            <Chip label={insight.category.name} size="small" sx={{
              bgcolor: catColors.bg, color: catColors.text,
              fontSize: '0.72rem', fontWeight: 600, height: 22, '& .MuiChip-label': { px: 1 },
            }} />
          )}
          {tags.slice(0, 2).map((tag) => (
            <Chip key={tag.id} label={tag.name} size="small" sx={{
              bgcolor: '#E8EAF6', color: '#3F51B5', fontSize: '0.72rem', height: 22, '& .MuiChip-label': { px: 1 },
            }} />
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#90A4AE' }}>
            <AccessTimeIcon sx={{ fontSize: 13 }} />
            <Typography sx={{ fontSize: '0.78rem', color: '#90A4AE', whiteSpace: 'nowrap' }}>
              {formatDistanceToNow(insight.createdAt)}
            </Typography>
          </Box>
          <Tooltip title="Open detail">
            <OpenInNewIcon
              sx={{ fontSize: 15, color: '#CFD8DC', '&:hover': { color: '#3F51B5' }, cursor: 'pointer' }}
            />
          </Tooltip>
        </Box>
      </Box>
    </animated.div>
    {onMoveTo && (
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem disabled sx={{ fontSize: '0.75rem', color: '#90A4AE', py: 0.5 }}>Move to…</MenuItem>
        {otherStages.map((s) => (
          <MenuItem key={s} onClick={() => { setMenuAnchor(null); onMoveTo(s); }} sx={{ fontSize: '0.875rem' }}>
            {s}
          </MenuItem>
        ))}
      </Menu>
    )}
    </>
  );
}
