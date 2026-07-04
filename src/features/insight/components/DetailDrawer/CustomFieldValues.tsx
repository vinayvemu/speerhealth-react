import { Box, Typography, Divider } from '@mui/material';
import type { CustomFieldValues as FieldValues } from '../../types/customFields';
import { useCustomFields } from '../../hooks/useCustomFields';

interface Props {
  values: FieldValues | Record<string, unknown> | null;
}

export function CustomFieldValues({ values }: Props) {
  const { fieldDefs, loading } = useCustomFields();

  if (loading || fieldDefs.length === 0 || !values) return null;

  // pg_graphql may return JSONB as a string — parse if needed
  let parsed: Record<string, unknown>;
  if (typeof values === 'string') {
    try { parsed = JSON.parse(values); } catch { return null; }
  } else {
    parsed = values as Record<string, unknown>;
  }

  const entries = fieldDefs.map((def) => {
    const raw = parsed[def.id];
    if (raw === null || raw === undefined || raw === '') return null;
    const display = def.type === 'date' && typeof raw === 'string'
      ? new Date(raw).toLocaleDateString()
      : String(raw);
    return { label: def.label, display };
  }).filter(Boolean) as Array<{ label: string; display: string }>;

  if (entries.length === 0) return null;

  return (
    <>
      <Divider sx={{ borderColor: '#EAECF5' }} />
      <Box>
        <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', display: 'block', mb: 1 }}>
          Custom Fields
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {entries.map(({ label, display }) => (
            <Box key={label} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, minWidth: 100, flexShrink: 0 }}>
                {label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                {display}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
}
