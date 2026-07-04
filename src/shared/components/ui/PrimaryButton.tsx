import { Button, CircularProgress } from '@mui/material';
import type { ButtonProps } from '@mui/material';

interface PrimaryButtonProps extends Omit<ButtonProps, 'variant'> {
  loading?: boolean;
}

export function PrimaryButton({ loading, disabled, children, sx, ...props }: PrimaryButtonProps) {
  return (
    <Button
      variant="contained"
      disabled={disabled || loading}
      sx={{
        bgcolor: '#1A237E',
        '&:hover': { bgcolor: '#151c63' },
        py: 1,
        fontSize: '0.8125rem',
        fontWeight: 600,
        textTransform: 'none',
        borderRadius: '8px',
        boxShadow: 'none',
        ...sx,
      }}
      {...props}
    >
      {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : children}
    </Button>
  );
}
