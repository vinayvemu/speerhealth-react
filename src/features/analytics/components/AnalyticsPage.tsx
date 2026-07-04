import React, { useState, useMemo } from 'react';
import { Box, Typography, Grid, Paper, Button, CircularProgress, LinearProgress, Alert, TextField, ToggleButtonGroup, ToggleButton } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { usePdfExport } from '../hooks/usePdfExport';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ComponentErrorBoundary } from '@/shared/components/ErrorBoundary/ComponentErrorBoundary';
import { useIntersectionObserver } from '@/shared/hooks/useIntersectionObserver';
import type { Stage } from '@/shared/types/domain';
import { STAGE_LABELS, PRIORITY_COLORS } from '@/shared/types/domain';

const STAGE_COLORS: Record<Stage, string> = {
  observation: '#9FA8DA',
  insight: '#5C6BC0',
  actionable: '#3949AB',
  impact: '#1A237E',
};

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #E3E7FF', borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A237E' }}>{value}</Typography>
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{label}</Typography>
      {sub && <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>{sub}</Typography>}
    </Paper>
  );
}

function LazyChart({ children }: { children: React.ReactNode }) {
  const { ref, isVisible } = useIntersectionObserver({ threshold: 0.1 });
  return <div ref={ref}>{isVisible ? children : <Box sx={{ height: 200 }} />}</div>;
}

type Preset = '7d' | '30d' | '90d' | 'all' | 'custom';

function isoDate(d: Date) { return d.toISOString().split('T')[0]; }
function daysAgo(n: number) { return isoDate(new Date(Date.now() - (n - 1) * 86_400_000)); }

export function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { dateFrom, dateTo } = useMemo(() => {
    const today = isoDate(new Date());
    if (preset === '7d')  return { dateFrom: daysAgo(7),  dateTo: today };
    if (preset === '30d') return { dateFrom: daysAgo(30), dateTo: today };
    if (preset === '90d') return { dateFrom: daysAgo(90), dateTo: today };
    if (preset === 'all') return { dateFrom: null,         dateTo: null  };
    return { dateFrom: customFrom || null, dateTo: customTo || null };
  }, [preset, customFrom, customTo]);

  const { data, loading, error, refetch } = useAnalyticsData({ dateFrom, dateTo });
  const { exportPDF, exporting, progress } = usePdfExport();
  const { user } = useAuth();

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress sx={{ color: '#3F51B5' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={refetch}>Retry</Button>}>{error}</Alert>
      </Box>
    );
  }

  const funnelData = (Object.keys(STAGE_LABELS) as Stage[]).map((s) => ({
    stage: STAGE_LABELS[s],
    count: data?.byStage[s]?.length ?? 0,
    fill: STAGE_COLORS[s],
  }));

  return (
    <Box sx={{ overflowY: 'auto', height: '100%', p: 2, pb: 4 }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A237E', whiteSpace: 'nowrap' }}>
          Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={refetch}
            disabled={loading}
            sx={{ color: '#4B5563', whiteSpace: 'nowrap', textTransform: 'none' }}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => exportPDF(user?.email ?? 'User', { dateFrom, dateTo })}
            disabled={exporting}
            sx={{ bgcolor: '#3F51B5', whiteSpace: 'nowrap', textTransform: 'none', borderRadius: '8px' }}
          >
            {exporting ? 'Exporting…' : 'Export PDF'}
          </Button>
        </Box>
      </Box>

      {/* ── Date range filter bar ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5,
        p: 1.25, px: 1.75,
        bgcolor: '#F8F9FF',
        border: '1px solid #E3E7FF',
        borderRadius: '12px',
        flexWrap: 'wrap',
        rowGap: 1,
      }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>
          Date range
        </Typography>

        {/* Preset toggle */}
        <ToggleButtonGroup
          value={preset}
          exclusive
          onChange={(_, v: Preset | null) => { if (v) setPreset(v); }}
          size="small"
          sx={{
            bgcolor: '#fff',
            border: '1px solid #E0E3FF',
            borderRadius: '8px',
            '& .MuiToggleButton-root': {
              border: 'none',
              borderRadius: '7px !important',
              px: 1.5,
              py: 0.375,
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'none',
              minWidth: 44,
              '&.Mui-selected': {
                bgcolor: '#3F51B5',
                color: '#fff',
                '&:hover': { bgcolor: '#3949AB' },
              },
              '&:hover': { bgcolor: '#EEF0FF' },
            },
          }}
        >
          <ToggleButton value="7d">7d</ToggleButton>
          <ToggleButton value="30d">30d</ToggleButton>
          <ToggleButton value="90d">90d</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="custom">Custom</ToggleButton>
        </ToggleButtonGroup>

        {/* Custom pickers — only shown when preset is 'custom' */}
        {preset === 'custom' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              type="date"
              size="small"
              label="From"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                width: 160,
                '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#fff', fontSize: '0.82rem' },
                '& input[type="date"]': { colorScheme: 'light' },
                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                  opacity: 1, cursor: 'pointer', filter: 'brightness(0) saturate(100%) opacity(0.45)',
                },
              }}
            />
            <Typography sx={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 500 }}>→</Typography>
            <TextField
              type="date"
              size="small"
              label="To"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                width: 160,
                '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#fff', fontSize: '0.82rem' },
                '& input[type="date"]': { colorScheme: 'light' },
                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                  opacity: 1, cursor: 'pointer', filter: 'brightness(0) saturate(100%) opacity(0.45)',
                },
              }}
            />
            {(customFrom || customTo) && (
              <Button
                size="small"
                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                sx={{ fontSize: '0.78rem', color: '#6B7280', textTransform: 'none', minWidth: 0, p: '4px 8px' }}
              >
                Clear
              </Button>
            )}
          </Box>
        )}

        {/* Active range label for non-custom presets */}
        {preset !== 'custom' && dateFrom && (
          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', ml: 'auto', whiteSpace: 'nowrap' }}>
            {dateFrom} → {dateTo}
          </Typography>
        )}
      </Box>

      {exporting && <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, borderRadius: 1 }} />}

      {/* KPI Cards */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={6}><KpiCard label="Total Insights" value={data?.totalCount ?? 0} /></Grid>
        <Grid size={6}><KpiCard label="Avg Pipeline" value={`${data?.avgPipelineDays ?? 0}d`} /></Grid>
        <Grid size={6}><KpiCard label="Impact Stage" value={data?.byStage.impact?.length ?? 0} /></Grid>
        <Grid size={6}><KpiCard label="Top HCP" value={data?.topHcp ?? '—'} /></Grid>
      </Grid>

      {/* Pipeline Funnel */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E3E7FF', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1A237E', mb: 1.5 }}>Pipeline Funnel</Typography>
        <ComponentErrorBoundary>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={800}>
                {funnelData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ComponentErrorBoundary>
      </Paper>

      {/* Insights Over Time */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E3E7FF', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1A237E', mb: 1.5 }}>Insights Over Time (8 weeks)</Typography>
        <ComponentErrorBoundary>
          <LazyChart>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data?.weekly ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3F51B5" strokeWidth={2} dot={false} isAnimationActive animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
          </LazyChart>
        </ComponentErrorBoundary>
      </Paper>

      {/* Category Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E3E7FF', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1A237E', mb: 1.5 }}>By Category</Typography>
        <ComponentErrorBoundary>
          <LazyChart>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.byCategory ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3F51B5" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ComponentErrorBoundary>
      </Paper>

      {/* Priority × Stage Heatmap */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E3E7FF', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1A237E', mb: 1.5 }}>Priority by Stage</Typography>
        <ComponentErrorBoundary>
          <LazyChart>
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto repeat(4, 1fr)', gap: 0.5, minWidth: 300 }}>
                <Box />
                {(Object.keys(STAGE_LABELS) as Stage[]).map((s) => (
                  <Typography key={s} variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textAlign: 'center' }}>
                    {STAGE_LABELS[s].slice(0, 3)}
                  </Typography>
                ))}
                {(['P1', 'P2', 'P3', 'P4'] as const).map((p) => (
                  <React.Fragment key={p}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: PRIORITY_COLORS[p].text, display: 'flex', alignItems: 'center' }}>
                      {p}
                    </Typography>
                    {(Object.keys(STAGE_LABELS) as Stage[]).map((s) => {
                      const cell = data?.heatmap?.find((c) => c.stage === s && c.priority === p);
                      const count = cell?.count ?? 0;
                      const opacity = count === 0 ? 0.05 : Math.min(0.1 + count * 0.15, 1);
                      return (
                        <Box
                          key={s}
                          sx={{
                            bgcolor: `rgba(63,81,181,${opacity})`,
                            borderRadius: 1,
                            p: 0.5,
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: count > 0 ? 700 : 400, color: count > 0 ? '#1A237E' : 'text.disabled' }}>
                            {count}
                          </Typography>
                        </Box>
                      );
                    })}
                  </React.Fragment>
                ))}
              </Box>
            </Box>
          </LazyChart>
        </ComponentErrorBoundary>
      </Paper>

      {/* HCP Leaderboard */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E3E7FF', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1A237E', mb: 1.5 }}>Top HCPs</Typography>
        <ComponentErrorBoundary>
          <LazyChart>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.hcpLeaderboard ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#607D8B" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ComponentErrorBoundary>
      </Paper>
    </Box>
  );
}
