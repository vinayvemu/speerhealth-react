import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
import type { Stage, Priority } from '@/shared/types/domain';
import { STAGES } from '@/shared/types/domain';

interface InsightFilter {
  stage?: { eq: string };
  isArchived?: { eq: boolean };
  or?: Array<{ title?: { ilike: string }; description?: { ilike: string } }>;
  priority?: { in: string[] };
  categoryId?: { eq: string };
  hcpId?: { eq: string };
  createdAt?: { gte?: string; lte?: string };
}

export interface BoardFilters {
  stage: Stage;
  search: string;
  priorities: Priority[];
  categoryId: string | null;
  hcpId: string | null;
  tags: string[];
  dateFrom: string | null;
  dateTo: string | null;
  sort: 'default' | 'recency';
}

export function useBoardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: BoardFilters = {
    stage: (STAGES.includes(searchParams.get('stage') as Stage)
      ? searchParams.get('stage') as Stage
      : 'observation'),
    search: searchParams.get('q') ?? '',
    priorities: (searchParams.getAll('p') as Priority[]),
    categoryId: searchParams.get('cat') ?? null,
    hcpId: searchParams.get('hcp') ?? null,
    tags: searchParams.getAll('tag'),
    dateFrom: searchParams.get('from') ?? null,
    dateTo: searchParams.get('to') ?? null,
    sort: searchParams.get('sort') === 'recency' ? 'recency' : 'default',
  };

  const setStage = useCallback((stage: Stage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('stage', stage);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSearch = useCallback((q: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set('q', q); else next.delete('q');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const togglePriority = useCallback((p: Priority) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const current = next.getAll('p') as Priority[];
      next.delete('p');
      if (current.includes(p)) {
        current.filter((x) => x !== p).forEach((x) => next.append('p', x));
      } else {
        [...current, p].forEach((x) => next.append('p', x));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setFilter = useCallback(<K extends keyof Omit<BoardFilters, 'stage' | 'search' | 'priorities'>>(
    key: K,
    value: BoardFilters[K],
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const paramKey = key === 'categoryId' ? 'cat' : key === 'hcpId' ? 'hcp' : key === 'dateFrom' ? 'from' : key === 'dateTo' ? 'to' : key;
      if (Array.isArray(value)) {
        next.delete(paramKey);
        (value as string[]).forEach((v) => next.append(paramKey, v));
      } else if (value === null || value === '') {
        next.delete(paramKey);
      } else {
        next.set(paramKey, value as string);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const toggleSort = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (next.get('sort') === 'recency') next.delete('sort');
      else next.set('sort', 'recency');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({ stage: filters.stage }, { replace: true });
  }, [setSearchParams, filters.stage]);

  // Clear a single filter param (with optional value for multi-value params like 'p', 'tag')
  const clearFilter = useCallback((paramKey: string, value?: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value !== undefined) {
        // Multi-value param: remove only the specific value
        const remaining = next.getAll(paramKey).filter((v) => v !== value);
        next.delete(paramKey);
        remaining.forEach((v) => next.append(paramKey, v));
      } else {
        next.delete(paramKey);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Commits advanced filter values all at once (called by AdvancedFilterDrawer on Apply)
  const applyAdvancedFilters = useCallback((values: {
    categoryId: string | null;
    priorities: Priority[];
    dateFrom: string | null;
    dateTo: string | null;
    hcpId?: string | null;
    tagIds?: string[];
  }) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (values.categoryId) next.set('cat', values.categoryId); else next.delete('cat');
      next.delete('p');
      values.priorities.forEach((p) => next.append('p', p));
      if (values.dateFrom) next.set('from', values.dateFrom); else next.delete('from');
      if (values.dateTo) next.set('to', values.dateTo); else next.delete('to');
      if (values.hcpId) next.set('hcp', values.hcpId); else next.delete('hcp');
      next.delete('tag');
      (values.tagIds ?? []).forEach((id) => next.append('tag', id));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Build GraphQL filter object from URL state
  const buildGraphQLFilter = useCallback(() => {
    const filter: InsightFilter = {
      stage: { eq: filters.stage },
      isArchived: { eq: false },
    };
    if (filters.search) {
      filter.or = [
        { title: { ilike: `%${filters.search}%` } },
        { description: { ilike: `%${filters.search}%` } },
      ];
    }
    if (filters.priorities.length > 0) {
      filter.priority = { in: filters.priorities };
    }
    if (filters.categoryId) {
      filter.categoryId = { eq: filters.categoryId };
    }
    if (filters.hcpId) {
      filter.hcpId = { eq: filters.hcpId };
    }
    // Note: tag filtering is applied client-side (insightTagsCollection not in InsightsFilter)
    if (filters.dateFrom) {
      filter.createdAt = { ...filter.createdAt, gte: filters.dateFrom };
    }
    if (filters.dateTo) {
      filter.createdAt = { ...filter.createdAt, lte: filters.dateTo };
    }
    return filter;
  }, [filters]);

  const hasActiveFilters = filters.search !== '' ||
    filters.priorities.length > 0 ||
    filters.categoryId !== null ||
    filters.hcpId !== null ||
    filters.tags.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

  return { filters, setStage, setSearch, togglePriority, toggleSort, setFilter, clearFilters, clearFilter, applyAdvancedFilters, buildGraphQLFilter, hasActiveFilters };
}
