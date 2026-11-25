import React, { useState, useEffect, useMemo } from 'react';
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
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import {
  ChitsApi,
  type ChitCustomerItem,
  type ChitAllocationItem,
  type ChitInstallmentItem,
  type ChitPaymentItem,
  type ChitReceiptItem,
} from '../../services/chitApi';

interface RecordChitPaymentModalProps {
  open: boolean;
  onClose: () => void;
  customer: ChitCustomerItem | null;
  allocations: ChitAllocationItem[];
  preselectedAllocationId?: string;
  preselectedInstallmentNumber?: number;
  onPaymentSuccess: (payment: ChitPaymentItem, receipt: ChitReceiptItem) => void;
}

export const RecordChitPaymentModal: React.FC<RecordChitPaymentModalProps> = ({
  open,
  onClose,
  customer,
  allocations,
  preselectedAllocationId,
  preselectedInstallmentNumber,
  onPaymentSuccess,
}) => {
  const [selectedAllocId, setSelectedAllocId] = useState<string>('');
  const [selectedInstNum, setSelectedInstNum] = useState<number>(1);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Find active allocations
  const activeAllocations = useMemo(() => {
    return allocations.filter((a) => a.status !== 'Closed');
  }, [allocations]);

  // Synchronize selected allocation
  useEffect(() => {
    if (preselectedAllocationId) {
      setSelectedAllocId(preselectedAllocationId);
    } else if (activeAllocations.length > 0 && !selectedAllocId) {
      setSelectedAllocId(activeAllocations[0].allocationId);
    }
  }, [preselectedAllocationId, activeAllocations]);

  const currentAllocation = useMemo(() => {
    return activeAllocations.find((a) => a.allocationId === selectedAllocId) || activeAllocations[0] || null;
  }, [activeAllocations, selectedAllocId]);

  // Available installments in current allocation
  const installments: ChitInstallmentItem[] = useMemo(() => {
    return currentAllocation ? currentAllocation.installments || [] : [];
  }, [currentAllocation]);

  // Synchronize selected installment
  useEffect(() => {
    if (preselectedInstallmentNumber) {
      setSelectedInstNum(preselectedInstallmentNumber);
    } else if (installments.length > 0) {
      // Pick first unpaid or partial installment
      const firstPending = installments.find((i) => i.status !== 'Paid');
      if (firstPending) {
        setSelectedInstNum(firstPending.installmentNumber);
      } else {
        setSelectedInstNum(installments[0].installmentNumber);
      }
    }
  }, [preselectedInstallmentNumber, installments]);

  const currentInstallment = useMemo(() => {
    return installments.find((i) => i.installmentNumber === selectedInstNum) || installments[0] || null;
  }, [installments, selectedInstNum]);

  // Auto-populate amount received with remaining balance
  useEffect(() => {
    if (currentInstallment) {
      const rem = currentInstallment.remainingAmount;
      setAmountReceived(String(rem > 0 ? rem : currentInstallment.amountDue));
    }
  }, [currentInstallment]);

  // Compute live timing prediction (Hook must be called unconditionally before any early return)
  const timingPrediction = useMemo(() => {
    if (!currentInstallment || !paymentDate) return 'On Time';
    const pDate = new Date(paymentDate);
    const dDate = new Date(currentInstallment.dueDate);

    if (pDate.getFullYear() < dDate.getFullYear() || (pDate.getFullYear() === dDate.getFullYear() && pDate.getMonth() < dDate.getMonth())) {
      return 'Advance';
    }
    const endOfDue = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate(), 23, 59, 59);
    if (pDate.getTime() <= endOfDue.getTime()) {
      return 'On Time';
    }
    return 'Delay';
  }, [currentInstallment, paymentDate]);

  if (!open || !customer) return null;

  // Real-time calculation of remaining balance & timing
  const remBal = currentInstallment ? currentInstallment.remainingAmount : 0;
  const parsedReceived = parseFloat(amountReceived) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentAllocation) {
      setErrorMsg('Please select a valid chit scheme');
      return;
    }
    if (!currentInstallment) {
      setErrorMsg('Please select a valid installment');
      return;
    }
    if (parsedReceived <= 0) {
      setErrorMsg('Payment amount must be greater than 0');
      return;
    }
    if (parsedReceived > remBal) {
      setErrorMsg(`Amount cannot exceed the remaining balance of ₹${remBal}. Overpayment is prohibited.`);
      return;
    }

    setLoading(true);
    try {
      const result = await ChitsApi.recordPayment({
        chitCustomerId: customer.chitCustomerId,
        allocationId: currentAllocation.allocationId,
        installmentNumber: currentInstallment.installmentNumber,
        amountReceived: parsedReceived,
        paymentDate,
        paymentMode,
        transactionReference: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onPaymentSuccess(result.payment, result.receipt);
      onClose();
    } catch (err: any) {
      console.error('Payment failed:', err);
      setErrorMsg(err.message || 'Failed to record payment');
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
            borderRadius: '8px',
            overflow: 'hidden',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            width: { xs: '95vw', sm: '720px', md: '800px' },
            maxWidth: '840px',
          },
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
          maxHeight: '92vh',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <Box
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            px: 2.5,
            py: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaymentsRoundedIcon sx={{ fontSize: 19, color: '#059669' }} />
            <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Record Monthly Chit Payment
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} disabled={loading} sx={{ color: '#475569', p: 0.3 }}>
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <DialogContent
          dividers
          sx={{
            p: 2.5,
            backgroundColor: '#FFFFFF',
            overflowY: 'auto',
            flex: '1 1 auto',
            minHeight: 0,
          }}
        >
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 1.5, fontSize: '12px', py: 0.2 }}>
              {errorMsg}
            </Alert>
          )}

          {/* Customer Read-Only Identity Card */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.2,
              mb: 1.5,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Customer (Read-Only)
              </Typography>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                {customer.name}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                ID: <strong>{customer.chitCustomerId}</strong> • Phone: {customer.mobile}
              </Typography>
            </Box>

            {currentAllocation && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>
                  Persons Enrolled
                </Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#741748' }}>
                  {currentAllocation.personCount} Person(s)
                </Typography>
              </Box>
            )}
          </Box>

          {/* Allocation & Installment Selection */}
          <fieldset className="erp-fieldset" style={{ marginBottom: '12px' }}>
            <legend className="erp-legend">Select Scheme & Month</legend>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2 }}>
              {/* Scheme Dropdown */}
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Select Chit Scheme <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedAllocId}
                    onChange={(e) => setSelectedAllocId(e.target.value)}
                    sx={{ fontSize: '12.5px', fontWeight: 700, height: '32px' }}
                  >
                    {activeAllocations.map((a) => (
                      <MenuItem key={a.allocationId} value={a.allocationId} sx={{ fontSize: '12.5px' }}>
                        {a.schemeName} ({a.personCount}p • ₹{a.totalMonthlyAmount}/mo)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Installment Month Dropdown */}
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Payment Month / Installment <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedInstNum}
                    onChange={(e) => setSelectedInstNum(Number(e.target.value))}
                    sx={{ fontSize: '12.5px', fontWeight: 700, height: '32px' }}
                  >
                    {installments.map((i) => (
                      <MenuItem key={i.installmentNumber} value={i.installmentNumber} sx={{ fontSize: '12.5px' }}>
                        {i.monthLabel} — Due: ₹{i.remainingAmount} ({i.status})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Installment Status Card */}
            {currentInstallment && (
              <Box
                sx={{
                  mt: 1.2,
                  p: 1,
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                }}
              >
                <Box>
                  <span style={{ color: '#64748B' }}>Due Date:</span>{' '}
                  <strong style={{ color: '#0F172A' }}>{currentInstallment.dueDateStr}</strong> •{' '}
                  <span style={{ color: '#64748B' }}>Status:</span>{' '}
                  <strong style={{ color: currentInstallment.status === 'Paid' ? '#059669' : '#DC2626' }}>
                    {currentInstallment.status}
                  </strong>
                </Box>
                <Box>
                  <span style={{ color: '#64748B' }}>Outstanding Due:</span>{' '}
                  <strong style={{ fontSize: '13px', color: '#DC2626' }}>
                    ₹{currentInstallment.remainingAmount.toLocaleString('en-IN')}
                  </strong>
                </Box>
              </Box>
            )}
          </fieldset>

          {/* Payment Entry Form */}
          <fieldset className="erp-fieldset">
            <legend className="erp-legend">Payment Transaction Details</legend>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2, mb: 1.2 }}>
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Amount Received (₹) <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <input
                  type="number"
                  step="any"
                  className="erp-input"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="₹ Amount"
                  style={{ width: '100%', fontSize: '14px', fontWeight: 800, color: '#059669' }}
                  required
                />
                <Typography sx={{ fontSize: '10px', color: '#64748B', mt: 0.3 }}>
                  (Max allowable: ₹{remBal.toLocaleString('en-IN')})
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Payment Date <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <input
                  type="date"
                  className="erp-input"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{ width: '100%', height: '32px' }}
                  required
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2, mb: 1.2 }}>
              {/* Payment Mode */}
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Payment Mode
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    sx={{ fontSize: '12px', fontWeight: 700, height: '32px' }}
                  >
                    <MenuItem value="Cash" sx={{ fontSize: '12px' }}>Cash</MenuItem>
                    <MenuItem value="UPI" sx={{ fontSize: '12px' }}>UPI (GPay / PhonePe / Paytm)</MenuItem>
                    <MenuItem value="Bank Transfer" sx={{ fontSize: '12px' }}>Bank Transfer (NEFT / IMPS)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Transaction Ref */}
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                  Transaction Ref / UTR No (Optional)
                </Typography>
                <input
                  type="text"
                  className="erp-input"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UPI Ref / Cheque No"
                  style={{ width: '100%' }}
                />
              </Box>
            </Box>

            {/* Timing Status Badge */}
            <Box
              sx={{
                p: 1,
                mb: 1,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography sx={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                Automatic Timing Status:
              </Typography>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.2,
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color:
                    timingPrediction === 'On Time'
                      ? '#059669'
                      : timingPrediction === 'Advance'
                      ? '#2563EB'
                      : '#DC2626',
                  backgroundColor:
                    timingPrediction === 'On Time'
                      ? '#ECFDF5'
                      : timingPrediction === 'Advance'
                      ? '#EFF6FF'
                      : '#FEF2F2',
                  border: `1px solid ${
                    timingPrediction === 'On Time'
                      ? '#10B981'
                      : timingPrediction === 'Advance'
                      ? '#60A5FA'
                      : '#F87171'
                  }`,
                }}
              >
                {timingPrediction}
              </Box>
            </Box>

            {/* Notes */}
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.3 }}>
                Payment Notes / Remarks (Optional)
              </Typography>
              <input
                type="text"
                className="erp-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                style={{ width: '100%' }}
              />
            </Box>
          </fieldset>
        </DialogContent>

        {/* Footer */}
        <DialogActions sx={{ p: 1.8, px: 2.5, backgroundColor: '#F8FAFC', borderTop: '1px solid #CBD5E1', flexShrink: 0 }}>
          <Button onClick={onClose} disabled={loading} sx={{ color: '#64748B', fontSize: '12px', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || parsedReceived <= 0 || parsedReceived > remBal}
            startIcon={
              loading ? <CircularProgress size={14} color="inherit" /> : <ReceiptLongRoundedIcon sx={{ fontSize: 17 }} />
            }
            sx={{
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              textTransform: 'none',
              px: 2.5,
              '&:hover': { backgroundColor: '#047857' },
            }}
          >
            {loading ? 'Recording...' : 'Save Payment & Generate Receipt'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
