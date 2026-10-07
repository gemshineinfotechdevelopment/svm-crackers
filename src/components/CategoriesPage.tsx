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
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { CategoriesApi } from '../services/api';

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

  const activeCount = useMemo(() => {
    return categories.filter((c) => c.isActive !== false).length;
  }, [categories]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setCode('');
    setDescription('');
    setColor(PRESET_COLORS[categories.length % PRESET_COLORS.length]);
    setIsActive(true);
    setOpenModal(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setCode(cat.code || '');
    setDescription(cat.description || '');
    setColor(cat.color || '#DC2626');
    setIsActive(cat.isActive !== false);
    setOpenModal(true);
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

  const handleDelete = async (cat: CategoryItem) => {
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

  const handleClearAll = async () => {
    if (!categories.length) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${categories.length} categories? This will permanently remove them from the database.`)) return;

    try {
      setLoading(true);
      await CategoriesApi.clearAll();
      setCategories([]);
    } catch (err: any) {
      console.error('Failed to clear all categories:', err);
      alert(err.message || 'Error clearing categories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        boxSizing: 'border-box',
      }}
    >
      {/* Top Stats Overview */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
              }}
            >
              <CategoryRoundedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                Total Categories
              </Typography>
              <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#475569', lineHeight: 1.1 }}>
                {categories.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '12px',
              border: '1.5px solid #BBF7D0',
              background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
              }}
            >
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                Active Categories
              </Typography>
              <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#064E3B', lineHeight: 1.1 }}>
                {activeCount}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Quick Action
              </Typography>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                Manage item classifications
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={fetchCategories}
              startIcon={<RefreshRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderColor: '#CBD5E1',
                color: '#475569',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '8px',
                '&:hover': { borderColor: '#94A3B8', backgroundColor: '#F1F5F9' },
              }}
            >
              Refresh
            </Button>
          </Paper>
        </Grid>
      </Grid>

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
        {/* Festive Red Banner Header */}
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
            minHeight: '58px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              sx={{
                color: '#FFFFFF',
                fontSize: '17px',
                fontWeight: 800,
                letterSpacing: '-0.01em',
              }}
            >
              Product Categories
            </Typography>
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
              }}
            >
              {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
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
            {/* Search Input */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                px: 1.2,
                height: '38px',
                width: { xs: '100%', sm: '250px' },
                boxSizing: 'border-box',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <SearchRoundedIcon sx={{ color: '#D97706', fontSize: 19, mr: 0.8, flexShrink: 0 }} />
              <InputBase
                placeholder="Search categories..."
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

            {/* Clear All Categories Button */}
            {categories.length > 0 && (
              <Button
                variant="contained"
                disableElevation
                onClick={handleClearAll}
                startIcon={<DeleteSweepRoundedIcon sx={{ fontSize: 18 }} />}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 1.8,
                  height: '38px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                    borderColor: '#EF4444',
                  },
                }}
              >
                Clear All
              </Button>
            )}

            {/* Add Category Button */}
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
              Add Category
            </Button>
          </Box>
        </Box>

        {/* Categories Table */}
        <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table sx={{ minWidth: { xs: '650px', sm: '100%' } }} aria-label="categories table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: { xs: 2, sm: 3 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '80px',
                  }}
                >
                  SL.NO
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: { xs: 2, sm: 3 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  CATEGORY NAME
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: { xs: 1.5, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '120px',
                  }}
                >
                  CODE
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: { xs: 2, sm: 3 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  DESCRIPTION
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    py: 1.6,
                    px: { xs: 1.5, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '110px',
                  }}
                >
                  STATUS
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    py: 1.6,
                    px: { xs: 1.5, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '90px',
                  }}
                >
                  EDIT
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    py: 1.6,
                    px: { xs: 2, sm: 3 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '90px',
                  }}
                >
                  DELETE
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
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#786C58' }}>
                    {searchTerm ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '14px', color: '#786C58', fontWeight: 500 }}>
                          No categories matching "{searchTerm}" found.
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
                      'No categories found. Click "Add Category" to create one.'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((cat, index) => {
                  const isLast = index === filteredCategories.length - 1;
                  const catColor = cat.color || '#DC2626';

                  return (
                    <TableRow
                      key={cat._id || cat.id || index}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#FEFDF5',
                        },
                      }}
                    >
                      {/* Sl. No */}
                      <TableCell
                        sx={{
                          py: 1.6,
                          px: { xs: 2, sm: 3 },
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: '#786C58',
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {index + 1}
                      </TableCell>

                      {/* Category Name & Color Tag */}
                      <TableCell
                        sx={{
                          py: 1.6,
                          px: { xs: 2, sm: 3 },
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: catColor,
                              boxShadow: `0 0 6px ${catColor}80`,
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#1F1714',
                              letterSpacing: '0.01em',
                            }}
                          >
                            {cat.name}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Code */}
                      <TableCell
                        sx={{
                          py: 1.6,
                          px: { xs: 1.5, sm: 2.5 },
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {cat.code ? (
                          <Chip
                            label={cat.code}
                            size="small"
                            sx={{
                              fontSize: '11.5px',
                              fontWeight: 800,
                              backgroundColor: '#F8FAFC',
                              color: '#334155',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              height: '24px',
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: '13px', color: '#9CA3AF' }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Description */}
                      <TableCell
                        sx={{
                          py: 1.6,
                          px: { xs: 2, sm: 3 },
                          fontSize: '13px',
                          color: '#57463A',
                          fontWeight: 500,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {cat.description || <span style={{ color: '#9CA3AF' }}>No description</span>}
                      </TableCell>

                      {/* Status */}
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.6,
                          px: { xs: 1.5, sm: 2.5 },
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Chip
                          label={cat.isActive !== false ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: cat.isActive !== false ? '#ECFDF5' : '#FEF2F2',
                            color: cat.isActive !== false ? '#065F46' : '#991B1B',
                            border: `1px solid ${cat.isActive !== false ? '#A7F3D0' : '#FECACA'}`,
                            borderRadius: '12px',
                            height: '24px',
                          }}
                        />
                      </TableCell>

                      {/* Edit */}
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.6,
                          px: { xs: 1.5, sm: 2.5 },
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Tooltip title="Edit Category" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(cat)}
                            sx={{
                              color: '#D97706',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              p: 0.7,
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

                      {/* Delete */}
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.6,
                          px: { xs: 2, sm: 3 },
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Tooltip title="Delete Category" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(cat)}
                            sx={{
                              color: '#DC2626',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              borderRadius: '6px',
                              p: 0.7,
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

      {/* Add / Edit Category Dialog */}
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
        <DialogTitle sx={{ fontSize: '18px', fontWeight: 800, color: '#B91C1C', pb: 1 }}>
          {editingCategory ? 'Edit Category' : 'Create New Category'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.8 }}>
              Category Name *
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="e.g. Fancy Aerial Shots, Sparklers..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              slotProps={{
                input: {
                  sx: { fontSize: '13.5px', fontWeight: 600, borderRadius: '8px' },
                },
              }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.8 }}>
              Category Code (Short code for invoices / reports)
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. FAS, RKT, SPK"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              slotProps={{
                input: {
                  sx: { fontSize: '13.5px', fontWeight: 600, borderRadius: '8px' },
                },
              }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.8 }}>
              Description
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Brief description about items under this category..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              slotProps={{
                input: {
                  sx: { fontSize: '13px', fontWeight: 500, borderRadius: '8px' },
                },
              }}
            />
          </Box>

          {/* Color Selector */}
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.8 }}>
              Badge Color
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setColor(c)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: color === c ? '3px solid #1F1714' : '2px solid transparent',
                    boxShadow: color === c ? '0 0 8px rgba(0,0,0,0.3)' : 'none',
                    transition: 'transform 0.15s ease',
                    '&:hover': { transform: 'scale(1.15)' },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Active Switch */}
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                color="error"
              />
            }
            label={
              <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714' }}>
                Active Category (Available in Price List & Billing)
              </Typography>
            }
          />
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
            onClick={handleSave}
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
            {modalLoading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
