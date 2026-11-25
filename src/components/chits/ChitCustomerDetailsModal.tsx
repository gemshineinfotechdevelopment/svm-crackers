import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Alert,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import {
  ChitsApi,
  type ChitCustomerItem,
  type ChitAllocationItem,
  type ChitPaymentItem,
  type ChitReceiptItem,
} from '../../services/chitApi';
import { RecordChitPaymentModal } from './RecordChitPaymentModal';
import { ChitReceiptModal } from './ChitReceiptModal';
import { type ChitReceiptData } from './ChitReceiptTemplate';

interface ChitCustomerDetailsModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string | null;
  onDataChanged?: () => void;
}

export const ChitCustomerDetailsModal: React.FC<ChitCustomerDetailsModalProps> = ({
  open,
  onClose,
  customerId,
  onDataChanged,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [customer, setCustomer] = useState<ChitCustomerItem | null>(null);
  const [allocations, setAllocations] = useState<ChitAllocationItem[]>([]);
  const [payments, setPayments] = useState<ChitPaymentItem[]>([]);
  const [summary, setSummary] = useState({
    totalPersons: 0,
    combinedMonthlyAmount: 0,
    totalChitValue: 0,
    totalPaid: 0,
    totalRemaining: 0,
  });

  // Active scheme view tab
  const [activeAllocTab, setActiveAllocTab] = useState<number>(0);
  // View mode tab: "Installment Schedule" vs "Payment Receipts History"
  const [mainViewTab, setMainViewTab] = useState<'schedule' | 'history'>('schedule');

  // Record Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState<boolean>(false);
  const [selectedPayAllocId, setSelectedPayAllocId] = useState<string | undefined>(undefined);
  const [selectedPayInstNum, setSelectedPayInstNum] = useState<number | undefined>(undefined);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<ChitReceiptData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');

  const fetchDetails = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setLoadError('');
    try {
      const data = await ChitsApi.getCustomerCollectionDetails(customerId);
      if (data && data.customer) {
        setCustomer(data.customer);
        setSummary(
          data.summary || {
            totalPersons: 0,
            combinedMonthlyAmount: 0,
            totalChitValue: 0,
            totalPaid: 0,
            totalRemaining: 0,
          }
        );
        setAllocations(data.allocations || []);
        setPayments(data.payments || []);
        setLoadError('');
      } else {
        setLoadError('Customer records not found');
      }
    } catch (err: any) {
      console.error('Failed to load customer details:', err);
      setLoadError(err.message || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (open && customerId) {
      setCustomer(null);
      setLoadError('');
      fetchDetails();
      setActiveAllocTab(0);
      setMainViewTab('schedule');
    }
  }, [open, customerId, fetchDetails]);

  const currentAllocation = useMemo(() => {
    if (allocations.length === 0) return null;
    return allocations[activeAllocTab] || allocations[0];
  }, [allocations, activeAllocTab]);

  const handleOpenPay = (allocId?: string, instNum?: number) => {
    setSelectedPayAllocId(allocId || currentAllocation?.allocationId);
    setSelectedPayInstNum(instNum);
    setPayModalOpen(true);
  };

  const handleOpenReceipt = async (receiptNum: string) => {
    try {
      const rec = await ChitsApi.getReceipt(receiptNum);
      if (rec && rec.receiptDataSnapshot) {
        setActiveReceipt(rec.receiptDataSnapshot as ChitReceiptData);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Could not fetch receipt:', err);
      alert('Could not load receipt details.');
    }
  };

  const handlePaymentSuccess = (_payment: ChitPaymentItem, receipt: ChitReceiptItem) => {
    fetchDetails();
    if (onDataChanged) onDataChanged();
    if (receipt && receipt.receiptDataSnapshot) {
      setActiveReceipt(receipt.receiptDataSnapshot as ChitReceiptData);
      setReceiptModalOpen(true);
    }
  };

  if (!open || !customerId) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '6px',
              overflow: 'hidden',
              minHeight: '80vh',
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
            <CalendarMonthRoundedIcon sx={{ fontSize: 20, color: '#1E3A8A' }} />
            <Typography sx={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
              Customer Chit Collection Details — {customer?.name || 'Loading...'} ({customer?.chitCustomerId})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Refresh Details" arrow>
              <IconButton size="small" onClick={fetchDetails} sx={{ color: '#1E3A8A', p: 0.4 }}>
                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: '#475569', p: 0.3 }}>
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        <DialogContent sx={{ p: 2, backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '350px', gap: 1.5 }}>
              <CircularProgress size={32} sx={{ color: '#741748' }} />
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>
                Loading Chit Collection Details...
              </Typography>
            </Box>
          ) : loadError ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '250px', gap: 1.5 }}>
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={fetchDetails}>
                    Retry
                  </Button>
                }
              >
                {loadError}
              </Alert>
            </Box>
          ) : !customer ? (
            <Typography sx={{ color: '#DC2626', textAlign: 'center', py: 4 }}>
              Customer records could not be loaded.
            </Typography>
          ) : (
            <>
              {/* 1. Customer Information & Combined Financial Overview */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1.2fr 2fr' },
                  gap: 1.5,
                  mb: 2,
                }}
              >
                {/* Customer Identity Card */}
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', mb: 0.5 }}>
                    Customer Profile
                  </Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                    {customer.name}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#1E3A8A' }}>
                    Chit ID: {customer.chitCustomerId}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#475569', mt: 0.2 }}>
                    Mobile: <strong>{customer.mobile}</strong>
                    {customer.whatsapp && ` • WA: ${customer.whatsapp}`}
                  </Typography>
                  {(customer.address || customer.city) && (
                    <Typography sx={{ fontSize: '11.5px', color: '#64748B', mt: 0.2 }}>
                      Address: {[customer.address, customer.city].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  {customer.notes && (
                    <Typography sx={{ fontSize: '11px', color: '#786C58', fontStyle: 'italic', mt: 0.5 }}>
                      Note: {customer.notes}
                    </Typography>
                  )}
                </Box>

                {/* Combined Financial Summary Counters */}
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#741748', textTransform: 'uppercase' }}>
                      Combined Chit Financials ({allocations.length} Scheme{allocations.length > 1 ? 's' : ''})
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleOpenPay()}
                      startIcon={<PaymentsRoundedIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        textTransform: 'none',
                        height: '28px',
                        '&:hover': { backgroundColor: '#047857' },
                      }}
                    >
                      Record Payment
                    </Button>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
                    <Box sx={{ p: 1, backgroundColor: '#F8FAFC', borderRadius: '3px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>Total Persons</Typography>
                      <Typography sx={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>{summary.totalPersons}</Typography>
                    </Box>
                    <Box sx={{ p: 1, backgroundColor: '#F8FAFC', borderRadius: '3px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>Monthly Due</Typography>
                      <Typography sx={{ fontSize: '15px', fontWeight: 900, color: '#1E3A8A' }}>
                        ₹{summary.combinedMonthlyAmount.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1, backgroundColor: '#F8FAFC', borderRadius: '3px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>Total Chit Value</Typography>
                      <Typography sx={{ fontSize: '15px', fontWeight: 900, color: '#741748' }}>
                        ₹{summary.totalChitValue.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1, backgroundColor: '#F0FDF4', borderRadius: '3px', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>Total Paid</Typography>
                      <Typography sx={{ fontSize: '15px', fontWeight: 900, color: '#16A34A' }}>
                        ₹{summary.totalPaid.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1, backgroundColor: '#FEF2F2', borderRadius: '3px', border: '1px solid #FECACA', textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '10px', color: '#DC2626', fontWeight: 700 }}>Pending Due</Typography>
                      <Typography sx={{ fontSize: '15px', fontWeight: 900, color: '#DC2626' }}>
                        ₹{summary.totalRemaining.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* 2. Sub-Navigation: Installment Tracking vs Payment Receipts History */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #CBD5E1', mb: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={mainViewTab === 'schedule' ? 'contained' : 'text'}
                    onClick={() => setMainViewTab('schedule')}
                    startIcon={<CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      fontSize: '12px',
                      fontWeight: 800,
                      textTransform: 'none',
                      backgroundColor: mainViewTab === 'schedule' ? '#1E3A8A' : 'transparent',
                      color: mainViewTab === 'schedule' ? '#FFFFFF' : '#475569',
                      borderRadius: '4px 4px 0 0',
                    }}
                  >
                    Monthly Installments Tracking
                  </Button>
                  <Button
                    size="small"
                    variant={mainViewTab === 'history' ? 'contained' : 'text'}
                    onClick={() => setMainViewTab('history')}
                    startIcon={<HistoryRoundedIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      fontSize: '12px',
                      fontWeight: 800,
                      textTransform: 'none',
                      backgroundColor: mainViewTab === 'history' ? '#1E3A8A' : 'transparent',
                      color: mainViewTab === 'history' ? '#FFFFFF' : '#475569',
                      borderRadius: '4px 4px 0 0',
                    }}
                  >
                    Payment History & Receipts ({payments.length})
                  </Button>
                </Box>
              </Box>

              {/* View 1: Monthly Installment Tracking Table */}
              {mainViewTab === 'schedule' && (
                <>
                  {/* Scheme Tabs if Customer has multiple schemes */}
                  {allocations.length > 1 && (
                    <Tabs
                      value={activeAllocTab}
                      onChange={(_, v) => setActiveAllocTab(v)}
                      sx={{
                        minHeight: '32px',
                        mb: 1.5,
                        '& .MuiTab-root': {
                          minHeight: '32px',
                          py: 0.3,
                          px: 1.5,
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'none',
                        },
                      }}
                    >
                      {allocations.map((a) => (
                        <Tab
                          key={a.allocationId}
                          label={`${a.schemeName} (${a.personCount}p • ₹${a.totalMonthlyAmount})`}
                        />
                      ))}
                    </Tabs>
                  )}

                  {currentAllocation ? (
                    <Box sx={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', overflow: 'hidden' }}>
                      {/* Scheme Quick Bar */}
                      <Box
                        sx={{
                          p: 1.2,
                          backgroundColor: '#F1F5F9',
                          borderBottom: '1px solid #E2E8F0',
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            {currentAllocation.schemeName} ({currentAllocation.allocationId})
                          </Typography>
                          <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                            {currentAllocation.personCount} Person(s) • ₹{currentAllocation.monthlyAmountPerPerson} / person • {currentAllocation.duration} Months • Status: <strong>{currentAllocation.status}</strong>
                          </Typography>
                        </Box>
                        {currentAllocation.bonusDetails && (
                          <Typography sx={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                            🎁 {currentAllocation.bonusDetails}
                          </Typography>
                        )}
                      </Box>

                      {/* Month-Wise Installment Table */}
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                            <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Month</TableCell>
                            <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Due Date</TableCell>
                            <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Amount Due</TableCell>
                            <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800, color: '#059669', py: 1 }}>Paid Amount</TableCell>
                            <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', py: 1 }}>Remaining Due</TableCell>
                            <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Last Payment</TableCell>
                            <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Status</TableCell>
                            <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1, width: '130px' }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(currentAllocation.installments || []).map((inst) => {
                            const isPaid = inst.status === 'Paid';
                            const isPartial = inst.status === 'Partial';
                            const statusColor = isPaid ? '#059669' : isPartial ? '#D97706' : '#DC2626';
                            const statusBg = isPaid ? '#ECFDF5' : isPartial ? '#FFFBEB' : '#FEF2F2';

                            return (
                              <TableRow
                                key={inst.installmentNumber}
                                sx={{
                                  '&:hover': { backgroundColor: '#F8FAFC' },
                                  borderBottom: '1px solid #F1F5F9',
                                }}
                              >
                                <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                                  {inst.monthLabel}
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', color: '#475569' }}>
                                  {inst.dueDateStr}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 700 }}>
                                  ₹{inst.amountDue.toLocaleString('en-IN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 800, color: '#059669' }}>
                                  ₹{inst.paidAmount.toLocaleString('en-IN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 800, color: inst.remainingAmount > 0 ? '#DC2626' : '#64748B' }}>
                                  ₹{inst.remainingAmount.toLocaleString('en-IN')}
                                </TableCell>
                                <TableCell sx={{ fontSize: '11.5px', color: '#64748B' }}>
                                  {inst.lastPaymentDateStr || '-'}
                                </TableCell>
                                <TableCell align="center">
                                  <Box
                                    sx={{
                                      display: 'inline-block',
                                      px: 1.2,
                                      py: 0.2,
                                      borderRadius: '10px',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      color: statusColor,
                                      backgroundColor: statusBg,
                                      border: `1px solid ${statusColor}`,
                                    }}
                                  >
                                    {inst.status}
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {!isPaid ? (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => handleOpenPay(currentAllocation.allocationId, inst.installmentNumber)}
                                      startIcon={<PaymentsRoundedIcon sx={{ fontSize: 13 }} />}
                                      sx={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        height: '24px',
                                        backgroundColor: '#059669',
                                        textTransform: 'none',
                                        px: 1,
                                        '&:hover': { backgroundColor: '#047857' },
                                      }}
                                    >
                                      Pay Due
                                    </Button>
                                  ) : (
                                    <Typography sx={{ fontSize: '11px', color: '#059669', fontWeight: 800 }}>
                                      ✓ Complete
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '4px' }}>
                      <Typography sx={{ color: '#64748B', fontSize: '13px' }}>
                        No chit schemes allocated to this customer yet.
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {/* View 2: Payment History & Receipts Table */}
              {mainViewTab === 'history' && (
                <Box sx={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800 }}>Receipt #</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800 }}>Payment Month</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800 }}>Payment Date</TableCell>
                        <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800, color: '#059669' }}>Amount Received</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800 }}>Mode</TableCell>
                        <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800 }}>Timing</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800 }}>Transaction Ref</TableCell>
                        <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, width: '110px' }}>Receipt</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#64748B' }}>
                            No payment history found for this customer.
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((p) => {
                          const timingColor =
                            p.paymentTimingStatus === 'On Time'
                              ? '#059669'
                              : p.paymentTimingStatus === 'Advance'
                              ? '#2563EB'
                              : '#DC2626';
                          const timingBg =
                            p.paymentTimingStatus === 'On Time'
                              ? '#ECFDF5'
                              : p.paymentTimingStatus === 'Advance'
                              ? '#EFF6FF'
                              : '#FEF2F2';

                          return (
                            <TableRow key={p.paymentId} sx={{ '&:hover': { backgroundColor: '#F8FAFC' } }}>
                              <TableCell sx={{ fontSize: '12.5px', fontWeight: 800, color: '#741748' }}>
                                {p.receiptId}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', fontWeight: 700 }}>
                                {p.paymentMonth}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', color: '#475569' }}>
                                {p.paymentDateStr}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '13px', fontWeight: 900, color: '#059669' }}>
                                ₹{p.amountReceived?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>
                                {p.paymentMode}
                              </TableCell>
                              <TableCell align="center">
                                <Box
                                  sx={{
                                    display: 'inline-block',
                                    px: 1,
                                    py: 0.15,
                                    borderRadius: '10px',
                                    fontSize: '10.5px',
                                    fontWeight: 800,
                                    color: timingColor,
                                    backgroundColor: timingBg,
                                    border: `1px solid ${timingColor}`,
                                  }}
                                >
                                  {p.paymentTimingStatus}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize: '11.5px', color: '#64748B' }}>
                                {p.transactionReference || '-'}
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleOpenReceipt(p.receiptId)}
                                  startIcon={<ReceiptLongRoundedIcon sx={{ fontSize: 13 }} />}
                                  sx={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    height: '24px',
                                    borderColor: '#93C5FD',
                                    color: '#1E3A8A',
                                    textTransform: 'none',
                                    px: 1,
                                    '&:hover': { backgroundColor: '#EFF6FF' },
                                  }}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        {/* Footer */}
        <DialogActions sx={{ p: 1.5, backgroundColor: '#F8FAFC', borderTop: '1px solid #CBD5E1' }}>
          <Button onClick={onClose} sx={{ color: '#64748B', fontSize: '12px', textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Payment Modal */}
      <RecordChitPaymentModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        customer={customer}
        allocations={allocations}
        preselectedAllocationId={selectedPayAllocId}
        preselectedInstallmentNumber={selectedPayInstNum}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Official Receipt Modal */}
      <ChitReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={activeReceipt}
      />
    </>
  );
};
