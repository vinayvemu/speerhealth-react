import { Chip } from '@mui/material';
import type { Priority } from '@/shared/types/domain';
import { PRIORITY_COLORS } from '@/shared/types/domain';

interface Props {
  priority: Priority;
  size?: 'small' | 'medium';
}

export function PriorityBadge({ priority, size = 'small' }: Props) {
  const colors = PRIORITY_COLORS[priority];
  return (
    <Chip
      label={priority}
      size={size}
      aria-label={`Priority ${priority}`}
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.68rem' : '0.75rem',
        height: size === 'small' ? 20 : 24,
      }}
    />
  );
}
