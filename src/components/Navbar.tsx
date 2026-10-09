import { useState, useEffect, useMemo, type FC, type MouseEvent } from 'react';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import defaultApsaraLogo from '../assets/logo.png';
import { getStoredSettings, type CompanySettings } from './SettingsPage';
import { HealthApi, API_BASE_URL } from '../services/api';
import {
  getActiveBillingYear,
  setActiveBillingYear,
  getStandardYearOptions,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';

export type NavTab = 'All Customers' | 'Sales' | 'Quotation' | 'GST Bill' | 'Categories' | 'Price List' | 'Settings';

interface NavbarProps {
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onLogout?: () => void;
}

interface ErpMenuItem {
  label: string;
  tabKey?: NavTab;
  isAction?: boolean;
}

export const Navbar: FC<NavbarProps> = ({
  activeTab = 'All Customers',
  onSelectTab,
  onLogout,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getStoredSettings);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [backendUrl, setBackendUrl] = useState<string>(API_BASE_URL);
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);
  const yearOptions = useMemo(() => getStandardYearOptions(), []);

  const checkBackendHealth = async () => {
    try {
      const res = await HealthApi.ping();
      setBackendStatus(res.connected ? 'connected' : 'disconnected');
      setBackendUrl(res.url);
    } catch {
      setBackendStatus('disconnected');
    }
  };

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setCompanySettings(getStoredSettings());
    };
    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    const handleYearChange = (e: any) => {
      if (e.detail?.year) {
        setSelectedYear(e.detail.year);
      }
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    return () => {
      window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    };
  }, []);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setActiveBillingYear(year);
  };

  const handleTabClick = (tab: NavTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    setMobileDrawerOpen(false);
  };

  const handleProfileClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleCloseMenu();
    setMobileDrawerOpen(false);
    if (onLogout) onLogout();
  };

  // Top ERP Menu Items
  const erpMenuItems: ErpMenuItem[] = [
    { label: 'Customers', tabKey: 'All Customers' },
    { label: 'Sales', tabKey: 'Sales' },
    { label: 'Quotation', tabKey: 'Quotation' },
    { label: 'Price List', tabKey: 'Price List' },
    { label: 'Categories', tabKey: 'Categories' },
    { label: 'Tax Bill', tabKey: 'GST Bill' },
    { label: 'Settings', tabKey: 'Settings' },
  ];

  const firmName = (companySettings.companyName || 'MANJULA CRACKERS').toUpperCase();

  return (
    <Box component="header" sx={{ width: '100%', userSelect: 'none' }}>
      {/* 1. Classic Windows ERP Title Bar */}
      <Box
        sx={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #C5D5E6',
          height: { xs: '32px', sm: '36px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1, sm: 1.5 },
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {/* Left: Window Icon + Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component="img"
            src={companySettings.logoUrl || defaultApsaraLogo}
            alt="Logo"
            sx={{
              width: 18,
              height: 18,
              objectFit: 'contain',
              borderRadius: '2px',
            }}
          />
          <Typography
            sx={{
              fontSize: { xs: '12px', sm: '13px' },
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {firmName} - {selectedYear}
          </Typography>
        </Box>

        {/* Right: Year Selector + Backend Connection Status + Profile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Global Financial / Calendar Year Selector */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              py: 0.15,
              px: 0.8,
              borderRadius: '4px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #93C5FD',
            }}
          >
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#1E40AF',
                display: { xs: 'none', sm: 'inline' },
              }}
            >
              Year:
            </Typography>
            <select
              value={selectedYear}
              onChange={(e) => handleYearSelect(Number(e.target.value))}
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#1E3A8A',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                padding: '1px 2px',
              }}
            >
              {yearOptions.map((y: number) => (
                <option key={y} value={y} style={{ color: '#0F172A', fontWeight: 600 }}>
                  {y}
                </option>
              ))}
            </select>
          </Box>
          {/* Backend Connection Status Badge */}
          <Tooltip
            title={
              backendStatus === 'connected'
                ? `Database Online: ${backendUrl}`
                : backendStatus === 'checking'
                ? 'Connecting...'
                : `Offline. Click to retry.`
            }
            arrow
          >
            <Box
              onClick={backendStatus === 'disconnected' ? checkBackendHealth : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                py: 0.2,
                px: 0.8,
                borderRadius: '3px',
                backgroundColor:
                  backendStatus === 'connected'
                    ? '#F0FDF4'
                    : backendStatus === 'checking'
                    ? '#FEFCE8'
                    : '#FEF2F2',
                border: `1px solid ${
                  backendStatus === 'connected'
                    ? '#86EFAC'
                    : backendStatus === 'checking'
                    ? '#FEF08A'
                    : '#FECACA'
                }`,
                cursor: backendStatus === 'disconnected' ? 'pointer' : 'default',
                mr: 1,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor:
                    backendStatus === 'connected'
                      ? '#16A34A'
                      : backendStatus === 'checking'
                      ? '#CA8A04'
                      : '#DC2626',
                }}
              />
              <Typography
                sx={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color:
                    backendStatus === 'connected'
                      ? '#166534'
                      : backendStatus === 'checking'
                      ? '#854D0E'
                      : '#991B1B',
                  display: { xs: 'none', sm: 'inline' },
                }}
              >
                {backendStatus === 'connected' ? 'Online' : 'Offline'}
              </Typography>
            </Box>
          </Tooltip>

          {/* User Icon */}
          <IconButton
            onClick={handleProfileClick}
            size="small"
            sx={{
              p: 0.4,
              borderRadius: '3px',
              '&:hover': { backgroundColor: '#E2E8F0' },
            }}
          >
            <PersonOutlineRoundedIcon sx={{ fontSize: 18, color: '#1E40AF' }} />
          </IconButton>
        </Box>
      </Box>

      {/* 2. Desktop ERP Menu Bar (Master | Customers | Purchases | Sales | Quotation | Tax Bill etc) */}
      <Box
        sx={{
          width: '100%',
          backgroundColor: '#EDF4FB',
          borderBottom: '1px solid #B0C4DE',
          px: { xs: 1, sm: 2 },
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {/* Desktop Menu Links */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          {erpMenuItems.map((item, index) => {
            const isTabActive = item.tabKey && activeTab === item.tabKey;
            return (
              <Box
                key={index}
                onClick={() => item.tabKey && handleTabClick(item.tabKey)}
                sx={{
                  cursor: 'pointer',
                  py: 0.3,
                  px: 0.8,
                  borderRadius: '3px',
                  backgroundColor: isTabActive ? '#D2E3F5' : 'transparent',
                  border: isTabActive ? '1px solid #99BBE8' : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: '#DCEBFA',
                    borderColor: '#A8C7EE',
                  },
                  transition: 'all 0.1s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '12.5px',
                    fontWeight: isTabActive ? 800 : 600,
                    color: isTabActive ? '#1E3A8A' : '#0F172A',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Mobile Hamburger Drawer Toggle (Mobile only) */}
        <IconButton
          onClick={() => setMobileDrawerOpen(true)}
          sx={{
            display: { xs: 'flex', md: 'none' },
            p: 0.4,
            color: '#1E3A8A',
          }}
        >
          <MenuRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Profile / Logout Popup Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '6px',
              minWidth: '180px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
              border: '1px solid #B0C4DE',
              backgroundColor: '#FFFFFF',
              mt: 0.5,
            },
          },
        }}
      >
        <MenuItem disabled sx={{ opacity: '1 !important', py: 1 }}>
          <ListItemIcon>
            <AdminPanelSettingsRoundedIcon sx={{ fontSize: 18, color: '#1E40AF' }} />
          </ListItemIcon>
          <Box>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
              Administrator
            </Typography>
            <Typography sx={{ fontSize: '10px', color: '#16A34A', fontWeight: 600 }}>
              System Ready
            </Typography>
          </Box>
        </MenuItem>
        <Divider sx={{ my: 0.5, borderColor: '#E2E8F0' }} />
        <MenuItem
          onClick={() => {
            handleCloseMenu();
            handleTabClick('Settings');
          }}
          sx={{ py: 0.8 }}
        >
          <ListItemIcon>
            <SettingsRoundedIcon sx={{ fontSize: 16, color: '#1E40AF' }} />
          </ListItemIcon>
          <Typography sx={{ fontSize: '12.5px', fontWeight: 600 }}>
            System Settings
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleLogoutClick} sx={{ color: '#DC2626', py: 0.8 }}>
          <ListItemIcon>
            <LogoutRoundedIcon sx={{ fontSize: 16, color: '#DC2626' }} />
          </ListItemIcon>
          <Typography sx={{ fontSize: '12.5px', fontWeight: 700 }}>
            Exit / Logout
          </Typography>
        </MenuItem>
      </Menu>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: '260px',
              backgroundColor: '#EDF4FB',
              borderLeft: '1px solid #B0C4DE',
            },
          },
        }}
      >
        <Box sx={{ p: 1.5, background: '#1E3A8A', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 800 }}>
            {firmName}
          </Typography>
          <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: '#FFFFFF', p: 0.5 }}>
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <List sx={{ p: 1 }}>
          {[
            { label: 'Customers', tab: 'All Customers' as NavTab, icon: <PeopleAltRoundedIcon sx={{ fontSize: 18 }} /> },
            { label: 'Sales (Quotation Bills)', tab: 'Sales' as NavTab, icon: <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} /> },
            { label: 'Quotation', tab: 'Quotation' as NavTab, icon: <RequestQuoteRoundedIcon sx={{ fontSize: 18 }} /> },
            { label: 'Tax Bill (GST)', tab: 'GST Bill' as NavTab, icon: <DescriptionRoundedIcon sx={{ fontSize: 18 }} /> },
            { label: 'Price List', tab: 'Price List' as NavTab, icon: <FormatListNumberedRoundedIcon sx={{ fontSize: 18 }} /> },
            { label: 'Categories', tab: 'Categories' as NavTab, icon: <CategoryRoundedIcon sx={{ fontSize: 18 }} /> },
            { label: 'Settings', tab: 'Settings' as NavTab, icon: <SettingsRoundedIcon sx={{ fontSize: 18 }} /> },
          ].map((item) => (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleTabClick(item.tab)}
                sx={{
                  borderRadius: '4px',
                  backgroundColor: activeTab === item.tab ? '#D2E3F5' : 'transparent',
                  py: 0.8,
                }}
              >
                <ListItemIcon sx={{ minWidth: '32px', color: '#1E3A8A' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={<Typography sx={{ fontSize: '13px', fontWeight: activeTab === item.tab ? 800 : 600 }}>{item.label}</Typography>}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </Box>
  );
};
