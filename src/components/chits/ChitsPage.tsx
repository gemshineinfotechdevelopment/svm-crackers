import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import { ChitsApi, type ChitDashboardData } from '../../services/chitApi';
import { ChitSchemesTab } from './ChitSchemesTab';
import { ChitCustomersTab } from './ChitCustomersTab';
import { ChitCollectionsTab } from './ChitCollectionsTab';

const CHIT_TAB_STORAGE_KEY = 'svm_chit_active_subtab';

export const ChitsPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'schemes' | 'customers' | 'collections'>(() => {
    try {
      const saved = localStorage.getItem(CHIT_TAB_STORAGE_KEY);
      if (saved === 'schemes' || saved === 'customers' || saved === 'collections') {
        return saved;
      }
      return 'schemes';
    } catch {
      return 'schemes';
    }
  });

  const [dashboard, setDashboard] = useState<ChitDashboardData>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalPersons: 0,
    expectedMonthly: 0,
    totalCollected: 0,
    totalPending: 0,
  });
  const [dashLoading, setDashLoading] = useState<boolean>(true);

  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const data = await ChitsApi.getDashboard();
      if (data) {
        setDashboard(data);
      }
    } catch (err) {
      console.error('Failed to load chit dashboard:', err);
    } finally {
      setDashLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'schemes' | 'customers' | 'collections') => {
    setActiveSubTab(newValue);
    try {
      localStorage.setItem(CHIT_TAB_STORAGE_KEY, newValue);
    } catch {}
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 1.5, md: 2 }, bgcolor: '#D9E4F2', minHeight: 'calc(100vh - 70px)', boxSizing: 'border-box' }}>
      {/* Outer Card Window matching ERP Style */}
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
        {/* Header Window Title Bar */}
        <Box
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            px: 2,
            py: 0.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SavingsRoundedIcon sx={{ fontSize: 19, color: '#741748' }} />
            <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.01em' }}>
              Chit Scheme Management Module
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Refresh All Data" arrow>
              <IconButton size="small" onClick={fetchDashboard} sx={{ color: '#1E3A8A', p: 0.4 }}>
                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          {/* Top Dashboard Summary Counters Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(6, 1fr)',
              },
              gap: 1.2,
              mb: 2,
            }}
          >
            {/* Card 1: Total Chit Customers */}
            <Box
              sx={{
                p: 1.2,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                borderLeft: '4px solid #1E3A8A',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Total Customers
              </Typography>
              <Typography sx={{ fontSize: '18px', fontWeight: 900, color: '#1E3A8A', mt: 0.3 }}>
                {dashLoading ? <CircularProgress size={16} /> : dashboard.totalCustomers}
              </Typography>
            </Box>

            {/* Card 2: Active Customers */}
            <Box
              sx={{
                p: 1.2,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                borderLeft: '4px solid #059669',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Active Customers
              </Typography>
              <Typography sx={{ fontSize: '18px', fontWeight: 900, color: '#059669', mt: 0.3 }}>
                {dashLoading ? <CircularProgress size={16} /> : dashboard.activeCustomers}
              </Typography>
            </Box>

            {/* Card 3: Total Persons Enrolled */}
            <Box
              sx={{
                p: 1.2,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                borderLeft: '4px solid #741748',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Persons Enrolled
              </Typography>
              <Typography sx={{ fontSize: '18px', fontWeight: 900, color: '#741748', mt: 0.3 }}>
                {dashLoading ? <CircularProgress size={16} /> : `${dashboard.totalPersons} Person(s)`}
              </Typography>
            </Box>

            {/* Card 4: Expected Monthly Collection */}
            <Box
              sx={{
                p: 1.2,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                borderLeft: '4px solid #2563EB',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Expected Monthly
              </Typography>
              <Typography sx={{ fontSize: '17px', fontWeight: 900, color: '#2563EB', mt: 0.3 }}>
                {dashLoading ? <CircularProgress size={16} /> : `₹${dashboard.expectedMonthly.toLocaleString('en-IN')}`}
              </Typography>
            </Box>

            {/* Card 5: Total Amount Collected */}
            <Box
              sx={{
                p: 1.2,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                borderLeft: '4px solid #16A34A',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Total Collected
              </Typography>
              <Typography sx={{ fontSize: '17px', fontWeight: 900, color: '#16A34A', mt: 0.3 }}>
                {dashLoading ? <CircularProgress size={16} /> : `₹${dashboard.totalCollected.toLocaleString('en-IN')}`}
              </Typography>
            </Box>

            {/* Card 6: Total Pending Collection */}
            <Box
              sx={{
                p: 1.2,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                borderLeft: '4px solid #DC2626',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Pending Balance
              </Typography>
              <Typography sx={{ fontSize: '17px', fontWeight: 900, color: '#DC2626', mt: 0.3 }}>
                {dashLoading ? <CircularProgress size={16} /> : `₹${dashboard.totalPending.toLocaleString('en-IN')}`}
              </Typography>
            </Box>
          </Box>

          {/* Subtabs Switcher: Schemes | Customers | Collections */}
          <Box sx={{ borderBottom: '1px solid #CBD5E1', mb: 2 }}>
            <Tabs
              value={activeSubTab}
              onChange={handleTabChange}
              sx={{
                minHeight: '36px',
                '& .MuiTab-root': {
                  minHeight: '36px',
                  py: 0.5,
                  px: 2,
                  fontSize: '12.5px',
                  fontWeight: 800,
                  textTransform: 'none',
                  color: '#475569',
                  '&.Mui-selected': {
                    color: '#741748',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#741748',
                  height: '3px',
                },
              }}
            >
              <Tab
                value="schemes"
                icon={<CardGiftcardRoundedIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label="Schemes Master"
              />
              <Tab
                value="customers"
                icon={<PeopleAltRoundedIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label="Customers & Chit Allocation"
              />
              <Tab
                value="collections"
                icon={<AccountBalanceWalletRoundedIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label="Collections & Installments"
              />
            </Tabs>
          </Box>

          {/* Subtab Content */}
          {activeSubTab === 'schemes' && (
            <ChitSchemesTab onRefreshDashboard={fetchDashboard} />
          )}
          {activeSubTab === 'customers' && (
            <ChitCustomersTab onRefreshDashboard={fetchDashboard} />
          )}
          {activeSubTab === 'collections' && (
            <ChitCollectionsTab onRefreshDashboard={fetchDashboard} />
          )}
        </Box>
      </Box>
    </Box>
  );
};
