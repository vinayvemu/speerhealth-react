import { useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, IconButton,
  CircularProgress, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import type { CustomFieldDef, CustomFieldValues, CustomFieldType } from '../../types/customFields';
import { validateFieldValue } from '../../types/customFields';
import { useCustomFields } from '../../hooks/useCustomFields';
import { FormTextField } from '@/shared/components/ui/FormFields';

interface Props {
  values: CustomFieldValues;
  onChange: (values: CustomFieldValues) => void;
}

// ─── Add Field Modal ──────────────────────────────────────────────────────────

interface ModalState {
  label: string;
  type: CustomFieldType;
  optionsInput: string;   // comma-separated for select type
}

const EMPTY_MODAL: ModalState = { label: '', type: 'text', optionsInput: '' };

function AddFieldModal({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (def: CustomFieldDef) => Promise<void>;
}) {
  const [form, setForm] = useState<ModalState>(EMPTY_MODAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setForm(EMPTY_MODAL); setError(''); };

  const handleClose = () => { reset(); onClose(); };

  const handleAdd = async () => {
    if (!form.label.trim()) { setError('Label is required'); return; }
    if (form.type === 'select' && !form.optionsInput.trim()) {
      setError('At least one option is required for Select type');
      return;
    }
    const options = form.optionsInput.split(',').map((s) => s.trim()).filter(Boolean);

    const def: CustomFieldDef = form.type === 'select'
      ? { id: crypto.randomUUID(), label: form.label.trim(), type: 'select', options }
      : { id: crypto.randomUUID(), label: form.label.trim(), type: form.type };

    setSaving(true);
    try {
      await onAdd(def);
      reset();
      onClose();
    } catch {
      setError('Failed to save field definition');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Add Custom Field</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <TextField
          label="Field Label"
          size="small"
          value={form.label}
          onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
          fullWidth
          autoFocus
          error={Boolean(error && !form.label)}
          helperText={error && !form.label ? error : ''}
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as CustomFieldType }))}
          >
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="number">Number</MenuItem>
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="select">Single Select</MenuItem>
          </Select>
        </FormControl>
        {form.type === 'select' && (
          <TextField
            label="Options (comma separated)"
            size="small"
            value={form.optionsInput}
            onChange={(e) => setForm((p) => ({ ...p, optionsInput: e.target.value }))}
            fullWidth
            placeholder="Option A, Option B, Option C"
            error={Boolean(error && form.type === 'select' && !form.optionsInput)}
            helperText={error && form.type === 'select' && !form.optionsInput ? error : ''}
          />
        )}
        {error && form.label && <Typography color="error" sx={{ fontSize: '0.75rem' }}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} size="small">Cancel</Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleAdd}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : null}
          sx={{ bgcolor: '#3F51B5', textTransform: 'none', fontWeight: 600 }}
        >
          Add Field
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Field input renderer ─────────────────────────────────────────────────────

function FieldInput({ def, value, onChange }: {
  def: CustomFieldDef;
  value: string | number | null;
  onChange: (v: string | number | null) => void;
}) {
  const error = validateFieldValue(def, value);

  if (def.type === 'select') {
    return (
      <FormControl size="small" fullWidth error={Boolean(error)}>
        <InputLabel sx={{ fontSize: '0.8125rem' }}>{def.label}</InputLabel>
        <Select
          label={def.label}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value || null)}
          sx={{ fontSize: '0.8125rem' }}
        >
          <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>None</MenuItem>
          {def.options.map((opt) => (
            <MenuItem key={opt} value={opt} sx={{ fontSize: '0.8125rem' }}>{opt}</MenuItem>
          ))}
        </Select>
        {error && <Typography sx={{ fontSize: '0.7rem', color: 'error.main', mt: 0.25 }}>{error}</Typography>}
      </FormControl>
    );
  }

  return (
    <FormTextField
      label={def.label}
      type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        if (def.type === 'number') onChange(v === '' ? null : Number(v));
        else onChange(v || null);
      }}
      error={Boolean(error)}
      helperText={error ?? undefined}
      fullWidth
      slotProps={def.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
    />
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function CustomFieldsSection({ values, onChange }: Props) {
  const { fieldDefs, loading, addField, removeField } = useCustomFields();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#9CA3AF' }}>
        <CircularProgress size={14} />
        <Typography sx={{ fontSize: '0.78rem' }}>Loading custom fields…</Typography>
      </Box>
    );
  }

  return (
    <>
      {fieldDefs.length > 0 && (
        <>
          <Divider sx={{ borderColor: '#EAECF5' }} />
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
              Custom Fields
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {fieldDefs.map((def) => (
                <Box key={def.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <FieldInput
                      def={def}
                      value={(values[def.id] as string | number | null) ?? null}
                      onChange={(v) => onChange({ ...values, [def.id]: v })}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => removeField(def.id)}
                    sx={{ mt: 0.25, color: '#D1D5DB', '&:hover': { color: '#EF4444' } }}
                    aria-label={`Remove ${def.label} field`}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* Type chips hint */}
      {fieldDefs.length === 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {(['Text', 'Number', 'Date', 'Select'] as const).map((t) => (
            <Chip key={t} label={t} size="small"
              sx={{ fontSize: '0.68rem', height: 18, bgcolor: '#F3F4F6', color: '#6B7280' }} />
          ))}
        </Box>
      )}

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setShowModal(true)}
        sx={{
          textTransform: 'none', fontSize: '0.78rem', color: '#3F51B5',
          fontWeight: 600, p: 0, justifyContent: 'flex-start',
          '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
        }}
        disableRipple
      >
        Add Field
      </Button>

      <AddFieldModal open={showModal} onClose={() => setShowModal(false)} onAdd={addField} />
    </>
  );
}
