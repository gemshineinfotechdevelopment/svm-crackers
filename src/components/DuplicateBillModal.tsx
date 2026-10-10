import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Chip,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import { CustomersApi, ParticularsApi } from '../services/api';

export interface TargetCustomerItem {
  id: string;
  name: string;
  phone?: string;
  mobile?: string;
  address?: string;
  gst?: string;
  aadhar?: string;
}

interface DuplicateBillModalProps {
  open: boolean;
  onClose: () => void;
  templateBill: any;
  mode: 'ESTIMATE' | 'QUOTATION' | 'GST';
  selectedYear?: number;
  onSuccess?: (createdBills: any[]) => void;
}

export const DuplicateBillModal: FC<DuplicateBillModalProps> = ({
  open,
  onClose,
  templateBill,
  mode,
  selectedYear = new Date().getFullYear(),
  onSuccess,
}) => {
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Target customers list to generate bills for
  const [targetCustomers, setTargetCustomers] = useState<TargetCustomerItem[]>([]);

  // Single customer quick add form state
  const [selectedExistingCustomer, setSelectedExistingCustomer] = useState<any | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualGst, setManualGst] = useState('');

  // Bulk picker modal state
  const [bulkPickerOpen, setBulkPickerOpen] = useState(false);
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Starting next bill number for projected preview
  const [startingBillNo, setStartingBillNo] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState<{ count: number; billNos: string[] } | null>(null);

  // Load existing customers & next bill number when modal opens
  useEffect(() => {
    if (!open) {
      setTargetCustomers([]);
      setSuccessResult(null);
      setErrorMsg('');
      setSelectedCustomerIds([]);
      return;
    }

    const loadData = async () => {
      setLoadingCustomers(true);
      try {
        const [custRes, billNoRes] = await Promise.all([
          CustomersApi.getAll(selectedYear).catch(() => []),
          ParticularsApi.getNextBillNo(mode === 'GST' ? 'GST' : (mode === 'QUOTATION' ? 'QUOTATION' : 'REGULAR'), selectedYear).catch(() => ({ nextBillNo: '1001' })),
        ]);

        if (Array.isArray(custRes)) {
          setExistingCustomers(custRes);
        }

        const rawNext = billNoRes?.nextBillNo || '1001';
        setStartingBillNo(rawNext);
      } catch (e) {
        console.warn('Failed to load customers or next bill no in duplicate modal', e);
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadData();
  }, [open, mode, selectedYear]);

  // Add a single customer to target list
  const handleAddSingleCustomer = () => {
    const name = manualName.trim();
    if (!name) {
      setErrorMsg('Please enter customer name');
      return;
    }

    const newItem: TargetCustomerItem = {
      id: `target_${Date.now()}_${Math.random()}`,
      name,
      phone: manualPhone.trim(),
      mobile: manualPhone.trim(),
      address: manualAddress.trim(),
      gst: manualGst.trim(),
    };

    setTargetCustomers((prev) => [...prev, newItem]);
    setManualName('');
    setManualPhone('');
    setManualAddress('');
    setManualGst('');
    setSelectedExistingCustomer(null);
    setErrorMsg('');
  };

  // Add selected from autocomplete
  const handleSelectAutocomplete = (_: any, opt: any | null) => {
    setSelectedExistingCustomer(opt);
    if (opt) {
      setManualName(opt.name || '');
      setManualPhone(opt.mobile && opt.mobile !== '-' ? opt.mobile : '');
      setManualAddress(opt.address && opt.address !== '-' ? opt.address : '');
      setManualGst(opt.gst && opt.gst !== 'N/A' ? opt.gst : '');
    }
  };

  // Bulk Picker Filter
  const filteredExistingCustomers = useMemo(() => {
    if (!bulkSearchTerm.trim()) return existingCustomers;
    const term = bulkSearchTerm.toLowerCase();
    return existingCustomers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.mobile && c.mobile.toLowerCase().includes(term)) ||
        (c.address && c.address.toLowerCase().includes(term)) ||
        (c.idCode && c.idCode.toLowerCase().includes(term))
    );
  }, [existingCustomers, bulkSearchTerm]);

  // Toggle selection in bulk picker
  const handleToggleCustomerSelection = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all filtered in bulk picker
  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredExistingCustomers.map((c) => c._id || c.id);
    const areAllSelected = allFilteredIds.every((id) => selectedCustomerIds.includes(id));
    if (areAllSelected) {
      setSelectedCustomerIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedCustomerIds, ...allFilteredIds]));
      setSelectedCustomerIds(merged);
    }
  };

  // Apply selected customers from bulk picker to target list
  const handleApplyBulkPicker = () => {
    const selectedObjs = existingCustomers.filter((c) =>
      selectedCustomerIds.includes(c._id || c.id)
    );

    const newTargets: TargetCustomerItem[] = selectedObjs.map((c) => ({
      id: `target_${c._id || c.id}_${Date.now()}_${Math.random()}`,
      name: c.name || '',
      phone: c.mobile && c.mobile !== '-' ? c.mobile : '',
      mobile: c.mobile && c.mobile !== '-' ? c.mobile : '',
      address: c.address && c.address !== '-' ? c.address : '',
      gst: c.gst && c.gst !== 'N/A' ? c.gst : '',
      aadhar: c.aadhar || '',
    }));

    setTargetCustomers((prev) => [...prev, ...newTargets]);
    setBulkPickerOpen(false);
    setSelectedCustomerIds([]);
    setBulkSearchTerm('');
  };

  // Remove a customer from target list
  const handleRemoveTarget = (id: string) => {
    setTargetCustomers((prev) => prev.filter((t) => t.id !== id));
  };

  // Compute projected bill numbers
  const projectedList = useMemo(() => {
    let startNum = 1001;
    if (startingBillNo) {
      const parsed = parseInt(startingBillNo.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) startNum = parsed;
    }

    return targetCustomers.map((c, idx) => {
      const currentNum = startNum + idx;
      let billNoStr = String(currentNum);
      if (mode === 'GST') {
        billNoStr = currentNum.toString().padStart(4, '0');
      }
      return {
        ...c,
        projectedBillNo: billNoStr,
      };
    });
  }, [targetCustomers, startingBillNo, mode]);

  // Execute bulk bill generation
  const handleExecuteDuplicate = async () => {
    if (targetCustomers.length === 0) {
      setErrorMsg('Please add at least one customer to duplicate the bill for.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        templateBill,
        customers: targetCustomers,
        year: selectedYear,
      };

      const res = await ParticularsApi.bulkDuplicate(payload);
      if (res && res.success) {
        setSuccessResult({
          count: res.count || targetCustomers.length,
          billNos: res.billNos || [],
        });
        if (onSuccess) {
          onSuccess(res.data || []);
        }
      } else {
        throw new Error(res?.message || 'Failed to create duplicate bills');
      }
    } catch (err: any) {
      console.error('Error in bulk duplicate:', err);
      setErrorMsg(err.message || 'Error occurred while duplicating bills. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const itemCount = (templateBill?.products || []).filter((p: any) => p.particular && p.particular.trim() !== '').length;
  const billTotalStr = templateBill?.total || templateBill?.netAmount || templateBill?.amount || '0.00';

  return (
    <>
      <Dialog
        open={open}
        onClose={submitting ? undefined : onClose}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '6px',
              border: '1px solid #94A3B8',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            },
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            background: 'linear-gradient(180deg, #1E3A8A 0%, #1E40AF 100%)',
            color: '#FFFFFF',
            px: 2,
            py: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ContentCopyRoundedIcon sx={{ fontSize: 20, color: '#93C5FD' }} />
            <Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                Duplicate Bill to Multiple Customers
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#BFDBFE', fontWeight: 500 }}>
                Generate separate bills for multiple customers with auto-incremented bill numbers
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose} disabled={submitting} sx={{ color: '#FFFFFF', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: '#F8FAFC' }}>
          {/* Top Summary Banner */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
              p: 1.2,
              mb: 2,
              bgcolor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '4px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptLongRoundedIcon sx={{ fontSize: 20, color: '#1D4ED8' }} />
              <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#1E3A8A' }}>
                Source Bill Details:
              </Typography>
              <Chip
                label={mode === 'QUOTATION' ? 'QUOTATION' : (mode === 'GST' ? 'TAX BILL (GST)' : 'ESTIMATE')}
                size="small"
                sx={{
                  bgcolor: mode === 'QUOTATION' ? '#FEF3C7' : (mode === 'GST' ? '#E0E7FF' : '#DCFCE7'),
                  color: mode === 'QUOTATION' ? '#92400E' : (mode === 'GST' ? '#3730A3' : '#166534'),
                  fontWeight: 800,
                  fontSize: '11px',
                  height: '22px',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ fontSize: '12px', color: '#334155' }}>
                Items: <strong style={{ color: '#0F172A' }}>{itemCount} products</strong>
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#334155' }}>
                Amount: <strong style={{ color: '#1E40AF', fontSize: '13px' }}>₹{billTotalStr}</strong>
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#334155' }}>
                Next Bill No Starts At: <strong style={{ color: '#047857' }}>#{startingBillNo || '...'}</strong>
              </Typography>
            </Box>
          </Box>

          {/* Success Screen Banner */}
          {successResult ? (
            <Box
              sx={{
                p: 3,
                textAlign: 'center',
                bgcolor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '6px',
                my: 2,
              }}
            >
              <CheckCircleRoundedIcon sx={{ fontSize: 48, color: '#059669', mb: 1 }} />
              <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#065F46', mb: 0.5 }}>
                {successResult.count} Bills Created Successfully!
              </Typography>
              <Typography sx={{ fontSize: '12.5px', color: '#047857', mb: 2 }}>
                Generated Bill Numbers:{' '}
                <strong>{successResult.billNos.map((no) => `#${no}`).join(', ')}</strong>
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={onClose}
                  sx={{
                    bgcolor: '#059669',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 3,
                    '&:hover': { bgcolor: '#047857' },
                  }}
                >
                  Done & Close
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              {errorMsg && (
                <Alert severity="error" sx={{ mb: 1.5, py: 0.2, fontSize: '12px' }} onClose={() => setErrorMsg('')}>
                  {errorMsg}
                </Alert>
              )}

              {/* Add Customers Section */}
              <Box
                sx={{
                  bgcolor: '#FFFFFF',
                  p: 1.5,
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                    1. Add Customers for Duplicate Bills:
                  </Typography>

                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GroupAddRoundedIcon sx={{ fontSize: 15 }} />}
                    onClick={() => setBulkPickerOpen(true)}
                    sx={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'none',
                      height: '26px',
                      color: '#1E40AF',
                      borderColor: '#93C5FD',
                      bgcolor: '#EFF6FF',
                      '&:hover': { bgcolor: '#DBEAFE', borderColor: '#3B82F6' },
                    }}
                  >
                    Bulk Select Existing Customers ({existingCustomers.length})
                  </Button>
                </Box>

                {/* Single Customer Add Row */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: '1.2fr 1fr 1.2fr 1fr auto',
                    },
                    gap: 1,
                    alignItems: 'center',
                  }}
                >
                  {/* Select or Type Name */}
                  <Autocomplete
                    size="small"
                    freeSolo
                    options={existingCustomers}
                    getOptionLabel={(opt: any) => (typeof opt === 'string' ? opt : opt.name || '')}
                    value={selectedExistingCustomer}
                    inputValue={manualName}
                    onInputChange={(_, val) => setManualName(val)}
                    onChange={handleSelectAutocomplete}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search / Enter Name *"
                        label="Customer Name"
                        slotProps={{ inputLabel: { shrink: true, sx: { fontSize: '11px', fontWeight: 600 } } }}
                        sx={{
                          '& .MuiOutlinedInput-root': { height: '32px', fontSize: '12px' },
                        }}
                      />
                    )}
                  />

                  {/* Phone */}
                  <TextField
                    size="small"
                    label="Phone / Mobile"
                    placeholder="Mobile No"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true, sx: { fontSize: '11px', fontWeight: 600 } } }}
                    sx={{ '& .MuiOutlinedInput-root': { height: '32px', fontSize: '12px' } }}
                  />

                  {/* Address */}
                  <TextField
                    size="small"
                    label="Address"
                    placeholder="City / Address"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true, sx: { fontSize: '11px', fontWeight: 600 } } }}
                    sx={{ '& .MuiOutlinedInput-root': { height: '32px', fontSize: '12px' } }}
                  />

                  {/* GST */}
                  <TextField
                    size="small"
                    label="GST / Aadhar"
                    placeholder="GSTIN (optional)"
                    value={manualGst}
                    onChange={(e) => setManualGst(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true, sx: { fontSize: '11px', fontWeight: 600 } } }}
                    sx={{ '& .MuiOutlinedInput-root': { height: '32px', fontSize: '12px' } }}
                  />

                  {/* Add Button */}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleAddSingleCustomer}
                    startIcon={<PersonAddAlt1RoundedIcon sx={{ fontSize: 15 }} />}
                    sx={{
                      height: '32px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      textTransform: 'none',
                      bgcolor: '#1E40AF',
                      whiteSpace: 'nowrap',
                      px: 1.5,
                      '&:hover': { bgcolor: '#1D4ED8' },
                    }}
                  >
                    + Add
                  </Button>
                </Box>
              </Box>

              {/* Target Customers List Table */}
              <Box
                sx={{
                  bgcolor: '#FFFFFF',
                  p: 1.5,
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                    2. Target Customers Queue ({targetCustomers.length} bills to be generated):
                  </Typography>

                  {targetCustomers.length > 0 && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setTargetCustomers([])}
                      sx={{ fontSize: '11px', textTransform: 'none', py: 0 }}
                    >
                      Clear Queue
                    </Button>
                  )}
                </Box>

                <TableContainer sx={{ maxHeight: 240, border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800, width: '40px', py: 0.6 }}>#</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800, width: '130px', py: 0.6, color: '#047857' }}>
                          Auto Bill No
                        </TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800, py: 0.6 }}>Customer Name</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800, width: '120px', py: 0.6 }}>Phone</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800, py: 0.6 }}>Address</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800, width: '110px', py: 0.6 }}>GST / Aadhar</TableCell>
                        <TableCell sx={{ fontSize: '11px', fontWeight: 800, width: '50px', py: 0.6, textAlign: 'center' }}>
                          Remove
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {projectedList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: '#64748B', fontSize: '12px' }}>
                            No customers added yet. Add customers above or click "Bulk Select Existing Customers".
                          </TableCell>
                        </TableRow>
                      ) : (
                        projectedList.map((row, idx) => (
                          <TableRow key={row.id} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#F8FAFC' } }}>
                            <TableCell sx={{ fontSize: '11.5px', py: 0.6 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontSize: '11.5px', py: 0.6 }}>
                              <Chip
                                label={`#${row.projectedBillNo}`}
                                size="small"
                                sx={{
                                  height: '20px',
                                  fontSize: '10.5px',
                                  fontWeight: 800,
                                  bgcolor: '#ECFDF5',
                                  color: '#047857',
                                  border: '1px solid #A7F3D0',
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 0.6, color: '#0F172A' }}>
                              {row.name}
                            </TableCell>
                            <TableCell sx={{ fontSize: '11.5px', py: 0.6, color: '#475569' }}>
                              {row.phone || row.mobile || '-'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '11.5px', py: 0.6, color: '#475569' }}>
                              {row.address || '-'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '11.5px', py: 0.6, color: '#475569' }}>
                              {row.gst || row.aadhar || '-'}
                            </TableCell>
                            <TableCell sx={{ py: 0.4, textAlign: 'center' }}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveTarget(row.id)}
                                sx={{ p: 0.3 }}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}
        </DialogContent>

        {/* Footer Actions */}
        {!successResult && (
          <DialogActions sx={{ px: 2, py: 1.2, bgcolor: '#F1F5F9', borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
              {targetCustomers.length > 0
                ? `Ready to generate ${targetCustomers.length} duplicate bills.`
                : 'Add one or more customers to enable generation.'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={onClose}
                disabled={submitting}
                sx={{ fontSize: '12px', fontWeight: 600, textTransform: 'none' }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                size="small"
                onClick={handleExecuteDuplicate}
                disabled={submitting || targetCustomers.length === 0}
                startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />}
                sx={{
                  bgcolor: '#1E40AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2,
                  '&:hover': { bgcolor: '#1D4ED8' },
                }}
              >
                {submitting ? 'Generating Bills...' : `Generate ${targetCustomers.length} Bills`}
              </Button>
            </Box>
          </DialogActions>
        )}
      </Dialog>

      {/* Bulk Existing Customer Picker Dialog */}
      <Dialog
        open={bulkPickerOpen}
        onClose={() => setBulkPickerOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '6px',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            px: 2,
            py: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
            Select Customers from Database
          </Typography>
          <IconButton size="small" onClick={() => setBulkPickerOpen(false)}>
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 1.5 }}>
          {/* Search bar */}
          <TextField
            size="small"
            fullWidth
            placeholder="Search by name, phone, address or ID..."
            value={bulkSearchTerm}
            onChange={(e) => setBulkSearchTerm(e.target.value)}
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': { height: '32px', fontSize: '12px' },
            }}
          />

          {/* Select All Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, mb: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={
                    filteredExistingCustomers.length > 0 &&
                    filteredExistingCustomers.every((c) => selectedCustomerIds.includes(c._id || c.id))
                  }
                  indeterminate={
                    filteredExistingCustomers.some((c) => selectedCustomerIds.includes(c._id || c.id)) &&
                    !filteredExistingCustomers.every((c) => selectedCustomerIds.includes(c._id || c.id))
                  }
                  onChange={handleSelectAllFiltered}
                />
              }
              label={
                <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                  Select All ({filteredExistingCustomers.length})
                </Typography>
              }
            />

            <Typography sx={{ fontSize: '11px', color: '#1E40AF', fontWeight: 700 }}>
              {selectedCustomerIds.length} Selected
            </Typography>
          </Box>

          {/* Customers Checklist */}
          <Box
            sx={{
              maxHeight: 280,
              overflowY: 'auto',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              p: 0.5,
            }}
          >
            {loadingCustomers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : filteredExistingCustomers.length === 0 ? (
              <Typography sx={{ fontSize: '12px', textAlign: 'center', p: 2, color: '#64748B' }}>
                No customers match your search
              </Typography>
            ) : (
              filteredExistingCustomers.map((cust) => {
                const cId = cust._id || cust.id;
                const isChecked = selectedCustomerIds.includes(cId);

                return (
                  <Box
                    key={cId}
                    onClick={() => handleToggleCustomerSelection(cId)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 0.6,
                      borderRadius: '3px',
                      cursor: 'pointer',
                      bgcolor: isChecked ? '#EFF6FF' : 'transparent',
                      borderBottom: '1px solid #F1F5F9',
                      '&:hover': { bgcolor: isChecked ? '#DBEAFE' : '#F8FAFC' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox size="small" checked={isChecked} sx={{ p: 0.3 }} />
                      <Box>
                        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                          {cust.name}
                        </Typography>
                        <Typography sx={{ fontSize: '10.5px', color: '#64748B' }}>
                          {cust.mobile && cust.mobile !== '-' ? cust.mobile : ''}{' '}
                          {cust.address && cust.address !== '-' ? `• ${cust.address}` : ''}
                        </Typography>
                      </Box>
                    </Box>

                    {cust.idCode && (
                      <Chip label={cust.idCode} size="small" sx={{ height: '18px', fontSize: '10px' }} />
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button
            size="small"
            onClick={() => setBulkPickerOpen(false)}
            sx={{ fontSize: '11.5px', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={selectedCustomerIds.length === 0}
            onClick={handleApplyBulkPicker}
            sx={{
              bgcolor: '#1E40AF',
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#1D4ED8' },
            }}
          >
            Add Selected ({selectedCustomerIds.length})
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
