import { useState, useEffect, useMemo, type FC, type ChangeEvent, type DragEvent } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Checkbox,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import * as XLSX from 'xlsx';
import { ProductsApi, CategoriesApi } from '../services/api';
import { printProductsListDirectly } from '../utils/printUtils';
import {
  getActiveBillingYear,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';
import { getSelectedBillYear } from '../utils/billYearUtils';
import { triggerYearRestrictionDialog } from './YearRestrictionDialog';

import { ProductSubPageHeader } from './ProductSubPageHeader';
import { PriceMapMasterPage } from './PriceMapMasterPage';
import { ProductPriceMapPage } from './ProductPriceMapPage';
import { type ProductSubPage } from '../types/productSubPages';

export type ProductType = 'Retail' | 'Wholesale' | 'Both';

export interface ProductItem {
  _id?: string;
  id?: string;
  slNo: number;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  unit?: string;
  qty?: number;
  productType?: ProductType | string;
  year?: number;
}

interface ProductsPageProps {
  initialSubPage?: ProductSubPage;
  onSubPageChangeProp?: (newPage: ProductSubPage) => void;
}

export const ProductsPage: FC<ProductsPageProps> = ({
  initialSubPage,
  onSubPageChangeProp,
}) => {
  const [currentSubPage, setCurrentSubPage] = useState<ProductSubPage>(() => {
    return (
      initialSubPage ||
      (localStorage.getItem('svm_product_subpage') as ProductSubPage) ||
      'product-Retail sales'
    );
  });

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<{ name: string; color?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const activeTabType: 'Retail' | 'Wholesale' =
    currentSubPage === 'product-whole sales' ? 'Wholesale' : 'Retail';

  const handleSubPageChange = (newPage: ProductSubPage) => {
    setCurrentSubPage(newPage);
    localStorage.setItem('svm_product_subpage', newPage);
    if (onSubPageChangeProp) {
      onSubPageChangeProp(newPage);
    }
  };

  useEffect(() => {
    if (initialSubPage && initialSubPage !== currentSubPage) {
      setCurrentSubPage(initialSubPage);
    }
  }, [initialSubPage]);

  // Year state synced with global Navbar/Settings
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);

  // Add / Edit Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productType, setProductType] = useState<ProductType>('Retail');
  const [productSlNo, setProductSlNo] = useState<number>(1);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('General');
  const [productUnit, setProductUnit] = useState('Box');
  const [productQty, setProductQty] = useState<number>(1);
  const [productRate, setProductRate] = useState<string>('0');
  const [productMrp, setProductMrp] = useState<string>('0');
  const [modalLoading, setModalLoading] = useState(false);

  // New Category Modal State
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryLoading, setNewCategoryLoading] = useState(false);

  // Bulk Upload Modal State
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkUploadType, setBulkUploadType] = useState<ProductType>('Retail');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Toast / Alert notification
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const fetchProductsAndCategories = async (targetYear: number | string = selectedYear) => {
    try {
      setLoading(true);
      const effectiveYear = targetYear || getSelectedBillYear();
      const [prodsData, catsData] = await Promise.all([
        ProductsApi.getAll(undefined, effectiveYear).catch(() => []),
        CategoriesApi.getAll().catch(() => []),
      ]);

      if (Array.isArray(prodsData)) {
        const formatted: ProductItem[] = prodsData.map((p: any, idx: number) => ({
          _id: p._id || p.id,
          id: p._id || p.id,
          slNo: Number(p.slNo) || idx + 1,
          name: p.name || '',
          category: p.category || 'General',
          rate: Number(p.rate) || 0,
          mrp: Number(p.mrp) || 0,
          unit: p.unit || 'Box',
          productType: (p.productType as ProductType) || 'Retail',
          year: p.year ? Number(p.year) : Number(effectiveYear),
        }));
        setProducts(formatted);
      }

      // Merge and ensure ALL categories are available without duplicates
      const catMap = new Map<string, { name: string; color?: string }>();

      // 1. Load from Categories API
      if (Array.isArray(catsData) && catsData.length > 0) {
        catsData.forEach((c: any) => {
          if (c && c.name && String(c.name).trim()) {
            const trimmed = String(c.name).trim();
            catMap.set(trimmed.toLowerCase(), {
              name: trimmed,
              color: c.color || '#2563EB',
            });
          }
        });
      }

      // 2. Load any categories that exist across products
      if (Array.isArray(prodsData)) {
        prodsData.forEach((p: any) => {
          if (p && p.category && String(p.category).trim()) {
            const trimmed = String(p.category).trim();
            if (!catMap.has(trimmed.toLowerCase())) {
              catMap.set(trimmed.toLowerCase(), {
                name: trimmed,
                color: '#4B5563',
              });
            }
          }
        });
      }

      // 3. Defaults if empty
      if (catMap.size === 0) {
        const DEFAULT_CATS = [
          'One Sound Crackers',
          'Ground Chakkars',
          'Flower Pots',
          'Rockets',
          'Sparklers',
          'Fountains',
          'Novelty Items',
          'Gift Boxes',
          'General',
        ];
        DEFAULT_CATS.forEach((catName) => {
          catMap.set(catName.toLowerCase(), { name: catName, color: '#2563EB' });
        });
      }

      const allUniqueCats = Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setCategories(allUniqueCats);
    } catch (err) {
      console.error('Failed to fetch products and categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories(selectedYear);
  }, [selectedYear]);

  // Listen to Global Year change
  useEffect(() => {
    const handleYearChange = (e: any) => {
      const newYr = e?.detail?.year ? Number(e.detail.year) : getActiveBillingYear();
      setSelectedYear(newYr);
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    return () => window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
  }, []);

  // Helper to get next Serial Number starting from 1 independently for each product type
  const getNextSlNoForType = (type: ProductType) => {
    const typeItems = products.filter(
      (p) => p.productType === type || p.productType === 'Both' || (!p.productType && type === 'Retail')
    );
    return typeItems.length > 0 ? Math.max(...typeItems.map((p) => Number(p.slNo) || 0)) + 1 : 1;
  };

  // Counts by Type
  const retailCount = useMemo(() => {
    return products.filter((p) => !p.productType || p.productType === 'Retail' || p.productType === 'Both').length;
  }, [products]);

  const wholesaleCount = useMemo(() => {
    return products.filter((p) => p.productType === 'Wholesale' || p.productType === 'Both').length;
  }, [products]);

  // Tab Filtering & Search
  const tabProducts = useMemo(() => {
    let list: ProductItem[] = [];
    if (activeTabType === 'Retail') {
      list = products.filter((p) => !p.productType || p.productType === 'Retail' || p.productType === 'Both');
    } else if (activeTabType === 'Wholesale') {
      list = products.filter((p) => p.productType === 'Wholesale' || p.productType === 'Both');
    } else {
      list = [...products];
    }
    return list.sort((a, b) => (a.slNo || 0) - (b.slNo || 0));
  }, [products, activeTabType]);

  const filteredProducts = useMemo(() => {
    return tabProducts.filter((p) => {
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        String(p.slNo).includes(term) ||
        (p.productType && p.productType.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [tabProducts, selectedCategory, searchTerm]);

  // Category Quick Add Handlers
  const openAddCategoryAction = () => {
    setNewCategoryName('');
    setNewCategoryCode('');
    setNewCategoryModalOpen(true);
  };

  const handleOpenAddCategory = () => {
    const currentSystemYear = new Date().getFullYear();
    if (Number(selectedYear) !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear),
        onProceed: () => openAddCategoryAction(),
      });
      return;
    }
    openAddCategoryAction();
  };

  const handleSaveNewCategory = async () => {
    if (!newCategoryName.trim()) {
      setToast({ open: true, message: 'Please enter category name.', severity: 'error' });
      return;
    }

    try {
      setNewCategoryLoading(true);
      const catName = newCategoryName.trim();
      const codeVal = newCategoryCode.trim().toUpperCase() || catName.slice(0, 4).toUpperCase();

      await CategoriesApi.create({
        name: catName,
        code: codeVal,
        displayOrder: categories.length + 1,
        isActive: true,
      });

      // Update state immediately
      setCategories((prev) => {
        if (prev.some((c) => c.name.toLowerCase() === catName.toLowerCase())) {
          return prev;
        }
        return [...prev, { name: catName }].sort((a, b) => a.name.localeCompare(b.name));
      });

      // Auto select in product creation
      setProductCategory(catName);

      setToast({
        open: true,
        message: `Category "${catName}" created successfully!`,
        severity: 'success',
      });
      setNewCategoryModalOpen(false);

      // Re-sync with backend
      fetchProductsAndCategories(selectedYear);
    } catch (err: any) {
      console.error('Failed to create category:', err);
      setToast({
        open: true,
        message: err.message || 'Failed to create category.',
        severity: 'error',
      });
    } finally {
      setNewCategoryLoading(false);
    }
  };

  // Open Add Modal
  const openAddAction = () => {
    const targetType = activeTabType;
    setEditingProduct(null);
    setProductType(targetType);
    setProductSlNo(getNextSlNoForType(targetType));
    setProductName('');
    setProductCategory(
      selectedCategory && selectedCategory !== 'ALL' ? selectedCategory : (categories[0]?.name || 'General')
    );
    setProductUnit('Box');
    setProductQty(1);
    setProductRate('0');
    setProductMrp('0');
    setOpenModal(true);
  };

  const handleOpenAdd = () => {
    const currentSystemYear = new Date().getFullYear();
    if (Number(selectedYear) !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear),
        onProceed: () => openAddAction(),
      });
      return;
    }
    openAddAction();
  };

  // Switch type inside modal -> update S.No accordingly
  const handleSelectProductTypeInModal = (newType: ProductType) => {
    setProductType(newType);
    if (!editingProduct) {
      setProductSlNo(getNextSlNoForType(newType));
    }
  };

  // Open Edit Modal
  const openEditAction = (product: ProductItem) => {
    setEditingProduct(product);
    setProductType((product.productType as ProductType) || 'Retail');
    setProductSlNo(product.slNo || 1);
    setProductName(product.name);
    setProductCategory(product.category || 'General');
    setProductUnit(product.unit || 'Box');
    setProductQty(product.qty !== undefined && product.qty !== null && product.qty > 0 ? product.qty : 1);
    setProductRate(String(product.rate || 0));
    setProductMrp(String(product.mrp || 0));
    setOpenModal(true);
  };

  const handleOpenEdit = (product: ProductItem) => {
    const currentSystemYear = new Date().getFullYear();
    if (Number(selectedYear) !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear),
        onProceed: () => openEditAction(product),
      });
      return;
    }
    openEditAction(product);
  };

  // Save Single Product
  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      alert('Please enter product name');
      return;
    }

    try {
      setModalLoading(true);

      const payload = {
        slNo: Number(productSlNo) || getNextSlNoForType(productType),
        name: productName.trim(),
        category: productCategory || 'General',
        unit: productUnit || 'Box',
        qty: Number(productQty) > 0 ? Number(productQty) : 1,
        rate: Number(productRate) || 0,
        mrp: Number(productMrp) || 0,
        productType: productType,
        year: Number(selectedYear),
        selectedViewYear: selectedYear,
      };

      if (editingProduct) {
        const id = editingProduct._id || editingProduct.id || '';
        await ProductsApi.update(id, payload);
        setToast({
          open: true,
          message: `Product "${payload.name}" updated successfully for ${productType}!`,
          severity: 'success',
        });
      } else {
        await ProductsApi.create(payload);
        setToast({
          open: true,
          message: `New product "${payload.name}" (S.No: ${payload.slNo}) added to ${productType}!`,
          severity: 'success',
        });
      }
      setOpenModal(false);
      fetchProductsAndCategories(selectedYear);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert(err.message || 'Error saving product');
    } finally {
      setModalLoading(false);
    }
  };

  // Bulk selection handlers
  const isAllSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedIds.includes(p._id || p.id || ''));
  }, [filteredProducts, selectedIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const visibleIds = new Set(filteredProducts.map((p) => p._id || p.id || ''));
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const visibleIds = filteredProducts.map((p) => p._id || p.id || '').filter(Boolean);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (!id) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const executeBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      await ProductsApi.bulkDelete(selectedIds);
      setProducts((prev) => prev.filter((p) => !selectedIds.includes(p._id || p.id || '')));
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      setToast({
        open: true,
        message: `${selectedIds.length} products deleted successfully`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Failed to bulk delete products:', err);
      alert('Error deleting selected products');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const currentSystemYear = new Date().getFullYear();
    if (Number(selectedYear) !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear),
        onProceed: () => executeBulkDelete(),
      });
      return;
    }
    executeBulkDelete();
  };

  const executeDeleteProduct = async (product: ProductItem) => {
    const id = product._id || product.id || '';
    if (!id) return;
    if (!window.confirm(`Delete product "${product.name}"?`)) return;

    try {
      await ProductsApi.delete(id);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      setToast({
        open: true,
        message: `Product "${product.name}" deleted.`,
        severity: 'info',
      });
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Error deleting product');
    }
  };

  const handleDeleteProduct = async (product: ProductItem) => {
    const currentSystemYear = new Date().getFullYear();
    if (Number(selectedYear) !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear),
        onProceed: () => executeDeleteProduct(product),
      });
      return;
    }
    executeDeleteProduct(product);
  };

  // Bulk Upload File Processing
  const handleFileChosen = (file: File) => {
    if (!file) return;
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
      alert('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawRows || rawRows.length === 0) {
          alert('Spreadsheet is empty.');
          return;
        }

        let headerRowIdx = -1;
        let slCol = -1;
        let nameCol = -1;
        let catCol = -1;
        let unitCol = -1;
        let qtyCol = -1;
        let mrpCol = -1;
        let rateCol = -1;
        let typeCol = -1;

        for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;
          const lowerCells = row.map((c) => String(c || '').toLowerCase().trim());
          const hasName = lowerCells.some((c) => c.includes('product') || c.includes('item') || c.includes('name') || c.includes('particular'));
          const hasRate = lowerCells.some((c) => c.includes('rate') || c.includes('price') || c.includes('mrp') || c.includes('amount'));

          if (hasName && hasRate) {
            headerRowIdx = r;
            lowerCells.forEach((c, idx) => {
              if (c.includes('sl') || c.includes('s.no') || c === 'no' || c === '#') slCol = idx;
              else if (c.includes('product') || c.includes('item') || c.includes('name') || c.includes('particular')) nameCol = idx;
              else if (c.includes('cat') || c.includes('group') || (c.includes('type') && !c.includes('product type'))) catCol = idx;
              else if (c.includes('unit') || c.includes('pkg') || c.includes('packing') || c.includes('per')) unitCol = idx;
              else if (c.includes('qty') || c.includes('quantity') || c.includes('stock')) qtyCol = idx;
              else if (c.includes('mrp') || c.includes('m.r.p')) mrpCol = idx;
              else if (c.includes('rate') || c.includes('price') || c.includes('net') || c.includes('selling')) rateCol = idx;
              else if (c.includes('product type') || c.includes('mode') || c === 'type') typeCol = idx;
            });
            break;
          }
        }

        const startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
        const parsedList: any[] = [];
        let currentCategory = 'General';
        const startingSl = replaceExisting ? 0 : getNextSlNoForType(bulkUploadType) - 1;

        for (let r = startIdx; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || !Array.isArray(row) || row.every((c) => String(c || '').trim() === '')) continue;

          let pName = '';
          let pCat = currentCategory;
          let pUnit = 'Box';
          let pQty = 1;
          let pMrp = 0;
          let pRate = 0;
          let pSlNo = startingSl + parsedList.length + 1;
          let pType: ProductType = bulkUploadType;

          if (nameCol !== -1 && row[nameCol] !== undefined && String(row[nameCol]).trim() !== '') {
            pName = String(row[nameCol]).trim();
            if (slCol !== -1 && row[slCol]) pSlNo = Number(String(row[slCol]).replace(/[^\d]/g, '')) || pSlNo;
            if (catCol !== -1 && row[catCol] && String(row[catCol]).trim()) {
              pCat = String(row[catCol]).trim();
              currentCategory = pCat;
            }
            if (unitCol !== -1 && row[unitCol] && String(row[unitCol]).trim()) pUnit = String(row[unitCol]).trim();
            if (qtyCol !== -1 && row[qtyCol]) pQty = Math.max(1, Number(String(row[qtyCol]).replace(/[^\d.]/g, '')) || 1);
            if (mrpCol !== -1 && row[mrpCol]) pMrp = Number(String(row[mrpCol]).replace(/[^\d.]/g, '')) || 0;
            if (rateCol !== -1 && row[rateCol]) pRate = Number(String(row[rateCol]).replace(/[^\d.]/g, '')) || 0;
            if (typeCol !== -1 && row[typeCol]) {
              const val = String(row[typeCol]).trim().toLowerCase();
              if (val.includes('wholesale')) pType = 'Wholesale';
              else if (val.includes('both')) pType = 'Both';
              else if (val.includes('retail')) pType = 'Retail';
            }
          } else {
            // Fallback parsing
            const nonEmpty = row.map((c) => String(c || '').trim()).filter((x) => x.length > 0);
            if (nonEmpty.length === 1 && isNaN(Number(nonEmpty[0]))) {
              currentCategory = nonEmpty[0];
              continue;
            }
            const textCandidates = nonEmpty.filter((x) => isNaN(Number(x.replace(/[₹,Rs\.\s]/gi, ''))));
            const numCandidates = nonEmpty
              .map((x) => parseFloat(x.replace(/[₹,Rs\.\s]/gi, '')))
              .filter((n) => !isNaN(n) && n > 0);

            if (textCandidates.length > 0) {
              pName = textCandidates[0];
              if (textCandidates.length > 1) pCat = textCandidates[1];
              if (numCandidates.length >= 2) {
                pMrp = numCandidates[0];
                pRate = numCandidates[1];
              } else if (numCandidates.length === 1) {
                pRate = numCandidates[0];
              }
            }
          }

          if (pName && pName.length >= 2) {
            parsedList.push({
              slNo: pSlNo,
              name: pName,
              category: pCat || 'General',
              unit: pUnit || 'Box',
              qty: pQty || 1,
              mrp: pMrp,
              rate: pRate,
              productType: pType,
            });
          }
        }

        if (parsedList.length === 0) {
          alert('Could not find valid products in the uploaded file.');
          return;
        }

        setPreviewItems(parsedList);
        setUploadFileName(file.name);
      } catch (err) {
        console.error('File parsing error:', err);
        alert('Failed to parse the file. Please check format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const executeBulkImport = async () => {
    try {
      setUploading(true);
      const itemsToImport = previewItems.map((item) => ({
        ...item,
        productType: bulkUploadType === 'Both' ? 'Both' : (item.productType || bulkUploadType),
        year: Number(selectedYear),
      }));

      await ProductsApi.bulkImport({
        items: itemsToImport,
        defaultType: bulkUploadType,
        replaceExisting: replaceExisting,
      });

      setBulkUploadOpen(false);
      setPreviewItems([]);
      setUploadFileName('');
      fetchProductsAndCategories(selectedYear);
      setToast({
        open: true,
        message: `Successfully imported ${previewItems.length} products to ${bulkUploadType}!`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Bulk import failed:', err);
      alert(err.message || 'Failed to import products.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmBulkImport = async () => {
    if (previewItems.length === 0) return;
    const currentSystemYear = new Date().getFullYear();
    if (Number(selectedYear) !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(selectedYear),
        onProceed: () => executeBulkImport(),
      });
      return;
    }
    executeBulkImport();
  };

  // Download Sample Template with S.No starting from 1
  const handleDownloadSampleExcel = () => {
    const currentMode = activeTabType;
    const sampleData = [
      {
        'S.No': 1,
        'Product Name': `${currentMode} 28 Chorsa Crackers`,
        'Category': 'Sound Crackers',
        'Unit': 'Box',
        'Qty': 1,
        'Product Type': currentMode,
      },
      {
        'S.No': 2,
        'Product Name': `${currentMode} Ground Chakkar Special (10 Pcs)`,
        'Category': 'Chakkars',
        'Unit': 'Box',
        'Qty': 1,
        'Product Type': currentMode,
      },
      {
        'S.No': 3,
        'Product Name': `${currentMode} Flower Pots Giant (10 Pcs)`,
        'Category': 'Flower Pots',
        'Unit': 'Box',
        'Qty': 1,
        'Product Type': currentMode,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products Template');
    XLSX.writeFile(wb, `SVM_Crackers_${currentMode}_Products_Template.xlsx`);
  };

  const handlePrint = () => {
    printProductsListDirectly(filteredProducts, selectedCategory, activeTabType);
  };

  // If subpage is pricemap master or product-price map, render the dedicated separate page component
  if (currentSubPage === 'pricemap master') {
    return <PriceMapMasterPage onSubPageChange={handleSubPageChange} />;
  }

  if (currentSubPage === 'product-price map') {
    return <ProductPriceMapPage onSubPageChange={handleSubPageChange} />;
  }

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
        {/* User Requested Subpage Dropdown & Header */}
        <ProductSubPageHeader
          currentSubPage={currentSubPage}
          onSubPageChange={handleSubPageChange}
          year={selectedYear}
          extraRightContent={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={`🛒 Retail: ${retailCount}`}
                size="small"
                sx={{
                  bgcolor: currentSubPage === 'product-Retail sales' ? '#0284C7' : '#E0F2FE',
                  color: currentSubPage === 'product-Retail sales' ? '#FFFFFF' : '#0369A1',
                  fontWeight: 700,
                  fontSize: '11px',
                  height: '22px',
                }}
              />
              <Chip
                label={`🏢 Wholesale: ${wholesaleCount}`}
                size="small"
                sx={{
                  bgcolor: currentSubPage === 'product-whole sales' ? '#7C3AED' : '#F3E8FF',
                  color: currentSubPage === 'product-whole sales' ? '#FFFFFF' : '#6D28D9',
                  fontWeight: 700,
                  fontSize: '11px',
                  height: '22px',
                }}
              />
              <Chip
                label={`Total: ${products.length}`}
                size="small"
                sx={{
                  bgcolor: '#E2E8F0',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '11px',
                  height: '22px',
                }}
              />
            </Box>
          }
        />



        {/* Inner Content Area */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
          {/* Active Sub-Page Notification Banner */}
          <Alert
            severity="info"
            icon={
              currentSubPage === 'product-Retail sales' ? (
                <ShoppingCartRoundedIcon sx={{ fontSize: 18, color: '#16A34A' }} />
              ) : (
                <StorefrontRoundedIcon sx={{ fontSize: 18, color: '#7C3AED' }} />
              )
            }
            sx={{
              mb: 1,
              py: 0.3,
              borderRadius: '3px',
              border: '1px solid',
              borderColor: currentSubPage === 'product-Retail sales' ? '#BBF7D0' : '#DDD6FE',
              bgcolor: currentSubPage === 'product-Retail sales' ? '#F0FDF4' : '#F5F3FF',
              fontSize: '12px',
            }}
          >
            <Typography
              component="span"
              sx={{
                fontWeight: 800,
                fontSize: '12px',
                color: currentSubPage === 'product-Retail sales' ? '#15803D' : '#6D28D9',
              }}
            >
              {currentSubPage === 'product-Retail sales'
                ? '🛒 Product - Retail Sales (product-Retail sales)'
                : '🏢 Product - Whole Sales (product-whole sales)'}
            </Typography>
            <Typography component="span" sx={{ fontSize: '11.5px', color: '#475569', ml: 1 }}>
              — Active separate page view. Ready for your custom content and configurations.
            </Typography>
          </Alert>
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
            {/* Left: Category Selector + Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                Category:
              </Typography>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="erp-input"
                style={{ fontSize: '12px', minWidth: '140px' }}
              >
                <option value="ALL">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Quick Add Category Button on Toolbar */}
              <Button
                onClick={handleOpenAddCategory}
                startIcon={<AddRoundedIcon sx={{ fontSize: 13 }} />}
                size="small"
                sx={{
                  height: '28px',
                  bgcolor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  px: 1.2,
                  borderRadius: '3px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#DBEAFE' },
                }}
              >
                + Category
              </Button>

              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', ml: 1 }}>
                Search:
              </Typography>
              <input
                type="text"
                placeholder={`Search ${activeTabType} products...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="erp-input"
                style={{ width: '210px' }}
              />
              {searchTerm && (
                <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.2 }}>
                  <ClearRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>

            {/* Right: Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {selectedIds.length > 0 && (
                <Button
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  startIcon={<DeleteSweepRoundedIcon sx={{ fontSize: 14 }} />}
                  size="small"
                  sx={{
                    height: '28px',
                    bgcolor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    px: 1.5,
                    borderRadius: '3px',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#FEE2E2' },
                  }}
                >
                  Delete Selected ({selectedIds.length})
                </Button>
              )}

              {/* Bulk Upload Button */}
              <Button
                onClick={() => {
                  const openBulkUploadModal = () => {
                    setBulkUploadType(activeTabType);
                    setPreviewItems([]);
                    setUploadFileName('');
                    setBulkUploadOpen(true);
                  };

                  const currentSystemYear = new Date().getFullYear();
                  if (Number(selectedYear) !== currentSystemYear) {
                    triggerYearRestrictionDialog({
                      selectedYear: String(selectedYear),
                      onProceed: () => openBulkUploadModal(),
                    });
                    return;
                  }
                  openBulkUploadModal();
                }}
                startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 15 }} />}
                size="small"
                sx={{
                  height: '28px',
                  bgcolor: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  color: '#15803D',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  px: 1.5,
                  borderRadius: '3px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#DCFCE7' },
                }}
              >
                Bulk Upload ({activeTabType})
              </Button>

              <Button
                onClick={handlePrint}
                startIcon={<PrintOutlinedIcon sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  height: '28px',
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
                Print Catalog
              </Button>

              <Button
                onClick={() => fetchProductsAndCategories(selectedYear)}
                startIcon={<RefreshRoundedIcon sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  height: '28px',
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

              {/* Single Add Product */}
              <Button
                onClick={handleOpenAdd}
                startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
                size="small"
                sx={{
                  height: '28px',
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
                Add Product
              </Button>
            </Box>
          </Box>

          {/* Products Table */}
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid #B0C4DE',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <TableContainer sx={{ maxHeight: 'calc(100vh - 245px)', minHeight: '380px' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#DCE7F5' }}>
                    <TableCell sx={{ width: '38px', bgcolor: '#DCE7F5', p: 0.5, textAlign: 'center' }}>
                      <Checkbox
                        size="small"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        sx={{ p: 0.2 }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '55px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      S.No
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Product Name
                    </TableCell>
                    <TableCell sx={{ width: '150px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Category
                    </TableCell>
                    <TableCell sx={{ width: '70px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Unit
                    </TableCell>
                    <TableCell sx={{ width: '80px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Qty
                    </TableCell>
                    <TableCell align="center" sx={{ width: '120px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={24} sx={{ color: '#1E40AF' }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5, color: '#64748B', fontSize: '12px' }}>
                        {searchTerm ? 'No products match your search.' : `No ${activeTabType} products found for year ${selectedYear}. Click "+ Add Product" or "Bulk Upload" to add.`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const pId = p._id || p.id || '';
                      const isChecked = selectedIds.includes(pId);
                      const displayQty = p.qty !== undefined && p.qty !== null && p.qty > 0 ? p.qty : 1;

                      return (
                        <TableRow
                          key={pId || idx}
                          sx={{
                            '&:hover': { bgcolor: '#F1F7FD' },
                            '& td': { borderBottom: '1px solid #E2E8F0', py: 0.4 },
                          }}
                        >
                          <TableCell sx={{ textAlign: 'center', p: 0.5 }}>
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(pId)}
                              sx={{ p: 0.2 }}
                            />
                          </TableCell>

                          {/* S.No starts from 1 for Retail, 1 for Wholesale */}
                          <TableCell sx={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#1E3A8A' }}>
                            {p.slNo || idx + 1}
                          </TableCell>

                          <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                            {p.name}
                          </TableCell>

                          <TableCell sx={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>
                            {p.category || 'General'}
                          </TableCell>

                          <TableCell sx={{ fontSize: '12px', color: '#334155' }}>
                            {p.unit || 'Box'}
                          </TableCell>

                          {/* Qty Column (defaults to 1) */}
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '12.5px', fontWeight: 800, color: '#16A34A' }}>
                              {displayQty}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <Button
                                size="small"
                                onClick={() => handleOpenEdit(p)}
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

                              <IconButton
                                size="small"
                                onClick={() => handleDeleteProduct(p)}
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
        </Box>
      </Box>

      {/* -------------------- Single Add / Edit Modal -------------------- */}
      <Dialog
        open={openModal}
        onClose={() => !modalLoading && setOpenModal(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              border: '1px solid #9BB3CC',
              borderRadius: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            py: 1,
            px: 2,
            fontSize: '13px',
            fontWeight: 700,
            color: '#0F172A',
          }}
        >
          {editingProduct ? 'Edit Product Details' : 'Add New Product (தனி பதிவு)'}
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: '#F8FAFC' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
            {/* Type Selection */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Product Type (வகை): *
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.8 }}>
                <Button
                  size="small"
                  onClick={() => handleSelectProductTypeInModal('Retail')}
                  variant={productType === 'Retail' ? 'contained' : 'outlined'}
                  sx={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 0.6,
                    bgcolor: productType === 'Retail' ? '#0284C7' : '#FFFFFF',
                    color: productType === 'Retail' ? '#FFFFFF' : '#0369A1',
                    borderColor: '#0284C7',
                  }}
                >
                  🛒 Retail
                </Button>
                <Button
                  size="small"
                  onClick={() => handleSelectProductTypeInModal('Wholesale')}
                  variant={productType === 'Wholesale' ? 'contained' : 'outlined'}
                  sx={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 0.6,
                    bgcolor: productType === 'Wholesale' ? '#7C3AED' : '#FFFFFF',
                    color: productType === 'Wholesale' ? '#FFFFFF' : '#7C3AED',
                    borderColor: '#7C3AED',
                  }}
                >
                  🏢 Wholesale
                </Button>
                <Button
                  size="small"
                  onClick={() => handleSelectProductTypeInModal('Both')}
                  variant={productType === 'Both' ? 'contained' : 'outlined'}
                  sx={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 0.6,
                    bgcolor: productType === 'Both' ? '#059669' : '#FFFFFF',
                    color: productType === 'Both' ? '#FFFFFF' : '#059669',
                    borderColor: '#059669',
                  }}
                >
                  🔄 Both
                </Button>
              </Box>
            </Box>

            {/* S.No & Product Name */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 1 }}>
              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.5 }}>
                  S.No: *
                </Typography>
                <input
                  type="number"
                  min="1"
                  value={productSlNo}
                  onChange={(e) => setProductSlNo(Number(e.target.value) || 1)}
                  className="erp-input"
                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px', fontWeight: 700 }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.5 }}>
                  Product Name: *
                </Typography>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. 28 Chorsa Crackers"
                  className="erp-input"
                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                  autoFocus
                />
              </Box>
            </Box>

            {/* Category with + New Category Button */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                  Category (பிரிவு): *
                </Typography>
                <Button
                  size="small"
                  onClick={handleOpenAddCategory}
                  startIcon={<AddRoundedIcon sx={{ fontSize: 13 }} />}
                  sx={{
                    fontSize: '11px',
                    py: 0.1,
                    px: 0.8,
                    minHeight: '20px',
                    color: '#1E40AF',
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '3px',
                    '&:hover': { bgcolor: '#DBEAFE' },
                  }}
                >
                  + New Category
                </Button>
              </Box>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="erp-input"
                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <option value="General">General</option>
                )}
              </select>
            </Box>

            {/* Unit */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Unit:
              </Typography>
              <select
                value={productUnit}
                onChange={(e) => setProductUnit(e.target.value)}
                className="erp-input"
                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
              >
                <option value="Box">Box</option>
                <option value="Pcs">Pcs</option>
                <option value="Pkt">Pkt</option>
                <option value="Bag">Bag</option>
                <option value="Bundle">Bundle</option>
                <option value="Case">Case</option>
              </select>
            </Box>

            {/* Quantity / Stock Qty (Default 1) */}
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Qty (எண்ணிக்கை): *
              </Typography>
              <input
                type="number"
                min="1"
                value={productQty}
                onChange={(e) => setProductQty(Math.max(1, Number(e.target.value) || 1))}
                className="erp-input"
                style={{ width: '100%', fontSize: '12px', padding: '6px 8px', fontWeight: 700 }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 1.5, bgcolor: '#EDF2F7', borderTop: '1px solid #CBD5E1' }}>
          <Button
            size="small"
            onClick={() => setOpenModal(false)}
            disabled={modalLoading}
            sx={{ fontSize: '11.5px', color: '#64748B' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSaveProduct}
            disabled={modalLoading || !productName.trim()}
            sx={{
              fontSize: '11.5px',
              bgcolor: '#741748',
              '&:hover': { bgcolor: '#580e34' },
            }}
          >
            {modalLoading ? <CircularProgress size={16} color="inherit" /> : editingProduct ? 'Update Product' : 'Save Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------------------- Quick Create New Category Modal -------------------- */}
      <Dialog
        open={newCategoryModalOpen}
        onClose={() => !newCategoryLoading && setNewCategoryModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              border: '1px solid #9BB3CC',
              borderRadius: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            py: 1,
            px: 2,
            fontSize: '13px',
            fontWeight: 700,
            color: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CategoryRoundedIcon sx={{ fontSize: 18, color: '#1E40AF' }} />
          Create New Category (புதிய பிரிவு)
        </DialogTitle>
        <DialogContent sx={{ p: 2, bgcolor: '#F8FAFC' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Category Name (பிரிவு பெயர்): *
              </Typography>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Special Fountains, Mega Aerial Shots"
                className="erp-input"
                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                autoFocus
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Category Code (Optional):
              </Typography>
              <input
                type="text"
                value={newCategoryCode}
                onChange={(e) => setNewCategoryCode(e.target.value)}
                placeholder="e.g. SFTN, MAS"
                className="erp-input"
                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, bgcolor: '#EDF2F7', borderTop: '1px solid #CBD5E1' }}>
          <Button
            size="small"
            onClick={() => setNewCategoryModalOpen(false)}
            disabled={newCategoryLoading}
            sx={{ fontSize: '11.5px', color: '#64748B' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSaveNewCategory}
            disabled={newCategoryLoading || !newCategoryName.trim()}
            sx={{
              fontSize: '11.5px',
              bgcolor: '#1E40AF',
              '&:hover': { bgcolor: '#1E3A8A' },
            }}
          >
            {newCategoryLoading ? <CircularProgress size={16} color="inherit" /> : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------------------- Bulk Upload Modal -------------------- */}
      <Dialog
        open={bulkUploadOpen}
        onClose={() => !uploading && setBulkUploadOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              border: '1px solid #9BB3CC',
              borderRadius: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
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
            <CloudUploadRoundedIcon sx={{ color: '#0284C7', fontSize: 20 }} />
            <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
              Bulk Product Upload (மொத்த பதிவு)
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={handleDownloadSampleExcel}
            startIcon={<FileDownloadRoundedIcon sx={{ fontSize: 14 }} />}
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'none',
              color: '#0284C7',
              bgcolor: '#E0F2FE',
              '&:hover': { bgcolor: '#BAE6FD' },
            }}
          >
            Download {bulkUploadType} Excel Template
          </Button>
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: '#F8FAFC' }}>
          {/* Target Type Selector */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', mb: 1 }}>
              Step 1: Select Target Product Type (எந்த பிரிவுக்கு சேர்க்க வேண்டும்):
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                size="small"
                onClick={() => setBulkUploadType('Retail')}
                variant={bulkUploadType === 'Retail' ? 'contained' : 'outlined'}
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: bulkUploadType === 'Retail' ? '#0284C7' : '#FFFFFF',
                  color: bulkUploadType === 'Retail' ? '#FFFFFF' : '#0369A1',
                  borderColor: '#0284C7',
                }}
              >
                🛒 Add as Retail (Starts from {retailCount + 1})
              </Button>
              <Button
                size="small"
                onClick={() => setBulkUploadType('Wholesale')}
                variant={bulkUploadType === 'Wholesale' ? 'contained' : 'outlined'}
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: bulkUploadType === 'Wholesale' ? '#7C3AED' : '#FFFFFF',
                  color: bulkUploadType === 'Wholesale' ? '#FFFFFF' : '#7C3AED',
                  borderColor: '#7C3AED',
                }}
              >
                🏢 Add as Wholesale (Starts from {wholesaleCount + 1})
              </Button>
              <Button
                size="small"
                onClick={() => setBulkUploadType('Both')}
                variant={bulkUploadType === 'Both' ? 'contained' : 'outlined'}
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: bulkUploadType === 'Both' ? '#059669' : '#FFFFFF',
                  color: bulkUploadType === 'Both' ? '#FFFFFF' : '#059669',
                  borderColor: '#059669',
                }}
              >
                🔄 Add as Both
              </Button>
            </Box>
          </Box>

          {/* Upload Drop Zone */}
          <Box
            onDragOver={(e: DragEvent) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileChosen(file);
            }}
            sx={{
              border: `2px dashed ${isDragging ? '#0284C7' : '#94A3B8'}`,
              bgcolor: isDragging ? '#E0F2FE' : '#FFFFFF',
              borderRadius: '4px',
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              id="bulk-product-file-input"
              style={{ display: 'none' }}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) handleFileChosen(file);
                e.target.value = '';
              }}
            />
            <label htmlFor="bulk-product-file-input" style={{ cursor: 'pointer', display: 'block' }}>
              <CloudUploadRoundedIcon sx={{ fontSize: 36, color: '#0284C7', mb: 1 }} />
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                {uploadFileName ? `Selected: ${uploadFileName}` : 'Click here or Drag & Drop Excel/CSV File'}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#64748B', mt: 0.5 }}>
                Supports .xlsx, .xls, .csv files with columns: S.No, Product Name, Category, Unit
              </Typography>
            </label>
          </Box>

          {/* Preview Table */}
          {previewItems.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  Parsed Products Preview ({previewItems.length} items ready to import):
                </Typography>
                <Chip
                  label={`Importing into: ${bulkUploadType}`}
                  size="small"
                  sx={{ bgcolor: '#0284C7', color: '#FFFFFF', fontWeight: 700, fontSize: '11px' }}
                />
              </Box>

              <TableContainer sx={{ maxHeight: '220px', border: '1px solid #CBD5E1', borderRadius: '3px' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                      <TableCell sx={{ fontSize: '11px', fontWeight: 700, width: '45px' }}>S.No</TableCell>
                      <TableCell sx={{ fontSize: '11px', fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontSize: '11px', fontWeight: 700, width: '130px' }}>Category</TableCell>
                      <TableCell sx={{ fontSize: '11px', fontWeight: 700, width: '60px' }}>Unit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewItems.slice(0, 50).map((item, idx) => (
                      <TableRow key={idx} sx={{ '& td': { py: 0.3, fontSize: '11px' } }}>
                        <TableCell sx={{ fontWeight: 700, color: '#1E3A8A' }}>{item.slNo || idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                        <TableCell sx={{ color: '#1E40AF' }}>{item.category}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {previewItems.length > 50 && (
                <Typography sx={{ fontSize: '11px', color: '#64748B', mt: 0.5, textAlign: 'center' }}>
                  Showing first 50 items of {previewItems.length} total products.
                </Typography>
              )}
            </Box>
          )}

          {/* Replace option */}
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              size="small"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              sx={{ p: 0.2 }}
            />
            <Typography sx={{ fontSize: '11.5px', color: '#475569' }}>
              Replace existing products in <b>{bulkUploadType}</b> (Serial numbers will reset and restart from 1)
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 1.5, bgcolor: '#EDF2F7', borderTop: '1px solid #CBD5E1' }}>
          <Button
            size="small"
            onClick={() => setBulkUploadOpen(false)}
            disabled={uploading}
            sx={{ fontSize: '11.5px', color: '#64748B' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleConfirmBulkImport}
            disabled={uploading || previewItems.length === 0}
            sx={{
              fontSize: '11.5px',
              bgcolor: '#15803D',
              '&:hover': { bgcolor: '#166534' },
            }}
          >
            {uploading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              `Confirm & Import ${previewItems.length} Products`
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------------------- Bulk Delete Confirmation Modal -------------------- */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => !bulkDeleting && setBulkDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              border: '1px solid #FECACA',
              borderRadius: '4px',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#FEF2F2',
            color: '#DC2626',
            fontSize: '13px',
            fontWeight: 700,
            py: 1,
            px: 2,
          }}
        >
          Confirm Bulk Delete
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography sx={{ fontSize: '12px', color: '#334155' }}>
            Are you sure you want to delete <b>{selectedIds.length}</b> selected products? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, bgcolor: '#F8FAFC' }}>
          <Button
            size="small"
            onClick={() => setBulkDeleteDialogOpen(false)}
            disabled={bulkDeleting}
            sx={{ fontSize: '11.5px', color: '#64748B' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleConfirmBulkDelete}
            disabled={bulkDeleting}
            sx={{
              fontSize: '11.5px',
              bgcolor: '#DC2626',
              '&:hover': { bgcolor: '#B91C1C' },
            }}
          >
            {bulkDeleting ? <CircularProgress size={16} color="inherit" /> : 'Delete Selected'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------------------- Snackbar Notification -------------------- */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
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
