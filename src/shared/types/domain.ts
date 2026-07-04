// ─── Core domain types ─────────────────────────────────────────────────────

export type Stage = 'observation' | 'insight' | 'actionable' | 'impact';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export const STAGES: Stage[] = ['observation', 'insight', 'actionable', 'impact'];

export const STAGE_LABELS: Record<Stage, string> = {
  observation: 'Observation',
  insight: 'Insight',
  actionable: 'Actionable',
  impact: 'Impact',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  P1: 'P1 — Critical',
  P2: 'P2 — Important',
  P3: 'P3 — Moderate',
  P4: 'P4 — Low',
};

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string }> = {
  P1: { bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
  P2: { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  P3: { bg: '#FFFDE7', text: '#F57F17', border: '#FFF176' },
  P4: { bg: '#F5F5F5', text: '#616161', border: '#E0E0E0' },
};

export const CATEGORIES = [
  'Efficacy',
  'Safety',
  'Access',
  'Competitive Intel',
  'Patient Journey',
  'Market Dynamics',
] as const;

export type Category = (typeof CATEGORIES)[number];

// Stage navigation helpers
export function nextStage(stage: Stage): Stage | null {
  const idx = STAGES.indexOf(stage);
  return idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
}

export function prevStage(stage: Stage): Stage | null {
  const idx = STAGES.indexOf(stage);
  return idx > 0 ? STAGES[idx - 1] : null;
}

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

// ─── Insight model ──────────────────────────────────────────────────────────

export interface HCP {
  nodeId: string;
  id: string;
  name: string;
  specialty: string | null;
  institution: string | null;
}

export interface Tag {
  id: string;
  name: string;
}

export interface CategoryRecord {
  nodeId: string;
  id: string;
  name: string;
  color: string | null;
}

export interface Insight {
  nodeId: string;
  id: string;
  title: string;
  description: string | null;
  stage: Stage;
  priority: Priority;
  columnOrder: number | null;
  drugName: string | null;
  customFields: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  hcp: HCP | null;
  category: CategoryRecord | null;
  tags: Tag[];
  createdBy: string;
}

export interface InsightActivity {
  nodeId: string;
  id: string;
  insightId: string;
  userId: string;
  action: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user?: { fullName: string | null; avatarUrl: string | null };
}

export interface OnlineUser {
  userId: string;
  name: string;
  avatarUrl?: string;
}
