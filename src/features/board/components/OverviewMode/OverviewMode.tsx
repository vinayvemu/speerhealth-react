import { Box, Typography, Paper, Chip } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Insight, Stage } from '@/shared/types/domain';
import { STAGES, STAGE_LABELS, PRIORITY_COLORS } from '@/shared/types/domain';

const MINI_CARD_MAX = 3;

interface Props {
  insightsByStage: Partial<Record<Stage, Insight[]>>;
  onStageSelect: (stage: Stage) => void;
}

function MiniCard({ insight }: { insight: Insight }) {
  const colors = PRIORITY_COLORS[insight.priority];
  return (
    <Box
      sx={{
        minWidth: 130,
        maxWidth: 130,
        border: `2px solid ${colors.border}`,
        borderRadius: 1.5,
        p: 1,
        bgcolor: '#fff',
        flexShrink: 0,
      }}
    >
      <Box sx={{ width: '100%', height: 3, borderRadius: 1, bgcolor: colors.bg, mb: 0.5 }} />
      <Typography
        variant="caption"
        fontWeight={600}
        color="#1A237E"
        sx={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.3,
          fontSize: '0.7rem',
        }}
      >
        {insight.title}
      </Typography>
    </Box>
  );
}

export function OverviewMode({ insightsByStage, onStageSelect }: Props) {
  return (
    <Box sx={{ overflowY: 'auto', flex: 1, p: 1.5 }}>
      {STAGES.map((stage) => {
        const stageInsights = insightsByStage[stage] ?? [];
        const visible = stageInsights.slice(0, MINI_CARD_MAX);
        const remaining = stageInsights.length - MINI_CARD_MAX;

        return (
          <Paper
            key={stage}
            elevation={0}
            sx={{ mb: 1.5, border: '1px solid #E3E7FF', borderRadius: 2, overflow: 'hidden' }}
          >
            {/* Stage header */}
            <Box
              sx={{
                px: 2, py: 1.2, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', bgcolor: '#F5F7FF',
                borderBottom: '1px solid #E3E7FF', cursor: 'pointer',
              }}
              onClick={() => onStageSelect(stage)}
              role="button"
              aria-label={`Go to ${STAGE_LABELS[stage]} stage`}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} color="#1A237E">
                  {STAGE_LABELS[stage]}
                </Typography>
                <Chip
                  label={stageInsights.length}
                  size="small"
                  sx={{ height: 18, fontSize: '0.68rem', bgcolor: '#E8EAF6', color: '#3F51B5' }}
                />
              </Box>
              <ChevronRightIcon sx={{ fontSize: 18, color: '#607D8B' }} />
            </Box>

            {/* Horizontal mini-card row */}
            <Box sx={{ p: 1.5 }}>
              {stageInsights.length === 0 ? (
                <Typography variant="caption" color="text.disabled">No insights</Typography>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
                  {visible.map((insight) => (
                    <MiniCard key={insight.id} insight={insight} />
                  ))}
                  {remaining > 0 && (
                    <Box
                      sx={{
                        minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#3F51B5', flexShrink: 0,
                      }}
                      onClick={() => onStageSelect(stage)}
                      role="button"
                      aria-label={`View ${remaining} more in ${STAGE_LABELS[stage]}`}
                    >
                      <Typography variant="caption" fontWeight={700}>+{remaining} more</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
