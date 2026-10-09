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
  FormControlLabel,
  Switch,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import { CategoriesApi } from '../services/api';
import { getActiveBillingYear } from '../utils/yearContext';
import { triggerYearRestrictionDialog } from './YearRestrictionDialog';

export interface CategoryItem {
  _id?: string;
  id?: string;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
  createdAt?: string;
}

const PRESET_COLORS = [
  '#DC2626', // Crimson
  '#EA580C', // Orange
  '#D97706', // Amber / Gold
  '#059669', // Emerald
  '#2563EB', // Royal Blue
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#4B5563', // Slate
];

export const CategoriesPage: FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#DC2626');
  const [isActive, setIsActive] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await CategoriesApi.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.code && c.code.toLowerCase().includes(term)) ||
        (c.description && c.description.toLowerCase().includes(term))
    );
  }, [categories, searchTerm]);

  const openAddAction = () => {
    setEditingCategory(null);
    setName('');
    setCode('');
    setDescription('');
    setColor(PRESET_COLORS[categories.length % PRESET_COLORS.length]);
    setIsActive(true);
    setOpenModal(true);
  };

  const handleOpenAdd = () => {
    const activeYear = getActiveBillingYear();
    const currentSystemYear = new Date().getFullYear();
    if (activeYear !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(activeYear),
        currentSystemYear: String(currentSystemYear),
        onProceed: () => openAddAction(),
      });
      return;
    }
    openAddAction();
  };

  const openEditAction = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setCode(cat.code || '');
    setDescription(cat.description || '');
    setColor(cat.color || '#1E40AF');
    setIsActive(cat.isActive !== false);
    setOpenModal(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    const activeYear = getActiveBillingYear();
    const currentSystemYear = new Date().getFullYear();
    if (activeYear !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(activeYear),
        currentSystemYear: String(currentSystemYear),
        onProceed: () => openEditAction(cat),
      });
      return;
    }
    openEditAction(cat);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter category name');
      return;
    }

    try {
      setModalLoading(true);
      if (editingCategory) {
        const id = editingCategory._id || editingCategory.id || '';
        await CategoriesApi.update(id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          color,
          isActive,
        });
      } else {
        await CategoriesApi.create({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          color,
          displayOrder: categories.length + 1,
          isActive,
        });
      }
      setOpenModal(false);
      fetchCategories();
    } catch (err: any) {
      console.error('Failed to save category:', err);
      alert(err.message || 'Error saving category');
    } finally {
      setModalLoading(false);
    }
  };

  const executeDelete = async (cat: CategoryItem) => {
    const id = cat._id || cat.id || '';
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      await CategoriesApi.delete(id);
      setCategories((prev) => prev.filter((c) => (c._id || c.id) !== id));
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      alert(err.message || 'Error deleting category');
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    const activeYear = getActiveBillingYear();
    const currentSystemYear = new Date().getFullYear();
    if (activeYear !== currentSystemYear) {
      triggerYearRestrictionDialog({
        selectedYear: String(activeYear),
        currentSystemYear: String(currentSystemYear),
        onProceed: () => executeDelete(cat),
      });
      return;
    }
    executeDelete(cat);
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
            <CategoryRoundedIcon sx={{ fontSize: 18, color: '#0284C7' }} />
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.01em',
              }}
            >
              Category Master Directory
            </Typography>
          </Box>

          <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#1E3A8A' }}>
            Total Categories: {categories.length}
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
            {/* Search Box */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, minWidth: '220px' }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                Search Category:
              </Typography>
              <input
                type="text"
                placeholder="Search by category name, code, description..."
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
              <Button
                onClick={fetchCategories}
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
                Add Category
              </Button>
            </Box>
          </Box>

          {/* Categories Table */}
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
                    <TableCell sx={{ width: '60px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      S.No
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Category Name
                    </TableCell>
                    <TableCell sx={{ width: '130px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Category Code
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Description
                    </TableCell>
                    <TableCell sx={{ width: '100px', textAlign: 'center', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
                      Status
                    </TableCell>
                    <TableCell align="center" sx={{ width: '140px', fontWeight: 700, bgcolor: '#DCE7F5', color: '#0F172A', fontSize: '12px' }}>
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
                  ) : filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#64748B', fontSize: '12px' }}>
                        {searchTerm ? 'No categories match your search criteria.' : 'No categories found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((cat, index) => {
                      return (
                        <TableRow
                          key={cat._id || cat.id || index}
                          sx={{
                            '&:hover': { bgcolor: '#F1F7FD' },
                            '& td': { borderBottom: '1px solid #E2E8F0', py: 0.4 },
                          }}
                        >
                          {/* S.No */}
                          <TableCell sx={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                            {index + 1}
                          </TableCell>

                          {/* Category Name */}
                          <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '2px',
                                  backgroundColor: cat.color || '#1E40AF',
                                  flexShrink: 0,
                                }}
                              />
                              {cat.name}
                            </Box>
                          </TableCell>

                          {/* Code */}
                          <TableCell sx={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>
                            {cat.code || '-'}
                          </TableCell>

                          {/* Description */}
                          <TableCell sx={{ fontSize: '12px', color: '#334155' }}>
                            {cat.description || '-'}
                          </TableCell>

                          {/* Status */}
                          <TableCell sx={{ textAlign: 'center', fontSize: '11.5px', fontWeight: 700, color: cat.isActive !== false ? '#166534' : '#991B1B' }}>
                            {cat.isActive !== false ? 'Active' : 'Inactive'}
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="center">
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              {/* Edit */}
                              <Button
                                size="small"
                                onClick={() => handleOpenEdit(cat)}
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
                                onClick={() => handleDelete(cat)}
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

      {/* Add / Edit Category Dialog */}
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
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>

        <DialogContent sx={{ bgcolor: '#F0F5FA', display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
              Category Name *
            </Typography>
            <input
              type="text"
              placeholder="e.g. Ground Chakkars"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="erp-input"
              style={{ width: '100%' }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
              Category Code
            </Typography>
            <input
              type="text"
              placeholder="e.g. CHK"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="erp-input"
              style={{ width: '100%', textTransform: 'uppercase' }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
              Description
            </Typography>
            <textarea
              rows={2}
              placeholder="Optional notes or details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="erp-input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A' }}>
              Active Status
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              }
              label={<Typography sx={{ fontSize: '12px', fontWeight: 600 }}>{isActive ? 'Active' : 'Inactive'}</Typography>}
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
            onClick={handleSave}
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
            {modalLoading ? <CircularProgress size={16} color="inherit" /> : 'Save Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
