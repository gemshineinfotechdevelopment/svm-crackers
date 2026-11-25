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
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import { ChitsApi, type ChitCustomerItem, type ChitAllocationItem, type ChitSchemeItem } from '../../services/chitApi';

interface AllocateChitSchemeModalProps {
  open: boolean;
  onClose: () => void;
  customer: ChitCustomerItem | null;
  onSuccess: (newAllocations: ChitAllocationItem[]) => void;
}

interface PendingSchemeItem {
  schemeName: string;
  monthlyAmountPerPerson: number;
  personCount: number;
  totalMonthlyAmount: number;
  duration: number;
  startMonth: string;
  dueDay: number;
  totalChitValue: number;
  bonusDetails?: string;
  giftDetails?: string;
}

export const AllocateChitSchemeModal: React.FC<AllocateChitSchemeModalProps> = ({
  open,
  onClose,
  customer,
  onSuccess,
}) => {
  // Current Scheme Form state
  const [schemeName, setSchemeName] = useState('Deepavali 2026 Scheme');
  const [amountPerPerson, setAmountPerPerson] = useState('3000');
  const [personCount, setPersonCount] = useState('1');
  const [duration, setDuration] = useState('10');
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dueDay, setDueDay] = useState('10');
  const [bonusDetails, setBonusDetails] = useState('');
  const [giftDetails, setGiftDetails] = useState('');

  // Queued schemes list for multi-allocation before saving
  const [pendingSchemes, setPendingSchemes] = useState<PendingSchemeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredSchemes, setRegisteredSchemes] = useState<ChitSchemeItem[]>([]);

  useEffect(() => {
    if (open) {
      ChitsApi.getSchemes({ status: 'Active' })
        .then((data) => {
          if (Array.isArray(data)) setRegisteredSchemes(data);
        })
        .catch(() => {});
    }
  }, [open]);

  if (!customer) return null;

  // Real-time calculations for current inputs
  const parsedAmt = Math.max(0, parseFloat(amountPerPerson) || 0);
  const parsedPersons = Math.max(1, parseInt(personCount, 10) || 1);
  const parsedDuration = Math.max(1, parseInt(duration, 10) || 10);
  const currentMonthlyTotal = Math.round(parsedAmt * parsedPersons * 100) / 100;
  const currentTotalChitValue = Math.round(currentMonthlyTotal * parsedDuration * 100) / 100;

  // Combined totals across all pending schemes + current unadded if none queued yet
  const combinedSchemes = pendingSchemes.length > 0
    ? pendingSchemes
    : [
        {
          schemeName,
          monthlyAmountPerPerson: parsedAmt,
          personCount: parsedPersons,
          totalMonthlyAmount: currentMonthlyTotal,
          duration: parsedDuration,
          startMonth,
          dueDay: parseInt(dueDay, 10) || 10,
          totalChitValue: currentTotalChitValue,
          bonusDetails,
          giftDetails,
        },
      ];

  const totalCombinedPersons = combinedSchemes.reduce((sum, s) => sum + s.personCount, 0);
  const totalCombinedMonthly = combinedSchemes.reduce((sum, s) => sum + s.totalMonthlyAmount, 0);
  const totalCombinedValue = combinedSchemes.reduce((sum, s) => sum + s.totalChitValue, 0);

  const handleAddSchemeToQueue = () => {
    setErrorMsg('');
    if (!schemeName.trim()) {
      setErrorMsg('Please specify Scheme Name');
      return;
    }
    if (parsedAmt <= 0) {
      setErrorMsg('Monthly installment per person must be greater than 0');
      return;
    }

    const newItem: PendingSchemeItem = {
      schemeName: schemeName.trim(),
      monthlyAmountPerPerson: parsedAmt,
      personCount: parsedPersons,
      totalMonthlyAmount: currentMonthlyTotal,
      duration: parsedDuration,
      startMonth,
      dueDay: parseInt(dueDay, 10) || 10,
      totalChitValue: currentTotalChitValue,
      bonusDetails: bonusDetails.trim(),
      giftDetails: giftDetails.trim(),
    };

    setPendingSchemes((prev) => [...prev, newItem]);
    // Reset inputs for next scheme addition
    setSchemeName('Deepavali Scheme');
    setAmountPerPerson('3000');
    setPersonCount('1');
    setBonusDetails('');
    setGiftDetails('');
  };

  const handleRemovePendingScheme = (idx: number) => {
    setPendingSchemes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAllAllocations = async () => {
    setErrorMsg('');
    let schemesToSave: PendingSchemeItem[] = [];

    if (pendingSchemes.length > 0) {
      schemesToSave = pendingSchemes;
    } else {
      if (!schemeName.trim()) {
        setErrorMsg('Please enter Scheme Name');
        return;
      }
      if (parsedAmt <= 0) {
        setErrorMsg('Monthly installment per person must be greater than 0');
        return;
      }
      schemesToSave = [
        {
          schemeName: schemeName.trim(),
          monthlyAmountPerPerson: parsedAmt,
          personCount: parsedPersons,
          totalMonthlyAmount: currentMonthlyTotal,
          duration: parsedDuration,
          startMonth,
          dueDay: parseInt(dueDay, 10) || 10,
          totalChitValue: currentTotalChitValue,
          bonusDetails: bonusDetails.trim(),
          giftDetails: giftDetails.trim(),
        },
      ];
    }

    setLoading(true);
    try {
      const result = await ChitsApi.allocateSchemes({
        chitCustomerId: customer.chitCustomerId,
        schemes: schemesToSave,
      });

      setPendingSchemes([]);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Failed to allocate chit schemes:', err);
      setErrorMsg(err.message || 'Failed to allocate schemes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '6px',
            overflow: 'hidden',
            maxHeight: '94vh',
          },
        },
      }}
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
          <SavingsRoundedIcon sx={{ fontSize: 20, color: '#741748' }} />
          <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
            Allocate Chit Scheme — {customer.name} ({customer.chitCustomerId})
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={loading} sx={{ color: '#475569', p: 0.3 }}>
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 2, backgroundColor: '#FFFFFF' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 1.5, fontSize: '12px', py: 0.2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Customer Quick Summary Banner */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            p: 1.2,
            mb: 1.5,
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '4px',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
              {customer.name}
            </Typography>
            <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>
              Mobile: <strong>{customer.mobile}</strong> • City: {customer.city || 'Sivakasi'}
            </Typography>
          </Box>
          <Chip
            label={customer.chitCustomerId}
            size="small"
            sx={{ fontWeight: 800, backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}
          />
        </Box>

        {/* Scheme Configuration Fieldset */}
        <fieldset className="erp-fieldset" style={{ marginBottom: '14px' }}>
          <legend className="erp-legend">Configure Scheme Parameters</legend>

          {registeredSchemes.length > 0 && (
            <Box sx={{ mb: 1.5, p: 1, bgcolor: '#FFFDF5', border: '1px solid #FCD34D', borderRadius: '4px' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#78350F', mb: 0.3, textTransform: 'uppercase' }}>
                Quick Select from Schemes Master (Optional Preset)
              </Typography>
              <select
                className="erp-input"
                style={{ width: '100%', fontWeight: 700, backgroundColor: '#FFFFFF', color: '#0F172A', cursor: 'pointer' }}
                onChange={(e) => {
                  const selected = registeredSchemes.find((s) => s.schemeId === e.target.value);
                  if (selected) {
                    setSchemeName(selected.schemeName);
                    setAmountPerPerson(String(selected.monthlyAmount));
                    setDuration(String(selected.durationMonths));
                    setDueDay(String(selected.dueDay));
                    if (selected.startDate) {
                      const ym = selected.startDate.slice(0, 7);
                      if (ym.length === 7) setStartMonth(ym);
                    }
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>-- Choose a registered scheme to auto-fill or enter manually below --</option>
                {registeredSchemes.map((s) => (
                  <option key={s.schemeId} value={s.schemeId}>
                    {s.schemeName} — ₹{s.monthlyAmount.toLocaleString('en-IN')}/mo × {s.durationMonths} Mos = ₹{s.totalValue.toLocaleString('en-IN')} (Due: {s.dueDay}th)
                  </option>
                ))}
              </select>
            </Box>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 1fr' }, gap: 1.2, mb: 1.2 }}>
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                Scheme Name <span style={{ color: '#DC2626' }}>*</span>
              </Typography>
              <input
                type="text"
                className="erp-input"
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
                placeholder="e.g. Deepavali 2026 Scheme"
                style={{ width: '100%', fontWeight: 700 }}
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
                placeholder="₹3000"
                style={{ width: '100%', fontWeight: 800, color: '#741748' }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                Person(s) Count <span style={{ color: '#DC2626' }}>*</span>
              </Typography>
              <input
                type="number"
                min="1"
                className="erp-input"
                value={personCount}
                onChange={(e) => setPersonCount(e.target.value)}
                placeholder="1"
                style={{ width: '100%', fontWeight: 800, textAlign: 'center' }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 1fr' }, gap: 1.2, mb: 1.2 }}>
            {/* Duration Selector */}
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                Duration (Months):
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.6 }}>
                {[9, 10, 11].map((m) => (
                  <Button
                    key={m}
                    size="small"
                    variant={duration === String(m) ? 'contained' : 'outlined'}
                    onClick={() => setDuration(String(m))}
                    sx={{
                      minWidth: '45px',
                      height: '28px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      p: 0,
                      backgroundColor: duration === String(m) ? '#741748' : 'transparent',
                      color: duration === String(m) ? '#FFFFFF' : '#475569',
                      borderColor: '#CBD5E1',
                      '&:hover': {
                        backgroundColor: duration === String(m) ? '#580e34' : '#F1F5F9',
                      },
                    }}
                  >
                    {m} M
                  </Button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="36"
                  className="erp-input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  style={{ width: '60px', textAlign: 'center', height: '28px' }}
                />
              </Box>
            </Box>

            {/* Start Month */}
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                Start Month
              </Typography>
              <input
                type="month"
                className="erp-input"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                style={{ width: '100%' }}
              />
            </Box>

            {/* Due Day */}
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                Due Day of Month
              </Typography>
              <input
                type="number"
                min="1"
                max="28"
                className="erp-input"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="10"
                style={{ width: '100%', textAlign: 'center' }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2 }}>
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                Bonus Details (Optional)
              </Typography>
              <input
                type="text"
                className="erp-input"
                value={bonusDetails}
                onChange={(e) => setBonusDetails(e.target.value)}
                placeholder="e.g. ₹1,000 bonus on prompt payment"
                style={{ width: '100%' }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                Gift Details (Optional)
              </Typography>
              <input
                type="text"
                className="erp-input"
                value={giftDetails}
                onChange={(e) => setGiftDetails(e.target.value)}
                placeholder="e.g. Complimentary gift pack at completion"
                style={{ width: '100%' }}
              />
            </Box>
          </Box>

          {/* Current Scheme Calculation Display Box */}
          <Box
            sx={{
              mt: 1.2,
              p: 1.2,
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '4px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontSize: '10.5px', color: '#1E40AF', fontWeight: 700 }}>
                  Monthly Total
                </Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 900, color: '#1E3A8A' }}>
                  ₹{currentMonthlyTotal.toLocaleString('en-IN')}
                </Typography>
                <Typography sx={{ fontSize: '10.5px', color: '#64748B' }}>
                  (₹{parsedAmt} × {parsedPersons} person{parsedPersons > 1 ? 's' : ''})
                </Typography>
              </Box>

              <Box sx={{ borderLeft: '1px solid #BFDBFE', pl: 2 }}>
                <Typography sx={{ fontSize: '10.5px', color: '#1E40AF', fontWeight: 700 }}>
                  Total Scheme Value
                </Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 900, color: '#059669' }}>
                  ₹{currentTotalChitValue.toLocaleString('en-IN')}
                </Typography>
                <Typography sx={{ fontSize: '10.5px', color: '#64748B' }}>
                  (₹{currentMonthlyTotal} × {parsedDuration} months)
                </Typography>
              </Box>
            </Box>

            <Button
              size="small"
              variant="outlined"
              onClick={handleAddSchemeToQueue}
              startIcon={<AddCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderColor: '#1E40AF',
                color: '#1E40AF',
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { backgroundColor: '#DBEAFE' },
              }}
            >
              + Add Another Scheme
            </Button>
          </Box>
        </fieldset>

        {/* Queued Schemes List Table (if multiple schemes are being added) */}
        {pendingSchemes.length > 0 && (
          <fieldset className="erp-fieldset" style={{ marginBottom: '14px' }}>
            <legend className="erp-legend">Schemes Queued for Allocation ({pendingSchemes.length})</legend>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableCell sx={{ fontSize: '11px', fontWeight: 800 }}>Scheme Name</TableCell>
                  <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800 }}>Persons</TableCell>
                  <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800 }}>Monthly</TableCell>
                  <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800 }}>Duration</TableCell>
                  <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800 }}>Total Value</TableCell>
                  <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, width: '40px' }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingSchemes.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontSize: '12px', fontWeight: 700 }}>{p.schemeName}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 800 }}>{p.personCount}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 700, color: '#1E3A8A' }}>
                      ₹{p.totalMonthlyAmount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: '12px' }}>{p.duration} Mos</TableCell>
                    <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                      ₹{p.totalChitValue.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleRemovePendingScheme(idx)} sx={{ color: '#DC2626', p: 0.2 }}>
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </fieldset>
        )}

        {/* Combined Summary Card */}
        <Box
          sx={{
            p: 1.5,
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #FECACA',
            borderRadius: '4px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>
              Combined Allocation Summary
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#475569', mt: 0.2 }}>
              Total Persons: <strong>{totalCombinedPersons}</strong> • Schemes: <strong>{combinedSchemes.length}</strong>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 3, textAlign: 'right' }}>
            <Box>
              <Typography sx={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>
                Combined Monthly
              </Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 900, color: '#741748' }}>
                ₹{totalCombinedMonthly.toLocaleString('en-IN')}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>
                Total Chit Value
              </Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 900, color: '#059669' }}>
                ₹{totalCombinedValue.toLocaleString('en-IN')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ p: 1.5, backgroundColor: '#F8FAFC', borderTop: '1px solid #CBD5E1' }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: '#64748B', fontSize: '12px', textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveAllAllocations}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <PlaylistAddRoundedIcon sx={{ fontSize: 17 }} />}
          sx={{
            backgroundColor: '#741748',
            color: '#FFFFFF',
            fontSize: '12.5px',
            fontWeight: 700,
            textTransform: 'none',
            px: 2.5,
            '&:hover': { backgroundColor: '#580e34' },
          }}
        >
          {loading ? 'Allocating Scheme(s)...' : `Confirm & Allocate (${combinedSchemes.length} Scheme${combinedSchemes.length > 1 ? 's' : ''})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
