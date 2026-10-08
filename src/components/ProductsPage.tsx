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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Checkbox,
} from '@mui/material';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
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

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  const handlePrint = () => {
    printProductsListDirectly(filteredProducts, selectedCategory);
  };

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
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2RoundedIcon sx={{ fontSize: 18, color: '#0284C7' }} />
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.01em',
              }}
            >
              Product Master & Price Catalog
            </Typography>
          </Box>

          <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#1E3A8A' }}>
            Total Products: {products.length} ({filteredProducts.length} shown)
          </Typography>
        </Box>

        {/* Inner Content Area */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
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
                style={{ fontSize: '12px', minWidth: '150px' }}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', ml: 1 }}>
                Search:
              </Typography>
              <input
                type="text"
                placeholder="Filter by name, rate, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="erp-input"
                style={{ width: '200px' }}
              />
              {searchTerm && (
                <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.2 }}>
                  <ClearRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>

            {/* Right: Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectedIds.length > 0 && (
                <Button
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  startIcon={<DeleteSweepRoundedIcon sx={{ fontSize: 14 }} />}
                  size="small"
                  sx={{
                    height: '26px',
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

              <Button
                onClick={handlePrint}
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
                Print Catalog
              </Button>

              <Button
                onClick={fetchProductsAndPrices}
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

              <Button
                onClick={handleOpenAdd}
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
            <TableContainer sx={{ maxHeight: 'calc(100vh - 210px)', minHeight: '380px' }}>
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
                    <TableCell sx={{ width: '160px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Category
                    </TableCell>
                    <TableCell sx={{ width: '80px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Unit
                    </TableCell>
                    <TableCell sx={{ width: '100px', textAlign: 'right', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      MRP (₹)
                    </TableCell>
                    <TableCell sx={{ width: '110px', textAlign: 'right', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Rate (₹)
                    </TableCell>
                    <TableCell align="center" sx={{ width: '130px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={24} sx={{ color: '#1E40AF' }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 5, color: '#64748B', fontSize: '12px' }}>
                        {searchTerm ? 'No products match your search.' : 'No products found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const pId = p._id || p.id || '';
                      const isChecked = selectedIds.includes(pId);

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

                          <TableCell sx={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
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

                          <TableCell sx={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                            {p.mrp ? `₹${p.mrp}` : '-'}
                          </TableCell>

                          <TableCell sx={{ textAlign: 'right', fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                            ₹{p.rate || 0}
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

      {/* Add / Edit Product Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
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
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>

        <DialogContent sx={{ bgcolor: '#F0F5FA', display: 'flex', flexDirection: 'column', gap: 1.2, p: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
              Product Name *
            </Typography>
            <input
              type="text"
              placeholder="e.g. 2 3/4 Kuruvi Crackers"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="erp-input"
              style={{ width: '100%' }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
              Category
            </Typography>
            <select
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              className="erp-input"
              style={{ width: '100%' }}
            >
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              {categories.length === 0 && <option value="General">General</option>}
            </select>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                Unit
              </Typography>
              <input
                type="text"
                placeholder="e.g. Box / Pkt"
                value={productUnit}
                onChange={(e) => setProductUnit(e.target.value)}
                className="erp-input"
                style={{ width: '100%' }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
                Rate / Price (₹) *
              </Typography>
              <input
                type="number"
                value={productRate}
                onChange={(e) => setProductRate(e.target.value)}
                className="erp-input"
                style={{ width: '100%', textAlign: 'right', fontWeight: 700 }}
              />
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.3 }}>
              M.R.P (₹)
            </Typography>
            <input
              type="number"
              value={productMrp}
              onChange={(e) => setProductMrp(e.target.value)}
              className="erp-input"
              style={{ width: '100%', textAlign: 'right' }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ bgcolor: '#EDF4FB', borderTop: '1px solid #B0C4DE', p: 1 }}>
          <Button
            onClick={() => setOpenModal(false)}
            sx={{ textTransform: 'none', color: '#0F172A', fontWeight: 700, fontSize: '12px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveProduct}
            disabled={modalLoading}
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
            {modalLoading ? <CircularProgress size={16} color="inherit" /> : 'Save Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirm Dialog */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
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
          Confirm Bulk Deletion
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#F0F5FA', p: 2 }}>
          <Typography sx={{ fontSize: '12.5px', color: '#0F172A' }}>
            Are you sure you want to permanently delete {selectedIds.length} selected products?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#EDF4FB', borderTop: '1px solid #B0C4DE', p: 1 }}>
          <Button
            onClick={() => setBulkDeleteDialogOpen(false)}
            sx={{ textTransform: 'none', color: '#0F172A', fontWeight: 700, fontSize: '12px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBulkDelete}
            disabled={bulkDeleting}
            variant="contained"
            size="small"
            sx={{
              bgcolor: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'none',
              px: 2,
              borderRadius: '3px',
              '&:hover': { bgcolor: '#B91C1C' },
            }}
          >
            {bulkDeleting ? <CircularProgress size={16} color="inherit" /> : 'Delete Selected'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
