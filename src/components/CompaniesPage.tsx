import { useState, useEffect, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  InputBase,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { CompaniesApi } from '../services/api';
import { printCompaniesListDirectly } from '../utils/printUtils';

export interface Company {
  _id?: string;
  id?: string;
  slNo?: string;
  name: string;
  avatarLetter?: string;
  avatarBg?: string;
  avatarColor?: string;
  address: string;
  gstin: string;
}

interface CompaniesPageProps {
  onAddCompany?: () => void;
}

export const CompaniesPage: FC<CompaniesPageProps> = ({ onAddCompany }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Company Dialog State
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    gstin: '',
    address: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await CompaniesApi.getAll();
      setCompanies(data || []);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenEdit = (company: Company) => {
    setEditingCompany(company);
    setEditFormData({
      name: company.name || '',
      gstin: company.gstin || '',
      address: company.address || '',
    });
    setOpenEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCompany) return;
    const id = editingCompany._id || editingCompany.id;
    if (!id) return;

    if (!editFormData.name.trim() || !editFormData.address.trim()) {
      alert('Please fill in Company Name and Address');
      return;
    }

    try {
      setEditLoading(true);
      await CompaniesApi.update(id, {
        name: editFormData.name.trim(),
        gstin: editFormData.gstin.trim() || 'N/A',
        address: editFormData.address.trim(),
        avatarLetter: editFormData.name.trim().charAt(0).toUpperCase(),
      });
      setOpenEditModal(false);
      fetchCompanies();
    } catch (err) {
      console.error('Failed to update company:', err);
      alert('Error updating company');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this company? This will also delete all associated particular bills and account ledger records for this company.')) return;
    try {
      await CompaniesApi.delete(id);
      setCompanies((prev) => prev.filter((c) => (c._id || c.id) !== id));
    } catch (err) {
      console.error('Failed to delete company:', err);
      alert('Error deleting company');
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.5, md: 3 },
        boxSizing: 'border-box',
      }}
    >
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3.2,
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontSize: '30px',
            fontWeight: 800,
            color: '#B91C1C',
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
          }}
        >
          Company
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {/* Search Box */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1.5px solid #E2E8F0',
              px: 1.5,
              height: '38px',
              width: { xs: '100%', sm: '230px' },
              boxSizing: 'border-box',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#F59E0B',
              },
              '&:focus-within': {
                borderColor: '#DC2626',
                boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)',
              },
            }}
          >
            <SearchRoundedIcon
              sx={{
                color: '#D97706',
                fontSize: 19,
                mr: 1,
              }}
            />
            <InputBase
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#1F1714',
                width: '100%',
                '& input': {
                  p: 0,
                  '&::placeholder': {
                    color: '#A8998A',
                    opacity: 1,
                  },
                },
              }}
            />
          </Box>

          {/* Print Companies List Button */}
          <Button
            variant="outlined"
            onClick={() => printCompaniesListDirectly(filteredCompanies)}
            startIcon={<PrintOutlinedIcon sx={{ fontSize: 18 }} />}
            sx={{
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              borderColor: '#FCD34D',
              borderWidth: '1.5px',
              height: '38px',
              px: 1.8,
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              '&:hover': {
                backgroundColor: '#F8FAFC',
                borderColor: '#F59E0B',
              },
            }}
          >
            Print List ({filteredCompanies.length})
          </Button>

          {/* Add Company Button */}
          <Button
            variant="contained"
            disableElevation
            onClick={onAddCompany}
            startIcon={<AddRoundedIcon sx={{ fontSize: 19 }} />}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              border: '1px solid #F59E0B',
              height: '38px',
              px: 2,
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
              },
            }}
          >
            Add Company
          </Button>
        </Box>
      </Box>

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
        <TableContainer>
          <Table sx={{ width: '100%' }} aria-label="companies table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: 3,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '100px',
                  }}
                >
                  SL.NO
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: 3,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  COMPANY NAME
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: 3,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  ADDRESS
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.6,
                    px: 3,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  GSTIN
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    py: 1.6,
                    px: 3,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E293B',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #E2E8F0',
                    width: '120px',
                  }}
                >
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                  </TableCell>
                </TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#786C58' }}>
                    No companies found. Click "Add Company" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company, index) => {
                  const isLast = index === filteredCompanies.length - 1;
                  const recordId = company._id || company.id || '';
                  const slDisplay = company.slNo || (index + 1).toString().padStart(2, '0');
                  const avatarInitial = company.avatarLetter || company.name.charAt(0).toUpperCase();

                  return (
                    <TableRow
                      key={recordId || index}
                      sx={{
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          backgroundColor: '#F8FAFC',
                        },
                      }}
                    >
                      {/* SL.NO */}
                      <TableCell
                        sx={{
                          py: 1.6,
                          px: 3,
                          fontSize: '13.5px',
                          color: '#475569',
                          fontWeight: 600,
                          borderBottom: isLast ? 'none' : '1px solid #F8FAFC',
                        }}
                      >
                        {slDisplay}
                      </TableCell>

                      {/* Company Name */}
                      <TableCell
                        sx={{
                          py: 1.6,
                          px: 3,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: company.avatarBg || '#F1F5F9',
                              color: company.avatarColor || '#B91C1C',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {avatarInitial}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#1F1714',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {company.name}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Address */}
                      <TableCell
                        sx={{
                          py: 1.6,
                          px: 3,
                          fontSize: '13.5px',
                          color: '#334155',
                          fontWeight: 500,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {company.address}
                      </TableCell>

                      {/* GSTIN */}
                      <TableCell
                        sx={{
                          py: 1.6,
                          px: 3,
                          fontSize: '13.5px',
                          color: '#334155',
                          fontWeight: 600,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        {company.gstin}
                      </TableCell>

                      {/* Actions (Edit & Delete) */}
                      <TableCell
                        align="right"
                        sx={{
                          py: 1.6,
                          px: 3,
                          borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        }}
                      >
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8 }}>
                          {/* Edit Company Button */}
                          <Tooltip title="Edit Company" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(company)}
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

                          {/* Delete Company Button */}
                          <Tooltip title="Delete Company" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(recordId)}
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
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Company Dialog Modal */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '18px', fontWeight: 700, color: '#B91C1C', pb: 1 }}>
          Edit Company Details
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Company Legal Name *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                slotProps={{
                  input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '6px' } },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                GSTIN / Tax Registration Number
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editFormData.gstin}
                onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                slotProps={{
                  input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '6px' } },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Registered Office Address *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                slotProps={{
                  input: { sx: { fontSize: '13.5px', fontWeight: 500, borderRadius: '6px' } },
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setOpenEditModal(false)}
            sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSaveEdit}
            disabled={editLoading}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              px: 2.5,
              borderRadius: '6px',
              '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
            }}
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
