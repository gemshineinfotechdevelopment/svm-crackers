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
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import { ParticularsApi } from '../services/api';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';
import { DateRangePrintModal } from './DateRangePrintModal';
import { printParticularsListDirectly } from '../utils/printUtils';
import { getStoredSettings } from './SettingsPage';
import {
  getActiveBillingYear,
  setActiveBillingYear,
  getStandardYearOptions,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';
import { getSelectedBillYear } from '../utils/billYearUtils';

interface SalesPageProps {
  onNewQuotation?: () => void;
  onEditBill?: (bill: any) => void;
}

export const SalesPage: FC<SalesPageProps> = ({ onNewQuotation, onEditBill }) => {
  const [storeSettings, setStoreSettings] = useState(() => getStoredSettings());
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Year state ('ALL' or specific year)
  const [selectedYear, setSelectedYear] = useState<number | string>(() => {
    return getActiveBillingYear() || new Date().getFullYear();
  });
  const yearOptions = useMemo(() => getStandardYearOptions(), []);

  // Print modal state
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

  // Date Range Print Modal State
  const [openDatePrintModal, setOpenDatePrintModal] = useState<boolean>(false);

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

  // Filtered bills
  const filteredBills = useMemo(() => {
    if (!searchTerm.trim()) return bills;
    const term = searchTerm.toLowerCase().trim();
    return bills.filter(
      (b) =>
        (b.billNo && b.billNo.toLowerCase().includes(term)) ||
        (b.customerName && b.customerName.toLowerCase().includes(term)) ||
        (b.customerPhone && b.customerPhone.includes(term)) ||
        (b.customerMobile && b.customerMobile.includes(term)) ||
        (b.customerAddress && b.customerAddress.toLowerCase().includes(term)) ||
        (b.companyName && b.companyName.toLowerCase().includes(term)) ||
        (b.date && b.date.toLowerCase().includes(term)) ||
        (String(b.total || b.amount || '').includes(term))
    );
  }, [bills, searchTerm]);

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
    } catch (err: any) {
      console.error('Failed to delete bill:', err);
      alert(err.message || 'Error deleting bill');
    }
  };

  const handlePrintBill = (bill: any) => {
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
              Sales Register (Quotation Bills)
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
          </Box>

          {/* Right: Year Filter + Quick Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
              Print Sales Report
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

            {/* New Quotation Button */}
            {onNewQuotation && (
              <Button
                onClick={onNewQuotation}
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
                + New Quotation
              </Button>
            )}
          </Box>
        </Box>

        {/* Content Body */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
          {/* Summary Stats Banner & Search */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              mb: 1.2,
              bgcolor: '#FFFFFF',
              border: '1px solid #B0C4DE',
              borderRadius: '3px',
              p: 1,
              flexWrap: 'wrap',
            }}
          >
            {/* Search Input */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, minWidth: '240px' }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                Search Sales Bills:
              </Typography>
              <input
                type="text"
                placeholder="Search by Bill No, Customer, Phone, City..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="erp-input"
                style={{ flex: 1, maxWidth: '360px' }}
              />
              {searchTerm && (
                <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.2 }}>
                  <ClearRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>

            {/* Summary KPI Badges */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
                    Total Discount:
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
            <TableContainer sx={{ maxHeight: 'calc(100vh - 230px)', minHeight: '400px' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                    <TableCell sx={{ width: '50px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      #
                    </TableCell>
                    <TableCell sx={{ width: '90px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Bill No
                    </TableCell>
                    <TableCell sx={{ width: '100px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Date
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Customer Name
                    </TableCell>
                    <TableCell sx={{ width: '130px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Mobile / Phone
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Address / City
                    </TableCell>
                    <TableCell align="center" sx={{ width: '80px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Items
                    </TableCell>
                    <TableCell align="right" sx={{ width: '110px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Net Amount (₹)
                    </TableCell>
                    <TableCell align="center" sx={{ width: '170px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
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
                          {searchTerm
                            ? 'No sales bills matching your search.'
                            : selectedYear === 'ALL'
                              ? 'No quotation bills found in database.'
                              : `No quotation bills created for Year ${selectedYear}.`}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1.5 }}>
                          {selectedYear !== 'ALL' && (
                            <Button
                              onClick={() => handleYearChangeFromDropdown('ALL')}
                              size="small"
                              variant="outlined"
                              sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                              Show All Years
                            </Button>
                          )}
                          {onNewQuotation && !searchTerm && (
                            <Button
                              onClick={onNewQuotation}
                              size="small"
                              variant="contained"
                              sx={{ bgcolor: '#1E40AF', textTransform: 'none', fontWeight: 700 }}
                            >
                              + Create First Quotation
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

                      return (
                        <TableRow
                          key={id || index}
                          hover
                          sx={{
                            '&:nth-of-type(even)': { bgcolor: '#F8FAFC' },
                            '&:hover': { bgcolor: '#EBF3FB !important' },
                          }}
                        >
                          {/* S.No */}
                          <TableCell sx={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                            {index + 1}
                          </TableCell>

                          {/* Bill No */}
                          <TableCell sx={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF' }}>
                            <Box
                              onClick={() => handlePrintBill(bill)}
                              sx={{
                                display: 'inline-block',
                                bgcolor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                px: 0.8,
                                py: 0.2,
                                borderRadius: '3px',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#DBEAFE', textDecoration: 'underline' },
                              }}
                            >
                              #{bill.billNo || 'N/A'}
                            </Box>
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
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.6 }}>
                              {/* Print Button */}
                              <Tooltip title="View & Print Bill">
                                <Button
                                  size="small"
                                  onClick={() => handlePrintBill(bill)}
                                  startIcon={<PrintOutlinedIcon sx={{ fontSize: 13 }} />}
                                  sx={{
                                    height: '24px',
                                    px: 1,
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

                              {/* Edit Button */}
                              {onEditBill && (
                                <Tooltip title="Edit Bill in Quotation Page">
                                  <Button
                                    size="small"
                                    onClick={() => onEditBill(bill)}
                                    startIcon={<EditRoundedIcon sx={{ fontSize: 13 }} />}
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
          </Box>
        </Box>
      </Box>

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
          title="Sales Quotation Bills Report"
          subtitle="Filter and print Quotation Bills list on standard A4 format"
          items={filteredBills}
          getDateFromItem={(item) => item.date || item.createdAt || ''}
          onConfirmPrint={(items, dateRangeText) => {
            printParticularsListDirectly(items, dateRangeText);
          }}
        />
      )}
    </Box>
  );
};
