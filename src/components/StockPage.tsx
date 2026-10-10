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
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
} from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import * as XLSX from 'xlsx';

import { ParticularsApi, ProductsApi } from '../services/api';
import { getActiveBillingYear, setActiveBillingYear, YEAR_CHANGE_EVENT } from '../utils/yearContext';

export interface ProductSaleStat {
  rank: number;
  productName: string;
  category: string;
  totalQuantity: number;      // Units sold
  totalRevenue: number;
  billsCount: number;
  years: number[];
}

export const isQuotationBill = (bill: any): boolean => {
  if (!bill) return false;
  const bType = String(bill.billType || '').trim().toUpperCase();
  const bNo = String(bill.billNo || '').trim().toUpperCase();
  const invTitle = String(bill.invoiceTitle || '').trim().toUpperCase();
  return bType === 'QUOTATION' || bNo.startsWith('QUO') || invTitle === 'QUOTATION';
};

export const extractBillYear = (bill: any): number => {
  if (bill.year) {
    const y = Number(bill.year);
    if (!isNaN(y) && y >= 2000) return y;
  }
  if (bill.date) {
    // bill.date format: DD-MM-YYYY (e.g. 10-10-2026)
    const parts = String(bill.date).trim().split(/[-/]/);
    if (parts.length === 3) {
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && y >= 2000) return y;
    }
  }
  if (bill.createdAt) {
    const y = new Date(bill.createdAt).getFullYear();
    if (!isNaN(y) && y >= 2000) return y;
  }
  return getActiveBillingYear() || new Date().getFullYear();
};

export const StockPage: FC = () => {
  const currentYear = getActiveBillingYear() || new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string | number>(currentYear);
  const [sortBy, setSortBy] = useState<'quantity' | 'name'>('quantity');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [rawBills, setRawBills] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Dynamically resolve only real years present in actual bills
  const availableYears = useMemo(() => {
    const yrs = new Set<number>();
    rawBills.forEach((b: any) => {
      if (isQuotationBill(b)) return;
      const y = extractBillYear(b);
      if (y) yrs.add(y);
    });
    // Always include current active billing year
    const activeYr = getActiveBillingYear() || new Date().getFullYear();
    yrs.add(activeYr);
    return Array.from(yrs).sort((a, b) => b - a);
  }, [rawBills]);

  const yearOptions = useMemo(() => {
    if (availableYears.length > 1) {
      return ['ALL', ...availableYears];
    }
    return availableYears;
  }, [availableYears]);

  // Fetch sales particulars and products from API
  const loadData = async () => {
    setLoading(true);
    try {
      const [billsData, productsData] = await Promise.all([
        ParticularsApi.getAll(undefined, 'ALL').catch(() => []),
        ProductsApi.getAll().catch(() => []),
      ]);

      const billsList = Array.isArray(billsData) ? billsData : ((billsData as any)?.data || []);
      const prodsList = Array.isArray(productsData) ? productsData : ((productsData as any)?.data || []);

      // User requirement: Quotation should NEVER reflect in Stock! Only Estimate bills reflect in Stock.
      const estimateBillsOnly = billsList.filter((b: any) => !isQuotationBill(b));

      setRawBills(estimateBillsOnly);
      setRawProducts(prodsList);

      // Extract unique categories from real products
      const cats = new Set<string>();
      prodsList.forEach((p: any) => {
        if (p.category && String(p.category).trim() !== '') {
          cats.add(String(p.category).trim());
        }
      });
      setAllCategories(Array.from(cats));
    } catch (err) {
      console.error('Error loading stock sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleYearChange = (e: any) => {
      if (e.detail?.year) {
        setSelectedYear(e.detail.year);
      }
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    return () => {
      window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    };
  }, []);

  const handleYearChangeFromDropdown = (val: string | number) => {
    setSelectedYear(val);
    if (val !== 'ALL') {
      setActiveBillingYear(Number(val));
    }
  };

  // Compute aggregated product sales statistics per year (ONLY for Estimate bills)
  const productStats = useMemo<ProductSaleStat[]>(() => {
    const productCatalogMap = new Map<string, { productName: string; category: string }>();

    rawProducts.forEach((p: any) => {
      const rawName = String(p.name || '').trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();
      if (!productCatalogMap.has(key)) {
        productCatalogMap.set(key, {
          productName: rawName,
          category: p.category || 'General',
        });
      }
    });

    const statsMap = new Map<
      string,
      {
        productName: string;
        category: string;
        totalQuantity: number;
        totalRevenue: number;
        billsCount: number;
        years: Set<number>;
      }
    >();

    // Process actual Estimate bills from database (Quotation is strictly excluded)
    rawBills.forEach((bill: any) => {
      if (isQuotationBill(bill)) return;

      const billYear = extractBillYear(bill);
      if (selectedYear !== 'ALL' && billYear !== Number(selectedYear)) {
        return;
      }

      if (Array.isArray(bill.products)) {
        bill.products.forEach((p: any) => {
          const name = String(p.particular || p.name || '').trim();
          if (!name) return;

          const qty = Number(p.quantity) || 0;
          const rate = Number(p.rate) || 0;
          const amount = Number(p.amount) || qty * rate;

          const key = name.toLowerCase();
          const catalogItem = productCatalogMap.get(key);

          const existing = statsMap.get(key) || {
            productName: catalogItem?.productName || name,
            category: catalogItem?.category || p.category || 'General',
            totalQuantity: 0,
            totalRevenue: 0,
            billsCount: 0,
            years: new Set<number>(),
          };

          existing.totalQuantity += qty;
          existing.totalRevenue += amount;
          existing.billsCount += 1;
          existing.years.add(billYear);
          statsMap.set(key, existing);
        });
      }
    });

    const list = Array.from(statsMap.values()).map((item) => {
      return {
        rank: 1,
        productName: item.productName,
        category: item.category,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
        billsCount: item.billsCount,
        years: Array.from(item.years).sort((a, b) => b - a),
      };
    });

    // Sort according to user preference
    list.sort((a, b) => {
      if (sortBy === 'name') return a.productName.localeCompare(b.productName);
      return b.totalQuantity - a.totalQuantity;
    });

    // Assign rank
    return list.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [rawBills, rawProducts, selectedYear, sortBy]);

  // Filtered stats by search term and category
  const filteredStats = useMemo(() => {
    return productStats.filter((item) => {
      const matchesSearch =
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'ALL' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [productStats, searchTerm, selectedCategory]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalQty = productStats.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalRev = productStats.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalBills = productStats.reduce((sum, item) => sum + item.billsCount, 0);
    const topProduct = productStats[0] || null;

    return {
      totalQty,
      totalRev,
      totalBills,
      topProduct,
      totalProductsCount: productStats.length,
    };
  }, [productStats]);

  // Top seller per year overview cards (Only for Estimate bills in real database)
  const yearlyTopSellers = useMemo(() => {
    const yearsWithBills = availableYears.filter((yr) => {
      return rawBills.some((b: any) => !isQuotationBill(b) && extractBillYear(b) === yr);
    });

    const targetYears = yearsWithBills.length > 0 ? yearsWithBills : [getActiveBillingYear() || new Date().getFullYear()];

    return targetYears.map((yr) => {
      let topName = 'No sales recorded';
      let topQty = 0;
      let topRev = 0;

      const yearMap = new Map<string, { qty: number; rev: number }>();
      rawBills.forEach((b: any) => {
        if (isQuotationBill(b)) return;
        const bYear = extractBillYear(b);
        if (bYear === yr && Array.isArray(b.products)) {
          b.products.forEach((p: any) => {
            const pName = String(p.particular || p.name || '').trim();
            if (!pName) return;
            const q = Number(p.quantity) || 0;
            const a = Number(p.amount) || q * (Number(p.rate) || 0);
            const cur = yearMap.get(pName) || { qty: 0, rev: 0 };
            cur.qty += q;
            cur.rev += a;
            yearMap.set(pName, cur);
          });
        }
      });

      if (yearMap.size > 0) {
        let maxQ = -1;
        yearMap.forEach((val, key) => {
          if (val.qty > maxQ) {
            maxQ = val.qty;
            topName = key;
            topQty = val.qty;
            topRev = val.rev;
          }
        });
      }

      return {
        year: yr,
        topName,
        topQty,
        topRev,
      };
    });
  }, [rawBills, availableYears]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredStats.map((item) => ({
      Rank: item.rank,
      'Product Name': item.productName,
      Category: item.category,
      'Units Sold (Qty)': item.totalQuantity,
      Year: selectedYear === 'ALL' ? 'All Years' : selectedYear,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Report');
    XLSX.writeFile(wb, `SVM_Crackers_Stock_Report_${selectedYear}.xlsx`);
  };

  // Direct Print Report
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SVM Crackers - Stock Report (${selectedYear})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; color: #111; }
            h2 { margin: 0 0 4px; text-transform: uppercase; color: #1E3A8A; }
            .sub { color: #666; margin-bottom: 16px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; }
            th { background-color: #F1F5F9; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .badge { font-weight: bold; color: #1E40AF; }
          </style>
        </head>
        <body>
          <h2>S.V.M FIREWORKS AGENCIES - STOCK REPORT</h2>
          <div class="sub">Year: <b>${selectedYear}</b> | Total Products: ${filteredStats.length} | Generated: ${new Date().toLocaleDateString('en-IN')}</div>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 45px;">Rank</th>
                <th>Product Name</th>
                <th>Category</th>
                <th class="text-right">Units Sold</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStats
                .map(
                  (item) => `
                <tr>
                  <td class="text-center badge">#${item.rank}</td>
                  <td><b>${item.productName}</b></td>
                  <td>${item.category}</td>
                  <td class="text-right"><b>${item.totalQuantity.toLocaleString('en-IN')} units</b></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 1.5 }, bgcolor: '#D9E4F2', minHeight: 'calc(100vh - 70px)' }}>
      {/* Outer ERP Window Card */}
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          border: '1px solid #9BB3CC',
          borderRadius: '4px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          mb: 2,
        }}
      >
        {/* Top ERP Header Bar */}
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
            gap: 1.5,
          }}
        >
          {/* Left Title + Year Select */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <TrendingUpRoundedIcon sx={{ fontSize: 20, color: '#1E40AF' }} />
              <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.01em' }}>
                STOCK &amp; SALES ANALYTICS
              </Typography>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#64748B' }}>/</Typography>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#1E40AF' }}>
                Inventory &amp; Sold Products
              </Typography>
            </Box>

            {/* Year Selector Dropdown */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, ml: { sm: 1 } }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                Billing Year:
              </Typography>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChangeFromDropdown(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                style={{
                  height: '28px',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#1E40AF',
                  borderRadius: '3px',
                  border: '1px solid #94A3B8',
                  padding: '2px 8px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y === 'ALL' ? 'All Years (Combined)' : `Year ${y}`}
                  </option>
                ))}
              </select>
            </Box>
          </Box>

          {/* Right Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 14 }} />}
              onClick={handleExportExcel}
              sx={{
                height: '26px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#166534',
                borderColor: '#86EFAC',
                bgcolor: '#F0FDF4',
                borderRadius: '3px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#DCFCE7', borderColor: '#16A34A' },
              }}
            >
              Export Excel
            </Button>

            <Button
              size="small"
              variant="outlined"
              startIcon={<PrintOutlinedIcon sx={{ fontSize: 14 }} />}
              onClick={handlePrint}
              sx={{
                height: '26px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#1E40AF',
                borderColor: '#93C5FD',
                bgcolor: '#EFF6FF',
                borderRadius: '3px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#DBEAFE', borderColor: '#2563EB' },
              }}
            >
              Print Report
            </Button>

            <Tooltip title="Refresh Stock Data" arrow>
              <IconButton
                size="small"
                onClick={loadData}
                disabled={loading}
                sx={{ p: 0.4, border: '1px solid #CBD5E1', bgcolor: '#F8FAFC' }}
              >
                {loading ? <CircularProgress size={14} /> : <RefreshRoundedIcon sx={{ fontSize: 16, color: '#1E3A8A' }} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Content Container */}
        <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#F4F7FB', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 1. Year Highlights Row (Top Selling product for real years) */}
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              p: 2,
              boxShadow: '0 1px 4px rgba(15, 23, 42, 0.05)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '6px',
                    bgcolor: '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  🏆
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Top Sold Products by Year
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                    Click any year card below to filter sales analytics
                  </Typography>
                </Box>
              </Box>
              <Chip
                label="Estimate Bills Only"
                size="small"
                sx={{
                  bgcolor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  height: '22px',
                }}
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: `repeat(${Math.min(yearlyTopSellers.length, 3)}, 1fr)`,
                },
                gap: 1.5,
              }}
            >
              {yearlyTopSellers.map((item) => {
                const isSelected = selectedYear === item.year;
                return (
                  <Box
                    key={item.year}
                    onClick={() => handleYearChangeFromDropdown(item.year)}
                    sx={{
                      bgcolor: isSelected ? '#EFF6FF' : '#F8FAFC',
                      border: isSelected ? '2px solid #1E40AF' : '1px solid #E2E8F0',
                      borderRadius: '8px',
                      p: 1.8,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 12px rgba(30, 64, 175, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: '#2563EB',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(37, 99, 235, 0.12)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Chip
                          size="small"
                          label={`Year ${item.year}`}
                          sx={{
                            height: '22px',
                            fontSize: '11px',
                            fontWeight: 800,
                            bgcolor: isSelected ? '#1E40AF' : '#E2E8F0',
                            color: isSelected ? '#FFFFFF' : '#334155',
                          }}
                        />
                        {isSelected && (
                          <Chip
                            size="small"
                            label="Active Filter ✓"
                            sx={{
                              height: '20px',
                              fontSize: '10px',
                              fontWeight: 700,
                              bgcolor: '#DBEAFE',
                              color: '#1E40AF',
                            }}
                          />
                        )}
                      </Box>
                      <EmojiEventsRoundedIcon sx={{ fontSize: 20, color: '#F59E0B' }} />
                    </Box>

                    <Typography
                      sx={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        mb: 1.2,
                      }}
                      title={item.topName}
                    >
                      {item.topName}
                    </Typography>

                    <Box
                      sx={{
                        bgcolor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        borderRadius: '6px',
                        p: '8px 12px',
                        textAlign: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: '10.5px', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>
                        Units Sold
                      </Typography>
                      <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#065F46' }}>
                        🔥 {item.topQty.toLocaleString('en-IN')} units
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* 2. Key Performance Metric Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {/* 🏆 Top Product */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                p: 1.8,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <Box sx={{ p: 1.2, bgcolor: '#FEF3C7', borderRadius: '8px', display: 'flex' }}>
                <EmojiEventsRoundedIcon sx={{ fontSize: 26, color: '#D97706' }} />
              </Box>
              <Box sx={{ overflow: 'hidden' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  #1 Top Sold Product
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {summaryMetrics.topProduct?.productName || 'None'}
                </Typography>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#16A34A' }}>
                  {summaryMetrics.topProduct?.totalQuantity.toLocaleString('en-IN') || 0} units sold
                </Typography>
              </Box>
            </Box>

            {/* 📦 Total Units Sold */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                p: 1.8,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <Box sx={{ p: 1.2, bgcolor: '#DCFCE7', borderRadius: '8px', display: 'flex' }}>
                <ShoppingBagRoundedIcon sx={{ fontSize: 26, color: '#16A34A' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Total Units Sold
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  {summaryMetrics.totalQty.toLocaleString('en-IN')} units
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                  Across {summaryMetrics.totalProductsCount} products
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 3. Table Header Controls (Search, Category Filter, Sort Filter) */}
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            {/* Search Box */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '3px',
                  px: 1,
                  height: '30px',
                  width: { xs: '180px', sm: '240px' },
                }}
              >
                <SearchRoundedIcon sx={{ fontSize: 16, color: '#64748B', mr: 0.5 }} />
                <input
                  type="text"
                  placeholder="Search sold product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    width: '100%',
                    backgroundColor: 'transparent',
                  }}
                />
              </Box>

              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  height: '30px',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  borderRadius: '3px',
                  border: '1px solid #CBD5E1',
                  padding: '2px 8px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Box>

            {/* Sort Options & Count */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                Sort by:
              </Typography>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  height: '30px',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1E40AF',
                  borderRadius: '3px',
                  border: '1px solid #CBD5E1',
                  padding: '2px 8px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="quantity">🔥 Most Sold Units (Qty)</option>
                <option value="name">🔤 Product Name (A-Z)</option>
              </select>

              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155', ml: 1 }}>
                Showing: <b>{filteredStats.length}</b> products
              </Typography>
            </Box>
          </Box>

          {/* 4. Main Product Sales & Inventory Ranking Table */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: '1px solid #94A3B8',
              borderRadius: '4px',
              bgcolor: '#FFFFFF',
              maxHeight: 'calc(100vh - 360px)',
              overflowY: 'auto',
            }}
          >
            <Table size="small" stickyHeader sx={{ borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#E2E8F0', color: '#0F172A', fontWeight: 800, fontSize: '11.5px', py: 0.8 } }}>
                  <TableCell align="center" sx={{ width: '60px' }}>Rank</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell sx={{ width: '180px' }}>Category</TableCell>
                  <TableCell align="right" sx={{ width: '180px' }}>Units Sold (Qty)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#64748B', fontSize: '13px' }}>
                      No product sales records found matching the filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStats.map((item) => {
                    const isTop1 = item.rank === 1;
                    const isTop2 = item.rank === 2;
                    const isTop3 = item.rank === 3;

                    return (
                      <TableRow
                        key={item.productName}
                        sx={{
                          '&:hover': { bgcolor: '#F1F7FD' },
                          bgcolor: isTop1 ? '#FEFCE8' : isTop2 ? '#F8FAFC' : isTop3 ? '#FFFBEB' : '#FFFFFF',
                          '& td': { borderBottom: '1px solid #E2E8F0', py: 0.6 },
                        }}
                      >
                        {/* Rank */}
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '24px',
                              borderRadius: '4px',
                              fontSize: '11.5px',
                              fontWeight: 900,
                              bgcolor: isTop1 ? '#F59E0B' : isTop2 ? '#94A3B8' : isTop3 ? '#D97706' : '#E2E8F0',
                              color: isTop1 || isTop2 || isTop3 ? '#FFFFFF' : '#334155',
                            }}
                          >
                            #{item.rank}
                          </Box>
                        </TableCell>

                        {/* Product Name */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 800, color: isTop1 ? '#B45309' : '#0F172A' }}>
                              {item.productName}
                            </Typography>
                            {isTop1 && (
                              <Chip
                                size="small"
                                label="🏆 Top Seller"
                                sx={{ height: '18px', fontSize: '9.5px', fontWeight: 800, bgcolor: '#FEF08A', color: '#854D0E' }}
                              />
                            )}
                          </Box>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.category}
                            sx={{
                              height: '20px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              bgcolor: '#EFF6FF',
                              color: '#1E40AF',
                              border: '1px solid #BFDBFE',
                            }}
                          />
                        </TableCell>

                        {/* Units Sold */}
                        <TableCell align="right">
                          <Typography sx={{ fontSize: '13.5px', fontWeight: 900, color: '#16A34A' }}>
                            {item.totalQuantity.toLocaleString('en-IN')}
                          </Typography>
                          <Typography sx={{ fontSize: '10px', color: '#64748B' }}>
                            units sold
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Bottom Info Footer */}
          <Box sx={{ textAlign: 'center', py: 0.5 }}>
            <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>
              ℹ️ Displaying stock inventory balance &amp; sales analytics for billing year: <b>{selectedYear === 'ALL' ? 'All Years' : selectedYear}</b>. Aggregated from customer sales &amp; product inventory.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
