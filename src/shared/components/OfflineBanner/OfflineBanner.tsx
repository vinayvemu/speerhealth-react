import { Alert, Collapse } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();

  return (
    <Collapse in={!isOnline}>
      <Alert
        icon={<WifiOffIcon />}
        severity="warning"
        variant="filled"
        sx={{ borderRadius: 0, justifyContent: 'center' }}
      >
        You're offline — changes will sync when reconnected.
      </Alert>
    </Collapse>
  );
}
