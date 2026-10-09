import { useState, useEffect, useMemo, type FC } from 'react';
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
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import {
  CustomersApi,
  ProductsApi,
  PriceListsApi,
  ParticularsApi,
} from '../services/api';
import { getStoredSettings } from './SettingsPage';
import { GstBillPrintModal } from './GstBillPrintModal';
import type { GstBillPrintData, GstProductItem } from './GstBillPrintTemplate';
import { numberToIndianWords } from '../utils/numberToWords';
import {
  getActiveBillingYear,
  validateDateMatchesYear,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';
import { getSelectedBillYear } from '../utils/billYearUtils';
import { triggerYearRestrictionDialog } from './YearRestrictionDialog';

export interface GstRowItem {
  id: string;
  particular: string;
  hsnCode: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
}

interface CustomerOptionItem {
  id: string;
  name: string;
  mobile?: string;
  address?: string;
  gst?: string;
  aadhar?: string;
}

export interface ProductCatalogOption {
  id: string;
  name: string;
  rate?: number;
  unit?: string;
  hsn?: string;
  category?: string;
}

export const getTodayDateString = (targetYear?: number) => {
  const today = new Date();
  const yyyy = targetYear || today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const GST_LOCAL_HISTORY_KEY = 'svm_gst_bills_history';

// Helper to format date as DD-MM-YYYY
export const getTodayDateStr = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const GstBillPage: FC = () => {
  const [storeSettings] = useState(() => getStoredSettings());
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history'>('create');

  // Year state synced with global Navbar/Settings
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);

  // Previous year billing history modal
  const [historyAlertOpen, setHistoryAlertOpen] = useState(false);
  const [customerHistoryInfo, setCustomerHistoryInfo] = useState<{
    customerName: string;
    currentYear: number;
    previousYears: { year: number; billCount: number }[];
  } | null>(null);

  // Options from API
  const [customerOptions, setCustomerOptions] = useState<CustomerOptionItem[]>([]);
  const [productOptions, setProductOptions] = useState<ProductCatalogOption[]>([]);

  // 1. Bill Info State (Top Left Box)
  const [billNo, setBillNo] = useState<string>('292');
  const [billDate, setBillDate] = useState<string>(getTodayDateStr);

  // 2. Customer Info State (Top Middle Box)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOptionItem | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerGst, setCustomerGst] = useState<string>('');
  const [customerAadhar, setCustomerAadhar] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // 3. Despatch Info State (Top Right Box)
  const [despatchedTo, setDespatchedTo] = useState<string>('');
  const [lorryTransport, setLorryTransport] = useState<string>('');
  const [lrNo, setLrNo] = useState<string>('');
  const [lrDate, setLrDate] = useState<string>(getTodayDateStr);
  const [totalCases, setTotalCases] = useState<string>('0');
  const [totalCasesManual, setTotalCasesManual] = useState<boolean>(false);

  // 4. Product Quick Entry Bar
  const [quickCode, setQuickCode] = useState<string>('');
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<ProductCatalogOption | null>(null);
  const [quickHsn, setQuickHsn] = useState<string>('3604');
  const [quickQty, setQuickQty] = useState<string>('1');
  const [quickUnit, setQuickUnit] = useState<string>('Case');
  const [quickRate, setQuickRate] = useState<string>('0');
  const [productCatalogModalOpen, setProductCatalogModalOpen] = useState<boolean>(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState<string>('');

  // 5. Product List Table State
  const [productRows, setProductRows] = useState<GstRowItem[]>([
    { id: '1', particular: '', hsnCode: '3604', quantity: '', unit: 'Case', rate: '', amount: '0' },
  ]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 6. Amount Info State (Right Panel)
  const [taxType, setTaxType] = useState<'CGST_SGST' | 'IGST'>('IGST');
  const [taxPercent, setTaxPercent] = useState<string>('18');
  const [billFlag, setBillFlag] = useState<boolean>(true);

  // UI state
  const [savingBill, setSavingBill] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<GstBillPrintData | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Calculations
  const calculations = useMemo(() => {
    let subTotal = 0;
    let autoCases = 0;

    const computedRows = productRows.map((r) => {
      const q = parseFloat(String(r.quantity)) || 0;
      const rateNum = parseFloat(String(r.rate)) || 0;
      const amt = q * rateNum;
      subTotal += amt;
      autoCases += q;
      return {
        ...r,
        amount: amt.toFixed(2),
      };
    });

    const taxNum = parseFloat(taxPercent) || 0;
    let cgstPct = '0';
    let cgstRs = 0;
    let sgstPct = '0';
    let sgstRs = 0;
    let igstPct = '0';
    let igstRs = 0;

    if (taxType === 'CGST_SGST') {
      const halfTax = taxNum / 2;
      cgstPct = halfTax.toString();
      sgstPct = halfTax.toString();
      cgstRs = (subTotal * halfTax) / 100;
      sgstRs = (subTotal * halfTax) / 100;
    } else {
      igstPct = taxNum.toString();
      igstRs = (subTotal * taxNum) / 100;
    }

    const totalTax = cgstRs + sgstRs + igstRs;
    const netAmountExact = subTotal + totalTax;
    const netAmountRounded = Math.round(netAmountExact);
    const roundOff = (netAmountRounded - netAmountExact).toFixed(2);

    const inWords = netAmountRounded > 0
      ? `${numberToIndianWords(netAmountRounded).replace(/\s*Rupees\s*/i, ' ').replace(/\s*Only\s*/i, '').trim()} Only.`
      : 'Zero Rupees Only.';

    return {
      computedRows,
      subTotal: subTotal.toFixed(2),
      subTotalNum: subTotal,
      autoCases,
      cgstPct,
      cgstRs: cgstRs.toFixed(2),
      sgstPct,
      sgstRs: sgstRs.toFixed(2),
      igstPct,
      igstRs: igstRs.toFixed(2),
      netAmount: netAmountRounded.toFixed(2),
      netAmountNum: netAmountRounded,
      roundOff,
      inWords,
    };
  }, [productRows, taxType, taxPercent]);

  // Customer previous history check
  const checkPreviousHistory = async (name: string, targetYear: number = selectedYear) => {
    if (!name || !name.trim()) return;
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
      console.error('Error checking customer billing history in GST bill:', err);
    }
  };

  // Keep total cases in sync if not manually entered
  useEffect(() => {
    if (!totalCasesManual) {
      setTotalCases(String(calculations.autoCases));
    }
  }, [calculations.autoCases, totalCasesManual]);

  // Load API options & next bill number
  const loadInitialData = async (targetYear: number | string = selectedYear) => {
    try {
      const effectiveYear = targetYear || getSelectedBillYear();
      const [custRes, prodRes, priceRes] = await Promise.all([
        CustomersApi.getAll(effectiveYear).catch(() => []),
        ProductsApi.getAll(undefined, effectiveYear).catch(() => []),
        PriceListsApi.getAll({ year: effectiveYear }).catch(() => []),
      ]);

      if (Array.isArray(custRes)) {
        setCustomerOptions(
          custRes.map((c: any) => ({
            id: c._id || c.id,
            name: c.name || '',
            mobile: c.mobile && c.mobile !== '-' ? c.mobile : '',
            address: c.address && c.address !== '-' ? c.address : '',
            gst: c.gst && c.gst !== 'N/A' ? c.gst : '',
            aadhar: c.aadhar || '',
          }))
        );
      }

      const pMap = new Map<string, ProductCatalogOption>();
      if (Array.isArray(prodRes)) {
        prodRes.forEach((p: any) => {
          if (p.name) {
            pMap.set(p.name.toLowerCase().trim(), {
              id: p._id || p.id,
              name: p.name.trim(),
              rate: p.rate || 0,
              unit: p.unit || 'Case',
              hsn: p.hsn || '3604',
              category: p.category || 'Crackers',
            });
          }
        });
      }

      if (Array.isArray(priceRes)) {
        priceRes.forEach((item: any) => {
          if (item.itemName) {
            const key = item.itemName.toLowerCase().trim();
            const existing = pMap.get(key);
            pMap.set(key, {
              id: item._id || item.id || key,
              name: item.itemName.trim(),
              rate: item.rate && item.rate > 0 ? item.rate : (existing?.rate || 0),
              unit: item.unit || existing?.unit || 'Case',
              hsn: item.hsn || existing?.hsn || '3604',
              category: item.category || existing?.category || 'Crackers',
            });
          }
        });
      }

      setProductOptions(Array.from(pMap.values()));
      await fetchNextGstBillNo(effectiveYear);
    } catch (e) {
      console.warn('Failed to load initial GST bill data', e);
    }
  };

  const fetchNextGstBillNo = async (targetYear: number | string = selectedYear) => {
    try {
      const res = await ParticularsApi.getNextBillNo('GST', targetYear);
      const rawNo = (res && typeof res === 'object' && 'nextBillNo' in res) ? res.nextBillNo : res;
      if (typeof rawNo === 'string' && rawNo.trim()) {
        const cleanNo = rawNo.replace(/^GST[-_ ]*/i, '');
        setBillNo(cleanNo || '292');
      } else {
        setBillNo('292');
      }
    } catch {
      setBillNo('292');
    }
  };

  // Fetch History Bills
  const fetchGstHistory = async (targetYear: number | string = selectedYear) => {
    setLoadingHistory(true);
    try {
      let bills: any[] = [];
      try {
        const effectiveYear = targetYear || getSelectedBillYear();
        const res = await ParticularsApi.getAll(undefined, 'GST', effectiveYear);
        if (Array.isArray(res)) {
          bills = res;
        }
      } catch (err) {
        console.warn('Backend fetch failed, falling back to local storage', err);
      }

      const localRaw = localStorage.getItem(GST_LOCAL_HISTORY_KEY);
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];

      const combinedMap = new Map<string, any>();
      bills.forEach((b) => {
        if (b.billNo) combinedMap.set(String(b.billNo), b);
      });
      localList.forEach((b) => {
        if (b.billNo && !combinedMap.has(String(b.billNo))) {
          combinedMap.set(String(b.billNo), b);
        }
      });

      setHistoryList(Array.from(combinedMap.values()));
    } catch (e) {
      console.error('Error fetching GST history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Reset form to fresh blank invoice
  const handleResetForm = (targetYear: number | string = selectedYear) => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerAddress('');
    setCustomerGst('');
    setCustomerAadhar('');
    setCustomerPhone('');
    setDespatchedTo('');
    setLorryTransport('');
    setLrNo('');
    setLrDate(getTodayDateStr());
    setTotalCases('0');
    setTotalCasesManual(false);
    setProductRows([
      { id: '1', particular: '', hsnCode: '3604', quantity: '', unit: 'Case', rate: '', amount: '0' },
    ]);
    setSelectedRowId(null);
    setBillDate(getTodayDateStr());
    setTaxType('IGST');
    setTaxPercent('18');
    setBillFlag(true);
    fetchNextGstBillNo(targetYear);
  };

  useEffect(() => {
    loadInitialData(selectedYear);
    fetchGstHistory(selectedYear);

    const handleGlobalYearChange = (e: any) => {
      const year = e?.detail?.year ? Number(e.detail.year) : (typeof getSelectedBillYear === 'function' ? Number(getSelectedBillYear()) : undefined);
      if (year && year !== selectedYear) {
        setSelectedYear(year);
        loadInitialData(year);
        fetchGstHistory(year);
      } else {
        fetchGstHistory();
      }
    };

    window.addEventListener(YEAR_CHANGE_EVENT, handleGlobalYearChange);
    window.addEventListener('apsara_bill_year_changed', handleGlobalYearChange);
    return () => {
      window.removeEventListener(YEAR_CHANGE_EVENT, handleGlobalYearChange);
      window.removeEventListener('apsara_bill_year_changed', handleGlobalYearChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Customer dropdown selection
  const handleSelectCustomer = (_: any, opt: CustomerOptionItem | null) => {
    setSelectedCustomer(opt);
    if (opt) {
      setCustomerName(opt.name || '');
      setCustomerPhone(opt.mobile || '');
      setCustomerAddress(opt.address || '');
      setCustomerGst(opt.gst || '');
      setCustomerAadhar(opt.aadhar || '');
      if (!despatchedTo.trim() && opt.address) {
        setDespatchedTo(opt.address);
      }

      const currentSystemYear = new Date().getFullYear();
      if (Number(selectedYear) !== currentSystemYear) {
        triggerYearRestrictionDialog({
          selectedYear: String(selectedYear),
          currentSystemYear: String(currentSystemYear),
          onProceed: () => {
            checkPreviousHistory(opt.name, selectedYear);
          },
        });
      } else {
        checkPreviousHistory(opt.name, selectedYear);
      }
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerGst('');
      setCustomerAadhar('');
      setDespatchedTo('');
    }
  };

  // Add Item to Product List
  const handleAddItem = () => {
    const newId = String(Date.now());
    setProductRows((prev) => [
      ...prev,
      { id: newId, particular: '', hsnCode: '3604', quantity: '1', unit: 'Case', rate: '0', amount: '0' },
    ]);
    setSelectedRowId(newId);
  };

  // Delete Item from Product List
  const handleDeleteItem = () => {
    if (productRows.length === 0) return;
    if (selectedRowId) {
      setProductRows((prev) => prev.filter((r) => r.id !== selectedRowId));
      setSelectedRowId(null);
    } else {
      // Remove last row
      setProductRows((prev) => prev.slice(0, -1));
    }
  };

  // Inline table row modification
  const handleRowChange = (id: string, field: keyof GstRowItem, val: string) => {
    setProductRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: val };
          if (field === 'quantity' || field === 'rate') {
            const q = parseFloat(field === 'quantity' ? val : r.quantity) || 0;
            const rt = parseFloat(field === 'rate' ? val : r.rate) || 0;
            updated.amount = (q * rt).toFixed(2);
          }
          return updated;
        }
        return r;
      })
    );
  };

  // Add product from top quick bar
  const handleAddProductFromBar = (prod: ProductCatalogOption) => {
    const qNum = parseFloat(quickQty) || 1;
    const rNum = parseFloat(quickRate) > 0 ? parseFloat(quickRate) : (prod.rate || 0);
    const amt = (qNum * rNum).toFixed(2);

    const existingBlankIdx = productRows.findIndex((r) => !r.particular.trim());
    if (existingBlankIdx !== -1) {
      setProductRows((prev) =>
        prev.map((r, idx) => {
          if (idx === existingBlankIdx) {
            return {
              ...r,
              particular: prod.name,
              hsnCode: quickHsn || prod.hsn || '3604',
              quantity: String(qNum),
              unit: quickUnit || prod.unit || 'Case',
              rate: String(rNum),
              amount: amt,
            };
          }
          return r;
        })
      );
    } else {
      setProductRows((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          particular: prod.name,
          hsnCode: quickHsn || prod.hsn || '3604',
          quantity: String(qNum),
          unit: quickUnit || prod.unit || 'Case',
          rate: String(rNum),
          amount: amt,
        },
      ]);
    }

    setSelectedCatalogProduct(null);
    setQuickQty('1');
    setQuickRate('0');
  };

  // Filter products in catalog modal
  const filteredCatalog = useMemo(() => {
    if (!catalogSearchTerm.trim()) return productOptions;
    const term = catalogSearchTerm.toLowerCase();
    return productOptions.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term))
    );
  }, [productOptions, catalogSearchTerm]);

  // Build Print Data Object
  const buildCurrentGstBillData = (): GstBillPrintData => {
    const validRows: GstProductItem[] = calculations.computedRows
      .filter((r) => r.particular.trim() !== '')
      .map((r) => ({
        particular: r.particular.trim(),
        hsnCode: r.hsnCode || '3604',
        quantity: r.quantity || '0',
        unit: r.unit || 'Case',
        per: r.unit || 'Case',
        rate: r.rate || '0',
        amount: r.amount || '0',
        taxableAmount: r.amount || '0',
      }));

    return {
      billNo,
      date: billDate,
      customerName: customerName || 'General Customer',
      customerPhone,
      customerAddress,
      customerGst,
      customerAadhar,
      deliveryName: customerName,
      deliveryAddress: customerAddress,
      deliveryAadhar: customerAadhar,
      placeOfSupply: 'Tamil Nadu (33)',
      reverseCharge: 'No',
      despatchFrom: 'SIVAKASI',
      despatchTo: despatchedTo || customerAddress,
      dispatchFrom: 'SIVAKASI',
      dispatchTo: despatchedTo || customerAddress,
      transport: lorryTransport,
      lorryTransport,
      lrNo,
      lrDate,
      caseCount: totalCases || String(calculations.autoCases),
      companyName: storeSettings.companyName || 'SVM Crackers',
      gstin: storeSettings.gstin || '33ABFFA6758B1ZP',
      hsnNo: '3604',
      products: validRows,
      subtotal: calculations.subTotal,
      taxType,
      taxPercent,
      cgstPercent: calculations.cgstPct,
      cgstTotal: calculations.cgstRs,
      sgstPercent: calculations.sgstPct,
      sgstTotal: calculations.sgstRs,
      igstPercent: calculations.igstPct,
      igstTotal: calculations.igstRs,
      roundOff: calculations.roundOff,
      total: calculations.netAmount,
      previousTurnover: '0.00',
      thisBillTurnover: calculations.netAmount,
      totalTurnover: calculations.netAmount,
      paymentStatus: 'UNPAID',
      invoiceCopy: 'ORIGINAL',
    };
  };

  // Execute Save Bill
  const executeSaveBill = async () => {
    // Validate bill date against selected year
    if (!validateDateMatchesYear(billDate, selectedYear)) {
      setSnackbarMessage(`Bill date (${billDate}) does not belong to the selected year ${selectedYear}. Please select a date from ${selectedYear}.`);
      setSnackbarOpen(true);
      return;
    }

    if (!customerName.trim()) {
      setSnackbarMessage('Please select or enter Customer Name');
      setSnackbarOpen(true);
      return;
    }

    const validProducts = productRows.filter((r) => r.particular.trim() !== '');
    if (validProducts.length === 0) {
      setSnackbarMessage('Please add at least one product with name');
      setSnackbarOpen(true);
      return;
    }

    setSavingBill(true);
    const billData = buildCurrentGstBillData();

    try {
      const payload = {
        billNo: billData.billNo,
        date: billData.date,
        year: selectedYear,
        customerName: billData.customerName,
        customerPhone: billData.customerPhone || '',
        customerAddress: billData.customerAddress || '',
        customerGst: billData.customerGst || '',
        customerAadhar: billData.customerAadhar || '',
        despatchTo: billData.despatchTo || '',
        lorryTransport: billData.lorryTransport || '',
        lrNo: billData.lrNo || '',
        lrDate: billData.lrDate || '',
        caseCount: String(billData.caseCount || '0'),
        companyName: billData.companyName || 'SVM Crackers',
        taxType,
        taxPercent,
        cgstPercent: calculations.cgstPct,
        cgstTotal: calculations.cgstRs,
        sgstPercent: calculations.sgstPct,
        sgstTotal: calculations.sgstRs,
        igstPercent: calculations.igstPct,
        igstTotal: calculations.igstRs,
        subTotal: calculations.subTotal,
        amount: calculations.subTotal,
        total: calculations.netAmount,
        netAmount: calculations.netAmount,
        roundOff: calculations.roundOff,
        inWords: calculations.inWords,
        billFlag: billFlag ? 'YES' : 'NO',
        billType: 'GST',
        products: billData.products.map((p) => ({
          particular: p.particular,
          quantity: String(p.quantity),
          rate: String(p.rate),
          pktUnit: String(p.unit || 'Case'),
          amount: String(p.amount),
          hsnCode: String(p.hsnCode || '3604'),
          taxableAmount: String(p.taxableAmount || p.amount),
          gstRate: taxPercent,
          cgst: calculations.cgstRs,
          sgst: calculations.sgstRs,
          igst: calculations.igstRs,
        })),
      };

      try {
        await ParticularsApi.create(payload);
      } catch (err) {
        console.warn('Backend save notice:', err);
      }

      // Save to local storage cache
      const existingHistoryRaw = localStorage.getItem(GST_LOCAL_HISTORY_KEY);
      const existingHistory: any[] = existingHistoryRaw ? JSON.parse(existingHistoryRaw) : [];
      const updatedHistory = [billData, ...existingHistory.filter((b) => b.billNo !== billData.billNo)];
      localStorage.setItem(GST_LOCAL_HISTORY_KEY, JSON.stringify(updatedHistory));

      setSnackbarMessage(`GST Bill #${billData.billNo} saved successfully!`);
      setSnackbarOpen(true);

      // Open PDF Preview & Print Modal
      setSelectedBillForPrint(billData);
      setPrintModalOpen(true);

      fetchGstHistory();
      fetchNextGstBillNo();
    } catch (e: any) {
      console.error('Error saving GST bill', e);
      setSnackbarMessage(e.message || 'Failed to save GST Bill');
      setSnackbarOpen(true);
    } finally {
      setSavingBill(false);
    }
  };

  const handleSaveBill = async () => {
    const currentSystemYear = new Date().getFullYear();
    const currentSystemYearStr = currentSystemYear.toString();
    const selectedViewYear = getSelectedBillYear();

    if (Number(selectedYear) !== currentSystemYear || String(selectedViewYear) !== currentSystemYearStr) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear || selectedViewYear),
        currentSystemYear: currentSystemYearStr,
        onProceed: () => executeSaveBill(),
      });
      return;
    }
    executeSaveBill();
  };

  // Print Current Form
  const handlePrintCurrent = () => {
    const billData = buildCurrentGstBillData();
    setSelectedBillForPrint(billData);
    setPrintModalOpen(true);
  };

  // Generate filler rows so grid looks authentic to desktop ERP
  const minRowsDisplay = 10;
  const emptyRowsCount = Math.max(0, minRowsDisplay - productRows.length);

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 1.5 }, bgcolor: '#D9E4F2', minHeight: 'calc(100vh - 70px)' }}>
      {/* Outer Window Card */}
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
        {/* Window Title Header Bar: "Tax Bill Form" */}
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
          {/* Title & Icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongRoundedIcon sx={{ fontSize: 18, color: '#0284C7' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', letterSpacing: '0.01em' }}>
              Tax Bill Form
            </Typography>
          </Box>

          {/* Right: Subtabs Switcher */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              onClick={() => {
                const openCreateTab = () => {
                  handleResetForm();
                  setActiveSubTab('create');
                };

                const currentSystemYear = new Date().getFullYear();
                if (Number(selectedYear) !== currentSystemYear) {
                  triggerYearRestrictionDialog({
                    selectedYear: String(selectedYear),
                    currentSystemYear: String(currentSystemYear),
                    onProceed: () => openCreateTab(),
                  });
                  return;
                }
                openCreateTab();
              }}
              startIcon={<AddRoundedIcon sx={{ fontSize: 14 }} />}
              sx={{
                height: '24px',
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: activeSubTab === 'create' ? '#1E40AF' : '#EDF4FB',
                color: activeSubTab === 'create' ? '#FFFFFF' : '#1E3A8A',
                border: '1px solid #94A3B8',
                px: 1.2,
                borderRadius: '3px',
                '&:hover': { bgcolor: activeSubTab === 'create' ? '#1D4ED8' : '#D9E4F2' },
              }}
            >
              New Bill
            </Button>

            <Button
              size="small"
              onClick={() => {
                setActiveSubTab(activeSubTab === 'create' ? 'history' : 'create');
                if (activeSubTab === 'create') fetchGstHistory();
              }}
              startIcon={activeSubTab === 'create' ? <HistoryRoundedIcon sx={{ fontSize: 14 }} /> : <ArrowBackRoundedIcon sx={{ fontSize: 14 }} />}
              sx={{
                height: '24px',
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: activeSubTab === 'history' ? '#1E40AF' : '#EDF4FB',
                color: activeSubTab === 'history' ? '#FFFFFF' : '#1E3A8A',
                border: '1px solid #94A3B8',
                px: 1.2,
                borderRadius: '3px',
                '&:hover': { bgcolor: activeSubTab === 'history' ? '#1D4ED8' : '#D9E4F2' },
              }}
            >
              {activeSubTab === 'create' ? `History (${historyList.length})` : 'Tax Bill Form'}
            </Button>

            {/* Window control buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, ml: 1 }}>
              <Box sx={{ width: 14, height: 14, border: '1px solid #94A3B8', bgcolor: '#F8FAFC', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#64748B', cursor: 'pointer' }}>_</Box>
              <Box sx={{ width: 14, height: 14, border: '1px solid #94A3B8', bgcolor: '#F8FAFC', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#64748B', cursor: 'pointer' }}>□</Box>
              <Box sx={{ width: 14, height: 14, border: '1px solid #DC2626', bgcolor: '#FEE2E2', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#DC2626', cursor: 'pointer' }}>×</Box>
            </Box>
          </Box>
        </Box>

        {/* CREATE GST INVOICE VIEW */}
        {activeSubTab === 'create' ? (
          <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
            {/* ========================================================= */}
            {/* TOP SECTION: 3 FIELDSETS (Bill Info, Customer Info, Despatch Info) */}
            {/* ========================================================= */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '220px 1fr 310px',
                },
                gap: 1,
                mb: 1,
                alignItems: 'stretch',
              }}
            >
              {/* Fieldset 1: Bill Info (Left) */}
              <fieldset className="erp-fieldset">
                <legend className="erp-legend">Bill Info</legend>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}>
                  {/* Bill No */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '60px' }}>
                      Bill No
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <input
                        type="text"
                        value={billNo}
                        onChange={(e) => setBillNo(e.target.value)}
                        className="erp-input"
                        style={{ width: '105px', fontWeight: 600 }}
                      />
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>*</span>
                    </Box>
                  </Box>

                  {/* Date */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '60px' }}>
                      Date
                    </Typography>
                    <input
                      type="text"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      placeholder="DD-MM-YYYY"
                      className="erp-input"
                      style={{ width: '120px' }}
                    />
                  </Box>
                </Box>
              </fieldset>

              {/* Fieldset 2: Customer Info (Middle) */}
              <fieldset className="erp-fieldset">
                <legend className="erp-legend">Customer Info</legend>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    gap: 1,
                    height: '100%',
                  }}
                >
                  {/* Left part: Customer Selection dropdown */}
                  <Box sx={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        Customer
                      </Typography>
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>*</span>
                    </Box>
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
                          placeholder="--Select Customer--"
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

                  {/* Center: Bold OR */}
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: '14px',
                      color: '#1E3A8A',
                      px: 0.8,
                      userSelect: 'none',
                    }}
                  >
                    OR
                  </Typography>

                  {/* Right part: New Customer Fields */}
                  <Box sx={{ flex: 1.3, width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography
                      sx={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#0284C7',
                        textDecoration: 'underline',
                        cursor: 'default',
                        mb: 0.2,
                      }}
                    >
                      New Customer
                    </Typography>

                    {/* Name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', minWidth: '55px' }}>
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

                    {/* Address */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', minWidth: '55px' }}>
                        Address
                      </Typography>
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="erp-input"
                        style={{ flex: 1 }}
                      />
                    </Box>

                    {/* GST */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', minWidth: '55px' }}>
                        GST
                      </Typography>
                      <input
                        type="text"
                        value={customerGst}
                        onChange={(e) => setCustomerGst(e.target.value)}
                        className="erp-input"
                        style={{ flex: 1 }}
                      />
                    </Box>

                    {/* Aadhar No */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', minWidth: '55px' }}>
                        Aadhar No
                      </Typography>
                      <input
                        type="text"
                        value={customerAadhar}
                        onChange={(e) => setCustomerAadhar(e.target.value)}
                        className="erp-input"
                        style={{ flex: 1 }}
                      />
                    </Box>
                  </Box>
                </Box>
              </fieldset>

              {/* Fieldset 3: Despatch Info (Right) */}
              <fieldset className="erp-fieldset">
                <legend className="erp-legend">Despatch Info</legend>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, pt: 0.2 }}>
                  {/* Despatched To */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '95px' }}>
                      Despatched To
                    </Typography>
                    <input
                      type="text"
                      value={despatchedTo}
                      onChange={(e) => setDespatchedTo(e.target.value)}
                      className="erp-input"
                      style={{ flex: 1, maxWidth: '175px' }}
                    />
                  </Box>

                  {/* Lorry Transport */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '95px' }}>
                      Lorry Transport
                    </Typography>
                    <input
                      type="text"
                      value={lorryTransport}
                      onChange={(e) => setLorryTransport(e.target.value)}
                      className="erp-input"
                      style={{ flex: 1, maxWidth: '175px' }}
                    />
                  </Box>

                  {/* LR No */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '95px' }}>
                      LR No
                    </Typography>
                    <input
                      type="text"
                      value={lrNo}
                      onChange={(e) => setLrNo(e.target.value)}
                      className="erp-input"
                      style={{ flex: 1, maxWidth: '175px' }}
                    />
                  </Box>

                  {/* LR Date */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '95px' }}>
                      LR Date
                    </Typography>
                    <input
                      type="text"
                      value={lrDate}
                      onChange={(e) => setLrDate(e.target.value)}
                      placeholder="DD-MM-YYYY"
                      className="erp-input"
                      style={{ flex: 1, maxWidth: '175px' }}
                    />
                  </Box>

                  {/* Total Cases */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '95px' }}>
                      Total Cases
                    </Typography>
                    <input
                      type="text"
                      value={totalCases}
                      onChange={(e) => {
                        setTotalCases(e.target.value);
                        setTotalCasesManual(true);
                      }}
                      className="erp-input"
                      style={{ flex: 1, maxWidth: '175px', textAlign: 'right' }}
                    />
                  </Box>
                </Box>
              </fieldset>
            </Box>

            {/* ========================================================= */}
            {/* QUICK PRODUCT SELECTION BAR */}
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
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                Code
              </Typography>
              <input
                type="text"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                placeholder="Code"
                className="erp-input"
                style={{ width: '75px' }}
              />

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

              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', ml: 0.5 }}>
                Product
              </Typography>
              <Autocomplete
                size="small"
                sx={{ flex: 1, minWidth: '200px' }}
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
                    placeholder="Select / search product item..."
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

              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', ml: 0.5 }}>
                HSN
              </Typography>
              <input
                type="text"
                value={quickHsn}
                onChange={(e) => setQuickHsn(e.target.value)}
                className="erp-input"
                style={{ width: '55px', textAlign: 'center' }}
              />

              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', ml: 0.5 }}>
                Qty
              </Typography>
              <input
                type="number"
                value={quickQty}
                onChange={(e) => setQuickQty(e.target.value)}
                onWheel={(e) => (e.target as HTMLElement).blur()}
                className="erp-input"
                style={{ width: '60px', textAlign: 'center' }}
              />

              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', ml: 0.5 }}>
                Unit
              </Typography>
              <input
                type="text"
                value={quickUnit}
                onChange={(e) => setQuickUnit(e.target.value)}
                className="erp-input"
                style={{ width: '65px' }}
              />

              <Button
                onClick={handleAddItem}
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
            {/* MAIN SPLIT SECTION: PRODUCT LIST (Left) | AMOUNT INFO (Right) */}
            {/* ========================================================= */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' },
                gap: 1.5,
                alignItems: 'start',
              }}
            >
              {/* Left Column: Product List Fieldset */}
              <fieldset className="erp-fieldset" style={{ display: 'flex', flexDirection: 'column' }}>
                <legend className="erp-legend">Product List</legend>

                {/* Table Container */}
                <Box
                  sx={{
                    bgcolor: '#FFFFFF',
                    border: '1px solid #B0C4DE',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <TableContainer sx={{ maxHeight: '420px', minHeight: '340px' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                          <TableCell sx={{ width: '40px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5', py: 0.6 }}>
                            S.No
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', py: 0.6 }}>
                            Particulars / Product Name
                          </TableCell>
                          <TableCell sx={{ width: '75px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5', py: 0.6 }}>
                            HSN
                          </TableCell>
                          <TableCell sx={{ width: '70px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5', py: 0.6 }}>
                            Qty
                          </TableCell>
                          <TableCell sx={{ width: '65px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5', py: 0.6 }}>
                            Unit
                          </TableCell>
                          <TableCell sx={{ width: '90px', textAlign: 'right', fontWeight: 700, bgcolor: '#DCE7F5', py: 0.6 }}>
                            Rate (Rs.)
                          </TableCell>
                          <TableCell sx={{ width: '100px', textAlign: 'right', fontWeight: 700, bgcolor: '#DCE7F5', py: 0.6 }}>
                            Amount (Rs.)
                          </TableCell>
                          <TableCell sx={{ width: '35px', textAlign: 'center', bgcolor: '#DCE7F5', p: 0.2 }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {productRows.map((row, idx) => (
                          <TableRow
                            key={row.id}
                            onClick={() => setSelectedRowId(row.id)}
                            sx={{
                              bgcolor: selectedRowId === row.id ? '#EFF6FF' : 'transparent',
                              '&:hover': { bgcolor: selectedRowId === row.id ? '#EFF6FF' : '#F1F7FD' },
                              '& td': { borderBottom: '1px solid #E2E8F0', py: 0.3 },
                            }}
                          >
                            <TableCell sx={{ textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>
                              {idx + 1}
                            </TableCell>

                            {/* Particulars input */}
                            <TableCell sx={{ p: 0.4 }}>
                              <input
                                type="text"
                                value={row.particular}
                                onChange={(e) => handleRowChange(row.id, 'particular', e.target.value)}
                                placeholder="Enter product item..."
                                style={{
                                  width: '100%',
                                  border: 'none',
                                  outline: 'none',
                                  background: 'transparent',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#0F172A',
                                }}
                              />
                            </TableCell>

                            {/* HSN */}
                            <TableCell sx={{ textAlign: 'center', p: 0.4 }}>
                              <input
                                type="text"
                                value={row.hsnCode}
                                onChange={(e) => handleRowChange(row.id, 'hsnCode', e.target.value)}
                                style={{
                                  width: '100%',
                                  border: 'none',
                                  outline: 'none',
                                  background: 'transparent',
                                  fontSize: '12px',
                                  textAlign: 'center',
                                  color: '#475569',
                                }}
                              />
                            </TableCell>

                            {/* Qty */}
                            <TableCell sx={{ textAlign: 'center', p: 0.4 }}>
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
                                  fontSize: '12px',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  color: '#0F172A',
                                }}
                              />
                            </TableCell>

                            {/* Unit */}
                            <TableCell sx={{ textAlign: 'center', p: 0.4 }}>
                              <input
                                type="text"
                                value={row.unit}
                                onChange={(e) => handleRowChange(row.id, 'unit', e.target.value)}
                                style={{
                                  width: '100%',
                                  border: 'none',
                                  outline: 'none',
                                  background: 'transparent',
                                  fontSize: '12px',
                                  textAlign: 'center',
                                  color: '#334155',
                                }}
                              />
                            </TableCell>

                            {/* Rate */}
                            <TableCell sx={{ textAlign: 'right', p: 0.4 }}>
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
                                  fontSize: '12px',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: '#0F172A',
                                }}
                              />
                            </TableCell>

                            {/* Amount */}
                            <TableCell sx={{ textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                              {row.amount}
                            </TableCell>

                            {/* Delete single row */}
                            <TableCell sx={{ textAlign: 'center', p: 0.2 }}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProductRows((prev) => prev.filter((r) => r.id !== row.id));
                                }}
                                sx={{ color: '#94A3B8', '&:hover': { color: '#DC2626' }, p: 0.2 }}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Visual empty rows matching the desktop software look */}
                        {Array.from({ length: emptyRowsCount }).map((_, i) => (
                          <TableRow key={`empty-${i}`} sx={{ height: '26px', '& td': { borderBottom: '1px solid #F1F5F9' } }}>
                            <TableCell sx={{ textAlign: 'center', color: '#CBD5E1', fontSize: '11px' }}>
                              {productRows.length + i + 1}
                            </TableCell>
                            <TableCell />
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

                {/* Bottom Buttons: [ Add Item ] and [ Delete Item ] (Exact buttons from screenshot) */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mt: 1.2 }}>
                  <Button
                    onClick={handleAddItem}
                    variant="outlined"
                    sx={{
                      bgcolor: '#E5ECF4',
                      borderColor: '#94A3B8',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '12px',
                      textTransform: 'none',
                      px: 2.2,
                      py: 0.4,
                      minWidth: '95px',
                      borderRadius: '3px',
                      '&:hover': { bgcolor: '#D9E4F2' },
                    }}
                  >
                    Add Item
                  </Button>

                  <Button
                    onClick={handleDeleteItem}
                    variant="outlined"
                    sx={{
                      bgcolor: '#E5ECF4',
                      borderColor: '#94A3B8',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '12px',
                      textTransform: 'none',
                      px: 2.2,
                      py: 0.4,
                      minWidth: '95px',
                      borderRadius: '3px',
                      '&:hover': { bgcolor: '#D9E4F2' },
                    }}
                  >
                    Delete Item
                  </Button>
                </Box>
              </fieldset>

              {/* Right Column: Amount Info Fieldset (Exact Layout from Screenshot) */}
              <fieldset className="erp-fieldset">
                <legend className="erp-legend">Amount Info</legend>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, pt: 0.4 }}>
                  {/* Sub Total (Rs.) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '105px' }}>
                      Sub Total (Rs.)
                    </Typography>
                    <input
                      type="text"
                      readOnly
                      value={calculations.subTotal}
                      className="erp-input"
                      style={{ width: '150px', textAlign: 'right', fontWeight: 700, backgroundColor: '#F8FAFC' }}
                    />
                  </Box>

                  {/* Tax Type: CGST/SGST vs IGST Radio buttons */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 0.3 }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '105px' }}>
                      Tax Type
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '150px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="taxType"
                          checked={taxType === 'CGST_SGST'}
                          onChange={() => setTaxType('CGST_SGST')}
                          style={{ cursor: 'pointer' }}
                        />
                        CGST/SGST
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="taxType"
                          checked={taxType === 'IGST'}
                          onChange={() => setTaxType('IGST')}
                          style={{ cursor: 'pointer' }}
                        />
                        IGST
                      </label>
                    </Box>
                  </Box>

                  {/* Tax (%) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '105px' }}>
                      Tax (%)
                    </Typography>
                    <input
                      type="number"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      className="erp-input"
                      style={{ width: '150px', textAlign: 'right' }}
                    />
                  </Box>

                  {/* CGST (%) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '105px' }}>
                      CGST (%)
                    </Typography>
                    <input
                      type="text"
                      readOnly
                      value={calculations.cgstPct}
                      className="erp-input"
                      style={{ width: '150px', textAlign: 'right', backgroundColor: '#F8FAFC' }}
                    />
                  </Box>

                  {/* CGST (Rs.) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '105px' }}>
                      CGST (Rs.)
                    </Typography>
                    <input
                      type="text"
                      readOnly
                      value={calculations.cgstRs}
                      className="erp-input"
                      style={{ width: '150px', textAlign: 'right', backgroundColor: '#F8FAFC' }}
                    />
                  </Box>

                  {/* SGST (%) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '105px' }}>
                      SGST (%)
                    </Typography>
                    <input
                      type="text"
                      readOnly
                      value={calculations.sgstPct}
                      className="erp-input"
                      style={{ width: '150px', textAlign: 'right', backgroundColor: '#F8FAFC' }}
                    />
                  </Box>

                  {/* SGST (Rs.) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '105px' }}>
                      SGST (Rs.)
                    </Typography>
                    <input
                      type="text"
                      readOnly
                      value={calculations.sgstRs}
                      className="erp-input"
                      style={{ width: '150px', textAlign: 'right', backgroundColor: '#F8FAFC' }}
                    />
                  </Box>

                  {/* IGST (%) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '105px' }}>
                      IGST (%)
                    </Typography>
                    <input
                      type="text"
                      readOnly
                      value={calculations.igstPct}
                      className="erp-input"
                      style={{ width: '150px', textAlign: 'right', backgroundColor: '#F8FAFC' }}
                    />
                  </Box>

                  {/* IGST (Rs.) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', minWidth: '105px' }}>
                      IGST (Rs.)
                    </Typography>
                    <input
                      type="text"
                      readOnly
                      value={calculations.igstRs}
                      className="erp-input"
                      style={{ width: '150px', textAlign: 'right', backgroundColor: '#F8FAFC' }}
                    />
                  </Box>

                  {/* Net Amount (Rs.) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.3 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', minWidth: '105px' }}>
                      Net Amount (Rs.)
                    </Typography>
                    <input
                      type="text"
                      readOnly
                      value={calculations.netAmount}
                      className="erp-input"
                      style={{
                        width: '150px',
                        textAlign: 'right',
                        fontWeight: 900,
                        fontSize: '13px',
                        backgroundColor: '#F1F5F9',
                        color: '#0F172A',
                      }}
                    />
                  </Box>

                  {/* In Words */}
                  <Box sx={{ mt: 0.6 }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', mb: 0.3 }}>
                      In Words
                    </Typography>
                    <textarea
                      rows={2}
                      readOnly
                      value={calculations.inWords}
                      className="erp-input"
                      style={{
                        width: '100%',
                        resize: 'none',
                        fontSize: '11.5px',
                        backgroundColor: '#F8FAFC',
                        fontStyle: 'italic',
                        lineHeight: 1.3,
                      }}
                    />
                  </Box>

                  {/* Bottom: Bill Checkbox and [ Save Bill ] / [ Print ] */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      mt: 1.5,
                      pt: 1,
                      borderTop: '1px solid #E2E8F0',
                    }}
                  >
                    {/* Bill [ ] Checkbox */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A' }}>
                        Bill
                      </Typography>
                      <input
                        type="checkbox"
                        checked={billFlag}
                        onChange={(e) => setBillFlag(e.target.checked)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </Box>

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {/* Print Button */}
                      <Button
                        onClick={handlePrintCurrent}
                        variant="outlined"
                        size="small"
                        startIcon={<PrintOutlinedIcon sx={{ fontSize: 15 }} />}
                        sx={{
                          bgcolor: '#E5ECF4',
                          borderColor: '#94A3B8',
                          color: '#0F172A',
                          fontWeight: 700,
                          fontSize: '12px',
                          textTransform: 'none',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '3px',
                          '&:hover': { bgcolor: '#D9E4F2' },
                        }}
                      >
                        Print
                      </Button>

                      {/* Save Bill Button (Deep burgundy/plum matching quotation and screenshot) */}
                      <Button
                        onClick={handleSaveBill}
                        disabled={savingBill}
                        variant="contained"
                        sx={{
                          bgcolor: '#741748',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          textTransform: 'none',
                          px: 2.5,
                          py: 0.5,
                          minWidth: '85px',
                          borderRadius: '3px',
                          boxShadow: 'none',
                          '&:hover': { bgcolor: '#580e34' },
                        }}
                      >
                        {savingBill ? <CircularProgress size={16} color="inherit" /> : 'Save Bill'}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </fieldset>
            </Box>
          </Box>
        ) : (
          /* ========================================================= */
          /* GST INVOICES HISTORY VIEW */
          /* ========================================================= */
          <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#F0F5FA' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#1E3A8A' }}>
                  GST Tax Invoices History
                </Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  ({historyList.length} Invoices Found)
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Search by Bill No, Customer or Destination..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748B', mr: 1 }} />,
                    },
                  }}
                  sx={{
                    width: '320px',
                    bgcolor: '#FFFFFF',
                    '& .MuiOutlinedInput-root': { height: '32px', fontSize: '12.5px' },
                  }}
                />
                <IconButton size="small" onClick={() => fetchGstHistory()} sx={{ bgcolor: '#EDF4FB', border: '1px solid #94A3B8' }}>
                  <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ bgcolor: '#FFFFFF', border: '1px solid #B0C4DE', borderRadius: '4px', overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: '520px' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                      <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, width: '40px', textAlign: 'center' }}>#</TableCell>
                      <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, width: '90px' }}>Bill No</TableCell>
                      <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, width: '100px' }}>Date</TableCell>
                      <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700 }}>Customer Name</TableCell>
                      <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700 }}>Despatched To</TableCell>
                      <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, textAlign: 'center', width: '90px' }}>Tax Type</TableCell>
                      <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, textAlign: 'right', width: '110px' }}>Sub Total</TableCell>
                      <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, textAlign: 'right', width: '120px' }}>Net Amount</TableCell>
                      <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, textAlign: 'center', width: '130px' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingHistory ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : historyList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#64748B' }}>
                          No GST invoices saved yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyList
                        .filter((b) => {
                          if (!historySearchTerm.trim()) return true;
                          const t = historySearchTerm.toLowerCase();
                          return (
                            (b.billNo && String(b.billNo).toLowerCase().includes(t)) ||
                            (b.customerName && String(b.customerName).toLowerCase().includes(t)) ||
                            (b.despatchTo && String(b.despatchTo).toLowerCase().includes(t)) ||
                            (b.date && String(b.date).toLowerCase().includes(t))
                          );
                        })
                        .map((b, idx) => (
                          <TableRow key={b._id || b.billNo || idx} hover sx={{ '& td': { py: 0.6 } }}>
                            <TableCell sx={{ textAlign: 'center', fontSize: '12px' }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#1E40AF', fontSize: '12.5px' }}>
                              #{b.billNo}
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px' }}>{b.date}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '12.5px' }}>{b.customerName}</TableCell>
                            <TableCell sx={{ fontSize: '12px', color: '#475569' }}>{b.despatchTo || b.dispatchTo || '-'}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontSize: '11.5px' }}>
                              {b.taxType || 'IGST'}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right', fontSize: '12.5px' }}>
                              ₹{parseFloat(String(b.subTotal || b.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right', fontWeight: 800, fontSize: '13px', color: '#741748' }}>
                              ₹{parseFloat(String(b.netAmount || b.total || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  title="Print Bill"
                                  onClick={() => {
                                    setSelectedBillForPrint({
                                      ...b,
                                      companyName: b.companyName || storeSettings.companyName || 'SVM Crackers',
                                      gstin: b.gstin || storeSettings.gstin || '33ABFFA6758B1ZP',
                                      products: b.products || [],
                                      total: b.netAmount || b.total || 0,
                                    });
                                    setPrintModalOpen(true);
                                  }}
                                  sx={{ color: '#1E40AF', p: 0.4 }}
                                >
                                  <PrintOutlinedIcon sx={{ fontSize: 16 }} />
                                </IconButton>

                                <IconButton
                                  size="small"
                                  title="Delete Bill"
                                  onClick={async () => {
                                    if (window.confirm(`Delete GST Bill #${b.billNo}?`)) {
                                      try {
                                        if (b._id) await ParticularsApi.delete(b._id);
                                        const localRaw = localStorage.getItem(GST_LOCAL_HISTORY_KEY);
                                        if (localRaw) {
                                          const parsed = JSON.parse(localRaw);
                                          const updated = parsed.filter((item: any) => item.billNo !== b.billNo);
                                          localStorage.setItem(GST_LOCAL_HISTORY_KEY, JSON.stringify(updated));
                                        }
                                        fetchGstHistory();
                                      } catch (delErr) {
                                        console.error('Delete failed', delErr);
                                      }
                                    }
                                  }}
                                  sx={{ color: '#DC2626', p: 0.4 }}
                                >
                                  <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        )}
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
        <DialogTitle sx={{ bgcolor: '#EDF4FB', borderBottom: '1px solid #B0C4DE', py: 1.2, fontSize: '13.5px', fontWeight: 700 }}>
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
                    <TableCell sx={{ fontSize: '12.5px', fontWeight: 600 }}>{prod.name}</TableCell>
                    <TableCell sx={{ fontSize: '12px', color: '#475569' }}>{prod.category || 'Crackers'}</TableCell>
                    <TableCell sx={{ fontSize: '12px' }}>{prod.unit || 'Case'}</TableCell>
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
              handleResetForm();
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

      {/* ========================================================= */}
      {/* GST BILL PRINT PREVIEW MODAL */}
      {/* ========================================================= */}
      {selectedBillForPrint && (
        <GstBillPrintModal
          open={printModalOpen}
          onClose={() => {
            setPrintModalOpen(false);
            setSelectedBillForPrint(null);
          }}
          bill={selectedBillForPrint}
        />
      )}
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

export default GstBillPage;
