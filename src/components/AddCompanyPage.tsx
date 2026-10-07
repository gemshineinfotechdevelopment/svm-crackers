import { useState, type FC, type ChangeEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  InputBase,
  Paper,
  CircularProgress,
} from '@mui/material';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { CompaniesApi } from '../services/api';

interface AddCompanyPageProps {
  onCancel?: () => void;
  onSubmitSuccess?: () => void;
  onNavigateCompanies?: () => void;
}

export const AddCompanyPage: FC<AddCompanyPageProps> = ({
  onCancel,
  onSubmitSuccess,
  onNavigateCompanies,
}) => {
  const [formData, setFormData] = useState({
    companyName: '',
    gstNumber: '',
    registeredAddress: '',
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
    if (!formData.companyName.trim() || !formData.registeredAddress.trim()) {
      alert('Please fill in required fields (Company Name and Registered Address)');
      return;
    }

    try {
      setLoading(true);
      await CompaniesApi.create({
        name: formData.companyName.trim(),
        gstin: formData.gstNumber.trim() || 'N/A',
        address: formData.registeredAddress.trim(),
        avatarLetter: formData.companyName.trim().charAt(0).toUpperCase(),
        avatarBg: '#F1F5F9',
        avatarColor: '#B91C1C',
      });
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      console.error('Failed to create company:', err);
      alert('Error creating company. Please check your backend connection.');
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
      {/* Breadcrumbs Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2.5,
        }}
      >
        <DomainOutlinedIcon sx={{ fontSize: 18, color: '#475569' }} />
        <Typography
          onClick={onNavigateCompanies}
          sx={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
            '&:hover': { color: '#B91C1C' },
          }}
        >
          Companies
        </Typography>
        <Typography
          sx={{
            fontSize: '13.5px',
            color: '#D97706',
            userSelect: 'none',
          }}
        >
          ›
        </Typography>
        <Typography
          sx={{
            fontSize: '13.5px',
            fontWeight: 700,
            color: '#B91C1C',
          }}
        >
          Add New Company
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
            {/* Company Name Field */}
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
                Company Legal Name *
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
                  placeholder="e.g. Acme Fireworks Pvt Ltd"
                  value={formData.companyName}
                  onChange={handleChange('companyName')}
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

            {/* GST Number Field */}
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
                GSTIN / Tax Registration Number
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
                  placeholder="e.g. 33AADCS5678Q1Z4"
                  value={formData.gstNumber}
                  onChange={handleChange('gstNumber')}
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

            {/* Registered Address Field */}
            <Box sx={{ gridColumn: { sm: 'span 2' } }}>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1F1714',
                  mb: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                Registered Office Address *
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
                  placeholder="e.g. 124 Industrial Area, Phase 1, Sivakasi, Tamil Nadu"
                  value={formData.registeredAddress}
                  onChange={handleChange('registeredAddress')}
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
              {loading ? 'Creating...' : 'Register Company'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
