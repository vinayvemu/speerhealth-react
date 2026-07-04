import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import BarChartIcon from '@mui/icons-material/BarChart';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LogoutIcon from '@mui/icons-material/Logout';
import type { Stage } from '@/shared/types/domain';
import { STAGES, STAGE_LABELS } from '@/shared/types/domain';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ─── Design tokens ────────────────────────────────────────────────────────────
const SIDEBAR_BG = '#1B2550';
const SIDEBAR_HOVER = 'rgba(255,255,255,0.07)';
const SIDEBAR_ACTIVE = 'rgba(255,255,255,0.13)';
const TEXT_DIM = 'rgba(255,255,255,0.55)';
const TEXT_BRIGHT = '#ffffff';

export const COLLAPSED_W = 64;
export const EXPANDED_W = 240;

export const STAGE_ICONS: Record<Stage, React.ReactNode> = {
  observation: <VisibilityIcon sx={{ fontSize: 18 }} />,
  insight:     <LightbulbIcon sx={{ fontSize: 18 }} />,
  actionable:  <FlashOnIcon sx={{ fontSize: 18 }} />,
  impact:      <TrackChangesIcon sx={{ fontSize: 18 }} />,
};

interface Props {
  expanded: boolean;
  onToggle: () => void;
  activeStage: Stage;
  onStageChange: (stage: Stage) => void;
  stageCounts: Record<Stage, number>;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  onClick: () => void;
  expanded: boolean;
}

function NavItem({ icon, label, active, count, onClick, expanded }: NavItemProps) {
  const inner = (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 0.85,
        mx: 1,
        borderRadius: '8px',
        cursor: 'pointer',
        bgcolor: active ? SIDEBAR_ACTIVE : 'transparent',
        color: active ? TEXT_BRIGHT : TEXT_DIM,
        justifyContent: expanded ? 'flex-start' : 'center',
        transition: 'background 0.15s, color 0.15s',
        '&:hover': { bgcolor: active ? SIDEBAR_ACTIVE : SIDEBAR_HOVER, color: TEXT_BRIGHT },
      }}
    >
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      {expanded && (
        <>
          <Typography sx={{
            flex: 1, fontSize: '0.875rem',
            fontWeight: active ? 600 : 400,
            color: 'inherit', lineHeight: 1,
          }}>
            {label}
          </Typography>
          {count !== undefined && (
            <Box sx={{
              minWidth: 22, height: 20, borderRadius: '10px',
              bgcolor: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0.75,
            }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: TEXT_BRIGHT, lineHeight: 1 }}>
                {count}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );

  if (!expanded) {
    return (
      <Tooltip title={count !== undefined ? `${label} (${count})` : label} placement="right">
        {inner}
      </Tooltip>
    );
  }
  return inner;
}

export function Sidebar({ expanded, onToggle, activeStage, onStageChange, stageCounts }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isAnalytics = location.pathname.startsWith('/analytics');

  const userInitials = user?.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'AL';

  const userName = user?.email?.split('@')[0] ?? 'User';

  return (
    <Box sx={{
      width: expanded ? EXPANDED_W : COLLAPSED_W,
      minWidth: expanded ? EXPANDED_W : COLLAPSED_W,
      bgcolor: SIDEBAR_BG,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      transition: 'width 0.22s ease, min-width 0.22s ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>

      {/* ── Logo ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: expanded ? 2 : 0, py: 2,
        justifyContent: expanded ? 'flex-start' : 'center',
        minHeight: 64, flexShrink: 0,
      }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: '10px',
          bgcolor: 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: '-0.5px' }}>IB</Typography>
        </Box>
        {expanded && (
          <Box>
            <Typography sx={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
              InsightBoard
            </Typography>
            <Typography sx={{ color: TEXT_DIM, fontSize: '0.7rem', lineHeight: 1 }}>
              Speer Health · Field Intel
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Nav ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {/* Pipeline section */}
        {expanded && (
          <Typography sx={{
            px: 2.5, mb: 0.75,
            fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_DIM,
          }}>
            Pipeline
          </Typography>
        )}

        {STAGES.map((stage) => (
          <NavItem
            key={stage}
            icon={STAGE_ICONS[stage]}
            label={STAGE_LABELS[stage]}
            active={!isAnalytics && activeStage === stage}
            count={stageCounts[stage]}
            expanded={expanded}
            onClick={() => { navigate('/'); onStageChange(stage); }}
          />
        ))}

        {/* Divider */}
        <Box sx={{ mx: 2, my: 1.5, height: '1px', bgcolor: 'rgba(255,255,255,0.08)' }} />

        {/* Analytics */}
        <NavItem
          icon={<BarChartIcon sx={{ fontSize: 18 }} />}
          label="Analytics"
          active={isAnalytics}
          expanded={expanded}
          onClick={() => navigate('/analytics')}
        />
      </Box>

      {/* ── User + collapse toggle ── */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', pt: 1, pb: 1.5, flexShrink: 0 }}>

        {/* User row — always flex-start so avatar+name sits at left edge */}
        <Box sx={{ px: 1, mb: 0.5 }}>
          <Box
            onClick={() => signOut()}
            role="button"
            aria-label="Sign out"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 1.25,
              px: 1,
              py: 0.875,
              borderRadius: '8px',
              cursor: 'pointer',
              '&:hover': { bgcolor: SIDEBAR_HOVER },
            }}
          >
            {/* Avatar */}
            <Tooltip
              title={expanded ? 'Sign out' : `${userName} · Sign out`}
              placement="right"
            >
              <Box sx={{
                width: 32, height: 32, borderRadius: '50%',
                bgcolor: '#3F51B5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', lineHeight: 1 }}>
                  {userInitials}
                </Typography>
              </Box>
            </Tooltip>

            {/* Name + role — only when expanded */}
            {expanded && (
              <>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{
                    color: TEXT_BRIGHT, fontSize: '0.8125rem',
                    fontWeight: 600, lineHeight: 1.25,
                  }} noWrap>
                    {userName}
                  </Typography>
                  <Typography sx={{ color: TEXT_DIM, fontSize: '0.7rem', lineHeight: 1 }}>
                    Field Rep
                  </Typography>
                </Box>
                <LogoutIcon sx={{ fontSize: 16, color: TEXT_DIM, flexShrink: 0 }} />
              </>
            )}
          </Box>
        </Box>

        {/* Collapse toggle */}
        <Box
          onClick={onToggle}
          role="button"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: expanded ? 'flex-end' : 'center',
            px: expanded ? 2 : 0,
            py: 0.5,
            cursor: 'pointer',
            color: TEXT_DIM,
            '&:hover': { color: TEXT_BRIGHT },
          }}
        >
          {expanded
            ? <ChevronLeftIcon sx={{ fontSize: 18 }} />
            : <ChevronRightIcon sx={{ fontSize: 18 }} />
          }
        </Box>
      </Box>
    </Box>
  );
}
