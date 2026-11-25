import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  CircularProgress,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { ChitsApi, type ChitCustomerItem, type ChitAllocationItem } from '../../services/chitApi';
import { AddChitCustomerModal } from './AddChitCustomerModal';
import { AllocateChitSchemeModal } from './AllocateChitSchemeModal';
import { ChitCustomerDetailsModal } from './ChitCustomerDetailsModal';

interface ChitCustomersTabProps {
  onRefreshDashboard?: () => void;
}

export const ChitCustomersTab: React.FC<ChitCustomersTabProps> = ({ onRefreshDashboard }) => {
  const [customers, setCustomers] = useState<ChitCustomerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals state
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState<boolean>(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState<boolean>(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ChitCustomerItem | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ChitsApi.getCustomers({
        search: searchTerm.trim() || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        page: page + 1,
        limit: rowsPerPage,
      });

      if (res && res.data) {
        setCustomers(res.data);
        setTotalCount(res.pagination?.total || res.data.length);
      } else if (Array.isArray(res)) {
        setCustomers(res);
        setTotalCount(res.length);
      }
    } catch (err) {
      console.error('Error fetching chit customers:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, page, rowsPerPage]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenAllocate = (c: ChitCustomerItem) => {
    setSelectedCustomer(c);
    setAllocateModalOpen(true);
  };

  const handleOpenDetails = (c: ChitCustomerItem) => {
    setSelectedCustomer(c);
    setDetailsModalOpen(true);
  };

  const handleCustomerAdded = (_newCust: ChitCustomerItem) => {
    setAddCustomerModalOpen(false);
    fetchCustomers();
    if (onRefreshDashboard) onRefreshDashboard();
  };

  const handleSchemeAllocated = (_newAllocs: ChitAllocationItem[]) => {
    setAllocateModalOpen(false);
    fetchCustomers();
    if (onRefreshDashboard) onRefreshDashboard();
  };

  return (
    <Box>
      {/* Action Toolbar */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 1.5,
          p: 1.2,
          backgroundColor: '#FFFFFF',
          borderRadius: '4px',
          border: '1px solid #CBD5E1',
        }}
      >
        {/* Search & Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: '280px' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              px: 1,
              py: 0.2,
              flex: 1,
              maxWidth: '360px',
            }}
          >
            <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748B', mr: 0.5 }} />
            <input
              type="text"
              placeholder="Search by Name, Mobile, Customer ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                width: '100%',
                fontSize: '12px',
                color: '#0F172A',
              }}
            />
          </Box>

          <FormControl size="small" sx={{ minWidth: '110px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              sx={{ fontSize: '12px', height: '30px', backgroundColor: '#F8FAFC' }}
            >
              <MenuItem value="All" sx={{ fontSize: '12px' }}>All Status</MenuItem>
              <MenuItem value="Active" sx={{ fontSize: '12px' }}>Active</MenuItem>
              <MenuItem value="Inactive" sx={{ fontSize: '12px' }}>Inactive</MenuItem>
              <MenuItem value="Closed" sx={{ fontSize: '12px' }}>Closed</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Reload Customers" arrow>
            <IconButton size="small" onClick={fetchCustomers} sx={{ p: 0.6, color: '#1E3A8A' }}>
              <RefreshRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Register Customer Button */}
        <Button
          variant="contained"
          size="small"
          onClick={() => setAddCustomerModalOpen(true)}
          startIcon={<PersonAddAlt1RoundedIcon sx={{ fontSize: 16 }} />}
          sx={{
            backgroundColor: '#1E3A8A',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'none',
            px: 2,
            height: '32px',
            '&:hover': { backgroundColor: '#1E40AF' },
          }}
        >
          Register New Customer
        </Button>
      </Box>

      {/* Customers Data Table */}
      <Paper elevation={0} sx={{ border: '1px solid #CBD5E1', borderRadius: '4px', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F1F5F9' }}>
                <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Chit Customer ID</TableCell>
                <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Customer Name</TableCell>
                <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Mobile Number</TableCell>
                <TableCell sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Location / City</TableCell>
                <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Allocations</TableCell>
                <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Total Persons</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Monthly Due</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Chit Value</TableCell>
                <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', py: 1, minWidth: '190px' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: '#741748' }} />
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#64748B', fontSize: '12.5px' }}>
                    No chit customers registered yet. Click &quot;Register New Customer&quot; above to add one.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => {
                  const isActive = c.status === 'Active';
                  return (
                    <TableRow
                      key={c.chitCustomerId}
                      sx={{
                        '&:hover': { backgroundColor: '#F8FAFC' },
                        borderBottom: '1px solid #F1F5F9',
                      }}
                    >
                      {/* Customer ID */}
                      <TableCell sx={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF' }}>
                        {c.chitCustomerId}
                      </TableCell>

                      {/* Name */}
                      <TableCell sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        {c.name}
                      </TableCell>

                      {/* Mobile */}
                      <TableCell sx={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                        {c.mobile}
                      </TableCell>

                      {/* Location */}
                      <TableCell sx={{ fontSize: '12px', color: '#64748B' }}>
                        {c.city || c.address || '-'}
                      </TableCell>

                      {/* Allocations Count */}
                      <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 800 }}>
                        {c.allocationsCount || 0}
                      </TableCell>

                      {/* Total Persons */}
                      <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 800, color: '#741748' }}>
                        {c.totalPersons || 0}
                      </TableCell>

                      {/* Monthly Total */}
                      <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 700, color: '#1E3A8A' }}>
                        ₹{(c.totalMonthly || 0).toLocaleString('en-IN')}
                      </TableCell>

                      {/* Total Chit Value */}
                      <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                        ₹{(c.totalValue || 0).toLocaleString('en-IN')}
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.15,
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            color: isActive ? '#059669' : '#DC2626',
                            backgroundColor: isActive ? '#ECFDF5' : '#FEF2F2',
                            border: `1px solid ${isActive ? '#10B981' : '#F87171'}`,
                          }}
                        >
                          {c.status}
                        </Box>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center" sx={{ minWidth: '190px', whiteSpace: 'nowrap', py: 0.8 }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenAllocate(c)}
                            startIcon={<PlaylistAddRoundedIcon sx={{ fontSize: 14 }} />}
                            sx={{
                              fontSize: '11px',
                              fontWeight: 700,
                              height: '26px',
                              lineHeight: 1,
                              borderColor: '#93C5FD',
                              backgroundColor: '#EFF6FF',
                              color: '#1E40AF',
                              textTransform: 'none',
                              px: 1,
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              boxSizing: 'border-box',
                              '&:hover': { backgroundColor: '#DBEAFE', borderColor: '#60A5FA' },
                              '& .MuiButton-startIcon': { mr: 0.5, ml: 0 },
                            }}
                          >
                            + Scheme
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleOpenDetails(c)}
                            startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 14 }} />}
                            sx={{
                              fontSize: '11px',
                              fontWeight: 700,
                              height: '26px',
                              lineHeight: 1,
                              backgroundColor: '#741748',
                              color: '#FFFFFF',
                              textTransform: 'none',
                              px: 1,
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              boxShadow: 'none',
                              boxSizing: 'border-box',
                              '&:hover': { backgroundColor: '#580e34', boxShadow: 'none' },
                              '& .MuiButton-startIcon': { mr: 0.5, ml: 0 },
                            }}
                          >
                            Details
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{ borderTop: '1px solid #CBD5E1', fontSize: '11px' }}
        />
      </Paper>

      {/* Add Chit Customer Modal */}
      <AddChitCustomerModal
        open={addCustomerModalOpen}
        onClose={() => setAddCustomerModalOpen(false)}
        onSuccess={handleCustomerAdded}
      />

      {/* Allocate Scheme Modal */}
      <AllocateChitSchemeModal
        open={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        customer={selectedCustomer}
        onSuccess={handleSchemeAllocated}
      />

      {/* Customer Details Modal */}
      <ChitCustomerDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        customerId={selectedCustomer?.chitCustomerId || null}
        onDataChanged={() => {
          fetchCustomers();
          if (onRefreshDashboard) onRefreshDashboard();
        }}
      />
    </Box>
  );
};
