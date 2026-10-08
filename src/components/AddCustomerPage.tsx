import { useState, type FC, type ChangeEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
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
        avatarColor: '#1E3A8A',
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
    <Box sx={{ width: '100%', p: { xs: 1, sm: 1.5 }, bgcolor: '#D9E4F2', minHeight: 'calc(100vh - 70px)' }}>
      {/* Outer Window Card */}
      <Box
        sx={{
          maxWidth: '850px',
          mx: 'auto',
          bgcolor: '#FFFFFF',
          border: '1px solid #9BB3CC',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Window Title Header Bar */}
        <Box
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            px: 1.5,
            py: 0.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddAlt1RoundedIcon sx={{ fontSize: 18, color: '#0284C7' }} />
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.01em',
              }}
            >
              Add New Customer Profile
            </Typography>
          </Box>

          <Button
            onClick={onCancel}
            startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 15 }} />}
            size="small"
            sx={{
              height: '24px',
              px: 1,
              py: 0,
              bgcolor: '#EDF4FB',
              border: '1px solid #94A3B8',
              color: '#0F172A',
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '3px',
              '&:hover': { bgcolor: '#D9E4F2' },
            }}
          >
            Back to List
          </Button>
        </Box>

        {/* Inner Content Area */}
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#F0F5FA' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
              mb: 1.5,
            }}
          >
            {/* Box 1: Customer Personal Details */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Customer Identity</legend>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                {/* Full Name */}
                <Box>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
                    Full Name / Business Name *
                  </Typography>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Traders"
                    value={formData.fullName}
                    onChange={handleChange('fullName')}
                    className="erp-input"
                    style={{ width: '100%' }}
                  />
                </Box>

                {/* Mobile Number */}
                <Box>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
                    Mobile Number
                  </Typography>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={formData.mobileNumber}
                    onChange={handleChange('mobileNumber')}
                    className="erp-input"
                    style={{ width: '100%' }}
                  />
                </Box>
              </Box>
            </fieldset>

            {/* Box 2: Tax & Statutory Info */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Tax Information</legend>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                {/* GSTIN */}
                <Box>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
                    GSTIN / Tax ID
                  </Typography>
                  <input
                    type="text"
                    placeholder="e.g. 33ABCDE1234F1Z5"
                    value={formData.gstin}
                    onChange={handleChange('gstin')}
                    className="erp-input"
                    style={{ width: '100%', textTransform: 'uppercase' }}
                  />
                </Box>
              </Box>
            </fieldset>
          </Box>

          {/* Box 3: Address Details */}
          <fieldset className="erp-fieldset" style={{ marginBottom: '16px' }}>
            <legend className="erp-legend">Billing & Delivery Address</legend>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A' }}>
                Full Address *
              </Typography>
              <textarea
                rows={3}
                required
                placeholder="Enter complete billing / delivery address..."
                value={formData.billingAddress}
                onChange={handleChange('billingAddress')}
                className="erp-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </Box>
          </fieldset>

          {/* Action Buttons: Cancel & Save */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
              pt: 1.5,
              borderTop: '1px solid #C2D3E5',
            }}
          >
            <Button
              onClick={onCancel}
              disabled={loading}
              variant="outlined"
              size="small"
              sx={{
                bgcolor: '#E5ECF4',
                borderColor: '#94A3B8',
                color: '#0F172A',
                fontWeight: 700,
                fontSize: '12.5px',
                px: 2,
                py: 0.5,
                borderRadius: '3px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#D9E4F2' },
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              variant="contained"
              size="small"
              sx={{
                bgcolor: '#741748',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12.5px',
                px: 2.5,
                py: 0.5,
                minWidth: '120px',
                borderRadius: '3px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#580e34' },
              }}
            >
              {loading ? <CircularProgress size={16} color="inherit" /> : 'Register Customer'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
