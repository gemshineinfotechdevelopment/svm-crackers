import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  CircularProgress,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded';
import {
  ChitsApi,
  type ChitCollectionRow,
  type ChitCustomerItem,
  type ChitAllocationItem,
  type ChitPaymentItem,
  type ChitReceiptItem,
} from '../../services/chitApi';
import { ChitCustomerDetailsModal } from './ChitCustomerDetailsModal';
import { RecordChitPaymentModal } from './RecordChitPaymentModal';
import { ChitReceiptModal } from './ChitReceiptModal';
import { type ChitReceiptData } from './ChitReceiptTemplate';

interface ChitCollectionsTabProps {
  onRefreshDashboard?: () => void;
}

const STORAGE_KEY_FILTERS = 'svm_chit_collection_filters';

export const ChitCollectionsTab: React.FC<ChitCollectionsTabProps> = ({ onRefreshDashboard }) => {
  // Load saved filters from localStorage / URL search params
  const initialFilters = useMemo(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const saved = localStorage.getItem(STORAGE_KEY_FILTERS);
      const parsed = saved ? JSON.parse(saved) : {};

      return {
        search: urlParams.get('chit_q') || parsed.search || '',
        status: urlParams.get('chit_status') || parsed.status || 'All',
        paymentStatus: urlParams.get('chit_pay_status') || parsed.paymentStatus || 'All',
        scheme: urlParams.get('chit_scheme') || parsed.scheme || 'All',
        page: parseInt(urlParams.get('chit_page') || parsed.page || '0', 10),
      };
    } catch {
      return { search: '', status: 'All', paymentStatus: 'All', scheme: 'All', page: 0 };
    }
  }, []);

  const [rows, setRows] = useState<ChitCollectionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>(initialFilters.search);
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters.status);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(initialFilters.paymentStatus);
  const [schemeFilter, setSchemeFilter] = useState<string>(initialFilters.scheme);
  const [page, setPage] = useState<number>(initialFilters.page);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals state
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Quick Record Payment state
  const [payModalOpen, setPayModalOpen] = useState<boolean>(false);
  const [payTargetCustomer, setPayTargetCustomer] = useState<ChitCustomerItem | null>(null);
  const [payTargetAllocations, setPayTargetAllocations] = useState<ChitAllocationItem[]>([]);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);
  const [activeReceipt, setActiveReceipt] = useState<ChitReceiptData | null>(null);

  // Save current filter state to LocalStorage
  useEffect(() => {
    try {
      const state = {
        search: searchTerm,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        scheme: schemeFilter,
        page,
      };
      localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(state));
    } catch {}
  }, [searchTerm, statusFilter, paymentStatusFilter, schemeFilter, page]);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ChitsApi.getCollections({
        search: searchTerm.trim() || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        paymentStatus: paymentStatusFilter !== 'All' ? paymentStatusFilter : undefined,
        scheme: schemeFilter !== 'All' ? schemeFilter : undefined,
        page: page + 1,
        limit: rowsPerPage,
      });

      if (res && res.data) {
        setRows(res.data);
        setTotalCount(res.pagination?.total || res.data.length);
      } else if (Array.isArray(res)) {
        setRows(res);
        setTotalCount(res.length);
      }
    } catch (err) {
      console.error('Error fetching collections overview:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, paymentStatusFilter, schemeFilter, page, rowsPerPage]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setPaymentStatusFilter('All');
    setSchemeFilter('All');
    setPage(0);
  };

  const handleOpenDetails = (chitCustomerId: string) => {
    setSelectedCustomerId(chitCustomerId);
    setDetailsModalOpen(true);
  };

  const handleOpenQuickPay = async (cRow: ChitCollectionRow) => {
    try {
      const data = await ChitsApi.getCustomerCollectionDetails(cRow.chitCustomerId);
      setPayTargetCustomer(data.customer);
      setPayTargetAllocations(data.allocations || []);
      setPayModalOpen(true);
    } catch (err) {
      console.error('Failed to prepare payment modal:', err);
      alert('Could not load customer schemes.');
    }
  };

  const handlePaymentSuccess = (_payment: ChitPaymentItem, receipt: ChitReceiptItem) => {
    fetchCollections();
    if (onRefreshDashboard) onRefreshDashboard();
    if (receipt && receipt.receiptDataSnapshot) {
      setActiveReceipt(receipt.receiptDataSnapshot as ChitReceiptData);
      setReceiptModalOpen(true);
    }
  };

  return (
    <Box>
      {/* Top Filter and Search Bar */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.2,
          mb: 1.5,
          p: 1.2,
          backgroundColor: '#FFFFFF',
          borderRadius: '4px',
          border: '1px solid #CBD5E1',
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, flex: 1 }}>
          {/* Search Box */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              px: 1,
              py: 0.2,
              minWidth: '240px',
              flex: 1,
              maxWidth: '320px',
            }}
          >
            <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748B', mr: 0.5 }} />
            <input
              type="text"
              placeholder="Search Name, Phone, ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                width: '100%',
                fontSize: '12px',
                color: '#0F172A',
              }}
            />
          </Box>

          {/* Payment Status Filter */}
          <FormControl size="small" sx={{ minWidth: '130px' }}>
            <Select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(0);
              }}
              sx={{ fontSize: '12px', height: '30px', backgroundColor: '#F8FAFC' }}
            >
              <MenuItem value="All" sx={{ fontSize: '12px' }}>All Payment Status</MenuItem>
              <MenuItem value="Fully Paid" sx={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>Fully Paid</MenuItem>
              <MenuItem value="Partially Paid" sx={{ fontSize: '12px', color: '#D97706', fontWeight: 700 }}>Partially Paid</MenuItem>
              <MenuItem value="Pending" sx={{ fontSize: '12px', color: '#DC2626', fontWeight: 700 }}>Pending</MenuItem>
            </Select>
          </FormControl>

          {/* Customer Status Filter */}
          <FormControl size="small" sx={{ minWidth: '110px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              sx={{ fontSize: '12px', height: '30px', backgroundColor: '#F8FAFC' }}
            >
              <MenuItem value="All" sx={{ fontSize: '12px' }}>All Status</MenuItem>
              <MenuItem value="Active" sx={{ fontSize: '12px' }}>Active</MenuItem>
              <MenuItem value="Completed" sx={{ fontSize: '12px' }}>Completed</MenuItem>
              <MenuItem value="Closed" sx={{ fontSize: '12px' }}>Closed</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Reset Filters" arrow>
            <IconButton size="small" onClick={handleResetFilters} sx={{ p: 0.6, color: '#64748B' }}>
              <FilterAltOffRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Reload Collections" arrow>
            <IconButton size="small" onClick={fetchCollections} sx={{ p: 0.6, color: '#1E3A8A' }}>
              <RefreshRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
          Showing {rows.length} of {totalCount} records (25 / page)
        </Typography>
      </Box>

      {/* Main Collections Data Table */}
      <Paper elevation={0} sx={{ border: '1px solid #CBD5E1', borderRadius: '4px', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F1F5F9' }}>
                <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Customer ID</TableCell>
                <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Customer Name</TableCell>
                <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Mobile</TableCell>
                <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Persons</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Monthly Due</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800, color: '#059669', py: 1 }}>Total Paid</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', py: 1 }}>Remaining Due</TableCell>
                <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Paid Mos</TableCell>
                <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Pending Mos</TableCell>
                <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Payment Status</TableCell>
                <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1, width: '190px' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: '#059669' }} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 6, color: '#64748B', fontSize: '12.5px' }}>
                    No chit collection records found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const isFull = r.paymentStatus === 'Fully Paid';
                  const isPartial = r.paymentStatus === 'Partially Paid';
                  const pColor = isFull ? '#059669' : isPartial ? '#D97706' : '#DC2626';
                  const pBg = isFull ? '#ECFDF5' : isPartial ? '#FFFBEB' : '#FEF2F2';

                  return (
                    <TableRow
                      key={r.chitCustomerId}
                      sx={{
                        '&:hover': { backgroundColor: '#F8FAFC' },
                        borderBottom: '1px solid #F1F5F9',
                      }}
                    >
                      {/* ID */}
                      <TableCell sx={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF' }}>
                        {r.chitCustomerId}
                      </TableCell>

                      {/* Name */}
                      <TableCell sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        {r.customerName}
                        {r.schemes.length > 0 && (
                          <Typography sx={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                            {r.schemes.join(', ')}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Mobile */}
                      <TableCell sx={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                        {r.mobile}
                      </TableCell>

                      {/* Persons */}
                      <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 800, color: '#741748' }}>
                        {r.totalPersons}
                      </TableCell>

                      {/* Monthly Installment */}
                      <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 700, color: '#1E3A8A' }}>
                        ₹{r.monthlyInstallment.toLocaleString('en-IN')}
                      </TableCell>

                      {/* Total Paid */}
                      <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 800, color: '#059669' }}>
                        ₹{r.totalPaid.toLocaleString('en-IN')}
                      </TableCell>

                      {/* Remaining Amount */}
                      <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 800, color: r.remainingAmount > 0 ? '#DC2626' : '#64748B' }}>
                        ₹{r.remainingAmount.toLocaleString('en-IN')}
                      </TableCell>

                      {/* Paid Months */}
                      <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                        {r.paidMonths}
                      </TableCell>

                      {/* Pending Months */}
                      <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 800, color: r.pendingMonths > 0 ? '#DC2626' : '#64748B' }}>
                        {r.pendingMonths}
                      </TableCell>

                      {/* Payment Status Badge */}
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.15,
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            color: pColor,
                            backgroundColor: pBg,
                            border: `1px solid ${pColor}`,
                          }}
                        >
                          {r.paymentStatus}
                        </Box>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.6 }}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleOpenDetails(r.chitCustomerId)}
                            startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 13 }} />}
                            sx={{
                              fontSize: '11px',
                              fontWeight: 700,
                              height: '24px',
                              backgroundColor: '#741748',
                              color: '#FFFFFF',
                              textTransform: 'none',
                              px: 0.8,
                              '&:hover': { backgroundColor: '#580e34' },
                            }}
                          >
                            Details
                          </Button>

                          {!isFull ? (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleOpenQuickPay(r)}
                              startIcon={<PaymentsRoundedIcon sx={{ fontSize: 13 }} />}
                              sx={{
                                fontSize: '11px',
                                fontWeight: 700,
                                height: '24px',
                                backgroundColor: '#059669',
                                color: '#FFFFFF',
                                textTransform: 'none',
                                px: 0.8,
                                '&:hover': { backgroundColor: '#047857' },
                              }}
                            >
                              Pay
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenDetails(r.chitCustomerId)}
                              startIcon={<ReceiptLongRoundedIcon sx={{ fontSize: 13 }} />}
                              sx={{
                                fontSize: '11px',
                                fontWeight: 700,
                                height: '24px',
                                borderColor: '#CBD5E1',
                                color: '#475569',
                                textTransform: 'none',
                                px: 0.6,
                                '&:hover': { backgroundColor: '#F8FAFC' },
                              }}
                            >
                              Receipts
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
          sx={{ borderTop: '1px solid #CBD5E1', fontSize: '11px' }}
        />
      </Paper>

      {/* Customer Details Modal (Schedule & Receipts) */}
      <ChitCustomerDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        customerId={selectedCustomerId}
        onDataChanged={() => {
          fetchCollections();
          if (onRefreshDashboard) onRefreshDashboard();
        }}
      />

      {/* Quick Record Payment Modal */}
      <RecordChitPaymentModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        customer={payTargetCustomer}
        allocations={payTargetAllocations}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Receipt Modal */}
      <ChitReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={activeReceipt}
      />
    </Box>
  );
};
