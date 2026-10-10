import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import TransformRoundedIcon from '@mui/icons-material/TransformRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { ParticularsApi } from '../services/api';
import { ParticularsPage } from './ParticularsPage';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';
import { DuplicateBillModal } from './DuplicateBillModal';
import { getStoredSettings } from './SettingsPage';
import {
  getActiveBillingYear,
  setActiveBillingYear,
  getStandardYearOptions,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';

interface QuotationPageProps {
  initialCustomerName?: string;
  onNavigateToEstimate?: (billData?: any) => void;
  onNavigateToSales?: () => void;
}

export const QuotationPage: FC<QuotationPageProps> = ({
  initialCustomerName,
  onNavigateToEstimate,
  onNavigateToSales,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'records'>('create');
  const [storeSettings] = useState(() => getStoredSettings());
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingQuotation, setEditingQuotation] = useState<any | null>(null);

  // Year state
  const [selectedYear, setSelectedYear] = useState<number | string>(() => {
    return getActiveBillingYear() || new Date().getFullYear();
  });
  const yearOptions = useMemo(() => getStandardYearOptions(), []);

  // Print modal state
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

  // Duplicate for Multiple Customers state
  const [duplicateModalOpen, setDuplicateModalOpen] = useState<boolean>(false);
  const [quotationToDuplicate, setQuotationToDuplicate] = useState<any | null>(null);

  // Convert confirmation dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState<boolean>(false);
  const [quotationToConvert, setQuotationToConvert] = useState<any | null>(null);
  const [converting, setConverting] = useState<boolean>(false);

  // Snackbar feedback
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  const fetchQuotations = async (yearToFetch?: number | string) => {
    try {
      setLoading(true);
      const targetYear = yearToFetch !== undefined ? yearToFetch : selectedYear;
      const data = await ParticularsApi.getAll(undefined, 'QUOTATION', targetYear === 'ALL' ? undefined : targetYear);
      const quotList = Array.isArray(data) ? data : [];
      setQuotations(quotList);
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations(selectedYear);

    const handleYearChange = (e: any) => {
      const year = e?.detail?.year ? Number(e.detail.year) : undefined;
      if (year) {
        setSelectedYear(year);
        fetchQuotations(year);
      } else {
        fetchQuotations();
      }
    };

    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    return () => {
      window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    };
  }, []);

  const handleYearChangeFromDropdown = (newYear: string | number) => {
    setSelectedYear(newYear);
    if (typeof newYear === 'number') {
      setActiveBillingYear(newYear);
    }
    fetchQuotations(newYear);
  };

  // Filter quotations
  const filteredQuotations = useMemo(() => {
    if (!searchTerm.trim()) return quotations;
    const term = searchTerm.toLowerCase().trim();
    return quotations.filter(
      (q) =>
        (q.billNo && q.billNo.toLowerCase().includes(term)) ||
        (q.customerName && q.customerName.toLowerCase().includes(term)) ||
        (q.customerPhone && q.customerPhone.includes(term)) ||
        (q.date && q.date.toLowerCase().includes(term)) ||
        (String(q.total || q.amount || '').includes(term))
    );
  }, [quotations, searchTerm]);

  // Statistics
  const totalQuotationAmount = useMemo(() => {
    return filteredQuotations.reduce((sum, q) => {
      const val = parseFloat(String(q.total || q.amount || '0').replace(/,/g, '')) || 0;
      return sum + val;
    }, 0);
  }, [filteredQuotations]);

  const convertedCount = useMemo(() => {
    return filteredQuotations.filter((q) => q.isConverted || q.convertedBillNo).length;
  }, [filteredQuotations]);

  // Delete handler
  const handleDeleteQuotation = async (quotation: any) => {
    const id = quotation._id || quotation.id;
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete Quotation #${quotation.billNo || ''} for ${quotation.customerName}?`)) return;

    try {
      await ParticularsApi.delete(id);
      setQuotations((prev) => prev.filter((q) => (q._id || q.id) !== id));
      setSnackbarMessage(`Quotation #${quotation.billNo} deleted successfully.`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (err: any) {
      console.error('Failed to delete quotation:', err);
      setSnackbarMessage(err.message || 'Error deleting quotation');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Direct print handler
  const handlePrintQuotation = (quotation: any) => {
    const printData: BillPrintData = {
      billNo: quotation.billNo || '',
      date: quotation.date || '',
      customerName: quotation.customerName || '',
      customerPhone: quotation.customerPhone || '',
      customerAddress: quotation.customerAddress || '',
      customerGst: quotation.customerGst || '',
      companyName:
        quotation.companyName && quotation.companyName.trim() !== '' && quotation.companyName !== 'General'
          ? quotation.companyName
          : storeSettings.companyName || 'Manjula Crackers',
      companyAddress: storeSettings.address,
      companyCity: storeSettings.city,
      companyPincode: storeSettings.pincode,
      companyState: storeSettings.state,
      companyPhone: storeSettings.phone,
      companyWhatsapp: storeSettings.whatsapp,
      logoUrl: storeSettings.logoUrl,
      transport: String(quotation.transport || '0'),
      caseCount: String(quotation.caseCount || '0'),
      discount: String(quotation.discount || '0'),
      packing: String(quotation.packing || '0'),
      subtotal: parseFloat(String(quotation.amount || quotation.subTotal || '0').replace(/,/g, '')) || 0,
      total: parseFloat(String(quotation.total || quotation.netAmount || '0').replace(/,/g, '')) || 0,
      paymentMode: quotation.paymentMode || 'Credit',
      paymentStatus: quotation.paymentStatus || 'UNPAID',
      paidAmount: parseFloat(String(quotation.paidAmount || '0').replace(/,/g, '')) || 0,
      notes: quotation.notes || '',
      invoiceTitle: 'QUOTATION',
      products: Array.isArray(quotation.products)
        ? quotation.products.map((p: any) => ({
            particular: p.particular || '',
            quantity: p.quantity || '0',
            rate: p.rate || '0',
            pktUnit: p.pktUnit || '1 Box',
            amount: p.amount || '0',
          }))
        : [],
    };

    setSelectedBillForPrint(printData);
    setPrintModalOpen(true);
  };

  // Convert Quotation to Estimate / Bill
  const openConvertDialog = (quotation: any) => {
    setQuotationToConvert(quotation);
    setConvertDialogOpen(true);
  };

  const executeConvert = async () => {
    if (!quotationToConvert) return;
    setConverting(true);
    const quotId = quotationToConvert._id || quotationToConvert.id;
    try {
      const res = await ParticularsApi.convertToBill(quotId);
      const convertedData = res?.data || res;
      setConvertDialogOpen(false);
      setSnackbarMessage(`Quotation #${quotationToConvert.billNo} successfully converted to Estimate Bill #${convertedData.billNo || ''}! Added to Sales.`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      // Refresh list
      fetchQuotations(selectedYear);

      // Option to navigate to Sales or Estimate
      if (onNavigateToSales) {
        setTimeout(() => {
          onNavigateToSales();
        }, 1200);
      }
    } catch (err: any) {
      console.error('Failed to convert quotation:', err);
      setSnackbarMessage(err.message || 'Failed to convert quotation to bill.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setConverting(false);
      setQuotationToConvert(null);
    }
  };

  const handleEditQuotation = (quotation: any) => {
    setEditingQuotation(quotation);
    setActiveSubTab('create');
  };

  const handleQuotationSaved = () => {
    setEditingQuotation(null);
    fetchQuotations(selectedYear);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#F0F5FA', pb: 4 }}>
      {/* Top Header Bar with SubTabs */}
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #C5D5E6',
          px: { xs: 1.5, sm: 2 },
          py: 1,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Left: Title + Mode */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              bgcolor: '#EFF6FF',
              p: 0.8,
              borderRadius: '6px',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RequestQuoteRoundedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
              Quotation Management
              <Chip
                label="Sample Pricing / No Sales Impact"
                size="small"
                sx={{
                  bgcolor: '#FEF3C7',
                  color: '#92400E',
                  fontWeight: 700,
                  fontSize: '11px',
                  height: '20px',
                }}
              />
            </Box>
            <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
              Add sample products & calculate prices for customers. Does NOT add to Sales until converted to Estimate / Bill.
            </Typography>
          </Box>
        </Box>

        {/* Right: Sub-Tab Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant={activeSubTab === 'create' ? 'contained' : 'outlined'}
            onClick={() => {
              setActiveSubTab('create');
              setEditingQuotation(null);
            }}
            startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: activeSubTab === 'create' ? '#1E40AF' : '#FFFFFF',
              color: activeSubTab === 'create' ? '#FFFFFF' : '#1E40AF',
              borderColor: '#1E40AF',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'none',
              px: 2,
              py: 0.5,
              height: '32px',
              '&:hover': {
                bgcolor: activeSubTab === 'create' ? '#1E3A8A' : '#EFF6FF',
              },
            }}
          >
            {editingQuotation ? 'Edit Quotation' : '+ New Quotation'}
          </Button>

          <Button
            variant={activeSubTab === 'records' ? 'contained' : 'outlined'}
            onClick={() => {
              setActiveSubTab('records');
              fetchQuotations(selectedYear);
            }}
            startIcon={<ListAltRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: activeSubTab === 'records' ? '#1E40AF' : '#FFFFFF',
              color: activeSubTab === 'records' ? '#FFFFFF' : '#1E40AF',
              borderColor: '#1E40AF',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'none',
              px: 2,
              py: 0.5,
              height: '32px',
              '&:hover': {
                bgcolor: activeSubTab === 'records' ? '#1E3A8A' : '#EFF6FF',
              },
            }}
          >
            Quotation Records ({quotations.length})
          </Button>
        </Box>
      </Box>

      {/* Main Tab Content */}
      {activeSubTab === 'create' ? (
        <Box sx={{ p: { xs: 0.5, sm: 1 } }}>
          <ParticularsPage
            mode="QUOTATION"
            initialCustomerName={initialCustomerName}
            editBillData={editingQuotation}
            onEditSuccess={handleQuotationSaved}
            onConvertToEstimate={(billData) => {
              if (onNavigateToEstimate) onNavigateToEstimate(billData);
            }}
          />
        </Box>
      ) : (
        /* Quotation Records View */
        <Box sx={{ p: { xs: 1, sm: 1.5 }, maxWidth: '1400px', mx: 'auto' }}>
          {/* Top Filters & Year Bar */}
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: '6px',
              p: 1.5,
              mb: 1.5,
              border: '1px solid #CBD5E1',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            {/* Search Input */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, maxWidth: { xs: '100%', sm: '420px' } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  px: 1,
                  py: 0.4,
                  width: '100%',
                }}
              >
                <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748B', mr: 0.8 }} />
                <input
                  type="text"
                  placeholder="Search quotation by #, customer, mobile, date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    width: '100%',
                    fontSize: '12.5px',
                    color: '#0F172A',
                  }}
                />
                {searchTerm && (
                  <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.2 }}>
                    <ClearRoundedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Box>
            </Box>

            {/* Year Selector & Summary Metrics */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  Year:
                </Typography>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChangeFromDropdown(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid #94A3B8',
                    backgroundColor: '#FFFFFF',
                    color: '#1E40AF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">ALL YEARS</option>
                  {yearOptions.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </Box>

              <IconButton
                size="small"
                onClick={() => fetchQuotations(selectedYear)}
                sx={{
                  bgcolor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  p: 0.6,
                  '&:hover': { bgcolor: '#E2E8F0' },
                }}
              >
                <RefreshRoundedIcon sx={{ fontSize: 18, color: '#1E40AF' }} />
              </IconButton>
            </Box>
          </Box>

          {/* Quick Metrics Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box sx={{ bgcolor: '#FFFFFF', p: 1.5, borderRadius: '6px', border: '1px solid #CBD5E1', borderLeft: '4px solid #1E40AF' }}>
              <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Sample Quotations
              </Typography>
              <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', mt: 0.3 }}>
                {filteredQuotations.length} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Records</span>
              </Typography>
            </Box>

            <Box sx={{ bgcolor: '#FFFFFF', p: 1.5, borderRadius: '6px', border: '1px solid #CBD5E1', borderLeft: '4px solid #059669' }}>
              <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Quotation Value
              </Typography>
              <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#059669', mt: 0.3 }}>
                ₹ {totalQuotationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: '#FFFFFF', p: 1.5, borderRadius: '6px', border: '1px solid #CBD5E1', borderLeft: '4px solid #D97706' }}>
              <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Converted to Bills (Sales)
              </Typography>
              <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#D97706', mt: 0.3 }}>
                {convertedCount} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Converted</span>
              </Typography>
            </Box>
          </Box>

          {/* Quotations Table */}
          <TableContainer
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              maxHeight: '65vh',
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#E2E8F0', fontWeight: 800, fontSize: '11.5px', color: '#1E293B', width: '50px' }}>
                    S.No
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#E2E8F0', fontWeight: 800, fontSize: '11.5px', color: '#1E293B', width: '100px' }}>
                    Date
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#E2E8F0', fontWeight: 800, fontSize: '11.5px', color: '#1E293B', width: '110px' }}>
                    Quotation #
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#E2E8F0', fontWeight: 800, fontSize: '11.5px', color: '#1E293B' }}>
                    Customer Name
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#E2E8F0', fontWeight: 800, fontSize: '11.5px', color: '#1E293B' }}>
                    Mobile No
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#E2E8F0', fontWeight: 800, fontSize: '11.5px', color: '#1E293B', textAlign: 'center' }}>
                    Items
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#E2E8F0', fontWeight: 800, fontSize: '11.5px', color: '#1E293B', textAlign: 'right' }}>
                    Total (₹)
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#E2E8F0', fontWeight: 800, fontSize: '11.5px', color: '#1E293B', textAlign: 'center' }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#E2E8F0', fontWeight: 800, fontSize: '11.5px', color: '#1E293B', textAlign: 'center', minWidth: '220px' }}>
                    Actions / Convert
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5 }}>
                      <CircularProgress size={26} sx={{ color: '#1E40AF', mb: 1 }} />
                      <Typography sx={{ fontSize: '12.5px', color: '#64748B' }}>Loading quotation records...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5 }}>
                      <RequestQuoteRoundedIcon sx={{ fontSize: 36, color: '#94A3B8', mb: 1 }} />
                      <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>
                        No quotation records found
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#64748B', mb: 2 }}>
                        Create a sample quotation to view product prices for your customers.
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setActiveSubTab('create')}
                        startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
                        sx={{ bgcolor: '#1E40AF', textTransform: 'none', fontWeight: 700, fontSize: '12px' }}
                      >
                        Create New Quotation
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotations.map((q, idx) => {
                    const totalVal = parseFloat(String(q.total || q.amount || '0').replace(/,/g, '')) || 0;
                    const isConverted = Boolean(q.isConverted || q.convertedBillNo);
                    return (
                      <TableRow
                        key={q._id || q.id || idx}
                        hover
                        sx={{
                          bgcolor: isConverted ? '#F8FAFC' : '#FFFFFF',
                          '&:hover': { bgcolor: '#F1F5F9' },
                        }}
                      >
                        <TableCell sx={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                          {idx + 1}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {q.date || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12.5px', fontWeight: 800, color: '#1E40AF' }}>
                          #{q.billNo}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                          {q.customerName || 'General'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: '#475569' }}>
                          {q.customerPhone || q.customerMobile || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, textAlign: 'center', color: '#334155' }}>
                          {Array.isArray(q.products) ? q.products.length : 0}
                        </TableCell>
                        <TableCell sx={{ fontSize: '13px', fontWeight: 800, textAlign: 'right', color: '#0F172A' }}>
                          ₹ {totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {isConverted ? (
                            <Chip
                              icon={<CheckCircleRoundedIcon sx={{ fontSize: '14px !important', color: '#047857' }} />}
                              label={`Converted (#${q.convertedBillNo || 'Bill'})`}
                              size="small"
                              sx={{
                                bgcolor: '#ECFDF5',
                                color: '#047857',
                                fontWeight: 700,
                                fontSize: '11px',
                                height: '22px',
                                border: '1px solid #A7F3D0',
                              }}
                            />
                          ) : (
                            <Chip
                              label="Sample Quotation"
                              size="small"
                              sx={{
                                bgcolor: '#EFF6FF',
                                color: '#1D4ED8',
                                fontWeight: 700,
                                fontSize: '11px',
                                height: '22px',
                                border: '1px solid #BFDBFE',
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8 }}>
                            {/* Convert to Bill Button */}
                            {!isConverted && (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => openConvertDialog(q)}
                                startIcon={<TransformRoundedIcon sx={{ fontSize: 14 }} />}
                                sx={{
                                  bgcolor: '#059669',
                                  color: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  py: 0.3,
                                  px: 1,
                                  borderRadius: '3px',
                                  boxShadow: 'none',
                                  '&:hover': { bgcolor: '#047857' },
                                }}
                              >
                                Convert to Bill
                              </Button>
                            )}

                            {/* Print */}
                            <Tooltip title="Print Quotation">
                              <IconButton
                                size="small"
                                onClick={() => handlePrintQuotation(q)}
                                sx={{
                                  color: '#1E40AF',
                                  bgcolor: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '3px',
                                  p: 0.4,
                                  '&:hover': { bgcolor: '#DBEAFE' },
                                }}
                              >
                                <PrintOutlinedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>

                            {/* Duplicate to Multiple Customers */}
                            <Tooltip title="Duplicate for Multiple Customers">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setQuotationToDuplicate(q);
                                  setDuplicateModalOpen(true);
                                }}
                                sx={{
                                  color: '#047857',
                                  bgcolor: '#ECFDF5',
                                  border: '1px solid #A7F3D0',
                                  borderRadius: '3px',
                                  p: 0.4,
                                  '&:hover': { bgcolor: '#D1FAE5' },
                                }}
                              >
                                <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>

                            {/* Edit */}
                            <Tooltip title="Edit Quotation">
                              <IconButton
                                size="small"
                                onClick={() => handleEditQuotation(q)}
                                sx={{
                                  color: '#334155',
                                  bgcolor: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '3px',
                                  p: 0.4,
                                  '&:hover': { bgcolor: '#E2E8F0' },
                                }}
                              >
                                <EditRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>

                            {/* Delete */}
                            <Tooltip title="Delete Quotation">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteQuotation(q)}
                                sx={{
                                  color: '#DC2626',
                                  bgcolor: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '3px',
                                  p: 0.4,
                                  '&:hover': { bgcolor: '#FEE2E2' },
                                }}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
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
        </Box>
      )}

      {/* Convert to Estimate / Bill Confirmation Dialog */}
      <Dialog
        open={convertDialogOpen}
        onClose={() => !converting && setConvertDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '8px',
              p: 1,
              border: '2px solid #059669',
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1, color: '#065F46', fontWeight: 800, fontSize: '15px' }}>
          <ReceiptLongRoundedIcon sx={{ fontSize: 20, color: '#059669' }} />
          Convert Quotation to Estimate Bill
        </DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography sx={{ fontSize: '13px', color: '#0F172A', mb: 1 }}>
            Are you sure you want to convert Quotation <strong>#{quotationToConvert?.billNo}</strong> for customer <strong>{quotationToConvert?.customerName}</strong> into an official Estimate / Bill?
          </Typography>
          <Box sx={{ bgcolor: '#ECFDF5', border: '1px solid #A7F3D0', p: 1.5, borderRadius: '6px', mb: 1.5 }}>
            <Typography sx={{ fontSize: '12.5px', color: '#065F46', fontWeight: 600 }}>
              ✓ Automatically assigned next official Bill No
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: '#065F46', fontWeight: 600 }}>
              ✓ Automatically added to <strong>Sales Register</strong>
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: '#065F46', fontWeight: 600 }}>
              ✓ Automatically logged to Customer Account Ledger
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
            Amount: <strong>₹ {parseFloat(String(quotationToConvert?.total || quotationToConvert?.amount || '0').replace(/,/g, '')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setConvertDialogOpen(false)}
            disabled={converting}
            variant="outlined"
            sx={{
              color: '#64748B',
              borderColor: '#CBD5E1',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '12.5px',
              '&:hover': { bgcolor: '#F1F5F9' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeConvert}
            disabled={converting}
            variant="contained"
            startIcon={converting ? <CircularProgress size={14} color="inherit" /> : <TransformRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: '#059669',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '12.5px',
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            {converting ? 'Converting...' : 'Yes, Convert to Estimate Bill'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Preview Modal */}
      {selectedBillForPrint && (
        <BillPrintModal
          open={printModalOpen}
          onClose={() => {
            setPrintModalOpen(false);
            setSelectedBillForPrint(null);
          }}
          bill={selectedBillForPrint}
        />
      )}

      {/* Duplicate Bill Modal */}
      {duplicateModalOpen && quotationToDuplicate && (
        <DuplicateBillModal
          open={duplicateModalOpen}
          onClose={() => {
            setDuplicateModalOpen(false);
            setQuotationToDuplicate(null);
          }}
          templateBill={quotationToDuplicate}
          mode="QUOTATION"
          selectedYear={selectedYear === 'ALL' ? new Date().getFullYear() : Number(selectedYear)}
          onSuccess={() => {
            fetchQuotations(selectedYear);
          }}
        />
      )}

      {/* Snackbar Feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3500}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
          sx={{ fontWeight: 600, fontSize: '13px' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QuotationPage;
