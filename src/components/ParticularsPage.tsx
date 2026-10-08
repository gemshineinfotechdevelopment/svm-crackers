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
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RotateLeftRoundedIcon from '@mui/icons-material/RotateLeftRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
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
import { printBillDirectly } from '../utils/printUtils';
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
  name: string;
  mobile?: string;
  address?: string;
  gst?: string;
}

interface ProductCatalogOption {
  id: string;
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

const DRAFT_BILL_STORAGE_KEY = 'apsara_draft_bill';

interface DraftBillState {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  billNo?: string;
  billDate?: string;
  discount?: string;
  transport?: string;
  packing?: string;
  tax?: string;
  productRows?: ProductRowItem[];
}

const getSavedDraft = (): DraftBillState => {
  try {
    const raw = localStorage.getItem(DRAFT_BILL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load draft bill from localStorage', e);
  }
  return {};
};

export const ParticularsPage: FC<ParticularsPageProps> = ({ initialCustomerName, editBillData, onEditSuccess }) => {
  const [storeSettings, setStoreSettings] = useState(() => getStoredSettings());
  const draft = useMemo(() => getSavedDraft(), []);

  // Dropdown options
  const [customerOptions, setCustomerOptions] = useState<CustomerOptionItem[]>([]);
  const [, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [productOptions, setProductOptions] = useState<ProductCatalogOption[]>([]);

  // Bill Form State (Restores from Draft if page was refreshed)
  const [customerName, setCustomerName] = useState<string>(() => {
    return initialCustomerName || draft.customerName || '';
  });
  const [customerPhone, setCustomerPhone] = useState<string>(() => draft.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState<string>(() => draft.customerAddress || '');
  const [company, setCompany] = useState<string>(() => {
    return storeSettings.companyName || 'Apsara Crackers';
  });
  const [billNo, setBillNo] = useState<string>(() => draft.billNo || '');
  const [billDate, setBillDate] = useState<string>(() => {
    if (draft.billDate) return draft.billDate;
    const today = new Date();
    return today.toLocaleDateString('en-GB').replace(/\//g, '-');
  });
  const [discount, setDiscount] = useState<string>(() => draft.discount ?? '0');
  const [transport, setTransport] = useState<string>(() => draft.transport ?? '0');
  const [packing, setPacking] = useState<string>(() => draft.packing ?? '0');
  const [tax, setTax] = useState<string>(() => draft.tax ?? '0');

  // Product Entry Form State
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [rate, setRate] = useState<string>('0');
  const [unit, setUnit] = useState<string>('Box');
  const [productRows, setProductRows] = useState<ProductRowItem[]>(() => draft.productRows || []);
  const [savingBill, setSavingBill] = useState<boolean>(false);

  // Track whether we are in edit mode
  const isEditMode = Boolean(editBillData && (editBillData._id || editBillData.id));

  // When editBillData prop changes, load it into the form
  useEffect(() => {
    if (editBillData && (editBillData._id || editBillData.id)) {
      setCustomerName(editBillData.customerName || '');
      setCustomerPhone(editBillData.customerPhone || '');
      setCustomerAddress(editBillData.customerAddress || '');
      setCompany(editBillData.companyName || storeSettings.companyName || 'Apsara Crackers');
      setBillNo(String(editBillData.billNo || ''));
      setBillDate(editBillData.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'));
      setDiscount(String(editBillData.discount ?? '0'));
      setTransport(String(editBillData.transport ?? '0'));
      setPacking(String(editBillData.packing ?? '0'));
      setTax(String(editBillData.tax ?? '0'));
      const rows: ProductRowItem[] = Array.isArray(editBillData.products) && editBillData.products.length > 0
        ? editBillData.products.map((p: any, i: number) => ({
            id: `edit-row-${i}-${Date.now()}`,
            particular: p.particular || p.name || '',
            quantity: String(p.quantity ?? '1'),
            rate: String(p.rate ?? '0'),
            pktUnit: p.pktUnit || 'Box',
            amount: String(p.amount ?? ((parseFloat(String(p.quantity)) || 0) * (parseFloat(String(p.rate)) || 0)).toFixed(2)),
          }))
        : [];
      setProductRows(rows);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBillData]);

  // Print Preview Modal State
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

  // Auto-persist draft bill to localStorage
  useEffect(() => {
    const draftPayload: DraftBillState = {
      customerName,
      customerPhone,
      customerAddress,
      billNo,
      billDate,
      discount,
      transport,
      packing,
      tax,
      productRows,
    };
    try {
      localStorage.setItem(DRAFT_BILL_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch (e) {
      console.warn('Failed to auto-save draft bill to localStorage', e);
    }
  }, [customerName, customerPhone, customerAddress, billNo, billDate, discount, transport, packing, tax, productRows]);

  // Listen for settings update (when user updates company name/logo/tax settings in Settings)
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const updated = getStoredSettings();
      setStoreSettings(updated);
      setCompany(updated.companyName || 'Apsara Crackers');
      if (updated.enableTax && (!tax || tax === '0')) {
        setTax(updated.defaultTaxRate || '0');
      } else if (!updated.enableTax) {
        setTax('0');
      }
    };
    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
    };
  }, [tax]);

  // Load Dropdown Options (Customers, Companies, Unified Products & Price List)
  const loadOptions = async () => {
    try {
      const [custRes, compRes, prodRes, priceRes] = await Promise.all([
        CustomersApi.getAll().catch(() => []),
        CompaniesApi.getAll().catch(() => []),
        ProductsApi.getAll().catch(() => []),
        PriceListsApi.getAll().catch(() => []),
      ]);

      if (Array.isArray(custRes) && custRes.length > 0) {
        const mapped: CustomerOptionItem[] = custRes.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          mobile: c.mobile && c.mobile !== 'N/A' && c.mobile !== '-' ? c.mobile : '',
          address: c.address && c.address !== 'N/A' && c.address !== '-' ? c.address : '',
          gst: c.gst && c.gst !== 'N/A' && c.gst !== '-' ? c.gst : '',
        }));
        setCustomerOptions(mapped);
      }

      if (Array.isArray(compRes) && compRes.length > 0) {
        const mapped = compRes.map((c: any) => ({ id: c._id || c.id, name: c.name }));
        setCompanyOptions(mapped);
        if (mapped.length > 0 && (!company || company === 'General')) {
          setCompany(storeSettings.companyName || mapped[0].name);
        }
      }

      // Merge Products & Price List
      const prodMap = new Map<string, ProductCatalogOption>();

      if (Array.isArray(prodRes)) {
        prodRes.forEach((p: any) => {
          const key = (p.name || '').trim();
          if (key) {
            prodMap.set(key.toLowerCase(), {
              id: p._id || p.id,
              name: key,
              category: p.category || 'General',
              rate: p.rate || 0,
              mrp: p.mrp || 0,
              unit: p.unit || 'Box',
            });
          }
        });
      }

      if (Array.isArray(priceRes)) {
        priceRes.forEach((item: any) => {
          const key = (item.itemName || '').trim();
          if (key) {
            const existing = prodMap.get(key.toLowerCase());
            prodMap.set(key.toLowerCase(), {
              id: item._id || item.id || existing?.id || key,
              name: key,
              category: item.category || existing?.category || 'General',
              rate: item.rate !== undefined && item.rate > 0 ? item.rate : (existing?.rate || 0),
              mrp: item.mrp !== undefined && item.mrp > 0 ? item.mrp : (existing?.mrp || 0),
              unit: item.unit || existing?.unit || 'Box',
            });
          }
        });
      }

      const mergedList = Array.from(prodMap.values());
      setProductOptions(mergedList);
    } catch (err) {
      console.error('Failed to load billing options:', err);
    }
  };

  // Fetch Next Bill Number
  const fetchNextBillNo = async () => {
    try {
      const res = await ParticularsApi.getNextBillNo('REGULAR');
      if (res?.nextBillNo) {
        setBillNo(res.nextBillNo);
      } else {
        setBillNo(`INV-${Date.now().toString().slice(-4)}`);
      }
    } catch {
      setBillNo(`INV-${Date.now().toString().slice(-4)}`);
    }
  };

  // Always keep date current today
  const refreshDate = () => {
    const today = new Date();
    setBillDate(today.toLocaleDateString('en-GB').replace(/\//g, '-'));
  };

  useEffect(() => {
    loadOptions();
    fetchNextBillNo();
    refreshDate();
  }, []);

  // Update customer name, phone, address if prop changes
  useEffect(() => {
    if (initialCustomerName) {
      setCustomerName(initialCustomerName);
      const matched = customerOptions.find(
        (c) => c.name.toLowerCase() === initialCustomerName.toLowerCase().trim()
      );
      if (matched) {
        if (matched.mobile) setCustomerPhone(matched.mobile);
        if (matched.address) setCustomerAddress(matched.address);
      }
    }
  }, [initialCustomerName, customerOptions]);

  // Add Product Item to Bill Row
  const handleAddProductItem = () => {
    if (!selectedProduct.trim()) {
      alert('Please select or enter a product name');
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
            const updatedQty = (parseFloat(row.quantity) || 0) + qNum;
            const updatedRate = parseFloat(row.rate) || rNum;
            const updatedAmt = (updatedQty * updatedRate).toFixed(2);
            return {
              ...row,
              quantity: String(updatedQty),
              rate: String(updatedRate),
              amount: updatedAmt,
            };
          }
          return row;
        })
      );
    } else {
      const amt = (qNum * rNum).toFixed(2);
      const newRow: ProductRowItem = {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        particular: selectedProduct.trim(),
        quantity: String(qNum),
        rate: String(rNum),
        pktUnit: unit || 'Box',
        amount: amt,
      };
      setProductRows((prev) => [...prev, newRow]);
    }

    // Clear all product entry fields completely
    setSelectedProduct('');
    setRate('0');
    setQuantity('1');
    setUnit('Box');
  };

  // Change quantity directly in table row
  const handleQuantityChange = (id: string, newQty: string) => {
    setProductRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const qNum = parseFloat(newQty) || 0;
          const rNum = parseFloat(r.rate) || 0;
          return {
            ...r,
            quantity: newQty,
            amount: (qNum * rNum).toFixed(2),
          };
        }
        return r;
      })
    );
  };

  // Change rate directly in table row
  const handleRateChange = (id: string, newRate: string) => {
    setProductRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const qNum = parseFloat(r.quantity) || 0;
          const rNum = parseFloat(newRate) || 0;
          return {
            ...r,
            rate: newRate,
            amount: (qNum * rNum).toFixed(2),
          };
        }
        return r;
      })
    );
  };

  // Delete product row from current bill
  const handleDeleteRow = (id: string) => {
    setProductRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Bill Financial Totals Calculation
  const subtotal = useMemo(() => {
    return productRows.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);
  }, [productRows]);

  const discountAmount = useMemo(() => {
    const rawDisc = parseFloat(discount) || 0;
    if (rawDisc <= 0) return 0;
    if (rawDisc <= 100) {
      return (subtotal * rawDisc) / 100;
    }
    return rawDisc;
  }, [subtotal, discount]);

  const totalCases = useMemo(() => {
    return productRows.reduce((acc, row) => acc + (parseFloat(row.quantity) || 0), 0);
  }, [productRows]);

  const grandTotal = useMemo(() => {
    const transportAmt = parseFloat(transport) || 0;
    const packingAmt = parseFloat(packing) || 0;
    const isTaxEnabled = Boolean(storeSettings.enableTax);
    const taxPercent = isTaxEnabled ? (parseFloat(tax) || 0) : 0;

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const withAdditions = afterDiscount + transportAmt + packingAmt;
    const taxAmt = taxPercent > 0 ? (withAdditions * taxPercent) / 100 : 0;
    return withAdditions + taxAmt;
  }, [subtotal, discountAmount, transport, packing, tax, storeSettings.enableTax]);

  // Save Bill to DB
  const handleSaveBill = async (actionType: 'save' | 'print' | 'share' = 'save') => {
    if (!isEditMode) {
      const currentSystemYear = new Date().getFullYear().toString();
      const selectedViewYear = getSelectedBillYear();
      if (selectedViewYear !== currentSystemYear) {
        triggerYearRestrictionDialog({ selectedYear: selectedViewYear, currentSystemYear });
        return;
      }
    }

    if (!customerName.trim()) {
      alert('Please select or enter Customer Name');
      return;
    }
    if (productRows.length === 0) {
      alert('Please add at least one product item to the bill');
      return;
    }

    try {
      setSavingBill(true);
      const isTaxEnabled = Boolean(storeSettings.enableTax);
      const payload = {
        billNo: billNo.trim() || `INV-${Date.now().toString().slice(-4)}`,
        date: billDate,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        companyName: company || storeSettings.companyName || 'General',
        transport: transport || '0',
        caseCount: String(totalCases),
        discount: discount || '0',
        packing: packing || '0',
        tax: isTaxEnabled ? (tax || '0') : '0',
        amount: String(subtotal.toFixed(2)),
        total: String(grandTotal.toFixed(2)),
        billType: 'REGULAR',
        products: productRows.map((r) => ({
          particular: r.particular,
          quantity: r.quantity,
          rate: r.rate,
          pktUnit: r.pktUnit,
          amount: r.amount,
        })),
      };

      if (isEditMode) {
        const billId = editBillData._id || editBillData.id;
        await ParticularsApi.update(billId, payload);
      } else {
        await ParticularsApi.create(payload);
      }

      if (actionType === 'print' || actionType === 'share') {
        const matchingCustomer = customerOptions.find((c) => c.name.toLowerCase() === payload.customerName.toLowerCase());
        const printData: BillPrintData = {
          billNo: payload.billNo,
          date: payload.date,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          customerAddress: payload.customerAddress,
          customerGst: matchingCustomer?.gst,
          customerPan: matchingCustomer?.gst,
          companyName: payload.companyName,
          transport: payload.transport,
          caseCount: payload.caseCount,
          discount: payload.discount,
          packing: payload.packing,
          tax: payload.tax,
          amount: payload.amount,
          total: payload.total,
          products: payload.products,
          dispatchFrom: 'Sivakasi',
          dispatchTo: payload.customerAddress || '',
        };
        if (actionType === 'print') {
          printBillDirectly(printData);
        } else {
          setSelectedBillForPrint(printData);
          setPrintModalOpen(true);
        }
      }

      // Reset form after save/update
      if (isEditMode) {
        // After update, notify parent to go back & refresh
        if (onEditSuccess) onEditSuccess();
        if (actionType === 'save') alert(`Bill #${payload.billNo} updated successfully!`);
      } else {
        // Reset Bill Form & Reload Recent Bills
        setProductRows([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setDiscount('0');
        setTransport('0');
        setPacking('0');
        setTax(storeSettings.enableTax ? (storeSettings.defaultTaxRate || '0') : '0');
        localStorage.removeItem(DRAFT_BILL_STORAGE_KEY);
        localStorage.removeItem('apsara_active_customer');
        ['varun_draft_bill', 'dheeksha_draft_bill', 'varun_active_customer', 'dheeksha_active_customer'].forEach(k => localStorage.removeItem(k));
        fetchNextBillNo();
        refreshDate();
        loadOptions();
        if (actionType === 'save') alert(`Bill #${payload.billNo} saved successfully!`);
      }
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      alert(err.message || 'Error saving bill');
    } finally {
      setSavingBill(false);
    }
  };

  // Clear Draft Bill Form
  const handleClearDraft = () => {
    if (productRows.length > 0 || customerName.trim() !== '') {
      if (!window.confirm('Are you sure you want to clear this draft bill?')) return;
    }
    setProductRows([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setDiscount('0');
    setTransport('0');
    setPacking('0');
    setTax(storeSettings.enableTax ? (storeSettings.defaultTaxRate || '0') : '0');
    localStorage.removeItem(DRAFT_BILL_STORAGE_KEY);
    localStorage.removeItem('apsara_active_customer');
    ['varun_draft_bill', 'dheeksha_draft_bill', 'varun_active_customer', 'dheeksha_active_customer'].forEach(k => localStorage.removeItem(k));
    fetchNextBillNo();
    refreshDate();
  };

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.5, md: 3 },
        boxSizing: 'border-box',
      }}
    >
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '24px', sm: '28px', md: '30px' },
              fontWeight: 800,
              color: '#B91C1C',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            {isEditMode ? `Edit Bill #${billNo}` : 'Create Customer Bill'}
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: '#64748B', mt: 0.5, fontWeight: 600 }}>
            {isEditMode
              ? 'Modify invoice details, update line items, quantities and charges, then save.'
              : 'Generate standard invoice, itemize goods, apply tax/discounts, and print bills.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearDraft}
            startIcon={<RotateLeftRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{
              color: '#64748B',
              borderColor: '#E2E8F0',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '8px',
              px: 2,
              height: '38px',
              '&:hover': {
                borderColor: '#DC2626',
                color: '#DC2626',
                backgroundColor: '#FEF2F2',
              },
            }}
          >
            Clear Draft
          </Button>
        </Box>
      </Box>

      {/* Main Two-Column Grid: Create Bill Form + Items Table */}
      <Grid container spacing={2.5}>
        {/* Left Column: Customer & Invoice Details */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#B91C1C', mb: 2 }}>
              1. Invoice Information
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Customer Selector */}
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#64748B', mb: 0.6 }}>
                  Customer Name *
                </Typography>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={customerOptions.map((c) => c.name)}
                  value={customerName || ''}
                  onChange={(_, val) => {
                    const newName = val || '';
                    setCustomerName(newName);
                    const matched = customerOptions.find(
                      (c) => c.name.toLowerCase() === newName.trim().toLowerCase()
                    );
                    if (matched) {
                      setCustomerPhone(matched.mobile || '');
                      setCustomerAddress(matched.address || '');
                    }
                  }}
                  onInputChange={(_, val, reason) => {
                    if (reason === 'input') {
                      setCustomerName(val);
                      const matched = customerOptions.find(
                        (c) => c.name.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (matched) {
                        setCustomerPhone(matched.mobile || '');
                        setCustomerAddress(matched.address || '');
                      }
                    } else if (reason === 'clear') {
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerAddress('');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select or enter customer name..."
                      sx={{
                        '& .MuiInputBase-input': { fontSize: '13.5px', fontWeight: 600 },
                      }}
                    />
                  )}
                />
              </Box>

              {/* Optional Customer Phone & Address */}
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B', mb: 0.6 }}>
                    Phone (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Enter phone..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B', mb: 0.6 }}>
                    Address (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Enter address..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 },
                    }}
                  />
                </Grid>
              </Grid>

              {/* Bill No & Date (Auto-generated & Non-editable / Read-only) */}
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
                      Bill / Inv No
                    </Typography>
                    <Tooltip title="Auto Generated (Protected)" arrow>
                      <LockOutlinedIcon sx={{ fontSize: 13, color: '#9CA3AF' }} />
                    </Tooltip>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    value={billNo}
                    disabled
                    sx={{
                      backgroundColor: '#FEF2F2',
                      borderRadius: '6px',
                      '& .MuiInputBase-input': {
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: '#B91C1C !important',
                        WebkitTextFillColor: '#B91C1C !important',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#FECACA !important',
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
                      Bill Date
                    </Typography>
                    <Tooltip title="Auto Set to Today" arrow>
                      <LockOutlinedIcon sx={{ fontSize: 13, color: '#9CA3AF' }} />
                    </Tooltip>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    value={billDate}
                    disabled
                    sx={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      '& .MuiInputBase-input': {
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#475569 !important',
                        WebkitTextFillColor: '#475569 !important',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#E2E8F0 !important',
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 0.5, borderColor: '#F1F5F9' }} />

              {/* Additional Adjustments: Discount, Transport, Packing, (Tax only if enabled) */}
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                Adjustments & Charges
              </Typography>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: storeSettings.enableTax ? 6 : 4 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', mb: 0.4 }}>
                    Discount (% or ₹)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    sx={{
                      '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: storeSettings.enableTax ? 6 : 4 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', mb: 0.4 }}>
                    Transport (₹)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    sx={{
                      '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: storeSettings.enableTax ? 6 : 4 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', mb: 0.4 }}>
                    Packing (₹)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={packing}
                    onChange={(e) => setPacking(e.target.value)}
                    sx={{
                      '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 },
                    }}
                  />
                </Grid>

                {storeSettings.enableTax && (
                  <Grid size={{ xs: 6 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', mb: 0.4 }}>
                      Tax / GST (%)
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      placeholder="e.g. 18"
                      sx={{
                        '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 },
                      }}
                    />
                  </Grid>
                )}
              </Grid>

              {/* Summary Total Card with Complete Breakdown */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  mt: 1,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                  <Typography sx={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Subtotal (Items):</Typography>
                  <Typography sx={{ fontSize: '13px', color: '#1F1714', fontWeight: 700 }}>
                    ₹{subtotal.toFixed(2)}
                  </Typography>
                </Box>

                {discountAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                    <Typography sx={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>Discount:</Typography>
                    <Typography sx={{ fontSize: '13px', color: '#059669', fontWeight: 700 }}>
                      -₹{discountAmount.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {parseFloat(transport) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                    <Typography sx={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Transport Charges:</Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#1F1714', fontWeight: 700 }}>
                      +₹{parseFloat(transport).toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {parseFloat(packing) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                    <Typography sx={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Packing Charges:</Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#1F1714', fontWeight: 700 }}>
                      +₹{parseFloat(packing).toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {storeSettings.enableTax && parseFloat(tax) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                    <Typography sx={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>GST / Tax ({tax}%):</Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#1F1714', fontWeight: 700 }}>
                      +₹{(((Math.max(0, subtotal - discountAmount) + parseFloat(transport || '0') + parseFloat(packing || '0')) * parseFloat(tax)) / 100).toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {totalCases > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                    <Typography sx={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>Total Qty / Cases:</Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#334155', fontWeight: 700 }}>
                      {totalCases}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 1, borderColor: '#E2E8F0' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#991B1B' }}>
                    Grand Total:
                  </Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 900, color: '#B91C1C' }}>
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>

              {/* Save & Print Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => handleSaveBill('save')}
                    disabled={savingBill || productRows.length === 0}
                    sx={{
                      borderColor: '#F59E0B',
                      color: '#334155',
                      fontWeight: 700,
                      textTransform: 'none',
                      py: 1,
                      borderRadius: '8px',
                      '&:hover': { borderColor: '#B45309', backgroundColor: '#F8FAFC' },
                    }}
                  >
                    {isEditMode ? 'Update Bill' : 'Save Bill'}
                  </Button>

                  <Button
                    fullWidth
                    variant="contained"
                    disableElevation
                    onClick={() => handleSaveBill('print')}
                    disabled={savingBill || productRows.length === 0}
                    startIcon={savingBill ? <CircularProgress size={16} color="inherit" /> : <PrintOutlinedIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      textTransform: 'none',
                      py: 1,
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                      '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
                    }}
                  >
                    {isEditMode ? 'Update & Print' : 'Save & Print'}
                  </Button>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  disableElevation
                  onClick={() => handleSaveBill('share')}
                  disabled={savingBill || productRows.length === 0}
                  startIcon={savingBill ? <CircularProgress size={16} color="inherit" /> : <WhatsAppIcon />}
                  sx={{
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    textTransform: 'none',
                    py: 1,
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                    '&:hover': { backgroundColor: '#15803D' },
                  }}
                >
                  {isEditMode ? 'Update & Share (WhatsApp)' : 'Save & Share (WhatsApp PDF)'}
                </Button>

                {(productRows.length > 0 || customerName.trim() !== '') && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={handleClearDraft}
                    startIcon={<ClearRoundedIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      color: '#991B1B',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      py: 0.4,
                      '&:hover': { backgroundColor: '#FEF2F2' },
                    }}
                  >
                    Clear Current Draft Form
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column: Product Selector & Current Bill Table */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              mb: 3,
            }}
          >
            {/* Top Product Entry Bar */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                borderBottom: '2px solid #F59E0B',
                p: 2,
                px: { xs: 2, sm: 2.5 },
                color: '#FFFFFF',
              }}
            >
              <Typography sx={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em', mb: 1.5 }}>
                2. Add Products from Price List
              </Typography>

              {/* Product Selection + Qty + Rate + Add Row */}
              <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
                {/* Autocomplete Product Dropdown */}
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Autocomplete
                    size="small"
                    autoHighlight
                    freeSolo
                    options={productOptions}
                    getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
                    isOptionEqualToValue={(option, val) => {
                      const optName = typeof option === 'string' ? option : option?.name;
                      const valName = typeof val === 'string' ? val : val?.name;
                      return optName === valName;
                    }}
                    value={productOptions.find((p) => p.name === selectedProduct) || (selectedProduct ? selectedProduct : null)}
                    onChange={(_, val) => {
                      if (val) {
                        if (typeof val === 'string') {
                          setSelectedProduct(val);
                          const matched = productOptions.find((p) => p.name.toLowerCase() === val.toLowerCase());
                          if (matched) {
                            setRate(String(matched.rate || 0));
                            setUnit(matched.unit || 'Box');
                          }
                        } else {
                          setSelectedProduct(val.name);
                          if (val.rate !== undefined && val.rate > 0) {
                            setRate(String(val.rate));
                          } else {
                            setRate('0');
                          }
                          if (val.unit) {
                            setUnit(val.unit);
                          }
                        }
                      } else {
                        setSelectedProduct('');
                        setRate('0');
                      }
                    }}
                    onInputChange={(_, newInputValue, reason) => {
                      if (reason === 'input') {
                        setSelectedProduct(newInputValue);
                        const matched = productOptions.find((p) => p.name.toLowerCase() === newInputValue.trim().toLowerCase());
                        if (matched) {
                          setRate(String(matched.rate || 0));
                          setUnit(matched.unit || 'Box');
                        }
                      } else if (reason === 'clear') {
                        setSelectedProduct('');
                        setRate('0');
                      }
                    }}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      const optName = typeof option === 'string' ? option : option.name;
                      const optCategory = typeof option === 'string' ? undefined : option.category;
                      const optRate = typeof option === 'string' ? undefined : option.rate;
                      const optUnit = typeof option === 'string' ? undefined : option.unit;
                      const optKey = key || (typeof option === 'string' ? option : option.id || option.name);

                      return (
                        <Box
                          component="li"
                          key={optKey}
                          {...otherProps}
                          sx={{
                            display: 'flex !important',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            py: 0.8,
                            px: 1.5,
                            gap: 1,
                            borderBottom: '1px solid #F1F5F9',
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714' }}>
                              {optName}
                            </Typography>
                            {optCategory && (
                              <Typography sx={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                                {optCategory}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                            {optRate !== undefined && optRate > 0 && (
                              <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C' }}>
                                ₹{Number(optRate).toLocaleString('en-IN')}
                              </Typography>
                            )}
                            {optUnit && (
                              <Typography sx={{ fontSize: '10.5px', color: '#6B7280' }}>
                                / {optUnit}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search product from price list..."
                        sx={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '6px',
                          '& .MuiInputBase-input': {
                            fontSize: '13px',
                            fontWeight: 600,
                          },
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Quantity */}
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Qty"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProductItem();
                      }
                    }}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600, textAlign: 'center' },
                    }}
                  />
                </Grid>

                {/* Rate */}
                <Grid size={{ xs: 6, sm: 2.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Rate (₹)"
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProductItem();
                      }
                    }}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 800, color: '#B91C1C' },
                    }}
                  />
                </Grid>

                {/* Add Item Button */}
                <Grid size={{ xs: 12, sm: 2.5 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    disableElevation
                    onClick={handleAddProductItem}
                    startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      color: '#B91C1C',
                      border: '1.5px solid #E2E8F0',
                      fontWeight: 800,
                      fontSize: '13px',
                      textTransform: 'none',
                      height: '38px',
                      borderRadius: '6px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      '&:hover': { backgroundColor: '#F8FAFC' },
                    }}
                  >
                    Add Item
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Current Bill Items Table */}
            <TableContainer sx={{ minHeight: '260px', maxHeight: '460px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table stickyHeader size="small" aria-label="bill items table" sx={{ minWidth: { xs: '540px', sm: '100%' } }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', width: '45px', backgroundColor: '#F8FAFC' }}>
                      #
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', backgroundColor: '#F8FAFC' }}>
                      PRODUCT / PARTICULAR
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', width: '75px', backgroundColor: '#F8FAFC' }}>
                      UNIT
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', width: '140px', backgroundColor: '#F8FAFC' }}>
                      QTY
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', width: '110px', backgroundColor: '#F8FAFC' }}>
                      RATE (₹)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', width: '110px', backgroundColor: '#F8FAFC' }}>
                      AMOUNT (₹)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', width: '60px', backgroundColor: '#F8FAFC' }}>
                      ACTION
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9CA3AF' }}>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>
                          No products added to this invoice yet.
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#A8998A' }}>
                          Select a product from the top bar and click "Add Item" to build the bill.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    productRows.map((row, idx) => (
                      <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FEFDF5' } }}>
                        <TableCell sx={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
                          {idx + 1}
                        </TableCell>
                        <TableCell sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714' }}>
                          {row.particular}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: '12px', color: '#57463A' }}>
                          {row.pktUnit}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.8 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                const current = parseFloat(row.quantity) || 1;
                                if (current > 1) {
                                  handleQuantityChange(row.id, String(current - 1));
                                }
                              }}
                              sx={{
                                p: 0.3,
                                border: '1px solid #CBD5E1',
                                borderRadius: '4px',
                                color: '#64748B',
                                '&:hover': { backgroundColor: '#FEF2F2', color: '#B91C1C', borderColor: '#FCA5A5' },
                              }}
                            >
                              <RemoveRoundedIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                            <TextField
                              size="small"
                              type="number"
                              value={row.quantity}
                              onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                              slotProps={{
                                htmlInput: {
                                  min: 1,
                                  style: { textAlign: 'center', fontWeight: 800, padding: '3px 4px', fontSize: '13px' },
                                },
                              }}
                              sx={{
                                width: '56px',
                                backgroundColor: '#FFFFFF',
                                borderRadius: '6px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B91C1C' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#B91C1C' },
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => {
                                const current = parseFloat(row.quantity) || 0;
                                handleQuantityChange(row.id, String(current + 1));
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
                        <TableCell align="right" sx={{ py: 0.8 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={row.rate}
                            onChange={(e) => handleRateChange(row.id, e.target.value)}
                            slotProps={{
                              htmlInput: {
                                min: 0,
                                style: { textAlign: 'right', fontWeight: 700, padding: '3px 6px', fontSize: '13px', color: '#475569' },
                              },
                            }}
                            sx={{
                              width: '85px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '6px',
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B91C1C' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#B91C1C' },
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '14px', fontWeight: 800, color: '#B91C1C' }}>
                          ₹{Number(row.amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRow(row.id)}
                            sx={{ color: '#DC2626', p: 0.5, '&:hover': { backgroundColor: '#FEF2F2' } }}
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
          </Paper>
        </Grid>
      </Grid>

      {/* Print Bill Modal */}
      {printModalOpen && selectedBillForPrint && (
        <BillPrintModal
          open={printModalOpen}
          onClose={() => {
            setPrintModalOpen(false);
            setSelectedBillForPrint(null);
          }}
          bill={selectedBillForPrint}
        />
      )}
    </Box>
  );
};
