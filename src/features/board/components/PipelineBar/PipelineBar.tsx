import { Box, Tab, Tabs, Skeleton, Typography } from '@mui/material';
import { useQuery } from '@apollo/client';
import { STAGES, STAGE_LABELS, type Stage } from '@/shared/types/domain';
import { GET_STAGE_COUNTS } from '../../graphql/queries';

interface Props {
  activeStage: Stage;
  onStageChange: (stage: Stage) => void;
}

interface CountData {
  observation: { totalCount: number };
  insight: { totalCount: number };
  actionable: { totalCount: number };
  impact: { totalCount: number };
}

export function PipelineBar({ activeStage, onStageChange }: Props) {
  const { data, loading } = useQuery<CountData>(GET_STAGE_COUNTS, {
    fetchPolicy: 'cache-and-network',
  });

  const counts: Record<Stage, number> = {
    observation: data?.observation?.totalCount ?? 0,
    insight: data?.insight?.totalCount ?? 0,
    actionable: data?.actionable?.totalCount ?? 0,
    impact: data?.impact?.totalCount ?? 0,
  };

  return (
    <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E3E7FF' }}>
      <Tabs
        value={activeStage}
        onChange={(_, v: Stage) => onStageChange(v)}
        variant="fullWidth"
        TabIndicatorProps={{ style: { backgroundColor: '#3F51B5', height: 3 } }}
        sx={{ minHeight: 56 }}
      >
        {STAGES.map((stage) => (
          <Tab
            key={stage}
            value={stage}
            aria-label={`${STAGE_LABELS[stage]} tab, ${counts[stage]} insights`}
            label={
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    fontWeight: activeStage === stage ? 700 : 400,
                    color: activeStage === stage ? '#3F51B5' : '#607D8B',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {STAGE_LABELS[stage]}
                </Typography>
                {loading ? (
                  <Skeleton width={24} height={20} sx={{ mx: 'auto' }} />
                ) : (
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: activeStage === stage ? '#3F51B5' : '#455A64',
                      lineHeight: 1.2,
                    }}
                  >
                    {counts[stage]}
                  </Typography>
                )}
              </Box>
            }
            sx={{ minHeight: 56, py: 1 }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
