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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  InputBase,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Grid,
  Checkbox,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { ProductsApi, CategoriesApi, PriceListsApi } from '../services/api';
import { printProductsListDirectly } from '../utils/printUtils';

export interface ProductItem {
  _id?: string;
  id?: string;
  slNo: number;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  unit?: string;
}

export const ProductsPage: FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<{ name: string; color?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Add / Edit Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('General');
  const [productUnit, setProductUnit] = useState('Box');
  const [productRate, setProductRate] = useState<string>('0');
  const [productMrp, setProductMrp] = useState<string>('0');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchProductsAndPrices = async () => {
    try {
      setLoading(true);
      const [prodsData, catsData, priceData] = await Promise.all([
        ProductsApi.getAll().catch(() => []),
        CategoriesApi.getAll().catch(() => []),
        PriceListsApi.getAll().catch(() => []),
      ]);

      const priceMap = new Map<string, any>();
      if (Array.isArray(priceData)) {
        priceData.forEach((item: any) => {
          if (item.itemName) {
            priceMap.set(item.itemName.toLowerCase().trim(), item);
          }
        });
      }

      // Merge product list with price list data so latest amounts and stocks are always reflected
      let mergedProducts: ProductItem[] = [];
      const seenNames = new Set<string>();

      if (Array.isArray(prodsData)) {
        prodsData.forEach((p: any, idx: number) => {
          const key = (p.name || '').toLowerCase().trim();
          seenNames.add(key);
          const priceItem = priceMap.get(key);

          mergedProducts.push({
            _id: p._id || p.id,
            id: p._id || p.id,
            slNo: p.slNo || idx + 1,
            name: p.name,
            category: priceItem?.category || p.category || 'General',
            rate: priceItem?.rate !== undefined && priceItem.rate > 0 ? priceItem.rate : (p.rate || 0),
            mrp: priceItem?.mrp !== undefined && priceItem.mrp > 0 ? priceItem.mrp : (p.mrp || 0),
            unit: priceItem?.unit || p.unit || 'Box',
          });
        });
      }

      // If price list has items that aren't yet in products, include them too
      if (Array.isArray(priceData)) {
        let maxSlNo = mergedProducts.length > 0 ? Math.max(...mergedProducts.map((p) => p.slNo || 0)) : 0;
        priceData.forEach((pItem: any) => {
          const key = (pItem.itemName || '').toLowerCase().trim();
          if (key && !seenNames.has(key)) {
            maxSlNo += 1;
            seenNames.add(key);

            mergedProducts.push({
              _id: pItem._id || pItem.id,
              id: pItem._id || pItem.id,
              slNo: pItem.slNo || maxSlNo,
              name: pItem.itemName,
              category: pItem.category || 'General',
              rate: pItem.rate || 0,
              mrp: pItem.mrp || 0,
              unit: pItem.unit || 'Box',
            });
          }
        });
      }

      setProducts(mergedProducts);
      if (Array.isArray(catsData) && catsData.length > 0) {
        setCategories(catsData.map((c) => ({ name: c.name, color: c.color })));
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndPrices();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        String(p.slNo).includes(term) ||
        String(p.rate).includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductName('');
    setProductCategory(categories[0]?.name || 'General');
    setProductUnit('Box');
    setProductRate('0');
    setProductMrp('0');
    setOpenModal(true);
  };

  const handleOpenEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductCategory(product.category || 'General');
    setProductUnit(product.unit || 'Box');
    setProductRate(String(product.rate || 0));
    setProductMrp(String(product.mrp || 0));
    setOpenModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      alert('Please enter product name');
      return;
    }

    try {
      setModalLoading(true);

      const payload = {
        name: productName.trim(),
        category: productCategory,
        unit: productUnit,
        rate: Number(productRate) || 0,
        mrp: Number(productMrp) || 0,
      };

      if (editingProduct) {
        const id = editingProduct._id || editingProduct.id || '';
        await ProductsApi.update(id, payload);
      } else {
        const nextSlNo = products.length > 0 ? Math.max(...products.map((p) => p.slNo || 0)) + 1 : 1;
        await ProductsApi.create({
          slNo: nextSlNo,
          ...payload,
        });
      }
      setOpenModal(false);
      fetchProductsAndPrices();
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Error saving product');
    } finally {
      setModalLoading(false);
    }
  };

  // Selection & Bulk Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isAllSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedIds.includes(p._id || p.id || ''));
  }, [filteredProducts, selectedIds]);

  const isSomeSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    const count = filteredProducts.filter((p) => selectedIds.includes(p._id || p.id || '')).length;
    return count > 0 && count < filteredProducts.length;
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkDeleting(true);
      await ProductsApi.bulkDelete(selectedIds);
      setProducts((prev) => prev.filter((p) => !selectedIds.includes(p._id || p.id || '')));
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
    } catch (err) {
      console.error('Failed to bulk delete products:', err);
      alert('Error deleting selected products');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteProduct = async (product: ProductItem) => {
    const id = product._id || product.id || '';
    if (!id) return;
    if (!window.confirm(`Delete product "${product.name}"?`)) return;

    try {
      await ProductsApi.delete(id);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Error deleting product');
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 1, sm: 1.5, md: 2 },
        py: 1,
        boxSizing: 'border-box',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Festive Crimson & Gold Header Banner */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            borderBottom: '2px solid #F59E0B',
            px: { xs: 2, sm: 3 },
            py: 1.5,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            minHeight: '60px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Inventory2RoundedIcon sx={{ color: '#FEF08A', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  color: '#FFFFFF',
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                }}
              >
                Products & Price Catalog
              </Typography>
              <Typography sx={{ color: '#FEF08A', fontSize: '11.5px', fontWeight: 600 }}>
                Synced directly with Price List & Categories
              </Typography>
            </Box>
            <Typography
              sx={{
                color: '#FEF08A',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: 'rgba(254, 240, 138, 0.2)',
                border: '1px solid rgba(254, 240, 138, 0.35)',
                px: 1.2,
                py: 0.3,
                borderRadius: '12px',
                ml: 1,
              }}
            >
              {filteredProducts.length} items
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
            }}
          >
            {/* Search Box */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                px: 1.2,
                height: '38px',
                width: { xs: '100%', sm: '220px' },
                boxSizing: 'border-box',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <SearchRoundedIcon sx={{ color: '#D97706', fontSize: 19, mr: 0.8, flexShrink: 0 }} />
              <InputBase
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1F1714',
                  width: '100%',
                  '& input': {
                    p: 0,
                    '&::placeholder': { color: '#A8998A', opacity: 1 },
                  },
                }}
              />
              {searchTerm && (
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                  sx={{ p: 0.4, color: '#D97706', '&:hover': { color: '#B45309' } }}
                >
                  <ClearRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>

            {/* Print Products List Button */}
            <Button
              variant="contained"
              disableElevation
              onClick={() => printProductsListDirectly(filteredProducts)}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: 18 }} />}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                color: '#FFFFFF',
                border: '1px solid rgba(254, 240, 138, 0.4)',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.8,
                height: '38px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              Print List
            </Button>

            {/* Add Product Button */}
            <Button
              variant="contained"
              disableElevation
              onClick={handleOpenAdd}
              startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                backgroundColor: '#FFFFFF',
                color: '#B91C1C',
                border: '1.5px solid #E2E8F0',
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'none',
                px: 2,
                height: '38px',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#F8FAFC',
                },
              }}
            >
              Add Product
            </Button>
          </Box>
        </Box>

        {/* Category Pills Filter */}
        <Box
          sx={{
            p: 1.2,
            px: { xs: 2, sm: 3 },
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155', mr: 0.5, flexShrink: 0 }}>
            Category:
          </Typography>

          <Chip
            label={`All (${products.length})`}
            onClick={() => setSelectedCategory('ALL')}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              backgroundColor: selectedCategory === 'ALL' ? '#B91C1C' : '#FFFFFF',
              color: selectedCategory === 'ALL' ? '#FFFFFF' : '#475569',
              border: selectedCategory === 'ALL' ? '1px solid #991B1B' : '1px solid #E2E8F0',
              '&:hover': {
                backgroundColor: selectedCategory === 'ALL' ? '#991B1B' : '#F1F5F9',
              },
            }}
          />

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const count = products.filter((p) => p.category === cat.name).length;
            return (
              <Chip
                key={cat.name}
                label={`${cat.name} (${count})`}
                onClick={() => setSelectedCategory(cat.name)}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#B91C1C' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#57463A',
                  border: isSelected ? '1px solid #991B1B' : '1px solid #E5E7EB',
                  '&:hover': {
                    backgroundColor: isSelected ? '#991B1B' : '#F3F4F6',
                  },
                }}
              />
            );
          })}
        </Box>

        {/* Bulk Selection Action Bar */}
        {selectedIds.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FEF2F2',
              borderBottom: '2px solid #FECACA',
              px: { xs: 2, sm: 3 },
              py: 1.2,
              animation: 'fadeIn 0.2s ease-in-out',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#991B1B' }}>
                {selectedIds.length} {selectedIds.length === 1 ? 'product' : 'products'} selected
              </Typography>
              <Button
                size="small"
                onClick={() => setSelectedIds([])}
                sx={{
                  textTransform: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#7F1D1D',
                  p: 0,
                  minWidth: 'auto',
                  textDecoration: 'underline',
                  '&:hover': { backgroundColor: 'transparent', color: '#991B1B' },
                }}
              >
                Deselect All
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => setBulkDeleteDialogOpen(true)}
                startIcon={<DeleteSweepRoundedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  textTransform: 'none',
                  px: 2,
                  py: 0.6,
                  borderRadius: '7px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                  '&:hover': {
                    backgroundColor: '#B91C1C',
                  },
                }}
              >
                Delete Selected ({selectedIds.length})
              </Button>
            </Box>
          </Box>
        )}

        {/* Table Container */}
        <TableContainer sx={{ height: { xs: 'auto', md: 'calc(100vh - 185px)' }, maxHeight: { xs: '550px', md: 'calc(100vh - 185px)' }, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table stickyHeader sx={{ minWidth: { xs: '700px', sm: '100%' } }} aria-label="product table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                {/* Select All Checkbox Column */}
                <TableCell
                  align="center"
                  sx={{
                    py: 1.5,
                    px: 1.5,
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #E2E8F0',
                    width: '48px',
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={handleToggleSelectAll}
                    disabled={filteredProducts.length === 0}
                    sx={{
                      p: 0,
                      color: '#D97706',
                      '&.Mui-checked': { color: '#DC2626' },
                      '&.MuiCheckbox-indeterminate': { color: '#DC2626' },
                    }}
                  />
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.5,
                    px: { xs: 1.5, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #E2E8F0',
                    width: '70px',
                  }}
                >
                  SL.NO
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.5,
                    px: { xs: 2, sm: 3 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  PRODUCT NAME
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.5,
                    px: { xs: 1.5, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #E2E8F0',
                    width: '200px',
                  }}
                >
                  CATEGORY
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    py: 1.5,
                    px: { xs: 1, sm: 2 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #E2E8F0',
                    width: '90px',
                  }}
                >
                  UNIT
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    py: 1.5,
                    px: { xs: 1.5, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #E2E8F0',
                    width: '110px',
                  }}
                >
                  MRP (₹)
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    py: 1.5,
                    px: { xs: 2, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #E2E8F0',
                    width: '130px',
                  }}
                >
                  RATE / PRICE (₹)
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    py: 1.5,
                    px: { xs: 1, sm: 2 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #E2E8F0',
                    width: '65px',
                  }}
                >
                  EDIT
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    py: 1.5,
                    px: { xs: 1, sm: 2 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '2px solid #E2E8F0',
                    width: '65px',
                  }}
                >
                  DELETE
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6, color: '#786C58' }}>
                    {searchTerm ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '14px', color: '#786C58', fontWeight: 500 }}>
                          No products matching "{searchTerm}" found.
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => setSearchTerm('')}
                          sx={{ textTransform: 'none', color: '#B91C1C', fontWeight: 700 }}
                        >
                          Clear Search
                        </Button>
                      </Box>
                    ) : (
                      'No products found. Upload a price list or click "Add Product" to add one.'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product, index) => {
                  const prodId = product._id || product.id || String(index);
                  const isSelected = selectedIds.includes(prodId);
                  const isLast = index === filteredProducts.length - 1;

                  return (
                    <TableRow
                      key={prodId}
                      selected={isSelected}
                      sx={{
                        backgroundColor: isSelected ? '#FEF2F2 !important' : 'inherit',
                        '&:hover': {
                          backgroundColor: isSelected ? '#FEE2E2 !important' : '#FEFDF5',
                        },
                      }}
                    >
                      {/* Checkbox Cell */}
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.4,
                          px: 1.5,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(prodId)}
                          sx={{
                            p: 0,
                            color: '#D1D5DB',
                            '&.Mui-checked': { color: '#DC2626' },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 1.4,
                          px: { xs: 1.5, sm: 2.5 },
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: '#786C58',
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {product.slNo || index + 1}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 1.4,
                          px: { xs: 2, sm: 3 },
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#1F1714',
                          letterSpacing: '0.01em',
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {product.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 1.4,
                          px: { xs: 1.5, sm: 2.5 },
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Chip
                          label={product.category || 'General'}
                          size="small"
                          sx={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: '#F8FAFC',
                            color: '#334155',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            height: '24px',
                          }}
                        />
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.4,
                          px: { xs: 1, sm: 2 },
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#57463A',
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {product.unit || 'Box'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          py: 1.4,
                          px: { xs: 1.5, sm: 2.5 },
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: '#6B7280',
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {product.mrp ? `₹${Number(product.mrp).toLocaleString('en-IN')}` : '—'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          py: 1.4,
                          px: { xs: 2, sm: 2.5 },
                          fontSize: '14.5px',
                          fontWeight: 800,
                          color: '#B91C1C',
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        ₹{Number(product.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>



                      {/* Edit Button */}
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.4,
                          px: { xs: 1, sm: 2 },
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Tooltip title="Edit Product" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(product)}
                            sx={{
                              color: '#D97706',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              p: 0.6,
                              transition: 'all 0.15s ease',
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
                      </TableCell>

                      {/* Delete Button */}
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.4,
                          px: { xs: 1, sm: 2 },
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Tooltip title="Delete Product" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteProduct(product)}
                            sx={{
                              color: '#DC2626',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              borderRadius: '6px',
                              p: 0.6,
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => !bulkDeleting && setBulkDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              p: 1,
              border: '1.5px solid #FECACA',
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.2, color: '#DC2626', fontWeight: 800, fontSize: '17px' }}>
          <WarningAmberRoundedIcon sx={{ color: '#DC2626', fontSize: 24 }} />
          Bulk Delete Confirmation
        </DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <Typography sx={{ fontSize: '13.5px', color: '#1F2937', fontWeight: 600, mb: 1.5 }}>
            Are you sure you want to permanently delete <strong>{selectedIds.length}</strong> selected products?
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.5, backgroundColor: '#FEF2F2', p: 1.5, borderRadius: '8px', border: '1px solid #FECACA' }}>
            ⚠️ This will remove these products from both the Products catalog and the synced Price List. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setBulkDeleteDialogOpen(false)}
            disabled={bulkDeleting}
            sx={{ color: '#6B7280', fontWeight: 700, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmBulkDelete}
            disabled={bulkDeleting}
            startIcon={bulkDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteSweepRoundedIcon />}
            sx={{
              backgroundColor: '#DC2626',
              fontWeight: 800,
              textTransform: 'none',
              px: 2.5,
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
              '&:hover': { backgroundColor: '#B91C1C' },
            }}
          >
            {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Products`}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Add / Edit Product Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              p: 1,
              border: '1.5px solid #E2E8F0',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '18px', fontWeight: 800, color: '#B91C1C' }}>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
              Product Name *
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="e.g. 2 1/2 KURUVI"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Category
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  sx={{ fontSize: '13.5px', fontWeight: 600 }}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.name} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                  {categories.every((c) => c.name !== productCategory) && (
                    <MenuItem value={productCategory}>{productCategory}</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Unit
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Box, Pcs, Pkt"
                value={productUnit}
                onChange={(e) => setProductUnit(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                MRP (₹)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={productMrp}
                onChange={(e) => setProductMrp(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#B91C1C', mb: 0.6 }}>
                Selling Rate / Price (₹) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={productRate}
                onChange={(e) => setProductRate(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '14px', fontWeight: 800, color: '#B91C1C' } } }}
              />
            </Grid>
          </Grid>


        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setOpenModal(false)}
            sx={{ color: '#786C58', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSaveProduct}
            disabled={modalLoading}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              borderRadius: '8px',
              '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
            }}
          >
            {modalLoading ? 'Saving...' : 'Save Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
