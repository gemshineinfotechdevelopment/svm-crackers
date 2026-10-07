import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  InputBase,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Autocomplete,
  Divider,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { CustomersApi, ParticularsApi, ProductsApi, PriceListsApi } from '../services/api';
import { printCustomerListDirectly } from '../utils/printUtils';
import { DateRangePrintModal } from './DateRangePrintModal';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';
import { getStoredSettings } from './SettingsPage';

export interface CustomerItem {
  _id?: string;
  id?: string;
  idCode?: string;
  name: string;
  avatarLetter?: string;
  avatarBg?: string;
  avatarColor?: string;
  address: string;
  mobile: string;
  gst: string;
}

interface AllCustomersPageProps {
  onAddNewCustomer?: () => void;
  onSelectCustomerForParticular?: (customerName: string, subTab?: 'Account Details' | 'Create Particular') => void;
  onEditBill?: (bill: any) => void;
}

export const AllCustomersPage: FC<AllCustomersPageProps> = ({
  onAddNewCustomer,
  onSelectCustomerForParticular,
  onEditBill,
}) => {
  const [storeSettings, setStoreSettings] = useState(() => getStoredSettings());
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Customer Dialog State
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    gst: '',
    address: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Active View Tab: 'customers' or 'bills'
  const [activeView, setActiveView] = useState<'customers' | 'bills'>('customers');

  // Date Range Print Modal State
  const [openDatePrintModal, setOpenDatePrintModal] = useState(false);

  // Recent Bills State
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [loadingRecentBills, setLoadingRecentBills] = useState<boolean>(true);
  const [billSearchTerm, setBillSearchTerm] = useState<string>('');
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

  // Edit Bill State & Catalog
  const [openEditBillModal, setOpenEditBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [productCatalog, setProductCatalog] = useState<{ id: string; name: string; rate?: number; unit?: string }[]>([]);
  const [editBillFormData, setEditBillFormData] = useState<{
    billNo: string;
    date: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerGst: string;
    companyName: string;
    caseCount: string;
    discount: string;
    transport: string;
    packing: string;
    tax: string;
    products: {
      particular: string;
      quantity: string;
      rate: string;
      pktUnit: string;
      amount: string;
    }[];
  }>({
    billNo: '',
    date: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerGst: '',
    companyName: '',
    caseCount: '0',
    discount: '0',
    transport: '0',
    packing: '0',
    tax: '0',
    products: [],
  });
  const [editBillLoading, setEditBillLoading] = useState(false);

  const totalBillsAmount = useMemo(() => {
    return recentBills.reduce((sum, b) => {
      const val = parseFloat(String(b.total || b.amount || '0').replace(/,/g, '')) || 0;
      return sum + val;
    }, 0);
  }, [recentBills]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await CustomersApi.getAll();
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentBills = async () => {
    try {
      setLoadingRecentBills(true);
      const bills = await ParticularsApi.getAll(undefined, 'REGULAR');
      const regularBills = (Array.isArray(bills) ? bills : []).filter(
        (b: any) => b.billType !== 'GST' && !(b.billNo && String(b.billNo).toUpperCase().startsWith('GST'))
      );
      setRecentBills(regularBills);
    } catch (err) {
      console.error('Failed to fetch recent bills:', err);
    } finally {
      setLoadingRecentBills(false);
    }
  };

  const fetchProductCatalog = async () => {
    try {
      const [prods, priceList] = await Promise.all([
        ProductsApi.getAll().catch(() => []),
        PriceListsApi.getAll().catch(() => []),
      ]);
      const map = new Map<string, { id: string; name: string; rate?: number; unit?: string }>();
      if (Array.isArray(prods)) {
        prods.forEach((p: any) => {
          if (p.name) map.set(p.name.trim().toLowerCase(), { id: p._id || p.id, name: p.name.trim(), rate: p.rate || 0, unit: p.unit || 'Box' });
        });
      }
      if (Array.isArray(priceList)) {
        priceList.forEach((item: any) => {
          if (item.itemName) {
            const key = item.itemName.trim().toLowerCase();
            const existing = map.get(key);
            map.set(key, {
              id: item._id || item.id || existing?.id,
              name: item.itemName.trim(),
              rate: item.rate || existing?.rate || 0,
              unit: item.unit || existing?.unit || 'Box',
            });
          }
        });
      }
      setProductCatalog(Array.from(map.values()));
    } catch (e) {
      console.warn('Failed to load product catalog for edit bill:', e);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchRecentBills();
    fetchProductCatalog();

    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const handleOpenEdit = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name || '',
      mobile: customer.mobile || '',
      gst: customer.gst || '',
      address: customer.address || '',
    });
    setOpenEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    const id = editingCustomer._id || editingCustomer.id;
    if (!id) return;

    if (!editFormData.name.trim() || !editFormData.address.trim()) {
      alert('Please fill in Customer Name and Address');
      return;
    }

    try {
      setEditLoading(true);
      await CustomersApi.update(id, {
        name: editFormData.name.trim(),
        mobile: editFormData.mobile.trim() || 'N/A',
        gst: editFormData.gst.trim() || 'N/A',
        address: editFormData.address.trim(),
        avatarLetter: editFormData.name.trim().charAt(0).toUpperCase(),
      });
      setOpenEditModal(false);
      await fetchCustomers();
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      alert(err.message || 'Error updating customer');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"? This will delete all associated records.`)) return;

    try {
      await CustomersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== id));
      fetchRecentBills();
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      alert(err.message || 'Error deleting customer');
    }
  };

  // Delete Recent Bill
  const handleDeleteRecentBill = async (bill: any) => {
    const id = bill._id || bill.id;
    if (!id) return;
    if (!window.confirm(`Delete Bill #${bill.billNo || ''} for ${bill.customerName}?`)) return;

    try {
      await ParticularsApi.delete(id);
      setRecentBills((prev) => prev.filter((b) => (b._id || b.id) !== id));
    } catch (err: any) {
      console.error('Failed to delete bill:', err);
      alert(err.message || 'Error deleting bill');
    }
  };

  // Open Print for Recent Bill
  const handlePrintRecentBill = (bill: any) => {
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
          : storeSettings.companyName || 'General',
      transport: String(bill.transport || '0'),
      caseCount: String(bill.caseCount || '0'),
      discount: String(bill.discount || '0'),
      packing: String(bill.packing || '0'),
      tax: String(bill.tax || '0'),
      amount: String(bill.amount || bill.total || '0'),
      total: String(bill.total || '0'),
      pdfData: bill.pdfData || bill.pdfUrl || '',
      pdfUrl: bill.pdfUrl || '',
      products: (bill.products || []).map((p: any) => ({
        particular: p.particular || p.name || '',
        quantity: p.quantity || '0',
        rate: p.rate || '0',
        pktUnit: p.pktUnit || 'Box',
        amount: p.amount || '0',
      })),
    };
    setSelectedBillForPrint(printData);
    setPrintModalOpen(true);
  };

  // Open Edit Bill Modal
  const handleOpenEditBill = (bill: any) => {
    setEditingBill(bill);
    const rawProducts = Array.isArray(bill.products) && bill.products.length > 0
      ? bill.products.map((p: any) => ({
          particular: p.particular || p.name || '',
          quantity: String(p.quantity ?? '1'),
          rate: String(p.rate ?? '0'),
          pktUnit: p.pktUnit || 'Box',
          amount: String(p.amount ?? ((parseFloat(p.quantity) || 0) * (parseFloat(p.rate) || 0)).toFixed(2)),
        }))
      : [{ particular: '', quantity: '1', rate: '0', pktUnit: 'Box', amount: '0.00' }];

    setEditBillFormData({
      billNo: String(bill.billNo || ''),
      date: bill.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      customerName: bill.customerName || '',
      customerPhone: bill.customerPhone || '',
      customerAddress: bill.customerAddress || '',
      customerGst: bill.customerGst || '',
      companyName: bill.companyName || storeSettings.companyName || 'Apsara Crackers',
      caseCount: String(bill.caseCount || '0'),
      discount: String(bill.discount ?? '0'),
      transport: String(bill.transport ?? '0'),
      packing: String(bill.packing ?? '0'),
      tax: String(bill.tax ?? '0'),
      products: rawProducts,
    });
    setOpenEditBillModal(true);
  };

  const handleEditBillProductChange = (index: number, field: string, value: string) => {
    setEditBillFormData((prev) => {
      const updatedProducts = [...prev.products];
      const row = { ...updatedProducts[index], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        const qty = parseFloat(field === 'quantity' ? value : row.quantity) || 0;
        const rt = parseFloat(field === 'rate' ? value : row.rate) || 0;
        row.amount = (qty * rt).toFixed(2);
      }
      updatedProducts[index] = row;
      return { ...prev, products: updatedProducts };
    });
  };

  const handleEditBillAddProductRow = () => {
    setEditBillFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        { particular: '', quantity: '1', rate: '0', pktUnit: 'Box', amount: '0.00' },
      ],
    }));
  };

  const handleEditBillRemoveProductRow = (index: number) => {
    setEditBillFormData((prev) => {
      const updated = prev.products.filter((_, i) => i !== index);
      return {
        ...prev,
        products: updated.length > 0 ? updated : [{ particular: '', quantity: '1', rate: '0', pktUnit: 'Box', amount: '0.00' }],
      };
    });
  };

  const editBillCalculations = useMemo(() => {
    const subtotal = editBillFormData.products.reduce((sum, p) => {
      const rowAmt = parseFloat(String(p.amount || '0')) || ((parseFloat(p.quantity) || 0) * (parseFloat(p.rate) || 0));
      return sum + rowAmt;
    }, 0);

    const disc = parseFloat(editBillFormData.discount || '0') || 0;
    const trans = parseFloat(editBillFormData.transport || '0') || 0;
    const pack = parseFloat(editBillFormData.packing || '0') || 0;
    const taxRate = parseFloat(editBillFormData.tax || '0') || 0;

    const taxable = Math.max(0, subtotal - disc);
    const taxAmt = (taxable * taxRate) / 100;
    const grandTotal = Math.max(0, taxable + taxAmt + trans + pack);

    return {
      subtotal,
      discount: disc,
      transport: trans,
      packing: pack,
      taxRate,
      taxAmount: taxAmt,
      grandTotal,
    };
  }, [editBillFormData]);

  const handleSaveEditBill = async () => {
    if (!editingBill) return;
    const billId = editingBill._id || editingBill.id;
    if (!billId) return;

    if (!editBillFormData.customerName.trim()) {
      alert('Please enter a Customer Name');
      return;
    }

    if (!editBillFormData.billNo.trim()) {
      alert('Please enter a Bill Number');
      return;
    }

    const validProducts = editBillFormData.products.filter((p) => p.particular.trim() !== '');
    if (validProducts.length === 0) {
      alert('Please add at least one product item with a name.');
      return;
    }

    try {
      setEditBillLoading(true);

      const payload = {
        billNo: editBillFormData.billNo.trim(),
        date: editBillFormData.date.trim(),
        customerName: editBillFormData.customerName.trim(),
        customerPhone: editBillFormData.customerPhone.trim(),
        customerAddress: editBillFormData.customerAddress.trim(),
        customerGst: editBillFormData.customerGst.trim(),
        companyName: editBillFormData.companyName.trim() || storeSettings.companyName || 'Apsara Crackers',
        caseCount: editBillFormData.caseCount || '0',
        discount: editBillFormData.discount || '0',
        transport: editBillFormData.transport || '0',
        packing: editBillFormData.packing || '0',
        tax: editBillFormData.tax || '0',
        amount: editBillCalculations.subtotal.toFixed(2),
        total: editBillCalculations.grandTotal.toFixed(2),
        products: validProducts.map((p) => ({
          particular: p.particular.trim(),
          quantity: String(p.quantity || '1'),
          rate: String(p.rate || '0'),
          pktUnit: p.pktUnit || 'Box',
          amount: (
            (parseFloat(p.quantity) || 0) * (parseFloat(p.rate) || 0)
          ).toFixed(2),
        })),
      };

      await ParticularsApi.update(billId, payload);
      setOpenEditBillModal(false);
      setEditingBill(null);
      await fetchRecentBills();
      await fetchCustomers();
    } catch (err: any) {
      console.error('Failed to update bill:', err);
      alert(err.message || 'Error updating bill');
    } finally {
      setEditBillLoading(false);
    }
  };

  // Filtering Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        (c.address && c.address.toLowerCase().includes(term)) ||
        (c.gst && c.gst.toLowerCase().includes(term)) ||
        (c.mobile && c.mobile.includes(term)) ||
        (c.idCode && c.idCode.toLowerCase().includes(term))
      );
    });
  }, [customers, searchTerm]);

  // Filtered recent bills
  const filteredRecentBills = useMemo(() => {
    if (!billSearchTerm.trim()) return recentBills;
    const term = billSearchTerm.toLowerCase().trim();
    return recentBills.filter(
      (b) =>
        (b.billNo && b.billNo.toLowerCase().includes(term)) ||
        (b.customerName && b.customerName.toLowerCase().includes(term)) ||
        (b.companyName && b.companyName.toLowerCase().includes(term)) ||
        (b.date && b.date.toLowerCase().includes(term))
    );
  }, [recentBills, billSearchTerm]);

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.5, md: 3.5 },
        boxSizing: 'border-box',
      }}
    >
      {/* Top View Toggle Switcher (Customers vs Bills) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 3,
          backgroundColor: '#F8FAFC',
          p: '5px',
          borderRadius: '12px',
          width: 'fit-content',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Button
          onClick={() => setActiveView('customers')}
          startIcon={<PeopleAltRoundedIcon sx={{ fontSize: 19 }} />}
          sx={{
            px: 2.5,
            py: 0.8,
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 800,
            textTransform: 'none',
            letterSpacing: '-0.01em',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: activeView === 'customers' ? '#B91C1C' : 'transparent',
            color: activeView === 'customers' ? '#FFFFFF' : '#475569',
            boxShadow: activeView === 'customers' ? '0 2px 8px rgba(185, 28, 28, 0.3)' : 'none',
            '&:hover': {
              backgroundColor: activeView === 'customers' ? '#991B1B' : '#F1F5F9',
            },
          }}
        >
          Customers
          <Chip
            label={customers.length}
            size="small"
            sx={{
              ml: 1,
              height: '20px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: activeView === 'customers' ? 'rgba(255, 255, 255, 0.25)' : '#E2E8F0',
              color: activeView === 'customers' ? '#FFFFFF' : '#334155',
              pointerEvents: 'none',
            }}
          />
        </Button>

        <Button
          onClick={() => setActiveView('bills')}
          startIcon={<ReceiptLongRoundedIcon sx={{ fontSize: 19 }} />}
          sx={{
            px: 2.5,
            py: 0.8,
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 800,
            textTransform: 'none',
            letterSpacing: '-0.01em',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: activeView === 'bills' ? '#B91C1C' : 'transparent',
            color: activeView === 'bills' ? '#FFFFFF' : '#475569',
            boxShadow: activeView === 'bills' ? '0 2px 8px rgba(185, 28, 28, 0.3)' : 'none',
            '&:hover': {
              backgroundColor: activeView === 'bills' ? '#991B1B' : '#F1F5F9',
            },
          }}
        >
          Bills
          <Chip
            label={recentBills.length}
            size="small"
            sx={{
              ml: 1,
              height: '20px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: activeView === 'bills' ? 'rgba(255, 255, 255, 0.25)' : '#E2E8F0',
              color: activeView === 'bills' ? '#FFFFFF' : '#334155',
              pointerEvents: 'none',
            }}
          />
        </Button>
      </Box>

      {/* ======================= CUSTOMERS VIEW ======================= */}
      {activeView === 'customers' && (
        <>
          {/* Page Header */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                  All Customers Directory
                </Typography>
                <Chip
                  label={`${customers.length} Customers`}
                  size="small"
                  sx={{
                    backgroundColor: '#F8FAFC',
                    color: '#334155',
                    fontWeight: 800,
                    border: '1px solid #E2E8F0',
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: '13.5px', color: '#786C58', mt: 0.5, fontWeight: 600 }}>
                Directory of all registered customers, contact numbers, and billing history.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                width: { xs: '100%', md: 'auto' },
                flexWrap: 'wrap',
              }}
            >
              {/* Search Box */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1.5px solid #E2E8F0',
                  px: 1.5,
                  height: '40px',
                  width: { xs: '100%', sm: '280px' },
                  boxSizing: 'border-box',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#F59E0B',
                  },
                  '&:focus-within': {
                    borderColor: '#DC2626',
                    boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)',
                  },
                }}
              >
                <SearchRoundedIcon
                  sx={{
                    color: '#D97706',
                    fontSize: 20,
                    mr: 1,
                  }}
                />
                <InputBase
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#1F1714',
                    width: '100%',
                    '& input': {
                      p: 0,
                      '&::placeholder': {
                        color: '#A8998A',
                        opacity: 1,
                      },
                    },
                  }}
                />
                {searchTerm && (
                  <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.3 }}>
                    <ClearRoundedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                )}
              </Box>

              {/* Print Customers Report Button */}
              <Button
                variant="outlined"
                onClick={() => setOpenDatePrintModal(true)}
                startIcon={<PrintOutlinedIcon sx={{ fontSize: 19 }} />}
                sx={{
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  borderColor: '#FCD34D',
                  borderWidth: '1.5px',
                  height: '40px',
                  px: 2,
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  '&:hover': {
                    backgroundColor: '#F8FAFC',
                    borderColor: '#F59E0B',
                  },
                }}
              >
                Print Report ({filteredCustomers.length})
              </Button>

              {/* Add New Customer Button */}
              {onAddNewCustomer && (
                <Button
                  variant="contained"
                  disableElevation
                  onClick={onAddNewCustomer}
                  startIcon={<AddRoundedIcon sx={{ fontSize: 20 }} />}
                  sx={{
                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    color: '#FFFFFF',
                    border: '1px solid #F59E0B',
                    height: '40px',
                    px: 2.4,
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    textTransform: 'none',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                    },
                  }}
                >
                  Add Customer
                </Button>
              )}
            </Box>
          </Box>

          {/* Overview Metric Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  backgroundColor: '#F1F5F9',
                  color: '#B91C1C',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PeopleAltRoundedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58' }}>
                  Total Registered Customers
                </Typography>
                <Typography sx={{ fontSize: '22px', fontWeight: 900, color: '#B91C1C', lineHeight: 1.2, mt: 0.2 }}>
                  {customers.length}
                </Typography>
              </Box>
            </Box>

            <Typography sx={{ fontSize: '12.5px', color: '#786C58', fontWeight: 600 }}>
              Showing {filteredCustomers.length} of {customers.length} customer records
            </Typography>
          </Paper>

          {/* Main Customers Table Card */}
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            <TableContainer>
              <Table sx={{ minWidth: 750 }} aria-label="all customers table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableCell
                      sx={{
                        py: 1.8,
                        px: 2.5,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#1E293B',
                        letterSpacing: '0.04em',
                        borderBottom: '2px solid #E2E8F0',
                        width: '90px',
                      }}
                    >
                      ID
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 1.8,
                        px: 2.5,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#1E293B',
                        letterSpacing: '0.04em',
                        borderBottom: '2px solid #E2E8F0',
                      }}
                    >
                      CUSTOMER NAME & CONTACT
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 1.8,
                        px: 2.5,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#1E293B',
                        letterSpacing: '0.04em',
                        borderBottom: '2px solid #E2E8F0',
                      }}
                    >
                      ADDRESS & GSTIN
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        py: 1.8,
                        px: 2.5,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#1E293B',
                        letterSpacing: '0.04em',
                        borderBottom: '2px solid #E2E8F0',
                        width: '240px',
                      }}
                    >
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: '#786C58' }}>
                        {searchTerm ? 'No customers match your search criteria.' : 'No customers found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer, index) => {
                      const isLast = index === filteredCustomers.length - 1;
                      const recordId = customer._id || customer.id || '';
                      const idDisplay = customer.idCode || `#${(index + 1).toString().padStart(4, '0')}`;
                      const avatarInitial = customer.avatarLetter || customer.name.charAt(0).toUpperCase();

                      return (
                        <TableRow
                          key={recordId || index}
                          sx={{
                            transition: 'background-color 0.15s ease',
                            '&:hover': {
                              backgroundColor: '#FEFDF5',
                            },
                          }}
                        >
                          {/* ID */}
                          <TableCell
                            sx={{
                              py: 1.8,
                              px: 2.5,
                              fontSize: '13px',
                              color: '#B91C1C',
                              fontWeight: 800,
                              borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                            }}
                          >
                            {idDisplay}
                          </TableCell>

                          {/* Customer Name & Mobile */}
                          <TableCell
                            sx={{
                              py: 1.8,
                              px: 2.5,
                              borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                            }}
                          >
                            <Box
                              onClick={() => onSelectCustomerForParticular?.(customer.name, 'Account Details')}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                cursor: 'pointer',
                              }}
                            >
                              <Box
                                sx={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: '50%',
                                  backgroundColor: customer.avatarBg || '#F1F5F9',
                                  color: customer.avatarColor || '#B91C1C',
                                  border: '1px solid #E2E8F0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {avatarInitial}
                              </Box>
                              <Box>
                                <Typography
                                  sx={{
                                    fontSize: '14.5px',
                                    fontWeight: 700,
                                    color: '#1F1714',
                                    letterSpacing: '-0.01em',
                                    '&:hover': {
                                      color: '#DC2626',
                                      textDecoration: 'underline',
                                    },
                                  }}
                                >
                                  {customer.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                                  <PhoneOutlinedIcon sx={{ fontSize: 13, color: '#D97706' }} />
                                  <Typography sx={{ fontSize: '12px', color: '#786C58', fontWeight: 600 }}>
                                    {customer.mobile || 'N/A'}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Address & GST */}
                          <TableCell
                            sx={{
                              py: 1.8,
                              px: 2.5,
                              fontSize: '13px',
                              color: '#334155',
                              fontWeight: 500,
                              borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.6 }}>
                              <LocationOnOutlinedIcon sx={{ fontSize: 15, color: '#64748B', mt: 0.2, flexShrink: 0 }} />
                              <Typography sx={{ fontSize: '13px', color: '#334155', fontWeight: 500, maxWidth: '320px' }}>
                                {customer.address || 'N/A'}
                              </Typography>
                            </Box>
                            {customer.gst && customer.gst !== 'N/A' && (
                              <Typography sx={{ fontSize: '11.5px', color: '#D97706', fontWeight: 700, mt: 0.4, pl: 2.6 }}>
                                GSTIN: {customer.gst}
                              </Typography>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell
                            align="center"
                            sx={{
                              py: 1.8,
                              px: 2,
                              borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                            }}
                          >
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                              {/* View Statement / Account Details Button */}
                              <Tooltip title="View Account Statement & Billing History" arrow>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => onSelectCustomerForParticular?.(customer.name, 'Account Details')}
                                  startIcon={<AccountBalanceWalletRoundedIcon sx={{ fontSize: '15px !important' }} />}
                                  sx={{
                                    height: '32px',
                                    px: 1.4,
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: '#334155',
                                    borderColor: '#E2E8F0',
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: '6px',
                                    '&:hover': {
                                      backgroundColor: '#E2E8F0',
                                      borderColor: '#F59E0B',
                                      color: '#475569',
                                    },
                                  }}
                                >
                                  Statement
                                </Button>
                              </Tooltip>

                              {/* Edit Customer Button */}
                              <Tooltip title="Edit Customer Details" arrow>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleOpenEdit(customer)}
                                  startIcon={<ModeEditOutlineRoundedIcon sx={{ fontSize: '15px !important' }} />}
                                  sx={{
                                    height: '32px',
                                    px: 1.4,
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: '#D97706',
                                    borderColor: '#E2E8F0',
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: '6px',
                                    '&:hover': {
                                      backgroundColor: '#D97706',
                                      borderColor: '#D97706',
                                      color: '#FFFFFF',
                                    },
                                  }}
                                >
                                  Edit
                                </Button>
                              </Tooltip>

                              {/* Delete Customer Button */}
                              <Tooltip title="Delete Customer" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(recordId, customer.name)}
                                  sx={{
                                    color: '#DC2626',
                                    backgroundColor: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '6px',
                                    p: 0.7,
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                      color: '#FFFFFF',
                                      backgroundColor: '#DC2626',
                                      borderColor: '#DC2626',
                                    },
                                  }}
                                >
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
          </Paper>
        </>
      )}

      {/* ======================= BILLS VIEW ======================= */}
      {activeView === 'bills' && (
        <>
          {/* Bills Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    backgroundColor: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#B91C1C',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <ReceiptLongRoundedIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '22px', fontWeight: 900, color: '#1F1714', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Recent Bills & Invoices
                  </Typography>
                  <Typography sx={{ fontSize: '13px', color: '#786C58', fontWeight: 600, mt: 0.3 }}>
                    Master register of all customer invoices, line items, and payment tallies.
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Bills Search & Refresh */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '8px',
                  px: 1.5,
                  py: 0.5,
                  width: { xs: '100%', sm: '260px' },
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  '&:focus-within': {
                    borderColor: '#D97706',
                    boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.06)',
                  },
                }}
              >
                <SearchRoundedIcon sx={{ color: '#B45309', fontSize: 19, mr: 1 }} />
                <InputBase
                  placeholder="Search bill, customer..."
                  value={billSearchTerm}
                  onChange={(e) => setBillSearchTerm(e.target.value)}
                  sx={{
                    fontSize: '13.5px',
                    color: '#1F1714',
                    fontWeight: 600,
                    width: '100%',
                    '& input': {
                      p: 0,
                      '&::placeholder': {
                        color: '#A8998A',
                        opacity: 1,
                      },
                    },
                  }}
                />
                {billSearchTerm && (
                  <IconButton size="small" onClick={() => setBillSearchTerm('')} sx={{ p: 0.3 }}>
                    <ClearRoundedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                )}
              </Box>

              {/* Refresh Bills Button */}
              <Button
                variant="outlined"
                onClick={fetchRecentBills}
                startIcon={<RefreshRoundedIcon sx={{ fontSize: 19 }} />}
                sx={{
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  borderColor: '#FCD34D',
                  borderWidth: '1.5px',
                  height: '40px',
                  px: 2,
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  '&:hover': {
                    backgroundColor: '#F8FAFC',
                    borderColor: '#F59E0B',
                  },
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {/* Bills Overview Metric Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '10px',
                    backgroundColor: '#F1F5F9',
                    color: '#B91C1C',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ReceiptLongRoundedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58' }}>
                    Total Generated Bills
                  </Typography>
                  <Typography sx={{ fontSize: '22px', fontWeight: 900, color: '#B91C1C', lineHeight: 1.2, mt: 0.2 }}>
                    {recentBills.length}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '10px',
                    backgroundColor: '#F1F5F9',
                    color: '#B91C1C',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AccountBalanceWalletRoundedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58' }}>
                    Total Invoiced Amount
                  </Typography>
                  <Typography sx={{ fontSize: '22px', fontWeight: 900, color: '#B91C1C', lineHeight: 1.2, mt: 0.2 }}>
                    ₹{totalBillsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Typography sx={{ fontSize: '12.5px', color: '#786C58', fontWeight: 600 }}>
              Showing {filteredRecentBills.length} of {recentBills.length} bills
            </Typography>
          </Paper>

          {/* Recent Bills Table */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            <TableContainer sx={{ maxHeight: '650px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table stickyHeader sx={{ minWidth: { xs: '650px', sm: '100%' } }} aria-label="recent bills table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '110px' }}>
                      BILL NO
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '120px' }}>
                      DATE
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#1E293B', backgroundColor: '#F8FAFC' }}>
                      CUSTOMER NAME
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '12px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '100px' }}>
                      ITEMS
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '12px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '150px' }}>
                      TOTAL AMOUNT (₹)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '12px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '180px' }}>
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingRecentBills ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredRecentBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#786C58' }}>
                        {billSearchTerm ? `No bills matching "${billSearchTerm}" found.` : 'No bills created yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecentBills.map((bill, index) => {
                      const isLast = index === filteredRecentBills.length - 1;
                      const totalAmt = parseFloat(String(bill.total || bill.amount || '0').replace(/,/g, '')) || 0;
                      const prodCount = (bill.products || []).length;

                      return (
                        <TableRow key={bill._id || bill.id || index} sx={{ '&:hover': { backgroundColor: '#FEFDF5' } }}>
                          <TableCell sx={{ fontSize: '13.5px', fontWeight: 800, color: '#B91C1C', borderBottom: isLast ? 'none' : '1px solid #F1F5F9' }}>
                            #{bill.billNo}
                          </TableCell>
                          <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#57463A', borderBottom: isLast ? 'none' : '1px solid #F1F5F9' }}>
                            {bill.date}
                          </TableCell>
                          <TableCell sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714', borderBottom: isLast ? 'none' : '1px solid #F1F5F9' }}>
                            {bill.customerName}
                          </TableCell>
                          <TableCell align="center" sx={{ borderBottom: isLast ? 'none' : '1px solid #F1F5F9' }}>
                            <Chip
                              label={`${prodCount} ${prodCount === 1 ? 'item' : 'items'}`}
                              size="small"
                              sx={{ fontSize: '11.5px', fontWeight: 700, backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '14.5px', fontWeight: 800, color: '#B91C1C', borderBottom: isLast ? 'none' : '1px solid #F1F5F9' }}>
                            ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="center" sx={{ borderBottom: isLast ? 'none' : '1px solid #F1F5F9' }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              {/* Edit Bill Button — navigates to Billing page */}
                              <Tooltip title="Edit Bill & Items" arrow>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => onEditBill ? onEditBill(bill) : handleOpenEditBill(bill)}
                                  startIcon={<ModeEditOutlineRoundedIcon sx={{ fontSize: '15px !important' }} />}
                                  sx={{
                                    height: '30px',
                                    px: 1.3,
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: '#B45309',
                                    borderColor: '#E2E8F0',
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: '6px',
                                    '&:hover': {
                                      backgroundColor: '#D97706',
                                      borderColor: '#D97706',
                                      color: '#FFFFFF',
                                    },
                                  }}
                                >
                                  Edit
                                </Button>
                              </Tooltip>

                              {/* Print Invoice */}
                              <Tooltip title="Print / View Invoice" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handlePrintRecentBill(bill)}
                                  sx={{
                                    color: '#D97706',
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '6px',
                                    p: 0.6,
                                    '&:hover': { color: '#FFFFFF', backgroundColor: '#D97706' },
                                  }}
                                >
                                  <PrintOutlinedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>

                              {/* Delete Bill */}
                              <Tooltip title="Delete Bill" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteRecentBill(bill)}
                                  sx={{
                                    color: '#DC2626',
                                    backgroundColor: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '6px',
                                    p: 0.6,
                                    '&:hover': { color: '#FFFFFF', backgroundColor: '#DC2626' },
                                  }}
                                >
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
          </Paper>
        </>
      )}

      {/* Edit Customer Dialog */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '18px', color: '#B91C1C', pb: 1 }}>
          Edit Customer Details
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Box>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
              Customer Full Name *
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
              Mobile / Contact Number
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editFormData.mobile}
              onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
              Address / Town *
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
              GSTIN
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editFormData.gst}
              onChange={(e) => setEditFormData({ ...editFormData, gst: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setOpenEditModal(false)}
            sx={{ textTransform: 'none', color: '#786C58', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSaveEdit}
            disabled={editLoading}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              fontWeight: 700,
              textTransform: 'none',
              px: 2.5,
              borderRadius: '6px',
            }}
          >
            {editLoading ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date Range Print Report Modal */}
      {openDatePrintModal && (
        <DateRangePrintModal
          open={openDatePrintModal}
          onClose={() => setOpenDatePrintModal(false)}
          title="Customers Directory Report"
          items={filteredCustomers}
          getDateFromItem={(item) => item.createdAt || ''}
          onConfirmPrint={(items, dateRangeText) => {
            printCustomerListDirectly(items, 'Customers Directory Report', dateRangeText);
          }}
        />
      )}

      {/* Print Recent Bill Modal */}
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

      {/* Edit Bill / Particular Dialog */}
      <Dialog
        open={openEditBillModal}
        onClose={() => !editBillLoading && setOpenEditBillModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: '18px',
            color: '#1E293B',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            py: 2,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ReceiptLongRoundedIcon sx={{ color: '#B91C1C', fontSize: 24 }} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '17px', color: '#1F1714', lineHeight: 1.2 }}>
                Edit Bill #{editBillFormData.billNo}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#786C58', fontWeight: 600, mt: 0.2 }}>
                Modify invoice details, customer information, line items, and taxes
              </Typography>
            </Box>
          </Box>
          <Chip
            label={editBillFormData.date || 'Today'}
            size="small"
            sx={{ fontWeight: 700, backgroundColor: '#F1F5F9', color: '#B91C1C', border: '1px solid #E2E8F0' }}
          />
        </DialogTitle>

        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, backgroundColor: '#FFFFFF' }}>
          {/* Bill Metadata Grid */}
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
              1. Bill & Customer Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Bill Number *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={editBillFormData.billNo}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, billNo: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13.5px', fontWeight: 700, color: '#B91C1C', borderRadius: '8px' } },
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Bill Date (DD-MM-YYYY) *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={editBillFormData.date}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, date: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13.5px', fontWeight: 600, borderRadius: '8px' } },
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Company Name
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={editBillFormData.companyName}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, companyName: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13.5px', fontWeight: 600, borderRadius: '8px' } },
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Customer Name *
                </Typography>
                <Autocomplete
                  freeSolo
                  options={customers.map((c) => c.name)}
                  value={editBillFormData.customerName}
                  onInputChange={(_e, newInputValue) => {
                    const match = customers.find((c) => c.name.toLowerCase() === newInputValue.toLowerCase());
                    setEditBillFormData((prev) => ({
                      ...prev,
                      customerName: newInputValue,
                      ...(match ? {
                        customerPhone: match.mobile && match.mobile !== 'N/A' ? match.mobile : prev.customerPhone,
                        customerAddress: match.address && match.address !== 'N/A' ? match.address : prev.customerAddress,
                        customerGst: match.gst && match.gst !== 'N/A' ? match.gst : prev.customerGst,
                      } : {}),
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Select or enter customer name"
                      sx={{ '& .MuiOutlinedInput-root': { fontSize: '13.5px', fontWeight: 700, borderRadius: '8px' } }}
                    />
                  )}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Customer Mobile Number
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={editBillFormData.customerPhone}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, customerPhone: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '8px' } },
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, mt: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Customer Address / Location
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={editBillFormData.customerAddress}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, customerAddress: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '8px' } },
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  GSTIN
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={editBillFormData.customerGst}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, customerGst: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '8px' } },
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#E2E8F0' }} />

          {/* Bill Items Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. Invoice Items & Quantities
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleEditBillAddProductRow}
                startIcon={<AddCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{
                  color: '#334155',
                  borderColor: '#E2E8F0',
                  backgroundColor: '#F8FAFC',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '6px',
                  '&:hover': {
                    backgroundColor: '#F1F5F9',
                    borderColor: '#F59E0B',
                  },
                }}
              >
                Add Item Row
              </Button>
            </Box>

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: '1.5px solid #E2E8F0',
                borderRadius: '10px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '40px' }}>
                      #
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', backgroundColor: '#F8FAFC' }}>
                      PARTICULAR / PRODUCT
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '90px' }}>
                      UNIT
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '90px' }}>
                      QTY
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '100px' }}>
                      RATE (₹)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '110px' }}>
                      AMOUNT (₹)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#1E293B', backgroundColor: '#F8FAFC', width: '50px' }}>
                      
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editBillFormData.products.map((row, index) => {
                    const rowAmt = (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0);

                    return (
                      <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#FEFDF5' } }}>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58' }}>
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <Autocomplete
                            freeSolo
                            options={productCatalog.map((p) => p.name)}
                            value={row.particular}
                            onInputChange={(_e, val) => {
                              const match = productCatalog.find((p) => p.name.toLowerCase() === val.toLowerCase());
                              handleEditBillProductChange(index, 'particular', val);
                              if (match) {
                                if (match.rate && match.rate > 0) {
                                  handleEditBillProductChange(index, 'rate', String(match.rate));
                                }
                                if (match.unit) {
                                  handleEditBillProductChange(index, 'pktUnit', match.unit);
                                }
                              }
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                placeholder="Item name..."
                                sx={{ '& .MuiOutlinedInput-root': { fontSize: '13px', fontWeight: 600, py: '2px !important', borderRadius: '6px' } }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={row.pktUnit}
                            onChange={(e) => handleEditBillProductChange(index, 'pktUnit', e.target.value)}
                            placeholder="Box/Pcs"
                            slotProps={{
                              input: { sx: { fontSize: '12.5px', py: '2px', borderRadius: '6px' } },
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={row.quantity}
                            onChange={(e) => handleEditBillProductChange(index, 'quantity', e.target.value)}
                            slotProps={{
                              input: { sx: { fontSize: '13px', fontWeight: 700, textAlign: 'right', py: '2px', borderRadius: '6px' } },
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={row.rate}
                            onChange={(e) => handleEditBillProductChange(index, 'rate', e.target.value)}
                            slotProps={{
                              input: { sx: { fontSize: '13px', fontWeight: 700, textAlign: 'right', py: '2px', borderRadius: '6px' } },
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '13.5px', fontWeight: 800, color: '#B91C1C' }}>
                          ₹{rowAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditBillRemoveProductRow(index)}
                            disabled={editBillFormData.products.length <= 1}
                            sx={{ color: '#DC2626', p: 0.5 }}
                          >
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider sx={{ borderColor: '#E2E8F0' }} />

          {/* Bill Summary & Calculations */}
          <Box sx={{ backgroundColor: '#F8FAFC', p: 2, borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
              3. Summary & Financial Adjustments
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' }, gap: 2, alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Subtotal
                </Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#1F1714' }}>
                  ₹{editBillCalculations.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Discount (₹)
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={editBillFormData.discount}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, discount: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13px', fontWeight: 700, borderRadius: '6px', backgroundColor: '#FFFFFF' } },
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Transport (₹)
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={editBillFormData.transport}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, transport: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13px', fontWeight: 700, borderRadius: '6px', backgroundColor: '#FFFFFF' } },
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Packing (₹)
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={editBillFormData.packing}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, packing: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13px', fontWeight: 700, borderRadius: '6px', backgroundColor: '#FFFFFF' } },
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                  Tax Rate (%)
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={editBillFormData.tax}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, tax: e.target.value })}
                  slotProps={{
                    input: { sx: { fontSize: '13px', fontWeight: 700, borderRadius: '6px', backgroundColor: '#FFFFFF' } },
                  }}
                />
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pt: 1.5,
                borderTop: '1px dashed #FCD34D',
                mt: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#786C58', fontWeight: 600 }}>
                  Tax Amount: ₹{editBillCalculations.taxAmount.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#786C58' }}>
                  Grand Total:
                </Typography>
                <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#B91C1C' }}>
                  ₹{editBillCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button
            onClick={() => setOpenEditBillModal(false)}
            disabled={editBillLoading}
            sx={{ textTransform: 'none', color: '#786C58', fontWeight: 700, fontSize: '13.5px', px: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSaveEditBill}
            disabled={editBillLoading}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              fontWeight: 800,
              fontSize: '13.5px',
              textTransform: 'none',
              px: 3,
              py: 0.9,
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
              },
            }}
          >
            {editBillLoading ? <CircularProgress size={20} color="inherit" /> : 'Save Bill Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
