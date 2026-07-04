import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { apolloClient } from '@/lib/apollo/client';
import { router } from '@/lib/router/index';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ToastProvider } from '@/shared/components/ui/Toast';
import { registerErrorHandler } from '@/lib/apollo/links/errorLink';
import './index.css';

const theme = createTheme({
  palette: {
    primary: { main: '#3F51B5', dark: '#303F9F', contrastText: '#fff' },
    secondary: { main: '#607D8B' },
    background: { default: '#F5F7FF' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none' } } },
  },
});

// Wire Apollo errors → global toast (registered after ToastProvider mounts)
// We'll use a ref approach — errorLink calls this after registration
function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

// Register Apollo error handler with toast — called once on startup
// The errorLink is module-level, so we set the handler here
registerErrorHandler((msg) => {
  // Toast is not available at module level — errors surface via component states
  console.warn('[Apollo error surfaced]', msg);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </ApolloProvider>
  </StrictMode>,
);
