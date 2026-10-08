import { useState, useEffect, useMemo, type FC, type ChangeEvent } from 'react';
import {
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import {
  CustomersApi,
  CompaniesApi,
  ProductsApi,
  PriceListsApi,
  ParticularsApi,
} from '../services/api';
import { getStoredSettings } from './SettingsPage';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';
import {
  getActiveBillingYear,
  setActiveBillingYear,
  getStandardYearOptions,
  validateDateMatchesYear,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';
import { getSelectedBillYear } from '../utils/billYearUtils';
import { triggerYearRestrictionDialog } from './YearRestrictionDialog';

interface ProductRowItem {
  id: string;
  particular: string;
  quantity: string;
  rate: string;
  pktUnit: string;
  amount: string;
}

interface CustomerOptionItem {
  id: string;
  idCode?: string;
  name: string;
  mobile?: string;
  address?: string;
  gst?: string;
}

interface ProductCatalogOption {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  unit?: string;
}

interface ParticularsPageProps {
  initialCustomerName?: string;
  editBillData?: any | null;
  onEditSuccess?: () => void;
}

const getInitialDateStr = (targetYear?: number) => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = targetYear || d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const ParticularsPage: FC<ParticularsPageProps> = ({
  initialCustomerName,
  editBillData,
  onEditSuccess,
}) => {
  const [storeSettings] = useState(() => getStoredSettings());

  // Year state
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);
  const yearOptions = useMemo(() => getStandardYearOptions(), []);

  // Previous year billing history modal
  const [historyAlertOpen, setHistoryAlertOpen] = useState(false);
  const [customerHistoryInfo, setCustomerHistoryInfo] = useState<{
    customerName: string;
    currentYear: number;
    previousYears: { year: number; billCount: number }[];
  } | null>(null);

  // Dropdown options
  const [customerOptions, setCustomerOptions] = useState<CustomerOptionItem[]>([]);
  const [, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [productOptions, setProductOptions] = useState<ProductCatalogOption[]>([]);

  // 1. Customer Info Left Box State
  const [customerNo, setCustomerNo] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(() => getInitialDateStr(selectedYear));
  const [billNo, setBillNo] = useState<string>('');
  const [rateType, setRateType] = useState<string>('Befor Rate');
  const [customerGst, setCustomerGst] = useState<string>('');

  // 2. Customer Middle Selection & Right New Customer Form
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOptionItem | null>(null);
  const [customerName, setCustomerName] = useState<string>(initialCustomerName || '');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>(() => storeSettings.companyName || 'SVM Crackers');

  // 3. Product Selection Bar State
  const [quickCode, setQuickCode] = useState<string>('');
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<ProductCatalogOption | null>(null);
  const [quickUnit, setQuickUnit] = useState<string>('1 Box');
  const [productCatalogModalOpen, setProductCatalogModalOpen] = useState<boolean>(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState<string>('');

  // 4. Products Table Rows (Starts clean with 1 empty editable row)
  const [productRows, setProductRows] = useState<ProductRowItem[]>([
    { id: '1', particular: '', pktUnit: '1 Box', rate: '0', quantity: '1', amount: '0' },
  ]);

  // 5. Payment Info Right Box State
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [discountRs, setDiscountRs] = useState<string>('0');
  const [packingRs, setPackingRs] = useState<string>('');
  const [packingPercent, setPackingPercent] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');

  // UI status
  const [savingBill, setSavingBill] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

  const isEditMode = Boolean(editBillData && (editBillData._id || editBillData.id));

  // Check customer previous history
  const checkPreviousHistory = async (name: string, targetYear: number = selectedYear) => {
    if (!name || !name.trim() || isEditMode) return;
    try {
      const res = await ParticularsApi.getCustomerHistory(name.trim(), targetYear);
      if (res && res.hasPreviousBills && Array.isArray(res.previousYears) && res.previousYears.length > 0) {
        setCustomerHistoryInfo({
          customerName: name.trim(),
          currentYear: res.currentYear || targetYear,
          previousYears: res.previousYears,
        });
        setHistoryAlertOpen(true);
      }
    } catch (err) {
      console.error('Error checking customer billing history:', err);
    }
  };

  // Load backend data for a specific year
  const loadOptions = async (targetYear: number = selectedYear) => {
    try {
      const [custRes, compRes, prodRes, priceRes, lastBillRes] = await Promise.all([
        CustomersApi.getAll().catch(() => []),
        CompaniesApi.getAll().catch(() => []),
        ProductsApi.getAll(targetYear).catch(() => []),
        PriceListsApi.getAll({ year: targetYear }).catch(() => []),
        ParticularsApi.getNextBillNo('REGULAR', targetYear).catch(() => ({ nextBillNo: '1001' })),
      ]);

      if (Array.isArray(custRes) && custRes.length > 0) {
        const mapped: CustomerOptionItem[] = custRes.map((c: any, idx: number) => ({
          id: c._id || c.id,
          idCode: c.idCode || `C${450 + idx}`,
          name: c.name,
          mobile: c.mobile && c.mobile !== 'N/A' && c.mobile !== '-' ? c.mobile : '',
          address: c.address && c.address !== 'N/A' && c.address !== '-' ? c.address : '',
          gst: c.gst && c.gst !== 'N/A' && c.gst !== '-' ? c.gst : '',
        }));
        setCustomerOptions(mapped);

        // Match initial customer if provided
        if (initialCustomerName) {
          const match = mapped.find(
            (c) => c.name.toLowerCase().trim() === initialCustomerName.toLowerCase().trim()
          );
          if (match) {
            setSelectedCustomer(match);
            setCustomerName(match.name);
            setCustomerMobile(match.mobile || '');
            setCustomerAddress(match.address || '');
            setCustomerGst(match.gst || '');
            setCustomerNo(match.idCode || 'C452');
            checkPreviousHistory(match.name, targetYear);
          }
        }
      }

      if (Array.isArray(compRes) && compRes.length > 0) {
        setCompanyOptions(compRes.map((c: any) => ({ id: c._id || c.id, name: c.name })));
      }

      // Auto-assign Next Bill No if not editing
      if (!isEditMode) {
        setBillNo(lastBillRes.nextBillNo || '1001');
      }

      // Merge Products & Price List for selected year
      const prodMap = new Map<string, ProductCatalogOption>();
      if (Array.isArray(prodRes)) {
        prodRes.forEach((p: any, idx: number) => {
          const key = (p.name || '').trim();
          if (key) {
            prodMap.set(key.toLowerCase(), {
              id: p._id || p.id,
              sku: p.sku || `P${100 + idx}`,
              name: key,
              category: p.category || 'General',
              rate: typeof p.rate === 'number' ? p.rate : parseFloat(p.rate) || 0,
              mrp: typeof p.mrp === 'number' ? p.mrp : parseFloat(p.mrp) || 0,
              unit: p.unit || '1 Box',
            });
          }
        });
      }

      if (Array.isArray(priceRes)) {
        priceRes.forEach((p: any, idx: number) => {
          const key = (p.itemName || '').trim();
          if (key && !prodMap.has(key.toLowerCase())) {
            prodMap.set(key.toLowerCase(), {
              id: p._id || p.id,
              sku: `PL-${100 + idx}`,
              name: key,
              category: p.category || 'General',
              rate: typeof p.rate === 'number' ? p.rate : parseFloat(p.rate) || 0,
              mrp: typeof p.mrp === 'number' ? p.mrp : parseFloat(p.mrp) || 0,
              unit: p.unit || '1 Box',
            });
          }
        });
      }

      const unified = Array.from(prodMap.values());
      setProductOptions(unified);
    } catch (err) {
      console.error('Error loading data for Quotation page:', err);
    }
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    setActiveBillingYear(newYear);
    setBillDate(getInitialDateStr(newYear));
    loadOptions(newYear);
  };

  useEffect(() => {
    loadOptions(selectedYear);

    const handleGlobalYear = (e: any) => {
      if (e.detail?.year && e.detail.year !== selectedYear) {
        setSelectedYear(e.detail.year);
        setBillDate(getInitialDateStr(e.detail.year));
        loadOptions(e.detail.year);
      }
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleGlobalYear);
    return () => {
      window.removeEventListener(YEAR_CHANGE_EVENT, handleGlobalYear);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Edit Mode population
  useEffect(() => {
    if (editBillData && (editBillData._id || editBillData.id)) {
      setCustomerName(editBillData.customerName || '');
      setCustomerMobile(editBillData.customerPhone || '');
      setCustomerAddress(editBillData.customerAddress || '');
      setCustomerGst(editBillData.customerGst || '');
      setBillNo(String(editBillData.billNo || ''));
      setBillDate(editBillData.date || getInitialDateStr());
      setDiscountRs(String(editBillData.discount ?? '0'));
      setPackingRs(String(editBillData.packing ?? ''));
      setCompanyName(editBillData.companyName || storeSettings.companyName || 'Sri Vignatha Traders');
      setPaymentMode(editBillData.paymentMode || 'Cash');
      if (editBillData.notes) setRemarks(editBillData.notes);

      if (Array.isArray(editBillData.products) && editBillData.products.length > 0) {
        setProductRows(
          editBillData.products.map((p: any, i: number) => ({
            id: `edit-${i}-${Date.now()}`,
            particular: p.particular || p.name || '',
            quantity: String(p.quantity ?? '1'),
            rate: String(p.rate ?? '0'),
            pktUnit: p.pktUnit || p.unit || '1 Box',
            amount: String(p.amount ?? ((parseFloat(p.quantity) || 0) * (parseFloat(p.rate) || 0)).toFixed(2)),
          }))
        );
      }
    }
  }, [editBillData, storeSettings]);

  // When Customer dropdown is selected
  const handleSelectCustomer = (_: any, opt: CustomerOptionItem | null) => {
    setSelectedCustomer(opt);
    if (opt) {
      setCustomerName(opt.name);
      setCustomerMobile(opt.mobile || '');
      setCustomerAddress(opt.address || '');
      setCustomerGst(opt.gst || '');
      if (opt.idCode) setCustomerNo(opt.idCode);
      checkPreviousHistory(opt.name, selectedYear);
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return productRows.reduce((sum, r) => {
      const q = parseFloat(r.quantity) || 0;
      const rateVal = parseFloat(r.rate) || 0;
      return sum + q * rateVal;
    }, 0);
  }, [productRows]);

  const discountAmount = useMemo(() => {
    const dVal = parseFloat(discountRs) || 0;
    const dPct = parseFloat(discountPercent) || 0;
    if (dVal > 0) return dVal;
    if (dPct > 0) return (subtotal * dPct) / 100;
    return 0;
  }, [discountRs, discountPercent, subtotal]);

  const packingAmount = useMemo(() => {
    const pVal = parseFloat(packingRs) || 0;
    const pPct = parseFloat(packingPercent) || 0;
    if (pVal > 0) return pVal;
    if (pPct > 0) return (subtotal * pPct) / 100;
    return 0;
  }, [packingRs, packingPercent, subtotal]);

  const netPayment = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + packingAmount);
  }, [subtotal, discountAmount, packingAmount]);

  // Row Management
  const handleRowChange = (id: string, field: keyof ProductRowItem, val: string) => {
    setProductRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: val };
        const q = parseFloat(field === 'quantity' ? val : row.quantity) || 0;
        const r = parseFloat(field === 'rate' ? val : row.rate) || 0;
        updated.amount = (q * r).toFixed(0);
        return updated;
      })
    );
  };

  const handleAddRow = () => {
    const newId = String(Date.now());
    setProductRows((prev) => [
      ...prev,
      {
        id: newId,
        particular: '',
        pktUnit: '1 Box',
        rate: '0',
        quantity: '1',
        amount: '0',
      },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    setProductRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Add selected product from top product bar
  const handleAddProductFromBar = (prod: ProductCatalogOption | null) => {
    if (!prod) return;
    const newRow: ProductRowItem = {
      id: String(Date.now()),
      particular: prod.name,
      pktUnit: prod.unit || quickUnit || '1 Box',
      rate: String(prod.rate || '0'),
      quantity: '1',
      amount: String(prod.rate || '0'),
    };
    setProductRows((prev) => [...prev, newRow]);
    setSelectedCatalogProduct(null);
    setQuickCode('');
  };

  // Save Quotation / Bill
  const handleSaveBill = async () => {
    if (!isEditMode) {
      const currentSystemYear = new Date().getFullYear().toString();
      const selectedViewYear = getSelectedBillYear();
      if (selectedViewYear !== currentSystemYear) {
        triggerYearRestrictionDialog({ selectedYear: selectedViewYear, currentSystemYear });
        return;
      }
    }
    if (!customerName.trim()) {
      setSnackbarMessage('Please enter or select Customer Name.');
      setSnackbarOpen(true);
      return;
    }

    // Validate bill date matches selected year
    if (!validateDateMatchesYear(billDate, selectedYear)) {
      setSnackbarMessage(`Bill date (${billDate}) does not belong to the selected year ${selectedYear}. Please select a date from ${selectedYear}.`);
      setSnackbarOpen(true);
      return;
    }

    const validRows = productRows.filter((r) => r.particular.trim() !== '');
    if (validRows.length === 0) {
      setSnackbarMessage('Please add at least one product item.');
      setSnackbarOpen(true);
      return;
    }

    setSavingBill(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerMobile.trim(),
        customerAddress: customerAddress.trim(),
        customerGst: customerGst.trim(),
        companyName: companyName || storeSettings.companyName || 'Sri Vignatha Traders',
        billNo: billNo || '1001',
        date: billDate,
        year: selectedYear,
        discount: String(discountAmount),
        packing: String(packingAmount),
        transport: '0',
        tax: '0',
        amount: subtotal.toFixed(2),
        total: netPayment.toFixed(2),
        paymentMode: paymentMode || 'Cash',
        paymentStatus: paymentMode === 'Cash' || paymentMode === 'UPI' ? 'PAID' : 'UNPAID',
        paidAmount: paymentMode === 'Cash' || paymentMode === 'UPI' ? netPayment.toFixed(2) : '0.00',
        notes: remarks,
        products: validRows.map((r) => ({
          particular: r.particular,
          quantity: r.quantity,
          rate: r.rate,
          pktUnit: r.pktUnit,
          amount: r.amount,
        })),
      };

      if (isEditMode && editBillData) {
        const id = editBillData._id || editBillData.id;
        await ParticularsApi.update(id, payload);
        setSnackbarMessage('Quotation / Bill updated successfully!');
      } else {
        await ParticularsApi.create(payload);
        setSnackbarMessage('Quotation / Bill saved successfully!');
      }

      setSnackbarOpen(true);

      // Construct bill data and open PDF Preview & Print Modal immediately
      const savedBillData: BillPrintData = {
        billNo: billNo || '1001',
        date: billDate,
        customerName: customerName.trim() || 'Valued Customer',
        customerPhone: customerMobile.trim(),
        customerAddress: customerAddress.trim(),
        customerGst: customerGst.trim(),
        companyName: companyName || storeSettings.companyName || 'Sri Vignatha Traders',
        subtotal: subtotal,
        discount: discountAmount,
        packing: packingAmount,
        total: netPayment,
        invoiceTitle: 'QUOTATION',
        products: validRows.map((r) => ({
          particular: r.particular,
          quantity: r.quantity,
          rate: r.rate,
          pktUnit: r.pktUnit,
          amount: r.amount,
        })),
      };

      setSelectedBillForPrint(savedBillData);
      setPrintModalOpen(true);
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      setSnackbarMessage(err.message || 'Failed to save Quotation.');
      setSnackbarOpen(true);
    } finally {
      setSavingBill(false);
    }
  };

  // Direct Print / PDF Handler
  const handlePrint = () => {
    const validRows = productRows.filter((r) => r.particular.trim() !== '');
    const billData: BillPrintData = {
      billNo: billNo || '1001',
      date: billDate,
      customerName: customerName || 'Valued Customer',
      customerPhone: customerMobile,
      customerAddress: customerAddress,
      customerGst: customerGst,
      companyName: companyName || storeSettings.companyName || 'Sri Vignatha Traders',
      subtotal: subtotal,
      discount: discountAmount,
      packing: packingAmount,
      total: netPayment,
      invoiceTitle: 'QUOTATION',
      products: validRows.map((r) => ({
        particular: r.particular,
        quantity: r.quantity,
        rate: r.rate,
        pktUnit: r.pktUnit,
        amount: r.amount,
      })),
    };

    setSelectedBillForPrint(billData);
    setPrintModalOpen(true);
  };

  // Reset / Exit Form
  const handleExitReset = () => {
    setCustomerName('');
    setCustomerMobile('');
    setCustomerAddress('');
    setCustomerGst('');
    setSelectedCustomer(null);
    setProductRows([
      { id: '1', particular: '', pktUnit: '1 Box', rate: '0', quantity: '1', amount: '0' },
    ]);
    setDiscountRs('0');
    setDiscountPercent('0');
    setPackingRs('');
    setPackingPercent('');
    setRemarks('');
  };

  // Filter products in catalog modal
  const filteredCatalog = useMemo(() => {
    if (!catalogSearchTerm.trim()) return productOptions;
    const term = catalogSearchTerm.toLowerCase();
    return productOptions.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term))
    );
  }, [productOptions, catalogSearchTerm]);

  // Generate visual empty filler rows to mirror the classic ERP look in the screenshot
  const minRowsDisplay = 12;
  const emptyRowsCount = Math.max(0, minRowsDisplay - productRows.length);

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 1.5 }, bgcolor: '#D9E4F2', minHeight: 'calc(100vh - 70px)' }}>
      {/* Outer Window / Card */}
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
        {/* Window Title Header Bar: "Customer Factory" */}
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
          {/* Window Icon + Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HubRoundedIcon sx={{ fontSize: 18, color: '#0284C7' }} />
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.01em',
              }}
            >
              Customer Factory (Quotation / Estimate)
            </Typography>
          </Box>

          {/* Right: Year Selector */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #93C5FD',
              borderRadius: '4px',
              px: 1,
              py: 0.2,
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>
              Billing Year:
            </Typography>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
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
              {yearOptions.map((y) => (
                <option key={y} value={y} style={{ color: '#0F172A', fontWeight: 600 }}>
                  {y}
                </option>
              ))}
            </select>
          </Box>
        </Box>

        {/* Inner Form Content */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
          {/* ========================================================= */}
          {/* TOP SECTION: 4 FIELDSET PANELS (Customer Info, Selection, New Customer, Address) */}
          {/* ========================================================= */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: '260px 1fr 280px 240px',
              },
              gap: 1,
              mb: 1,
              alignItems: 'stretch',
            }}
          >
            {/* Box 1: Customer Info (Left) */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Customer Info</legend>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                {/* Custmer No */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '75px' }}>
                    Custmer No
                  </Typography>
                  <input
                    type="text"
                    value={customerNo}
                    onChange={(e) => setCustomerNo(e.target.value)}
                    className="erp-input"
                    style={{ width: '120px' }}
                  />
                </Box>

                {/* Date */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '75px' }}>
                    Date
                  </Typography>
                  <input
                    type="text"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="erp-input"
                    style={{ width: '120px' }}
                  />
                </Box>

                {/* Bill No */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '75px' }}>
                    Bill No
                  </Typography>
                  <input
                    type="text"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    placeholder="Auto"
                    className="erp-input"
                    style={{ width: '120px' }}
                  />
                </Box>

                {/* Rate Type */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '75px' }}>
                    Rate Type
                  </Typography>
                  <select
                    value={rateType}
                    onChange={(e) => setRateType(e.target.value)}
                    className="erp-input"
                    style={{ width: '120px', fontSize: '11.5px' }}
                  >
                    <option value="Befor Rate">Befor Rate</option>
                    <option value="Net Rate">Net Rate</option>
                    <option value="Wholesale Rate">Wholesale Rate</option>
                    <option value="Retail Rate">Retail Rate</option>
                  </select>
                </Box>

                {/* GST No */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '75px' }}>
                    GST No
                  </Typography>
                  <input
                    type="text"
                    value={customerGst}
                    onChange={(e) => setCustomerGst(e.target.value)}
                    className="erp-input"
                    style={{ width: '120px' }}
                  />
                </Box>
              </Box>
            </fieldset>

            {/* Box 2: Customer Selection (Middle) with bold blue OR */}
            <fieldset className="erp-fieldset" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <legend className="erp-legend">Customer Info</legend>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                  Customer
                </Typography>
                <Autocomplete
                  size="small"
                  fullWidth
                  options={customerOptions}
                  getOptionLabel={(opt) => opt.name}
                  value={selectedCustomer}
                  onChange={handleSelectCustomer}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select / Search Customer..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          height: '28px',
                          fontSize: '12px',
                          padding: '0 4px',
                          bgcolor: '#FFFFFF',
                          borderColor: '#94A3B8',
                        },
                      }}
                    />
                  )}
                />
              </Box>

              {/* Bold Blue OR Label in center */}
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: '14px',
                  color: '#1E40AF',
                  px: 1,
                  userSelect: 'none',
                }}
              >
                OR
              </Typography>
            </fieldset>

            {/* Box 3: New Customer Form */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">New Customer</legend>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '65px' }}>
                    Name
                  </Typography>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="erp-input"
                    style={{ flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '65px' }}>
                    Mobile No
                  </Typography>
                  <input
                    type="text"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="erp-input"
                    style={{ flex: 1 }}
                  />
                </Box>
              </Box>
            </fieldset>

            {/* Box 4: Address Field */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Address</legend>
              <textarea
                rows={3}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Enter customer address..."
                className="erp-input"
                style={{
                  width: '100%',
                  height: 'calc(100% - 6px)',
                  resize: 'none',
                  fontSize: '12px',
                }}
              />
            </fieldset>
          </Box>

          {/* ========================================================= */}
          {/* PRODUCT SELECTION BAR: Code [...] Select Product A/cy */}
          {/* ========================================================= */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: '#FFFFFF',
              border: '1px solid #B0C4DE',
              borderRadius: '4px',
              p: 0.8,
              mb: 1,
              flexWrap: 'wrap',
            }}
          >
            {/* Code */}
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
              Code
            </Typography>
            <input
              type="text"
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value)}
              placeholder="Code"
              className="erp-input"
              style={{ width: '80px' }}
            />

            {/* Browse Button (...) */}
            <Button
              onClick={() => setProductCatalogModalOpen(true)}
              variant="outlined"
              size="small"
              sx={{
                minWidth: '28px',
                px: 1,
                py: 0.2,
                height: '26px',
                bgcolor: '#EDF4FB',
                borderColor: '#94A3B8',
                color: '#0F172A',
                fontWeight: 800,
                '&:hover': { bgcolor: '#D9E4F2' },
              }}
            >
              ...
            </Button>

            {/* Product Dropdown */}
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', ml: 1 }}>
              Product
            </Typography>
            <Autocomplete
              size="small"
              sx={{ flex: 1, minWidth: '220px' }}
              options={productOptions}
              getOptionLabel={(opt) => `${opt.name} - ₹${opt.rate || 0}`}
              value={selectedCatalogProduct}
              onChange={(_, opt) => {
                setSelectedCatalogProduct(opt);
                if (opt) {
                  handleAddProductFromBar(opt);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select Product..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '26px',
                      fontSize: '12px',
                      padding: '0 4px',
                      borderColor: '#94A3B8',
                    },
                  }}
                />
              )}
            />

            {/* A/cy / Content */}
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', ml: 1 }}>
              A/cy
            </Typography>
            <input
              type="text"
              value={quickUnit}
              onChange={(e) => setQuickUnit(e.target.value)}
              placeholder="1 Box"
              className="erp-input"
              style={{ width: '85px' }}
            />

            {/* Add Row Button */}
            <Button
              onClick={handleAddRow}
              startIcon={<AddRoundedIcon sx={{ fontSize: 14 }} />}
              size="small"
              sx={{
                height: '26px',
                bgcolor: '#EDF4FB',
                border: '1px solid #94A3B8',
                color: '#1E40AF',
                fontSize: '11.5px',
                fontWeight: 700,
                ml: 'auto',
                '&:hover': { bgcolor: '#DCE7F5' },
              }}
            >
              Add Row
            </Button>
          </Box>

          {/* ========================================================= */}
          {/* MAIN SPLIT SECTION: TABLE (Left ~68%) | PAYMENT INFO (Right ~32%) */}
          {/* ========================================================= */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' },
              gap: 1.5,
              alignItems: 'start',
            }}
          >
            {/* Left Side: Products Table */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #B0C4DE',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <TableContainer sx={{ maxHeight: '520px', minHeight: '380px' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                      <TableCell sx={{ width: '45px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5' }}>
                        S.No
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5' }}>
                        Product
                      </TableCell>
                      <TableCell sx={{ width: '100px', fontWeight: 700, bgcolor: '#DCE7F5' }}>
                        Content
                      </TableCell>
                      <TableCell sx={{ width: '90px', textAlign: 'right', fontWeight: 700, bgcolor: '#DCE7F5' }}>
                        Rate
                      </TableCell>
                      <TableCell sx={{ width: '75px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5' }}>
                        Qty
                      </TableCell>
                      <TableCell sx={{ width: '100px', textAlign: 'right', fontWeight: 700, bgcolor: '#DCE7F5' }}>
                        Total
                      </TableCell>
                      <TableCell sx={{ width: '35px', textAlign: 'center', bgcolor: '#DCE7F5', p: 0.5 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Active Product Rows */}
                    {productRows.map((row, idx) => (
                      <TableRow
                        key={row.id}
                        sx={{
                          '&:hover': { bgcolor: '#F1F7FD' },
                          '& td': { borderBottom: '1px solid #E2E8F0', py: 0.4 },
                        }}
                      >
                        {/* S.No */}
                        <TableCell sx={{ textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>
                          {idx + 1}
                        </TableCell>

                        {/* Product Name */}
                        <TableCell sx={{ p: 0.5 }}>
                          <input
                            type="text"
                            value={row.particular}
                            onChange={(e) => handleRowChange(row.id, 'particular', e.target.value)}
                            placeholder="Enter item name..."
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              color: '#0F172A',
                            }}
                          />
                        </TableCell>

                        {/* Content */}
                        <TableCell sx={{ p: 0.5 }}>
                          <input
                            type="text"
                            value={row.pktUnit}
                            onChange={(e) => handleRowChange(row.id, 'pktUnit', e.target.value)}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: '12px',
                              color: '#334155',
                            }}
                          />
                        </TableCell>

                        {/* Rate */}
                        <TableCell sx={{ textAlign: 'right', p: 0.5 }}>
                          <input
                            type="number"
                            value={row.rate}
                            onChange={(e) => handleRowChange(row.id, 'rate', e.target.value)}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: '12.5px',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: '#0F172A',
                            }}
                          />
                        </TableCell>

                        {/* Qty */}
                        <TableCell sx={{ textAlign: 'center', p: 0.5 }}>
                          <input
                            type="number"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: '12.5px',
                              textAlign: 'center',
                              fontWeight: 600,
                              color: '#0F172A',
                            }}
                          />
                        </TableCell>

                        {/* Total */}
                        <TableCell sx={{ textAlign: 'right', fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                          {row.amount}
                        </TableCell>

                        {/* Delete Button */}
                        <TableCell sx={{ textAlign: 'center', p: 0.2 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRow(row.id)}
                            sx={{ color: '#94A3B8', '&:hover': { color: '#DC2626' }, p: 0.2 }}
                          >
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Empty Grid Visual Fillers to match the software screenshot height */}
                    {Array.from({ length: emptyRowsCount }).map((_, i) => (
                      <TableRow key={`empty-${i}`} sx={{ height: '28px', '& td': { borderBottom: '1px solid #F1F5F9' } }}>
                        <TableCell sx={{ textAlign: 'center', color: '#CBD5E1', fontSize: '11px' }}>
                          {productRows.length + i + 1}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Right Side: Payment Info & Action Buttons */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #B0C4DE',
                borderRadius: '3px',
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.8,
              }}
            >
              <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#1E3A8A', borderBottom: '1px solid #E2E8F0', pb: 0.5, mb: 0.5 }}>
                Payment Info
              </Typography>

              {/* Total ( Rs. ) */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  Total ( Rs. )
                </Typography>
                <input
                  type="text"
                  readOnly
                  value={subtotal.toFixed(0)}
                  className="erp-input"
                  style={{ width: '150px', fontWeight: 700, textAlign: 'right', backgroundColor: '#F8FAFC' }}
                />
              </Box>

              {/* Discount ( % ) */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  Discount ( % )
                </Typography>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => {
                    setDiscountPercent(e.target.value);
                    const pct = parseFloat(e.target.value) || 0;
                    setDiscountRs(((subtotal * pct) / 100).toFixed(0));
                  }}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  className="erp-input"
                  style={{ width: '150px', textAlign: 'right' }}
                />
              </Box>

              {/* Discount ( Rs. ) */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  Discount ( Rs. )
                </Typography>
                <input
                  type="number"
                  value={discountRs}
                  onChange={(e) => {
                    setDiscountRs(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    setDiscountPercent(subtotal > 0 ? ((val / subtotal) * 100).toFixed(2) : '0');
                  }}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  className="erp-input"
                  style={{ width: '150px', textAlign: 'right' }}
                />
              </Box>

              {/* Packing ( Rs. ) */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  Packing ( Rs. )
                </Typography>
                <input
                  type="number"
                  value={packingRs}
                  onChange={(e) => setPackingRs(e.target.value)}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  className="erp-input"
                  style={{ width: '150px', textAlign: 'right' }}
                />
              </Box>

              {/* Packing ( % ) */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  Packing ( % )
                </Typography>
                <input
                  type="number"
                  value={packingPercent}
                  onChange={(e) => setPackingPercent(e.target.value)}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  className="erp-input"
                  style={{ width: '150px', textAlign: 'right' }}
                />
              </Box>

              {/* Net Payment ( Rs. ) */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>
                  Net Payment ( Rs. )
                </Typography>
                <input
                  type="text"
                  readOnly
                  value={netPayment.toFixed(0)}
                  className="erp-input"
                  style={{
                    width: '150px',
                    fontWeight: 900,
                    fontSize: '13.5px',
                    textAlign: 'right',
                    color: '#0F172A',
                    backgroundColor: '#F1F5F9',
                  }}
                />
              </Box>

              {/* Remarks */}
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', mb: 0.3 }}>
                  Remarks
                </Typography>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)}
                  className="erp-input"
                  style={{ width: '100%', resize: 'none', fontSize: '11.5px' }}
                />
              </Box>

              {/* Next Payment Mode */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A' }}>
                  Next Payment Mode
                </Typography>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="erp-input"
                  style={{ width: '150px', fontSize: '11.5px' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Credit">Credit / Due</option>
                </select>
              </Box>

              {/* Action Buttons: [ Save ] [ Print ] [ Exit ] */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 1,
                  mt: 2,
                  pt: 1,
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                {/* Save Button (Deep burgundy/plum as in screenshot) */}
                <Button
                  onClick={handleSaveBill}
                  disabled={savingBill}
                  variant="contained"
                  sx={{
                    bgcolor: '#741748',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    px: 2.5,
                    py: 0.5,
                    minWidth: '70px',
                    borderRadius: '3px',
                    '&:hover': { bgcolor: '#580e34' },
                  }}
                >
                  {savingBill ? <CircularProgress size={16} color="inherit" /> : 'Save'}
                </Button>

                {/* Print Button (Grey desktop button) */}
                <Button
                  onClick={handlePrint}
                  variant="outlined"
                  sx={{
                    bgcolor: '#E5ECF4',
                    borderColor: '#94A3B8',
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    px: 2,
                    py: 0.5,
                    minWidth: '65px',
                    borderRadius: '3px',
                    '&:hover': { bgcolor: '#D9E4F2' },
                  }}
                >
                  Print
                </Button>

                {/* Exit Button (Grey desktop button) */}
                <Button
                  onClick={handleExitReset}
                  variant="outlined"
                  sx={{
                    bgcolor: '#E5ECF4',
                    borderColor: '#94A3B8',
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    px: 2,
                    py: 0.5,
                    minWidth: '65px',
                    borderRadius: '3px',
                    '&:hover': { bgcolor: '#D9E4F2' },
                  }}
                >
                  Exit
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ========================================================= */}
      {/* QUICK PRODUCT CATALOG MODAL (...) */}
      {/* ========================================================= */}
      <Dialog
        open={productCatalogModalOpen}
        onClose={() => setProductCatalogModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '4px',
              border: '1px solid #B0C4DE',
            },
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: '#EDF4FB', borderBottom: '1px solid #B0C4DE', py: 1.2, fontSize: '14px', fontWeight: 700 }}>
          Select Product from Catalog
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search product by name or category..."
            value={catalogSearchTerm}
            onChange={(e) => setCatalogSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748B', mr: 1 }} />,
              },
            }}
            sx={{ mb: 1.5 }}
          />

          <TableContainer sx={{ maxHeight: '350px' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700 }}>SKU</TableCell>
                  <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700 }}>Product Name</TableCell>
                  <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700 }}>Unit</TableCell>
                  <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, textAlign: 'right' }}>Rate</TableCell>
                  <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, textAlign: 'center' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCatalog.map((prod) => (
                  <TableRow key={prod.id} hover>
                    <TableCell sx={{ fontSize: '11.5px', color: '#64748B' }}>{prod.sku || '-'}</TableCell>
                    <TableCell sx={{ fontSize: '12.5px', fontWeight: 600 }}>{prod.name}</TableCell>
                    <TableCell sx={{ fontSize: '12px', color: '#475569' }}>{prod.category || 'General'}</TableCell>
                    <TableCell sx={{ fontSize: '12px' }}>{prod.unit || '1 Box'}</TableCell>
                    <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, textAlign: 'right' }}>
                      ₹ {prod.rate || 0}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          handleAddProductFromBar(prod);
                          setProductCatalogModalOpen(false);
                        }}
                        sx={{ fontSize: '11px', py: 0.2, px: 1, bgcolor: '#1E40AF' }}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 1, borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setProductCatalogModalOpen(false)} sx={{ fontSize: '12px' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================= */}
      {/* PRINT PREVIEW MODAL */}
      {/* ========================================================= */}
      {selectedBillForPrint && (
        <BillPrintModal
          open={printModalOpen}
          onClose={() => {
            setPrintModalOpen(false);
            setSelectedBillForPrint(null);
            if (isEditMode && onEditSuccess) {
              onEditSuccess();
            }
          }}
          bill={selectedBillForPrint}
        />
      )}

      {/* ========================================================= */}
      {/* PREVIOUS YEAR BILLING FOUND WARNING DIALOG */}
      {/* ========================================================= */}
      <Dialog
        open={historyAlertOpen}
        onClose={() => setHistoryAlertOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '8px',
              p: 1,
              border: '2px solid #F59E0B',
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1, color: '#B45309', fontWeight: 800, fontSize: '15px' }}>
          ⚠️ Previous Year Bill Found
        </DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', mb: 1 }}>
            This customer has previous billing history:
          </Typography>
          <Box sx={{ bgcolor: '#FEF3C7', border: '1px solid #FCD34D', p: 1.5, borderRadius: '6px', mb: 2 }}>
            {customerHistoryInfo?.previousYears.map((py) => (
              <Box key={py.year} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                  {py.year}
                </Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#78350F' }}>
                  → {py.billCount} {py.billCount === 1 ? 'Bill' : 'Bills'}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontSize: '13px', color: '#1E293B', mb: 0.5 }}>
            You are currently creating a new bill for <strong>{customerHistoryInfo?.currentYear || selectedYear}</strong>.
          </Typography>
          <Typography sx={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>
            Do you want to continue with the {customerHistoryInfo?.currentYear || selectedYear} bill?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={() => {
              setHistoryAlertOpen(false);
              handleExitReset();
            }}
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
            onClick={() => setHistoryAlertOpen(false)}
            variant="contained"
            sx={{
              bgcolor: '#1E40AF',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '12.5px',
              '&:hover': { bgcolor: '#1E3A8A' },
            }}
          >
            Continue - Create {customerHistoryInfo?.currentYear || selectedYear} Bill
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbarMessage.includes('Failed') || snackbarMessage.includes('Please') ? 'error' : 'success'}
          onClose={() => setSnackbarOpen(false)}
          sx={{ fontWeight: 600, fontSize: '13px' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ParticularsPage;
