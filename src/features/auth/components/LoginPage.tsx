import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button,
  CircularProgress, Alert, Divider,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in — navigate in effect to avoid setState-during-render
  useEffect(() => { if (session) navigate('/'); }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    if (err) { setError(err); setLoading(false); return; }
    navigate('/');
  };

  const quickLogin = async (preset: 'alice' | 'bob') => {
    setLoading(true);
    setError(null);
    const creds = {
      alice: { email: 'alice01@insightboard.test', password: 'InsightBoard-01' },
      bob: { email: 'bob01@insightboard.test', password: 'InsightBoard-01' },
    }[preset];
    const { error: err } = await signIn(creds.email, creds.password);
    if (err) { setError(err); setLoading(false); return; }
    navigate('/');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F5F7FF',
        p: 2,
      }}
    >
      <Paper elevation={0} sx={{ p: 4, maxWidth: 420, width: '100%', borderRadius: 3, border: '1px solid #E3E7FF' }}>
        {/* Brand */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 2,
              bgcolor: '#3F51B5',
              mb: 1.5,
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>IB</Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A237E' }}>
            InsightBoard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Speer Health — Field Intelligence Platform
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            size="small"
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            size="small"
            autoComplete="current-password"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ bgcolor: '#3F51B5', '&:hover': { bgcolor: '#303F9F' }, py: 1.2 }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Sign In'}
          </Button>
        </Box>

        <Divider sx={{ my: 2.5 }}>
          <Typography variant="caption" color="text.secondary">
            Quick demo login
          </Typography>
        </Divider>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => quickLogin('alice')}
            disabled={loading}
            sx={{ borderColor: '#3F51B5', color: '#3F51B5' }}
          >
            Login as Alice
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => quickLogin('bob')}
            disabled={loading}
            sx={{ borderColor: '#607D8B', color: '#607D8B' }}
          >
            Login as Bob
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
