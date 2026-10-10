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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import { CustomersApi, ParticularsApi } from '../services/api';
import { printCustomerListDirectly } from '../utils/printUtils';
import { DateRangePrintModal } from './DateRangePrintModal';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';
import { getStoredSettings } from './SettingsPage';
import {
  getActiveBillingYear,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';
import { getSelectedBillYear } from '../utils/billYearUtils';
import { triggerYearRestrictionDialog } from './YearRestrictionDialog';

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

  // Year filter state synced with global Navbar/Settings
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);

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

  const fetchCustomers = async (yearToFetch?: number | string) => {
    try {
      setLoading(true);
      const targetYear = yearToFetch !== undefined ? yearToFetch : (selectedYear || getSelectedBillYear());
      const data = await CustomersApi.getAll(targetYear);
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentBills = async (yearToFetch?: number | string) => {
    try {
      setLoadingRecentBills(true);
      const targetYear = yearToFetch !== undefined ? yearToFetch : (selectedYear || getSelectedBillYear());
      const bills = await ParticularsApi.getAll(undefined, 'REGULAR', targetYear);
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

  useEffect(() => {
    fetchCustomers(selectedYear);
    fetchRecentBills(selectedYear);

    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    const handleYearChange = (e: any) => {
      const year = e?.detail?.year ? Number(e.detail.year) : (typeof getSelectedBillYear === 'function' ? Number(getSelectedBillYear()) : undefined);
      if (year) {
        setSelectedYear(year);
        fetchCustomers(year);
        fetchRecentBills(year);
      } else {
        fetchCustomers();
        fetchRecentBills();
      }
    };

    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    window.addEventListener('apsara_bill_year_changed', handleYearChange);
    return () => {
      window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
      window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
      window.removeEventListener('apsara_bill_year_changed', handleYearChange);
    };
  }, []);

  const openEditAction = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name || '',
      mobile: customer.mobile || '',
      gst: customer.gst || '',
      address: customer.address || '',
    });
    setOpenEditModal(true);
  };

  const handleOpenEdit = (customer: CustomerItem) => {
    const currentSystemYear = new Date().getFullYear();
    if (Number(selectedYear) !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear),
        currentSystemYear: String(currentSystemYear),
        onProceed: () => openEditAction(customer),
      });
      return;
    }
    openEditAction(customer);
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
      await fetchCustomers(selectedYear);
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      alert(err.message || 'Error updating customer');
    } finally {
      setEditLoading(false);
    }
  };

  const executeDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"? This will delete all associated records.`)) return;

    try {
      await CustomersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== id));
      fetchRecentBills(selectedYear);
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      alert('Error deleting customer');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const currentSystemYear = new Date().getFullYear();
    if (Number(selectedYear) !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear),
        currentSystemYear: String(currentSystemYear),
        onProceed: () => executeDelete(id, name),
      });
      return;
    }
    executeDelete(id, name);
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
          : storeSettings.companyName || 'S.V.M Fireworks Agencies',
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
      companyName: bill.companyName || storeSettings.companyName || 'S.V.M Fireworks Agencies',
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
        companyName: editBillFormData.companyName.trim() || storeSettings.companyName || 'S.V.M Fireworks Agencies',
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
          {/* Left: Window Icon + Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleAltRoundedIcon sx={{ fontSize: 18, color: '#0284C7' }} />
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.01em',
              }}
            >
              Customer Directory & Invoices Register
            </Typography>
          </Box>

          {/* Right: Subtabs Switcher (Customers vs Bills) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              onClick={() => setActiveView('customers')}
              sx={{
                cursor: 'pointer',
                py: 0.3,
                px: 1,
                borderRadius: '3px',
                backgroundColor: activeView === 'customers' ? '#D2E3F5' : '#EDF4FB',
                border: activeView === 'customers' ? '1px solid #99BBE8' : '1px solid #B0C4DE',
                color: activeView === 'customers' ? '#1E3A8A' : '#0F172A',
                fontWeight: 700,
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': { bgcolor: '#DCEBFA' },
              }}
            >
              <PeopleAltRoundedIcon sx={{ fontSize: 14 }} />
              Customers ({customers.length})
            </Box>

            <Box
              onClick={() => setActiveView('bills')}
              sx={{
                cursor: 'pointer',
                py: 0.3,
                px: 1,
                borderRadius: '3px',
                backgroundColor: activeView === 'bills' ? '#D2E3F5' : '#EDF4FB',
                border: activeView === 'bills' ? '1px solid #99BBE8' : '1px solid #B0C4DE',
                color: activeView === 'bills' ? '#1E3A8A' : '#0F172A',
                fontWeight: 700,
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': { bgcolor: '#DCEBFA' },
              }}
            >
              <ReceiptLongRoundedIcon sx={{ fontSize: 14 }} />
              Bills ({recentBills.length})
            </Box>
          </Box>
        </Box>

        {/* Inner Content Area */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
          {/* ======================= CUSTOMERS VIEW ======================= */}
          {activeView === 'customers' && (
            <>
              {/* Top Control Bar */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 1,
                  bgcolor: '#FFFFFF',
                  border: '1px solid #B0C4DE',
                  borderRadius: '3px',
                  p: 0.8,
                  flexWrap: 'wrap',
                }}
              >
                {/* Search Box */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, minWidth: '220px' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                    Search Customer:
                  </Typography>
                  <input
                    type="text"
                    placeholder="Search by name, phone, address, GST..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="erp-input"
                    style={{ flex: 1, maxWidth: '320px' }}
                  />
                  {searchTerm && (
                    <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.2 }}>
                      <ClearRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Box>

                {/* Right Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                      px: 1.5,
                      borderRadius: '3px',
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#D9E4F2' },
                    }}
                  >
                    Print Report ({filteredCustomers.length})
                  </Button>

                  {/* Add Customer Button */}
                  {onAddNewCustomer && (
                    <Button
                      onClick={() => {
                        const currentSystemYear = new Date().getFullYear();
                        if (Number(selectedYear) !== currentSystemYear) {
                          triggerYearRestrictionDialog({
                            selectedYear: String(selectedYear),
                            currentSystemYear: String(currentSystemYear),
                            onProceed: () => onAddNewCustomer(),
                          });
                          return;
                        }
                        onAddNewCustomer();
                      }}
                      startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
                      size="small"
                      sx={{
                        height: '26px',
                        bgcolor: '#741748',
                        color: '#FFFFFF',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        px: 1.5,
                        borderRadius: '3px',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#580e34' },
                      }}
                    >
                      Add Customer
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Customers Table */}
              <Box
                sx={{
                  bgcolor: '#FFFFFF',
                  border: '1px solid #B0C4DE',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <TableContainer sx={{ maxHeight: 'calc(100vh - 210px)', minHeight: '380px' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                        <TableCell sx={{ width: '70px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          ID
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Customer Name
                        </TableCell>
                        <TableCell sx={{ width: '130px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Mobile No
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Address
                        </TableCell>
                        <TableCell sx={{ width: '140px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          GSTIN
                        </TableCell>
                        <TableCell align="center" sx={{ width: '190px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                            <CircularProgress size={24} sx={{ color: '#1E40AF' }} />
                          </TableCell>
                        </TableRow>
                      ) : filteredCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#64748B', fontSize: '12px' }}>
                            {searchTerm ? 'No customers match your search criteria.' : 'No customers found.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCustomers.map((customer, index) => {
                          const recordId = customer._id || customer.id || '';
                          const idDisplay = customer.idCode || `C${450 + index}`;

                          return (
                            <TableRow
                              key={recordId || index}
                              sx={{
                                '&:hover': { bgcolor: '#F1F7FD' },
                                '& td': { borderBottom: '1px solid #E2E8F0', py: 0.4 },
                              }}
                            >
                              {/* ID */}
                              <TableCell sx={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>
                                {idDisplay}
                              </TableCell>

                              {/* Customer Name */}
                              <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                                <Box
                                  onClick={() => onSelectCustomerForParticular?.(customer.name, 'Account Details')}
                                  sx={{
                                    cursor: 'pointer',
                                    '&:hover': { color: '#1E40AF', textDecoration: 'underline' },
                                  }}
                                >
                                  {customer.name}
                                </Box>
                              </TableCell>

                              {/* Mobile No */}
                              <TableCell sx={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                                {customer.mobile || '-'}
                              </TableCell>

                              {/* Address */}
                              <TableCell sx={{ fontSize: '12px', color: '#334155' }}>
                                {customer.address || '-'}
                              </TableCell>

                              {/* GSTIN */}
                              <TableCell sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                                {customer.gst && customer.gst !== 'N/A' ? customer.gst : '-'}
                              </TableCell>

                              {/* Actions */}
                              <TableCell align="center">
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                  {/* Statement / Bill */}
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      const currentSystemYear = new Date().getFullYear();
                                      if (Number(selectedYear) !== currentSystemYear) {
                                        triggerYearRestrictionDialog({
                                          selectedYear: String(selectedYear),
                                          currentSystemYear: String(currentSystemYear),
                                          onProceed: () => onSelectCustomerForParticular?.(customer.name, 'Create Particular'),
                                        });
                                        return;
                                      }
                                      onSelectCustomerForParticular?.(customer.name, 'Create Particular');
                                    }}
                                    sx={{
                                      height: '24px',
                                      px: 1,
                                      py: 0,
                                      bgcolor: '#EDF4FB',
                                      border: '1px solid #94A3B8',
                                      color: '#1E40AF',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      textTransform: 'none',
                                      borderRadius: '2px',
                                      '&:hover': { bgcolor: '#D9E4F2' },
                                    }}
                                  >
                                    Quotation
                                  </Button>

                                  {/* Edit */}
                                  <Button
                                    size="small"
                                    onClick={() => handleOpenEdit(customer)}
                                    sx={{
                                      height: '24px',
                                      px: 1,
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

                                  {/* Delete */}
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(recordId, customer.name)}
                                    sx={{
                                      color: '#DC2626',
                                      bgcolor: '#FEF2F2',
                                      border: '1px solid #FECACA',
                                      borderRadius: '2px',
                                      p: 0.3,
                                      '&:hover': { bgcolor: '#DC2626', color: '#FFFFFF' },
                                    }}
                                  >
                                    <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
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
            </>
          )}

          {/* ======================= BILLS VIEW ======================= */}
          {activeView === 'bills' && (
            <>
              {/* Bills Control Bar */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 1,
                  bgcolor: '#FFFFFF',
                  border: '1px solid #B0C4DE',
                  borderRadius: '3px',
                  p: 0.8,
                  flexWrap: 'wrap',
                }}
              >
                {/* Search Box */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, minWidth: '220px' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                    Search Bills:
                  </Typography>
                  <input
                    type="text"
                    placeholder="Search by Bill No, Customer Name, Date..."
                    value={billSearchTerm}
                    onChange={(e) => setBillSearchTerm(e.target.value)}
                    className="erp-input"
                    style={{ flex: 1, maxWidth: '320px' }}
                  />
                  {billSearchTerm && (
                    <IconButton size="small" onClick={() => setBillSearchTerm('')} sx={{ p: 0.2 }}>
                      <ClearRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Box>

                {/* Right: Total & Refresh */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                    Total Invoiced: <strong style={{ color: '#741748' }}>₹{totalBillsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </Typography>

                  <Button
                    onClick={() => fetchRecentBills(selectedYear)}
                    startIcon={<RefreshRoundedIcon sx={{ fontSize: 14 }} />}
                    size="small"
                    sx={{
                      height: '26px',
                      bgcolor: '#EDF4FB',
                      border: '1px solid #94A3B8',
                      color: '#0F172A',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      px: 1.5,
                      borderRadius: '3px',
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#D9E4F2' },
                    }}
                  >
                    Refresh
                  </Button>
                </Box>
              </Box>

              {/* Recent Bills Table */}
              <Box
                sx={{
                  bgcolor: '#FFFFFF',
                  border: '1px solid #B0C4DE',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <TableContainer sx={{ maxHeight: 'calc(100vh - 210px)', minHeight: '380px' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                        <TableCell sx={{ width: '90px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Bill No
                        </TableCell>
                        <TableCell sx={{ width: '100px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Date
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Customer Name
                        </TableCell>
                        <TableCell align="center" sx={{ width: '80px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Items
                        </TableCell>
                        <TableCell align="right" sx={{ width: '130px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Total ( ₹ )
                        </TableCell>
                        <TableCell align="center" sx={{ width: '140px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingRecentBills ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                            <CircularProgress size={24} sx={{ color: '#1E40AF' }} />
                          </TableCell>
                        </TableRow>
                      ) : filteredRecentBills.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#64748B', fontSize: '12px' }}>
                            {billSearchTerm ? `No bills matching "${billSearchTerm}" found.` : 'No bills created yet.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecentBills.map((bill, index) => {
                          const totalAmt = parseFloat(String(bill.total || bill.amount || '0').replace(/,/g, '')) || 0;
                          const prodCount = (bill.products || []).length;

                          return (
                            <TableRow
                              key={bill._id || bill.id || index}
                              sx={{
                                '&:hover': { bgcolor: '#F1F7FD' },
                                '& td': { borderBottom: '1px solid #E2E8F0', py: 0.4 },
                              }}
                            >
                              <TableCell sx={{ fontSize: '12.5px', fontWeight: 800, color: '#1E40AF' }}>
                                #{bill.billNo}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                {bill.date}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                                {bill.customerName}
                              </TableCell>
                              <TableCell align="center" sx={{ fontSize: '12px', color: '#64748B' }}>
                                {prodCount}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>
                                ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                  {/* Edit Bill */}
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      const openBillEdit = () => {
                                        onEditBill ? onEditBill(bill) : handleOpenEditBill(bill);
                                      };

                                      const currentSystemYear = new Date().getFullYear();
                                      const billYr = Number(bill.year) || currentSystemYear;
                                      if (billYr < currentSystemYear || Number(selectedYear) < currentSystemYear) {
                                        triggerYearRestrictionDialog({
                                          selectedYear: String(billYr || selectedYear),
                                          currentSystemYear: String(currentSystemYear),
                                          title: 'Previous Year Bill',
                                          onProceed: () => openBillEdit(),
                                        });
                                        return;
                                      }
                                      openBillEdit();
                                    }}
                                    sx={{
                                      height: '24px',
                                      px: 1,
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

                                  {/* Print Bill */}
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePrintRecentBill(bill)}
                                    sx={{
                                      color: '#0F172A',
                                      bgcolor: '#EDF4FB',
                                      border: '1px solid #94A3B8',
                                      borderRadius: '2px',
                                      p: 0.3,
                                      '&:hover': { bgcolor: '#D9E4F2' },
                                    }}
                                  >
                                    <PrintOutlinedIcon sx={{ fontSize: 14 }} />
                                  </IconButton>

                                  {/* Delete Bill */}
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteRecentBill(bill)}
                                    sx={{
                                      color: '#DC2626',
                                      bgcolor: '#FEF2F2',
                                      border: '1px solid #FECACA',
                                      borderRadius: '2px',
                                      p: 0.3,
                                      '&:hover': { bgcolor: '#DC2626', color: '#FFFFFF' },
                                    }}
                                  >
                                    <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
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
            </>
          )}
        </Box>
      </Box>

      {/* Edit Customer Dialog */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '4px',
              border: '1px solid #9BB3CC',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            fontWeight: 700,
            fontSize: '13.5px',
            color: '#0F172A',
            py: 1,
            px: 2,
          }}
        >
          Edit Customer Details
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#F0F5FA', display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
              Customer Full Name *
            </Typography>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="erp-input"
              style={{ width: '100%' }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
              Mobile / Contact Number
            </Typography>
            <input
              type="text"
              value={editFormData.mobile}
              onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
              className="erp-input"
              style={{ width: '100%' }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
              Address / Town *
            </Typography>
            <textarea
              rows={2}
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              className="erp-input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
              GSTIN
            </Typography>
            <input
              type="text"
              value={editFormData.gst}
              onChange={(e) => setEditFormData({ ...editFormData, gst: e.target.value })}
              className="erp-input"
              style={{ width: '100%', textTransform: 'uppercase' }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#EDF4FB', borderTop: '1px solid #B0C4DE', p: 1 }}>
          <Button
            onClick={() => setOpenEditModal(false)}
            sx={{ textTransform: 'none', color: '#0F172A', fontWeight: 700, fontSize: '12px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={editLoading}
            variant="contained"
            size="small"
            sx={{
              bgcolor: '#741748',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'none',
              px: 2,
              borderRadius: '3px',
              '&:hover': { bgcolor: '#580e34' },
            }}
          >
            {editLoading ? <CircularProgress size={16} color="inherit" /> : 'Save Changes'}
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
              borderRadius: '4px',
              border: '1px solid #9BB3CC',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: '13.5px',
            color: '#0F172A',
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongRoundedIcon sx={{ color: '#0284C7', fontSize: 18 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
              Edit Bill #{editBillFormData.billNo}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#F0F5FA' }}>
          {/* Bill Metadata */}
          <fieldset className="erp-fieldset">
            <legend className="erp-legend">Bill & Customer Details</legend>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.2 }}>
              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', mb: 0.3 }}>
                  Bill Number *
                </Typography>
                <input
                  type="text"
                  value={editBillFormData.billNo}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, billNo: e.target.value })}
                  className="erp-input"
                  style={{ width: '100%', fontWeight: 700 }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', mb: 0.3 }}>
                  Bill Date *
                </Typography>
                <input
                  type="text"
                  value={editBillFormData.date}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, date: e.target.value })}
                  className="erp-input"
                  style={{ width: '100%' }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', mb: 0.3 }}>
                  Customer Name *
                </Typography>
                <input
                  type="text"
                  value={editBillFormData.customerName}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, customerName: e.target.value })}
                  className="erp-input"
                  style={{ width: '100%' }}
                />
              </Box>
            </Box>
          </fieldset>

          {/* Product Items Table */}
          <fieldset className="erp-fieldset">
            <legend className="erp-legend">Invoice Line Items</legend>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Button
                onClick={handleEditBillAddProductRow}
                startIcon={<AddRoundedIcon sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  height: '24px',
                  bgcolor: '#EDF4FB',
                  border: '1px solid #94A3B8',
                  color: '#1E40AF',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '2px',
                  '&:hover': { bgcolor: '#D9E4F2' },
                }}
              >
                Add Item
              </Button>
            </Box>

            <Box sx={{ border: '1px solid #B0C4DE', borderRadius: '3px', overflow: 'hidden', bgcolor: '#FFFFFF' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                    <TableCell sx={{ width: '40px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '11.5px' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '11.5px' }}>Product Particular</TableCell>
                    <TableCell sx={{ width: '75px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '11.5px' }}>Unit</TableCell>
                    <TableCell sx={{ width: '75px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '11.5px' }}>Qty</TableCell>
                    <TableCell sx={{ width: '90px', textAlign: 'right', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '11.5px' }}>Rate (₹)</TableCell>
                    <TableCell sx={{ width: '100px', textAlign: 'right', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '11.5px' }}>Total (₹)</TableCell>
                    <TableCell sx={{ width: '35px', textAlign: 'center', bgcolor: '#DCE7F5' }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editBillFormData.products.map((p, index) => {
                    const rowAmt = (parseFloat(p.quantity) || 0) * (parseFloat(p.rate) || 0);
                    return (
                      <TableRow key={index} sx={{ '& td': { borderBottom: '1px solid #E2E8F0', py: 0.3 } }}>
                        <TableCell sx={{ fontSize: '11.5px', color: '#64748B' }}>{index + 1}</TableCell>
                        <TableCell sx={{ p: 0.3 }}>
                          <input
                            type="text"
                            value={p.particular}
                            onChange={(e) => handleEditBillProductChange(index, 'particular', e.target.value)}
                            className="erp-input"
                            style={{ width: '100%', fontSize: '12px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ p: 0.3 }}>
                          <input
                            type="text"
                            value={p.pktUnit}
                            onChange={(e) => handleEditBillProductChange(index, 'pktUnit', e.target.value)}
                            className="erp-input"
                            style={{ width: '100%', fontSize: '11.5px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ p: 0.3 }}>
                          <input
                            type="number"
                            value={p.quantity}
                            onChange={(e) => handleEditBillProductChange(index, 'quantity', e.target.value)}
                            className="erp-input"
                            style={{ width: '100%', textAlign: 'center', fontSize: '12px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ p: 0.3 }}>
                          <input
                            type="number"
                            value={p.rate}
                            onChange={(e) => handleEditBillProductChange(index, 'rate', e.target.value)}
                            className="erp-input"
                            style={{ width: '100%', textAlign: 'right', fontSize: '12px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                          ₹{rowAmt.toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', p: 0.2 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditBillRemoveProductRow(index)}
                            disabled={editBillFormData.products.length <= 1}
                            sx={{ color: '#DC2626', p: 0.2 }}
                          >
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </fieldset>

          {/* Bill Summary & Calculations */}
          <fieldset className="erp-fieldset">
            <legend className="erp-legend">Summary & Calculations</legend>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' }, gap: 1, alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', mb: 0.2 }}>Subtotal</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                  ₹{editBillCalculations.subtotal.toFixed(2)}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', mb: 0.2 }}>Discount (₹)</Typography>
                <input
                  type="number"
                  value={editBillFormData.discount}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, discount: e.target.value })}
                  className="erp-input"
                  style={{ width: '100%', textAlign: 'right' }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', mb: 0.2 }}>Transport (₹)</Typography>
                <input
                  type="number"
                  value={editBillFormData.transport}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, transport: e.target.value })}
                  className="erp-input"
                  style={{ width: '100%', textAlign: 'right' }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A', mb: 0.2 }}>Packing (₹)</Typography>
                <input
                  type="number"
                  value={editBillFormData.packing}
                  onChange={(e) => setEditBillFormData({ ...editBillFormData, packing: e.target.value })}
                  className="erp-input"
                  style={{ width: '100%', textAlign: 'right' }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#0F172A', mb: 0.2 }}>Grand Total</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 900, color: '#741748' }}>
                  ₹{editBillCalculations.grandTotal.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </fieldset>
        </DialogContent>

        <DialogActions sx={{ p: 1, bgcolor: '#EDF4FB', borderTop: '1px solid #B0C4DE', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={() => setOpenEditBillModal(false)}
            disabled={editBillLoading}
            sx={{ textTransform: 'none', color: '#0F172A', fontWeight: 700, fontSize: '12px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEditBill}
            disabled={editBillLoading}
            variant="contained"
            size="small"
            sx={{
              bgcolor: '#741748',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'none',
              px: 2.5,
              borderRadius: '3px',
              '&:hover': { bgcolor: '#580e34' },
            }}
          >
            {editBillLoading ? <CircularProgress size={16} color="inherit" /> : 'Save Bill Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
