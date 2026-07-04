import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Box, CircularProgress, Typography, Button, Chip } from '@mui/material';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TopBar } from '@/shared/components/AppLayout/TopBar';
import { StageSummary } from './StageSummary/StageSummary';
import { FilterBar } from './FilterBar/FilterBar';
import { InsightCard } from './InsightCard/InsightCard';
import { OverviewMode } from './OverviewMode/OverviewMode';
import { useBoardFilters } from '../hooks/useBoardFilters';
import type { BoardFilters } from '../hooks/useBoardFilters';
import { useStageMove } from '../hooks/useStageMove';
import { LIST_INSIGHTS, GET_STAGE_COUNTS } from '../graphql/queries';
import type { Insight } from '@/shared/types/domain';
import type { Stage } from '@/shared/types/domain';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/shared/components/ui/Toast';
import { ComponentErrorBoundary } from '@/shared/components/ErrorBoundary/ComponentErrorBoundary';
import { useRealtime } from '@/features/realtime/RealtimeProvider';
import { DetailDrawer } from '@/features/insight/components/DetailDrawer/DetailDrawer';
import { InsightForm } from '@/features/insight/components/InsightForm/InsightForm';
import { AdvancedFilterDrawer } from './AdvancedFilterDrawer';
import { GET_CATEGORIES, GET_HCPS, GET_TAGS } from '../graphql/queries';
import { useDragReorder } from '../hooks/useDragReorder';
import { PRIORITY_COLORS } from '@/shared/types/domain';

type ViewMode = 'list' | 'grid';

// ─── Sortable drag row (reorder mode only) ────────────────────────────────────

function SortableRow({ insight }: { insight: Insight }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: insight.id });
  const p = PRIORITY_COLORS[insight.priority];
  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        bgcolor: isDragging ? '#EEF0FF' : '#fff',
        borderRadius: '10px', mb: 0.75,
        px: 1.5, py: 1,
        borderLeft: `3px solid ${p.text}`,
        boxShadow: isDragging
          ? '0 8px 24px rgba(63,81,181,0.18)'
          : '0 1px 3px rgba(13,23,41,0.06)',
        opacity: isDragging ? 0.45 : 1,
        transition: 'box-shadow 0.12s, opacity 0.12s',
        cursor: 'default',
      }}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{ display: 'flex', alignItems: 'center', color: '#CFD8DC', cursor: 'grab', flexShrink: 0, '&:active': { cursor: 'grabbing' } }}
      >
        <DragIndicatorIcon sx={{ fontSize: 20 }} />
      </Box>

      {/* Priority badge */}
      <Box sx={{
        flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
        bgcolor: p.bg, border: `1.5px solid ${p.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 700, color: p.text, lineHeight: 1 }}>
          {insight.priority}
        </Typography>
      </Box>

      {/* Title */}
      <Typography sx={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: '#0D1729', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {insight.title}
      </Typography>

      {/* HCP */}
      {insight.hcp && (
        <Typography sx={{ fontSize: '0.78rem', color: '#607D8B', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {insight.hcp.name}
        </Typography>
      )}
    </Box>
  );
}

function DragOverlayRow({ insight }: { insight: Insight }) {
  const p = PRIORITY_COLORS[insight.priority];
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.25,
      bgcolor: '#fff', borderRadius: '10px',
      px: 1.5, py: 1,
      borderLeft: `3px solid ${p.text}`,
      boxShadow: '0 12px 32px rgba(63,81,181,0.22)',
      cursor: 'grabbing',
    }}>
      <DragIndicatorIcon sx={{ fontSize: 20, color: '#9FA8DA' }} />
      <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: p.bg, border: `1.5px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 700, color: p.text, lineHeight: 1 }}>{insight.priority}</Typography>
      </Box>
      <Typography sx={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: '#0D1729', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {insight.title}
      </Typography>
    </Box>
  );
}

// ─── Active filter chips strip ────────────────────────────────────────────────

function ActiveFilterChips({ filters, onClear }: {
  filters: BoardFilters;
  onClear: (key: string, value?: string) => void;
}) {
  const { data: catData } = useQuery(GET_CATEGORIES, { fetchPolicy: 'cache-first', skip: !filters.categoryId });
  const { data: hcpData } = useQuery(GET_HCPS, { fetchPolicy: 'cache-first', skip: !filters.hcpId });
  const { data: tagData } = useQuery(GET_TAGS, { fetchPolicy: 'cache-first', skip: filters.tags.length === 0 });

  const catName = catData?.categoriesCollection?.edges?.find((e: { node: { id: string; name: string } }) => e.node.id === filters.categoryId)?.node.name ?? filters.categoryId;
  const hcpName = hcpData?.hcpsCollection?.edges?.find((e: { node: { id: string; name: string } }) => e.node.id === filters.hcpId)?.node.name ?? filters.hcpId;
  const tagMap = new Map<string, string>(
    tagData?.tagsCollection?.edges?.map((e: { node: { id: string; name: string } }) => [e.node.id, e.node.name]) ?? []
  );

  const chips: Array<{ label: string; key: string; value?: string }> = [];
  if (filters.categoryId) chips.push({ label: `Category: ${catName}`, key: 'cat' });
  if (filters.hcpId) chips.push({ label: `HCP: ${hcpName}`, key: 'hcp' });
  filters.priorities.forEach((p) => chips.push({ label: p, key: 'p', value: p }));
  filters.tags.forEach((id) => chips.push({ label: `Tag: ${tagMap.get(id) ?? id}`, key: 'tag', value: id }));
  if (filters.dateFrom) chips.push({ label: `From: ${filters.dateFrom}`, key: 'from' });
  if (filters.dateTo) chips.push({ label: `To: ${filters.dateTo}`, key: 'to' });

  if (chips.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', px: 3, pb: 1 }}>
      {chips.map((chip) => (
        <Chip
          key={`${chip.key}-${chip.value ?? ''}`}
          label={chip.label}
          size="small"
          deleteIcon={<CloseIcon sx={{ fontSize: '12px !important' }} />}
          onDelete={() => onClear(chip.key, chip.value)}
          sx={{ bgcolor: '#EEF2FF', color: '#4338CA', fontSize: '0.72rem', fontWeight: 500, height: 22, '& .MuiChip-deleteIcon': { color: '#6366F1' } }}
        />
      ))}
    </Box>
  );
}

interface InsightListData {
  insightsCollection: {
    edges: Array<{ node: Insight }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
    totalCount: number;
  };
}

interface CountData {
  observation: { totalCount: number };
  insight: { totalCount: number };
  actionable: { totalCount: number };
  impact: { totalCount: number };
}

export function BoardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getCardState, highlightedInsightId } = useRealtime();
  const { filters, setStage, setSearch, togglePriority, toggleSort, clearFilters, clearFilter, buildGraphQLFilter, hasActiveFilters } = useBoardFilters();

  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [reorderMode, setReorderMode] = useState(false);
  const [activeReorderId, setActiveReorderId] = useState<string | null>(null);
  const [localInsights, setLocalInsights] = useState<Insight[]>([]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const listParentRef = useRef<HTMLDivElement>(null);

  const graphqlFilter = buildGraphQLFilter();

  const orderBy = filters.sort === 'recency'
    ? [{ createdAt: 'DescNullsLast' }]
    : [{ columnOrder: 'AscNullsLast' }, { createdAt: 'DescNullsLast' }];

  const { data, loading, error, fetchMore, refetch } = useQuery<InsightListData>(LIST_INSIGHTS, {
    variables: { filter: graphqlFilter, first: 30, orderBy },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  const { data: countsData, loading: countsLoading, refetch: refetchCounts } = useQuery<CountData>(GET_STAGE_COUNTS, {
    fetchPolicy: 'cache-and-network',
  });

  const refetchAll = () => {
    refetch();
    refetchCounts();
  };

  const counts: Record<Stage, number> = {
    observation: countsData?.observation?.totalCount ?? 0,
    insight: countsData?.insight?.totalCount ?? 0,
    actionable: countsData?.actionable?.totalCount ?? 0,
    impact: countsData?.impact?.totalCount ?? 0,
  };

  const allInsights = useMemo(
    () => data?.insightsCollection?.edges?.map((e) => e.node) ?? [],
    [data],
  );
  // Tag filter applied client-side — InsightsFilter doesn't support insightTagsCollection
  const insights = useMemo(
    () => filters.tags.length > 0
      ? allInsights.filter((ins) => filters.tags.every((tagId) => ins.tags?.some((t) => t.id === tagId)))
      : allInsights,
    [allInsights, filters.tags],
  );
  const hasNextPage = data?.insightsCollection?.pageInfo?.hasNextPage ?? false;
  const activeCount = counts[filters.stage];

  // Keep localInsights in sync with server data when not actively reordering
  useEffect(() => {
    if (!reorderMode) setLocalInsights(insights);
  }, [insights, reorderMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const { handleDragEnd } = useDragReorder(localInsights, setLocalInsights);

  const loadMore = useCallback(() => {
    if (!hasNextPage || loading) return;
    fetchMore({ variables: { cursor: data?.insightsCollection?.pageInfo?.endCursor } });
  }, [hasNextPage, loading, fetchMore, data]);

  // Virtualizer for list view only
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? insights.length + 1 : insights.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 72,
    overscan: 8,
    onChange: (instance) => {
      const lastItem = instance.getVirtualItems().at(-1);
      if (lastItem && lastItem.index >= insights.length - 1 && hasNextPage && !loading) {
        loadMore();
      }
    },
  });

  const { move, moveToStage } = useStageMove({
    userId: user?.id ?? '',
    onSuccess: (_, toStage) => { toast(`Moved to ${toStage}`, 'success'); refetchAll(); },
    onError: (msg) => toast(msg, 'error'),
  });

  const insightsByStage = insights.reduce<Partial<Record<Stage, Insight[]>>>((acc, ins) => {
    if (!acc[ins.stage]) acc[ins.stage] = [];
    acc[ins.stage]!.push(ins);
    return acc;
  }, {});

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 8, gap: 2 }}>
        <Typography color="error">Failed to load insights</Typography>
        <Button variant="outlined" onClick={() => refetch()}>Retry</Button>
      </Box>
    );
  }

  const emptyState = hasActiveFilters ? (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      pt: 10, pb: 4, gap: 2,
    }}>
      <Box sx={{
        width: 64, height: 64, borderRadius: '16px',
        bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <SearchOffIcon sx={{ fontSize: 32, color: '#6366F1' }} />
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
          No results match your filters
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mx: 'auto' }}>
          Try adjusting or clearing your filters to see more insights
        </Typography>
      </Box>
      {/* Show active filter chips */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 }}>
        {filters.priorities.map((p) => (
          <Chip key={p} label={p} size="small" sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 600, fontSize: '0.72rem' }} />
        ))}
        {filters.categoryId && (
          <Chip label={`Category: ${filters.categoryId}`} size="small" sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontSize: '0.72rem' }} />
        )}
        {filters.dateFrom && (
          <Chip label={`From: ${filters.dateFrom}`} size="small" sx={{ bgcolor: '#FFF7ED', color: '#C2410C', fontSize: '0.72rem' }} />
        )}
        {filters.dateTo && (
          <Chip label={`To: ${filters.dateTo}`} size="small" sx={{ bgcolor: '#FFF7ED', color: '#C2410C', fontSize: '0.72rem' }} />
        )}
        {filters.search && (
          <Chip label={`"${filters.search}"`} size="small" sx={{ bgcolor: '#F8FAFC', color: '#475569', fontSize: '0.72rem' }} />
        )}
      </Box>
      <Button
        variant="contained"
        startIcon={<FilterListOffIcon />}
        onClick={clearFilters}
        sx={{
          bgcolor: '#4F46E5', textTransform: 'none', borderRadius: '8px',
          fontWeight: 600, fontSize: '0.875rem', boxShadow: 'none',
          '&:hover': { bgcolor: '#4338CA', boxShadow: 'none' },
        }}
      >
        Clear all filters
      </Button>
    </Box>
  ) : (
    <Box sx={{ textAlign: 'center', pt: 8, color: 'text.secondary' }}>
      <Typography variant="body2">No insights in this stage</Typography>
      <Button sx={{ mt: 1 }} onClick={() => setShowCreateForm(true)}>+ Log insight</Button>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar
        activeStage={filters.stage}
        activeCount={activeCount}
        search={filters.search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onLogInsight={() => setShowCreateForm(true)}
      />

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Shared header (stage summary + filter) — always visible, not scrolled */}
        <Box sx={{ px: 3, pt: 2.5 }}>
          <StageSummary counts={counts} activeStage={filters.stage} loading={countsLoading} onStageChange={setStage} />
          <FilterBar
            filters={filters}
            onPriorityToggle={togglePriority}
            onClearAll={clearFilters}
            hasActiveFilters={hasActiveFilters}
            onOpenAdvanced={() => setShowAdvancedFilter(true)}
            onSortToggle={toggleSort}
            showReorder={viewMode === 'list'}
            reorderMode={reorderMode}
            onReorderToggle={() => {
              if (reorderMode) refetch(); // fetch fresh columnOrder from server on exit
              setReorderMode((v) => !v);
            }}
          />
        </Box>
        {hasActiveFilters && (
          <ActiveFilterChips filters={filters} onClear={clearFilter} />
        )}

        {/* Scrollable content */}
        {viewMode === 'overview' ? (
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 3 }}>
            <OverviewMode
              insightsByStage={insightsByStage}
              onStageSelect={(stage) => { setStage(stage); setViewMode('list'); }}
            />
          </Box>
        ) : viewMode === 'grid' ? (
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 3 }}>
            {loading && insights.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
                <CircularProgress sx={{ color: '#3F51B5' }} />
              </Box>
            ) : insights.length === 0 ? emptyState : (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 1.5,
              }}>
                {insights.map((insight) => {
                  const cardState = getCardState(insight.id);
                  return (
                    <ComponentErrorBoundary key={insight.id}>
                      <InsightCard
                        insight={insight}
                        view="grid"
                        onSwipe={(dir) => move(insight, dir)}
                        onMoveTo={(stage) => moveToStage(insight, stage as Stage)}
                        onClick={() => setSelectedInsight(insight)}
                        viewingUsers={cardState.viewingUsers}
                        editingUser={cardState.editingUser}
                        isBeingSwiped={cardState.isBeingSwiped}
                        isHighlighted={highlightedInsightId === insight.id}
                      />
                    </ComponentErrorBoundary>
                  );
                })}
                {hasNextPage && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, gridColumn: '1 / -1' }}>
                    <Button onClick={loadMore} disabled={loading} variant="outlined" size="small">
                      {loading ? <CircularProgress size={16} /> : 'Load more'}
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ) : reorderMode ? (
          /* Reorder mode — dnd-kit sortable list (no virtualisation) */
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 3 }}>
            {localInsights.length === 0 ? emptyState : (
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragStart={({ active }: DragStartEvent) => setActiveReorderId(active.id as string)}
                onDragEnd={(e) => { handleDragEnd(e); setActiveReorderId(null); }}
                onDragCancel={() => setActiveReorderId(null)}
              >
                <SortableContext items={localInsights.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {localInsights.map((insight) => (
                    <SortableRow key={insight.id} insight={insight} />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeReorderId ? (
                    <DragOverlayRow insight={localInsights.find((i) => i.id === activeReorderId)!} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </Box>
        ) : (
          /* List view — virtualised */
          <Box ref={listParentRef} sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 3 }}>
            {loading && insights.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
                <CircularProgress sx={{ color: '#3F51B5' }} />
              </Box>
            ) : insights.length === 0 ? emptyState : (
              <Box style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const isLoader = virtualRow.index >= insights.length;
                  const insight = insights[virtualRow.index];
                  return (
                    <Box
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: 'absolute', top: 0, left: 0, width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {isLoader ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} sx={{ color: '#3F51B5' }} />
                        </Box>
                      ) : (
                        <ComponentErrorBoundary>
                          {(() => {
                            const cardState = getCardState(insight.id);
                            return (
                              <InsightCard
                                insight={insight}
                                view="list"
                                onSwipe={(dir) => move(insight, dir)}
                                onMoveTo={(stage) => moveToStage(insight, stage as Stage)}
                                onClick={() => setSelectedInsight(insight)}
                                viewingUsers={cardState.viewingUsers}
                                editingUser={cardState.editingUser}
                                isBeingSwiped={cardState.isBeingSwiped}
                                isHighlighted={highlightedInsightId === insight.id}
                              />
                            );
                          })()}
                        </ComponentErrorBoundary>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {selectedInsight && (
        <DetailDrawer
          insight={selectedInsight}
          open
          onClose={() => setSelectedInsight(null)}
          onEdit={(ins) => { setSelectedInsight(null); setEditingInsight(ins); }}
          onMoved={refetchAll}
        />
      )}
      {(showCreateForm || editingInsight) && (
        <InsightForm
          insight={editingInsight ?? undefined}
          open
          onClose={() => { setShowCreateForm(false); setEditingInsight(null); }}
          onSaved={() => { setShowCreateForm(false); setEditingInsight(null); refetchAll(); }}
        />
      )}
      {showAdvancedFilter && (
        <AdvancedFilterDrawer open onClose={() => setShowAdvancedFilter(false)} />
      )}
    </Box>
  );
}
