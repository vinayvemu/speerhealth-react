import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: '#3F51B5' }} />
      </Box>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
