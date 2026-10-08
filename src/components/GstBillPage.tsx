import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Grid,
  Divider,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import {
  CustomersApi,
  ProductsApi,
  PriceListsApi,
  ParticularsApi,
  SettingsApi,
} from '../services/api';
import { getStoredSettings } from './SettingsPage';
import { GstBillPrintModal } from './GstBillPrintModal';
import type { GstBillPrintData, GstProductItem } from './GstBillPrintTemplate';
import { numberToIndianWords } from '../utils/numberToWords';
import { printGstBillDirectly } from '../utils/printUtils';
import {
  getActiveBillingYear,
  setActiveBillingYear,
  getStandardYearOptions,
  validateDateMatchesYear,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';

export const INDIAN_STATES = [
  { code: '33', name: 'Tamil Nadu' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '27', name: 'Maharashtra' },
  { code: '07', name: 'Delhi' },
  { code: '24', name: 'Gujarat' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '19', name: 'West Bengal' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '08', name: 'Rajasthan' },
  { code: '03', name: 'Punjab' },
  { code: '06', name: 'Haryana' },
  { code: '21', name: 'Odisha' },
  { code: '10', name: 'Bihar' },
  { code: '34', name: 'Puducherry' },
];

const GST_LOCAL_HISTORY_KEY = 'apsara_gst_bills_history';

export const getTodayDateString = (targetYear?: number) => {
  const today = new Date();
  const yyyy = targetYear || today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }
  return dateStr;
};

export const GstBillPage: FC = () => {
  const [storeSettings, setStoreSettings] = useState(() => getStoredSettings());
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history'>('create');

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
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);

  // Invoice Form State
  const [billNo, setBillNo] = useState<string>('0001');
  const [billDate, setBillDate] = useState<string>(() => getTodayDateString(selectedYear));
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerGst, setCustomerGst] = useState<string>('');
  const [customerAadhar, setCustomerAadhar] = useState<string>('');
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('Tamil Nadu (33)');

  // Product Row Input State
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [hsnCode, setHsnCode] = useState<string>('3604');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<string>('Case');
  const [rate, setRate] = useState<string>('0');

  // Additional Invoice Fields
  const [dispatchFrom, setDispatchFrom] = useState<string>('');
  const [dispatchTo, setDispatchTo] = useState<string>('');
  const [transport, setTransport] = useState<string>('');
  const [transportGstin, setTransportGstin] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('0.00');
  const [packingPercent, setPackingPercent] = useState<string>('0.00');

  // Sales Turnover Tracking
  const [currentTurnover, setCurrentTurnover] = useState<string>(() => {
    return localStorage.getItem('apsara_gst_turnover_current') || storeSettings.gstTurnoverCurrent || '0.00';
  });
  const [topTurnoverInput, setTopTurnoverInput] = useState<string>(() => {
    return localStorage.getItem('apsara_gst_turnover_current') || storeSettings.gstTurnoverCurrent || '0.00';
  });
  const [turnoverSnackbar, setTurnoverSnackbar] = useState<string>('');
  const [hsnNo] = useState<string>('3604');

  // Line items list
  const [productRows, setProductRows] = useState<GstProductItem[]>([]);
  const [savingBill, setSavingBill] = useState<boolean>(false);

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<GstBillPrintData | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Calculations for all rows & whole bill
  const lineCalculations = useMemo(() => {
    let taxableTotal = 0;
    let totalCases = 0;

    const computedRows = productRows.map((item) => {
      const q = parseFloat(String(item.quantity)) || 0;
      const r = parseFloat(String(item.rate)) || 0;
      const rowAmt = q * r;
      taxableTotal += rowAmt;
      totalCases += q;

      return {
        ...item,
        quantity: q,
        rate: r,
        amount: rowAmt.toFixed(2),
        taxableAmount: rowAmt.toFixed(2),
        unit: item.unit || 'Case',
        per: item.per || item.unit || 'Case',
      };
    });

    const discPct = parseFloat(discountPercent) || 0;
    const discountAmount = (taxableTotal * discPct) / 100;

    const packPct = parseFloat(packingPercent) || 0;
    const packingAmount = (taxableTotal * packPct) / 100;

    const valueOfGoods = Math.max(0, taxableTotal - discountAmount + packingAmount);
    const roundedGrand = Math.round(valueOfGoods);
    const roundOffDiff = (roundedGrand - valueOfGoods).toFixed(2);

    const prevTurnoverNum = parseFloat(currentTurnover) || 726900;
    const totalTurnover = (prevTurnoverNum + roundedGrand).toFixed(2);

    return {
      computedRows,
      taxableTotal: taxableTotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      packingAmount: packingAmount.toFixed(2),
      valueOfGoods: valueOfGoods.toFixed(2),
      roundOff: roundOffDiff,
      grandTotal: roundedGrand.toFixed(2),
      grandTotalNum: roundedGrand,
      totalCases: `${totalCases} ${productRows[0]?.unit || 'Case'}`,
      previousTurnover: prevTurnoverNum.toFixed(2),
      thisBillTurnover: roundedGrand.toFixed(2),
      totalTurnover,
    };
  }, [productRows, discountPercent, packingPercent, currentTurnover]);

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

  // Load Dropdown Options for target year
  const loadOptions = async (targetYear: number = selectedYear) => {
    try {
      const [custRes, prodRes, priceRes] = await Promise.all([
        CustomersApi.getAll().catch(() => []),
        ProductsApi.getAll(targetYear).catch(() => []),
        PriceListsApi.getAll({ year: targetYear }).catch(() => []),
      ]);

      if (Array.isArray(custRes)) {
        setCustomerOptions(
          custRes.map((c: any) => ({
            id: c._id || c.id,
            name: c.name,
            mobile: c.mobile && c.mobile !== '-' ? c.mobile : '',
            address: c.address && c.address !== '-' ? c.address : '',
            gst: c.gst && c.gst !== 'N/A' ? c.gst : '',
            aadhar: c.aadhar || '',
          }))
        );
      }

      const pMap = new Map<string, any>();
      if (Array.isArray(prodRes)) {
        prodRes.forEach((p: any) => {
          if (p.name) {
            pMap.set(p.name.toLowerCase().trim(), {
              name: p.name.trim(),
              rate: p.rate || 0,
              unit: p.unit || 'Box',
              hsn: p.hsn || '3604',
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
              name: item.itemName.trim(),
              rate: item.rate && item.rate > 0 ? item.rate : (existing?.rate || 0),
              unit: item.unit || existing?.unit || 'Box',
              hsn: item.hsn || existing?.hsn || '3604',
            });
          }
        });
      }
      setProductOptions(Array.from(pMap.values()));
    } catch (e) {
      console.warn('Failed to load GST billing options', e);
    }
  };

  const handleResetForm = (targetYear: number = selectedYear) => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGst('');
    setCustomerAadhar('');
    setDispatchFrom('');
    setDispatchTo('');
    setTransport('');
    setTransportGstin('');
    setDiscountPercent('0.00');
    setPackingPercent('0.00');
    setPlaceOfSupply('Tamil Nadu (33)');
    setSelectedProduct('');
    setHsnCode('3604');
    setQuantity('1');
    setUnit('Case');
    setRate('0');
    setProductRows([]);
    setBillDate(getTodayDateString(targetYear));
    fetchNextGstBillNo(targetYear);
  };

  const fetchNextGstBillNo = async (targetYear: number = selectedYear) => {
    try {
      const res = await ParticularsApi.getNextBillNo('GST', targetYear);
      const rawNo = (res && typeof res === 'object' && 'nextBillNo' in res) ? res.nextBillNo : res;
      if (typeof rawNo === 'string' && rawNo.trim()) {
        const cleanNo = rawNo.replace(/^GST[-_ ]*/i, '');
        setBillNo(cleanNo || '0001');
      } else {
        setBillNo('0001');
      }
    } catch {
      setBillNo('0001');
    }
  };

  const fetchGstHistory = async (targetYear: number = selectedYear) => {
    setLoadingHistory(true);
    try {
      let remoteBills: any[] = [];
      try {
        const res = await ParticularsApi.getAll(undefined, 'GST', targetYear);
        if (Array.isArray(res)) {
          remoteBills = res.filter((b: any) => b.billType === 'GST' || (b.billNo && String(b.billNo).toUpperCase().startsWith('GST')));
        }
      } catch (err) {
        console.warn('Could not fetch GST bills from API', err);
      }

      setHistoryList(remoteBills);
      localStorage.setItem(GST_LOCAL_HISTORY_KEY, JSON.stringify(remoteBills));
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    setActiveBillingYear(newYear);
    setBillDate(getTodayDateString(newYear));
    loadOptions(newYear);
    fetchNextGstBillNo(newYear);
    fetchGstHistory(newYear);
  };

  const handleSaveTurnoverBaseline = async () => {
    const val = parseFloat(topTurnoverInput.replace(/,/g, ''));
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid turnover amount');
      return;
    }
    const formatted = val.toFixed(2);
    setCurrentTurnover(formatted);
    setTopTurnoverInput(formatted);
    localStorage.setItem('apsara_gst_turnover_current', formatted);
    localStorage.setItem('apsara_gst_turnover_baseline', formatted);
    try {
      await SettingsApi.update({ ...storeSettings, gstTurnoverCurrent: formatted, gstTurnoverBaseline: formatted });
    } catch (e) {
      console.warn('Could not sync turnover with server:', e);
    }
    setTurnoverSnackbar(`Sales Turnover baseline saved: ₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  };

  useEffect(() => {
    loadOptions(selectedYear);
    fetchNextGstBillNo(selectedYear);
    fetchGstHistory(selectedYear);

    const handleGlobalYear = (e: any) => {
      if (e.detail?.year && e.detail.year !== selectedYear) {
        setSelectedYear(e.detail.year);
        setBillDate(getTodayDateString(e.detail.year));
        loadOptions(e.detail.year);
        fetchNextGstBillNo(e.detail.year);
        fetchGstHistory(e.detail.year);
      }
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleGlobalYear);
    return () => {
      window.removeEventListener(YEAR_CHANGE_EVENT, handleGlobalYear);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const s = getStoredSettings();
      setStoreSettings(s);
      if (s.gstTurnoverCurrent && !localStorage.getItem('apsara_gst_turnover_current')) {
        setCurrentTurnover(s.gstTurnoverCurrent);
        setTopTurnoverInput(s.gstTurnoverCurrent);
      }
    };
    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
  }, []);

  const handleCustomerChange = (_: any, value: any) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      setCustomerName(value);
      const matched = customerOptions.find(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (matched) {
        setCustomerPhone(matched.mobile || '');
        setCustomerAddress(matched.address || '');
        setCustomerAadhar(matched.aadhar || '');
        setDispatchTo(matched.address || '');
        if (matched.gst) {
          setCustomerGst(matched.gst);
          const stateCode = matched.gst.slice(0, 2);
          const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);
          if (matchedState) {
            setPlaceOfSupply(`${matchedState.name} (${matchedState.code})`);
          }
        } else {
          setCustomerGst('');
        }
        checkPreviousHistory(matched.name, selectedYear);
      } else {
        setCustomerPhone('');
        setCustomerAddress('');
        setCustomerGst('');
        setCustomerAadhar('');
      }
    } else if (value && value.name) {
      setCustomerName(value.name);
      setCustomerPhone(value.mobile || '');
      setCustomerAddress(value.address || '');
      setCustomerAadhar(value.aadhar || '');
      setDispatchTo(value.address || '');
      if (value.gst) {
        setCustomerGst(value.gst);
        const stateCode = value.gst.slice(0, 2);
        const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);
        if (matchedState) {
          setPlaceOfSupply(`${matchedState.name} (${matchedState.code})`);
        }
      } else {
        setCustomerGst('');
      }
      checkPreviousHistory(value.name, selectedYear);
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerGst('');
      setCustomerAadhar('');
      setDispatchTo('');
      setPlaceOfSupply('Tamil Nadu (33)');
    }
  };

  const handleProductChange = (_: any, value: any) => {
    if (typeof value === 'string') {
      setSelectedProduct(value);
    } else if (value && value.name) {
      setSelectedProduct(value.name);
      if (value.rate) setRate(String(value.rate));
      if (value.unit) setUnit(value.unit);
      setHsnCode('3604');
    } else {
      setSelectedProduct('');
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct.trim()) {
      alert('Please enter or select a product');
      return;
    }
    const qNum = parseFloat(quantity) || 1;
    const rNum = parseFloat(rate) || 0;

    const existingIndex = productRows.findIndex(
      (r) => r.particular.toLowerCase() === selectedProduct.trim().toLowerCase()
    );

    if (existingIndex !== -1) {
      setProductRows((prev) =>
        prev.map((row, idx) => {
          if (idx === existingIndex) {
            const updatedQty = (parseFloat(String(row.quantity)) || 0) + qNum;
            const updatedRate = parseFloat(String(row.rate)) || rNum;
            const updatedAmt = (updatedQty * updatedRate).toFixed(2);
            return {
              ...row,
              quantity: updatedQty,
              rate: updatedRate,
              taxableAmount: updatedAmt,
              amount: updatedAmt,
            };
          }
          return row;
        })
      );
    } else {
      const newItem: GstProductItem = {
        particular: selectedProduct.trim(),
        hsnCode: hsnCode || '3604',
        quantity: qNum,
        unit: unit || 'Case',
        per: unit || 'Case',
        rate: rNum,
        gstRate: 0,
        taxableAmount: (qNum * rNum).toFixed(2),
        amount: (qNum * rNum).toFixed(2),
      };
      setProductRows((prev) => [...prev, newItem]);
    }

    setSelectedProduct('');
    setQuantity('1');
    setRate('0');
  };

  const handleQuantityChange = (idx: number, newQty: string) => {
    setProductRows((prev) =>
      prev.map((row, i) => {
        if (i === idx) {
          const qNum = parseFloat(newQty) || 0;
          const rNum = parseFloat(String(row.rate)) || 0;
          const rowAmt = (qNum * rNum).toFixed(2);
          return {
            ...row,
            quantity: qNum,
            taxableAmount: rowAmt,
            amount: rowAmt,
          };
        }
        return row;
      })
    );
  };

  const handleRateChange = (idx: number, newRate: string) => {
    setProductRows((prev) =>
      prev.map((row, i) => {
        if (i === idx) {
          const qNum = parseFloat(String(row.quantity)) || 0;
          const rNum = parseFloat(newRate) || 0;
          const rowAmt = (qNum * rNum).toFixed(2);
          return {
            ...row,
            rate: rNum,
            taxableAmount: rowAmt,
            amount: rowAmt,
          };
        }
        return row;
      })
    );
  };

  const handleRemoveRow = (idx: number) => {
    setProductRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildCurrentGstBillData = (): GstBillPrintData => {
    return {
      billNo,
      date: formatDisplayDate(billDate),
      customerName: customerName || '',
      customerPhone,
      customerAddress: customerAddress || '',
      customerGst: customerGst || '',
      customerAadhar: customerAadhar || '',
      deliveryName: customerName || '',
      deliveryAddress: customerAddress || '',
      deliveryAadhar: customerAadhar || '',
      placeOfSupply,
      reverseCharge: 'No',
      vehicleNo: '',
      ewayBillNo: '',
      transport: transport || '',
      transportGstin: transportGstin || '',
      dispatchFrom: dispatchFrom || '',
      dispatchTo: dispatchTo || '',
      despatchFrom: dispatchFrom || '',
      despatchTo: dispatchTo || '',
      caseCount: lineCalculations.totalCases,
      companyName: storeSettings.companyName || 'SVM CRACKERS',
      gstin: storeSettings.gstin || '33ABFFA6758B1ZP',
      hsnNo: '3604',
      products: lineCalculations.computedRows,
      subtotal: lineCalculations.taxableTotal,
      discount: lineCalculations.discountAmount,
      discountPercent,
      packingCharges: lineCalculations.packingAmount,
      packingPercent,
      roundOff: lineCalculations.roundOff,
      total: lineCalculations.grandTotal,
      previousTurnover: lineCalculations.previousTurnover,
      thisBillTurnover: lineCalculations.thisBillTurnover,
      totalTurnover: lineCalculations.totalTurnover,
      paymentStatus: 'UNPAID',
      invoiceCopy: 'ORIGINAL',
    };
  };

  const handleSaveGstBill = async (actionType: 'save' | 'print' | 'share' = 'save') => {
    if (!customerName.trim()) {
      alert('Please specify a customer name');
      return;
    }

    // Validate bill date against selected year
    if (!validateDateMatchesYear(billDate, selectedYear)) {
      alert(`Bill date (${billDate}) does not belong to the selected year ${selectedYear}. Please select a date from ${selectedYear}.`);
      return;
    }

    if (productRows.length === 0) {
      alert('Please add at least one product item to the invoice');
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
        customerPhone: billData.customerPhone,
        customerAddress: billData.customerAddress,
        customerGst: billData.customerGst,
        customerAadhar: billData.customerAadhar,
        placeOfSupply: billData.placeOfSupply,
        reverseCharge: billData.reverseCharge,
        vehicleNo: billData.vehicleNo,
        ewayBillNo: billData.ewayBillNo,
        transport: billData.transport,
        transportGstin: billData.transportGstin,
        dispatchFrom: billData.dispatchFrom || billData.despatchFrom,
        dispatchTo: billData.dispatchTo || billData.despatchTo,
        despatchFrom: billData.dispatchFrom || billData.despatchFrom,
        despatchTo: billData.dispatchTo || billData.despatchTo,
        deliveryName: billData.deliveryName,
        deliveryAddress: billData.deliveryAddress,
        deliveryAadhar: billData.deliveryAadhar,
        caseCount: String(billData.caseCount),
        companyName: billData.companyName,
        discount: String(billData.discount),
        discountPercent: String(billData.discountPercent),
        packing: String(billData.packingCharges),
        packingPercent: String(billData.packingPercent),
        amount: String(billData.subtotal),
        tax: '0',
        total: String(billData.total),
        previousTurnover: String(billData.previousTurnover),
        thisBillTurnover: String(billData.thisBillTurnover),
        totalTurnover: String(billData.totalTurnover),
        hsnNo: String(billData.hsnNo),
        billType: 'GST',
        roundOff: String(billData.roundOff),
        products: billData.products.map((p) => ({
          particular: p.particular,
          quantity: String(p.quantity),
          rate: String(p.rate),
          pktUnit: String(p.unit || 'Case'),
          amount: String(p.amount),
          hsnCode: String(p.hsnCode || '3604'),
          gstRate: '0',
          taxableAmount: String(p.taxableAmount || p.amount),
          cgst: '0',
          sgst: '0',
          igst: '0',
        })),
      };

      try {
        await ParticularsApi.create(payload);
      } catch (backendErr) {
        console.warn('Backend API save failed, saved locally', backendErr);
      }

      const existingHistoryRaw = localStorage.getItem(GST_LOCAL_HISTORY_KEY);
      const existingHistory: any[] = existingHistoryRaw ? JSON.parse(existingHistoryRaw) : [];
      const updatedHistory = [billData, ...existingHistory.filter((b) => b.billNo !== billData.billNo)];
      localStorage.setItem(GST_LOCAL_HISTORY_KEY, JSON.stringify(updatedHistory));
      setHistoryList(updatedHistory);

      alert(`GST Invoice #${billData.billNo} saved successfully!`);

      const addedTurnover = (parseFloat(currentTurnover) || 726900) + lineCalculations.grandTotalNum;
      const newTurnoverStr = addedTurnover.toFixed(2);
      setCurrentTurnover(newTurnoverStr);
      setTopTurnoverInput(newTurnoverStr);
      localStorage.setItem('apsara_gst_turnover_current', newTurnoverStr);
      SettingsApi.update({ ...storeSettings, gstTurnoverCurrent: newTurnoverStr }).catch(() => {});

      handleResetForm();

      if (actionType === 'print') {
        printGstBillDirectly(billData);
      } else if (actionType === 'share') {
        setSelectedBillForPrint(billData);
        setPrintModalOpen(true);
      }
    } catch (e) {
      console.error('Error saving GST Bill:', e);
      alert('Failed to save GST Bill. Please try again.');
    } finally {
      setSavingBill(false);
    }
  };

  const handleDeleteHistory = async (bill: any) => {
    if (!confirm(`Delete GST Invoice #${bill.billNo}?`)) return;
    try {
      if (bill._id || bill.id) {
        await ParticularsApi.delete(bill._id || bill.id).catch(() => {});
      }
    } catch (err) {
      console.warn(err);
    }

    const updated = historyList.filter((b) => b.billNo !== bill.billNo);
    setHistoryList(updated);
    localStorage.setItem(GST_LOCAL_HISTORY_KEY, JSON.stringify(updated));
  };

  const handleExportCsv = () => {
    if (historyList.length === 0) {
      alert('No GST bills available to export');
      return;
    }

    const headers = [
      'Invoice No',
      'Date',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'Taxable Value (INR)',
      'Total Amount (INR)',
    ];

    const rows = historyList.map((b) => [
      `"${b.billNo || ''}"`,
      `"${b.date || ''}"`,
      `"${(b.customerName || '').replace(/"/g, '""')}"`,
      `"${b.customerGst || 'Unregistered'}"`,
      `"${b.placeOfSupply || 'Tamil Nadu'}"`,
      parseFloat(String(b.subtotal || b.amount || 0)).toFixed(2),
      parseFloat(String(b.total || 0)).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GST_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = useMemo(() => {
    const term = historySearchTerm.toLowerCase().trim();
    if (!term) return historyList;
    return historyList.filter((b) => {
      const bNo = (b.billNo || '').toLowerCase();
      const cName = (b.customerName || '').toLowerCase();
      const gst = (b.customerGst || '').toLowerCase();
      return bNo.includes(term) || cName.includes(term) || gst.includes(term);
    });
  }, [historyList, historySearchTerm]);

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 'calc(100vh - 48px)',
        bgcolor: '#D9E4F2',
        p: { xs: 1, sm: 1.5 },
        boxSizing: 'border-box',
      }}
    >
      {/* Main ERP Window Card */}
      <Paper
        elevation={0}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongRoundedIcon sx={{ fontSize: 18, color: '#1E3A8A' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', letterSpacing: 0.2 }}>
              GST Tax Invoice Management
            </Typography>
            <Chip
              label="Composition Scheme (Sec 10)"
              size="small"
              sx={{
                height: '20px',
                fontSize: '11px',
                fontWeight: 700,
                bgcolor: '#D2E3F5',
                color: '#1E3A8A',
                border: '1px solid #99BBE8',
              }}
            />
          </Box>

          {/* Right: Year Selector & Subtabs Switcher */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Year Selector */}
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
                Year:
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

            <Button
              size="small"
              onClick={() => setActiveSubTab('create')}
              sx={{
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.2,
                py: 0.3,
                minHeight: '26px',
                borderRadius: '3px',
                bgcolor: activeSubTab === 'create' ? '#D2E3F5' : '#EDF4FB',
                color: '#1E3A8A',
                border: '1px solid #99BBE8',
                '&:hover': { bgcolor: '#C5DCF5' },
              }}
            >
              Create Tax Invoice
            </Button>
            <Button
              size="small"
              onClick={() => {
                setActiveSubTab('history');
                fetchGstHistory();
              }}
              sx={{
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.2,
                py: 0.3,
                minHeight: '26px',
                borderRadius: '3px',
                bgcolor: activeSubTab === 'history' ? '#D2E3F5' : '#EDF4FB',
                color: '#1E3A8A',
                border: '1px solid #99BBE8',
                '&:hover': { bgcolor: '#C5DCF5' },
              }}
            >
              Invoices History ({historyList.length})
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                handleResetForm();
                setActiveSubTab('create');
              }}
              startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
              sx={{
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: '#741748',
                color: '#FFFFFF',
                borderRadius: '3px',
                px: 1.2,
                py: 0.3,
                minHeight: '26px',
                '&:hover': { bgcolor: '#580e34' },
              }}
            >
              + New Bill
            </Button>
          </Box>
        </Box>

        {/* CREATE TAX INVOICE TAB */}
        {activeSubTab === 'create' && (
          <Box sx={{ p: 1.5 }}>
            {/* Sales Turnover Baseline Setting Strip */}
            <Box
              sx={{
                mb: 1.5,
                p: 1,
                bgcolor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpRoundedIcon sx={{ fontSize: 18, color: '#741748' }} />
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  Cumulative Sales Turnover:
                </Typography>
                <Chip
                  size="small"
                  label={`Current Upto Previous Bill: ₹${parseFloat(currentTurnover || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  sx={{
                    height: '20px',
                    bgcolor: '#EDF4FB',
                    color: '#1E3A8A',
                    fontWeight: 700,
                    fontSize: '11px',
                    border: '1px solid #CBD5E1',
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography sx={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                  Baseline Turnover (₹):
                </Typography>
                <input
                  type="text"
                  className="erp-input"
                  style={{ width: '130px', textAlign: 'right', fontWeight: 700 }}
                  value={topTurnoverInput}
                  onChange={(e) => setTopTurnoverInput(e.target.value)}
                />
                <Button
                  size="small"
                  onClick={handleSaveTurnoverBaseline}
                  startIcon={<SaveRoundedIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: '#EDF4FB',
                    border: '1px solid #94A3B8',
                    color: '#0F172A',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 0.2,
                    px: 1,
                    borderRadius: '2px',
                    '&:hover': { bgcolor: '#E2E8F0' },
                  }}
                >
                  Save Baseline
                </Button>
              </Box>
            </Box>

            <Grid container spacing={1.5}>
              {/* Left Column: Form Details & Line Items */}
              <Grid size={{ xs: 12, lg: 8 }}>
                {/* Fieldset 1: Invoice & Transport Details */}
                <fieldset className="erp-fieldset" style={{ marginBottom: '12px' }}>
                  <legend className="erp-legend">Invoice & Transport Details</legend>
                  <Grid container spacing={1.2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        GST Bill No
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        value={billNo}
                        onChange={(e) => setBillNo(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Bill Date
                      </Typography>
                      <input
                        type="date"
                        className="erp-input"
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Dispatch From
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="e.g. SIVAKASI"
                        value={dispatchFrom}
                        onChange={(e) => setDispatchFrom(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Dispatch To
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="e.g. Destination"
                        value={dispatchTo}
                        onChange={(e) => setDispatchTo(e.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Transport Name
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Transport name (optional)"
                        value={transport}
                        onChange={(e) => setTransport(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Transport GSTIN
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Optional GSTIN"
                        value={transportGstin}
                        onChange={(e) => setTransportGstin(e.target.value.toUpperCase())}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        HSN Code
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        value={hsnNo}
                        disabled
                        style={{ backgroundColor: '#F1F5F9', cursor: 'not-allowed' }}
                      />
                    </Grid>
                  </Grid>
                </fieldset>

                {/* Fieldset 2: Customer (Buyer) Information */}
                <fieldset className="erp-fieldset" style={{ marginBottom: '12px' }}>
                  <legend className="erp-legend">Customer (Buyer) & Delivery Information</legend>
                  <Grid container spacing={1.2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Customer Name <span style={{ color: '#DC2626' }}>*</span>
                      </Typography>
                      <Autocomplete
                        freeSolo
                        options={customerOptions}
                        getOptionLabel={(option: any) => (typeof option === 'string' ? option : option.name || '')}
                        value={customerName}
                        inputValue={customerName}
                        onInputChange={(_, newInputValue, reason) => {
                          setCustomerName(newInputValue);
                          if (reason === 'clear') {
                            setCustomerPhone('');
                            setCustomerAddress('');
                            setCustomerGst('');
                            setCustomerAadhar('');
                          }
                        }}
                        onChange={handleCustomerChange}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="Type or select customer..."
                            slotProps={{
                              ...params.slotProps,
                              input: {
                                ...params.slotProps.input,
                                sx: { fontSize: '12px', py: 0.2 },
                              },
                            }}
                          />
                        )}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Mobile / Phone
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="10-digit mobile"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        AADHAR / PAN No
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Aadhar / PAN"
                        value={customerAadhar}
                        onChange={(e) => setCustomerAadhar(e.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 8 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Address / City
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Customer address or delivery location"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Customer GSTIN
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="GSTIN (optional)"
                        value={customerGst}
                        onChange={(e) => setCustomerGst(e.target.value.toUpperCase())}
                      />
                    </Grid>
                  </Grid>
                </fieldset>

                {/* Fieldset 3: Line Items Entry & Table */}
                <fieldset className="erp-fieldset">
                  <legend className="erp-legend">Add Line Items & Products</legend>

                  {/* Add Product Toolbar Row */}
                  <Grid container spacing={1} sx={{ alignItems: 'flex-end', mb: 1.2 }}>
                    <Grid size={{ xs: 12, sm: 5 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Product Name <span style={{ color: '#DC2626' }}>*</span>
                      </Typography>
                      <Autocomplete
                        freeSolo
                        options={productOptions}
                        getOptionLabel={(opt: any) => (typeof opt === 'string' ? opt : opt.name || '')}
                        value={selectedProduct}
                        inputValue={selectedProduct}
                        onInputChange={(_, newVal) => setSelectedProduct(newVal)}
                        onChange={handleProductChange}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="Type or select product..."
                            slotProps={{
                              ...params.slotProps,
                              input: {
                                ...params.slotProps.input,
                                sx: { fontSize: '12px', py: 0.2 },
                              },
                            }}
                          />
                        )}
                      />
                    </Grid>

                    <Grid size={{ xs: 4, sm: 2 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Quantity
                      </Typography>
                      <input
                        type="number"
                        className="erp-input"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 4, sm: 2 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Unit
                      </Typography>
                      <input
                        type="text"
                        className="erp-input"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 4, sm: 2 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Rate (₹)
                      </Typography>
                      <input
                        type="number"
                        className="erp-input"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 1 }}>
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        onClick={handleAddItem}
                        startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
                        sx={{
                          bgcolor: '#741748',
                          color: '#FFFFFF',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          textTransform: 'none',
                          height: '30px',
                          borderRadius: '2px',
                          '&:hover': { bgcolor: '#580e34' },
                        }}
                      >
                        Add
                      </Button>
                    </Grid>
                  </Grid>

                  {/* Line Items Table */}
                  <TableContainer
                    sx={{
                      maxHeight: '280px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '2px',
                      overflowY: 'auto',
                    }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '11px', width: '35px', textAlign: 'center', bgcolor: '#DCE7F5' }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '11px', bgcolor: '#DCE7F5' }}>Particulars / Product Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '11px', textAlign: 'center', width: '60px', bgcolor: '#DCE7F5' }}>HSN</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '11px', textAlign: 'center', width: '110px', bgcolor: '#DCE7F5' }}>Qty</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '11px', textAlign: 'center', width: '60px', bgcolor: '#DCE7F5' }}>Unit</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '11px', textAlign: 'right', width: '85px', bgcolor: '#DCE7F5' }}>Rate (₹)</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '11px', textAlign: 'right', width: '95px', bgcolor: '#DCE7F5' }}>Amount (₹)</TableCell>
                          <TableCell sx={{ width: '35px', textAlign: 'center', bgcolor: '#DCE7F5' }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lineCalculations.computedRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: '#64748B', fontSize: '12px' }}>
                              No product items added yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          lineCalculations.computedRows.map((row, idx) => (
                            <TableRow key={idx} sx={{ '&:hover': { bgcolor: '#F1F7FD' } }}>
                              <TableCell sx={{ textAlign: 'center', py: 0.3, fontSize: '11.5px', color: '#64748B' }}>
                                {idx + 1}
                              </TableCell>
                              <TableCell sx={{ py: 0.3, fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                                {row.particular}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center', py: 0.3, fontSize: '11.5px', color: '#64748B' }}>
                                {row.hsnCode || '3604'}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center', py: 0.3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const current = parseFloat(String(row.quantity)) || 1;
                                      if (current > 1) {
                                        handleQuantityChange(idx, String(current - 1));
                                      }
                                    }}
                                    sx={{ p: 0.2, border: '1px solid #CBD5E1', borderRadius: '2px' }}
                                  >
                                    <RemoveRoundedIcon sx={{ fontSize: 12 }} />
                                  </IconButton>
                                  <input
                                    type="number"
                                    className="erp-input"
                                    style={{ width: '42px', textAlign: 'center', padding: '1px 2px', fontWeight: 700 }}
                                    value={row.quantity}
                                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                  />
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const current = parseFloat(String(row.quantity)) || 0;
                                      handleQuantityChange(idx, String(current + 1));
                                    }}
                                    sx={{ p: 0.2, border: '1px solid #CBD5E1', borderRadius: '2px' }}
                                  >
                                    <AddRoundedIcon sx={{ fontSize: 12 }} />
                                  </IconButton>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center', py: 0.3, fontSize: '11.5px', color: '#475569' }}>
                                {row.unit}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'right', py: 0.3 }}>
                                <input
                                  type="number"
                                  className="erp-input"
                                  style={{ width: '65px', textAlign: 'right', padding: '1px 4px', fontWeight: 600 }}
                                  value={row.rate}
                                  onChange={(e) => handleRateChange(idx, e.target.value)}
                                />
                              </TableCell>
                              <TableCell sx={{ textAlign: 'right', py: 0.3, fontWeight: 700, color: '#741748', fontSize: '12px' }}>
                                ₹{row.amount}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center', py: 0.3 }}>
                                <IconButton size="small" onClick={() => handleRemoveRow(idx)} sx={{ color: '#DC2626', p: 0.2 }}>
                                  <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </fieldset>
              </Grid>

              {/* Right Column: Invoice Total & Actions Sidebar */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <fieldset className="erp-fieldset" style={{ height: '100%', boxSizing: 'border-box' }}>
                  <legend className="erp-legend">Invoice Summary & Calculations</legend>

                  {/* Discount & Packing Percent Inputs */}
                  <Grid container spacing={1} sx={{ mb: 1.2 }}>
                    <Grid size={{ xs: 6 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        Discount (%)
                      </Typography>
                      <input
                        type="number"
                        className="erp-input"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                        P & F CHGS (%)
                      </Typography>
                      <input
                        type="number"
                        className="erp-input"
                        value={packingPercent}
                        onChange={(e) => setPackingPercent(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, p: 1, bgcolor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '2px', mb: 1.2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <Typography sx={{ fontSize: '12px', color: '#64748B' }}>Sub Total:</Typography>
                      <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>₹{lineCalculations.taxableTotal}</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <Typography sx={{ fontSize: '12px', color: '#64748B' }}>Less Discount ({discountPercent}%):</Typography>
                      <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>-₹{lineCalculations.discountAmount}</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <Typography sx={{ fontSize: '12px', color: '#64748B' }}>Add P & F CHGS ({packingPercent}%):</Typography>
                      <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>+₹{lineCalculations.packingAmount}</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <Typography sx={{ fontSize: '12px', color: '#64748B' }}>Value of Goods:</Typography>
                      <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>₹{lineCalculations.valueOfGoods}</Typography>
                    </Box>

                    {lineCalculations.roundOff !== '0.00' && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <Typography sx={{ fontSize: '12px', color: '#64748B' }}>Round Off:</Typography>
                        <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>₹{lineCalculations.roundOff}</Typography>
                      </Box>
                    )}

                    <Divider sx={{ my: 0.3 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Grand Total:</Typography>
                      <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#741748' }}>₹{lineCalculations.grandTotal}</Typography>
                    </Box>

                    <Typography sx={{ fontSize: '10.5px', color: '#475569', fontStyle: 'italic', lineHeight: 1.3, mt: 0.3 }}>
                      Rupees: {numberToIndianWords(lineCalculations.grandTotalNum).replace(/\s*Rupees\s*/i, ' ').replace(/\s*Only\s*/i, '').trim()} Only.
                    </Typography>
                  </Box>

                  {/* Composition Scheme Turnover Info */}
                  <Box sx={{ p: 1, bgcolor: '#EDF4FB', border: '1px solid #99BBE8', borderRadius: '2px', mb: 1.5 }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#1E3A8A', mb: 0.4 }}>
                      Sales Turnover (Composition):
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', mb: 0.2 }}>
                      <span>Upto Previous Bill:</span>
                      <span style={{ fontWeight: 600 }}>₹{parseFloat(lineCalculations.previousTurnover).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', mb: 0.2 }}>
                      <span>This Bill:</span>
                      <span style={{ fontWeight: 600 }}>₹{parseFloat(lineCalculations.thisBillTurnover).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#1E3A8A', pt: 0.2, borderTop: '1px dashed #99BBE8' }}>
                      <span>Total Turnover:</span>
                      <span>₹{parseFloat(lineCalculations.totalTurnover).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={savingBill}
                      onClick={() => handleSaveGstBill('print')}
                      startIcon={savingBill ? <CircularProgress size={14} color="inherit" /> : <PrintOutlinedIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        bgcolor: '#741748',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '12px',
                        py: 0.8,
                        borderRadius: '3px',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#580e34' },
                      }}
                    >
                      Save & Print Tax Invoice
                    </Button>

                    <Button
                      fullWidth
                      variant="contained"
                      disabled={savingBill}
                      onClick={() => handleSaveGstBill('share')}
                      startIcon={savingBill ? <CircularProgress size={14} color="inherit" /> : <WhatsAppIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        bgcolor: '#16A34A',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '12px',
                        py: 0.8,
                        borderRadius: '3px',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#15803D' },
                      }}
                    >
                      Save & Share (WhatsApp PDF)
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      disabled={savingBill}
                      onClick={() => handleSaveGstBill('save')}
                      sx={{
                        bgcolor: '#EDF4FB',
                        border: '1px solid #94A3B8',
                        color: '#0F172A',
                        fontWeight: 700,
                        fontSize: '12px',
                        py: 0.6,
                        borderRadius: '3px',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#E2E8F0' },
                      }}
                    >
                      Save Only
                    </Button>
                  </Box>
                </fieldset>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* GST INVOICES HISTORY TAB */}
        {activeSubTab === 'history' && (
          <Box sx={{ p: 1.5 }}>
            {/* Search & Actions Toolbar */}
            <Box
              sx={{
                p: 1,
                bgcolor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
                mb: 1.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: '#FFFFFF',
                  border: '1px solid #94A3B8',
                  borderRadius: '2px',
                  px: 1,
                  py: 0.2,
                  width: { xs: '100%', sm: '280px' },
                }}
              >
                <SearchRoundedIcon sx={{ fontSize: 17, color: '#64748B', mr: 0.5 }} />
                <input
                  type="text"
                  placeholder="Search bill no, customer, GSTIN..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    width: '100%',
                  }}
                />
                {historySearchTerm && (
                  <IconButton size="small" onClick={() => setHistorySearchTerm('')} sx={{ p: 0.2 }}>
                    <ClearRoundedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Button
                  size="small"
                  onClick={handleExportCsv}
                  startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    bgcolor: '#EDF4FB',
                    border: '1px solid #94A3B8',
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '11.5px',
                    textTransform: 'none',
                    borderRadius: '3px',
                    px: 1.2,
                    py: 0.4,
                    '&:hover': { bgcolor: '#E2E8F0' },
                  }}
                >
                  Export GSTR-1 CSV
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    handleResetForm();
                    setActiveSubTab('create');
                  }}
                  startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    bgcolor: '#741748',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '11.5px',
                    textTransform: 'none',
                    borderRadius: '3px',
                    px: 1.5,
                    py: 0.4,
                    '&:hover': { bgcolor: '#580e34' },
                  }}
                >
                  + New Bill
                </Button>
              </Box>
            </Box>

            {/* Invoices History Table */}
            {loadingHistory ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} sx={{ color: '#741748' }} />
              </Box>
            ) : (
              <TableContainer
                sx={{
                  maxHeight: 'calc(100vh - 220px)',
                  border: '1px solid #CBD5E1',
                  borderRadius: '2px',
                  overflowY: 'auto',
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', color: '#0F172A', bgcolor: '#DCE7F5', borderRight: '1px solid #CBD5E1' }}>Invoice No</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', color: '#0F172A', bgcolor: '#DCE7F5', borderRight: '1px solid #CBD5E1' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', color: '#0F172A', bgcolor: '#DCE7F5', borderRight: '1px solid #CBD5E1' }}>Customer Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', color: '#0F172A', bgcolor: '#DCE7F5', borderRight: '1px solid #CBD5E1' }}>GSTIN</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', color: '#0F172A', bgcolor: '#DCE7F5', borderRight: '1px solid #CBD5E1' }}>Place of Supply</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', color: '#0F172A', bgcolor: '#DCE7F5', textAlign: 'right', borderRight: '1px solid #CBD5E1' }}>Taxable Val (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', color: '#0F172A', bgcolor: '#DCE7F5', textAlign: 'right', borderRight: '1px solid #CBD5E1' }}>Total (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', color: '#0F172A', bgcolor: '#DCE7F5', textAlign: 'center' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#64748B', fontSize: '12px' }}>
                          No GST invoices found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((bill, index) => {
                        const totalNum = parseFloat(String(bill.total || 0));
                        const taxableNum = parseFloat(String(bill.subtotal || bill.amount || 0));

                        return (
                          <TableRow
                            key={index}
                            sx={{
                              '&:hover': { bgcolor: '#F1F7FD' },
                              bgcolor: index % 2 === 1 ? '#FAFCFE' : '#FFFFFF',
                            }}
                          >
                            <TableCell sx={{ fontWeight: 700, color: '#741748', fontSize: '12px', borderRight: '1px solid #E2E8F0', py: 0.5 }}>
                              {bill.billNo}
                            </TableCell>
                            <TableCell sx={{ fontSize: '11.5px', borderRight: '1px solid #E2E8F0', py: 0.5 }}>
                              {bill.date}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#0F172A', borderRight: '1px solid #E2E8F0', py: 0.5 }}>
                              {bill.customerName}
                            </TableCell>
                            <TableCell sx={{ borderRight: '1px solid #E2E8F0', py: 0.5 }}>
                              {bill.customerGst && bill.customerGst !== 'Unregistered' && bill.customerGst !== 'N/A' ? (
                                <Chip size="small" label={bill.customerGst} sx={{ fontSize: '10.5px', height: '20px', fontWeight: 600, bgcolor: '#EDF4FB', color: '#1E3A8A' }} />
                              ) : (
                                <Typography sx={{ fontSize: '11px', color: '#94A3B8' }}>Unregistered</Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: '11.5px', borderRight: '1px solid #E2E8F0', py: 0.5 }}>
                              {bill.placeOfSupply || 'Tamil Nadu (33)'}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right', fontWeight: 600, fontSize: '12px', borderRight: '1px solid #E2E8F0', py: 0.5 }}>
                              ₹{taxableNum.toFixed(2)}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#741748', fontSize: '12.5px', borderRight: '1px solid #E2E8F0', py: 0.5 }}>
                              ₹{totalNum.toFixed(2)}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', py: 0.4 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.4 }}>
                                <Tooltip title="Share on WhatsApp (PDF)">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedBillForPrint(bill);
                                      setPrintModalOpen(true);
                                    }}
                                    sx={{ color: '#16A34A', bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '2px', p: 0.3 }}
                                  >
                                    <WhatsAppIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Print Tax Invoice">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      printGstBillDirectly(bill);
                                    }}
                                    sx={{ color: '#1E3A8A', bgcolor: '#EDF4FB', border: '1px solid #CBD5E1', borderRadius: '2px', p: 0.3 }}
                                  >
                                    <PrintOutlinedIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Invoice">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteHistory(bill)}
                                    sx={{ color: '#DC2626', bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '2px', p: 0.3 }}
                                  >
                                    <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
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
            )}
          </Box>
        )}
      </Paper>

      {/* GST Bill Print Modal */}
      <GstBillPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        bill={selectedBillForPrint}
      />

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

      {/* Turnover Save Feedback Toast */}
      <Snackbar
        open={Boolean(turnoverSnackbar)}
        autoHideDuration={3500}
        onClose={() => setTurnoverSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setTurnoverSnackbar('')} severity="success" sx={{ width: '100%', fontWeight: 700, fontSize: '12px', borderRadius: '3px' }}>
          {turnoverSnackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
};
