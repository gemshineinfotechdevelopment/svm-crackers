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
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import { ProductSubPageHeader } from './ProductSubPageHeader';
import { type ProductSubPage } from '../types/productSubPages';
import { getActiveBillingYear, YEAR_CHANGE_EVENT } from '../utils/yearContext';
import { ProductsApi, type PriceMapRecord, type PriceMapRateItem } from '../services/api';
import {
  fetchPriceMaps,
  syncPriceMaps,
  DEFAULT_PRICE_MAP_NAMES,
  REFERENCE_RETAIL_PRODUCTS,
  PRICEMAP_CHANGE_EVENT,
} from '../utils/priceMapStorage';

interface ProductPriceMapPageProps {
  onSubPageChange: (newPage: ProductSubPage) => void;
  initialPriceMapName?: string;
  currentSubPage?: ProductSubPage;
  onSelectPriceMapForRate?: (priceMapName: string) => void;
}

interface DisplayRetailRow {
  productId?: string;
  code: number | string;
  productName: string;
  quantity: number;
  rate: number;
}

export const ProductPriceMapPage: FC<ProductPriceMapPageProps> = ({
  onSubPageChange,
  initialPriceMapName,
  currentSubPage: propSubPage = 'product-price map',
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);
  const [priceMaps, setPriceMaps] = useState<PriceMapRecord[]>([]);

  // Step 1 vs Step 2 view mode: Product Price Map defaults to products view
  const [viewMode, setViewMode] = useState<'shop-list' | 'products'>('products');

  const [selectedPriceMap, setSelectedPriceMap] = useState<string>(() => {
    return localStorage.getItem('svm_selected_pricemap_name') || initialPriceMapName || 'SVM';
  });

  // Shop list selection index for Step 1
  const [selectedShopIndex, setSelectedShopIndex] = useState<number>(0);

  // Add shop dialog in Step 1
  const [openAddShopDialog, setOpenAddShopDialog] = useState(false);
  const [newShopName, setNewShopName] = useState('');

  // 1. User requirement: Add new product dialog state in Step 2
  const [openAddProductDialog, setOpenAddProductDialog] = useState(false);
  const [newProductCode, setNewProductCode] = useState<string>('');
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductQuantity, setNewProductQuantity] = useState<number>(1);
  const [newProductRate, setNewProductRate] = useState<string>('');

  // 2. User requirement: Custom Delete Confirmation Dialog (replacing window.confirm)
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [retailProducts, setRetailProducts] = useState<any[]>([]);
  const [tableRows, setTableRows] = useState<DisplayRetailRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit Product Modal State in Step 2
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingRow, setEditingRow] = useState<DisplayRetailRow | null>(null);
  const [editRateValue, setEditRateValue] = useState<string>('');

  // Toast feedback
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load Price Maps and Website Retail Products
  const loadAllData = async (year: number) => {
    setLoading(true);
    try {
      // 1. Fetch Price Maps
      const mapsData = await fetchPriceMaps(year);
      setPriceMaps(mapsData);

      // 2. Fetch Retail Products ONLY from the website
      const websiteProds = await ProductsApi.getAll(undefined, year, 'Retail');
      const retailOnly = (Array.isArray(websiteProds) ? websiteProds : [])
        .filter((p: any) => !p.productType || p.productType === 'Retail' || p.productType === 'Both');
      
      setRetailProducts(retailOnly);

      const storedShop = localStorage.getItem('svm_selected_pricemap_name');
      const activeShop = storedShop || selectedPriceMap || mapsData[0]?.name || 'SVM';
      if (activeShop !== selectedPriceMap) {
        setSelectedPriceMap(activeShop);
      }
      buildRowsForPriceMap(activeShop, mapsData, retailOnly);
    } catch (err) {
      console.error('Error loading data for ProductPriceMapPage:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build rows combining Retail products from the website with the selected Shop's rates
  const buildRowsForPriceMap = (
    mapName: string,
    maps: PriceMapRecord[],
    prods: any[]
  ) => {
    if (!mapName) {
      setTableRows([]);
      return;
    }

    const currentMap = maps.find((m) => m.name.toLowerCase() === mapName.toLowerCase());
    const existingRatesMap = new Map<string, PriceMapRateItem>();

    if (currentMap && currentMap.rates) {
      currentMap.rates.forEach((r) => {
        existingRatesMap.set(String(r.productName).trim().toLowerCase(), r);
      });
    }

    // Reference rates map for SVM (Reference Image 2)
    const refMap = new Map<string, number>();
    REFERENCE_RETAIL_PRODUCTS.forEach((rp) => {
      refMap.set(rp.productName.trim().toLowerCase(), rp.rate);
    });

    // 1. Convert all website retail products to display rows
    const combinedRows: DisplayRetailRow[] = [];
    const processedNames = new Set<string>();

    if (prods && prods.length > 0) {
      prods.forEach((prod, idx) => {
        const pName = String(prod.name || '').trim();
        const pKey = pName.toLowerCase();
        if (processedNames.has(pKey)) return;
        processedNames.add(pKey);

        const savedRateItem = existingRatesMap.get(pKey);
        let rateVal = Number(prod.rate) || 0;

        if (savedRateItem && savedRateItem.rate !== undefined) {
          rateVal = savedRateItem.rate;
        } else if (mapName.toUpperCase() === 'SVM' && refMap.has(pKey)) {
          rateVal = refMap.get(pKey)!;
        } else {
          rateVal = Number(prod.rate) || 0;
        }

        combinedRows.push({
          productId: prod._id || prod.id,
          code: prod.slNo !== undefined ? prod.slNo : idx + 1,
          productName: pName,
          quantity: 1,
          rate: rateVal,
        });
      });
    }

    // 2. If website had fewer items, ensure reference retail products from Image 2 are included
    REFERENCE_RETAIL_PRODUCTS.forEach((rp) => {
      const rpKey = rp.productName.trim().toLowerCase();
      if (!processedNames.has(rpKey)) {
        processedNames.add(rpKey);
        const savedRateItem = existingRatesMap.get(rpKey);
        let rateVal = rp.rate;

        if (savedRateItem && savedRateItem.rate !== undefined) {
          rateVal = savedRateItem.rate;
        } else if (mapName.toUpperCase() === 'SVM') {
          rateVal = rp.rate;
        } else {
          rateVal = rp.rate;
        }

        combinedRows.push({
          code: rp.code,
          productName: rp.productName,
          quantity: 1,
          rate: rateVal,
        });
      }
    });

    // Sort by code/slNo ascending
    combinedRows.sort((a, b) => {
      const numA = Number(a.code) || 0;
      const numB = Number(b.code) || 0;
      return numA - numB;
    });

    setTableRows(combinedRows);
    setSelectedRowIndex(0);
  };

  useEffect(() => {
    loadAllData(selectedYear);

    const handleYearChange = (e: any) => {
      if (e.detail?.year) {
        setSelectedYear(e.detail.year);
        loadAllData(e.detail.year);
      }
    };

    const handlePriceMapUpdate = (e: any) => {
      if (e.detail?.maps) {
        setPriceMaps(e.detail.maps);
      }
    };

    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    window.addEventListener(PRICEMAP_CHANGE_EVENT, handlePriceMapUpdate);

    return () => {
      window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
      window.removeEventListener(PRICEMAP_CHANGE_EVENT, handlePriceMapUpdate);
    };
  }, [selectedYear]);

  // All available shop names
  const allShopNames = useMemo(() => {
    const names = new Set<string>();
    priceMaps.forEach((pm) => names.add(pm.name));
    DEFAULT_PRICE_MAP_NAMES.forEach((d) => names.add(d));
    return Array.from(names);
  }, [priceMaps]);

  // Select a shop and move to Step 2 (Product view)
  const handleSelectShop = (shopName: string) => {
    setSelectedPriceMap(shopName);
    localStorage.setItem('svm_selected_pricemap_name', shopName);
    buildRowsForPriceMap(shopName, priceMaps, retailProducts);
    setViewMode('products');
    setToast({
      open: true,
      message: `Selected Shop: ${shopName}. Showing retail products.`,
      severity: 'info',
    });
  };

  // Inline rate editing in Step 2
  const handleRateChange = (idx: number, newVal: string) => {
    const num = parseFloat(newVal);
    const updated = [...tableRows];
    updated[idx] = {
      ...updated[idx],
      rate: isNaN(num) ? 0 : num,
    };
    setTableRows(updated);
  };

  // Open Edit Modal for a row
  const handleOpenEditDialog = (row: DisplayRetailRow, idx: number) => {
    setEditingRowIndex(idx);
    setEditingRow(row);
    setEditRateValue(String(row.rate));
    setEditModalOpen(true);
  };

  // Confirm Edit Rate Modal
  const handleConfirmEditRate = () => {
    if (editingRowIndex === null || !editingRow) return;

    const newRate = parseFloat(editRateValue);
    if (isNaN(newRate) || newRate < 0) {
      setToast({ open: true, message: 'Please enter a valid rate (₹)', severity: 'error' });
      return;
    }

    const updated = [...tableRows];
    updated[editingRowIndex] = {
      ...updated[editingRowIndex],
      rate: newRate,
    };
    setTableRows(updated);
    setEditModalOpen(false);

    setToast({
      open: true,
      message: `Rate for "${editingRow.productName}" updated to ₹${newRate} for ${selectedPriceMap}. Remember to click Save!`,
      severity: 'success',
    });
  };

  // 1. Open Add Product Dialog (User requirement: button to add new product on the page)
  const handleOpenAddProductDialog = () => {
    const nextCode = tableRows.reduce((max, r) => Math.max(max, Number(r.code) || 0), 0) + 1;
    setNewProductCode(String(nextCode));
    setNewProductName('');
    setNewProductQuantity(1);
    setNewProductRate('');
    setOpenAddProductDialog(true);
  };

  // 1. Confirm Add Product Dialog
  const handleConfirmAddProduct = async () => {
    const trimmedName = newProductName.trim();
    if (!trimmedName) {
      setToast({ open: true, message: 'Please enter a product name', severity: 'error' });
      return;
    }

    const codeNum = Number(newProductCode) || (tableRows.length + 1);
    const rateNum = parseFloat(newProductRate) || 0;
    const qtyNum = Number(newProductQuantity) || 1;

    const newRow: DisplayRetailRow = {
      code: codeNum,
      productName: trimmedName,
      quantity: qtyNum,
      rate: rateNum,
    };

    const updatedRows = [...tableRows, newRow].sort((a, b) => Number(a.code) - Number(b.code));
    setTableRows(updatedRows);
    setOpenAddProductDialog(false);

    // Save to the current shop's price map
    const ratesToSave: PriceMapRateItem[] = updatedRows.map((r) => ({
      productId: r.productId,
      code: r.code,
      productName: r.productName,
      quantity: r.quantity,
      rate: r.rate,
    }));

    let updatedMaps = priceMaps.map((m) => {
      if (m.name.toLowerCase() === selectedPriceMap.toLowerCase()) {
        return { ...m, rates: ratesToSave };
      }
      return m;
    });

    setPriceMaps(updatedMaps);
    await syncPriceMaps(updatedMaps, selectedYear);

    // Persist to retail catalog in database
    try {
      await ProductsApi.create({
        slNo: codeNum,
        name: trimmedName,
        rate: rateNum,
        mrp: Math.round(rateNum * 1.25),
        productType: 'Retail',
        category: 'General',
        unit: 'Box',
        year: selectedYear,
      });
    } catch (e) {
      console.warn('Could not persist product to main catalog:', e);
    }

    setToast({
      open: true,
      message: `Product "${trimmedName}" added to ${selectedPriceMap}!`,
      severity: 'success',
    });
  };

  // 2. User requirement: Delete product with custom dialog instead of localhost alert
  const handleDeleteProductRow = (row: DisplayRetailRow, idx: number) => {
    setDeleteConfirmDialog({
      open: true,
      title: 'Delete Product from Price Map',
      message: `Are you sure you want to delete "${row.productName}" from ${selectedPriceMap}?`,
      onConfirm: async () => {
        const updatedRows = tableRows.filter((_, i) => i !== idx);
        setTableRows(updatedRows);
        setDeleteConfirmDialog((prev) => ({ ...prev, open: false }));

        const ratesToSave: PriceMapRateItem[] = updatedRows.map((r) => ({
          productId: r.productId,
          code: r.code,
          productName: r.productName,
          quantity: r.quantity,
          rate: r.rate,
        }));

        let updatedMaps = priceMaps.map((m) => {
          if (m.name.toLowerCase() === selectedPriceMap.toLowerCase()) {
            return { ...m, rates: ratesToSave };
          }
          return m;
        });

        setPriceMaps(updatedMaps);
        await syncPriceMaps(updatedMaps, selectedYear);
        setToast({ open: true, message: `"${row.productName}" deleted from ${selectedPriceMap}`, severity: 'success' });
      },
    });
  };

  // Save rates specifically for the chosen shop (Save button in Step 2)
  const handleSaveShopRates = async () => {
    if (!selectedPriceMap) {
      setToast({ open: true, message: 'Please choose a shop first', severity: 'error' });
      return;
    }

    setLoading(true)
    try {
      const ratesToSave: PriceMapRateItem[] = tableRows.map((r) => ({
        productId: r.productId,
        code: r.code,
        productName: r.productName,
        quantity: r.quantity,
        rate: r.rate,
      }));

      // Update specifically this shop's rates without altering other shops
      let updatedMaps = priceMaps.map((m) => {
        if (m.name.toLowerCase() === selectedPriceMap.toLowerCase()) {
          return {
            ...m,
            rates: ratesToSave,
          };
        }
        return m;
      });

      if (!updatedMaps.some((m) => m.name.toLowerCase() === selectedPriceMap.toLowerCase())) {
        updatedMaps.push({
          name: selectedPriceMap,
          year: selectedYear,
          rates: ratesToSave,
        });
      }

      setPriceMaps(updatedMaps);
      await syncPriceMaps(updatedMaps, selectedYear);

      setToast({
        open: true,
        message: `Rates for shop '${selectedPriceMap}' saved successfully!`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Error saving price map rates:', err);
      setToast({
        open: true,
        message: err.message || 'Failed to save rates',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new shop in Step 1
  const handleConfirmAddShop = async () => {
    const trimmed = newShopName.trim();
    if (!trimmed) {
      setToast({ open: true, message: 'Please enter a shop name', severity: 'error' });
      return;
    }

    if (allShopNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setToast({ open: true, message: `Shop '${trimmed}' already exists`, severity: 'error' });
      return;
    }

    const newRecord: PriceMapRecord = {
      name: trimmed,
      year: selectedYear,
      rates: REFERENCE_RETAIL_PRODUCTS.map((r) => ({ ...r })),
    };

    const updated = [...priceMaps, newRecord];
    setPriceMaps(updated);
    setSelectedShopIndex(updated.length - 1);
    setOpenAddShopDialog(false);
    await syncPriceMaps(updated, selectedYear);
    setToast({ open: true, message: `Shop '${trimmed}' added`, severity: 'success' });
  };

  // 2. User requirement: Delete shop with custom dialog instead of localhost alert
  const handleDeleteShop = () => {
    if (allShopNames.length <= 1) {
      setToast({ open: true, message: 'Cannot delete the only remaining shop', severity: 'error' });
      return;
    }

    const shopToDelete = allShopNames[selectedShopIndex];
    if (!shopToDelete) return;

    setDeleteConfirmDialog({
      open: true,
      title: 'Delete Shop',
      message: `Are you sure you want to delete shop "${shopToDelete}"? This cannot be undone.`,
      onConfirm: async () => {
        const updated = priceMaps.filter((m) => m.name.toLowerCase() !== shopToDelete.toLowerCase());
        setPriceMaps(updated);
        setSelectedShopIndex((prev) => Math.max(0, prev - 1));
        await syncPriceMaps(updated, selectedYear);
        setDeleteConfirmDialog((prev) => ({ ...prev, open: false }));
        setToast({ open: true, message: `Shop "${shopToDelete}" deleted successfully`, severity: 'success' });
      },
    });
  };

  // Save shop list in Step 1
  const handleSaveShopList = async () => {
    setLoading(true);
    try {
      await syncPriceMaps(priceMaps, selectedYear);
      setToast({ open: true, message: 'Price Map shop list saved!', severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Error saving shop list', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filtered rows for search in Step 2
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return tableRows;
    const term = searchTerm.toLowerCase();
    return tableRows.filter(
      (r) =>
        String(r.code).toLowerCase().includes(term) ||
        r.productName.toLowerCase().includes(term)
    );
  }, [tableRows, searchTerm]);

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
        {/* Module Subpage Navigation Dropdown Header */}
        <ProductSubPageHeader
          currentSubPage={propSubPage}
          onSubPageChange={onSubPageChange}
          year={selectedYear}
          extraRightContent={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {viewMode === 'products' ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 14 }} />}
                  onClick={() => onSubPageChange('pricemap master')}
                  sx={{
                    height: '28px',
                    color: '#0055EA',
                    borderColor: '#7F9DB9',
                    bgcolor: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    px: 1,
                    borderRadius: '3px',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#EBF3FB', borderColor: '#0055EA' },
                  }}
                >
                  ← Back to Price Map List
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleSelectShop(allShopNames[selectedShopIndex] || 'SVM')}
                  sx={{
                    height: '28px',
                    bgcolor: '#0855DA',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    px: 1.2,
                    borderRadius: '3px',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#0045BF' },
                  }}
                >
                  Open Products for {allShopNames[selectedShopIndex] || 'SVM'} ▶
                </Button>
              )}

              <Tooltip title="Refresh data" arrow>
                <IconButton
                  size="small"
                  onClick={() => loadAllData(selectedYear)}
                  sx={{ p: 0.4, border: '1px solid #CBD5E1', bgcolor: '#F8FAFC' }}
                >
                  <RefreshRoundedIcon sx={{ fontSize: 16, color: '#1E3A8A' }} />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />

        {/* Content Body */}
        <Box
          sx={{
            p: { xs: 1, sm: viewMode === 'shop-list' ? 2.5 : 1.5 },
            bgcolor: '#E4ECF5',
            display: 'flex',
            justifyContent: viewMode === 'shop-list' ? 'center' : 'stretch',
            alignItems: 'flex-start',
            minHeight: '520px',
            width: '100%',
          }}
        >
          {/* =====================================================================
              STEP 1: CHOOSE SHOP FIRST (Exact Window from Reference Image 1)
             ===================================================================== */}
          {viewMode === 'shop-list' ? (
            <Box
              sx={{
                width: { xs: '100%', sm: '460px', md: '500px' },
                bgcolor: '#ECE9D8',
                border: '1px solid #7F9DB9',
                borderRadius: '6px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.2,
              }}
            >
              {/* Header Label: "Price Map list" (Exact as Reference Image 1) */}
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#000000' }}>
                Price Map list
              </Typography>

                {/* DataGridView Container (Matching Reference Image 1) */}
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    border: '1px solid #7F9DB9',
                    borderRadius: 0,
                    bgcolor: '#9AAEC4',
                    height: '240px',
                    maxHeight: '240px',
                    overflowY: 'auto',
                  }}
                >
                  <Table size="small" stickyHeader sx={{ borderCollapse: 'collapse' }}>
                    <TableHead>
                      <TableRow>
                        {/* Left Indicator Column Header */}
                        <TableCell
                          sx={{
                            width: '26px',
                            minWidth: '26px',
                            p: 0,
                            bgcolor: '#ECE9D8',
                            borderRight: '1px solid #999999',
                            borderBottom: '1px solid #999999',
                          }}
                        />
                        {/* PriceMapName Header */}
                        <TableCell
                          sx={{
                            bgcolor: '#ECE9D8',
                            color: '#000000',
                            fontWeight: 500,
                            fontSize: '11.5px',
                            py: 0.4,
                            px: 1,
                            borderBottom: '1px solid #999999',
                            borderRight: '1px solid #D4D0C8',
                          }}
                        >
                          PriceMapName
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allShopNames.map((shopName, idx) => {
                        const isSelected = selectedShopIndex === idx;

                        return (
                          <TableRow
                            key={shopName + idx}
                            onClick={() => {
                              setSelectedShopIndex(idx);
                              handleSelectShop(shopName);
                            }}
                            onDoubleClick={() => handleSelectShop(shopName)}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: isSelected ? '#3399FF' : '#FFFFFF',
                              '&:hover': {
                                bgcolor: isSelected ? '#3399FF' : '#F5F5F5',
                              },
                            }}
                          >
                            {/* Row Indicator Cell with Arrow ▶ */}
                            <TableCell
                              sx={{
                                width: '26px',
                                minWidth: '26px',
                                p: 0,
                                textAlign: 'center',
                                bgcolor: '#ECE9D8',
                                borderRight: '1px solid #999999',
                                borderBottom: '1px solid #E0E0E0',
                                height: '22px',
                              }}
                            >
                              {isSelected && (
                                <PlayArrowRoundedIcon
                                  sx={{
                                    fontSize: 12,
                                    color: '#000000',
                                    verticalAlign: 'middle',
                                  }}
                                />
                              )}
                            </TableCell>

                            {/* PriceMapName Value Cell */}
                            <TableCell
                              sx={{
                                py: 0.3,
                                px: 1,
                                fontSize: '11.5px',
                                fontWeight: 500,
                                color: isSelected ? '#FFFFFF' : '#000000',
                                borderBottom: '1px solid #E0E0E0',
                                borderRight: '1px solid #E0E0E0',
                                height: '22px',
                                userSelect: 'none',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>{shopName}</span>
                                {isSelected && (
                                  <Typography sx={{ fontSize: '9.5px', color: '#DCEBFA', fontStyle: 'italic', pr: 0.5 }}>
                                    (Double-click to open products)
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Empty Fill Area to replicate Windows DataGridView look */}
                      {Array.from({ length: Math.max(0, 7 - allShopNames.length) }).map((_, i) => (
                        <TableRow key={`empty-${i}`}>
                          <TableCell sx={{ width: '26px', bgcolor: '#ECE9D8', borderRight: '1px solid #999999', borderBottom: '1px solid #E0E0E0', height: '22px' }} />
                          <TableCell sx={{ bgcolor: '#9AAEC4', borderBottom: '1px solid #8FA3BA', height: '22px' }} />
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Action Buttons Row: Add New | Save | Delete (Matching Image 1) */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                    pt: 1,
                    pb: 0.5,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setNewShopName('');
                      setOpenAddShopDialog(true);
                    }}
                    sx={{
                      minWidth: '78px',
                      height: '24px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#000000',
                      background: 'linear-gradient(180deg, #F6F6F6 0%, #EAEAEA 50%, #DFDFDF 51%, #D2D2D2 100%)',
                      border: '1px solid #707070',
                      borderRadius: '2px',
                      textTransform: 'none',
                      '&:hover': { background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)', borderColor: '#3399FF' },
                    }}
                  >
                    Add New
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={handleSaveShopList}
                    disabled={loading}
                    sx={{
                      minWidth: '78px',
                      height: '24px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#000000',
                      background: 'linear-gradient(180deg, #F6F6F6 0%, #EAEAEA 50%, #DFDFDF 51%, #D2D2D2 100%)',
                      border: '1.5px solid #3399FF',
                      borderRadius: '2px',
                      textTransform: 'none',
                      boxShadow: '0 0 2px #3399FF',
                      outline: '1px dotted #333333',
                      outlineOffset: '-4px',
                      '&:hover': { background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)', borderColor: '#0055EA' },
                    }}
                  >
                    Save
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={handleDeleteShop}
                    disabled={allShopNames.length <= 1}
                    sx={{
                      minWidth: '78px',
                      height: '24px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#000000',
                      background: 'linear-gradient(180deg, #F6F6F6 0%, #EAEAEA 50%, #DFDFDF 51%, #D2D2D2 100%)',
                      border: '1px solid #707070',
                      borderRadius: '2px',
                      textTransform: 'none',
                      '&:hover': { background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)', borderColor: '#DC2626', color: '#DC2626' },
                    }}
                  >
                    Delete
                  </Button>
                </Box>

                {/* Primary Button to choose the highlighted shop and load products */}
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleSelectShop(allShopNames[selectedShopIndex] || 'SVM')}
                    sx={{
                      height: '32px',
                      fontSize: '12px',
                      fontWeight: 700,
                      bgcolor: '#0855DA',
                      color: '#FFFFFF',
                      textTransform: 'none',
                      borderRadius: '3px',
                      boxShadow: '0 2px 4px rgba(0, 85, 234, 0.3)',
                      '&:hover': { bgcolor: '#0045BF' },
                    }}
                  >
                    👉 Choose "{allShopNames[selectedShopIndex] || 'SVM'}" &amp; Show Products
                  </Button>
                </Box>
              </Box>
          ) : (
            /* =====================================================================
                STEP 2: RETAIL PRODUCTS ONLY FOR CHOSEN SHOP (Customer Directory Style)
               ===================================================================== */
            <Box
              sx={{
                width: '100%',
                bgcolor: '#FFFFFF',
                border: '1px solid #B0C4DE',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                p: { xs: 1.5, sm: 2 },
                gap: 1.5,
              }}
            >
              {/* Header & Controls Row: Customer Directory Style */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}
              >
                {/* Left: Shop Name & Search */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                    Shop:
                  </Typography>

                  {/* Shop Name Display Badge */}
                  <Box
                    sx={{
                      height: '26px',
                      px: 1.2,
                      bgcolor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      userSelect: 'none',
                    }}
                  >
                    <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF' }}>
                      {selectedPriceMap}
                    </Typography>
                  </Box>

                  {/* Change Shop button */}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 13 }} />}
                    onClick={() => onSubPageChange('pricemap master')}
                    sx={{
                      height: '26px',
                      fontSize: '11px',
                      fontWeight: 700,
                      px: 1,
                      py: 0,
                      color: '#0F172A',
                      bgcolor: '#EDF4FB',
                      border: '1px solid #94A3B8',
                      borderRadius: '3px',
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#D9E4F2' },
                    }}
                  >
                    Change Shop
                  </Button>

                  {/* Search Product Box */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '3px',
                      px: 0.8,
                      height: '26px',
                    }}
                  >
                    <SearchRoundedIcon sx={{ fontSize: 14, color: '#64748B', mr: 0.5 }} />
                    <input
                      type="text"
                      placeholder="Search product..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        fontSize: '11.5px',
                        width: '130px',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </Box>
                </Box>

                {/* Right: Records count, + Add Product, and Save Rates */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>
                    Records count : <span style={{ fontWeight: 800, color: '#0F172A' }}>{filteredRows.length}</span>
                  </Typography>

                  {/* Add New Product Button (matching maroon Customer Directory + Add Customer button) */}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
                    onClick={handleOpenAddProductDialog}
                    sx={{
                      height: '26px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      px: 1.5,
                      py: 0,
                      color: '#FFFFFF',
                      bgcolor: '#741748',
                      borderRadius: '3px',
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#580e34' },
                    }}
                  >
                    + Add Product
                  </Button>

                  {/* Save Rates Button */}
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveShopRates}
                    disabled={loading}
                    sx={{
                      height: '26px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      px: 1.5,
                      py: 0,
                      color: '#FFFFFF',
                      bgcolor: '#0855DA',
                      borderRadius: '3px',
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#0045BF' },
                    }}
                  >
                    Save Rates
                  </Button>
                </Box>
              </Box>

                {/* Products Table matching Customer Directory cell size & styling */}
                <Box
                  sx={{
                    bgcolor: '#FFFFFF',
                    border: '1px solid #B0C4DE',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  <TableContainer sx={{ maxHeight: 'calc(100vh - 230px)', minHeight: '380px', overflowY: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                          <TableCell sx={{ width: '80px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                            ID
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                            Product Name
                          </TableCell>
                          <TableCell align="center" sx={{ width: '110px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                            Quantity
                          </TableCell>
                          <TableCell align="right" sx={{ width: '130px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                            Rate (₹)
                          </TableCell>
                          <TableCell align="center" sx={{ width: '130px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#64748B', fontSize: '12px' }}>
                              {searchTerm ? 'No products match your search criteria.' : `No products found in ${selectedPriceMap}.`}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRows.map((row, idx) => {
                            const isSelected = selectedRowIndex === idx;

                            return (
                              <TableRow
                                key={String(row.code) + row.productName + idx}
                                onClick={() => setSelectedRowIndex(idx)}
                                sx={{
                                  cursor: 'pointer',
                                  bgcolor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                  '&:hover': { bgcolor: '#F1F7FD' },
                                  '& td': { borderBottom: '1px solid #E2E8F0', py: 0.4 },
                                }}
                              >
                                {/* ID */}
                                <TableCell sx={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>
                                  #{String(row.code).padStart(4, '0')}
                                </TableCell>

                                {/* Product Name */}
                                <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? '#1E40AF' : '#0F172A' }}>
                                  {row.productName}
                                </TableCell>

                                {/* Quantity */}
                                <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                  {row.quantity && row.quantity > 0 ? row.quantity : 1}
                                </TableCell>

                                {/* Rate */}
                                <TableCell align="right">
                                  <input
                                    type="number"
                                    value={row.rate === 0 ? '' : row.rate}
                                    placeholder="0"
                                    onChange={(e) => handleRateChange(idx, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      width: '75px',
                                      height: '24px',
                                      textAlign: 'right',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      border: isSelected ? '1px solid #1E40AF' : '1px solid #CBD5E1',
                                      borderRadius: '2px',
                                      backgroundColor: '#FFFFFF',
                                      color: '#0F172A',
                                      outline: 'none',
                                    }}
                                  />
                                </TableCell>

                                {/* Actions */}
                                <TableCell align="center">
                                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                    {/* Edit Button */}
                                    <Button
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditDialog(row, idx);
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

                                    {/* Delete Button */}
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProductRow(row, idx);
                                      }}
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

                {/* Helper info */}
                <Box sx={{ textAlign: 'center', pt: 0.5 }}>
                  <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                    Rates configured for shop: <b>{selectedPriceMap}</b>. Edit rates directly or click <b>Edit</b>, then click <b>Save Rates</b>.
                  </Typography>
                </Box>
              </Box>
          )}
        </Box>
      </Box>

      {/* Add New Shop Dialog (in Step 1) */}
      <Dialog
        open={openAddShopDialog}
        onClose={() => setOpenAddShopDialog(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '4px', border: '2px solid #0055EA' } } }}
      >
        <DialogTitle sx={{ py: 1, px: 1.5, fontSize: '13px', fontWeight: 700, background: 'linear-gradient(180deg, #3A83F1 0%, #0855DA 100%)', color: '#FFFFFF' }}>
          Add New Shop / Price Map
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1, px: 2 }}>
          <Typography sx={{ fontSize: '12px', mb: 1, color: '#334155' }}>
            Enter new shop / price map name:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Shop / PriceMapName"
            value={newShopName}
            onChange={(e) => setNewShopName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmAddShop();
            }}
            sx={{ '& input': { fontSize: '12.5px', py: 0.8 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: '#F8FAFC' }}>
          <Button size="small" onClick={() => setOpenAddShopDialog(false)} sx={{ fontSize: '11px', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleConfirmAddShop} sx={{ fontSize: '11px', textTransform: 'none', bgcolor: '#0855DA', '&:hover': { bgcolor: '#0045BF' } }}>
            Add Shop
          </Button>
        </DialogActions>
      </Dialog>

      {/* 1. User requirement: Add New Product Dialog in Step 2 */}
      <Dialog
        open={openAddProductDialog}
        onClose={() => setOpenAddProductDialog(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '4px', border: '2px solid #16A34A' } } }}
      >
        <DialogTitle
          sx={{
            py: 1,
            px: 1.5,
            fontSize: '13px',
            fontWeight: 700,
            background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Add New Product to {selectedPriceMap}</span>
          <Chip size="small" label={selectedPriceMap} sx={{ bgcolor: '#FFFFFF', color: '#16A34A', fontWeight: 800, height: '20px' }} />
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1, px: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.3 }}>
                Product Code:
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={newProductCode}
                onChange={(e) => setNewProductCode(e.target.value)}
                sx={{ '& input': { fontSize: '12px', py: 0.6 } }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.3 }}>
                Product Name: *
              </Typography>
              <TextField
                autoFocus
                size="small"
                fullWidth
                placeholder={'e.g. 5" Special Flower Pot'}
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmAddProduct();
                }}
                sx={{ '& input': { fontSize: '12.5px', py: 0.6 } }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.3 }}>
                  Quantity:
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={newProductQuantity}
                  onChange={(e) => setNewProductQuantity(Number(e.target.value) || 1)}
                  sx={{ '& input': { fontSize: '12px', py: 0.6, textAlign: 'center' } }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.3 }}>
                  Rate (₹): *
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  placeholder="0"
                  value={newProductRate}
                  onChange={(e) => setNewProductRate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmAddProduct();
                  }}
                  sx={{ '& input': { fontSize: '12.5px', py: 0.6, fontWeight: 700, color: '#16A34A' } }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: '#F8FAFC' }}>
          <Button size="small" onClick={() => setOpenAddProductDialog(false)} sx={{ fontSize: '11px', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleConfirmAddProduct} sx={{ fontSize: '11px', textTransform: 'none', bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}>
            Add Product
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Product Rate Modal Dialog (in Step 2) */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '4px',
              border: '2px solid #0055EA',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            py: 1,
            px: 1.5,
            fontSize: '13px',
            fontWeight: 700,
            background: 'linear-gradient(180deg, #3A83F1 0%, #0855DA 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Edit Product Rate</span>
          <Chip
            size="small"
            label={`Shop: ${selectedPriceMap}`}
            sx={{ height: '20px', fontSize: '10px', fontWeight: 800, bgcolor: '#FFFFFF', color: '#0855DA' }}
          />
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 1, px: 2 }}>
          {editingRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ bgcolor: '#F8FAFC', p: 1, border: '1px solid #E2E8F0', borderRadius: '3px' }}>
                <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                  Product Code #{editingRow.code}
                </Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                  {editingRow.productName}
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, mt: 0.3 }}>
                  Quantity: {editingRow.quantity}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
                  Rate (₹) for {selectedPriceMap}:
                </Typography>
                <TextField
                  autoFocus
                  fullWidth
                  type="number"
                  size="small"
                  value={editRateValue}
                  onChange={(e) => setEditRateValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmEditRate();
                  }}
                  slotProps={{
                    input: {
                      sx: {
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#0F172A',
                      },
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '10.5px', color: '#64748B', width: '100%' }}>
                  Quick adjustments:
                </Typography>
                {[+5, +10, -5, -10].map((delta) => (
                  <Chip
                    key={delta}
                    size="small"
                    label={`${delta > 0 ? `+${delta}` : delta} ₹`}
                    clickable
                    onClick={() => {
                      const cur = parseFloat(editRateValue) || 0;
                      setEditRateValue(String(Math.max(0, cur + delta)));
                    }}
                    sx={{
                      height: '22px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      bgcolor: delta > 0 ? '#DCFCE7' : '#FEE2E2',
                      color: delta > 0 ? '#15803D' : '#B91C1C',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: '#F8FAFC' }}>
          <Button
            size="small"
            onClick={() => setEditModalOpen(false)}
            sx={{ fontSize: '11px', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleConfirmEditRate}
            sx={{
              fontSize: '11px',
              textTransform: 'none',
              bgcolor: '#0855DA',
              '&:hover': { bgcolor: '#0045BF' },
            }}
          >
            Apply Rate
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. User requirement: Custom Delete Confirmation Dialog (replacing window.confirm localhost alert) */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={() => setDeleteConfirmDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '4px',
              border: '2px solid #DC2626',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.25)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            py: 1,
            px: 1.5,
            fontSize: '13px',
            fontWeight: 700,
            background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />
          <span>{deleteConfirmDialog.title}</span>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1, px: 2 }}>
          <Typography sx={{ fontSize: '12.5px', color: '#1E293B', fontWeight: 500, my: 1 }}>
            {deleteConfirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: '#F8FAFC' }}>
          <Button
            size="small"
            onClick={() => setDeleteConfirmDialog((prev) => ({ ...prev, open: false }))}
            sx={{ fontSize: '11px', textTransform: 'none', color: '#64748B' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={deleteConfirmDialog.onConfirm}
            sx={{
              fontSize: '11px',
              textTransform: 'none',
              bgcolor: '#DC2626',
              '&:hover': { bgcolor: '#B91C1C' },
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%', fontSize: '12px' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
