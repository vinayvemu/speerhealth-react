import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Chip, Divider,
} from '@mui/material';
import MergeIcon from '@mui/icons-material/MergeType';
import type { ConflictState } from '../../hooks/useConflictResolution';

interface Props {
  conflict: ConflictState;
  onKeepMine: () => void;
  onKeepTheirs: () => void;
  onMerge: () => void;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  return String(v);
}

export function ConflictModal({ conflict, onKeepMine, onKeepTheirs, onMerge }: Props) {
  return (
    <Dialog open maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: '#B71C1C', fontWeight: 700 }}>
        ⚠ Conflict Detected
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Someone else saved this insight while you were editing. Compare and choose how to resolve.
        </Typography>

        {/* Field-by-field diff — only differing fields */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 2 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">Field</Typography>
          <Typography variant="caption" fontWeight={700} color="#1565C0">Yours</Typography>
          <Typography variant="caption" fontWeight={700} color="#6A1B9A">Theirs</Typography>
        </Box>
        <Divider sx={{ mb: 1 }} />

        {conflict.diffs.map(({ field, mine, theirs }) => (
          <Box key={field as string} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 1.5, alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'capitalize', pt: 0.5 }}>
              {field as string}
            </Typography>
            <Chip
              label={formatValue(mine)}
              size="small"
              sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontSize: '0.7rem', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } }}
            />
            <Chip
              label={formatValue(theirs)}
              size="small"
              sx={{ bgcolor: '#F3E5F5', color: '#6A1B9A', fontSize: '0.7rem', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } }}
            />
          </Box>
        ))}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button variant="outlined" color="primary" onClick={onKeepMine}>
          Keep Mine
        </Button>
        <Button variant="outlined" color="secondary" onClick={onKeepTheirs}>
          Keep Theirs
        </Button>
        <Button variant="contained" startIcon={<MergeIcon />} onClick={onMerge} sx={{ bgcolor: '#3F51B5' }}>
          Merge
        </Button>
      </DialogActions>
    </Dialog>
  );
}
