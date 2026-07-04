import { useState, useEffect } from 'react';
import { Box, Typography, Chip, CircularProgress, Divider, Collapse, Button } from '@mui/material';
import MedicationIcon from '@mui/icons-material/Medication';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { fetchDrugLabel, fetchDrugAdverseEvents, type DrugLabel, type DrugAdverseEvent } from '../../services/openFDAService';

interface Props {
  drugName: string;
}

export function DrugContext({ drugName }: Props) {
  const [label, setLabel] = useState<DrugLabel | null>(null);
  const [events, setEvents] = useState<DrugAdverseEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!expanded || label !== null || notFound) return;
    setLoading(true);
    Promise.all([fetchDrugLabel(drugName), fetchDrugAdverseEvents(drugName)])
      .then(([lbl, evts]) => {
        if (!lbl) setNotFound(true);
        else setLabel(lbl);
        setEvents(evts);
      })
      .finally(() => setLoading(false));
  }, [expanded, drugName, label, notFound]);

  return (
    <Box sx={{ borderRadius: '10px', border: '1px solid #E1D5F5', bgcolor: '#FAFAFE', p: 1.5 }}>
      <Button
        onClick={() => setExpanded((v) => !v)}
        fullWidth
        sx={{
          textTransform: 'none', justifyContent: 'flex-start', p: 0,
          '&:hover': { bgcolor: 'transparent' },
        }}
        disableRipple
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
          <MedicationIcon sx={{ fontSize: 16, color: '#7B1FA2' }} />
          <Typography sx={{ fontWeight: 600, fontSize: '0.78rem', color: '#7B1FA2' }}>
            Drug Context: {drugName}
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            {expanded ? <ExpandLessIcon sx={{ fontSize: 16, color: '#9C4DCC' }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: '#9C4DCC' }} />}
          </Box>
        </Box>
      </Button>

      <Collapse in={expanded}>
        <Divider sx={{ my: 1, borderColor: '#E1D5F5' }} />
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
            <CircularProgress size={20} sx={{ color: '#7B1FA2' }} />
          </Box>
        )}
        {notFound && !loading && (
          <Typography sx={{ fontSize: '0.78rem', color: '#9CA3AF', fontStyle: 'italic' }}>
            No FDA label data found for "{drugName}"
          </Typography>
        )}
        {label && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {label.genericName && (
              <Box>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Generic Name
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#374151', mt: 0.25 }}>
                  {label.genericName}
                </Typography>
              </Box>
            )}
            {label.manufacturer && (
              <Box>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Manufacturer
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#374151', mt: 0.25 }}>
                  {label.manufacturer}
                </Typography>
              </Box>
            )}
            {label.indications && (
              <Box>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Indications
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: '#4B5563', mt: 0.25, lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {label.indications}
                </Typography>
              </Box>
            )}

            {events.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <WarningAmberIcon sx={{ fontSize: 13, color: '#D97706' }} />
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Top Adverse Events (FDA)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {events.map((evt) => (
                    <Chip
                      key={evt.term}
                      label={`${evt.term} (${evt.count.toLocaleString()})`}
                      size="small"
                      sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontSize: '0.65rem', height: 20 }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Collapse>
    </Box>
  );
}
