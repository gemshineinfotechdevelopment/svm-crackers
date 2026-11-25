import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import { ChitsApi, type ChitCustomerItem, type ChitSchemeItem } from '../../services/chitApi';

interface AddChitCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newCustomer: ChitCustomerItem) => void;
}

export const AddChitCustomerModal: React.FC<AddChitCustomerModalProps> = ({ open, onClose, onSuccess }) => {
  // Customer Identity State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  // Scheme Allocation State
  const [availableSchemes, setAvailableSchemes] = useState<ChitSchemeItem[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [schemeName, setSchemeName] = useState<string>('');
  const [amountPerPerson, setAmountPerPerson] = useState<string>('');
  const [personCount, setPersonCount] = useState<string>('1');
  const [duration, setDuration] = useState<string>('9');
  const [startMonth, setStartMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dueDay, setDueDay] = useState<string>('10');
  const [bonusDetails, setBonusDetails] = useState<string>('');
  const [giftDetails, setGiftDetails] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch active schemes on modal open
  useEffect(() => {
    if (open) {
      ChitsApi.getSchemes({ status: 'Active' })
        .then((schemes) => {
          if (Array.isArray(schemes)) {
            setAvailableSchemes(schemes);
            // If active schemes exist, default to the first one
            if (schemes.length > 0 && !selectedSchemeId) {
              const first = schemes[0];
              setSelectedSchemeId(first.schemeId);
              setSchemeName(first.schemeName);
              setAmountPerPerson(String(first.monthlyAmount));
              setDuration(String(first.durationMonths));
              setDueDay(String(first.dueDay || 10));
              if (first.startDate) {
                const ym = first.startDate.slice(0, 7);
                if (ym.length === 7) setStartMonth(ym);
              }
            }
          }
        })
        .catch((err) => {
          console.warn('Could not load active schemes for customer registration:', err);
        });
    }
  }, [open]);

  // Handle Scheme Selection from Dropdown
  const handleSchemeSelect = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    if (schemeId === 'custom') {
      setSchemeName('');
      setAmountPerPerson('');
      setDuration('9');
      setDueDay('10');
      return;
    }
    const target = availableSchemes.find((s) => s.schemeId === schemeId);
    if (target) {
      setSchemeName(target.schemeName);
      setAmountPerPerson(String(target.monthlyAmount));
      setDuration(String(target.durationMonths));
      setDueDay(String(target.dueDay || 10));
      if (target.startDate) {
        const ym = target.startDate.slice(0, 7);
        if (ym.length === 7) setStartMonth(ym);
      }
    }
  };

  // Real-time Dynamic Calculations
  const parsedAmt = Math.max(0, parseFloat(amountPerPerson) || 0);
  const parsedPersons = Math.max(1, parseInt(personCount, 10) || 1);
  const parsedDuration = Math.max(1, parseInt(duration, 10) || 1);
  const totalMonthlyInstallment = Math.round(parsedAmt * parsedPersons * 100) / 100;
  const totalChitValue = Math.round(totalMonthlyInstallment * parsedDuration * 100) / 100;

  const handleReset = () => {
    setName('');
    setMobile('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setCity('');
    setNotes('');
    setSelectedSchemeId('');
    setSchemeName('');
    setAmountPerPerson('');
    setPersonCount('1');
    setDuration('9');
    setDueDay('10');
    setBonusDetails('');
    setGiftDetails('');
    setErrorMsg('');
  };

  const handleClose = () => {
    if (loading) return;
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Customer Name is required.');
      return;
    }
    if (!mobile.trim()) {
      setErrorMsg('Mobile Number is required.');
      return;
    }
    if (!schemeName.trim()) {
      setErrorMsg('Please select or enter a Chit Scheme Name.');
      return;
    }
    if (parsedAmt <= 0) {
      setErrorMsg('Monthly installment rate per person must be greater than 0.');
      return;
    }
    if (parsedPersons < 1) {
      setErrorMsg('Number of persons must be at least 1.');
      return;
    }

    setLoading(true);
    try {
      const schemeData = {
        schemeName: schemeName.trim(),
        monthlyAmountPerPerson: parsedAmt,
        personCount: parsedPersons,
        totalMonthlyAmount: totalMonthlyInstallment,
        duration: parsedDuration,
        startMonth,
        dueDay: parseInt(dueDay, 10) || 10,
        totalChitValue,
        bonusDetails: bonusDetails.trim(),
        giftDetails: giftDetails.trim(),
      };

      const created = await ChitsApi.createCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        notes: notes.trim() || undefined,
        scheme: schemeData,
      });

      handleReset();
      onSuccess(created);
    } catch (err: any) {
      console.error('Failed to create chit customer with scheme:', err);
      setErrorMsg(err.message || 'Failed to register chit customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '6px',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Header Bar */}
        <Box
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddAlt1RoundedIcon sx={{ fontSize: 19, color: '#1E3A8A' }} />
            <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Register New Chit Customer & Allocate Scheme
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} disabled={loading} sx={{ color: '#475569', p: 0.3 }}>
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <DialogContent sx={{ p: 2.5, backgroundColor: '#FFFFFF', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '12px', py: 0.3 }}>
              {errorMsg}
            </Alert>
          )}

          {/* Section 1: Customer Personal Details */}
          <fieldset className="erp-fieldset" style={{ marginBottom: '16px' }}>
            <legend className="erp-legend">1. Customer Identity & Contact</legend>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr 1fr' }, gap: 1.5, mb: 1.2 }}>
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Customer Name <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="Full Name / Member Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', fontWeight: 700 }}
                  autoFocus
                  required
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Mobile Number <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="10-digit Mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={{ width: '100%', fontWeight: 700 }}
                  required
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  WhatsApp Number (Optional)
                </Typography>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="WhatsApp Mobile"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  style={{ width: '100%' }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 1fr' }, gap: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Address
                </Typography>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="Door No, Street Name"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%' }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  City / Town
                </Typography>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="City (e.g. Sivakasi)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{ width: '100%' }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Email (Optional)
                </Typography>
                <input
                  type="email"
                  className="erp-input"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%' }}
                />
              </Box>
            </Box>
          </fieldset>

          {/* Section 2: Chit Scheme Allocation & Dynamic Calculation */}
          <fieldset className="erp-fieldset" style={{ marginBottom: '14px', backgroundColor: '#FAFCFF', borderColor: '#BFDBFE' }}>
            <legend className="erp-legend" style={{ color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CardGiftcardRoundedIcon sx={{ fontSize: 15, color: '#1E40AF' }} />
              2. Chit Scheme Allocation & Amount Calculation
            </legend>

            {/* Scheme Picker Dropdown */}
            <Box sx={{ mb: 1.5, p: 1.2, bgcolor: '#FFFDF5', border: '1.5px solid #FCD34D', borderRadius: '6px' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#78350F', mb: 0.5, textTransform: 'uppercase' }}>
                Select Registered Chit Scheme *
              </Typography>
              <select
                className="erp-input"
                style={{
                  width: '100%',
                  fontWeight: 800,
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  cursor: 'pointer',
                  borderColor: '#FCD34D',
                }}
                value={selectedSchemeId}
                onChange={(e) => handleSchemeSelect(e.target.value)}
              >
                <option value="" disabled>-- Select a Chit Scheme from Schemes Master --</option>
                {availableSchemes.map((s) => (
                  <option key={s.schemeId} value={s.schemeId}>
                    {s.schemeName} — ₹{s.monthlyAmount.toLocaleString('en-IN')}/person × {s.durationMonths} Mos = Total ₹{s.totalValue.toLocaleString('en-IN')} (Due: {s.dueDay}th)
                  </option>
                ))}
                <option value="custom">-- Custom Scheme (Type scheme manually) --</option>
              </select>
            </Box>

            {/* Scheme Parameters Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 1fr 1fr' }, gap: 1.2, mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Scheme Name <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <input
                  type="text"
                  className="erp-input"
                  value={schemeName}
                  onChange={(e) => setSchemeName(e.target.value)}
                  placeholder="e.g. Deepavali Scheme 2026"
                  style={{ width: '100%', fontWeight: 700 }}
                  required
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Rate / Person (₹) <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <input
                  type="number"
                  className="erp-input"
                  value={amountPerPerson}
                  onChange={(e) => setAmountPerPerson(e.target.value)}
                  placeholder="2000"
                  min="1"
                  style={{ width: '100%', fontWeight: 800, color: '#16A34A' }}
                  required
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', mb: 0.3 }}>
                  Persons Count <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <input
                  type="number"
                  className="erp-input"
                  value={personCount}
                  onChange={(e) => setPersonCount(e.target.value)}
                  placeholder="1"
                  min="1"
                  max="50"
                  style={{ width: '100%', fontWeight: 800, backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }}
                  required
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Duration (Months) <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <select
                  className="erp-input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  style={{ width: '100%', fontWeight: 700 }}
                >
                  <option value="9">9 Months</option>
                  <option value="10">10 Months</option>
                  <option value="11">11 Months</option>
                  <option value="12">12 Months</option>
                  <option value="6">6 Months</option>
                </select>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1.5fr' }, gap: 1.2, mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Start Month <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <input
                  type="month"
                  className="erp-input"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  style={{ width: '100%', fontWeight: 700 }}
                  required
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Due Day (1-31) <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <input
                  type="number"
                  className="erp-input"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="10"
                  min="1"
                  max="31"
                  style={{ width: '100%', fontWeight: 700 }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Bonus / Gift Details (Optional)
                </Typography>
                <input
                  type="text"
                  className="erp-input"
                  value={bonusDetails || giftDetails}
                  onChange={(e) => {
                    setBonusDetails(e.target.value);
                    setGiftDetails(e.target.value);
                  }}
                  placeholder="e.g. Free Sweet Box + Cracker Gift Pack"
                  style={{ width: '100%' }}
                />
              </Box>
            </Box>

            {/* Dynamic Amount Calculation Display Card */}
            <Box
              sx={{
                p: 1.5,
                bgcolor: '#FFFBEB',
                border: '1.5px solid #FCD34D',
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                <CalculateRoundedIcon sx={{ fontSize: 18, color: '#B45309' }} />
                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>
                  Automatic Calculation Summary
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                  gap: 1.2,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ p: 1, bgcolor: '#FFFFFF', borderRadius: '4px', border: '1px solid #FDE68A' }}>
                  <Typography sx={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>
                    RATE PER PERSON
                  </Typography>
                  <Typography sx={{ fontSize: '15px', color: '#0F172A', fontWeight: 800, mt: 0.2 }}>
                    ₹{parsedAmt.toLocaleString('en-IN')}
                  </Typography>
                </Box>

                <Box sx={{ p: 1, bgcolor: '#FFFFFF', borderRadius: '4px', border: '1px solid #FDE68A' }}>
                  <Typography sx={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>
                    PERSONS ENROLLED
                  </Typography>
                  <Typography sx={{ fontSize: '15px', color: '#1E40AF', fontWeight: 800, mt: 0.2 }}>
                    {parsedPersons} {parsedPersons === 1 ? 'Person' : 'Persons'}
                  </Typography>
                </Box>

                <Box sx={{ p: 1, bgcolor: '#FEF3C7', borderRadius: '4px', border: '1px solid #F59E0B' }}>
                  <Typography sx={{ fontSize: '10.5px', color: '#92400E', fontWeight: 800 }}>
                    MONTHLY INSTALLMENT
                  </Typography>
                  <Typography sx={{ fontSize: '16px', color: '#B45309', fontWeight: 900, mt: 0.2 }}>
                    ₹{totalMonthlyInstallment.toLocaleString('en-IN')}
                  </Typography>
                  <Typography sx={{ fontSize: '9.5px', color: '#78350F' }}>
                    (₹{parsedAmt.toLocaleString('en-IN')} × {parsedPersons})
                  </Typography>
                </Box>

                <Box sx={{ p: 1, bgcolor: '#DCFCE7', borderRadius: '4px', border: '1px solid #86EFAC' }}>
                  <Typography sx={{ fontSize: '10.5px', color: '#15803D', fontWeight: 800 }}>
                    TOTAL CHIT VALUE
                  </Typography>
                  <Typography sx={{ fontSize: '16px', color: '#166534', fontWeight: 900, mt: 0.2 }}>
                    ₹{totalChitValue.toLocaleString('en-IN')}
                  </Typography>
                  <Typography sx={{ fontSize: '9.5px', color: '#14532D' }}>
                    (₹{totalMonthlyInstallment.toLocaleString('en-IN')} × {parsedDuration} Mos)
                  </Typography>
                </Box>
              </Box>
            </Box>
          </fieldset>

          {/* Section 3: Notes (Optional) */}
          <Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
              Customer Remarks / Notes (Optional)
            </Typography>
            <input
              type="text"
              className="erp-input"
              placeholder="Any additional remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%' }}
            />
          </Box>
        </DialogContent>

        {/* Footer */}
        <DialogActions sx={{ p: 1.5, backgroundColor: '#F8FAFC', borderTop: '1px solid #CBD5E1', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              Combined Monthly: <strong style={{ color: '#1E40AF' }}>₹{totalMonthlyInstallment.toLocaleString('en-IN')}</strong> • Value: <strong style={{ color: '#16A34A' }}>₹{totalChitValue.toLocaleString('en-IN')}</strong>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button onClick={handleClose} disabled={loading} sx={{ color: '#64748B', fontSize: '12.5px', textTransform: 'none', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <PersonAddAlt1RoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                backgroundColor: '#1E3A8A',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'none',
                px: 2.8,
                borderRadius: '4px',
                boxShadow: 'none',
                '&:hover': { backgroundColor: '#1E40AF', boxShadow: '0 2px 6px rgba(30,58,138,0.3)' },
              }}
            >
              {loading ? 'Registering & Allocating...' : 'Register Customer & Allocate Scheme'}
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
