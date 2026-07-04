import { Box, Typography, Skeleton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import type { Stage } from '@/shared/types/domain';
import { STAGE_LABELS } from '@/shared/types/domain';

const STAGE_META: Record<Stage, { icon: React.ReactNode }> = {
  observation: { icon: <VisibilityIcon sx={{ fontSize: 15 }} /> },
  insight: { icon: <LightbulbIcon sx={{ fontSize: 15 }} /> },
  actionable: { icon: <FlashOnIcon sx={{ fontSize: 15 }} /> },
  impact: { icon: <TrackChangesIcon sx={{ fontSize: 15 }} /> },
};

const STAGES_ORDER: Stage[] = ['observation', 'insight', 'actionable', 'impact'];

interface Props {
  counts: Record<Stage, number>;
  activeStage: Stage;
  loading?: boolean;
  onStageChange?: (stage: Stage) => void;
}

export function StageSummary({ counts, activeStage, loading, onStageChange }: Props) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        bgcolor: 'rgba(63,81,181,0.10)',
        borderRadius: '12px',
        overflow: 'hidden',
        mb: 2.5,
      }}
    >
      {STAGES_ORDER.map((stage) => {
        const isActive = stage === activeStage;
        return (
          <Box
            key={stage}
            onClick={() => onStageChange?.(stage)}
            role={onStageChange ? 'button' : undefined}
            aria-label={`Switch to ${STAGE_LABELS[stage]} stage`}
            aria-pressed={isActive}
            sx={{
              bgcolor: isActive ? '#EEF2FF' : '#fff',
              borderTop: isActive ? '3px solid #3F51B5' : '3px solid transparent',
              p: '0.875rem 0.875rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              cursor: onStageChange ? 'pointer' : 'default',
              transition: 'background-color 0.15s, border-color 0.15s',
              '&:hover': onStageChange ? {
                bgcolor: isActive ? '#E8EAF6' : '#F8F9FF',
              } : {},
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: isActive ? '#3F51B5' : '#607D8B',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {STAGE_META[stage].icon}
              <Typography
                component="span"
                sx={{
                  fontSize: '0.6875rem', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'inherit',
                }}
              >
                {STAGE_LABELS[stage]}
              </Typography>
            </Box>
            {loading ? (
              <Skeleton width={32} height={36} />
            ) : (
              <Typography
                sx={{
                  fontFamily: '"Georgia", serif',
                  fontSize: '2rem',
                  lineHeight: 1,
                  fontWeight: 400,
                  color: isActive ? '#3F51B5' : '#0D1729',
                }}
              >
                {counts[stage]}
              </Typography>
            )}
            {isActive && (
              <Box sx={{ width: 20, height: 2, borderRadius: 1, bgcolor: '#3F51B5', mt: 0.25 }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
