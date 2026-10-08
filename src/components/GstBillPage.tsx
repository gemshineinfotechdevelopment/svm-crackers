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
  InputAdornment,
  Snackbar,
  Alert,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
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
import { getSelectedBillYear } from '../utils/billYearUtils';
import { triggerYearRestrictionDialog } from './YearRestrictionDialog';

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

export const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
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

  // Dropdown options
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);

  // Invoice Form State
  const [billNo, setBillNo] = useState<string>('0001');
  const [billDate, setBillDate] = useState<string>(() => getTodayDateString());
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
  // Sales Turnover Tracking (Persistent baseline across bills)
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

  // Load Dropdown Options
  const loadOptions = async () => {
    try {
      const [custRes, prodRes, priceRes] = await Promise.all([
        CustomersApi.getAll().catch(() => []),
        ProductsApi.getAll().catch(() => []),
        PriceListsApi.getAll().catch(() => []),
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

  // Reset form to fresh blank invoice
  const handleResetForm = () => {
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
    setBillDate(getTodayDateString());
    fetchNextGstBillNo();
  };

  // Fetch Next GST Bill No
  const fetchNextGstBillNo = async () => {
    try {
      const res = await ParticularsApi.getNextBillNo('GST');
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

  // Fetch GST History (Directly from MongoDB database)
  const fetchGstHistory = async () => {
    setLoadingHistory(true);
    try {
      // Clear legacy stale caches
      ['varun_gst_bills_history', 'dheeksha_gst_bills_history'].forEach(k => localStorage.removeItem(k));

      let remoteBills: any[] = [];
      try {
        const selectedYear = getSelectedBillYear();
        const res = await ParticularsApi.getAll(undefined, 'GST', selectedYear);
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

  // Save Baseline Sales Turnover from Top Bar
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
    loadOptions();
    fetchNextGstBillNo();
    fetchGstHistory();
  }, []);

  // Listen for settings update & bill year changes
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const s = getStoredSettings();
      setStoreSettings(s);
      if (s.gstTurnoverCurrent && !localStorage.getItem('apsara_gst_turnover_current')) {
        setCurrentTurnover(s.gstTurnoverCurrent);
        setTopTurnoverInput(s.gstTurnoverCurrent);
      }
    };
    const handleYearChange = () => {
      fetchGstHistory();
    };

    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    window.addEventListener('apsara_bill_year_changed', handleYearChange);
    return () => {
      window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
      window.removeEventListener('apsara_bill_year_changed', handleYearChange);
    };
  }, []);

  // Auto-sync customer details on selection
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

  // Auto-fill product rate and HSN
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

  // Add Item to Rows
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

  // Prepare Bill Object for print and save
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
      companyName: 'APSARA TRADERS',
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

  // Save GST Bill
  const handleSaveGstBill = async (actionType: 'save' | 'print' | 'share' = 'save') => {
    const currentSystemYear = new Date().getFullYear().toString();
    const selectedViewYear = getSelectedBillYear();
    if (selectedViewYear !== currentSystemYear) {
      triggerYearRestrictionDialog({ selectedYear: selectedViewYear, currentSystemYear });
      return;
    }

    if (!customerName.trim()) {
      alert('Please specify a customer name');
      return;
    }
    if (productRows.length === 0) {
      alert('Please add at least one product item to the invoice');
      return;
    }

    setSavingBill(true);
    const billData = buildCurrentGstBillData();

    try {
      // 1. Save to MongoDB
      const payload = {
        billNo: billData.billNo,
        date: billData.date,
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

      // 2. Save to Local Storage History
      const existingHistoryRaw = localStorage.getItem(GST_LOCAL_HISTORY_KEY);
      const existingHistory: any[] = existingHistoryRaw ? JSON.parse(existingHistoryRaw) : [];
      const updatedHistory = [billData, ...existingHistory.filter((b) => b.billNo !== billData.billNo)];
      localStorage.setItem(GST_LOCAL_HISTORY_KEY, JSON.stringify(updatedHistory));
      setHistoryList(updatedHistory);

      alert(`GST Invoice #${billData.billNo} saved successfully!`);

      // Increment Cumulative Sales Turnover automatically for future bills!
      const addedTurnover = (parseFloat(currentTurnover) || 726900) + lineCalculations.grandTotalNum;
      const newTurnoverStr = addedTurnover.toFixed(2);
      setCurrentTurnover(newTurnoverStr);
      setTopTurnoverInput(newTurnoverStr);
      localStorage.setItem('apsara_gst_turnover_current', newTurnoverStr);
      SettingsApi.update({ ...storeSettings, gstTurnoverCurrent: newTurnoverStr }).catch(() => {});

      // Reset form immediately for fresh new bill entry
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

  // Delete from History
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

  // Export GST Bills to CSV
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
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total Amount (INR)',
    ];

    const rows = historyList.map((b) => [
      `"${b.billNo || ''}"`,
      `"${b.date || ''}"`,
      `"${(b.customerName || '').replace(/"/g, '""')}"`,
      `"${b.customerGst || 'Unregistered'}"`,
      `"${b.placeOfSupply || 'Tamil Nadu'}"`,
      parseFloat(String(b.subtotal || b.amount || 0)).toFixed(2),
      parseFloat(String(b.cgstTotal || 0)).toFixed(2),
      parseFloat(String(b.sgstTotal || 0)).toFixed(2),
      parseFloat(String(b.igstTotal || 0)).toFixed(2),
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

  // Filtered History
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

  // Aggregate stats
  const totalTaxableSum = useMemo(() => {
    return historyList.reduce((acc, b) => acc + (parseFloat(String(b.subtotal || b.amount || 0)) || 0), 0);
  }, [historyList]);

  const totalGstSum = useMemo(() => {
    return historyList.reduce(
      (acc, b) =>
        acc +
        (parseFloat(String(b.cgstTotal || 0)) || 0) +
        (parseFloat(String(b.sgstTotal || 0)) || 0) +
        (parseFloat(String(b.igstTotal || 0)) || 0),
      0
    );
  }, [historyList]);

  const totalGrandSum = useMemo(() => {
    return historyList.reduce((acc, b) => acc + (parseFloat(String(b.total || 0)) || 0), 0);
  }, [historyList]);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', backgroundColor: '#FFFFFF', p: { xs: 1.5, sm: 3 } }}>
      {/* Top Header Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ReceiptLongRoundedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                GST Tax Invoicing
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                Generate official GST-compliant tax invoices with HSN codes, CGST/SGST/IGST breakdown, and print copies
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Top Header Card Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              handleResetForm();
              setActiveSubTab('create');
            }}
            sx={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13px',
              borderRadius: '8px',
              px: 2.2,
              py: 0.9,
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
              '&:hover': { backgroundColor: '#B91C1C' },
            }}
          >
           New Bill
          </Button>

          {/* View Switcher Tabs */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F1F5F9',
              p: 0.5,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
            }}
          >
            <Button
              onClick={() => {
                if (activeSubTab === 'history') {
                  handleResetForm();
                }
                setActiveSubTab('create');
              }}
              variant={activeSubTab === 'create' ? 'contained' : 'text'}
              sx={{
                backgroundColor: activeSubTab === 'create' ? '#0F172A' : 'transparent',
                color: activeSubTab === 'create' ? '#FFFFFF' : '#475569',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                px: 2,
                py: 0.8,
                '&:hover': {
                  backgroundColor: activeSubTab === 'create' ? '#1E293B' : '#E2E8F0',
                },
              }}
            >
              Create GST Invoice
            </Button>
            <Button
              onClick={() => {
                setActiveSubTab('history');
                fetchGstHistory();
              }}
              variant={activeSubTab === 'history' ? 'contained' : 'text'}
              sx={{
                backgroundColor: activeSubTab === 'history' ? '#0F172A' : 'transparent',
                color: activeSubTab === 'history' ? '#FFFFFF' : '#475569',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                px: 2,
                py: 0.8,
                '&:hover': {
                  backgroundColor: activeSubTab === 'history' ? '#1E293B' : '#E2E8F0',
                },
              }}
            >
              GST Invoices History ({historyList.length})
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* KPI Stats Bar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total GST Bills
            </Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
              {historyList.length}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Taxable Value
            </Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#1E40AF', mt: 0.5 }}>
              ₹{totalTaxableSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total GST Tax Collected
            </Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#D97706', mt: 0.5 }}>
              ₹{totalGstSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Grand Total Invoiced
            </Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', mt: 0.5 }}>
              ₹{totalGrandSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* CREATE GST INVOICE TAB */}
      {activeSubTab === 'create' && (
        <Box>
          {/* Top Sales Turnover Setting & Auto-Accumulation Control Bar */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: '12px',
              border: '1.5px solid #FCA5A5',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0,
                }}
              >
                <TrendingUpRoundedIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#991B1B' }}>
                    Sales Turnover
                  </Typography>
                  <Chip
                    size="small"
                    label={`Current Upto Previous Bill: ₹${parseFloat(currentTurnover || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    sx={{
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '11.5px',
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.2, width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}>
              <TextField
                size="small"
                label="Baseline Turnover (₹)"
                value={topTurnoverInput}
                onChange={(e) => setTopTurnoverInput(e.target.value)}
                placeholder="726900.00"
                sx={{
                  width: { xs: '100%', sm: '190px' },
                  backgroundColor: '#FFFFFF',
                  '& input': { fontWeight: 700, color: '#0F172A' },
                }}
              />
              <Button
                variant="contained"
                onClick={handleSaveTurnoverBaseline}
                startIcon={<SaveRoundedIcon />}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  px: 2.2,
                  py: 0.9,
                  borderRadius: '8px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                  '&:hover': { backgroundColor: '#B91C1C' },
                }}
              >
                Save Turnover
              </Button>
            </Box>
          </Paper>

          <Grid container spacing={3}>
          {/* Main Left Form: Customer & Line Items */}
          <Grid size={{ xs: 12, lg: 8 }}>
            {/* Invoice Meta Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 4,
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <AccountBalanceOutlinedIcon sx={{ fontSize: 20, color: '#DC2626' }} />
                  Invoice & Place of Supply Details
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
                  onClick={handleResetForm}
                  sx={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'none',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    borderRadius: '7px',
                    px: 1.8,
                    '&:hover': { backgroundColor: '#B91C1C' },
                  }}
                >
                  New Bill
                </Button>
              </Box>

              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="GST Invoice No"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Invoice Date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      '& input': { cursor: 'pointer' },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Dispatch From"
                    value={dispatchFrom}
                    onChange={(e) => setDispatchFrom(e.target.value)}
                    placeholder="e.g. SIVAKASI"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Dispatch To"
                    value={dispatchTo}
                    onChange={(e) => setDispatchTo(e.target.value)}
                    placeholder="e.g. Destination"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Transport Name"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    placeholder="Transport name (optional)"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Transport GSTIN"
                    value={transportGstin}
                    onChange={(e) => setTransportGstin(e.target.value.toUpperCase())}
                    placeholder="Optional GSTIN"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="HSN Code (Fixed)"
                    value={hsnNo}
                    disabled
                    slotProps={{
                      input: {
                        readOnly: true,
                      },
                    }}
                    sx={{
                      '& .MuiInputBase-input.Mui-disabled': {
                        WebkitTextFillColor: '#1E293B',
                        fontWeight: 700,
                        backgroundColor: '#F1F5F9',
                        cursor: 'not-allowed',
                      },
                    }}
                    placeholder="3604"
                  />
                </Grid>
              </Grid>

              {/* Composition Tax Badge */}
              <Box
                sx={{
                  mt: 3,
                  p: 1.8,
                  borderRadius: '10px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                }}
              >
                <CheckCircleOutlineRoundedIcon sx={{ fontSize: 20, color: '#1D4ED8' }} />
                <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#1E40AF' }}>
                  Composition Scheme GST Bill (Section 10 of GST Act 2017) • Dispatch From {dispatchFrom || 'Sivakasi'} to {dispatchTo || customerAddress || '-'}
                </Typography>
              </Box>
            </Paper>

            {/* Customer Details Card (Buyer & Delivery Information) */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 4,
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 3 }}>
                Customer (To) & Delivery Information
              </Typography>

              <Grid container spacing={{ xs: 2.5, sm: 3 }}>
                {/* Customer Name */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.8, sm: 2 } }}>
                    <Typography sx={{ width: { xs: '100%', sm: '140px' }, minWidth: { xs: 'auto', sm: '140px' }, flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Customer Name <span style={{ color: '#DC2626' }}>*</span> :
                    </Typography>
                    <Box sx={{ flex: 1, width: '100%' }}>
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
                          <TextField {...params} size="small" placeholder="Type or select customer (e.g. Shanmugam Azhakan)" />
                        )}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Customer AADHAR / PAN */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.8, sm: 2 } }}>
                    <Typography sx={{ width: { xs: '100%', sm: '140px' }, minWidth: { xs: 'auto', sm: '140px' }, flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      AADHAR / PAN No :
                    </Typography>
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Enter Aadhar or PAN (optional)"
                        value={customerAadhar}
                        onChange={(e) => setCustomerAadhar(e.target.value)}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Mobile / Phone */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.8, sm: 2 } }}>
                    <Typography sx={{ width: { xs: '100%', sm: '140px' }, minWidth: { xs: 'auto', sm: '140px' }, flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Mobile / Phone :
                    </Typography>
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="10-digit mobile number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Customer Address */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.8, sm: 2 } }}>
                    <Typography sx={{ width: { xs: '100%', sm: '140px' }, minWidth: { xs: 'auto', sm: '140px' }, flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Address / City :
                    </Typography>
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="e.g. Urappakam"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                      />
                    </Box>
                  </Box>
                </Grid>

              </Grid>
            </Paper>

            {/* Line Items Entry & Table Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 4,
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Add Goods & Product Items
                </Typography>
                {productRows.length > 0 && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setProductRows([])}
                    startIcon={<ClearRoundedIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'none',
                      color: '#EF4444',
                      '&:hover': { backgroundColor: '#FEF2F2' },
                    }}
                  >
                    Clear All Products
                  </Button>
                )}
              </Box>

              {/* Product Entry Row (Responsive on mobile) */}
              <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ alignItems: 'center', mb: 3 }}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Autocomplete
                    freeSolo
                    options={productOptions}
                    getOptionLabel={(opt: any) => (typeof opt === 'string' ? opt : opt.name || '')}
                    value={selectedProduct}
                    inputValue={selectedProduct}
                    onInputChange={(_, newVal) => setSelectedProduct(newVal)}
                    onChange={handleProductChange}
                    renderInput={(params) => (
                      <TextField {...params} size="small" label="Product Name *" placeholder="Type or select product item" />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 4, sm: 2, md: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Qty"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    slotProps={{
                      htmlInput: {
                        onWheel: (e: any) => (e.target as HTMLElement).blur(),
                        step: 'any',
                      },
                    }}
                    sx={{
                      '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                        WebkitAppearance: 'none',
                        margin: 0,
                      },
                      '& input[type=number]': {
                        MozAppearance: 'textfield',
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 4, sm: 2, md: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 4, sm: 2, md: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Rate (₹)"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    slotProps={{
                      htmlInput: {
                        onWheel: (e: any) => (e.target as HTMLElement).blur(),
                        step: 'any',
                      },
                    }}
                    sx={{
                      '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                        WebkitAppearance: 'none',
                        margin: 0,
                      },
                      '& input[type=number]': {
                        MozAppearance: 'textfield',
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 12, md: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleAddItem}
                    startIcon={<AddRoundedIcon />}
                    sx={{
                      backgroundColor: '#DC2626',
                      fontWeight: 700,
                      py: 0.9,
                      '&:hover': { backgroundColor: '#B91C1C' },
                    }}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>

              {/* Items Table (Clean: No per-item GST columns) */}
              <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <Table size="small" sx={{ minWidth: { xs: 620, sm: '100%' } }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', width: '35px', textAlign: 'center' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Particulars / Product Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'center', width: '70px' }}>HSN</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'center', width: '135px' }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'center', width: '60px' }}>Unit</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right', width: '100px' }}>Rate (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right', width: '105px' }}>Amount (₹)</TableCell>
                      <TableCell sx={{ width: '40px', textAlign: 'center' }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineCalculations.computedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: '#64748B' }}>
                          No product items added yet. Fill the row above and click "Add".
                        </TableCell>
                      </TableRow>
                    ) : (
                      lineCalculations.computedRows.map((row, idx) => (
                        <TableRow key={idx} sx={{ '&:hover': { backgroundColor: '#F8FAFC' } }}>
                          <TableCell sx={{ textAlign: 'center' }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.particular}</TableCell>
                          <TableCell sx={{ textAlign: 'center', color: '#64748B' }}>{row.hsnCode || '3604'}</TableCell>
                          <TableCell sx={{ textAlign: 'center', py: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const current = parseFloat(String(row.quantity)) || 1;
                                  if (current > 1) {
                                    handleQuantityChange(idx, String(current - 1));
                                  }
                                }}
                                sx={{
                                  p: 0.3,
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '4px',
                                  color: '#64748B',
                                  '&:hover': { backgroundColor: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5' },
                                }}
                              >
                                <RemoveRoundedIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                              <TextField
                                size="small"
                                type="number"
                                value={row.quantity}
                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                slotProps={{
                                  htmlInput: {
                                    min: 1,
                                    onWheel: (e: any) => (e.target as HTMLElement).blur(),
                                    style: { textAlign: 'center', fontWeight: 700, padding: '3px 4px', fontSize: '13px' },
                                  },
                                }}
                                sx={{
                                  width: '52px',
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '6px',
                                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                  },
                                  '& input[type=number]': {
                                    MozAppearance: 'textfield',
                                  },
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#DC2626' },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#DC2626' },
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const current = parseFloat(String(row.quantity)) || 0;
                                  handleQuantityChange(idx, String(current + 1));
                                }}
                                sx={{
                                  p: 0.3,
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '4px',
                                  color: '#64748B',
                                  '&:hover': { backgroundColor: '#F0FDF4', color: '#166534', borderColor: '#86EFAC' },
                                }}
                              >
                                <AddRoundedIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{row.unit}</TableCell>
                          <TableCell sx={{ textAlign: 'right', py: 0.5 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={row.rate}
                              onChange={(e) => handleRateChange(idx, e.target.value)}
                              slotProps={{
                                htmlInput: {
                                  min: 0,
                                  onWheel: (e: any) => (e.target as HTMLElement).blur(),
                                  style: { textAlign: 'right', fontWeight: 700, padding: '3px 6px', fontSize: '13px', color: '#475569' },
                                },
                              }}
                              sx={{
                                width: '80px',
                                backgroundColor: '#FFFFFF',
                                borderRadius: '6px',
                                '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                  WebkitAppearance: 'none',
                                  margin: 0,
                                },
                                '& input[type=number]': {
                                  MozAppearance: 'textfield',
                                },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#DC2626' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#DC2626' },
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>₹{row.amount}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton size="small" onClick={() => handleRemoveRow(idx)} sx={{ color: '#EF4444' }}>
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Right Sidebar: Tax Summary & Actions */}
          <Grid size={{ xs: 12, lg: 4 }}>

            {/* Invoice Total & Sales Turnover Summary Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 4,
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 2.5 }}>
                Invoice Total &amp; Summary
              </Typography>

              {/* Discount % and P & F CHGS % Inputs */}
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#475569', mb: 0.5 }}>
                    Discount (%):
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    slotProps={{
                      htmlInput: {
                        onWheel: (e: any) => (e.target as HTMLElement).blur(),
                        step: 'any',
                      },
                      input: {
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      },
                    }}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      '& input': {
                        fontWeight: 700,
                        '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                          WebkitAppearance: 'none',
                          margin: 0,
                        },
                        MozAppearance: 'textfield',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#475569', mb: 0.5 }}>
                    P &amp; F CHGS (%):
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={packingPercent}
                    onChange={(e) => setPackingPercent(e.target.value)}
                    slotProps={{
                      htmlInput: {
                        onWheel: (e: any) => (e.target as HTMLElement).blur(),
                        step: 'any',
                      },
                      input: {
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      },
                    }}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      '& input': {
                        fontWeight: 700,
                        '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                          WebkitAppearance: 'none',
                          margin: 0,
                        },
                        MozAppearance: 'textfield',
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '13px', color: '#64748B' }}>Total :</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ₹{lineCalculations.taxableTotal}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
                    Less : Discount ({discountPercent}%):
                  </Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                    -₹{lineCalculations.discountAmount}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
                    ADD : P &amp; F CHGS ({packingPercent}%):
                  </Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    +₹{lineCalculations.packingAmount}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '13px', color: '#64748B' }}>Value of Goods :</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ₹{lineCalculations.valueOfGoods}
                  </Typography>
                </Box>

                {lineCalculations.roundOff !== '0.00' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '13px', color: '#64748B' }}>Round Off :</Typography>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>₹{lineCalculations.roundOff}</Typography>
                  </Box>
                )}

                <Divider sx={{ my: 0.5, borderColor: '#E2E8F0' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Grand Total:</Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#DC2626' }}>
                    ₹{lineCalculations.grandTotal}
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, backgroundColor: '#F8FAFC', borderRadius: '8px', mt: 0.5 }}>
                  <Typography sx={{ fontSize: '11.5px', color: '#475569', fontStyle: 'italic', lineHeight: 1.4 }}>
                    Rupees : {numberToIndianWords(lineCalculations.grandTotalNum).replace(/\s*Rupees\s*/i, ' ').replace(/\s*Only\s*/i, '').trim()} Only.
                  </Typography>
                </Box>

                <Divider sx={{ my: 1, borderColor: '#E2E8F0' }} />

                {/* Sales Turnover (Composition Scheme) Auto-Computed Box */}
                <Box sx={{ p: 2, backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#991B1B', textDecoration: 'underline', mb: 1.5 }}>
                    Sales Turnover
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                    <Typography sx={{ fontSize: '12px', color: '#7F1D1D' }}>Upto Previous Bill Rs. :</Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#991B1B' }}>
                      ₹{parseFloat(lineCalculations.previousTurnover).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                    <Typography sx={{ fontSize: '12px', color: '#7F1D1D' }}>This Bill Rs. :</Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#991B1B' }}>
                      ₹{parseFloat(lineCalculations.thisBillTurnover).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.8, borderTop: '1px solid #FECACA' }}>
                    <Typography sx={{ fontSize: '12.5px', fontWeight: 800, color: '#7F1D1D' }}>Total Turnover Rs. :</Typography>
                    <Typography sx={{ fontSize: '12.5px', fontWeight: 800, color: '#991B1B' }}>
                      ₹{parseFloat(lineCalculations.totalTurnover).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>

                  <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#B91C1C', mt: 1.5, fontStyle: 'italic', lineHeight: 1.3 }}>
                    "we are liable to pay Composition Tax Under section 10 of GST Act 2017"
                  </Typography>
                </Box>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3.5 }}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={savingBill}
                  onClick={() => handleSaveGstBill('print')}
                  startIcon={savingBill ? <CircularProgress size={18} color="inherit" /> : <PrintOutlinedIcon />}
                  sx={{
                    backgroundColor: '#DC2626',
                    py: 1.2,
                    fontWeight: 800,
                    fontSize: '14px',
                    '&:hover': { backgroundColor: '#B91C1C' },
                  }}
                >
                  Save & Print Tax Invoice
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  disabled={savingBill}
                  onClick={() => handleSaveGstBill('share')}
                  startIcon={savingBill ? <CircularProgress size={18} color="inherit" /> : <WhatsAppIcon />}
                  sx={{
                    backgroundColor: '#16A34A',
                    py: 1.2,
                    fontWeight: 800,
                    fontSize: '14px',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                    '&:hover': { backgroundColor: '#15803D' },
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
                    color: '#0F172A',
                    borderColor: '#CBD5E1',
                    fontWeight: 700,
                    py: 1,
                    '&:hover': { borderColor: '#94A3B8', backgroundColor: '#F8FAFC' },
                  }}
                >
                  Save Only
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      )}

      {/* GST INVOICES HISTORY TAB */}
      {activeSubTab === 'history' && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Search & Actions Bar */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <TextField
              size="small"
              placeholder="Search by Bill No, Customer, or GSTIN..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ color: '#94A3B8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: historySearchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setHistorySearchTerm('')}>
                        <ClearRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
              sx={{ width: { xs: '100%', sm: '360px' } }}
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportCsv}
                sx={{
                  color: '#1E40AF',
                  borderColor: '#BFDBFE',
                  fontWeight: 700,
                  fontSize: '12px',
                  '&:hover': { backgroundColor: '#EFF6FF' },
                }}
              >
                Export GSTR-1 CSV
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleResetForm();
                  setActiveSubTab('create');
                }}
                startIcon={<AddRoundedIcon />}
                sx={{
                  backgroundColor: '#DC2626',
                  fontWeight: 700,
                  fontSize: '12px',
                  '&:hover': { backgroundColor: '#B91C1C' },
                }}
              >
                + New Bill
              </Button>
            </Box>
          </Box>

          {/* Table */}
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#DC2626' }} />
            </Box>
          ) : (
            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Invoice No</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>GSTIN</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Place of Supply</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>Taxable Val</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>CGST+SGST / IGST</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>Total (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5, color: '#64748B' }}>
                        No GST invoices found. Create your first GST Bill from the "Create GST Invoice" tab.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((bill, index) => {
                      const totalNum = parseFloat(String(bill.total || 0));
                      const taxableNum = parseFloat(String(bill.subtotal || bill.amount || 0));
                      const taxTotalNum =
                        (parseFloat(String(bill.cgstTotal || 0)) || 0) +
                        (parseFloat(String(bill.sgstTotal || 0)) || 0) +
                        (parseFloat(String(bill.igstTotal || 0)) || 0);

                      return (
                        <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#F8FAFC' } }}>
                          <TableCell sx={{ fontWeight: 800, color: '#B91C1C' }}>{bill.billNo}</TableCell>
                          <TableCell>{bill.date}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{bill.customerName}</TableCell>
                          <TableCell>
                            {bill.customerGst && bill.customerGst !== 'Unregistered' && bill.customerGst !== 'N/A' ? (
                              <Chip size="small" label={bill.customerGst} sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#EFF6FF', color: '#1E40AF' }} />
                            ) : (
                              <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>Unregistered</Typography>
                            )}
                          </TableCell>
                          <TableCell>{bill.placeOfSupply || 'Tamil Nadu (33)'}</TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                            ₹{taxableNum.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right', color: '#D97706', fontWeight: 600 }}>
                            ₹{taxTotalNum.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                            ₹{totalNum.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Tooltip title="Share on WhatsApp (PDF)">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedBillForPrint(bill);
                                    setPrintModalOpen(true);
                                  }}
                                  sx={{ color: '#16A34A', '&:hover': { backgroundColor: '#F0FDF4' } }}
                                >
                                  <WhatsAppIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Print Tax Invoice">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    printGstBillDirectly(bill);
                                  }}
                                  sx={{ color: '#1E40AF' }}
                                >
                                  <PrintOutlinedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Invoice">
                                <IconButton size="small" onClick={() => handleDeleteHistory(bill)} sx={{ color: '#EF4444' }}>
                                  <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
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
        </Paper>
      )}

      {/* GST Bill Print Modal */}
      <GstBillPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        bill={selectedBillForPrint}
      />

      {/* Turnover Save Feedback Toast */}
      <Snackbar
        open={Boolean(turnoverSnackbar)}
        autoHideDuration={3500}
        onClose={() => setTurnoverSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setTurnoverSnackbar('')} severity="success" sx={{ width: '100%', fontWeight: 700 }}>
          {turnoverSnackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
};
