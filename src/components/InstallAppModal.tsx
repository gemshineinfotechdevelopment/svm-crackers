import { useState, type FC } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardContent,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LaptopMacRoundedIcon from '@mui/icons-material/LaptopMacRounded';
import AndroidRoundedIcon from '@mui/icons-material/AndroidRounded';
import AppleIcon from '@mui/icons-material/Apple';
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded';
import { getDevicePlatform, canInstallPwa, promptPwaInstall } from '../utils/pwaInstall';

interface InstallAppModalProps {
  open: boolean;
  onClose: () => void;
  onInstalled?: () => void;
}

export const InstallAppModal: FC<InstallAppModalProps> = ({ open, onClose, onInstalled }) => {
  const defaultPlatform = getDevicePlatform();
  const initialTab = defaultPlatform === 'android' ? 1 : defaultPlatform === 'ios' ? 2 : 0;
  const [tabIndex, setTabIndex] = useState<number>(initialTab);
  const [installing, setInstalling] = useState(false);

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      const outcome = await promptPwaInstall();
      if (outcome === 'accepted') {
        if (onInstalled) onInstalled();
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  const isNativePromptAvailable = canInstallPwa();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '10px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          backgroundColor: '#1E3A8A',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            component="img"
            src="/pwa-192x192.png"
            alt="SVM Crackers"
            sx={{ width: 32, height: 32, borderRadius: '6px', border: '1px solid #F59E0B' }}
          />
          <Box>
            <Typography sx={{ fontSize: '15px', fontWeight: 700 }}>
              Install SVM Crackers
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#93C5FD' }}>
              Desktop, Laptop, Tablet & Mobile App
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: '#FFFFFF', opacity: 0.8, '&:hover': { opacity: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, backgroundColor: '#F8FAFC' }}>
        {/* Native 1-Click Install Banner if available */}
        {isNativePromptAvailable && (
          <Card
            sx={{
              mb: 2.5,
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A' }}>
                    Quick 1-Click Installation Ready!
                  </Typography>
                  <Typography sx={{ fontSize: '11.5px', color: '#475569', mt: 0.3 }}>
                    Click below to install directly and place the app icon on your desktop screen / home screen.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleNativeInstall}
                  disabled={installing}
                  startIcon={<GetAppRoundedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    textTransform: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    backgroundColor: '#1E3A8A',
                    px: 2.5,
                    py: 0.8,
                    borderRadius: '5px',
                    '&:hover': { backgroundColor: '#1E40AF' },
                  }}
                >
                  {installing ? 'Installing...' : 'Install Now'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Device Selection Tabs */}
        <Tabs
          value={tabIndex}
          onChange={(_, val) => setTabIndex(val)}
          variant="fullWidth"
          sx={{
            mb: 2,
            borderBottom: '1px solid #E2E8F0',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '12.5px',
              fontWeight: 600,
              minHeight: 42,
              color: '#64748B',
              '&.Mui-selected': {
                color: '#1E3A8A',
                fontWeight: 700,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#1E3A8A',
              height: 3,
            },
          }}
        >
          <Tab icon={<LaptopMacRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Laptop / PC" />
          <Tab icon={<AndroidRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Android / Tab" />
          <Tab icon={<AppleIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="iPhone / iPad" />
        </Tabs>

        {/* Tab 0: Laptop / PC */}
        {tabIndex === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                1
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Look at the Browser Address Bar (Top Right)
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.2 }}>
                  In Google Chrome or Microsoft Edge, look at the right side of the URL bar at the top of your browser.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                2
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Click the "Install" Icon or Menu
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.2 }}>
                  Click the computer monitor with a down arrow icon (⬇) or plus icon (⊕) in the address bar. Alternatively, click the 3 dots menu (⋮) → select <strong>"Install SVM Crackers..."</strong>.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                ✓
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#16A34A' }}>
                  Desktop Shortcut Created Automatically!
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#475569', mt: 0.2 }}>
                  Click <strong>"Install"</strong>. An app shortcut with the <strong>SVM Crackers icon</strong> will immediately appear on your <strong>Windows Desktop Screen</strong> and Start Menu!
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Tab 1: Android */}
        {tabIndex === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                1
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Tap the Three Dots Menu (⋮)
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.2 }}>
                  In Chrome on Android, tap the three vertical dots (⋮) in the top-right corner.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                2
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Select "Install app" or "Add to Home screen"
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.2 }}>
                  Tap <strong>"Install app"</strong> (or "Add to Home screen") from the dropdown list.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                ✓
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#16A34A' }}>
                  Added to Mobile Home Screen
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#475569', mt: 0.2 }}>
                  Tap <strong>"Install"</strong> to confirm. The SVM Crackers app icon will appear on your device's home screen.
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Tab 2: iPhone / iPad */}
        {tabIndex === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                1
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Tap the Safari Share Button (📤)
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.2 }}>
                  Open this page in Safari, and tap the <strong>Share button</strong> (a square with an arrow pointing up) at the bottom toolbar.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                2
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Tap "Add to Home Screen"
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.2 }}>
                  Scroll down the share sheet options and tap <strong>"Add to Home Screen"</strong> (➕).
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                ✓
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#16A34A' }}>
                  Tap "Add" at Top Right
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#475569', mt: 0.2 }}>
                  Tap <strong>"Add"</strong> in the top right corner. SVM Crackers is now installed like a native iOS app!
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 1.5, px: 2.5, backgroundColor: '#F1F5F9', borderTop: '1px solid #E2E8F0' }}>
        <Button
          onClick={onClose}
          size="small"
          sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600, color: '#475569' }}
        >
          Close
        </Button>
        {isNativePromptAvailable && (
          <Button
            onClick={handleNativeInstall}
            variant="contained"
            size="small"
            startIcon={<GetAppRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#1E3A8A',
              '&:hover': { backgroundColor: '#1E40AF' },
            }}
          >
            Install Directly
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
