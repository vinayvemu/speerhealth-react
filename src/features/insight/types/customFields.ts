// ─── Custom field type system ─────────────────────────────────────────────────

export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

/** Discriminated union for field definitions keyed by type */
export type CustomFieldDef =
  | { id: string; label: string; type: 'text' }
  | { id: string; label: string; type: 'number' }
  | { id: string; label: string; type: 'date' }
  | { id: string; label: string; type: 'select'; options: string[] };

/** Map from field-id → typed value (unknown allows the JSONB round-trip) */
export type CustomFieldValues = Record<string, string | number | null>;

/** Typed accessor — returns the correct value type based on the field definition */
export function getFieldValue<T extends CustomFieldDef>(
  def: T,
  values: CustomFieldValues,
): T extends { type: 'number' } ? number | null : string | null {
  const raw = values[def.id] ?? null;
  if (def.type === 'number') {
    const n = raw !== null ? Number(raw) : null;
    return (Number.isFinite(n) ? n : null) as T extends { type: 'number' } ? number | null : string | null;
  }
  return (raw !== null ? String(raw) : null) as T extends { type: 'number' } ? number | null : string | null;
}

/** Validate a raw value against a definition; returns an error message or null */
export function validateFieldValue(def: CustomFieldDef, raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null; // optional
  if (def.type === 'number') {
    if (isNaN(Number(raw))) return `${def.label} must be a number`;
  }
  if (def.type === 'date') {
    if (isNaN(Date.parse(String(raw)))) return `${def.label} must be a valid date`;
  }
  if (def.type === 'select' && typeof raw === 'string') {
    if (!def.options.includes(raw)) return `${def.label} must be one of: ${def.options.join(', ')}`;
  }
  return null;
}

/** Shape stored in user_preferences.customFieldDefinitions (JSON array) */
export type StoredCustomFieldDefs = CustomFieldDef[];
