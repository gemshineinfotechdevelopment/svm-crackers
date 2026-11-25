import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Tooltip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  InputAdornment,
} from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { ChitsApi, type ChitSchemeItem } from '../../services/chitApi';

interface ChitSchemesTabProps {
  onRefreshDashboard?: () => void;
}

export const ChitSchemesTab: React.FC<ChitSchemesTabProps> = ({ onRefreshDashboard }) => {
  // Form State
  const [formOpen, setFormOpen] = useState<boolean>(true);
  const [schemeName, setSchemeName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [durationMonths, setDurationMonths] = useState<string>('');
  const [monthlyAmount, setMonthlyAmount] = useState<string>('');
  const [dueDay, setDueDay] = useState<string>('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Completed'>('Active');
  const [description, setDescription] = useState<string>('');

  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // Schemes List State
  const [schemes, setSchemes] = useState<ChitSchemeItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingScheme, setEditingScheme] = useState<ChitSchemeItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editDuration, setEditDuration] = useState<string>('9');
  const [editAmount, setEditAmount] = useState<string>('2000');
  const [editDueDay, setEditDueDay] = useState<string>('10');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive' | 'Completed'>('Active');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>('');

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [schemeToDelete, setSchemeToDelete] = useState<ChitSchemeItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Load Schemes
  const fetchSchemes = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await ChitsApi.getSchemes({
        search: searchTerm,
        status: statusFilter,
      });
      if (Array.isArray(data)) {
        setSchemes(data);
      }
    } catch (err: any) {
      console.error('Failed to load schemes:', err);
    } finally {
      setLoadingList(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  // Handle Create Scheme
  const handleCreateScheme = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!schemeName.trim()) {
      setFormError('Scheme name is required');
      return;
    }
    if (!startDate.trim()) {
      setFormError('Scheme starting date is required');
      return;
    }
    if (!durationMonths.trim()) {
      setFormError('Number of months is required');
      return;
    }
    const dur = Number(durationMonths);
    if (isNaN(dur) || dur <= 0) {
      setFormError('Duration in months must be at least 1');
      return;
    }
    if (!monthlyAmount.trim()) {
      setFormError('Monthly amount is required');
      return;
    }
    const amt = Number(monthlyAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Monthly amount must be greater than 0');
      return;
    }
    if (!dueDay.trim()) {
      setFormError('Payment due day is required');
      return;
    }
    const day = Number(dueDay);
    if (isNaN(day) || day < 1 || day > 31) {
      setFormError('Payment due day must be between 1 and 31');
      return;
    }

    try {
      setFormLoading(true);
      await ChitsApi.createScheme({
        schemeName: schemeName.trim(),
        startDate,
        durationMonths: dur,
        monthlyAmount: amt,
        dueDay: day,
        status,
        description: description.trim(),
      });

      setFormSuccess(`Chit Scheme "${schemeName.trim()}" created successfully!`);
      // Reset form completely
      setSchemeName('');
      setStartDate('');
      setDescription('');
      setMonthlyAmount('');
      setDurationMonths('');
      setDueDay('');
      setStatus('Active');

      await fetchSchemes();
      if (onRefreshDashboard) onRefreshDashboard();

      setTimeout(() => {
        setFormSuccess('');
      }, 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create chit scheme');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelForm = () => {
    setSchemeName('');
    setStartDate('');
    setDescription('');
    setMonthlyAmount('');
    setDurationMonths('');
    setDueDay('');
    setStatus('Active');
    setFormError('');
    setFormSuccess('');
    setFormOpen(false);
  };

  // Handle Edit Scheme
  const handleOpenEdit = (scheme: ChitSchemeItem) => {
    setEditingScheme(scheme);
    setEditName(scheme.schemeName);
    setEditStartDate(scheme.startDate || '');
    setEditDuration(String(scheme.durationMonths || 9));
    setEditAmount(String(scheme.monthlyAmount || 2000));
    setEditDueDay(String(scheme.dueDay || 10));
    setEditStatus(scheme.status || 'Active');
    setEditDescription(scheme.description || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingScheme) return;
    setEditError('');

    if (!editName.trim()) {
      setEditError('Scheme name is required');
      return;
    }
    const amt = Number(editAmount);
    if (isNaN(amt) || amt <= 0) {
      setEditError('Monthly amount must be greater than 0');
      return;
    }
    const dur = Number(editDuration);
    if (isNaN(dur) || dur <= 0) {
      setEditError('Duration in months must be at least 1');
      return;
    }
    const day = Number(editDueDay);
    if (isNaN(day) || day < 1 || day > 31) {
      setEditError('Payment due day must be between 1 and 31');
      return;
    }

    try {
      setEditLoading(true);
      await ChitsApi.updateScheme(editingScheme.schemeId || editingScheme._id!, {
        schemeName: editName.trim(),
        startDate: editStartDate,
        durationMonths: dur,
        monthlyAmount: amt,
        dueDay: day,
        status: editStatus,
        description: editDescription.trim(),
      });

      setEditModalOpen(false);
      setEditingScheme(null);
      await fetchSchemes();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update scheme');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Scheme
  const handleOpenDelete = (scheme: ChitSchemeItem) => {
    setSchemeToDelete(scheme);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!schemeToDelete) return;
    try {
      setDeleteLoading(true);
      await ChitsApi.deleteScheme(schemeToDelete.schemeId || schemeToDelete._id!);
      setDeleteConfirmOpen(false);
      setSchemeToDelete(null);
      await fetchSchemes();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to delete scheme');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Calculated Preview
  const previewTotalValue = (Number(monthlyAmount) || 0) * (Number(durationMonths) || 0);

  return (
    <Box sx={{ width: '100%' }}>
      {/* 1. Header Bar with Toggle & Action */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CardGiftcardRoundedIcon sx={{ color: '#741748', fontSize: 22 }} />
          <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
            Chit Schemes Master
          </Typography>
          <Chip
            size="small"
            label={`${schemes.length} Scheme${schemes.length === 1 ? '' : 's'}`}
            sx={{ fontWeight: 700, fontSize: '11px', bgcolor: '#F1F5F9', color: '#475569' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!formOpen && (
            <Button
              variant="contained"
              size="small"
              onClick={() => setFormOpen(true)}
              startIcon={<AddCircleOutlineRoundedIcon />}
              sx={{
                bgcolor: '#9E5A67',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '12.5px',
                borderRadius: '6px',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#864753', boxShadow: 'none' },
              }}
            >
              + Create New Scheme
            </Button>
          )}
          <Tooltip title="Refresh Schemes" arrow>
            <IconButton size="small" onClick={fetchSchemes} sx={{ color: '#1E3A8A' }}>
              <RefreshRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 2. Create Scheme Form (Collapsible Card matching user's exact design) */}
      <Collapse in={formOpen}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5, md: 3 },
            mb: 3,
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          {/* Header & Collapse Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => setFormOpen(!formOpen)}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: '18px',
                  fontWeight: 900,
                  color: '#1E1B4B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  letterSpacing: '-0.01em',
                }}
              >
                <Box component="span" sx={{ color: '#9E5A67', fontSize: '20px', mr: 0.2 }}>+</Box>
                Create New Chit Scheme
              </Typography>
              <Typography sx={{ fontSize: '12.5px', color: '#64748B', mt: 0.3, fontWeight: 500 }}>
                Define the scheme parameters including start date, duration, monthly installment, and fixed due date day.
              </Typography>
            </Box>

            <IconButton size="small" sx={{ color: '#64748B' }}>
              {formOpen ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
            </IconButton>
          </Box>

          {/* Form Alerts */}
          {formError && (
            <Alert severity="error" sx={{ mt: 2, py: 0.5, fontSize: '12.5px', borderRadius: '8px' }} onClose={() => setFormError('')}>
              {formError}
            </Alert>
          )}
          {formSuccess && (
            <Alert severity="success" sx={{ mt: 2, py: 0.5, fontSize: '12.5px', borderRadius: '8px' }} onClose={() => setFormSuccess('')}>
              {formSuccess}
            </Alert>
          )}

          {/* Form Fields */}
          <Box component="form" onSubmit={handleCreateScheme} sx={{ mt: 2.5 }}>
            {/* Field 1: Scheme Name */}
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#1E293B',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  mb: 0.6,
                }}
              >
                1. SCHEME NAME *
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g. Diwali Special Savings Scheme 2026"
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    bgcolor: '#FFFFFF',
                    '& fieldset': { borderColor: '#CBD5E1' },
                    '&:hover fieldset': { borderColor: '#94A3B8' },
                    '&.Mui-focused fieldset': { borderColor: '#9E5A67' },
                  },
                }}
              />
            </Box>

            {/* Field 2: Yellow / Cream Parameters Card */}
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 2,
                bgcolor: '#FFFDF5',
                border: '1.5px solid #FCD34D',
                borderRadius: '12px',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              {/* Row 1, Col 1: Scheme Starting Date */}
              <Box>
                <Typography
                  sx={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    mb: 0.6,
                  }}
                >
                  SCHEME STARTING DATE *
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarTodayRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      bgcolor: '#FFFFFF',
                      '& fieldset': { borderColor: '#CBD5E1' },
                      '&:hover fieldset': { borderColor: '#94A3B8' },
                      '&.Mui-focused fieldset': { borderColor: '#9E5A67' },
                    },
                  }}
                />
              </Box>

              {/* Row 1, Col 2: Number of Months */}
              <Box>
                <Typography
                  sx={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    mb: 0.6,
                  }}
                >
                  NUMBER OF MONTHS *
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  placeholder="e.g. 9"
                  slotProps={{ htmlInput: { min: 1, max: 60 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      bgcolor: '#FFFFFF',
                      '& fieldset': { borderColor: '#CBD5E1' },
                      '&:hover fieldset': { borderColor: '#94A3B8' },
                      '&.Mui-focused fieldset': { borderColor: '#9E5A67' },
                    },
                  }}
                />
              </Box>

              {/* Row 2, Col 1: Monthly Amount */}
              <Box>
                <Typography
                  sx={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    mb: 0.6,
                  }}
                >
                  MONTHLY AMOUNT (₹) *
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  slotProps={{ htmlInput: { min: 100, step: 100 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      bgcolor: '#FFFFFF',
                      '& fieldset': { borderColor: '#CBD5E1' },
                      '&:hover fieldset': { borderColor: '#94A3B8' },
                      '&.Mui-focused fieldset': { borderColor: '#9E5A67' },
                    },
                  }}
                />
              </Box>

              {/* Row 2, Col 2: Payment Due Day */}
              <Box>
                <Typography
                  sx={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    mb: 0.6,
                  }}
                >
                  PAYMENT DUE DAY (1-31) *
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="e.g. 10"
                  slotProps={{ htmlInput: { min: 1, max: 31 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      bgcolor: '#FFFFFF',
                      '& fieldset': { borderColor: '#CBD5E1' },
                      '&:hover fieldset': { borderColor: '#94A3B8' },
                      '&.Mui-focused fieldset': { borderColor: '#9E5A67' },
                    },
                  }}
                />
              </Box>

              {/* Row 3: Scheme Status (Full Width inside card) */}
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography
                  sx={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    mb: 0.6,
                  }}
                >
                  SCHEME STATUS
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  sx={{
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    bgcolor: '#FFFFFF',
                    '& fieldset': { borderColor: '#CBD5E1' },
                    '&:hover fieldset': { borderColor: '#94A3B8' },
                    '&.Mui-focused fieldset': { borderColor: '#9E5A67' },
                  }}
                >
                  <MenuItem value="Active" sx={{ fontSize: '13px', fontWeight: 600, color: '#16A34A' }}>
                    Active
                  </MenuItem>
                  <MenuItem value="Inactive" sx={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                    Inactive
                  </MenuItem>
                  <MenuItem value="Completed" sx={{ fontSize: '13px', fontWeight: 600, color: '#2563EB' }}>
                    Completed
                  </MenuItem>
                </Select>
              </Box>

              {/* Calculation Summary Helper */}
              <Box
                sx={{
                  gridColumn: { xs: '1', sm: '1 / -1' },
                  pt: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px dashed #FDE68A',
                }}
              >
                <Typography sx={{ fontSize: '11.5px', color: '#78350F', fontWeight: 600 }}>
                  Calculated Scheme Value per Person:
                </Typography>
                <Typography sx={{ fontSize: '13px', color: '#78350F', fontWeight: 800 }}>
                  {previewTotalValue > 0
                    ? `₹${(Number(monthlyAmount) || 0).toLocaleString('en-IN')} × ${durationMonths || 0} Months = ₹${previewTotalValue.toLocaleString('en-IN')}`
                    : '₹0'}
                </Typography>
              </Box>
            </Box>

            {/* Field 3: Scheme Description (Optional) */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#1E293B',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  mb: 0.6,
                }}
              >
                SCHEME DESCRIPTION (OPTIONAL)
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g. Save ₹2000/month for 9 months and get extra bonus!"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    bgcolor: '#FFFFFF',
                    '& fieldset': { borderColor: '#CBD5E1' },
                    '&:hover fieldset': { borderColor: '#94A3B8' },
                    '&.Mui-focused fieldset': { borderColor: '#9E5A67' },
                  },
                }}
              />
            </Box>

            {/* Action Buttons at Bottom Right */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, alignItems: 'center' }}>
              <Button
                variant="text"
                onClick={handleCancelForm}
                disabled={formLoading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#475569',
                  bgcolor: '#F1F5F9',
                  px: 2.5,
                  py: 0.8,
                  borderRadius: '20px',
                  '&:hover': { bgcolor: '#E2E8F0' },
                }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={formLoading}
                startIcon={formLoading ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <AddCircleOutlineRoundedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  bgcolor: '#9E5A67',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  px: 3,
                  py: 0.8,
                  borderRadius: '20px',
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: '#864753',
                    boxShadow: '0 2px 6px rgba(158, 90, 103, 0.3)',
                  },
                }}
              >
                {formLoading ? 'Creating...' : '+ Create Scheme'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Collapse>

      {/* 3. Search and Status Filter Bar for Schemes Table */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1.5,
          bgcolor: '#FFFFFF',
          p: 1.2,
          border: '1px solid #CBD5E1',
          borderRadius: '6px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, maxWidth: { xs: '100%', sm: '380px' } }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search scheme by name, ID or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748B' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '12.5px',
                borderRadius: '4px',
                height: '34px',
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
            Status:
          </Typography>
          <Select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{
              height: '34px',
              fontSize: '12px',
              fontWeight: 700,
              minWidth: '120px',
              borderRadius: '4px',
            }}
          >
            <MenuItem value="All">All Status</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* 4. Schemes Data Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid #CBD5E1',
          borderRadius: '4px',
          overflowX: 'auto',
          maxHeight: 'calc(100vh - 350px)',
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#F1F5F9', fontWeight: 800, fontSize: '11.5px', color: '#1E293B', py: 1 } }}>
              <TableCell>Scheme ID</TableCell>
              <TableCell>Scheme Name</TableCell>
              <TableCell align="right">Monthly (₹)</TableCell>
              <TableCell align="center">Duration</TableCell>
              <TableCell align="right">Total Value (₹)</TableCell>
              <TableCell align="center">Start Date</TableCell>
              <TableCell align="center">Due Day</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingList ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} sx={{ color: '#9E5A67' }} />
                  <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 1 }}>Loading schemes...</Typography>
                </TableCell>
              </TableRow>
            ) : schemes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                    No chit schemes found. Create your first scheme above!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              schemes.map((s) => {
                const isAct = s.status === 'Active';
                const isComp = s.status === 'Completed';

                return (
                  <TableRow
                    key={s.schemeId || s._id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: '#F8FAFC' },
                      '& td': { fontSize: '12px', py: 0.9 },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 800, color: '#1E3A8A' }}>
                      {s.schemeId}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {s.schemeName}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#16A34A' }}>
                      ₹{s.monthlyAmount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>
                      {s.durationMonths} Months
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#741748' }}>
                      ₹{s.totalValue.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell align="center" sx={{ color: '#475569' }}>
                      {s.startDate || '-'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#1E40AF' }}>
                      {s.dueDay}th of month
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={isAct ? <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> : undefined}
                        label={s.status}
                        sx={{
                          fontWeight: 800,
                          fontSize: '11px',
                          bgcolor: isAct ? '#DCFCE7' : isComp ? '#DBEAFE' : '#F1F5F9',
                          color: isAct ? '#15803D' : isComp ? '#1D4ED8' : '#475569',
                          border: isAct ? '1px solid #86EFAC' : isComp ? '1px solid #93C5FD' : '1px solid #CBD5E1',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#64748B', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.description || '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit Scheme" arrow>
                          <IconButton size="small" onClick={() => handleOpenEdit(s)} sx={{ color: '#2563EB', p: 0.4 }}>
                            <EditRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Scheme" arrow>
                          <IconButton size="small" onClick={() => handleOpenDelete(s)} sx={{ color: '#DC2626', p: 0.4 }}>
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 5. Edit Scheme Dialog */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: '12px', p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '16px', color: '#1E1B4B', pb: 1 }}>
          Edit Chit Scheme ({editingScheme?.schemeId})
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1.5 }}>
          {editError && (
            <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontSize: '12px' }}>
              {editError}
            </Alert>
          )}

          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', mb: 0.5, textTransform: 'uppercase' }}>
              Scheme Name *
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
            />
          </Box>

          <Box
            sx={{
              p: 1.5,
              mb: 1.5,
              bgcolor: '#FFFDF5',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.5,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', mb: 0.5, textTransform: 'uppercase' }}>
                Starting Date *
              </Typography>
              <TextField
                fullWidth
                type="date"
                size="small"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', bgcolor: '#FFFFFF' } }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', mb: 0.5, textTransform: 'uppercase' }}>
                Number of Months *
              </Typography>
              <TextField
                fullWidth
                type="number"
                size="small"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', bgcolor: '#FFFFFF' } }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', mb: 0.5, textTransform: 'uppercase' }}>
                Monthly Amount (₹) *
              </Typography>
              <TextField
                fullWidth
                type="number"
                size="small"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', bgcolor: '#FFFFFF' } }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', mb: 0.5, textTransform: 'uppercase' }}>
                Due Day (1-31) *
              </Typography>
              <TextField
                fullWidth
                type="number"
                size="small"
                value={editDueDay}
                onChange={(e) => setEditDueDay(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', bgcolor: '#FFFFFF' } }}
              />
            </Box>

            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', mb: 0.5, textTransform: 'uppercase' }}>
                Status
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                sx={{ borderRadius: '6px', bgcolor: '#FFFFFF' }}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </Select>
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', mb: 0.5, textTransform: 'uppercase' }}>
              Description
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={() => setEditModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={editLoading}
            sx={{
              bgcolor: '#9E5A67',
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: '6px',
              '&:hover': { bgcolor: '#864753' },
            }}
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 6. Delete Confirm Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '8px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '15px', color: '#DC2626' }}>
          Delete Chit Scheme?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '13px', color: '#334155' }}>
            Are you sure you want to delete scheme <b>{schemeToDelete?.schemeName}</b> ({schemeToDelete?.schemeId})?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: 'none', fontWeight: 600, color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={deleteLoading}
            sx={{
              bgcolor: '#DC2626',
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: '6px',
              '&:hover': { bgcolor: '#B91C1C' },
            }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
