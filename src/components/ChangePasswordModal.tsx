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
  MenuItem,
  Select,
  FormControl,
  Chip,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import { AuthApi } from '../services/api';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AdminUserItem {
  username: string;
  role: string;
  updatedAt?: string;
}

const getStoredUser = (): { username: string; role: string } => {
  try {
    const stored = localStorage.getItem('svm_auth_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.username) {
        return {
          username: String(parsed.username).trim().toLowerCase(),
          role: String(parsed.role || 'admin').trim().toLowerCase(),
        };
      }
    }
  } catch {}
  return { username: 'admin', role: 'admin' };
};

export const ChangePasswordModal: FC<ChangePasswordModalProps> = ({ open, onClose, onSuccess }) => {
  const [operator, setOperator] = useState<{ username: string; role: string }>(getStoredUser);
  const [targetUsername, setTargetUsername] = useState<string>('admin');
  const [availableUsers, setAvailableUsers] = useState<AdminUserItem[]>([
    { username: 'admin', role: 'admin' },
    { username: 'officetest', role: 'superadmin' },
    { username: 'shana_maayo_16', role: 'superadmin' },
  ]);

  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingUsers, setFetchingUsers] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const isSuperAdmin = operator.role === 'superadmin' || operator.username === 'officetest' || operator.username === 'shana_maayo_16';

  // Load active user and available admin accounts when modal opens
  useEffect(() => {
    if (open) {
      const activeUser = getStoredUser();
      setOperator(activeUser);
      setTargetUsername(activeUser.username || 'admin');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setErrorMsg('');
      setSuccessMsg('');

      // Fetch live admin accounts from database
      setFetchingUsers(true);
      AuthApi.getUsers()
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data;
          if (Array.isArray(list) && list.length > 0) {
            setAvailableUsers(list);
          }
        })
        .catch((err) => {
          console.warn('[ChangePasswordModal] Could not fetch user list:', err);
        })
        .finally(() => {
          setFetchingUsers(false);
        });
    }
  }, [open]);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanTarget = targetUsername.trim().toLowerCase();
    const cleanCurrentPass = currentPassword.trim();
    const cleanNewPass = newPassword.trim();
    const cleanConfirmPass = confirmPassword.trim();

    if (!cleanTarget) {
      setErrorMsg('Please select or specify a target admin username.');
      return;
    }

    if (!cleanNewPass) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (cleanNewPass.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    if (!cleanConfirmPass) {
      setErrorMsg('Please confirm your new password.');
      return;
    }

    if (cleanNewPass !== cleanConfirmPass) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthApi.changePassword({
        operatorUsername: operator.username,
        targetUsername: cleanTarget,
        currentPassword: cleanCurrentPass || undefined,
        newPassword: cleanNewPass,
        confirmPassword: cleanConfirmPass,
      });

      setSuccessMsg(res?.message || `Password updated successfully in database for "${cleanTarget}"!`);

      // If user changed their own password, update local user storage
      if (cleanTarget === operator.username) {
        try {
          localStorage.setItem(
            'svm_auth_user',
            JSON.stringify({ username: cleanTarget, role: operator.role })
          );
        } catch {}
      }

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[ChangePassword] Failed:', err);
      const msg = err?.message || 'Failed to update password. Please check server database connection.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedTargetItem = availableUsers.find(
    (u) => u.username.toLowerCase() === targetUsername.toLowerCase()
  );

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
            {isSuperAdmin ? 'Admin & Super Admin Password Manager' : 'Change Password'}
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
          {/* Super Admin Privileges Notice */}
          {isSuperAdmin ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                p: 1.25,
                mb: 2,
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '6px',
              }}
            >
              <SecurityRoundedIcon sx={{ fontSize: 22, color: '#B45309' }} />
              <Box>
                <Typography sx={{ fontSize: '11px', color: '#92400E', fontWeight: 700 }}>
                  👑 Super Admin Access: {operator.username}
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: '#78350F' }}>
                  You can change the password for ANY admin account at any time.
                </Typography>
              </Box>
            </Box>
          ) : (
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
                  Logged-in User:
                </Typography>
                <Typography sx={{ fontSize: '13px', color: '#1E3A8A', fontWeight: 700 }}>
                  {operator.username} (Administrator)
                </Typography>
              </Box>
            </Box>
          )}

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

          {/* Target User Selector (Dropdown for Super Admin, Static for Regular Admin) */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Account to Update *
              </Typography>
              {selectedTargetItem && (
                <Chip
                  size="small"
                  label={selectedTargetItem.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                  sx={{
                    fontSize: '10px',
                    height: '20px',
                    fontWeight: 700,
                    backgroundColor: selectedTargetItem.role === 'superadmin' ? '#FEF3C7' : '#DBEAFE',
                    color: selectedTargetItem.role === 'superadmin' ? '#B45309' : '#1E40AF',
                  }}
                />
              )}
            </Box>

            {isSuperAdmin ? (
              <FormControl fullWidth size="small">
                <Select
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  disabled={loading || fetchingUsers}
                  sx={{
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '5px',
                  }}
                >
                  {availableUsers.map((u) => (
                    <MenuItem key={u.username} value={u.username} sx={{ fontSize: '13px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                          {u.username}
                        </Typography>
                        <Typography sx={{ fontSize: '11px', color: u.role === 'superadmin' ? '#B45309' : '#64748B' }}>
                          ({u.role === 'superadmin' ? 'Super Admin' : 'Admin'})
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                size="small"
                value={operator.username}
                disabled
                slotProps={{
                  input: {
                    sx: {
                      fontSize: '13px',
                      backgroundColor: '#F1F5F9',
                      borderRadius: '5px',
                    },
                  },
                }}
              />
            )}
          </Box>

          {/* Current Password Field (Only needed if NOT a Super Admin override) */}
          {(!isSuperAdmin || targetUsername === operator.username) && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Current Password
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                  (Optional verification)
                </Typography>
              </Box>
              <TextField
                fullWidth
                size="small"
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Enter current password if known"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showCurrentPassword ? (
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
              Confirm New Password *
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
            startIcon={
              loading ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <KeyRoundedIcon sx={{ fontSize: 17 }} />
              )
            }
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
            {loading ? 'Updating In Database...' : `Save Password for "${targetUsername}"`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
