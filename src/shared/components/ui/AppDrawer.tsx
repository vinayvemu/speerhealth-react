import { Drawer, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode, FormEventHandler } from 'react';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  onHeaderClose?: () => void;   // X button — defaults to onClose
  title: string;
  subtitle?: string;
  headerIcon?: ReactNode;
  headerExtra?: ReactNode;      // renders below title row, inside header
  footer?: ReactNode;
  children: ReactNode;
  isForm?: boolean;             // renders body as <form>
  onSubmit?: FormEventHandler;
  width?: number | string | Record<string, number | string>;
}

export function AppDrawer({
  open, onClose, onHeaderClose, title, subtitle, headerIcon, headerExtra,
  footer, children, isForm, onSubmit, width = { xs: '100vw', sm: 480 },
}: AppDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        px: 3, py: 2,
        borderBottom: '1px solid #EAECF5', flexShrink: 0, bgcolor: '#fff',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: headerIcon ? 1 : 0, flex: 1, minWidth: 0, pr: 1 }}>
            {headerIcon}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1, mt: 0.25 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton onClick={onHeaderClose ?? onClose} size="small" sx={{ color: '#9CA3AF', flexShrink: 0 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        {headerExtra && (
          <Box sx={{ mt: 1 }}>
            {headerExtra}
          </Box>
        )}
      </Box>

      {/* Body */}
      <Box
        component={isForm ? 'form' : 'div'}
        onSubmit={isForm ? onSubmit : undefined}
        sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 1.75, bgcolor: '#FAFAFA' }}
      >
        {children}
      </Box>

      {/* Footer */}
      {footer && (
        <Box sx={{ flexShrink: 0, px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid #EAECF5' }}>
          {footer}
        </Box>
      )}
    </Drawer>
  );
}
