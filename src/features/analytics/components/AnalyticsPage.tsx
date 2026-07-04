import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, Button, CircularProgress, LinearProgress, Alert, TextField } from '@mui/material';
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

export function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { data, loading, error, refetch } = useAnalyticsData({
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  });
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A237E' }}>Analytics</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" startIcon={<RefreshIcon />} onClick={refetch} disabled={loading} aria-label="Refresh analytics">
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => exportPDF(user?.email ?? 'User')}
            disabled={exporting}
            sx={{ bgcolor: '#3F51B5' }}
            aria-label="Export PDF report"
          >
            {exporting ? 'Exporting…' : 'Export PDF'}
          </Button>
        </Box>
      </Box>

      {/* Date range filter */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Date range:</Typography>
        <TextField
          type="date"
          size="small"
          label="From"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 150 }}
        />
        <TextField
          type="date"
          size="small"
          label="To"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 150 }}
        />
        {(dateFrom || dateTo) && (
          <Button size="small" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear
          </Button>
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
