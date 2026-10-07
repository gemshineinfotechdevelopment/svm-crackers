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
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { CustomersApi, AccountsApi, CompaniesApi } from '../services/api';
import { printCustomerListDirectly } from '../utils/printUtils';
import { DateRangePrintModal } from './DateRangePrintModal';
import { getStoredSettings } from './SettingsPage';

export interface Customer {
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
  totalDebit?: number;
  totalCredit?: number;
  pendingDue?: number;
  netBalance?: number;
  status?: 'PENDING' | 'SETTLED' | 'ADVANCE';
}

interface CustomersPageProps {
  onAddNew?: () => void;
  onSelectCustomerForParticular?: (customerName: string, subTab?: 'Account Details' | 'Create Particular') => void;
}

export const CustomersPage: FC<CustomersPageProps> = ({ onAddNew, onSelectCustomerForParticular }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Customer Dialog State
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    gst: '',
    address: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Quick Payment / Add Credit Modal State
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openDatePrintModal, setOpenDatePrintModal] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    companyName: '',
    creditAmount: '',
    date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

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

  const fetchCompanies = async () => {
    try {
      const data = await CompaniesApi.getAll();
      setCompanies(data || []);
      if (data && data.length > 0 && !paymentForm.companyName) {
        setPaymentForm((prev) => ({ ...prev, companyName: data[0].name }));
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchCompanies();
  }, []);

  const handleOpenEdit = (customer: Customer) => {
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
      fetchCustomers();
    } catch (err) {
      console.error('Failed to update customer:', err);
      alert('Error updating customer');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this customer? This will also delete all associated particular bills and account ledger records.'
      )
    )
      return;
    try {
      const deletedCust = customers.find((c) => (c._id || c.id) === id);
      await CustomersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== id));
      if (deletedCust && (localStorage.getItem('apsara_active_customer') === deletedCust.name || localStorage.getItem('varun_active_customer') === deletedCust.name)) {
        localStorage.removeItem('apsara_active_customer');
        localStorage.removeItem('varun_active_customer');
        localStorage.removeItem('dheeksha_active_customer');
      }
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert('Error deleting customer');
    }
  };

  const handleOpenPayment = (customer: Customer) => {
    setPaymentCustomer(customer);
    const due = customer.pendingDue || 0;
    const storeSettings = getStoredSettings();
    setPaymentForm({
      companyName: companies.length > 0 ? companies[0].name : (storeSettings.companyName || 'Apsara Crackers'),
      creditAmount: due > 0 ? String(due) : '',
      date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
    });
    setOpenPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!paymentCustomer) return;
    const amountNum = parseFloat(paymentForm.creditAmount.replace(/,/g, ''));
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setPaymentLoading(true);
      await AccountsApi.addCredit({
        customerName: paymentCustomer.name,
        companyName: paymentForm.companyName || 'General',
        creditAmount: amountNum.toFixed(2),
        date: paymentForm.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      });
      setOpenPaymentModal(false);
      await fetchCustomers();
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert('Error recording payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.gst.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.mobile.includes(searchTerm) ||
        (c.idCode && c.idCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

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
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h1"
            sx={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#B91C1C',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            Customers
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#786C58', mt: 0.3, fontWeight: 600 }}>
            Customer directory with live Debit (Purchases), Credit (Paid/Advance), and Balance
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            width: { xs: '100%', sm: 'auto' },
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
              height: '38px',
              width: { xs: '100%', sm: '250px' },
              boxSizing: 'border-box',
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
                fontSize: 19,
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
          </Box>

          {/* Print Customers List Button with Date Range Filter */}
          <Button
            variant="outlined"
            onClick={() => setOpenDatePrintModal(true)}
            startIcon={<PrintOutlinedIcon sx={{ fontSize: 18 }} />}
            sx={{
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              borderColor: '#FCD34D',
              borderWidth: '1.5px',
              height: '38px',
              px: 1.8,
              borderRadius: '8px',
              fontSize: '13px',
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
            Print List ({filteredCustomers.length})
          </Button>

          {/* Add New Customer Button */}
          {onAddNew && (
            <Button
              variant="contained"
              disableElevation
              onClick={onAddNew}
              startIcon={<AddRoundedIcon sx={{ fontSize: 19 }} />}
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                border: '1px solid #F59E0B',
                height: '38px',
                px: 2,
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
              Add New Customer
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Table Card */}
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
          <Table sx={{ minWidth: 900 }} aria-label="customers table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: 2.5,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '80px',
                  }}
                >
                  ID
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: 2.5,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  CUSTOMER NAME
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: 2.5,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  ADDRESS & CONTACT
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    py: 1.6,
                    px: 2.5,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#B91C1C',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '130px',
                  }}
                >
                  DEBIT (DR)
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    py: 1.6,
                    px: 2.5,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#059669',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '130px',
                  }}
                >
                  CREDIT (CR)
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    py: 1.6,
                    px: 2.5,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '140px',
                  }}
                >
                  NET BALANCE
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    py: 1.6,
                    px: 2.5,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '190px',
                  }}
                >
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#786C58' }}>
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer, index) => {
                  const isLast = index === filteredCustomers.length - 1;
                  const recordId = customer._id || customer.id || '';
                  const idDisplay = customer.idCode || `#${(index + 1).toString().padStart(4, '0')}`;
                  const avatarInitial = customer.avatarLetter || customer.name.charAt(0).toUpperCase();

                  const totalDebitNum = customer.totalDebit || 0;
                  const totalCreditNum = customer.totalCredit || 0;
                  const pendingDueNum = customer.pendingDue || 0;
                  const netBalanceNum = customer.netBalance || 0;

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
                          py: 1.6,
                          px: 2.5,
                          fontSize: '13px',
                          color: '#64748B',
                          fontWeight: 600,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {idDisplay}
                      </TableCell>

                      {/* Customer Name with Avatar */}
                      <TableCell
                        sx={{
                          py: 1.6,
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
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              backgroundColor: customer.avatarBg || '#F1F5F9',
                              color: customer.avatarColor || '#B91C1C',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13.5px',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {avatarInitial}
                          </Box>
                          <Box>
                            <Typography
                              sx={{
                                fontSize: '14px',
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
                            {customer.gst && customer.gst !== 'N/A' && (
                              <Typography sx={{ fontSize: '11px', color: '#786C58', fontWeight: 600 }}>
                                GST: {customer.gst}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Address & Mobile */}
                      <TableCell
                        sx={{
                          py: 1.6,
                          px: 2.5,
                          fontSize: '13px',
                          color: '#334155',
                          fontWeight: 500,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Typography sx={{ fontSize: '13px', color: '#334155', fontWeight: 500, maxWidth: '220px' }}>
                          {customer.address}
                        </Typography>
                        <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                          📞 {customer.mobile || 'N/A'}
                        </Typography>
                      </TableCell>

                      {/* Total Debit (Dr) */}
                      <TableCell
                        align="right"
                        sx={{
                          py: 1.6,
                          px: 2.5,
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: '#1E293B',
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        ₹{totalDebitNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>

                      {/* Total Credit (Cr) */}
                      <TableCell
                        align="right"
                        sx={{
                          py: 1.6,
                          px: 2.5,
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: '#16A34A',
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        ₹{totalCreditNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>

                      {/* Net Balance / Status */}
                      <TableCell
                        align="right"
                        sx={{
                          py: 1.6,
                          px: 2.5,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {pendingDueNum > 0 ? (
                          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#DC2626' }}>
                              ₹{pendingDueNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Typography>
                            <Chip
                              label="Due"
                              size="small"
                              sx={{
                                height: '18px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626',
                                borderRadius: '4px',
                                mt: 0.2,
                              }}
                            />
                          </Box>
                        ) : netBalanceNum > 0 ? (
                          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#0284C7' }}>
                              +₹{netBalanceNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Typography>
                            <Chip
                              label="Advance"
                              size="small"
                              sx={{
                                height: '18px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: '#E0F2FE',
                                color: '#0284C7',
                                borderRadius: '4px',
                                mt: 0.2,
                              }}
                            />
                          </Box>
                        ) : (
                          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#16A34A' }}>
                              ₹0.00
                            </Typography>
                            <Chip
                              label="Settled"
                              size="small"
                              sx={{
                                height: '18px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: '#DCFCE7',
                                color: '#16A34A',
                                borderRadius: '4px',
                                mt: 0.2,
                              }}
                            />
                          </Box>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.6,
                          px: 2,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8 }}>
                          {/* Statement Button */}
                          <Tooltip title="View Statement" arrow>
                            <IconButton
                              size="small"
                              onClick={() => onSelectCustomerForParticular?.(customer.name, 'Account Details')}
                              sx={{
                                color: '#1E40AF',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '6px',
                                p: 0.7,
                                '&:hover': {
                                  color: '#FFFFFF',
                                  backgroundColor: '#1E40AF',
                                  borderColor: '#1E40AF',
                                },
                              }}
                            >
                              <AccountBalanceWalletRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>

                          {/* Record Payment Button */}
                          <Tooltip title="Record Payment / Credit" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenPayment(customer)}
                              sx={{
                                color: '#059669',
                                backgroundColor: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                borderRadius: '6px',
                                p: 0.7,
                                '&:hover': {
                                  color: '#FFFFFF',
                                  backgroundColor: '#059669',
                                  borderColor: '#059669',
                                },
                              }}
                            >
                              <PaymentsRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>

                          {/* Edit Customer Button */}
                          <Tooltip title="Edit Customer" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(customer)}
                              sx={{
                                color: '#D97706',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                p: 0.7,
                                '&:hover': {
                                  color: '#FFFFFF',
                                  backgroundColor: '#D97706',
                                  borderColor: '#D97706',
                                },
                              }}
                            >
                              <ModeEditOutlineRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>

                          {/* Delete Customer Button */}
                          <Tooltip title="Delete Customer" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(recordId)}
                              sx={{
                                color: '#DC2626',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '6px',
                                p: 0.7,
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

      {/* Quick Payment Modal */}
      <Dialog
        open={openPaymentModal}
        onClose={() => setOpenPaymentModal(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: '12px', p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', pb: 0.5 }}>
          Record Payment / Credit
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {paymentCustomer && (
              <Box sx={{ p: 1.5, borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Typography sx={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Customer</Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  {paymentCustomer.name}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Credit Amount (₹) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                placeholder="Enter amount"
                value={paymentForm.creditAmount}
                onChange={(e) => setPaymentForm({ ...paymentForm, creditAmount: e.target.value })}
                slotProps={{
                  input: { sx: { fontSize: '14px', fontWeight: 700, borderRadius: '6px' } },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Company / Account
              </Typography>
              <Autocomplete
                fullWidth
                size="small"
                autoHighlight
                options={companies.length > 0 ? companies.map((c) => c.name) : ['General']}
                value={paymentForm.companyName || null}
                onChange={(_, val) => setPaymentForm({ ...paymentForm, companyName: val || '' })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select company..."
                    sx={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                    }}
                  />
                )}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Payment Date
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                placeholder="DD-MM-YYYY"
                slotProps={{
                  input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '6px' } },
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setOpenPaymentModal(false)} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSavePayment}
            disabled={paymentLoading}
            sx={{
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              px: 2.5,
              borderRadius: '6px',
              '&:hover': { backgroundColor: '#15803D' },
            }}
          >
            {paymentLoading ? 'Saving...' : 'Record Credit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Customer Dialog Modal */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', pb: 1 }}>
          Edit Customer Details
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Full Name / Business Name *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                slotProps={{
                  input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '6px' } },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Mobile Number
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editFormData.mobile}
                onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                slotProps={{
                  input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '6px' } },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                GSTIN
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editFormData.gst}
                onChange={(e) => setEditFormData({ ...editFormData, gst: e.target.value })}
                slotProps={{
                  input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '6px' } },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Address *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                slotProps={{
                  input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '6px' } },
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setOpenEditModal(false)}
            sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}
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
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              px: 2.5,
              borderRadius: '6px',
              '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
            }}
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date Range Filter Print Modal */}
      <DateRangePrintModal
        open={openDatePrintModal}
        onClose={() => setOpenDatePrintModal(false)}
        title="Print Customers Directory & Balances"
        subtitle="Select transaction date range to filter customer records for A4 print."
        items={filteredCustomers}
        getDateFromItem={(c) => (c as any).lastTransactionDate || ''}
        onConfirmPrint={(itemsToPrint, rangeText) => {
          printCustomerListDirectly(
            itemsToPrint,
            'CUSTOMERS DIRECTORY & BALANCES MASTER LIST',
            rangeText
          );
        }}
      />
    </Box>
  );
};
