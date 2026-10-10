import { useState, useEffect, type FC } from 'react';
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
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import TableViewRoundedIcon from '@mui/icons-material/TableViewRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import { ProductSubPageHeader } from './ProductSubPageHeader';
import { type ProductSubPage } from '../types/productSubPages';
import { getActiveBillingYear, YEAR_CHANGE_EVENT } from '../utils/yearContext';
import {
  fetchPriceMaps,
  syncPriceMaps,
  DEFAULT_PRICE_MAP_NAMES,
  REFERENCE_RETAIL_PRODUCTS,
  PRICEMAP_CHANGE_EVENT,
} from '../utils/priceMapStorage';
import { type PriceMapRecord } from '../services/api';

interface PriceMapMasterPageProps {
  onSubPageChange: (newPage: ProductSubPage) => void;
  onSelectPriceMapForRate?: (priceMapName: string) => void;
}

export const PriceMapMasterPage: FC<PriceMapMasterPageProps> = ({
  onSubPageChange,
  onSelectPriceMapForRate,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);
  const [priceMaps, setPriceMaps] = useState<PriceMapRecord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // New Price Map Dialog
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newMapName, setNewMapName] = useState('');

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Custom Delete Confirmation Dialog (no localhost alert)
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

  const loadData = async (year: number) => {
    setLoading(true);
    try {
      const data = await fetchPriceMaps(year);
      if (data && data.length > 0) {
        setPriceMaps(data);
      } else {
        const initial = DEFAULT_PRICE_MAP_NAMES.map((name) => ({
          name,
          year,
          rates: REFERENCE_RETAIL_PRODUCTS.map((r) => ({ ...r })),
        }));
        setPriceMaps(initial);
      }
    } catch (err) {
      console.error('Error loading price maps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedYear);

    const handleYearChange = (e: any) => {
      if (e.detail?.year) {
        setSelectedYear(e.detail.year);
        loadData(e.detail.year);
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

  // Handle Add New
  const handleAddNew = () => {
    setNewMapName('');
    setOpenAddDialog(true);
  };

  const handleConfirmAdd = async () => {
    const trimmed = newMapName.trim();
    if (!trimmed) {
      setToast({ open: true, message: 'Please enter a valid Price Map name', severity: 'error' });
      return;
    }

    if (priceMaps.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setToast({ open: true, message: `Price Map '${trimmed}' already exists`, severity: 'error' });
      return;
    }

    const newEntry: PriceMapRecord = {
      name: trimmed,
      year: selectedYear,
      rates: REFERENCE_RETAIL_PRODUCTS.map((r) => ({ ...r })),
    };

    const updated = [...priceMaps, newEntry];
    setPriceMaps(updated);
    setSelectedIndex(updated.length - 1);
    setOpenAddDialog(false);
    await syncPriceMaps(updated, selectedYear);
    setToast({ open: true, message: `Price Map '${trimmed}' added successfully`, severity: 'success' });
  };

  // Handle Save
  const handleSave = async () => {
    setLoading(true);
    try {
      const ok = await syncPriceMaps(priceMaps, selectedYear);
      if (ok) {
        setToast({ open: true, message: 'Price Map list saved successfully!', severity: 'success' });
      } else {
        setToast({ open: true, message: 'Saved locally (offline mode)', severity: 'info' });
      }
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Error saving Price Maps', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete with custom confirmation dialog
  const handleDelete = () => {
    if (priceMaps.length === 0) return;
    const selectedItem = priceMaps[selectedIndex];
    if (!selectedItem) return;

    setDeleteConfirmDialog({
      open: true,
      title: 'Delete Price Map',
      message: `Are you sure you want to delete '${selectedItem.name}'? This cannot be undone.`,
      onConfirm: async () => {
        const updated = priceMaps.filter((_, idx) => idx !== selectedIndex);
        setPriceMaps(updated);
        setSelectedIndex((prev) => Math.max(0, Math.min(prev, updated.length - 1)));
        await syncPriceMaps(updated, selectedYear);
        setDeleteConfirmDialog((prev) => ({ ...prev, open: false }));
        setToast({ open: true, message: `Price Map '${selectedItem.name}' deleted`, severity: 'success' });
      },
    });
  };

  // Handle navigate to Product Price Map (Image 2)
  const handleOpenProductPriceMap = (mapName?: string) => {
    const targetName = mapName || priceMaps[selectedIndex]?.name || 'SVM';
    localStorage.setItem('svm_selected_pricemap_name', targetName);
    if (onSelectPriceMapForRate) {
      onSelectPriceMapForRate(targetName);
    }
    onSubPageChange('product-price map');
  };

  // Inline edit save
  const handleInlineEditSave = (index: number) => {
    const trimmed = editingValue.trim();
    if (trimmed && trimmed !== priceMaps[index].name) {
      const updated = [...priceMaps];
      updated[index] = { ...updated[index], name: trimmed };
      setPriceMaps(updated);
      syncPriceMaps(updated, selectedYear);
    }
    setEditingIndex(null);
  };

  const selectedShopName = priceMaps[selectedIndex]?.name || 'SVM';

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
          currentSubPage="pricemap master"
          onSubPageChange={onSubPageChange}
          year={selectedYear}
          extraRightContent={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<TableViewRoundedIcon sx={{ fontSize: 15 }} />}
                onClick={() => handleOpenProductPriceMap()}
                sx={{
                  height: '28px',
                  bgcolor: '#EA580C',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  px: 1.2,
                  borderRadius: '3px',
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#C2410C' },
                }}
              >
                Go to Product Price Map ▶
              </Button>
              <Tooltip title="Refresh list" arrow>
                <IconButton
                  size="small"
                  onClick={() => loadData(selectedYear)}
                  sx={{ p: 0.4, border: '1px solid #CBD5E1', bgcolor: '#F8FAFC' }}
                >
                  <RefreshRoundedIcon sx={{ fontSize: 16, color: '#1E3A8A' }} />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />

        {/* Content Body: Centered Classic Windows Dialog Styled as Reference Image 1 */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 3 },
            bgcolor: '#E4ECF5',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            minHeight: '480px',
          }}
        >
          {/* Clean Price Map List Card Container (Matching Reference Image 1) */}
          <Box
            sx={{
              width: { xs: '100%', sm: '440px', md: '480px' },
              bgcolor: '#ECE9D8',
              border: '1px solid #7F9DB9',
              borderRadius: '4px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              p: 1.5,
              gap: 1.2,
            }}
          >
            {/* Header Label: Price Map list */}
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
                        width: '28px',
                        minWidth: '28px',
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
                        fontWeight: 600,
                        fontSize: '11.5px',
                        py: 0.5,
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
                  {priceMaps.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    const isEditing = editingIndex === idx;

                    return (
                      <TableRow
                        key={item.name + idx}
                        onClick={() => {
                          setSelectedIndex(idx);
                        }}
                        onDoubleClick={() => handleOpenProductPriceMap(item.name)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? '#3399FF' : '#FFFFFF',
                          '&:hover': {
                            bgcolor: isSelected ? '#3399FF' : '#F0F7FF',
                          },
                        }}
                      >
                        {/* Row Indicator Cell with Arrow ▶ */}
                        <TableCell
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIndex(idx);
                          }}
                          sx={{
                            width: '28px',
                            minWidth: '28px',
                            p: 0,
                            textAlign: 'center',
                            bgcolor: '#ECE9D8',
                            borderRight: '1px solid #999999',
                            borderBottom: '1px solid #E0E0E0',
                            height: '24px',
                          }}
                        >
                          {isSelected && (
                            <PlayArrowRoundedIcon
                              sx={{
                                fontSize: 13,
                                color: '#000000',
                                verticalAlign: 'middle',
                              }}
                            />
                          )}
                        </TableCell>

                        {/* PriceMapName Value Cell: clicking this shop opens Product Price Map */}
                        <TableCell
                          onClick={() => {
                            setSelectedIndex(idx);
                            handleOpenProductPriceMap(item.name);
                          }}
                          sx={{
                            py: 0.3,
                            px: 1,
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#FFFFFF' : '#000000',
                            borderBottom: '1px solid #E0E0E0',
                            borderRight: '1px solid #E0E0E0',
                            height: '24px',
                            userSelect: 'none',
                          }}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingValue}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleInlineEditSave(idx)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineEditSave(idx);
                                if (e.key === 'Escape') setEditingIndex(null);
                              }}
                              style={{
                                width: '100%',
                                fontSize: '11.5px',
                                padding: '1px 3px',
                                border: '1px solid #0055EA',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            <Box
                              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingIndex(idx);
                                setEditingValue(item.name);
                              }}
                            >
                              <span>{item.name}</span>
                              <Typography
                                sx={{
                                  fontSize: '10px',
                                  color: isSelected ? '#DCEBFA' : '#64748B',
                                  fontWeight: 500,
                                  pr: 0.5,
                                }}
                              >
                                {isSelected ? 'Click to Open ▶' : 'Open ▶'}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Empty Fill Area to replicate Windows DataGridView look */}
                  {Array.from({ length: Math.max(0, 7 - priceMaps.length) }).map((_, i) => (
                    <TableRow key={`empty-${i}`}>
                      <TableCell sx={{ width: '28px', bgcolor: '#ECE9D8', borderRight: '1px solid #999999', borderBottom: '1px solid #E0E0E0', height: '24px' }} />
                      <TableCell sx={{ bgcolor: '#9AAEC4', borderBottom: '1px solid #8FA3BA', height: '24px' }} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Action Buttons Row (Matching Image 1: Add New | Save | Delete) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 1.5,
                pt: 0.5,
              }}
            >
              {/* [ Add New ] Button */}
              <Button
                variant="outlined"
                onClick={handleAddNew}
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
                  '&:hover': {
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)',
                    borderColor: '#3399FF',
                  },
                }}
              >
                Add New
              </Button>

              {/* [ Save ] Button (Highlighted with default focus box like in Image 1) */}
              <Button
                variant="outlined"
                onClick={handleSave}
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
                  '&:hover': {
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)',
                    borderColor: '#0055EA',
                  },
                }}
              >
                Save
              </Button>

              {/* [ Delete ] Button */}
              <Button
                variant="outlined"
                onClick={handleDelete}
                disabled={priceMaps.length === 0}
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
                  '&:hover': {
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)',
                    borderColor: '#DC2626',
                    color: '#DC2626',
                  },
                }}
              >
                Delete
              </Button>
            </Box>

            {/* Primary Button to choose the highlighted shop and open product-price map */}
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => handleOpenProductPriceMap(selectedShopName)}
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
                👉 Choose "{selectedShopName}" &amp; Open Products in Price Map
              </Button>
            </Box>

            {/* Informative helper footer */}
            <Box sx={{ textAlign: 'center', pt: 0.5 }}>
              <Typography sx={{ fontSize: '10.5px', color: '#64748B' }}>
                Click any shop or click the button above to view rates in <b>Product Price Map</b>.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Add New Price Map Modal Dialog */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
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
          }}
        >
          Add New Price Map
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1, px: 2 }}>
          <Typography sx={{ fontSize: '12px', mb: 1, color: '#334155' }}>
            Enter the name of the new price map list (e.g., SVM, MSK, Retail Promo, Festival):
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="PriceMapName"
            value={newMapName}
            onChange={(e) => setNewMapName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmAdd();
            }}
            sx={{
              '& input': { fontSize: '12.5px', py: 0.8 },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: '#F8FAFC' }}>
          <Button
            size="small"
            onClick={() => setOpenAddDialog(false)}
            sx={{ fontSize: '11px', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleConfirmAdd}
            sx={{
              fontSize: '11px',
              textTransform: 'none',
              bgcolor: '#0855DA',
              '&:hover': { bgcolor: '#0045BF' },
            }}
          >
            Add Price Map
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Delete Confirmation Dialog */}
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
