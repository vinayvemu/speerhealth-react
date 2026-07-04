import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextStage, prevStage } from '@/shared/types/domain';
import type { Stage } from '@/shared/types/domain';

// Test the optimistic update logic in isolation
describe('optimistic swipe state machine', () => {
  type OptimisticStatus = 'idle' | 'pending' | 'reverting';

  interface OptimisticState {
    status: OptimisticStatus;
    insightId: string | null;
    fromStage: Stage | null;
    toStage: Stage | null;
  }

  function createOptimisticState(): OptimisticState {
    return { status: 'idle', insightId: null, fromStage: null, toStage: null };
  }

  function startMove(state: OptimisticState, insightId: string, from: Stage, direction: 'forward' | 'backward'): OptimisticState {
    const to = direction === 'forward' ? nextStage(from) : prevStage(from);
    if (!to) return state; // boundary — no change
    return { status: 'pending', insightId, fromStage: from, toStage: to };
  }

  function onSuccess(_state: OptimisticState): OptimisticState {
    return createOptimisticState(); // back to idle
  }

  function onFailure(state: OptimisticState): OptimisticState {
    return { ...state, status: 'reverting' };
  }

  function afterRevert(_state: OptimisticState): OptimisticState {
    return createOptimisticState();
  }

  let state: OptimisticState;

  beforeEach(() => { state = createOptimisticState(); });

  it('starts idle', () => {
    expect(state.status).toBe('idle');
  });

  it('transitions to pending on swipe forward', () => {
    state = startMove(state, 'abc', 'observation', 'forward');
    expect(state.status).toBe('pending');
    expect(state.toStage).toBe('insight');
    expect(state.fromStage).toBe('observation');
  });

  it('transitions to pending on swipe backward', () => {
    state = startMove(state, 'abc', 'insight', 'backward');
    expect(state.status).toBe('pending');
    expect(state.toStage).toBe('observation');
  });

  it('stays idle when swiping at forward boundary (impact)', () => {
    state = startMove(state, 'abc', 'impact', 'forward');
    expect(state.status).toBe('idle'); // no-op, already at end
  });

  it('stays idle when swiping at backward boundary (observation)', () => {
    state = startMove(state, 'abc', 'observation', 'backward');
    expect(state.status).toBe('idle');
  });

  it('returns to idle on success', () => {
    state = startMove(state, 'abc', 'observation', 'forward');
    state = onSuccess(state);
    expect(state.status).toBe('idle');
    expect(state.insightId).toBeNull();
  });

  it('transitions to reverting on failure', () => {
    state = startMove(state, 'abc', 'observation', 'forward');
    state = onFailure(state);
    expect(state.status).toBe('reverting');
    expect(state.fromStage).toBe('observation'); // still knows where to revert to
  });

  it('returns to idle after revert completes', () => {
    state = startMove(state, 'abc', 'observation', 'forward');
    state = onFailure(state);
    state = afterRevert(state);
    expect(state.status).toBe('idle');
  });

  it('handles full success cycle', () => {
    const mock = vi.fn().mockResolvedValue({ ok: true });
    state = startMove(state, 'id-1', 'insight', 'forward');
    expect(state.toStage).toBe('actionable');
    mock(state.insightId, state.toStage);
    state = onSuccess(state);
    expect(state.status).toBe('idle');
    expect(mock).toHaveBeenCalledWith('id-1', 'actionable');
  });
});
