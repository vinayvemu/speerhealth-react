import { Box, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import type { Priority } from '@/shared/types/domain';
import { PRIORITY_COLORS } from '@/shared/types/domain';
import type { BoardFilters } from '../../hooks/useBoardFilters';

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];

const PRIORITY_DOT: Record<Priority, string> = {
  P1: '#F44336',
  P2: '#F57C00',
  P3: '#F9A825',
  P4: '#90A4AE',
};

interface Props {
  filters: BoardFilters;
  onPriorityToggle: (p: Priority) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  onOpenAdvanced: () => void;
}

function PriorityPill({ priority, active, onClick }: { priority: Priority; active: boolean; onClick: () => void }) {
  const colors = PRIORITY_COLORS[priority];
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label={`Filter by ${priority}`}
      aria-pressed={active}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5,
        px: 1.25, height: 30, borderRadius: '15px',
        border: active ? `1.5px solid ${colors.text}` : '1.5px solid #E8EBF4',
        bgcolor: active ? colors.bg : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.12s',
        '&:hover': { borderColor: colors.text, bgcolor: colors.bg },
      }}
    >
      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: PRIORITY_DOT[priority], flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: active ? 700 : 500, color: active ? colors.text : '#455A64', lineHeight: 1 }}>
        {priority}
      </Typography>
    </Box>
  );
}

export function FilterBar({ filters, onPriorityToggle, onClearAll, hasActiveFilters, onOpenAdvanced }: Props) {
  const allActive = filters.priorities.length === 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 2,
        flexWrap: 'wrap',
      }}
    >
      {/* Priority label */}
      <Typography sx={{ fontSize: '0.8125rem', color: '#607D8B', fontWeight: 500, mr: 0.5, flexShrink: 0 }}>
        Priority
      </Typography>

      {/* All pill */}
      <Box
        component="button"
        onClick={onClearAll}
        aria-label="Show all priorities"
        aria-pressed={allActive}
        sx={{
          display: 'inline-flex', alignItems: 'center',
          px: 1.5, height: 30, borderRadius: '15px',
          border: allActive ? '1.5px solid #3F51B5' : '1.5px solid #E8EBF4',
          bgcolor: allActive ? '#E8EAF6' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.12s',
          '&:hover': { borderColor: '#3F51B5', bgcolor: '#E8EAF6' },
        }}
      >
        <Typography sx={{ fontSize: '0.8rem', fontWeight: allActive ? 700 : 500, color: allActive ? '#3F51B5' : '#455A64', lineHeight: 1 }}>
          All
        </Typography>
      </Box>

      {PRIORITIES.map((p) => (
        <PriorityPill
          key={p}
          priority={p}
          active={filters.priorities.includes(p)}
          onClick={() => onPriorityToggle(p)}
        />
      ))}

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Filter button */}
      <Box
        component="button"
        onClick={onOpenAdvanced}
        aria-label="Open advanced filters"
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          px: 1.5, height: 30, borderRadius: '8px',
          border: '1.5px solid #E8EBF4',
          bgcolor: hasActiveFilters ? '#E8EAF6' : 'transparent',
          cursor: 'pointer', color: hasActiveFilters ? '#3F51B5' : '#607D8B',
          transition: 'all 0.12s',
          '&:hover': { borderColor: '#3F51B5', color: '#3F51B5' },
        }}
      >
        <FilterListIcon sx={{ fontSize: 15 }} />
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'inherit', lineHeight: 1 }}>Filter</Typography>
      </Box>

      {/* Recency sort */}
      <Box
        component="button"
        aria-label="Sort by recency"
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          px: 1.5, height: 30, borderRadius: '8px',
          border: '1.5px solid #E8EBF4', bgcolor: 'transparent',
          cursor: 'pointer', color: '#607D8B',
          '&:hover': { borderColor: '#3F51B5', color: '#3F51B5' },
        }}
      >
        <TrendingUpIcon sx={{ fontSize: 15 }} />
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'inherit', lineHeight: 1 }}>Recency</Typography>
      </Box>
    </Box>
  );
}
