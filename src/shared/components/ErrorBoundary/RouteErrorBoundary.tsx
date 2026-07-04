import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F5F7FF',
        p: 3,
      }}
    >
      <Paper elevation={0} sx={{ p: 5, maxWidth: 480, textAlign: 'center', borderRadius: 3 }}>
        <ErrorOutlineIcon sx={{ fontSize: 56, color: '#F44336', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Oops — something broke
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="contained" onClick={() => navigate('/')}>
            Home
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
