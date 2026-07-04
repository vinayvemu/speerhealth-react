import {
  Box, Typography, Chip, Button, Menu, MenuItem, Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useState } from 'react';
import { useMutation } from '@apollo/client';
import type { Insight, Stage } from '@/shared/types/domain';
import { STAGES, STAGE_LABELS, PRIORITY_COLORS } from '@/shared/types/domain';
import { PriorityBadge } from '@/shared/components/ui/PriorityBadge';
import { ActivityTimeline } from '../ActivityTimeline/ActivityTimeline';
import { UPDATE_INSIGHT, LOG_ACTIVITY } from '@/features/board/graphql/mutations';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/shared/components/ui/Toast';
import { echoSuppressor } from '@/lib/supabase/echoSuppression';
import { formatDistanceToNow } from '@/features/board/utils/time';
import { AppDrawer } from '@/shared/components/ui/AppDrawer';

interface Props {
  insight: Insight;
  open: boolean;
  onClose: () => void;
  onEdit: (insight: Insight) => void;
  onMoved?: () => void;
}

export function DetailDrawer({ insight, open, onClose, onEdit, onMoved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stageMenuAnchor, setStageMenuAnchor] = useState<HTMLElement | null>(null);
  const [updateInsight] = useMutation(UPDATE_INSIGHT);
  const [logActivity] = useMutation(LOG_ACTIVITY);

  const handleMoveStage = async (newStage: Stage) => {
    setStageMenuAnchor(null);
    if (newStage === insight.stage) return;
    echoSuppressor.tag(insight.id);
    try {
      await updateInsight({
        variables: { filter: { id: { eq: insight.id } }, set: { stage: newStage } },
      });
      logActivity({
        variables: {
          objects: [{ insightId: insight.id, userId: user?.id, action: 'updated', fieldName: 'stage', oldValue: insight.stage, newValue: newStage }],
        },
      }).catch(() => { });
      toast(`Moved to ${STAGE_LABELS[newStage]}`, 'success');
      onMoved?.();
      onClose();
    } catch {
      toast('Failed to move insight', 'error');
    }
  };

  const priorityColors = PRIORITY_COLORS[insight.priority];

  const headerExtra = (
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
      <PriorityBadge priority={insight.priority} />
      <Chip
        label={STAGE_LABELS[insight.stage]}
        size="small"
        sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#E8EAF6', color: '#3F51B5' }}
      />
    </Box>
  );

  const footer = (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Button
        fullWidth
        variant="outlined"
        startIcon={<EditIcon />}
        onClick={() => onEdit(insight)}
        sx={{ borderColor: '#3F51B5', color: '#3F51B5', textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
        aria-label="Edit insight"
      >
        Edit
      </Button>
      <Button
        fullWidth
        variant="contained"
        startIcon={<SwapHorizIcon />}
        onClick={(e) => setStageMenuAnchor(e.currentTarget)}
        sx={{ bgcolor: '#3F51B5', textTransform: 'none', borderRadius: '8px', fontWeight: 600, boxShadow: 'none' }}
        aria-label="Move to different stage"
      >
        Move
      </Button>
      <Menu
        anchorEl={stageMenuAnchor}
        open={Boolean(stageMenuAnchor)}
        onClose={() => setStageMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {STAGES.filter((s) => s !== insight.stage).map((s) => (
          <MenuItem key={s} onClick={() => handleMoveStage(s)}>
            {STAGE_LABELS[s]}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={insight.title}
      headerExtra={headerExtra}
      footer={footer}
      width={{ xs: '100vw', sm: '80vw', md: '60vw', lg: '50vw' }}
    >
      {/* Description */}
      {insight.description && (
        <Box>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
            Description
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
            {insight.description}
          </Typography>
        </Box>
      )}

      <Divider sx={{ borderColor: '#EAECF5' }} />

      {/* HCP Info */}
      {insight.hcp && (
        <Box>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
            Healthcare Provider
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1A237E', mt: 0.5 }}>
            {insight.hcp.name}
          </Typography>
          {insight.hcp.specialty && (
            <Typography variant="caption" color="text.secondary">
              {insight.hcp.specialty}
              {insight.hcp.institution ? ` · ${insight.hcp.institution}` : ''}
            </Typography>
          )}
        </Box>
      )}

      {/* Category + Drug + Priority */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {insight.category && (
          <Box>
            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', display: 'block' }}>Category</Typography>
            <Chip label={insight.category.name} size="small" sx={{ bgcolor: '#E8EAF6', color: '#3F51B5', fontSize: '0.72rem', mt: 0.5 }} />
          </Box>
        )}
        {insight.drugName && (
          <Box>
            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', display: 'block' }}>Drug</Typography>
            <Chip label={insight.drugName} size="small" sx={{ bgcolor: '#F3E5F5', color: '#7B1FA2', fontSize: '0.72rem', mt: 0.5 }} />
          </Box>
        )}
        <Box>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', display: 'block' }}>Priority</Typography>
          <Chip
            label={insight.priority}
            size="small"
            sx={{ bgcolor: priorityColors.bg, color: priorityColors.text, fontWeight: 700, fontSize: '0.72rem', mt: 0.5 }}
          />
        </Box>
      </Box>

      {/* Tags */}
      {(insight.tags ?? []).length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', display: 'block', mb: 0.75 }}>Tags</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {(insight.tags ?? []).map((tag) => (
              <Chip key={tag.id} label={tag.name} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />
            ))}
          </Box>
        </Box>
      )}

      {/* Timestamps */}
      <Typography variant="caption" color="text.disabled">
        Created {formatDistanceToNow(insight.createdAt)}
        {insight.updatedAt !== insight.createdAt && ` · Updated ${formatDistanceToNow(insight.updatedAt)}`}
      </Typography>

      <Divider sx={{ borderColor: '#EAECF5' }} />

      {/* Activity Timeline */}
      <Box>
        <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', display: 'block', mb: 1 }}>
          Activity
        </Typography>
        <ActivityTimeline insightId={insight.id} />
      </Box>
    </AppDrawer>
  );
}
