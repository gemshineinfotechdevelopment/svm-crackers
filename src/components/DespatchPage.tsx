import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Autocomplete,
  Chip,
  Divider,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SortRoundedIcon from '@mui/icons-material/SortRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { DespatchApi, CustomersApi, ParticularsApi } from '../services/api';
import { getActiveBillingYear, getStandardYearOptions, YEAR_CHANGE_EVENT } from '../utils/yearContext';
import { getStoredSettings } from './SettingsPage';
import { parseDateToTimestamp } from '../utils/printUtils';

export interface DespatchItem {
  _id?: string;
  id?: string;
  sNo: number | string;
  date: string;
  partyName: string;
  place: string;
  bundles: number | string;
  transport: string;
  lrNo: string;
  partyNo: string;
  agent: string;
  billNo?: string;
  billType?: string;
  billId?: string;
  year?: number | string;
  status?: string;
  remarks?: string;
}

type DespatchSortField = 'sNo' | 'billNo' | 'date' | 'partyName' | 'place' | 'bundles' | 'transport' | 'lrNo';
type DespatchSortOrder = 'asc' | 'desc';

export const DespatchPage: React.FC = () => {
  const [despatches, setDespatches] = useState<DespatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Particular Bill Filter state ('ALL' or specific Bill No)
  const [selectedBillNo, setSelectedBillNo] = useState<string>('ALL');

  // Sorting state ('short pannura option')
  const [sortBy, setSortBy] = useState<DespatchSortField>('sNo');
  const [sortOrder, setSortOrder] = useState<DespatchSortOrder>('desc');

  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(() => {
    return getActiveBillingYear();
  });
  const yearOptions = useMemo(() => getStandardYearOptions(), []);

  // Customer options and bills options for auto-filling
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [billsList, setBillsList] = useState<any[]>([]);

  // Dialog state for Add / Edit
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<DespatchItem | null>(null);

  // Form fields
  const [formSNo, setFormSNo] = useState<string>('');
  const [formBillNo, setFormBillNo] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formPartyName, setFormPartyName] = useState<string>('');
  const [formPlace, setFormPlace] = useState<string>('');
  const [formBundles, setFormBundles] = useState<string>('1');
  const [formTransport, setFormTransport] = useState<string>('');
  const [formLrNo, setFormLrNo] = useState<string>('');
  const [formPartyNo, setFormPartyNo] = useState<string>('');
  const [formAgent, setFormAgent] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Details Modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedDespatchForDetails, setSelectedDespatchForDetails] = useState<DespatchItem | null>(null);

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const fetchDespatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DespatchApi.getAll({
        year: selectedYear === 'ALL' ? undefined : selectedYear,
      });
      const list = Array.isArray(res) ? res : res?.data || [];
      setDespatches(list);
    } catch (err: any) {
      console.error('Failed to fetch despatches:', err);
      setSnackbarMessage(err.message || 'Failed to load despatches');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  const fetchCustomersAndBills = async () => {
    try {
      const custRes: any = await CustomersApi.getAll();
      const cList = Array.isArray(custRes) ? custRes : custRes?.data || [];
      setCustomerOptions(cList);
    } catch {
      // Silently ignore
    }

    try {
      const bRes = await ParticularsApi.getAll(undefined, 'ALL', selectedYear === 'ALL' ? undefined : selectedYear);
      setBillsList(Array.isArray(bRes) ? bRes : []);
    } catch {
      // Silently ignore
    }
  };

  useEffect(() => {
    fetchDespatches();
    fetchCustomersAndBills();
  }, [fetchDespatches]);

  // Sync with global year change
  useEffect(() => {
    const handleYearChange = (e: any) => {
      const newYear = e.detail?.year;
      if (newYear) {
        setSelectedYear(newYear === 'ALL' ? 'ALL' : Number(newYear));
      }
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    return () => window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
  }, []);

  // Helper to extract integer value for sorting
  const extractNumeric = (val: any): number => {
    if (val === undefined || val === null) return 0;
    const clean = String(val).replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  };

  // Distinct bills list for Quick Particular Bill Filter
  const distinctBillOptions = useMemo(() => {
    const map = new Map<string, { partyName: string; date: string }>();

    // From loaded despatches
    despatches.forEach((d) => {
      const bNo = String(d.billNo || '').trim();
      if (bNo && !map.has(bNo)) {
        map.set(bNo, { partyName: d.partyName, date: d.date });
      }
    });

    // From loaded bills
    billsList.forEach((b) => {
      const bNo = String(b.billNo || '').trim();
      if (bNo && !map.has(bNo)) {
        map.set(bNo, { partyName: b.customerName || 'Customer', date: b.date || '' });
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => extractNumeric(b[0]) - extractNumeric(a[0]))
      .map(([billNo, info]) => ({
        billNo,
        label: `#${billNo} - ${info.partyName}`,
        partyName: info.partyName,
        date: info.date,
      }));
  }, [despatches, billsList]);

  // Handle column header clicks for sorting
  const handleSortToggle = (field: DespatchSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      // Sensible defaults: Names & places ascend, S.No/BillNo/Bundles descend
      setSortOrder(field === 'partyName' || field === 'place' ? 'asc' : 'desc');
    }
  };

  const handleOpenAddModal = async () => {
    setEditingItem(null);
    setFormBillNo('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPartyName('');
    setFormPlace('');
    setFormBundles('1');
    setFormTransport('');
    setFormLrNo('');
    setFormPartyNo('');
    setFormAgent('');

    try {
      const nextRes = await DespatchApi.getNextSNo(selectedYear === 'ALL' ? undefined : selectedYear);
      setFormSNo(String(nextRes?.nextSNo || '1'));
    } catch {
      setFormSNo('1');
    }

    setModalOpen(true);
  };

  const handleOpenEditModal = (item: DespatchItem) => {
    setEditingItem(item);
    setFormSNo(String(item.sNo || ''));
    setFormBillNo(item.billNo || '');
    setFormDate(item.date || '');
    setFormPartyName(item.partyName || '');
    setFormPlace(item.place || '');
    setFormBundles(String(item.bundles || '1'));
    setFormTransport(item.transport || '');
    setFormLrNo(item.lrNo || '');
    setFormPartyNo(item.partyNo || '');
    setFormAgent(item.agent || '');
    setModalOpen(true);
  };

  // When selecting a bill in the Add/Edit form, auto-fill party, destination, bundles, transport
  const handleBillSelectForForm = (billNumber: string) => {
    setFormBillNo(billNumber);
    const matchedBill = billsList.find(
      (b) => String(b.billNo || '').trim().toLowerCase() === billNumber.trim().toLowerCase()
    );
    if (matchedBill) {
      if (matchedBill.customerName) setFormPartyName(matchedBill.customerName);
      const place = matchedBill.despatchTo || matchedBill.customerAddress || '';
      if (place) setFormPlace(place);
      const phone = matchedBill.customerPhone || matchedBill.customerMobile || '';
      if (phone) setFormPartyNo(phone);
      const transport = matchedBill.lorryTransport || matchedBill.transport || '';
      if (transport) setFormTransport(transport);
      if (matchedBill.lrNo) setFormLrNo(matchedBill.lrNo);
      const bundles =
        matchedBill.caseCount ||
        (matchedBill.products
          ? matchedBill.products.reduce((acc: number, p: any) => acc + (parseFloat(p.quantity) || 0), 0)
          : '1');
      if (bundles) setFormBundles(String(bundles));
    }
  };

  const handlePartyNameSelect = (partyName: string) => {
    setFormPartyName(partyName);
    const matchedCustomer = customerOptions.find(
      (c) => c.name?.toLowerCase().trim() === partyName.toLowerCase().trim()
    );
    if (matchedCustomer) {
      if (matchedCustomer.address && !formPlace) {
        setFormPlace(matchedCustomer.address);
      }
      if (matchedCustomer.mobile && !formPartyNo) {
        setFormPartyNo(matchedCustomer.mobile);
      }
      if (matchedCustomer.phone && !formPartyNo) {
        setFormPartyNo(matchedCustomer.phone);
      }
    }
  };

  const handleSaveDespatch = async () => {
    if (!formPartyName.trim()) {
      setSnackbarMessage('Party Name is required.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        sNo: formSNo.trim() || undefined,
        billNo: formBillNo.trim() || undefined,
        date: formDate.trim() || new Date().toISOString().split('T')[0],
        partyName: formPartyName.trim(),
        place: formPlace.trim(),
        bundles: formBundles.trim() || '1',
        transport: formTransport.trim(),
        lrNo: formLrNo.trim(),
        partyNo: formPartyNo.trim(),
        agent: formAgent.trim(),
        year: selectedYear === 'ALL' ? new Date().getFullYear() : selectedYear,
      };

      if (editingItem && (editingItem._id || editingItem.id)) {
        const id = (editingItem._id || editingItem.id)!;
        await DespatchApi.update(id, payload);
        setSnackbarMessage('Despatch entry updated successfully.');
      } else {
        await DespatchApi.create(payload);
        setSnackbarMessage('Despatch entry created successfully.');
      }

      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setModalOpen(false);
      fetchDespatches();
    } catch (err: any) {
      console.error('Failed to save despatch:', err);
      setSnackbarMessage(err.message || 'Failed to save despatch entry');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDespatch = async (item: DespatchItem) => {
    const id = item._id || item.id;
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete Despatch entry for "${item.partyName}" (S.No: ${item.sNo})?`)) {
      return;
    }

    try {
      await DespatchApi.delete(id);
      setDespatches((prev) => prev.filter((d) => (d._id || d.id) !== id));
      if (selectedBillNo === String(item.billNo || '')) {
        setSelectedBillNo('ALL');
      }
      setSnackbarMessage('Despatch entry deleted.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err: any) {
      console.error('Failed to delete despatch:', err);
      setSnackbarMessage(err.message || 'Error deleting despatch');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSyncBills = async () => {
    setSyncing(true);
    try {
      const res = await DespatchApi.syncBills(selectedYear === 'ALL' ? undefined : selectedYear);
      setSnackbarMessage(res?.message || 'Despatches synchronized from Bills successfully.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchDespatches();
    } catch (err: any) {
      console.error('Failed to sync bills:', err);
      setSnackbarMessage(err.message || 'Failed to sync from bills');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSyncing(false);
    }
  };

  // WhatsApp share handler
  const handleWhatsAppShare = (item: DespatchItem) => {
    const storeSettings = getStoredSettings();
    const firm = storeSettings.companyName || 'S.V.M Fireworks Agencies';

    const text =
      `📦 *DESPATCH DETAILS*\n` +
      `*${firm}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      (item.billNo ? `*Bill No:* #${item.billNo}\n` : '') +
      `*S.No:* ${item.sNo}\n` +
      `*Date:* ${item.date}\n` +
      `*Party Name:* ${item.partyName}\n` +
      `*Place:* ${item.place || '-'}\n` +
      `*Bundles:* ${item.bundles || '1'}\n` +
      `*Transport:* ${item.transport || '-'}\n` +
      `*L.R. No:* ${item.lrNo || '-'}\n` +
      `*Agent:* ${item.agent || '-'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for your business!`;

    const phone = String(item.partyNo || '').replace(/\D/g, '');
    let url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (phone) {
      const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
      url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
    }
    window.open(url, '_blank');
  };

  // Filtered and Sorted Despatches
  const filteredDespatches = useMemo(() => {
    let result = despatches;

    // 1. Filter by particular Bill No
    if (selectedBillNo && selectedBillNo !== 'ALL') {
      result = result.filter(
        (d) => String(d.billNo || '').trim().toLowerCase() === selectedBillNo.trim().toLowerCase()
      );
    }

    // 2. Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((d) => {
        return (
          String(d.sNo || '').toLowerCase().includes(term) ||
          String(d.billNo || '').toLowerCase().includes(term) ||
          (d.date && d.date.toLowerCase().includes(term)) ||
          (d.partyName && d.partyName.toLowerCase().includes(term)) ||
          (d.place && d.place.toLowerCase().includes(term)) ||
          (d.transport && d.transport.toLowerCase().includes(term)) ||
          (d.lrNo && d.lrNo.toLowerCase().includes(term)) ||
          (d.partyNo && d.partyNo.toLowerCase().includes(term)) ||
          (d.agent && d.agent.toLowerCase().includes(term))
        );
      });
    }

    // 3. Sorting
    const sorted = [...result].sort((a, b) => {
      if (sortBy === 'sNo') {
        const numA = extractNumeric(a.sNo);
        const numB = extractNumeric(b.sNo);
        if (numA !== numB) return sortOrder === 'asc' ? numA - numB : numB - numA;
        return sortOrder === 'asc' ? String(a.sNo).localeCompare(String(b.sNo)) : String(b.sNo).localeCompare(String(a.sNo));
      }
      if (sortBy === 'billNo') {
        const numA = extractNumeric(a.billNo);
        const numB = extractNumeric(b.billNo);
        if (numA !== numB) return sortOrder === 'asc' ? numA - numB : numB - numA;
        return sortOrder === 'asc'
          ? String(a.billNo || '').localeCompare(String(b.billNo || ''))
          : String(b.billNo || '').localeCompare(String(a.billNo || ''));
      }
      if (sortBy === 'date') {
        const timeA = parseDateToTimestamp(a.date);
        const timeB = parseDateToTimestamp(b.date);
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (sortBy === 'partyName') {
        const nameA = String(a.partyName || '').toLowerCase();
        const nameB = String(b.partyName || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortBy === 'place') {
        const plA = String(a.place || '').toLowerCase();
        const plB = String(b.place || '').toLowerCase();
        return sortOrder === 'asc' ? plA.localeCompare(plB) : plB.localeCompare(plA);
      }
      if (sortBy === 'bundles') {
        const bA = parseFloat(String(a.bundles || '0').replace(/[^0-9.]/g, '')) || 0;
        const bB = parseFloat(String(b.bundles || '0').replace(/[^0-9.]/g, '')) || 0;
        return sortOrder === 'asc' ? bA - bB : bB - bA;
      }
      if (sortBy === 'transport') {
        const tA = String(a.transport || '').toLowerCase();
        const tB = String(b.transport || '').toLowerCase();
        return sortOrder === 'asc' ? tA.localeCompare(tB) : tB.localeCompare(tA);
      }
      if (sortBy === 'lrNo') {
        return sortOrder === 'asc'
          ? String(a.lrNo || '').localeCompare(String(b.lrNo || ''))
          : String(b.lrNo || '').localeCompare(String(a.lrNo || ''));
      }
      return 0;
    });

    return sorted;
  }, [despatches, selectedBillNo, searchTerm, sortBy, sortOrder]);

  // Statistics
  const totalBundles = useMemo(() => {
    return filteredDespatches.reduce((acc, d) => {
      const b = parseFloat(String(d.bundles || '0').replace(/[^0-9.]/g, '')) || 0;
      return acc + b;
    }, 0);
  }, [filteredDespatches]);

  // Export CSV (includes Bill No)
  const handleExportCsv = () => {
    if (filteredDespatches.length === 0) {
      alert('No despatch records to export.');
      return;
    }
    const headers = [
      'S NO',
      'Bill No',
      'Date',
      'Party Name',
      'Place',
      'Bundles',
      'Transport',
      'L R NO',
      'Party NO',
      'Agent',
    ];
    const rows = filteredDespatches.map((d) => [
      d.sNo,
      `"${d.billNo || ''}"`,
      `"${d.date || ''}"`,
      `"${(d.partyName || '').replace(/"/g, '""')}"`,
      `"${(d.place || '').replace(/"/g, '""')}"`,
      d.bundles || '1',
      `"${(d.transport || '').replace(/"/g, '""')}"`,
      `"${(d.lrNo || '').replace(/"/g, '""')}"`,
      `"${(d.partyNo || '').replace(/"/g, '""')}"`,
      `"${(d.agent || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent([headers.join(','), ...rows.map((e) => e.join(','))].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const fileNameSuffix =
      selectedBillNo !== 'ALL'
        ? `Bill_${selectedBillNo}`
        : `${selectedYear}_${new Date().toISOString().slice(0, 10)}`;
    link.setAttribute('download', `Despatch_Register_${fileNameSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Sheet (includes Bill No)
  const handlePrintSheet = () => {
    const storeSettings = getStoredSettings();
    const firmName = storeSettings.companyName || 'S.V.M Fireworks Agencies';

    const rowsHtml = filteredDespatches
      .map(
        (d, idx) => `
        <tr style="border-bottom: 1px solid #CBD5E1; font-size: 12px; ${idx % 2 === 1 ? 'background-color: #F8FAFC;' : ''}">
          <td style="padding: 6px 8px; text-align: center; font-weight: 700; border-right: 1px solid #E2E8F0;">${d.sNo}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #1E40AF; border-right: 1px solid #E2E8F0;">${d.billNo ? '#' + d.billNo : '-'}</td>
          <td style="padding: 6px 8px; text-align: center; border-right: 1px solid #E2E8F0;">${d.date}</td>
          <td style="padding: 6px 10px; font-weight: 700; text-transform: uppercase; border-right: 1px solid #E2E8F0;">${d.partyName}</td>
          <td style="padding: 6px 10px; border-right: 1px solid #E2E8F0;">${d.place || '-'}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 800; border-right: 1px solid #E2E8F0;">${d.bundles || '1'}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #1E3A8A; border-right: 1px solid #E2E8F0;">${d.transport || '-'}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 700; font-family: monospace; border-right: 1px solid #E2E8F0;">${d.lrNo || '-'}</td>
          <td style="padding: 6px 8px; text-align: center; border-right: 1px solid #E2E8F0;">${d.partyNo || '-'}</td>
          <td style="padding: 6px 10px;">${d.agent || '-'}</td>
        </tr>
      `
      )
      .join('');

    const subTitle =
      selectedBillNo !== 'ALL'
        ? `DESPATCH DATA FOR BILL #${selectedBillNo}`
        : `DESPATCH REGISTER (${selectedYear === 'ALL' ? 'ALL YEARS' : selectedYear})`;

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Despatch Sheet - ${firmName}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          body { font-family: Arial, "Helvetica Neue", sans-serif; margin: 0; padding: 0; color: #000; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #DCE7F5; color: #0F172A; font-weight: 800; padding: 8px 6px; text-align: center; font-size: 12px; border: 1px solid #B0C4DE; }
          td { border: 1px solid #CBD5E1; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 12px;">
          <h2 style="margin: 0; text-transform: uppercase; font-size: 18px; color: #1E3A8A;">${firmName}</h2>
          <div style="font-size: 14px; font-weight: 800; margin-top: 2px;">${subTitle}</div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Generated on ${new Date().toLocaleDateString('en-IN')} | Total Records: ${filteredDespatches.length} | Total Bundles: ${totalBundles}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">S NO</th>
              <th style="width: 8%;">Bill No</th>
              <th style="width: 9%;">Date</th>
              <th style="width: 20%; text-align: left; padding-left: 10px;">Party Name</th>
              <th style="width: 15%; text-align: left; padding-left: 10px;">Place</th>
              <th style="width: 7%;">Bundles</th>
              <th style="width: 12%;">Transport</th>
              <th style="width: 11%;">L R NO</th>
              <th style="width: 9%;">Party NO</th>
              <th style="width: 9%; text-align: left; padding-left: 10px;">Agent</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 300);
    }
  };

  // Sort arrow indicator helper
  const renderSortArrow = (field: DespatchSortField) => {
    if (sortBy !== field) {
      return (
        <Typography component="span" sx={{ fontSize: '10px', color: '#94A3B8', ml: 0.3, userSelect: 'none' }}>
          ↕
        </Typography>
      );
    }
    return sortOrder === 'asc' ? (
      <ArrowUpwardRoundedIcon sx={{ fontSize: 13, color: '#1E40AF', ml: 0.2, verticalAlign: 'middle' }} />
    ) : (
      <ArrowDownwardRoundedIcon sx={{ fontSize: 13, color: '#1E40AF', ml: 0.2, verticalAlign: 'middle' }} />
    );
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
          {/* Left: Window Icon + Title & Counters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingRoundedIcon sx={{ fontSize: 20, color: '#1E40AF' }} />
            <Typography
              sx={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
              }}
            >
              Despatch Register
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
              {filteredDespatches.length} {filteredDespatches.length === 1 ? 'Entry' : 'Entries'}
            </Box>
            <Box
              sx={{
                bgcolor: '#047857',
                color: '#FFFFFF',
                px: 0.9,
                py: 0.15,
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {totalBundles} Total Bundles
            </Box>

            {/* If filtered to a particular bill, show active chip badge */}
            {selectedBillNo !== 'ALL' && (
              <Chip
                size="small"
                label={`Filtered: Bill #${selectedBillNo}`}
                onDelete={() => setSelectedBillNo('ALL')}
                deleteIcon={<CloseRoundedIcon sx={{ fontSize: '13px !important' }} />}
                sx={{
                  bgcolor: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  color: '#92400E',
                  fontWeight: 800,
                  fontSize: '11px',
                  height: '22px',
                }}
              />
            )}
          </Box>

          {/* Quick Actions (Year / Sync / Export / Print / Add) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
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
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>Year:</Typography>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  setSelectedYear(val);
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

            {/* Sync from Bills Button */}
            <Tooltip title="Auto-sync and load despatch information from all Tax Bills and Quotations">
              <Button
                onClick={handleSyncBills}
                disabled={syncing}
                startIcon={syncing ? <CircularProgress size={12} color="inherit" /> : <SyncRoundedIcon sx={{ fontSize: 14 }} />}
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
                Sync Bills
              </Button>
            </Tooltip>

            {/* Export CSV */}
            <Tooltip title="Export current Despatch Sheet to Excel (.csv)">
              <Button
                onClick={handleExportCsv}
                startIcon={<FileDownloadRoundedIcon sx={{ fontSize: 14 }} />}
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
                Export CSV
              </Button>
            </Tooltip>

            {/* Print Sheet */}
            <Tooltip title="Print Despatch Register on A4 Format">
              <Button
                onClick={handlePrintSheet}
                startIcon={<PrintOutlinedIcon sx={{ fontSize: 14 }} />}
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
                Print Sheet
              </Button>
            </Tooltip>

            {/* Add Despatch Button */}
            <Button
              onClick={handleOpenAddModal}
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
                boxShadow: 'none',
                '&:hover': { bgcolor: '#580e34', boxShadow: 'none' },
              }}
            >
              Add Despatch
            </Button>
          </Box>
        </Box>

        {/* Search & Filter Toolbar */}
        <Box
          sx={{
            p: 1,
            bgcolor: '#F8FAFC',
            borderBottom: '1px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.2,
            flexWrap: 'wrap',
          }}
        >
          {/* Left Controls: Particular Bill Selector + Text Search + Sort Dropdown */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            {/* PARTICULAR BILL SELECTOR ("Particular bill mattum data edukura marii") */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#1E40AF', whiteSpace: 'nowrap' }}>
                Bill Filter:
              </Typography>
              <Autocomplete
                size="small"
                options={distinctBillOptions}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
                value={distinctBillOptions.find((opt) => opt.billNo === selectedBillNo) || null}
                onChange={(_, val) => {
                  setSelectedBillNo(val ? val.billNo : 'ALL');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select Bill #..."
                    sx={{
                      width: '200px',
                      '& .MuiOutlinedInput-root': {
                        height: '28px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        bgcolor: selectedBillNo !== 'ALL' ? '#FEF9C3' : '#FFFFFF',
                      },
                    }}
                  />
                )}
              />
              {selectedBillNo !== 'ALL' && (
                <Button
                  size="small"
                  onClick={() => setSelectedBillNo('ALL')}
                  sx={{
                    height: '28px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#DC2626',
                    bgcolor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    textTransform: 'none',
                    px: 0.8,
                    '&:hover': { bgcolor: '#FEE2E2' },
                  }}
                >
                  Clear
                </Button>
              )}
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: '24px', alignSelf: 'center' }} />

            {/* General Search Input */}
            <TextField
              size="small"
              placeholder="Search Party, Place, Transport, LR NO, Party NO, Agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                width: { xs: '100%', sm: '300px' },
                '& .MuiOutlinedInput-root': {
                  height: '28px',
                  fontSize: '11.5px',
                  bgcolor: '#FFFFFF',
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.2 }}>
                        <CloseRoundedIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: '24px', alignSelf: 'center' }} />

            {/* SORT DROPDOWN ("short pannura option") */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SortRoundedIcon sx={{ fontSize: 16, color: '#475569' }} />
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                Sort:
              </Typography>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-') as [DespatchSortField, DespatchSortOrder];
                  setSortBy(field);
                  setSortOrder(order);
                }}
                style={{
                  height: '28px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '3px',
                  padding: '0 6px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="sNo-desc">S.No: High → Low</option>
                <option value="sNo-asc">S.No: 1, 2, 3... (Ascending)</option>
                <option value="billNo-desc">Bill No: High → Low</option>
                <option value="billNo-asc">Bill No: Low → High</option>
                <option value="date-desc">Date: Newest First</option>
                <option value="date-asc">Date: Oldest First</option>
                <option value="partyName-asc">Party Name: A → Z</option>
                <option value="partyName-desc">Party Name: Z → A</option>
                <option value="bundles-desc">Bundles: High → Low</option>
                <option value="bundles-asc">Bundles: Low → High</option>
              </select>
            </Box>
          </Box>

          <Typography sx={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
            Showing <strong>{filteredDespatches.length}</strong> of <strong>{despatches.length}</strong> records
          </Typography>
        </Box>

        {/* Despatch Data Table */}
        <Box sx={{ p: 1, bgcolor: '#FFFFFF', minHeight: '400px' }}>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: '1px solid #B0C4DE',
              borderRadius: '2px',
              maxHeight: 'calc(100vh - 240px)',
            }}
          >
            <Table size="small" stickyHeader sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                  {/* S NO (Sortable) */}
                  <TableCell
                    onClick={() => handleSortToggle('sNo')}
                    sx={{
                      width: '60px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: sortBy === 'sNo' ? '#1E40AF' : '#0F172A',
                      fontSize: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': { bgcolor: '#CFE0F2' },
                    }}
                  >
                    S NO {renderSortArrow('sNo')}
                  </TableCell>

                  {/* BILL NO (NEW Column! Sortable & Clickable to filter) */}
                  <TableCell
                    onClick={() => handleSortToggle('billNo')}
                    sx={{
                      width: '85px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: sortBy === 'billNo' ? '#1E40AF' : '#0F172A',
                      fontSize: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': { bgcolor: '#CFE0F2' },
                    }}
                  >
                    Bill No {renderSortArrow('billNo')}
                  </TableCell>

                  {/* Date (Sortable) */}
                  <TableCell
                    onClick={() => handleSortToggle('date')}
                    sx={{
                      width: '95px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: sortBy === 'date' ? '#1E40AF' : '#0F172A',
                      fontSize: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': { bgcolor: '#CFE0F2' },
                    }}
                  >
                    Date {renderSortArrow('date')}
                  </TableCell>

                  {/* Party Name (Sortable) */}
                  <TableCell
                    onClick={() => handleSortToggle('partyName')}
                    sx={{
                      width: '200px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: sortBy === 'partyName' ? '#1E40AF' : '#0F172A',
                      fontSize: '12px',
                      textAlign: 'left',
                      pl: 1.5,
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': { bgcolor: '#CFE0F2' },
                    }}
                  >
                    Party Name {renderSortArrow('partyName')}
                  </TableCell>

                  {/* Place (Sortable) */}
                  <TableCell
                    onClick={() => handleSortToggle('place')}
                    sx={{
                      width: '140px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: sortBy === 'place' ? '#1E40AF' : '#0F172A',
                      fontSize: '12px',
                      textAlign: 'left',
                      pl: 1.5,
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': { bgcolor: '#CFE0F2' },
                    }}
                  >
                    Place {renderSortArrow('place')}
                  </TableCell>

                  {/* Bundles (Sortable) */}
                  <TableCell
                    onClick={() => handleSortToggle('bundles')}
                    sx={{
                      width: '75px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: sortBy === 'bundles' ? '#1E40AF' : '#0F172A',
                      fontSize: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': { bgcolor: '#CFE0F2' },
                    }}
                  >
                    Bundles {renderSortArrow('bundles')}
                  </TableCell>

                  {/* Transport (Sortable) */}
                  <TableCell
                    onClick={() => handleSortToggle('transport')}
                    sx={{
                      width: '110px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: sortBy === 'transport' ? '#1E40AF' : '#0F172A',
                      fontSize: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': { bgcolor: '#CFE0F2' },
                    }}
                  >
                    Transport {renderSortArrow('transport')}
                  </TableCell>

                  {/* L R NO (Sortable) */}
                  <TableCell
                    onClick={() => handleSortToggle('lrNo')}
                    sx={{
                      width: '130px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: sortBy === 'lrNo' ? '#1E40AF' : '#0F172A',
                      fontSize: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': { bgcolor: '#CFE0F2' },
                    }}
                  >
                    L R NO {renderSortArrow('lrNo')}
                  </TableCell>

                  {/* Party NO */}
                  <TableCell
                    sx={{
                      width: '120px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: '#0F172A',
                      fontSize: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                    }}
                  >
                    Party NO
                  </TableCell>

                  {/* Agent */}
                  <TableCell
                    sx={{
                      width: '100px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: '#0F172A',
                      fontSize: '12px',
                      textAlign: 'left',
                      pl: 1.5,
                      borderRight: '1px solid #CBD5E1',
                      borderBottom: '1px solid #CBD5E1',
                    }}
                  >
                    Agent
                  </TableCell>

                  {/* Actions */}
                  <TableCell
                    sx={{
                      width: '135px',
                      fontWeight: 700,
                      bgcolor: '#DCE7F5',
                      color: '#0F172A',
                      fontSize: '12px',
                      textAlign: 'center',
                      borderBottom: '1px solid #CBD5E1',
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} sx={{ color: '#1E3A8A', mb: 1 }} />
                      <Typography sx={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                        Loading despatch records...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredDespatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                      <LocalShippingRoundedIcon sx={{ fontSize: 36, color: '#94A3B8', mb: 1 }} />
                      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                        {selectedBillNo !== 'ALL'
                          ? `No despatch record found for Bill #${selectedBillNo}.`
                          : 'No Despatch Records Found'}
                      </Typography>
                      <Typography sx={{ fontSize: '11.5px', color: '#64748B', mt: 0.5 }}>
                        {selectedBillNo !== 'ALL'
                          ? 'You can create a despatch entry for this bill using "+ Add Despatch".'
                          : 'Click "+ Add Despatch" or "Sync Bills" to populate lorry transport data.'}
                      </Typography>
                      {selectedBillNo !== 'ALL' && (
                        <Button
                          size="small"
                          onClick={() => setSelectedBillNo('ALL')}
                          variant="outlined"
                          sx={{ mt: 1.5, fontSize: '11.5px', fontWeight: 700, textTransform: 'none' }}
                        >
                          Show All Records
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDespatches.map((row, idx) => {
                    const isFiltered = selectedBillNo !== 'ALL' && String(row.billNo) === selectedBillNo;
                    return (
                      <TableRow
                        key={row._id || row.id || idx}
                        hover
                        sx={{
                          bgcolor: isFiltered ? '#FEFCE8' : idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF',
                          '&:hover': { bgcolor: '#E2E8F0 !important' },
                          '& td': {
                            fontSize: '12px',
                            py: 0.6,
                            px: 1,
                            borderRight: '1px solid #E2E8F0',
                            borderBottom: '1px solid #E2E8F0',
                          },
                        }}
                      >
                        {/* S NO */}
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#0F172A' }}>
                          {row.sNo}
                        </TableCell>

                        {/* Bill No (Interactive: click to isolate) */}
                        <TableCell align="center">
                          {row.billNo ? (
                            <Tooltip title="Click to filter and isolate this particular bill">
                              <Box
                                onClick={() => setSelectedBillNo(String(row.billNo || ''))}
                                sx={{
                                  display: 'inline-block',
                                  bgcolor: isFiltered ? '#FDE047' : '#EFF6FF',
                                  border: isFiltered ? '1px solid #CA8A04' : '1px solid #BFDBFE',
                                  color: '#1E40AF',
                                  fontWeight: 800,
                                  px: 0.7,
                                  py: 0.15,
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontFamily: 'monospace',
                                  fontSize: '11.5px',
                                  '&:hover': { bgcolor: '#DBEAFE', textDecoration: 'underline' },
                                }}
                              >
                                #{row.billNo}
                              </Box>
                            </Tooltip>
                          ) : (
                            <Typography sx={{ color: '#94A3B8', fontSize: '11px' }}>-</Typography>
                          )}
                        </TableCell>

                        {/* Date */}
                        <TableCell align="center" sx={{ color: '#334155', fontWeight: 600 }}>
                          {row.date}
                        </TableCell>

                        {/* Party Name */}
                        <TableCell sx={{ fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', pl: 1.5 }}>
                          {row.partyName}
                        </TableCell>

                        {/* Place */}
                        <TableCell sx={{ color: '#334155', fontWeight: 500, pl: 1.5 }}>
                          {row.place || '-'}
                        </TableCell>

                        {/* Bundles */}
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#0F172A' }}>
                          <Box
                            component="span"
                            sx={{
                              bgcolor: '#E0F2FE',
                              color: '#0369A1',
                              px: 0.8,
                              py: 0.15,
                              borderRadius: '3px',
                              fontWeight: 800,
                            }}
                          >
                            {row.bundles || '1'}
                          </Box>
                        </TableCell>

                        {/* Transport */}
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#1E40AF' }}>
                          {row.transport || '-'}
                        </TableCell>

                        {/* L R NO */}
                        <TableCell
                          align="center"
                          sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#0F172A', letterSpacing: '0.04em' }}
                        >
                          {row.lrNo || '-'}
                        </TableCell>

                        {/* Party NO */}
                        <TableCell align="center" sx={{ color: '#334155', fontWeight: 600, fontFamily: 'monospace' }}>
                          {row.partyNo || '-'}
                        </TableCell>

                        {/* Agent */}
                        <TableCell sx={{ color: '#334155', fontWeight: 600, pl: 1.5 }}>
                          {row.agent || '-'}
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4 }}>
                            {/* View Details Modal ("particular bill mattum data edukura marii") */}
                            <Tooltip title="View full despatch data for this bill">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedDespatchForDetails(row);
                                  setDetailsModalOpen(true);
                                }}
                                sx={{
                                  color: '#92400E',
                                  bgcolor: '#FEF3C7',
                                  border: '1px solid #F59E0B',
                                  borderRadius: '2px',
                                  p: 0.3,
                                  '&:hover': { bgcolor: '#FDE68A' },
                                }}
                              >
                                <VisibilityRoundedIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>

                            {/* WhatsApp Share Button */}
                            <Tooltip title="Share Despatch Details on WhatsApp">
                              <IconButton
                                size="small"
                                onClick={() => handleWhatsAppShare(row)}
                                sx={{
                                  color: '#047857',
                                  bgcolor: '#ECFDF5',
                                  border: '1px solid #A7F3D0',
                                  borderRadius: '2px',
                                  p: 0.3,
                                  '&:hover': { bgcolor: '#D1FAE5', color: '#065F46' },
                                }}
                              >
                                <WhatsAppIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>

                            {/* Edit Button */}
                            <Tooltip title="Edit Despatch Entry">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditModal(row)}
                                sx={{
                                  color: '#1E40AF',
                                  bgcolor: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '2px',
                                  p: 0.3,
                                  '&:hover': { bgcolor: '#DBEAFE' },
                                }}
                              >
                                <EditRoundedIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>

                            {/* Delete Button */}
                            <Tooltip title="Delete Entry">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteDespatch(row)}
                                sx={{
                                  color: '#DC2626',
                                  bgcolor: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '2px',
                                  p: 0.3,
                                  '&:hover': { bgcolor: '#DC2626', color: '#FFFFFF' },
                                }}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 13 }} />
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

      {/* Add / Edit Despatch Entry Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '6px',
              border: '1px solid #94A3B8',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            color: '#0F172A',
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: '13.5px', fontWeight: 800 }}>
            {editingItem ? 'Edit Despatch Entry' : '+ New Despatch Entry'}
          </Typography>
          <IconButton size="small" onClick={() => setModalOpen(false)} sx={{ color: '#0F172A', p: 0.2 }}>
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1 }}>
            {/* S NO */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                S NO *
              </Typography>
              <input
                type="text"
                value={formSNo}
                onChange={(e) => setFormSNo(e.target.value)}
                className="erp-input"
                placeholder="179"
                style={{ width: '100%', fontWeight: 700 }}
              />
            </Box>

            {/* Bill No (Link to particular bill) */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#1E40AF', mb: 0.3 }}>
                Link Bill # (Optional)
              </Typography>
              <Autocomplete
                freeSolo
                size="small"
                options={distinctBillOptions.map((b) => b.billNo)}
                value={formBillNo}
                onInputChange={(_, val) => handleBillSelectForForm(val)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="e.g. 101 or GST-1"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: '28px',
                        fontSize: '12px',
                        padding: '0 4px',
                        fontWeight: 700,
                      },
                    }}
                  />
                )}
              />
            </Box>

            {/* Date */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                Date *
              </Typography>
              <input
                type="text"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="erp-input"
                placeholder="DD-MM-YYYY or 28.9.26"
                style={{ width: '100%' }}
              />
            </Box>

            {/* Bundles */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                Bundles / Cases
              </Typography>
              <input
                type="text"
                value={formBundles}
                onChange={(e) => setFormBundles(e.target.value)}
                className="erp-input"
                placeholder="1"
                style={{ width: '100%', textAlign: 'center', fontWeight: 700 }}
              />
            </Box>

            {/* Party Name */}
            <Box sx={{ gridColumn: 'span 2' }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                Party Name *
              </Typography>
              <Autocomplete
                freeSolo
                size="small"
                options={customerOptions.map((c) => c.name)}
                value={formPartyName}
                onInputChange={(_, val) => handlePartyNameSelect(val)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Enter or select Customer / Party Name"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: '28px',
                        fontSize: '12px',
                        padding: '0 4px',
                      },
                    }}
                  />
                )}
              />
            </Box>

            {/* Place */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                Place / Destination
              </Typography>
              <input
                type="text"
                value={formPlace}
                onChange={(e) => setFormPlace(e.target.value)}
                className="erp-input"
                placeholder="e.g. Panrutti, Chennai"
                style={{ width: '100%' }}
              />
            </Box>

            {/* Transport */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                Transport / Carrier
              </Typography>
              <input
                type="text"
                value={formTransport}
                onChange={(e) => setFormTransport(e.target.value)}
                className="erp-input"
                placeholder="e.g. A1, VRL, ARC"
                style={{ width: '100%' }}
              />
            </Box>

            {/* L R NO */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                L R NO
              </Typography>
              <input
                type="text"
                value={formLrNo}
                onChange={(e) => setFormLrNo(e.target.value)}
                className="erp-input"
                placeholder="e.g. 210 171 49904"
                style={{ width: '100%', fontWeight: 700 }}
              />
            </Box>

            {/* Party NO */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                Party NO (Mobile)
              </Typography>
              <input
                type="text"
                value={formPartyNo}
                onChange={(e) => setFormPartyNo(e.target.value)}
                className="erp-input"
                placeholder="e.g. 96984 96253"
                style={{ width: '100%' }}
              />
            </Box>

            {/* Agent */}
            <Box sx={{ gridColumn: 'span 2' }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                Agent
              </Typography>
              <input
                type="text"
                value={formAgent}
                onChange={(e) => setFormAgent(e.target.value)}
                className="erp-input"
                placeholder="e.g. Gowtham"
                style={{ width: '100%' }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 1.5, borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
          <Button onClick={() => setModalOpen(false)} sx={{ fontSize: '12px', color: '#475569', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveDespatch}
            disabled={saving}
            variant="contained"
            sx={{
              bgcolor: '#741748',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'none',
              px: 2,
              '&:hover': { bgcolor: '#580e34' },
            }}
          >
            {saving ? <CircularProgress size={14} color="inherit" /> : editingItem ? 'Save Changes' : 'Create Entry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Despatch Record Full Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '6px',
              border: '1px solid #94A3B8',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
            },
          },
        }}
      >
        {selectedDespatchForDetails && (
          <>
            <DialogTitle
              sx={{
                background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
                borderBottom: '1px solid #A8C2DC',
                color: '#0F172A',
                px: 2,
                py: 1.2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalShippingRoundedIcon sx={{ color: '#1E40AF', fontSize: 20 }} />
                <Typography sx={{ fontSize: '14px', fontWeight: 800 }}>
                  Despatch Record Details (S.No: {selectedDespatchForDetails.sNo})
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setDetailsModalOpen(false)}>
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2, bgcolor: '#FFFFFF' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1.5,
                  p: 1.5,
                  bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Party Name:</Typography>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#1E3A8A' }}>
                    {selectedDespatchForDetails.partyName}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Linked Bill No:</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    {selectedDespatchForDetails.billNo ? `#${selectedDespatchForDetails.billNo}` : 'Not linked to Bill'}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Date:</Typography>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 700 }}>
                    {selectedDespatchForDetails.date}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Place / Destination:</Typography>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 600 }}>
                    {selectedDespatchForDetails.place || '-'}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Bundles / Cases:</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0369A1' }}>
                    {selectedDespatchForDetails.bundles || '1'}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Transport / Carrier:</Typography>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#1E40AF' }}>
                    {selectedDespatchForDetails.transport || '-'}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>L.R. Number:</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace' }}>
                    {selectedDespatchForDetails.lrNo || '-'}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Party Phone / Mobile:</Typography>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 600, fontFamily: 'monospace' }}>
                    {selectedDespatchForDetails.partyNo || '-'}
                  </Typography>
                </Box>

                <Box sx={{ gridColumn: 'span 2' }}>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Agent:</Typography>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 600 }}>
                    {selectedDespatchForDetails.agent || '-'}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
              <Button
                size="small"
                onClick={() => handleWhatsAppShare(selectedDespatchForDetails)}
                startIcon={<WhatsAppIcon sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#047857',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'none',
                }}
              >
                Share WhatsApp
              </Button>

              <Button onClick={() => setDetailsModalOpen(false)} sx={{ fontSize: '12px', color: '#64748B', textTransform: 'none' }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar Feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
          sx={{ fontWeight: 600, fontSize: '13px' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DespatchPage;
