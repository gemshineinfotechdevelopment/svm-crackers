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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Autocomplete,
  TextField,
  Divider,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import SortRoundedIcon from '@mui/icons-material/SortRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { ParticularsApi } from '../services/api';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';
import { DuplicateBillModal } from './DuplicateBillModal';
import { DateRangePrintModal } from './DateRangePrintModal';
import { printParticularsListDirectly, parseDateToTimestamp } from '../utils/printUtils';
import { getStoredSettings } from './SettingsPage';
import {
  getActiveBillingYear,
  setActiveBillingYear,
  getStandardYearOptions,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';
import { getSelectedBillYear } from '../utils/billYearUtils';

interface SalesPageProps {
  onNewEstimate?: () => void;
  onNewQuotation?: () => void;
  onEditBill?: (bill: any) => void;
}

type SortField = 'billNo' | 'date' | 'customerName' | 'total' | 'products' | 'sNo';
type SortOrder = 'asc' | 'desc';

export const SalesPage: FC<SalesPageProps> = ({ onNewEstimate, onNewQuotation, onEditBill }) => {
  const [storeSettings, setStoreSettings] = useState(() => getStoredSettings());
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Particular Bill Filter state ('ALL' or specific Bill No)
  const [selectedBillNo, setSelectedBillNo] = useState<string>('ALL');

  // Sorting state ('short pannura option')
  const [sortBy, setSortBy] = useState<SortField>('billNo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Year state ('ALL' or specific year)
  const [selectedYear, setSelectedYear] = useState<number | string>(() => {
    return getActiveBillingYear() || new Date().getFullYear();
  });
  const yearOptions = useMemo(() => getStandardYearOptions(), []);

  // Print modal state
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

  // View Bill Line Items Data Modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<any | null>(null);

  // Date Range Print Modal State
  const [openDatePrintModal, setOpenDatePrintModal] = useState<boolean>(false);

  // Duplicate for Multiple Customers state
  const [duplicateModalOpen, setDuplicateModalOpen] = useState<boolean>(false);
  const [billToDuplicate, setBillToDuplicate] = useState<any | null>(null);

  const fetchBills = async (yearToFetch?: number | string) => {
    try {
      setLoading(true);
      const targetYear = yearToFetch !== undefined ? yearToFetch : selectedYear;
      const data = await ParticularsApi.getAll(undefined, 'REGULAR', targetYear === 'ALL' ? undefined : targetYear);
      const regularBills = (Array.isArray(data) ? data : []).filter(
        (b: any) => b.billType !== 'GST' && !(b.billNo && String(b.billNo).toUpperCase().startsWith('GST'))
      );
      setBills(regularBills);
    } catch (err) {
      console.error('Failed to fetch sales bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(selectedYear);

    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    const handleYearChange = (e: any) => {
      const year = e?.detail?.year
        ? Number(e.detail.year)
        : (typeof getSelectedBillYear === 'function' ? Number(getSelectedBillYear()) : undefined);
      if (year) {
        setSelectedYear(year);
        fetchBills(year);
      } else {
        fetchBills();
      }
    };

    const handleBillSaved = () => {
      fetchBills();
    };

    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    window.addEventListener('apsara_bill_year_changed', handleYearChange);
    window.addEventListener('apsara_bill_saved', handleBillSaved);
    return () => {
      window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
      window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
      window.removeEventListener('apsara_bill_year_changed', handleYearChange);
      window.removeEventListener('apsara_bill_saved', handleBillSaved);
    };
  }, []);

  const handleYearChangeFromDropdown = (newYear: string | number) => {
    setSelectedYear(newYear);
    if (typeof newYear === 'number') {
      setActiveBillingYear(newYear);
    }
    fetchBills(newYear);
  };

  // Helper to extract integer from bill number for natural numeric sorting
  const extractBillNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    const str = String(val).replace(/[^0-9]/g, '');
    const num = parseInt(str, 10);
    return isNaN(num) ? 0 : num;
  };

  // Extract list of distinct bills for the Autocomplete / Quick Picker
  const billOptions = useMemo(() => {
    const map = new Map<string, { customerName: string; amount: number; date: string }>();
    bills.forEach((b) => {
      const bNo = String(b.billNo || '').trim();
      if (bNo && !map.has(bNo)) {
        const net = parseFloat(String(b.total || b.amount || '0').replace(/,/g, '')) || 0;
        map.set(bNo, {
          customerName: b.customerName || 'Cash Customer',
          amount: net,
          date: b.date || '',
        });
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => extractBillNumber(b[0]) - extractBillNumber(a[0]))
      .map(([billNo, info]) => ({
        billNo,
        label: `#${billNo} - ${info.customerName} (₹${info.amount.toLocaleString('en-IN')})`,
        customerName: info.customerName,
        date: info.date,
      }));
  }, [bills]);

  // Handle column header clicks for sorting
  const handleSortToggle = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      // Sensible defaults: customer names ascend A-Z, numbers/dates descend
      setSortOrder(field === 'customerName' ? 'asc' : 'desc');
    }
  };

  // Filtered & Sorted bills
  const filteredBills = useMemo(() => {
    let result = bills;

    // 1. Filter by specific Bill No if selected
    if (selectedBillNo && selectedBillNo !== 'ALL') {
      result = result.filter(
        (b) => String(b.billNo || '').trim().toLowerCase() === selectedBillNo.trim().toLowerCase()
      );
    }

    // 2. Search query filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (b) =>
          (b.billNo && String(b.billNo).toLowerCase().includes(term)) ||
          (b.customerName && b.customerName.toLowerCase().includes(term)) ||
          (b.customerPhone && b.customerPhone.includes(term)) ||
          (b.customerMobile && b.customerMobile.includes(term)) ||
          (b.customerAddress && b.customerAddress.toLowerCase().includes(term)) ||
          (b.companyName && b.companyName.toLowerCase().includes(term)) ||
          (b.date && b.date.toLowerCase().includes(term)) ||
          String(b.total || b.amount || '').includes(term) ||
          (Array.isArray(b.products) &&
            b.products.some(
              (p: any) =>
                (p.particular && p.particular.toLowerCase().includes(term)) ||
                (p.name && p.name.toLowerCase().includes(term)) ||
                (p.code && String(p.code).toLowerCase().includes(term))
            ))
      );
    }

    // 3. Sorting logic
    const sorted = [...result].sort((a, b) => {
      if (sortBy === 'billNo') {
        const numA = extractBillNumber(a.billNo);
        const numB = extractBillNumber(b.billNo);
        if (numA !== numB) return sortOrder === 'asc' ? numA - numB : numB - numA;
        return sortOrder === 'asc'
          ? String(a.billNo || '').localeCompare(String(b.billNo || ''))
          : String(b.billNo || '').localeCompare(String(a.billNo || ''));
      }
      if (sortBy === 'date') {
        const timeA = parseDateToTimestamp(a.date);
        const timeB = parseDateToTimestamp(b.date);
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (sortBy === 'customerName') {
        const nameA = String(a.customerName || '').toLowerCase();
        const nameB = String(b.customerName || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortBy === 'total') {
        const amtA = parseFloat(String(a.total || a.amount || '0').replace(/,/g, '')) || 0;
        const amtB = parseFloat(String(b.total || b.amount || '0').replace(/,/g, '')) || 0;
        return sortOrder === 'asc' ? amtA - amtB : amtB - amtA;
      }
      if (sortBy === 'products') {
        const cntA = Array.isArray(a.products) ? a.products.length : 0;
        const cntB = Array.isArray(b.products) ? b.products.length : 0;
        return sortOrder === 'asc' ? cntA - cntB : cntB - cntA;
      }
      return 0;
    });

    return sorted;
  }, [bills, selectedBillNo, searchTerm, sortBy, sortOrder]);

  // Key metrics
  const totalSalesAmount = useMemo(() => {
    return filteredBills.reduce((sum, b) => {
      const val = parseFloat(String(b.total || b.amount || '0').replace(/,/g, '')) || 0;
      return sum + val;
    }, 0);
  }, [filteredBills]);

  const totalDiscountAmount = useMemo(() => {
    return filteredBills.reduce((sum, b) => {
      const val = parseFloat(String(b.discount || '0').replace(/,/g, '')) || 0;
      return sum + val;
    }, 0);
  }, [filteredBills]);

  const handleDeleteBill = async (bill: any) => {
    const id = bill._id || bill.id;
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete Quotation Bill #${bill.billNo || ''} for ${bill.customerName}?`)) return;

    try {
      await ParticularsApi.delete(id);
      setBills((prev) => prev.filter((b) => (b._id || b.id) !== id));
      if (selectedBillNo === String(bill.billNo || '')) {
        setSelectedBillNo('ALL');
      }
    } catch (err: any) {
      console.error('Failed to delete bill:', err);
      alert(err.message || 'Error deleting bill');
    }
  };

  const handleOpenPrintBillModal = (bill: any) => {
    const printData: BillPrintData = {
      billNo: bill.billNo || '',
      date: bill.date || '',
      customerName: bill.customerName || '',
      customerPhone: bill.customerPhone || bill.customerMobile || '',
      customerAddress: bill.customerAddress || bill.address || '',
      customerGst: bill.customerGst || bill.gst || '',
      companyName:
        bill.companyName && bill.companyName.trim() !== '' && bill.companyName !== 'General'
          ? bill.companyName
          : storeSettings.companyName || 'S.V.M Fireworks Agencies',
      companyAddress: storeSettings.address,
      companyCity: storeSettings.city,
      companyPincode: storeSettings.pincode,
      companyState: storeSettings.state,
      companyPhone: storeSettings.phone,
      companyWhatsapp: storeSettings.whatsapp,
      logoUrl: storeSettings.logoUrl,
      transport: String(bill.transport || '0'),
      caseCount: String(bill.caseCount || '0'),
      discount: String(bill.discount || '0'),
      discountPercent: bill.discountPercent !== undefined ? bill.discountPercent : undefined,
      packing: String(bill.packing || bill.packingCharges || '0'),
      packingCharges: bill.packingCharges,
      packingPercent: bill.packingPercent,
      tax: String(bill.tax || '0'),
      subtotal: bill.subtotal || bill.amount,
      amount: String(bill.amount || bill.total || '0'),
      total: String(bill.total || '0'),
      pdfData: bill.pdfData || bill.pdfUrl || '',
      pdfUrl: bill.pdfUrl || '',
      products: (bill.products || []).map((p: any) => ({
        code: p.code || p.itemCode || p.slNo || '',
        particular: p.particular || p.name || '',
        quantity: p.quantity || '0',
        rate: p.rate || '0',
        pktUnit: p.pktUnit || p.unit || '1',
        content: p.content || p.unit || p.pktUnit || '1',
        amount: p.amount || '0',
      })),
    };
    setSelectedBillForPrint(printData);
    setPrintModalOpen(true);
  };

  const handleOpenDetailsModal = (bill: any) => {
    setSelectedBillForDetails(bill);
    setDetailsModalOpen(true);
  };

  // Export Bill(s) Data to CSV
  const handleExportCsv = () => {
    if (filteredBills.length === 0) {
      alert('No sales bills to export.');
      return;
    }

    // Single bill export (complete line items breakdown)
    if (filteredBills.length === 1 || (selectedBillNo && selectedBillNo !== 'ALL')) {
      const b = filteredBills[0];
      const headers = ['S.No', 'Item Code', 'Item Description', 'Quantity', 'Rate', 'Amount'];
      const productRows = (b.products || []).map((p: any, idx: number) => [
        idx + 1,
        `"${p.code || p.itemCode || ''}"`,
        `"${(p.particular || p.name || '').replace(/"/g, '""')}"`,
        p.quantity || '0',
        p.rate || '0',
        p.amount || '0',
      ]);

      const billMeta = [
        `"SALES BILL DATA EXTRACTION"`,
        `"Bill Number", "${b.billNo || ''}"`,
        `"Date", "${b.date || ''}"`,
        `"Customer Name", "${(b.customerName || '').replace(/"/g, '""')}"`,
        `"Mobile / Phone", "${b.customerPhone || b.customerMobile || ''}"`,
        `"Address", "${(b.customerAddress || b.address || '').replace(/"/g, '""')}"`,
        `"Company", "${(b.companyName || storeSettings.companyName || '').replace(/"/g, '""')}"`,
        `"Subtotal (Rs)", "${b.subtotal || b.amount || '0'}"`,
        `"Discount (Rs)", "${b.discount || '0'}"`,
        `"Packing (Rs)", "${b.packing || b.packingCharges || '0'}"`,
        `"Transport (Rs)", "${b.transport || '0'}"`,
        `"Net Amount (Rs)", "${b.total || b.amount || '0'}"`,
        '',
        headers.join(','),
        ...productRows.map((r: any) => r.join(',')),
      ].join('\n');

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(billMeta);
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', `Bill_${b.billNo || 'Export'}_${b.customerName || 'Customer'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Multiple bills register export
    const headers = [
      'S.No',
      'Bill No',
      'Date',
      'Customer Name',
      'Mobile',
      'Address',
      'Items Count',
      'Discount (Rs)',
      'Net Amount (Rs)',
    ];
    const rows = filteredBills.map((b, idx) => [
      idx + 1,
      `"${b.billNo || ''}"`,
      `"${b.date || ''}"`,
      `"${(b.customerName || '').replace(/"/g, '""')}"`,
      `"${b.customerPhone || b.customerMobile || ''}"`,
      `"${(b.customerAddress || b.address || '').replace(/"/g, '""')}"`,
      Array.isArray(b.products) ? b.products.length : 0,
      parseFloat(String(b.discount || '0').replace(/,/g, '')) || 0,
      parseFloat(String(b.total || b.amount || '0').replace(/,/g, '')) || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent([headers.join(','), ...rows.map((r) => r.join(','))].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Sales_Bills_Register_${selectedYear}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort direction indicator icon helper
  const renderSortArrow = (field: SortField) => {
    if (sortBy !== field) {
      return (
        <Typography component="span" sx={{ fontSize: '10px', color: '#94A3B8', ml: 0.4, userSelect: 'none' }}>
          ↕
        </Typography>
      );
    }
    return sortOrder === 'asc' ? (
      <ArrowUpwardRoundedIcon sx={{ fontSize: 13, color: '#1E40AF', ml: 0.3, verticalAlign: 'middle' }} />
    ) : (
      <ArrowDownwardRoundedIcon sx={{ fontSize: 13, color: '#1E40AF', ml: 0.3, verticalAlign: 'middle' }} />
    );
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 1.5 }, bgcolor: '#D9E4F2', minHeight: 'calc(100vh - 70px)' }}>
      {/* Outer ERP Window Card */}
      <Box
        sx={{
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
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {/* Left: Title & Badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongRoundedIcon sx={{ fontSize: 20, color: '#1E40AF' }} />
            <Typography
              sx={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '0.01em',
              }}
            >
              Sales Register (Estimate Bills)
            </Typography>
            <Box
              sx={{
                bgcolor: '#1E40AF',
                color: '#FFFFFF',
                px: 0.9,
                py: 0.15,
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {filteredBills.length} {filteredBills.length === 1 ? 'Bill' : 'Bills'}
            </Box>

            {/* If filtered to a particular bill, show active chip badge */}
            {selectedBillNo !== 'ALL' && (
              <Chip
                size="small"
                label={`Filtered: Bill #${selectedBillNo}`}
                onDelete={() => setSelectedBillNo('ALL')}
                deleteIcon={<CloseRoundedIcon sx={{ fontSize: '13px !important' }} />}
                sx={{
                  bgcolor: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  color: '#92400E',
                  fontWeight: 800,
                  fontSize: '11px',
                  height: '22px',
                }}
              />
            )}
          </Box>

          {/* Right: Year Filter + Quick Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
            {/* Year Selector */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: '#EFF6FF',
                border: '1px solid #93C5FD',
                borderRadius: '3px',
                px: 0.8,
                py: 0.2,
              }}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>
                Year:
              </Typography>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  handleYearChangeFromDropdown(val);
                }}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#1E3A8A',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL" style={{ color: '#0F172A', fontWeight: 700 }}>
                  All Years
                </option>
                {yearOptions.map((y) => (
                  <option key={y} value={y} style={{ color: '#0F172A', fontWeight: 600 }}>
                    {y}
                  </option>
                ))}
              </select>
            </Box>

            {/* Export CSV Data Button */}
            <Tooltip title="Export current sales bill data / particulars to Excel (.csv)">
              <Button
                onClick={handleExportCsv}
                startIcon={<FileDownloadRoundedIcon sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  height: '26px',
                  bgcolor: '#EDF4FB',
                  border: '1px solid #94A3B8',
                  color: '#0F172A',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  px: 1.2,
                  borderRadius: '3px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#D9E4F2' },
                }}
              >
                Export CSV
              </Button>
            </Tooltip>

            {/* Print Report */}
            <Button
              onClick={() => setOpenDatePrintModal(true)}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: 14 }} />}
              size="small"
              sx={{
                height: '26px',
                bgcolor: '#EDF4FB',
                border: '1px solid #94A3B8',
                color: '#0F172A',
                fontSize: '11.5px',
                fontWeight: 700,
                px: 1.2,
                borderRadius: '3px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#D9E4F2' },
              }}
            >
              Print Report
            </Button>

            {/* Refresh */}
            <Button
              onClick={() => fetchBills(selectedYear)}
              startIcon={<RefreshRoundedIcon sx={{ fontSize: 14 }} />}
              size="small"
              sx={{
                height: '26px',
                bgcolor: '#EDF4FB',
                border: '1px solid #94A3B8',
                color: '#0F172A',
                fontSize: '11.5px',
                fontWeight: 700,
                px: 1.2,
                borderRadius: '3px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#D9E4F2' },
              }}
            >
              Refresh
            </Button>

            {/* New Estimate Button */}
            {(onNewEstimate || onNewQuotation) && (
              <Button
                onClick={onNewEstimate || onNewQuotation}
                startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
                size="small"
                sx={{
                  height: '26px',
                  bgcolor: '#1E40AF',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  px: 1.5,
                  borderRadius: '3px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#1E3A8A' },
                }}
              >
                + New Estimate
              </Button>
            )}
          </Box>
        </Box>

        {/* Content Body */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
          {/* Controls Bar: Particular Bill Selector + Search + Sort Control + Summary */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.2,
              mb: 1.2,
              bgcolor: '#FFFFFF',
              border: '1px solid #B0C4DE',
              borderRadius: '3px',
              p: 1,
              flexWrap: 'wrap',
            }}
          >
            {/* Left Controls: Particular Bill Selector & Text Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
              {/* PARTICULAR BILL SELECTOR ("Particular bill mattum data edukura marii") */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#1E40AF', whiteSpace: 'nowrap' }}>
                  Bill Filter:
                </Typography>
                <Autocomplete
                  size="small"
                  options={billOptions}
                  getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
                  value={billOptions.find((opt) => opt.billNo === selectedBillNo) || null}
                  onChange={(_, val) => {
                    setSelectedBillNo(val ? val.billNo : 'ALL');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select Bill #..."
                      sx={{
                        width: '210px',
                        '& .MuiOutlinedInput-root': {
                          height: '28px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          bgcolor: selectedBillNo !== 'ALL' ? '#FEF9C3' : '#FFFFFF',
                          borderColor: selectedBillNo !== 'ALL' ? '#CA8A04' : '#CBD5E1',
                        },
                      }}
                    />
                  )}
                />
                {selectedBillNo !== 'ALL' && (
                  <Button
                    size="small"
                    onClick={() => setSelectedBillNo('ALL')}
                    sx={{
                      height: '28px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#DC2626',
                      bgcolor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      textTransform: 'none',
                      px: 0.8,
                      '&:hover': { bgcolor: '#FEE2E2' },
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Box>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: '24px', alignSelf: 'center' }} />

              {/* General Search Input */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: '180px' }}>
                <input
                  type="text"
                  placeholder="Search customer, phone, item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="erp-input"
                  style={{ flex: 1, maxWidth: '240px', height: '28px', fontSize: '11.5px' }}
                />
                {searchTerm && (
                  <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.2 }}>
                    <ClearRoundedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Box>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: '24px', alignSelf: 'center' }} />

              {/* SORT DROPDOWN ("short pannura option") */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SortRoundedIcon sx={{ fontSize: 16, color: '#475569' }} />
                <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                  Sort:
                </Typography>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  style={{
                    height: '28px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '3px',
                    padding: '0 6px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="billNo-desc">Bill No: High → Low (Newest)</option>
                  <option value="billNo-asc">Bill No: Low → High (Oldest)</option>
                  <option value="date-desc">Date: Newest First</option>
                  <option value="date-asc">Date: Oldest First</option>
                  <option value="total-desc">Amount: High → Low</option>
                  <option value="total-asc">Amount: Low → High</option>
                  <option value="customerName-asc">Customer Name: A → Z</option>
                  <option value="customerName-desc">Customer Name: Z → A</option>
                  <option value="products-desc">Items Count: Most First</option>
                </select>
              </Box>
            </Box>

            {/* Summary KPI Badges */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                  Total Invoiced:
                </Typography>
                <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#166534' }}>
                  ₹{totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>

              {totalDiscountAmount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                    Discount:
                  </Typography>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#DC2626' }}>
                    ₹{totalDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Sales Bills Table */}
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid #B0C4DE',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)', minHeight: '380px' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                    {/* S.No */}
                    <TableCell
                      sx={{
                        width: '50px',
                        fontWeight: 700,
                        bgcolor: '#DCE7F5',
                        color: '#0F172A',
                        fontSize: '12px',
                        textAlign: 'center',
                      }}
                    >
                      #
                    </TableCell>

                    {/* Bill No (Interactive Sortable) */}
                    <TableCell
                      onClick={() => handleSortToggle('billNo')}
                      sx={{
                        width: '100px',
                        fontWeight: 700,
                        bgcolor: '#DCE7F5',
                        color: sortBy === 'billNo' ? '#1E40AF' : '#0F172A',
                        fontSize: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': { bgcolor: '#CFE0F2' },
                      }}
                    >
                      Bill No {renderSortArrow('billNo')}
                    </TableCell>

                    {/* Date (Interactive Sortable) */}
                    <TableCell
                      onClick={() => handleSortToggle('date')}
                      sx={{
                        width: '110px',
                        fontWeight: 700,
                        bgcolor: '#DCE7F5',
                        color: sortBy === 'date' ? '#1E40AF' : '#0F172A',
                        fontSize: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': { bgcolor: '#CFE0F2' },
                      }}
                    >
                      Date {renderSortArrow('date')}
                    </TableCell>

                    {/* Customer Name (Interactive Sortable) */}
                    <TableCell
                      onClick={() => handleSortToggle('customerName')}
                      sx={{
                        fontWeight: 700,
                        bgcolor: '#DCE7F5',
                        color: sortBy === 'customerName' ? '#1E40AF' : '#0F172A',
                        fontSize: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': { bgcolor: '#CFE0F2' },
                      }}
                    >
                      Customer Name {renderSortArrow('customerName')}
                    </TableCell>

                    {/* Mobile */}
                    <TableCell
                      sx={{ width: '130px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}
                    >
                      Mobile / Phone
                    </TableCell>

                    {/* Address */}
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Address / City
                    </TableCell>

                    {/* Items Count (Interactive Sortable) */}
                    <TableCell
                      align="center"
                      onClick={() => handleSortToggle('products')}
                      sx={{
                        width: '85px',
                        fontWeight: 700,
                        bgcolor: '#DCE7F5',
                        color: sortBy === 'products' ? '#1E40AF' : '#0F172A',
                        fontSize: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': { bgcolor: '#CFE0F2' },
                      }}
                    >
                      Items {renderSortArrow('products')}
                    </TableCell>

                    {/* Net Amount (Interactive Sortable) */}
                    <TableCell
                      align="right"
                      onClick={() => handleSortToggle('total')}
                      sx={{
                        width: '120px',
                        fontWeight: 700,
                        bgcolor: '#DCE7F5',
                        color: sortBy === 'total' ? '#1E40AF' : '#0F172A',
                        fontSize: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': { bgcolor: '#CFE0F2' },
                      }}
                    >
                      Net Amount (₹) {renderSortArrow('total')}
                    </TableCell>

                    {/* Actions */}
                    <TableCell
                      align="center"
                      sx={{ width: '220px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={28} />
                        <Typography sx={{ mt: 1, fontSize: '12px', color: '#64748B' }}>
                          Loading Sales Bills...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                        <Typography sx={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                          {selectedBillNo !== 'ALL'
                            ? `Bill #${selectedBillNo} not found in current list.`
                            : searchTerm
                            ? 'No sales bills matching your search.'
                            : selectedYear === 'ALL'
                            ? 'No sales bills found in database.'
                            : `No sales bills created for Year ${selectedYear}.`}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1.5 }}>
                          {selectedBillNo !== 'ALL' && (
                            <Button
                              onClick={() => setSelectedBillNo('ALL')}
                              size="small"
                              variant="outlined"
                              sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                              Show All Bills
                            </Button>
                          )}
                          {selectedYear !== 'ALL' && selectedBillNo === 'ALL' && (
                            <Button
                              onClick={() => handleYearChangeFromDropdown('ALL')}
                              size="small"
                              variant="outlined"
                              sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                              Show All Years
                            </Button>
                          )}
                          {(onNewEstimate || onNewQuotation) && !searchTerm && (
                            <Button
                              onClick={onNewEstimate || onNewQuotation}
                              size="small"
                              variant="contained"
                              sx={{ bgcolor: '#1E40AF', textTransform: 'none', fontWeight: 700 }}
                            >
                              + Create First Estimate Bill
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill, index) => {
                      const id = bill._id || bill.id;
                      const netAmt = parseFloat(String(bill.total || bill.amount || '0').replace(/,/g, '')) || 0;
                      const productCount = Array.isArray(bill.products) ? bill.products.length : 0;
                      const isFilteredMatch = selectedBillNo !== 'ALL' && String(bill.billNo) === selectedBillNo;

                      return (
                        <TableRow
                          key={id || index}
                          hover
                          sx={{
                            bgcolor: isFilteredMatch ? '#FEFCE8' : index % 2 === 1 ? '#F8FAFC' : '#FFFFFF',
                            '&:hover': { bgcolor: '#EBF3FB !important' },
                          }}
                        >
                          {/* S.No */}
                          <TableCell align="center" sx={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                            {index + 1}
                          </TableCell>

                          {/* Bill No (Click to isolate or view) */}
                          <TableCell sx={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF' }}>
                            <Tooltip title="Click to isolate this particular bill's data">
                              <Box
                                onClick={() => {
                                  setSelectedBillNo(String(bill.billNo || ''));
                                }}
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.4,
                                  bgcolor: isFilteredMatch ? '#FDE047' : '#EFF6FF',
                                  border: isFilteredMatch ? '1px solid #CA8A04' : '1px solid #BFDBFE',
                                  px: 0.8,
                                  py: 0.2,
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: '#DBEAFE', textDecoration: 'underline' },
                                }}
                              >
                                #{bill.billNo || 'N/A'}
                              </Box>
                            </Tooltip>
                          </TableCell>

                          {/* Date */}
                          <TableCell sx={{ fontSize: '12px', color: '#0F172A', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {bill.date || 'N/A'}
                          </TableCell>

                          {/* Customer Name */}
                          <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                            {bill.customerName || 'Cash Customer'}
                            {bill.companyName && bill.companyName !== 'General' && (
                              <Typography component="span" sx={{ fontSize: '10.5px', color: '#64748B', ml: 0.8, fontWeight: 500 }}>
                                ({bill.companyName})
                              </Typography>
                            )}
                          </TableCell>

                          {/* Mobile */}
                          <TableCell sx={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                            {bill.customerPhone || bill.customerMobile || '-'}
                          </TableCell>

                          {/* Address */}
                          <TableCell sx={{ fontSize: '12px', color: '#475569' }}>
                            {bill.customerAddress || bill.address || '-'}
                          </TableCell>

                          {/* Items count */}
                          <TableCell align="center" sx={{ fontSize: '12px', color: '#0F172A', fontWeight: 600 }}>
                            {productCount} {productCount === 1 ? 'item' : 'items'}
                          </TableCell>

                          {/* Net Total */}
                          <TableCell align="right" sx={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                            ₹{netAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              {/* VIEW DATA / ITEMS BUTTON ("particular bill mattum data edukura marii") */}
                              <Tooltip title="View full bill line items & data breakdown">
                                <Button
                                  size="small"
                                  onClick={() => handleOpenDetailsModal(bill)}
                                  startIcon={<VisibilityRoundedIcon sx={{ fontSize: 13 }} />}
                                  sx={{
                                    height: '24px',
                                    px: 0.8,
                                    py: 0,
                                    bgcolor: '#FEF3C7',
                                    border: '1px solid #F59E0B',
                                    color: '#92400E',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: '2px',
                                    '&:hover': { bgcolor: '#FDE68A' },
                                  }}
                                >
                                  Data
                                </Button>
                              </Tooltip>

                              {/* Print Button */}
                              <Tooltip title="View & Print Bill">
                                <Button
                                  size="small"
                                  onClick={() => handleOpenPrintBillModal(bill)}
                                  startIcon={<PrintOutlinedIcon sx={{ fontSize: 13 }} />}
                                  sx={{
                                    height: '24px',
                                    px: 0.8,
                                    py: 0,
                                    bgcolor: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    color: '#1E40AF',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: '2px',
                                    '&:hover': { bgcolor: '#DBEAFE' },
                                  }}
                                >
                                  Print
                                </Button>
                              </Tooltip>

                              {/* Duplicate to Multiple Customers Button */}
                              <Tooltip title="Duplicate for Multiple Customers">
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setBillToDuplicate(bill);
                                    setDuplicateModalOpen(true);
                                  }}
                                  startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 13 }} />}
                                  sx={{
                                    height: '24px',
                                    px: 0.8,
                                    py: 0,
                                    bgcolor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    color: '#047857',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: '2px',
                                    '&:hover': { bgcolor: '#D1FAE5' },
                                  }}
                                >
                                  Duplicate
                                </Button>
                              </Tooltip>

                              {/* Edit Button */}
                              {onEditBill && (
                                <Tooltip title="Edit Estimate Bill">
                                  <Button
                                    size="small"
                                    onClick={() => onEditBill(bill)}
                                    startIcon={<EditRoundedIcon sx={{ fontSize: 13 }} />}
                                    sx={{
                                      height: '24px',
                                      px: 0.8,
                                      py: 0,
                                      bgcolor: '#EDF4FB',
                                      border: '1px solid #94A3B8',
                                      color: '#0F172A',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      textTransform: 'none',
                                      borderRadius: '2px',
                                      '&:hover': { bgcolor: '#D9E4F2' },
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </Tooltip>
                              )}

                              {/* Delete Button */}
                              <Tooltip title="Delete Bill">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteBill(bill)}
                                  sx={{
                                    color: '#DC2626',
                                    bgcolor: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '2px',
                                    p: 0.3,
                                    '&:hover': { bgcolor: '#DC2626', color: '#FFFFFF' },
                                  }}
                                >
                                  <DeleteOutlineRoundedIcon sx={{ fontSize: 13 }} />
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
        </Box>
      </Box>

      {/* Bill Line Items Data Inspection Modal ("particular bill mattum data edukura marii") */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '6px',
              border: '1px solid #94A3B8',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
            },
          },
        }}
      >
        {selectedBillForDetails && (
          <>
            <DialogTitle
              sx={{
                background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
                borderBottom: '1px solid #A8C2DC',
                color: '#0F172A',
                px: 2,
                py: 1.2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLongRoundedIcon sx={{ color: '#1E40AF', fontSize: 20 }} />
                <Typography sx={{ fontSize: '14px', fontWeight: 800 }}>
                  Estimate Bill Data: #{selectedBillForDetails.billNo}
                </Typography>
                <Chip
                  size="small"
                  label={selectedBillForDetails.date}
                  sx={{ bgcolor: '#EFF6FF', color: '#1E40AF', fontWeight: 700, fontSize: '11px', height: '20px' }}
                />
              </Box>
              <IconButton size="small" onClick={() => setDetailsModalOpen(false)} sx={{ color: '#0F172A' }}>
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2, bgcolor: '#FFFFFF' }}>
              <div>
                {/* Header Information Box */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.5,
                    p: 1.5,
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '4px',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Customer Name:</Typography>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                      {selectedBillForDetails.customerName || 'Cash Customer'}
                    </Typography>
                    {selectedBillForDetails.companyName && selectedBillForDetails.companyName !== 'General' && (
                      <Typography sx={{ fontSize: '11.5px', color: '#1E40AF', fontWeight: 600 }}>
                        Company: {selectedBillForDetails.companyName}
                      </Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Contact & Address:</Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      Phone: {selectedBillForDetails.customerPhone || selectedBillForDetails.customerMobile || '-'}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#475569' }}>
                      Place: {selectedBillForDetails.customerAddress || selectedBillForDetails.address || '-'}
                    </Typography>
                  </Box>
                </Box>

                {/* Line Items Table */}
                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', mb: 0.8 }}>
                  Particular Items ({Array.isArray(selectedBillForDetails.products) ? selectedBillForDetails.products.length : 0} items)
                </Typography>

                <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: '3px', maxHeight: '300px' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                        <TableCell sx={{ width: '40px', fontWeight: 700, fontSize: '11.5px', bgcolor: '#DCE7F5' }}>#</TableCell>
                        <TableCell sx={{ width: '80px', fontWeight: 700, fontSize: '11.5px', bgcolor: '#DCE7F5' }}>Code</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', bgcolor: '#DCE7F5' }}>Item Description</TableCell>
                        <TableCell align="center" sx={{ width: '70px', fontWeight: 700, fontSize: '11.5px', bgcolor: '#DCE7F5' }}>Qty</TableCell>
                        <TableCell align="right" sx={{ width: '90px', fontWeight: 700, fontSize: '11.5px', bgcolor: '#DCE7F5' }}>Rate (₹)</TableCell>
                        <TableCell align="right" sx={{ width: '100px', fontWeight: 700, fontSize: '11.5px', bgcolor: '#DCE7F5' }}>Amount (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(selectedBillForDetails.products || []).map((prod: any, idx: number) => {
                        const itemAmt = parseFloat(String(prod.amount || '0')) || 0;
                        const itemRate = parseFloat(String(prod.rate || '0')) || 0;
                        return (
                          <TableRow key={idx} sx={{ '&:nth-of-type(even)': { bgcolor: '#F8FAFC' } }}>
                            <TableCell sx={{ fontSize: '11.5px', color: '#64748B' }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontSize: '11.5px', fontFamily: 'monospace', fontWeight: 700, color: '#1E40AF' }}>
                              {prod.code || prod.itemCode || '-'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                              {prod.particular || prod.name}
                            </TableCell>
                            <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 700 }}>
                              {prod.quantity}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: '12px', color: '#334155' }}>
                              ₹{itemRate.toFixed(2)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                              ₹{itemAmt.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Charges & Net Amount Breakdown */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: '100%', sm: '320px' },
                      bgcolor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      p: 1.2,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: '12px' }}>
                      <Typography sx={{ fontSize: '12px', color: '#64748B' }}>Subtotal:</Typography>
                      <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>
                        ₹{parseFloat(String(selectedBillForDetails.subtotal || selectedBillForDetails.amount || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {parseFloat(String(selectedBillForDetails.discount || '0')) > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: '12px' }}>
                        <Typography sx={{ fontSize: '12px', color: '#DC2626' }}>Discount:</Typography>
                        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#DC2626' }}>
                          - ₹{parseFloat(String(selectedBillForDetails.discount || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    )}

                    {parseFloat(String(selectedBillForDetails.packing || selectedBillForDetails.packingCharges || '0')) > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: '12px' }}>
                        <Typography sx={{ fontSize: '12px', color: '#64748B' }}>Packing:</Typography>
                        <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>
                          + ₹{parseFloat(String(selectedBillForDetails.packing || selectedBillForDetails.packingCharges || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    )}

                    {parseFloat(String(selectedBillForDetails.transport || '0')) > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: '12px' }}>
                        <Typography sx={{ fontSize: '12px', color: '#64748B' }}>Transport:</Typography>
                        <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>
                          + ₹{parseFloat(String(selectedBillForDetails.transport || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    )}

                    <Divider sx={{ my: 0.8 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Net Total:</Typography>
                      <Typography sx={{ fontSize: '15px', fontWeight: 900, color: '#166534' }}>
                        ₹{parseFloat(String(selectedBillForDetails.total || selectedBillForDetails.amount || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </div>
            </DialogContent>

            <DialogActions sx={{ p: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.8 }}>
                <Button
                  size="small"
                  onClick={() => {
                    handleOpenPrintBillModal(selectedBillForDetails);
                    setDetailsModalOpen(false);
                  }}
                  startIcon={<PrintOutlinedIcon sx={{ fontSize: 14 }} />}
                  variant="contained"
                  sx={{ bgcolor: '#1E40AF', textTransform: 'none', fontWeight: 700, fontSize: '12px' }}
                >
                  Print Bill
                </Button>

                <Button
                  size="small"
                  onClick={handleExportCsv}
                  startIcon={<FileDownloadRoundedIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: '#EDF4FB',
                    border: '1px solid #94A3B8',
                    color: '#0F172A',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  Export CSV
                </Button>
              </Box>

              <Button onClick={() => setDetailsModalOpen(false)} sx={{ fontSize: '12px', color: '#64748B', textTransform: 'none' }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Bill Print & PDF Modal */}
      <BillPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        bill={selectedBillForPrint}
      />

      {/* Date Range Print Modal */}
      {openDatePrintModal && (
        <DateRangePrintModal
          open={openDatePrintModal}
          onClose={() => setOpenDatePrintModal(false)}
          title="Sales Estimate Bills Report"
          subtitle="Filter and print Estimate Bills list on standard A4 format"
          items={filteredBills}
          getDateFromItem={(item) => item.date || item.createdAt || ''}
          onConfirmPrint={(items, dateRangeText) => {
            printParticularsListDirectly(items, dateRangeText);
          }}
        />
      )}

      {/* Duplicate Bill to Multiple Customers Modal */}
      {duplicateModalOpen && billToDuplicate && (
        <DuplicateBillModal
          open={duplicateModalOpen}
          onClose={() => {
            setDuplicateModalOpen(false);
            setBillToDuplicate(null);
          }}
          templateBill={billToDuplicate}
          mode="ESTIMATE"
          selectedYear={selectedYear === 'ALL' ? new Date().getFullYear() : Number(selectedYear)}
          onSuccess={() => {
            fetchBills(selectedYear);
          }}
        />
      )}
    </Box>
  );
};

export default SalesPage;
