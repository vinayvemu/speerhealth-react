// ─── Broadcast signal events (ephemeral, not persisted) ────────────────────

export type BoardBroadcastEvent =
  | { event: 'viewing'; cardId: string; userId: string; name: string }
  | { event: 'stopped_viewing'; cardId: string; userId: string }
  | { event: 'editing'; cardId: string; userId: string; name: string }
  | { event: 'stopped_editing'; cardId: string; userId: string }
  | { event: 'swiping'; cardId: string; userId: string; direction: 'left' | 'right'; progress: number }
  | { event: 'stopped_swiping'; cardId: string; userId: string };

// ─── Presence ───────────────────────────────────────────────────────────────

export interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl?: string;
  onlineAt: string;
}

// ─── Card real-time state (derived from broadcast signals) ──────────────────

export interface CardRealtimeState {
  viewingUsers: Array<{ userId: string; name: string }>;
  editingUser: { userId: string; name: string } | null;
  isBeingSwiped: boolean;
}
