import { useState, type FC, type ChangeEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  InputBase,
  Paper,
  CircularProgress,
} from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { CustomersApi } from '../services/api';

interface AddCustomerPageProps {
  onCancel?: () => void;
  onSubmitSuccess?: () => void;
}

export const AddCustomerPage: FC<AddCustomerPageProps> = ({
  onCancel,
  onSubmitSuccess,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    gstin: '',
    billingAddress: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim() || !formData.billingAddress.trim()) {
      alert('Please fill in required fields (Full Name and Address)');
      return;
    }

    try {
      setLoading(true);
      await CustomersApi.create({
        name: formData.fullName.trim(),
        mobile: formData.mobileNumber.trim() || 'N/A',
        gst: formData.gstin.trim() || 'N/A',
        address: formData.billingAddress.trim(),
        avatarLetter: formData.fullName.trim().charAt(0).toUpperCase(),
        avatarBg: '#F1F5F9',
        avatarColor: '#B91C1C',
      });
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
      alert('Error creating customer. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.5, md: 3 },
        boxSizing: 'border-box',
      }}
    >
      {/* Page Title & Subtitle */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#B91C1C',
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            mb: 0.8,
          }}
        >
          Add New Customer
        </Typography>
        <Typography
          sx={{
            fontSize: '14px',
            color: '#475569',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          Enter the details below to register a new customer profile into the billing platform.
        </Typography>
      </Box>

      {/* Main Form Card */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
          p: { xs: 2.5, sm: 3.5, md: 4 },
          boxSizing: 'border-box',
        }}
      >
        <Box component="form" noValidate autoComplete="off">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2.5,
            }}
          >
            {/* Full Name Field */}
            <Box>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1F1714',
                  mb: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                Full Name / Business Name *
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  px: 1.5,
                  height: '42px',
                  transition: 'all 0.15s ease',
                  '&:focus-within': {
                    borderColor: '#DC2626',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)',
                  },
                }}
              >
                <InputBase
                  fullWidth
                  placeholder="e.g. Acme Fireworks"
                  value={formData.fullName}
                  onChange={handleChange('fullName')}
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#1F1714',
                    '& input::placeholder': {
                      color: '#9CA3AF',
                      opacity: 1,
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Mobile Number Field */}
            <Box>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1F1714',
                  mb: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                Mobile Number
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  px: 1.5,
                  height: '42px',
                  transition: 'all 0.15s ease',
                  '&:focus-within': {
                    borderColor: '#DC2626',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)',
                  },
                }}
              >
                <InputBase
                  fullWidth
                  placeholder="e.g. +91 98765 43210"
                  value={formData.mobileNumber}
                  onChange={handleChange('mobileNumber')}
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#1F1714',
                    '& input::placeholder': {
                      color: '#9CA3AF',
                      opacity: 1,
                    },
                  }}
                />
              </Box>
            </Box>

            {/* GSTIN Field */}
            <Box>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1F1714',
                  mb: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                GSTIN / Tax ID
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  px: 1.5,
                  height: '42px',
                  transition: 'all 0.15s ease',
                  '&:focus-within': {
                    borderColor: '#DC2626',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)',
                  },
                }}
              >
                <InputBase
                  fullWidth
                  placeholder="e.g. 33ABCDE1234F1Z5"
                  value={formData.gstin}
                  onChange={handleChange('gstin')}
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#1F1714',
                    '& input::placeholder': {
                      color: '#9CA3AF',
                      opacity: 1,
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Billing Address Field */}
            <Box>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1F1714',
                  mb: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                Billing / Delivery Address *
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  px: 1.5,
                  height: '42px',
                  transition: 'all 0.15s ease',
                  '&:focus-within': {
                    borderColor: '#DC2626',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)',
                  },
                }}
              >
                <InputBase
                  fullWidth
                  placeholder="e.g. 123 Bazaar Street, Sivakasi"
                  value={formData.billingAddress}
                  onChange={handleChange('billingAddress')}
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#1F1714',
                    '& input::placeholder': {
                      color: '#9CA3AF',
                      opacity: 1,
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1.5,
              mt: 4,
              pt: 3,
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
              sx={{
                height: '40px',
                px: 2.5,
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#475569',
                borderColor: '#E2E8F0',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#D97706',
                  backgroundColor: '#F8FAFC',
                },
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              disableElevation
              onClick={handleSubmit}
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : <AddCircleOutlineRoundedIcon sx={{ fontSize: 18 }} />
              }
              sx={{
                height: '40px',
                px: 3,
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                textTransform: 'none',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                },
              }}
            >
              {loading ? 'Creating...' : 'Register Customer'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
