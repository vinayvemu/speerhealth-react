import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ComponentErrorBoundary]', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Box sx={{ p: 3, textAlign: 'center', border: '1px solid #FFCDD2', borderRadius: 2, bgcolor: '#FFF5F5' }}>
          <ErrorOutlineIcon sx={{ color: '#F44336', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {this.state.message || 'Failed to render'}
          </Typography>
          <Button size="small" onClick={() => this.setState({ hasError: false, message: '' })}>
            Retry
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
