import { useState, useEffect } from 'react';
import { Box, Typography, Button, MenuItem, Divider } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useBoardFilters } from '../hooks/useBoardFilters';
import { CATEGORIES, PRIORITY_COLORS } from '@/shared/types/domain';
import type { Priority } from '@/shared/types/domain';
import { AppDrawer } from '@/shared/components/ui/AppDrawer';
import { PrimaryButton } from '@/shared/components/ui/PrimaryButton';
import { FormSelect, FormTextField, ITEM_SX } from '@/shared/components/ui/FormFields';

interface DraftFilters {
  categoryId: string | null;
  priorities: Priority[];
  dateFrom: string | null;
  dateTo: string | null;
}

interface Props { open: boolean; onClose: () => void }

export function AdvancedFilterDrawer({ open, onClose }: Props) {
  const { filters, clearFilters, applyAdvancedFilters } = useBoardFilters();

  // Local draft — initialized from URL state each time drawer opens
  const [draft, setDraft] = useState<DraftFilters>({
    categoryId: filters.categoryId,
    priorities: filters.priorities,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  useEffect(() => {
    if (open) {
      setDraft({
        categoryId: filters.categoryId,
        priorities: filters.priorities,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePriority = (p: Priority) => {
    setDraft((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(p)
        ? prev.priorities.filter((x) => x !== p)
        : [...prev.priorities, p],
    }));
  };

  const hasDraftActive =
    draft.categoryId !== null ||
    draft.priorities.length > 0 ||
    draft.dateFrom !== null ||
    draft.dateTo !== null;

  const handleApply = () => {
    applyAdvancedFilters(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft({ categoryId: null, priorities: [], dateFrom: null, dateTo: null });
    clearFilters();
    onClose();
  };

  const footer = (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      {hasDraftActive && (
        <Button
          variant="outlined"
          onClick={handleClear}
          sx={{
            flex: 1, fontSize: '0.8125rem', fontWeight: 600, textTransform: 'none',
            borderRadius: '8px', borderColor: '#E5E7EB', color: '#6B7280',
            '&:hover': { borderColor: '#9CA3AF', bgcolor: 'transparent' },
          }}
        >
          Clear all
        </Button>
      )}
      <PrimaryButton onClick={handleApply} sx={{ flex: 2 }}>
        Apply Filters
      </PrimaryButton>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title="Filters"
      subtitle="Narrow down insights by category, priority, date"
      headerIcon={<TuneIcon sx={{ fontSize: 16, color: '#6B7280' }} />}
      footer={footer}
    >
      {/* Category */}
      <FormSelect
        value={draft.categoryId ?? ''}
        label="Category"
        containerSx={{ width: '100%' }}
        onChange={(e) => setDraft((prev) => ({ ...prev, categoryId: (e.target.value as string) || null }))}
      >
        <MenuItem value="" sx={ITEM_SX}>All categories</MenuItem>
        {CATEGORIES.map((c) => (
          <MenuItem key={c} value={c} sx={ITEM_SX}>{c}</MenuItem>
        ))}
      </FormSelect>

      <Divider sx={{ borderColor: '#EAECF5' }} />

      {/* Priority */}
      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', mb: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Priority
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(['P1', 'P2', 'P3', 'P4'] as const).map((p) => {
            const col = PRIORITY_COLORS[p];
            const active = draft.priorities.includes(p);
            return (
              <Box
                key={p}
                onClick={() => togglePriority(p)}
                sx={{
                  px: 1.5, py: 0.5, borderRadius: '6px', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 600,
                  border: `1px solid ${active ? col.border : '#E5E7EB'}`,
                  bgcolor: active ? col.bg : '#fff',
                  color: active ? col.text : '#6B7280',
                  transition: 'all 0.12s',
                  '&:hover': { borderColor: col.border, bgcolor: col.bg, color: col.text },
                }}
              >
                {p}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#EAECF5' }} />

      {/* Date range */}
      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', mb: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Date Range
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#6B7280', mb: 0.5, fontWeight: 500 }}>From</Typography>
            <FormTextField
              type="date"
              fullWidth
              value={draft.dateFrom ?? ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value || null }))}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#6B7280', mb: 0.5, fontWeight: 500 }}>To</Typography>
            <FormTextField
              type="date"
              fullWidth
              value={draft.dateTo ?? ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value || null }))}
            />
          </Box>
        </Box>
      </Box>
    </AppDrawer>
  );
}
