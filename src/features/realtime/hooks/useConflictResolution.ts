import { useState, useCallback } from 'react';
import type { Insight } from '@/shared/types/domain';

export interface FieldDiff {
  field: keyof Insight;
  mine: unknown;
  theirs: unknown;
}

export interface ConflictState {
  insightId: string;
  mine: Partial<Insight>;
  theirs: Insight;
  diffs: FieldDiff[];
}

const TRACKED_FIELDS: (keyof Insight)[] = ['title', 'description', 'priority', 'stage', 'categoryId' as keyof Insight];

export function useConflictResolution() {
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  const detectConflict = useCallback((
    mine: Partial<Insight>,
    theirs: Insight,
    loadedUpdatedAt: string,
  ): boolean => {
    // Stale write: server has a newer version than what we loaded
    if (new Date(theirs.updatedAt) > new Date(loadedUpdatedAt)) {
      const diffs = TRACKED_FIELDS.reduce<FieldDiff[]>((acc, field) => {
        if (mine[field] !== undefined && mine[field] !== theirs[field]) {
          acc.push({ field, mine: mine[field], theirs: theirs[field] });
        }
        return acc;
      }, []);

      if (diffs.length > 0) {
        setConflict({ insightId: theirs.id, mine, theirs, diffs });
        return true;
      }
    }
    return false;
  }, []);

  const resolveKeepMine = useCallback((): Partial<Insight> | null => {
    if (!conflict) return null;
    const resolved = { ...conflict.mine };
    setConflict(null);
    return resolved;
  }, [conflict]);

  const resolveKeepTheirs = useCallback((): Partial<Insight> | null => {
    if (!conflict) return null;
    setConflict(null);
    return null; // caller discards their changes
  }, [conflict]);

  const resolveMerge = useCallback((): Partial<Insight> | null => {
    if (!conflict) return null;
    // Auto-merge: take mine for fields I changed, theirs for fields I didn't touch
    const merged: Partial<Insight> = { ...conflict.theirs };
    conflict.diffs.forEach(({ field, mine }) => {
      (merged as Record<string, unknown>)[field as string] = mine;
    });
    setConflict(null);
    return merged;
  }, [conflict]);

  const dismissConflict = useCallback(() => setConflict(null), []);

  return { conflict, detectConflict, resolveKeepMine, resolveKeepTheirs, resolveMerge, dismissConflict };
}
