import { useState, useEffect, useMemo, useRef, type FC, type ChangeEvent } from 'react';
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
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
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
import { DuplicateBillModal } from './DuplicateBillModal';
import {
  getActiveBillingYear,
  validateDateMatchesYear,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';
import { getSelectedBillYear } from '../utils/billYearUtils';
import { triggerYearRestrictionDialog } from './YearRestrictionDialog';
import {
  getParticularSessions,
  saveParticularSessions,
  type ParticularDraftSession,
} from '../utils/billingSessionManager';

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
  slNo?: number | string;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  wholesaleRate?: number;
  retailRate?: number;
  productType?: string;
  unit?: string;
}

const findProductByCode = (code: string | undefined | null, options: ProductCatalogOption[]): ProductCatalogOption | null => {
  if (!code || !String(code).trim()) return null;
  const raw = String(code).trim();
  const lower = raw.toLowerCase();
  const digits = raw.replace(/\D/g, '');

  // 1. Exact match by slNo or sku
  let found = options.find((p) => {
    const slStr = p.slNo !== undefined && p.slNo !== null ? String(p.slNo).trim().toLowerCase() : '';
    const skuStr = p.sku ? String(p.sku).trim().toLowerCase() : '';
    return slStr === lower || skuStr === lower;
  });
  if (found) return found;

  // 2. Pure digit match (e.g. user typed "1" matching S.No 1 or SKU digits)
  if (digits) {
    found = options.find((p) => {
      const slStr = p.slNo !== undefined && p.slNo !== null ? String(p.slNo).trim() : '';
      const skuDigits = p.sku ? String(p.sku).replace(/\D/g, '') : '';
      return slStr === digits || (skuDigits && skuDigits === digits);
    });
    if (found) return found;
  }

  // 3. SKU starts with lower or name exact match
  found = options.find((p) => {
    const skuStr = p.sku ? String(p.sku).trim().toLowerCase() : '';
    const nameStr = p.name ? String(p.name).trim().toLowerCase() : '';
    return skuStr.startsWith(lower) || nameStr === lower;
  });
  if (found) return found;

  return null;
};

const getRateForType = (prod: ProductCatalogOption | undefined | null, rType: string): number => {
  if (!prod) return 0;
  const mrp = Number(prod.mrp) || 0;
  const netRate = Number(prod.rate) || 0;
  const wholesaleRate = Number(prod.wholesaleRate) || (prod.productType === 'Wholesale' ? netRate : netRate);
  const retailRate = Number(prod.retailRate) || (prod.productType === 'Retail' ? (netRate || mrp) : (mrp || netRate));

  switch (rType) {
    case 'Befor Rate':
    case 'Before Rate':
      return mrp > 0 ? mrp : netRate;
    case 'Net Rate':
      return netRate > 0 ? netRate : mrp;
    case 'Wholesale Rate':
      return wholesaleRate > 0 ? wholesaleRate : netRate;
    case 'Retail Rate':
      return retailRate > 0 ? retailRate : (mrp > 0 ? mrp : netRate);
    default:
      return netRate > 0 ? netRate : mrp;
  }
};

interface ParticularsPageProps {
  mode?: 'ESTIMATE' | 'QUOTATION';
  initialCustomerName?: string;
  editBillData?: any | null;
  onEditSuccess?: () => void;
  onConvertToEstimate?: (billData?: any) => void;
}

const getInitialDateStr = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const ParticularsPage: FC<ParticularsPageProps> = ({
  mode = 'ESTIMATE',
  initialCustomerName,
  editBillData,
  onEditSuccess,
  onConvertToEstimate,
}) => {
  const [storeSettings] = useState(() => getStoredSettings());

  // Year state synced with global Navbar/Settings
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);

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

  const isEditMode = Boolean(editBillData && (editBillData._id || editBillData.id));

  // 0. Session Draft Management State
  const initialSessionData = useMemo(() => {
    if (editBillData) return { sessions: [], activeId: '' };
    return getParticularSessions(mode);
  }, [mode, Boolean(editBillData)]);

  const [sessions, setSessions] = useState<ParticularDraftSession[]>(() => initialSessionData.sessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => initialSessionData.activeId);

  const initialDraft = useMemo(() => {
    if (editBillData) return null;
    return initialSessionData.sessions.find((s) => s.id === initialSessionData.activeId) || initialSessionData.sessions[0] || null;
  }, []);

  // 1. Customer Info Left Box State
  const [customerNo, setCustomerNo] = useState<string>(() => initialDraft?.customerNo || '');
  const [billDate, setBillDate] = useState<string>(() => initialDraft?.billDate || getInitialDateStr());
  const [billNo, setBillNo] = useState<string>(() => initialDraft?.billNo || '');
  const [rateType, setRateType] = useState<string>(() => initialDraft?.rateType || 'Befor Rate');
  const [customerGst, setCustomerGst] = useState<string>(() => initialDraft?.customerGst || '');

  // 2. Customer Middle Selection & Right New Customer Form
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOptionItem | null>(null);
  const [customerName, setCustomerName] = useState<string>(() => initialCustomerName || initialDraft?.customerName || '');
  const [customerMobile, setCustomerMobile] = useState<string>(() => initialDraft?.customerMobile || '');
  const [customerAddress, setCustomerAddress] = useState<string>(() => initialDraft?.customerAddress || '');
  const [companyName, setCompanyName] = useState<string>(() => initialDraft?.companyName || storeSettings.companyName || 'S.V.M Fireworks Agencies');

  // 3. Product Selection Bar State
  const [quickCode, setQuickCode] = useState<string>('');
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<ProductCatalogOption | null>(null);
  const [quickUnit, setQuickUnit] = useState<string>('1 Box');
  const [quickQty, setQuickQty] = useState<string>('1');
  const [productCatalogModalOpen, setProductCatalogModalOpen] = useState<boolean>(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState<string>('');

  const codeInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // 4. Products Table Rows (Starts clean with 1 empty editable row or restored rows)
  const [productRows, setProductRows] = useState<ProductRowItem[]>(() => {
    if (initialDraft?.productRows && initialDraft.productRows.length > 0) {
      return initialDraft.productRows;
    }
    return [{ id: '1', particular: '', pktUnit: '1 Box', rate: '0', quantity: '1', amount: '0' }];
  });

  // 5. Payment Info Right Box State
  const [discountPercent, setDiscountPercent] = useState<string>(() => initialDraft?.discountPercent || '0');
  const [discountRs, setDiscountRs] = useState<string>(() => initialDraft?.discountRs || '0');
  const [packingRs, setPackingRs] = useState<string>(() => initialDraft?.packingRs || '');
  const [packingPercent, setPackingPercent] = useState<string>(() => initialDraft?.packingPercent || '');
  const [remarks, setRemarks] = useState<string>(() => initialDraft?.remarks || '');
  const [paymentMode, setPaymentMode] = useState<string>(() => initialDraft?.paymentMode || 'Cash');

  // Session Helper: Apply session data to form inputs
  const applySessionToForm = (sess: ParticularDraftSession) => {
    setCustomerNo(sess.customerNo || '');
    setBillDate(sess.billDate || getInitialDateStr());
    setBillNo(sess.billNo || '');
    setRateType(sess.rateType || 'Befor Rate');
    setCustomerGst(sess.customerGst || '');
    setCustomerName(sess.customerName || '');
    setCustomerMobile(sess.customerMobile || '');
    setCustomerAddress(sess.customerAddress || '');
    setCompanyName(sess.companyName || storeSettings.companyName || 'Manjula Crackers');
    setSelectedCustomer(null);
    setProductRows(
      sess.productRows && sess.productRows.length > 0
        ? sess.productRows
        : [{ id: '1', particular: '', pktUnit: '1 Box', rate: '0', quantity: '1', amount: '0' }]
    );
    setDiscountPercent(sess.discountPercent || '0');
    setDiscountRs(sess.discountRs || '0');
    setPackingRs(sess.packingRs || '');
    setPackingPercent(sess.packingPercent || '');
    setRemarks(sess.remarks || '');
    setPaymentMode(sess.paymentMode || 'Cash');
  };

  // Real-time draft session autosave
  useEffect(() => {
    if (isEditMode || !activeSessionId) return;
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            customerNo,
            billDate,
            billNo,
            rateType,
            customerGst,
            customerName,
            customerMobile,
            customerAddress,
            companyName,
            productRows,
            discountPercent,
            discountRs,
            packingRs,
            packingPercent,
            remarks,
            paymentMode,
            lastUpdated: Date.now(),
          };
        }
        return s;
      });
      saveParticularSessions(mode, updated, activeSessionId);
      return updated;
    });
  }, [
    isEditMode,
    activeSessionId,
    mode,
    customerNo,
    billDate,
    billNo,
    rateType,
    customerGst,
    customerName,
    customerMobile,
    customerAddress,
    companyName,
    productRows,
    discountPercent,
    discountRs,
    packingRs,
    packingPercent,
    remarks,
    paymentMode,
  ]);

  // Create a brand new bill session (preserves existing bill sessions)
  const handleCreateNewSession = async () => {
    let nextNum = '1001';
    try {
      const res = await ParticularsApi.getNextBillNo(mode === 'QUOTATION' ? 'QUOTATION' : 'REGULAR', selectedYear);
      if (res?.nextBillNo) nextNum = res.nextBillNo;
    } catch {
      // fallback
    }

    const newIndex = sessions.length + 1;
    const newSession: ParticularDraftSession = {
      id: `session_${Date.now()}_${newIndex}`,
      title: `${mode === 'QUOTATION' ? 'Quotation' : 'Bill'} ${newIndex}`,
      mode,
      customerNo: '',
      billDate: getInitialDateStr(),
      billNo: nextNum,
      rateType: 'Befor Rate',
      customerGst: '',
      customerName: '',
      customerMobile: '',
      customerAddress: '',
      companyName: storeSettings.companyName || 'Manjula Crackers',
      productRows: [{ id: '1', particular: '', pktUnit: '1 Box', rate: '0', quantity: '1', amount: '0' }],
      discountPercent: '0',
      discountRs: '0',
      packingRs: '',
      packingPercent: '',
      remarks: '',
      paymentMode: 'Cash',
      selectedYear,
      lastUpdated: Date.now(),
    };

    const updated = [...sessions, newSession];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    saveParticularSessions(mode, updated, newSession.id);
    applySessionToForm(newSession);

    setSnackbarMessage(`New ${mode === 'QUOTATION' ? 'Quotation' : 'Bill'} session created. Previous draft is saved!`);
    setSnackbarOpen(true);
  };

  // Switch between open draft sessions
  const handleSwitchSession = (targetSessionId: string) => {
    if (targetSessionId === activeSessionId) return;

    // Save current active state before switching
    const updated = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          customerNo,
          billDate,
          billNo,
          rateType,
          customerGst,
          customerName,
          customerMobile,
          customerAddress,
          companyName,
          productRows,
          discountPercent,
          discountRs,
          packingRs,
          packingPercent,
          remarks,
          paymentMode,
          lastUpdated: Date.now(),
        };
      }
      return s;
    });

    const targetSession = updated.find((s) => s.id === targetSessionId);
    if (!targetSession) return;

    setSessions(updated);
    setActiveSessionId(targetSessionId);
    saveParticularSessions(mode, updated, targetSessionId);
    applySessionToForm(targetSession);
  };

  // Close an individual draft session
  const handleCloseSession = (targetSessionId: string) => {
    if (sessions.length <= 1) {
      if (window.confirm(`Clear current ${mode === 'QUOTATION' ? 'Quotation' : 'Bill'} draft?`)) {
        handleExitReset();
      }
      return;
    }

    const sess = sessions.find((s) => s.id === targetSessionId);
    const hasData = sess && sess.productRows.some((r) => r.particular.trim() !== '');
    if (hasData) {
      if (!window.confirm(`Close "${sess?.customerName || sess?.title}"? This draft tab will be removed.`)) {
        return;
      }
    }

    const remaining = sessions.filter((s) => s.id !== targetSessionId);
    let nextId = activeSessionId;
    if (targetSessionId === activeSessionId) {
      nextId = remaining[0].id;
      applySessionToForm(remaining[0]);
    }

    setSessions(remaining);
    setActiveSessionId(nextId);
    saveParticularSessions(mode, remaining, nextId);
  };

  // UI status
  const [savingBill, setSavingBill] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

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
        CustomersApi.getAll(targetYear).catch(() => []),
        CompaniesApi.getAll().catch(() => []),
        ProductsApi.getAll(targetYear).catch(() => []),
        PriceListsApi.getAll({ year: targetYear }).catch(() => []),
        ParticularsApi.getNextBillNo(mode === 'QUOTATION' ? 'QUOTATION' : 'REGULAR', targetYear).catch(() => ({ nextBillNo: '1001' })),
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
            const mrpVal = typeof p.mrp === 'number' ? p.mrp : parseFloat(p.mrp) || 0;
            const rateVal = typeof p.rate === 'number' ? p.rate : parseFloat(p.rate) || 0;
            const pType = p.productType || 'Retail';
            const slNumber = p.slNo !== undefined && p.slNo !== null ? String(p.slNo) : String(idx + 1);
            const skuCode = p.sku ? String(p.sku) : slNumber;
            prodMap.set(key.toLowerCase(), {
              id: p._id || p.id,
              sku: skuCode,
              slNo: slNumber,
              name: key,
              category: p.category || 'General',
              rate: rateVal,
              mrp: mrpVal,
              wholesaleRate: typeof p.wholesaleRate === 'number' ? p.wholesaleRate : (pType === 'Wholesale' ? rateVal : rateVal),
              retailRate: typeof p.retailRate === 'number' ? p.retailRate : (pType === 'Retail' ? (rateVal || mrpVal) : (mrpVal || rateVal)),
              productType: pType,
              unit: p.unit || '1 Box',
            });
          }
        });
      }

      if (Array.isArray(priceRes)) {
        priceRes.forEach((p: any, idx: number) => {
          const key = (p.itemName || '').trim();
          if (key && !prodMap.has(key.toLowerCase())) {
            const mrpVal = typeof p.mrp === 'number' ? p.mrp : parseFloat(p.mrp) || 0;
            const rateVal = typeof p.rate === 'number' ? p.rate : parseFloat(p.rate) || 0;
            const slNumber = p.slNo !== undefined && p.slNo !== null ? String(p.slNo) : (p.sNo !== undefined ? String(p.sNo) : String(idx + 1));
            const skuCode = p.sku ? String(p.sku) : (p.itemCode ? String(p.itemCode) : `PL-${100 + idx}`);
            prodMap.set(key.toLowerCase(), {
              id: p._id || p.id,
              sku: skuCode,
              slNo: slNumber,
              name: key,
              category: p.category || 'General',
              rate: rateVal,
              mrp: mrpVal,
              wholesaleRate: rateVal,
              retailRate: mrpVal > 0 ? mrpVal : rateVal,
              productType: 'Both',
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

  useEffect(() => {
    loadOptions(selectedYear);

    const handleGlobalYear = (e: any) => {
      if (e.detail?.year && e.detail.year !== selectedYear) {
        setSelectedYear(e.detail.year);
        setBillDate(getInitialDateStr());
        loadOptions(e.detail.year);
      }
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleGlobalYear);
    return () => {
      window.removeEventListener(YEAR_CHANGE_EVENT, handleGlobalYear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync sessions if mode changes (ESTIMATE <-> QUOTATION)
  useEffect(() => {
    if (!editBillData) {
      const data = getParticularSessions(mode);
      setSessions(data.sessions);
      setActiveSessionId(data.activeId);
      const activeSess = data.sessions.find((s) => s.id === data.activeId) || data.sessions[0];
      if (activeSess) {
        applySessionToForm(activeSess);
      }
    }
  }, [mode]);

  // Handle Edit Mode population
  useEffect(() => {
    if (editBillData && (editBillData._id || editBillData.id)) {
      setCustomerName(editBillData.customerName || '');
      setCustomerMobile(editBillData.customerPhone || '');
      setCustomerAddress(editBillData.customerAddress || '');
      setCustomerGst(editBillData.customerGst || '');
      setBillNo(String(editBillData.billNo || ''));
      setBillDate(editBillData.date || getInitialDateStr());
      if (editBillData.rateType) setRateType(editBillData.rateType);
      setDiscountRs(String(editBillData.discount ?? '0'));
      setPackingRs(String(editBillData.packing ?? ''));
      setCompanyName(editBillData.companyName || storeSettings.companyName || 'S.V.M Fireworks Agencies');
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

  // Duplicate for Multiple Customers State & Memo
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  const handleOpenDuplicateModal = () => {
    const validRows = productRows.filter((r) => r.particular.trim() !== '');
    if (validRows.length === 0) {
      setSnackbarMessage('Please add at least one product item before duplicating.');
      setSnackbarOpen(true);
      return;
    }
    setDuplicateModalOpen(true);
  };

  const currentTemplateBill = useMemo(() => {
    const validRows = productRows.filter((r) => r.particular.trim() !== '');
    return {
      billNo: billNo || '',
      date: billDate,
      rateType: rateType,
      customerName: customerName.trim(),
      customerPhone: customerMobile.trim(),
      customerAddress: customerAddress.trim(),
      customerGst: customerGst.trim(),
      companyName: companyName || storeSettings.companyName || 'Manjula Crackers',
      discount: String(discountAmount),
      packing: String(packingAmount),
      transport: '0',
      tax: '0',
      amount: subtotal.toFixed(2),
      total: netPayment.toFixed(2),
      netAmount: netPayment.toFixed(2),
      paymentMode: paymentMode || 'Cash',
      paymentStatus: paymentMode === 'Cash' || paymentMode === 'UPI' ? 'PAID' : 'UNPAID',
      paidAmount: paymentMode === 'Cash' || paymentMode === 'UPI' ? netPayment.toFixed(2) : '0.00',
      notes: remarks,
      billType: mode === 'QUOTATION' ? 'QUOTATION' : 'REGULAR',
      products: validRows.map((r) => ({
        particular: r.particular,
        quantity: r.quantity,
        rate: r.rate,
        pktUnit: r.pktUnit,
        amount: r.amount,
      })),
    };
  }, [
    billNo,
    billDate,
    rateType,
    customerName,
    customerMobile,
    customerAddress,
    customerGst,
    companyName,
    storeSettings.companyName,
    discountAmount,
    packingAmount,
    subtotal,
    netPayment,
    paymentMode,
    remarks,
    mode,
    productRows,
  ]);


  // Row Management
  const handleRowChange = (id: string, field: keyof ProductRowItem, val: string) => {
    setProductRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: val };

        if (field === 'particular') {
          const match =
            productOptions.find((p) => p.name.trim().toLowerCase() === val.trim().toLowerCase()) ||
            findProductByCode(val, productOptions);
          if (match) {
            updated.particular = match.name;
            const calculatedRate = getRateForType(match, rateType);
            updated.rate = String(calculatedRate);
            if (match.unit) updated.pktUnit = match.unit;
          }
        }

        const rawQty = field === 'quantity' ? (val === '0' ? '1' : val) : updated.quantity;
        const q = parseFloat(rawQty) || 1;
        const r = parseFloat(field === 'rate' ? val : updated.rate) || 0;
        updated.quantity = rawQty || '1';
        updated.amount = String(Math.round(q * r));
        return updated;
      })
    );
  };

  const handleDeleteRow = (id: string) => {
    setProductRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Add selected product from top product bar
  const handleAddProductFromBar = (prod: ProductCatalogOption | null, qtyVal: string = quickQty) => {
    if (!prod) return;
    const rateVal = getRateForType(prod, rateType);
    const q = parseFloat(qtyVal) || 1;
    const newRow: ProductRowItem = {
      id: String(Date.now()),
      particular: prod.name,
      pktUnit: prod.unit || quickUnit || '1 Box',
      rate: String(rateVal),
      quantity: String(q),
      amount: String(Math.round(q * rateVal)),
    };
    setProductRows((prev) => {
      if (prev.length === 1 && !prev[0].particular.trim() && (prev[0].amount === '0' || !prev[0].amount)) {
        return [newRow];
      }
      return [...prev, newRow];
    });
    setSelectedCatalogProduct(null);
    setQuickCode('');
    setQuickQty('1');
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 50);
  };

  // Code field auto-fill & Enter handler
  const handleQuickCodeChange = (val: string) => {
    setQuickCode(val);
    const match = findProductByCode(val, productOptions);
    if (match) {
      setSelectedCatalogProduct(match);
      if (match.unit) setQuickUnit(match.unit);
    } else {
      setSelectedCatalogProduct(null);
    }
  };

  const handleQuickCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const match = findProductByCode(quickCode, productOptions) || selectedCatalogProduct;
      if (match) {
        setSelectedCatalogProduct(match);
        if (match.unit) setQuickUnit(match.unit);
        // Move focus directly to Quantity field and select its value for rapid typing
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }
    }
  };

  const handleQuickQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const prod = selectedCatalogProduct || findProductByCode(quickCode, productOptions);
      if (prod) {
        handleAddProductFromBar(prod, quickQty);
      }
    }
  };

  // Execute Save Quotation / Bill
  const executeSaveBill = async () => {
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
        companyName: companyName || storeSettings.companyName || 'S.V.M Fireworks Agencies',
        billNo: billNo || '1001',
        date: billDate,
        rateType: rateType,
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
        billType: mode === 'QUOTATION' ? 'QUOTATION' : 'REGULAR',
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
        setSnackbarMessage(mode === 'QUOTATION' ? 'Quotation updated successfully!' : 'Estimate / Bill updated successfully!');
      } else {
        await ParticularsApi.create(payload);
        setSnackbarMessage(
          mode === 'QUOTATION'
            ? 'Quotation saved successfully! (Not added to sales)'
            : 'Estimate / Bill saved successfully! Added to Sales.'
        );
      }

      window.dispatchEvent(new Event('apsara_bill_saved'));
      setSnackbarOpen(true);

      // Refresh next bill number for fresh quotations
      if (!isEditMode) {
        ParticularsApi.getNextBillNo('REGULAR', selectedYear)
          .then((res) => {
            if (res && res.nextBillNo) setBillNo(res.nextBillNo);
          })
          .catch(() => { });
      }

      if (isEditMode && onEditSuccess) {
        onEditSuccess();
      }

      // Construct bill data and open PDF Preview & Print Modal immediately
      const savedBillData: BillPrintData = {
        billNo: billNo || '1001',
        date: billDate,
        rateType: rateType,
        customerName: customerName.trim() || 'Valued Customer',
        customerPhone: customerMobile.trim(),
        customerAddress: customerAddress.trim(),
        customerGst: customerGst.trim(),
        companyName: companyName || storeSettings.companyName || 'S.V.M Fireworks Agencies',
        companyAddress: storeSettings.address,
        companyCity: storeSettings.city,
        companyPincode: storeSettings.pincode,
        companyState: storeSettings.state,
        companyPhone: storeSettings.phone,
        companyWhatsapp: storeSettings.whatsapp,
        logoUrl: storeSettings.logoUrl,
        subtotal: subtotal,
        discount: discountAmount,
        packing: packingAmount,
        total: netPayment,
        invoiceTitle: mode === 'QUOTATION' ? 'QUOTATION' : 'ESTIMATE',
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
      setSnackbarMessage(err.message || `Failed to save ${mode === 'QUOTATION' ? 'Quotation' : 'Estimate Bill'}.`);
      setSnackbarOpen(true);
    } finally {
      setSavingBill(false);
    }
  };

  const handleConvertToEstimateDirectly = async () => {
    if (!customerName.trim()) {
      setSnackbarMessage('Please enter or select Customer Name first.');
      setSnackbarOpen(true);
      return;
    }
    const validRows = productRows.filter((r) => r.particular.trim() !== '');
    if (validRows.length === 0) {
      setSnackbarMessage('Please add at least one product item.');
      setSnackbarOpen(true);
      return;
    }

    if (!window.confirm('Convert this Quotation to an official Estimate Bill? It will be added to Sales Register and Account Ledger.')) return;

    setSavingBill(true);
    try {
      if (isEditMode && editBillData) {
        const id = editBillData._id || editBillData.id;
        const res = await ParticularsApi.convertToBill(id);
        const converted = res?.data || res;
        setSnackbarMessage(`Quotation converted to Estimate Bill #${converted.billNo || ''} successfully! Added to Sales.`);
        setSnackbarOpen(true);
        if (onEditSuccess) onEditSuccess();
        if (onConvertToEstimate) onConvertToEstimate(converted);
      } else {
        const payload = {
          customerName: customerName.trim(),
          customerPhone: customerMobile.trim(),
          customerAddress: customerAddress.trim(),
          customerGst: customerGst.trim(),
          companyName: companyName || storeSettings.companyName || 'Manjula Crackers',
          date: billDate,
          rateType: rateType,
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
          billType: 'REGULAR',
          products: validRows.map((r) => ({
            particular: r.particular,
            quantity: r.quantity,
            rate: r.rate,
            pktUnit: r.pktUnit,
            amount: r.amount,
          })),
        };
        const res = await ParticularsApi.create(payload);
        const created = res?.data || res;
        setSnackbarMessage(`Saved & converted to Estimate Bill #${created.billNo || ''} successfully! Added to Sales.`);
        setSnackbarOpen(true);
        if (onEditSuccess) onEditSuccess();
        if (onConvertToEstimate) onConvertToEstimate(created);
      }
    } catch (err: any) {
      console.error('Failed to convert quotation to bill:', err);
      setSnackbarMessage(err.message || 'Failed to convert to Estimate Bill.');
      setSnackbarOpen(true);
    } finally {
      setSavingBill(false);
    }
  };

  const handleSaveBill = async () => {
    const currentSystemYear = new Date().getFullYear();
    const currentSystemYearStr = currentSystemYear.toString();
    const selectedViewYear = getSelectedBillYear();

    if (Number(selectedYear) !== currentSystemYear || (!isEditMode && String(selectedViewYear) !== currentSystemYearStr)) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear || selectedViewYear),
        currentSystemYear: currentSystemYearStr,
        onProceed: () => executeSaveBill(),
      });
      return;
    }
    executeSaveBill();
  };

  // Direct Print / PDF Handler (Ensures bill is saved then previewed)
  const handlePrint = () => {
    const validRows = productRows.filter((r) => r.particular.trim() !== '');
    const billData: BillPrintData = {
      billNo: billNo || '1001',
      date: billDate,
      rateType: rateType,
      customerName: customerName || 'Valued Customer',
      customerPhone: customerMobile,
      customerAddress: customerAddress,
      customerGst: customerGst,
      companyName: companyName || storeSettings.companyName || 'S.V.M Fireworks Agencies',
      companyAddress: storeSettings.address,
      companyCity: storeSettings.city,
      companyPincode: storeSettings.pincode,
      companyState: storeSettings.state,
      companyPhone: storeSettings.phone,
      companyWhatsapp: storeSettings.whatsapp,
      logoUrl: storeSettings.logoUrl,
      subtotal: subtotal,
      discount: discountAmount,
      packing: packingAmount,
      total: netPayment,
      invoiceTitle: mode === 'QUOTATION' ? 'QUOTATION' : 'ESTIMATE',
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
            <HubRoundedIcon sx={{ fontSize: 18, color: mode === 'QUOTATION' ? '#D97706' : '#0284C7' }} />
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.01em',
              }}
            >
              {mode === 'QUOTATION' ? 'Customer Factory (Sample Quotation)' : 'Customer Factory (Estimate / Bill Entry)'}
            </Typography>
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: 600,
                color: mode === 'QUOTATION' ? '#92400E' : '#047857',
                bgcolor: mode === 'QUOTATION' ? '#FEF3C7' : '#ECFDF5',
                px: 1,
                py: 0.2,
                borderRadius: '3px',
                border: `1px solid ${mode === 'QUOTATION' ? '#FDE68A' : '#A7F3D0'}`,
              }}
            >
              {mode === 'QUOTATION' ? 'Sample Only - No Sales Impact' : 'Official Entry - Adds to Sales'}
            </Typography>
          </Box>
        </Box>

        {/* Inner Form Content */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
          {/* ========================================================= */}
          {/* BILLING SESSIONS / MULTI-BILL DRAFT TABS BAR */}
          {/* ========================================================= */}
          {!isEditMode && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                mb: 1.2,
                overflowX: 'auto',
                pb: 0.5,
                borderBottom: '1px solid #CBD5E1',
              }}
            >
              <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ReceiptLongRoundedIcon sx={{ fontSize: 16, color: '#1E40AF' }} />
                Active Sessions:
              </Typography>

              {sessions.map((sess, idx) => {
                const isActive = sess.id === activeSessionId;
                const rowCount = Array.isArray(sess.productRows) ? sess.productRows.filter(r => r.particular && r.particular.trim()).length : 0;
                const displayName = sess.customerName && sess.customerName.trim() ? sess.customerName.trim() : `${mode === 'QUOTATION' ? 'Quotation' : 'Bill'} ${idx + 1}`;

                return (
                  <Box
                    key={sess.id}
                    onClick={() => handleSwitchSession(sess.id)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.8,
                      px: 1.2,
                      py: 0.4,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      bgcolor: isActive ? '#1E40AF' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#334155',
                      border: `1px solid ${isActive ? '#1E40AF' : '#CBD5E1'}`,
                      fontSize: '11.5px',
                      fontWeight: isActive ? 700 : 600,
                      whiteSpace: 'nowrap',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: isActive ? '#1E3A8A' : '#F1F5F9',
                      },
                    }}
                  >
                    <span>{displayName}</span>
                    {rowCount > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '10px',
                          backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                          color: isActive ? '#FFFFFF' : '#0F172A',
                          fontWeight: 700,
                        }}
                      >
                        {rowCount} {rowCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                    {sessions.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseSession(sess.id);
                        }}
                        style={{
                          cursor: 'pointer',
                          opacity: 0.8,
                          fontWeight: 800,
                          padding: '0 2px',
                          marginLeft: '2px',
                        }}
                        title="Close session"
                      >
                        ✕
                      </span>
                    )}
                  </Box>
                );
              })}

              {/* + New Bill Session Button */}
              <Button
                size="small"
                onClick={handleCreateNewSession}
                startIcon={<AddRoundedIcon sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: '#ECFDF5',
                  border: '1px dashed #059669',
                  color: '#047857',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'none',
                  height: '26px',
                  px: 1.2,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#D1FAE5' },
                }}
              >
                + New {mode === 'QUOTATION' ? 'Quotation' : 'Bill'} Session
              </Button>

              {/* Duplicate for Multiple Customers Quick Button in Session Bar */}
              <Button
                size="small"
                onClick={handleOpenDuplicateModal}
                startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 13 }} />}
                sx={{
                  bgcolor: '#EFF6FF',
                  border: '1px solid #93C5FD',
                  color: '#1E40AF',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'none',
                  height: '26px',
                  px: 1.2,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#DBEAFE' },
                }}
              >
                Duplicate to Customers
              </Button>
            </Box>
          )}

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
              ref={codeInputRef}
              type="text"
              value={quickCode}
              onChange={(e) => handleQuickCodeChange(e.target.value)}
              onKeyDown={handleQuickCodeKeyDown}
              placeholder="Code / No"
              className="erp-input"
              style={{ width: '85px', textAlign: 'center', fontWeight: 700, color: '#1E40AF' }}
              title="Enter S.No / Code to auto-fill product (Press Enter to jump to Quantity)"
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
              getOptionLabel={(opt) => `${opt.slNo ? `[#${opt.slNo}] ` : opt.sku ? `[${opt.sku}] ` : ''}${opt.name} - ₹${getRateForType(opt, rateType)}`}
              filterOptions={(options, state) => {
                const input = state.inputValue.toLowerCase().trim();
                if (!input) return options;
                const digits = input.replace(/\D/g, '');
                return options.filter((opt) => {
                  const matchName = opt.name.toLowerCase().includes(input);
                  const matchSku = opt.sku ? String(opt.sku).toLowerCase().includes(input) : false;
                  const matchSlNo = opt.slNo !== undefined ? String(opt.slNo).includes(digits || input) : false;
                  return matchName || matchSku || matchSlNo;
                });
              }}
              value={selectedCatalogProduct}
              onChange={(_, opt) => {
                setSelectedCatalogProduct(opt);
                if (opt) {
                  if (opt.slNo) setQuickCode(String(opt.slNo));
                  else if (opt.sku) setQuickCode(String(opt.sku));
                  if (opt.unit) setQuickUnit(opt.unit);
                  setTimeout(() => {
                    qtyInputRef.current?.focus();
                    qtyInputRef.current?.select();
                  }, 50);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or Search Product (Name / S.No)..."
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

            {/* Quantity Field */}
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', ml: 1 }}>
              Qty
            </Typography>
            <input
              ref={qtyInputRef}
              type="number"
              min="1"
              value={quickQty}
              onChange={(e) => setQuickQty(e.target.value)}
              onKeyDown={handleQuickQtyKeyDown}
              placeholder="Qty"
              className="erp-input"
              style={{
                width: '75px',
                textAlign: 'center',
                fontWeight: 700,
                color: '#0F172A',
                border: '1.5px solid #1E40AF',
                backgroundColor: '#EFF6FF',
              }}
              title="Enter quantity and press Enter to add product"
            />

            {/* Add / Enter Action Button */}
            <Button
              onClick={() => {
                const prod = selectedCatalogProduct || findProductByCode(quickCode, productOptions);
                if (prod) {
                  handleAddProductFromBar(prod, quickQty);
                }
              }}
              disabled={!selectedCatalogProduct && !findProductByCode(quickCode, productOptions)}
              size="small"
              sx={{
                height: '26px',
                bgcolor: '#1E40AF',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 700,
                px: 1.5,
                textTransform: 'none',
                '&:hover': { bgcolor: '#1E3A8A' },
                '&:disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' },
              }}
            >
              Add Product ↵
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
                      <TableCell sx={{ width: '90px', fontWeight: 700, bgcolor: '#DCE7F5' }}>
                        Content
                      </TableCell>
                      <TableCell
                        sx={{
                          width: '125px',
                          minWidth: '120px',
                          whiteSpace: 'nowrap',
                          textAlign: 'right',
                          fontWeight: 700,
                          bgcolor: '#DCE7F5',
                          color: '#1E40AF',
                        }}
                      >
                        Rate (Rs.)
                      </TableCell>
                      <TableCell sx={{ width: '70px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5' }}>
                        Qty
                      </TableCell>
                      <TableCell sx={{ width: '95px', textAlign: 'right', fontWeight: 700, bgcolor: '#DCE7F5' }}>
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
                            min="1"
                            value={row.quantity === '0' || !row.quantity ? '1' : row.quantity}
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

              {/* Action Buttons: Neatly aligned in 2 rows */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.8,
                  mt: 1.5,
                  pt: 1.2,
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                {/* Primary Action Buttons Row: Save, Print, Exit */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 0.8 }}>
                  <Button
                    onClick={handleSaveBill}
                    disabled={savingBill}
                    variant="contained"
                    sx={{
                      bgcolor: '#741748',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '12px',
                      py: 0.7,
                      borderRadius: '3px',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#580e34' },
                    }}
                  >
                    {savingBill ? <CircularProgress size={16} color="inherit" /> : (mode === 'QUOTATION' ? 'Save Quotation' : 'Save Bill')}
                  </Button>

                  <Button
                    onClick={handlePrint}
                    variant="outlined"
                    startIcon={<PrintOutlinedIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      bgcolor: '#E5ECF4',
                      borderColor: '#94A3B8',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '12px',
                      py: 0.7,
                      borderRadius: '3px',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: '#D9E4F2' },
                    }}
                  >
                    Print
                  </Button>

                  <Button
                    onClick={handleExitReset}
                    variant="outlined"
                    sx={{
                      bgcolor: '#F1F5F9',
                      borderColor: '#CBD5E1',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '12px',
                      py: 0.7,
                      borderRadius: '3px',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: '#E2E8F0' },
                    }}
                  >
                    Exit
                  </Button>
                </Box>

                {/* Secondary Actions: Convert to Estimate (Quotation Mode) & Duplicate to Customers */}
                {mode === 'QUOTATION' && (
                  <Button
                    onClick={handleConvertToEstimateDirectly}
                    disabled={savingBill}
                    variant="contained"
                    fullWidth
                    startIcon={<span style={{ fontSize: '13px' }}>⚡</span>}
                    sx={{
                      bgcolor: '#059669',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '12px',
                      py: 0.65,
                      borderRadius: '3px',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#047857' },
                    }}
                  >
                    Convert to Estimate / Bill
                  </Button>
                )}

                <Button
                  onClick={handleOpenDuplicateModal}
                  variant="contained"
                  fullWidth
                  startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: '#1E40AF',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '12px',
                    py: 0.65,
                    borderRadius: '3px',
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#1D4ED8' },
                  }}
                >
                  Duplicate to Customers
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
                  <TableCell sx={{ bgcolor: '#DCE7F5', fontWeight: 700, textAlign: 'right', color: '#1E40AF', whiteSpace: 'nowrap', minWidth: '120px' }}>
                    Rate (Rs.)
                  </TableCell>
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
                    <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, textAlign: 'right', color: '#1E40AF' }}>
                      ₹ {getRateForType(prod, rateType)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          setSelectedCatalogProduct(prod);
                          if (prod.slNo) setQuickCode(String(prod.slNo));
                          else if (prod.sku) setQuickCode(String(prod.sku));
                          if (prod.unit) setQuickUnit(prod.unit);
                          setProductCatalogModalOpen(false);
                          setTimeout(() => {
                            qtyInputRef.current?.focus();
                            qtyInputRef.current?.select();
                          }, 100);
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

      {/* ========================================================= */}
      {/* QUOTATION / BILL PRINT PREVIEW MODAL */}
      {/* ========================================================= */}
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

      {/* Duplicate Bill to Multiple Customers Modal */}
      {duplicateModalOpen && (
        <DuplicateBillModal
          open={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          templateBill={currentTemplateBill}
          mode={mode}
          selectedYear={selectedYear}
          onSuccess={(createdBills) => {
            setSnackbarMessage(`Successfully duplicated bill to ${createdBills.length} customers!`);
            setSnackbarOpen(true);
            if (onEditSuccess) onEditSuccess();
          }}
        />
      )}

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
