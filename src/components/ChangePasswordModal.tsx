import { useState, useEffect, type FC, type FormEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import { AuthApi } from '../services/api';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: FC<ChangePasswordModalProps> = ({ open, onClose, onSuccess }) => {
  const [currentUsername, setCurrentUsername] = useState<string>('officetest');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Extract currently logged-in user on open
  useEffect(() => {
    if (open) {
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setErrorMsg('');
      setSuccessMsg('');

      try {
        const stored = localStorage.getItem('svm_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.username) {
            setCurrentUsername(parsed.username);
            return;
          }
        }
      } catch {}
      setCurrentUsername('officetest');
    }
  }, [open]);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanNewPass = newPassword.trim();
    const cleanConfirmPass = confirmPassword.trim();

    if (!cleanNewPass) {
      setErrorMsg('Please enter a new password');
      return;
    }

    if (cleanNewPass.length < 4) {
      setErrorMsg('Password must be at least 4 characters long');
      return;
    }

    if (!cleanConfirmPass) {
      setErrorMsg('Please confirm your new password');
      return;
    }

    if (cleanNewPass !== cleanConfirmPass) {
      setErrorMsg('New password and confirm password do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthApi.changePassword({
        username: currentUsername,
        newPassword: cleanNewPass,
        confirmPassword: cleanConfirmPass,
      });

      setSuccessMsg(res?.message || 'Password changed successfully!');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('[ChangePassword] Failed:', err);
      const msg = err?.message || 'Failed to update password. Please check backend connection.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '10px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockResetRoundedIcon sx={{ fontSize: 24, color: '#93C5FD' }} />
          <Typography sx={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.3px' }}>
            Change Password
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={loading}
          size="small"
          sx={{
            color: '#FFFFFF',
            opacity: 0.8,
            '&:hover': { opacity: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      {/* Form Content */}
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 2.5, backgroundColor: '#FAFAFA' }}>
          {/* User Info Card */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.25,
              mb: 2,
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
            }}
          >
            <AdminPanelSettingsRoundedIcon sx={{ fontSize: 22, color: '#1E40AF' }} />
            <Box>
              <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                Updating Password For:
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#1E3A8A', fontWeight: 700, textTransform: 'capitalize' }}>
                {currentUsername} (Administrator)
              </Typography>
            </Box>
          </Box>

          {/* Success Message */}
          {successMsg && (
            <Alert
              icon={<CheckCircleRoundedIcon fontSize="inherit" />}
              severity="success"
              sx={{ mb: 2, fontSize: '12.5px', py: 0.5 }}
            >
              {successMsg}
            </Alert>
          )}

          {/* Error Message */}
          {errorMsg && (
            <Alert
              icon={<ErrorOutlineRoundedIcon fontSize="inherit" />}
              severity="error"
              sx={{ mb: 2, fontSize: '12.5px', py: 0.5 }}
            >
              {errorMsg}
            </Alert>
          )}

          {/* New Password Input */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#334155', mb: 0.6 }}>
              New Password *
            </Typography>
            <TextField
              fullWidth
              size="small"
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Enter new password (min. 4 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              autoFocus
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showNewPassword ? (
                          <VisibilityOffRoundedIcon sx={{ fontSize: 18, color: '#64748B' }} />
                        ) : (
                          <VisibilityRoundedIcon sx={{ fontSize: 18, color: '#64748B' }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '5px',
                  },
                },
              }}
            />
          </Box>

          {/* Confirm Password Input */}
          <Box sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#334155', mb: 0.6 }}>
              Confirm Password *
            </Typography>
            <TextField
              fullWidth
              size="small"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOffRoundedIcon sx={{ fontSize: 18, color: '#64748B' }} />
                        ) : (
                          <VisibilityRoundedIcon sx={{ fontSize: 18, color: '#64748B' }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '5px',
                  },
                },
              }}
            />
          </Box>
        </DialogContent>

        {/* Action Buttons */}
        <DialogActions
          sx={{
            p: 1.5,
            px: 2.5,
            backgroundColor: '#F1F5F9',
            borderTop: '1px solid #E2E8F0',
            gap: 1,
          }}
        >
          <Button
            onClick={onClose}
            disabled={loading}
            size="small"
            sx={{
              textTransform: 'none',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#475569',
              px: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <LockResetRoundedIcon sx={{ fontSize: 17 }} />}
            sx={{
              textTransform: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              backgroundColor: '#1E3A8A',
              px: 2.5,
              py: 0.8,
              borderRadius: '5px',
              '&:hover': {
                backgroundColor: '#1E40AF',
              },
            }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
