import { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Collapse, Button, Divider, Alert,
} from '@mui/material';
import MedicationIcon from '@mui/icons-material/Medication';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  fetchDrugLabel, fetchAdverseEvents,
  type DrugLabelData, type AdverseEvent, type FetchState,
} from '../../services/openFDAService';

// ─── Sub-section helpers ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.4 }}>
      {children}
    </Typography>
  );
}

// ─── Label section ────────────────────────────────────────────────────────────

function LabelSection({ state }: { state: FetchState<DrugLabelData | null> }) {
  if (state.status === 'loading') {
    return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={14} sx={{ color: '#7B1FA2' }} /><Typography sx={{ fontSize: '0.78rem', color: '#9C4DCC' }}>Loading label…</Typography></Box>;
  }
  if (state.status === 'error') {
    return <Alert severity="warning" sx={{ py: 0.25, fontSize: '0.75rem' }}>{state.message}</Alert>;
  }
  if (state.status === 'empty' || (state.status === 'ok' && !state.data)) {
    return <Typography sx={{ fontSize: '0.78rem', color: '#9CA3AF', fontStyle: 'italic' }}>No FDA label found for this drug.</Typography>;
  }
  if (state.status !== 'ok' || !state.data) return null;

  const { genericName, manufacturer, indication, boxedWarning } = state.data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Boxed Warning — styled distinctly */}
      {boxedWarning && (
        <Box sx={{
          border: '2px solid #DC2626',
          borderRadius: '6px',
          p: 1,
          bgcolor: '#FEF2F2',
          display: 'flex',
          gap: 0.75,
        }}>
          <WarningAmberIcon sx={{ fontSize: 16, color: '#DC2626', flexShrink: 0, mt: 0.1 }} />
          <Box>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Boxed Warning
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#7F1D1D', lineHeight: 1.5, mt: 0.25, whiteSpace: 'pre-line' }}>
              {boxedWarning}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Indication */}
      {indication && (
        <Box>
          <SectionLabel>Indication</SectionLabel>
          <Typography sx={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {indication}
          </Typography>
        </Box>
      )}

      {/* Meta row */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {genericName && (
          <Box>
            <SectionLabel>Generic</SectionLabel>
            <Typography sx={{ fontSize: '0.75rem', color: '#4B5563' }}>{genericName}</Typography>
          </Box>
        )}
        {manufacturer && (
          <Box>
            <SectionLabel>Manufacturer</SectionLabel>
            <Typography sx={{ fontSize: '0.75rem', color: '#4B5563' }}>{manufacturer}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── Adverse events section ───────────────────────────────────────────────────

function EventsSection({ state }: { state: FetchState<AdverseEvent[]> }) {
  if (state.status === 'loading') {
    return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={14} sx={{ color: '#D97706' }} /><Typography sx={{ fontSize: '0.78rem', color: '#B45309' }}>Loading adverse events…</Typography></Box>;
  }
  if (state.status === 'error') {
    return <Alert severity="warning" sx={{ py: 0.25, fontSize: '0.75rem' }}>{state.message}</Alert>;
  }
  if (state.status === 'empty' || (state.status === 'ok' && state.data.length === 0)) {
    return <Typography sx={{ fontSize: '0.78rem', color: '#9CA3AF', fontStyle: 'italic' }}>No reported adverse events found.</Typography>;
  }
  if (state.status !== 'ok') return null;

  return (
    <Box>
      <SectionLabel>Top 5 Adverse Reactions (FDA Reports)</SectionLabel>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
        {state.data.map((evt) => (
          <Chip
            key={evt.term}
            label={`${evt.term} · ${evt.count.toLocaleString()}`}
            size="small"
            sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontSize: '0.65rem', height: 20, '& .MuiChip-label': { px: 0.75 } }}
          />
        ))}
      </Box>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  drugName: string;
}

export function DrugContext({ drugName }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [labelState, setLabelState] = useState<FetchState<DrugLabelData | null>>({ status: 'idle' });
  const [eventsState, setEventsState] = useState<FetchState<AdverseEvent[]>>({ status: 'idle' });

  // Fetch independently when expanded for the first time
  useEffect(() => {
    if (!expanded) return;
    if (labelState.status !== 'idle') return; // already fetched or loading

    // Label
    setLabelState({ status: 'loading' });
    fetchDrugLabel(drugName)
      .then((data) => setLabelState(data ? { status: 'ok', data } : { status: 'empty' }))
      .catch((e: unknown) => setLabelState({ status: 'error', message: e instanceof Error ? e.message : 'FDA label unavailable' }));

    // Adverse events — independent
    setEventsState({ status: 'loading' });
    fetchAdverseEvents(drugName)
      .then((data) => setEventsState(data.length > 0 ? { status: 'ok', data } : { status: 'empty' }))
      .catch((e: unknown) => setEventsState({ status: 'error', message: e instanceof Error ? e.message : 'FDA events unavailable' }));
  }, [expanded, drugName, labelState.status]);

  return (
    <Box sx={{ borderRadius: '10px', border: '1px solid #E1D5F5', bgcolor: '#FAFAFE' }}>
      {/* Header toggle */}
      <Button
        onClick={() => setExpanded((v) => !v)}
        fullWidth
        sx={{
          textTransform: 'none', justifyContent: 'flex-start', p: 1.5,
          borderRadius: 0,
          '&:hover': { bgcolor: '#F3E8FF' },
        }}
        disableRipple={false}
      >
        <MedicationIcon sx={{ fontSize: 16, color: '#7B1FA2', mr: 0.75 }} />
        <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#7B1FA2', flex: 1, textAlign: 'left' }}>
          Drug Context: {drugName}
        </Typography>
        {expanded
          ? <ExpandLessIcon sx={{ fontSize: 16, color: '#9C4DCC' }} />
          : <ExpandMoreIcon sx={{ fontSize: 16, color: '#9C4DCC' }} />
        }
      </Button>

      <Collapse in={expanded}>
        <Divider sx={{ borderColor: '#E1D5F5' }} />
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Label section — independent state */}
          <LabelSection state={labelState} />

          {/* Divider between sections only when both have content */}
          {(labelState.status === 'ok' || labelState.status === 'empty') &&
           (eventsState.status === 'ok' || eventsState.status === 'loading' || eventsState.status === 'empty') && (
            <Divider sx={{ borderColor: '#EDE9F6' }} />
          )}

          {/* Events section — independent state */}
          <EventsSection state={eventsState} />
        </Box>
      </Collapse>
    </Box>
  );
}
