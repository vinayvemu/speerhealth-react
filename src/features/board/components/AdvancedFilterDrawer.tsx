import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Typography, Button, MenuItem, Divider, Chip, CircularProgress } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useBoardFilters } from '../hooks/useBoardFilters';
import { PRIORITY_COLORS } from '@/shared/types/domain';
import type { Priority } from '@/shared/types/domain';
import { AppDrawer } from '@/shared/components/ui/AppDrawer';
import { PrimaryButton } from '@/shared/components/ui/PrimaryButton';
import { FormSelect, FormTextField, ITEM_SX } from '@/shared/components/ui/FormFields';
import { GET_CATEGORIES, GET_TAGS, GET_HCPS } from '../graphql/queries';

interface DraftFilters {
  categoryId: string | null;
  priorities: Priority[];
  dateFrom: string | null;
  dateTo: string | null;
  hcpId: string | null;
  tagIds: string[];
}

interface Props { open: boolean; onClose: () => void }

export function AdvancedFilterDrawer({ open, onClose }: Props) {
  const { filters, clearFilters, applyAdvancedFilters } = useBoardFilters();

  // Fetch reference data
  const { data: catData, loading: catLoading } = useQuery(GET_CATEGORIES, { fetchPolicy: 'cache-first' });
  const { data: tagData, loading: tagLoading } = useQuery(GET_TAGS, { fetchPolicy: 'cache-first' });
  const { data: hcpData, loading: hcpLoading } = useQuery(GET_HCPS, { fetchPolicy: 'cache-first' });

  const categories: Array<{ id: string; name: string }> =
    catData?.categoriesCollection?.edges?.map((e: { node: { id: string; name: string } }) => e.node) ?? [];
  const tags: Array<{ id: string; name: string }> =
    tagData?.tagsCollection?.edges?.map((e: { node: { id: string; name: string } }) => e.node) ?? [];
  const hcps: Array<{ id: string; name: string }> =
    hcpData?.hcpsCollection?.edges?.map((e: { node: { id: string; name: string } }) => e.node) ?? [];

  // Local draft — initialized from URL state each time drawer opens
  const [draft, setDraft] = useState<DraftFilters>({
    categoryId: filters.categoryId,
    priorities: filters.priorities,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    hcpId: filters.hcpId,
    tagIds: filters.tags,
  });

  useEffect(() => {
    if (open) {
      setDraft({
        categoryId: filters.categoryId,
        priorities: filters.priorities,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        hcpId: filters.hcpId,
        tagIds: filters.tags,
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

  const toggleTag = (tagId: string) => {
    setDraft((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const hasDraftActive =
    draft.categoryId !== null ||
    draft.priorities.length > 0 ||
    draft.dateFrom !== null ||
    draft.dateTo !== null ||
    draft.hcpId !== null ||
    draft.tagIds.length > 0;

  const handleApply = () => {
    applyAdvancedFilters(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft({ categoryId: null, priorities: [], dateFrom: null, dateTo: null, hcpId: null, tagIds: [] });
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
        {catLoading ? (
          <MenuItem disabled sx={ITEM_SX}><CircularProgress size={14} /></MenuItem>
        ) : categories.map((c) => (
          <MenuItem key={c.id} value={c.id} sx={ITEM_SX}>{c.name}</MenuItem>
        ))}
      </FormSelect>

      <Divider sx={{ borderColor: '#EAECF5' }} />

      {/* HCP filter */}
      <FormSelect
        value={draft.hcpId ?? ''}
        label="HCP"
        containerSx={{ width: '100%' }}
        onChange={(e) => setDraft((prev) => ({ ...prev, hcpId: (e.target.value as string) || null }))}
      >
        <MenuItem value="" sx={ITEM_SX}>All HCPs</MenuItem>
        {hcpLoading ? (
          <MenuItem disabled sx={ITEM_SX}><CircularProgress size={14} /></MenuItem>
        ) : hcps.map((h) => (
          <MenuItem key={h.id} value={h.id} sx={ITEM_SX}>{h.name}</MenuItem>
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

      {/* Tags */}
      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', mb: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Tags
        </Typography>
        {tagLoading ? (
          <CircularProgress size={16} />
        ) : (
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {tags.map((tag) => {
              const active = draft.tagIds.includes(tag.id);
              return (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  onClick={() => toggleTag(tag.id)}
                  sx={{
                    fontSize: '0.72rem', cursor: 'pointer',
                    bgcolor: active ? '#3F51B5' : '#E8EAF6',
                    color: active ? '#fff' : '#3F51B5',
                    border: active ? '1px solid #3F51B5' : '1px solid transparent',
                    '&:hover': { bgcolor: active ? '#303F9F' : '#C5CAE9' },
                  }}
                />
              );
            })}
            {tags.length === 0 && (
              <Typography sx={{ fontSize: '0.78rem', color: '#9CA3AF' }}>No tags found</Typography>
            )}
          </Box>
        )}
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
