import React, { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Snackbar,
  Alert,
  Switch,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import PhoneInTalkRoundedIcon from '@mui/icons-material/PhoneInTalkRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CircularProgress from '@mui/material/CircularProgress';
import defaultProjectLogo from '../assets/logo.png';
import { SettingsApi } from '../services/api';
import {
  getSelectedBillYear,
  setSelectedBillYear,
  getAvailableBillViewYears,
} from '../utils/billYearUtils';
import { triggerYearRestrictionDialog } from './YearRestrictionDialog';

const initNow = new Date();
const initYear = initNow.getFullYear().toString();
const initDay = String(initNow.getDate()).padStart(2, '0');
const initMonth = String(initNow.getMonth() + 1).padStart(2, '0');

export interface CompanySettings {
  companyName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  state: string;
  gstin: string;
  pan: string;
  logoUrl?: string;
  enableTax?: boolean;
  defaultTaxRate?: string;
  gstTurnoverBaseline?: string;
  gstTurnoverCurrent?: string;
  systemDate?: string;
  systemYear?: string;
  billingYear?: string;
  billingStartDate?: string;
  billingEndDate?: string;
  billingStatus?: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'SVM Crackers',
  tagline: 'Standard Fire Works & Fancy Crackers',
  ownerName: '',
  phone: '9843067073',
  whatsapp: '8778429299',
  email: '',
  address: '67 - H/E, Rajivgandhi Nagar, Near Ramji Polypack, Sivakasi Bus Stand , Sivakasi',
  city: 'Sivakasi',
  pincode: '626123',
  state: 'Tamil Nadu',
  gstin: '',
  pan: '',
  logoUrl: defaultProjectLogo,
  enableTax: false,
  defaultTaxRate: '18',
  gstTurnoverBaseline: '726900.00',
  gstTurnoverCurrent: '726900.00',
  systemDate: `${initDay}-${initMonth}-${initYear}`,
  systemYear: initYear,
  billingYear: initYear,
  billingStartDate: `01-01-${initYear}`,
  billingEndDate: `31-12-${initYear}`,
  billingStatus: 'Active',
};

export const removeWhiteBackgroundFromDataUrl = (
  dataUrl: string,
  threshold = 225
): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve('');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let minX = w, minY = h, maxX = 0, maxY = 0;
      let hasVisiblePixel = false;

      // Make white/near-white pixels transparent and calculate tight bounding box
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a === 0 || (r >= threshold && g >= threshold && b >= threshold)) {
            data[idx + 3] = 0; // Transparent
          } else {
            hasVisiblePixel = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Auto-crop to remove empty side paddings so logo sits directly adjacent to text
      if (hasVisiblePixel && maxX >= minX && maxY >= minY) {
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropW;
        croppedCanvas.height = cropH;
        const cropCtx = croppedCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
          resolve(croppedCanvas.toDataURL('image/png'));
          return;
        }
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const getStoredSettings = (): CompanySettings => {
  try {
    const saved = localStorage.getItem('apsara_app_settings') || localStorage.getItem('varun_app_settings') || localStorage.getItem('dheeksha_app_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.companyName || parsed.companyName.toLowerCase().includes('varun') || parsed.companyName.toLowerCase().includes('dheeksha')) {
        parsed.companyName = 'Apsara Crackers';
      }
      if (!parsed.logoUrl || parsed.logoUrl.includes('varun-traders.png')) {
        parsed.logoUrl = defaultProjectLogo;
      }
      if (!parsed.phone || parsed.phone.includes('98765')) {
        parsed.phone = '9843067073';
      }
      if (!parsed.whatsapp || parsed.whatsapp.includes('98765')) {
        parsed.whatsapp = '8778429299';
      }
      if (!parsed.address || parsed.address.toLowerCase().includes('tirupur') || parsed.address.toLowerCase().includes('varun')) {
        parsed.address = '67 - H/E, Rajivgandhi Nagar, Near Ramji Polypack, Sivakasi Bus Stand , Sivakasi';
      }
      if (!parsed.city) {
        parsed.city = 'Sivakasi';
      }
      if (!parsed.state) {
        parsed.state = 'Tamil Nadu';
      }
      return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to parse settings from localStorage:', err);
  }
  return DEFAULT_COMPANY_SETTINGS;
};

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings>(getStoredSettings);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bill View Year Selector state & menu anchor
  const [selectedBillYear, setSelectedBillYearState] = useState<string>(() =>
    getSelectedBillYear(settings.systemYear)
  );
  const [billYearAnchorEl, setBillYearAnchorEl] = useState<null | HTMLElement>(null);

  const handleSelectBillViewYear = (year: string, isFuture: boolean) => {
    setBillYearAnchorEl(null);
    if (isFuture) {
      const sysYear = settings.systemYear || new Date().getFullYear().toString();
      triggerYearRestrictionDialog({ selectedYear: year, currentSystemYear: sysYear, isFutureYear: true });
      return;
    }

    const res = setSelectedBillYear(year, settings.systemYear);
    if (res.success) {
      setSelectedBillYearState(res.year);
      setToast({
        open: true,
        message: `📅 Bill View Filter set to ${year}. Showing ${year} bills.`,
        severity: 'success',
      });
    } else {
      setToast({
        open: true,
        message: res.message,
        severity: 'error',
      });
    }
  };

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch settings from MongoDB backend on mount
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await SettingsApi.get();
        const data = (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
        if (data && typeof data === 'object') {
          const compName = (!data.companyName || data.companyName.toLowerCase().includes('varun') || data.companyName.toLowerCase().includes('dheeksha'))
            ? 'Apsara Crackers'
            : data.companyName;

          const logo = (!data.logoUrl || data.logoUrl.includes('varun-traders.png'))
            ? defaultProjectLogo
            : data.logoUrl;

          const address = (!data.address || data.address.toLowerCase().includes('tirupur') || data.address.toLowerCase().includes('varun'))
            ? '67 - H/E, Rajivgandhi Nagar, Near Ramji Polypack, Sivakasi Bus Stand , Sivakasi'
            : data.address;

          const phone = (!data.phone || data.phone.includes('98765'))
            ? '9843067073'
            : data.phone;

          const whatsapp = (!data.whatsapp || data.whatsapp.includes('98765'))
            ? '8778429299'
            : data.whatsapp;

          const remoteSettings: CompanySettings = {
            companyName: compName,
            tagline: data.tagline || DEFAULT_COMPANY_SETTINGS.tagline,
            ownerName: data.ownerName ?? DEFAULT_COMPANY_SETTINGS.ownerName,
            phone: phone,
            whatsapp: whatsapp,
            email: data.email ?? DEFAULT_COMPANY_SETTINGS.email,
            address: address,
            city: data.city || 'Sivakasi',
            pincode: data.pincode || '626123',
            state: data.state || 'Tamil Nadu',
            gstin: data.gstin ?? DEFAULT_COMPANY_SETTINGS.gstin,
            pan: data.pan ?? DEFAULT_COMPANY_SETTINGS.pan,
            logoUrl: logo,
            enableTax: Boolean(data.enableTax),
            defaultTaxRate: data.defaultTaxRate || '18',
            systemDate: data.systemDate || DEFAULT_COMPANY_SETTINGS.systemDate,
            systemYear: data.systemYear || DEFAULT_COMPANY_SETTINGS.systemYear,
            billingYear: data.billingYear || DEFAULT_COMPANY_SETTINGS.billingYear,
            billingStartDate: data.billingStartDate || DEFAULT_COMPANY_SETTINGS.billingStartDate,
            billingEndDate: data.billingEndDate || DEFAULT_COMPANY_SETTINGS.billingEndDate,
            billingStatus: data.billingStatus || 'Active',
          };
          setSettings(remoteSettings);
          localStorage.setItem('apsara_app_settings', JSON.stringify(remoteSettings));
          localStorage.removeItem('varun_app_settings');
          localStorage.removeItem('dheeksha_app_settings');
          window.dispatchEvent(new Event('apsara_settings_updated'));
        }
      } catch (err) {
        console.warn('Could not fetch settings from backend, using local storage:', err);
      }
    };
    loadSettings();
  }, []);

  const handleChange = <K extends keyof CompanySettings>(field: K, value: CompanySettings[K]) => {
    if (field === 'billingYear') {
      const selectedYear = String(value).trim();
      const currentSysYear = String(settings.systemYear || new Date().getFullYear());
      if (selectedYear !== currentSysYear) {
        setToast({
          open: true,
          message: 'Billing year cannot be changed manually. The billing year must remain synchronized with the current system date.',
          severity: 'error',
        });
      }
    }
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setToast({
        open: true,
        message: 'Please upload a valid image file (.png, .jpg, .jpeg, .webp, .svg)',
        severity: 'error',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({
        open: true,
        message: 'Logo file size is too large (max 5MB). Please choose a smaller image.',
        severity: 'error',
      });
      return;
    }

    setIsProcessingLogo(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target?.result as string;
      if (rawDataUrl) {
        try {
          const transparentDataUrl = await removeWhiteBackgroundFromDataUrl(rawDataUrl);
          setSettings((prev) => ({ ...prev, logoUrl: transparentDataUrl }));
          setToast({
            open: true,
            message: '✨ Logo uploaded & white background removed! Click "Save Profile" to apply.',
            severity: 'success',
          });
        } catch {
          setSettings((prev) => ({ ...prev, logoUrl: rawDataUrl }));
        } finally {
          setIsProcessingLogo(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualRemoveWhiteBg = async () => {
    if (!settings.logoUrl) return;
    setIsProcessingLogo(true);
    try {
      const transparentDataUrl = await removeWhiteBackgroundFromDataUrl(settings.logoUrl);
      setSettings((prev) => ({ ...prev, logoUrl: transparentDataUrl }));
      setToast({
        open: true,
        message: '✂️ White background removed from logo successfully!',
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoFile(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLogoFile(file);
    }
  };

  const handleRemoveLogo = () => {
    setSettings((prev) => ({ ...prev, logoUrl: '' }));
  };

  const handleSave = async () => {
    const currentSysYear = String(settings.systemYear || new Date().getFullYear());
    const selectedBillingYear = String(settings.billingYear || '').trim();

    // Validate selected year against current system year
    if (selectedBillingYear && selectedBillingYear !== currentSysYear) {
      setToast({
        open: true,
        message: 'Invalid Billing Year. The selected billing year does not match the current system year. Billing dates are automatically synchronized with the system date.',
        severity: 'error',
      });
      return;
    }

    try {
      setIsSaving(true);
      // 1. Immediately cache in localStorage for instant UI feedback
      localStorage.setItem('apsara_app_settings', JSON.stringify(settings));
      localStorage.removeItem('varun_app_settings');
      localStorage.removeItem('dheeksha_app_settings');
      window.dispatchEvent(new Event('apsara_settings_updated'));

      // 2. Persist to MongoDB database so it syncs across all devices & deployments!
      const saveRes = await SettingsApi.update(settings);
      const data = (saveRes && typeof saveRes === 'object' && 'data' in saveRes && saveRes.data) ? saveRes.data : saveRes;
      if (data && typeof data === 'object' && (data.companyName !== undefined || data._id)) {
        const syncedSettings: CompanySettings = {
          companyName: data.companyName ?? settings.companyName,
          tagline: data.tagline ?? settings.tagline,
          ownerName: data.ownerName ?? settings.ownerName,
          phone: data.phone ?? settings.phone,
          whatsapp: data.whatsapp ?? settings.whatsapp,
          email: data.email ?? settings.email,
          address: data.address ?? settings.address,
          city: data.city ?? settings.city,
          pincode: data.pincode ?? settings.pincode,
          state: data.state ?? settings.state,
          gstin: data.gstin ?? settings.gstin,
          pan: data.pan ?? settings.pan,
          logoUrl: data.logoUrl ?? settings.logoUrl,
          enableTax: Boolean(data.enableTax ?? settings.enableTax),
          defaultTaxRate: data.defaultTaxRate ?? settings.defaultTaxRate ?? '18',
          systemDate: data.systemDate ?? settings.systemDate,
          systemYear: data.systemYear ?? settings.systemYear,
          billingYear: data.billingYear ?? settings.billingYear,
          billingStartDate: data.billingStartDate ?? settings.billingStartDate,
          billingEndDate: data.billingEndDate ?? settings.billingEndDate,
          billingStatus: data.billingStatus ?? settings.billingStatus ?? 'Active',
        };
        setSettings(syncedSettings);
        localStorage.setItem('apsara_app_settings', JSON.stringify(syncedSettings));
        localStorage.removeItem('varun_app_settings');
        localStorage.removeItem('dheeksha_app_settings');
        window.dispatchEvent(new Event('apsara_settings_updated'));
      }

      setToast({
        open: true,
        message: '✅ Company Profile, Logo & Settings saved to MongoDB Database successfully!',
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Failed to save settings to server:', err);
      setToast({
        open: true,
        message: err?.message || 'Billing year cannot be changed manually. The billing year must remain synchronized with the current system date.',
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm('Reset company profile details to default values?')) {
      setSettings(DEFAULT_COMPANY_SETTINGS);
      localStorage.setItem('apsara_app_settings', JSON.stringify(DEFAULT_COMPANY_SETTINGS));
      localStorage.removeItem('varun_app_settings');
      localStorage.removeItem('dheeksha_app_settings');
      window.dispatchEvent(new Event('apsara_settings_updated'));
      try {
        await SettingsApi.update(DEFAULT_COMPANY_SETTINGS);
      } catch (e) {
        console.error(e);
      }
      setToast({
        open: true,
        message: '🔄 Company profile reset to default.',
        severity: 'info',
      });
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: { xs: 'auto', md: 'calc(100vh - 72px)' },
        height: { xs: 'auto', md: 'calc(100vh - 72px)' },
        px: { xs: 1, sm: 1.5, md: 2 },
        py: { xs: 1, md: 0.5 },
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
          overflow: { xs: 'visible', md: 'hidden' },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Festive Crimson & Gold Header Banner */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            borderBottom: '2px solid #F59E0B',
            px: { xs: 2, sm: 3 },
            py: 1.2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            minHeight: '56px',
            flexShrink: 0,
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
              <BusinessRoundedIcon sx={{ color: '#FEF08A', fontSize: 22 }} />
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
                Company Profile & Settings
              </Typography>
              <Typography sx={{ color: '#FEF08A', fontSize: '11.5px', fontWeight: 600 }}>
                Configure store identity, logo upload, and bill invoice header details
              </Typography>
            </Box>
          </Box>

          {/* Actions & Top Right Annual Billing Indicator & Bill Year Switcher */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {/* Interactive Bill Year View Switcher Button */}
            <Button
              variant="outlined"
              onClick={(e) => setBillYearAnchorEl(e.currentTarget)}
              startIcon={<CalendarMonthRoundedIcon sx={{ fontSize: 18, color: '#FEF08A' }} />}
              endIcon={<ArrowDropDownRoundedIcon sx={{ fontSize: 20, color: '#FEF08A' }} />}
              sx={{
                color: '#FFFFFF',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(6px)',
                borderColor: 'rgba(254, 240, 138, 0.6)',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 800,
                textTransform: 'none',
                px: 1.8,
                height: '36px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
                '&:hover': {
                  borderColor: '#FEF08A',
                  backgroundColor: 'rgba(255, 255, 255, 0.28)',
                },
              }}
            >
              📅 Bill Year: <span style={{ color: '#FEF08A', marginLeft: '4px' }}>{selectedBillYear}</span>
            </Button>

            {/* Dropdown Menu for Bill View Year */}
            <Menu
              anchorEl={billYearAnchorEl}
              open={Boolean(billYearAnchorEl)}
              onClose={() => setBillYearAnchorEl(null)}
              slotProps={{
                paper: {
                  elevation: 6,
                  sx: {
                    borderRadius: '10px',
                    minWidth: '210px',
                    mt: 1,
                    border: '1.5px solid #E2E8F0',
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                  Bill View Year
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#94A3B8' }}>
                  Select year to view/filter bills
                </Typography>
              </Box>

              {getAvailableBillViewYears(settings.systemYear).map((opt) => (
                <MenuItem
                  key={opt.year}
                  selected={opt.year === selectedBillYear}
                  onClick={() => handleSelectBillViewYear(opt.year, opt.isFuture)}
                  sx={{
                    py: 1,
                    px: 2,
                    opacity: opt.isFuture ? 0.6 : 1,
                    backgroundColor: opt.year === selectedBillYear ? '#EFF6FF' : 'transparent',
                    '&:hover': {
                      backgroundColor: opt.isFuture ? '#FEF2F2' : '#F1F5F9',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: '30px' }}>
                    {opt.year === selectedBillYear ? (
                      <CheckRoundedIcon sx={{ fontSize: 18, color: '#2563EB' }} />
                    ) : opt.isFuture ? (
                      <LockOutlinedIcon sx={{ fontSize: 16, color: '#EF4444' }} />
                    ) : (
                      <HistoryRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={opt.label}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: '13px',
                          fontWeight: opt.year === selectedBillYear ? 800 : 600,
                          color: opt.isFuture ? '#94A3B8' : opt.year === selectedBillYear ? '#1E40AF' : '#1E293B',
                        },
                      },
                    }}
                  />
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="outlined"
              onClick={handleResetToDefault}
              startIcon={<RestartAltRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                color: '#FEF08A',
                borderColor: 'rgba(254, 240, 138, 0.5)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                height: '36px',
                '&:hover': {
                  borderColor: '#FEF08A',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              Reset to Default
            </Button>

            <Button
              variant="contained"
              disableElevation
              disabled={isSaving}
              onClick={handleSave}
              startIcon={isSaving ? <CircularProgress size={18} sx={{ color: '#B91C1C' }} /> : <SaveRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                backgroundColor: '#FFFFFF',
                color: '#B91C1C',
                border: '1.5px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'none',
                px: 2.5,
                height: '36px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                '&:hover': {
                  backgroundColor: '#F8FAFC',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#F3F4F6',
                  color: '#9CA3AF',
                },
              }}
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </Box>
        </Box>

        {/* Content Body: Split Left & Right filling full available height */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            overflow: { xs: 'visible', md: 'hidden' },
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Left Panel: Logo & Brand Identity (Full Height Scrollable) */}
          <Box
            sx={{
              width: { xs: '100%', md: '340px', lg: '380px' },
              borderRight: { xs: 'none', md: '1.5px solid #E2E8F0' },
              borderBottom: { xs: '1.5px solid #E2E8F0', md: 'none' },
              p: { xs: 2, sm: 2.5 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              overflowY: { xs: 'visible', md: 'auto' },
              backgroundColor: '#FFFFFF',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            {/* Logo Card */}
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                border: '1.5px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#991B1B', mb: 0.3 }}>
                Company Logo
              </Typography>
              <Typography sx={{ fontSize: '11.5px', color: '#786C58', mb: 1.5 }}>
                Displayed on top navigation and printed invoices
              </Typography>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />

              {/* Logo Display / Drop Zone */}
              <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  width: '100%',
                  height: '170px',
                  borderRadius: '10px',
                  border: isDraggingLogo
                    ? '2.5px dashed #DC2626'
                    : settings.logoUrl
                    ? '1.5px solid #E2E8F0'
                    : '2px dashed #D97706',
                  backgroundColor: isDraggingLogo ? '#FEF2F2' : settings.logoUrl ? '#FFFFFF' : '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  p: 1.5,
                  boxSizing: 'border-box',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#DC2626',
                    backgroundColor: '#FFF5F5',
                  },
                }}
              >
                {settings.logoUrl ? (
                  <Box
                    component="img"
                    src={settings.logoUrl}
                    alt="Company Logo"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: '6px',
                    }}
                  />
                ) : (
                  <>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: '#F1F5F9',
                        color: '#B91C1C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1,
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <PhotoCameraRoundedIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                      Click or Drag Logo Image
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: '#334155', mt: 0.3 }}>
                      PNG, JPG, SVG or WEBP (Max 5MB)
                    </Typography>
                  </>
                )}
              </Box>

              {/* Logo Action Buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5, width: '100%', justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    borderColor: '#E2E8F0',
                    color: '#991B1B',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '8px',
                    '&:hover': { borderColor: '#DC2626', backgroundColor: '#F8FAFC' },
                  }}
                >
                  {settings.logoUrl ? 'Change' : 'Upload Logo'}
                </Button>

                {settings.logoUrl && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleManualRemoveWhiteBg}
                    disabled={isProcessingLogo}
                    sx={{
                      borderColor: '#F59E0B',
                      color: '#B45309',
                      backgroundColor: '#F1F5F9',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: '8px',
                      '&:hover': { backgroundColor: '#E2E8F0', borderColor: '#D97706' },
                    }}
                  >
                    {isProcessingLogo ? 'Processing...' : '✨ Remove White BG'}
                  </Button>
                )}

                {settings.logoUrl && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleRemoveLogo}
                    startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: '8px',
                    }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </Box>

            {/* Live Invoice Header Preview */}
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                textAlign: 'left',
              }}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', mb: 1 }}>
                Live Invoice Header Preview
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                {settings.logoUrl ? (
                  <Box
                    component="img"
                    src={settings.logoUrl}
                    alt="Logo"
                    sx={{ width: 38, height: 38, objectFit: 'contain', borderRadius: '6px' }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '6px',
                      backgroundColor: '#DC2626',
                      color: '#FEF08A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '16px',
                    }}
                  >
                    {settings.companyName.charAt(0) || 'V'}
                  </Box>
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontSize: '14px', fontWeight: 800, color: '#1F1714', lineHeight: 1.1 }}>
                    {settings.companyName || 'Company Name'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    {settings.city || 'Sivakasi'}{settings.state ? `, ${settings.state}` : ''}
                  </Typography>
                </Box>
              </Box>
              {settings.tagline && (
                <Typography sx={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic', mb: 0.5 }}>
                  "{settings.tagline}"
                </Typography>
              )}
              <Typography sx={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                GSTIN: {settings.gstin || 'Not specified'}
              </Typography>
            </Box>

            {/* Quick Status Info */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: '10px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
              }}
            >
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155', mb: 0.5 }}>
                ⚡ Auto-Sync Active
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#B45309', lineHeight: 1.4 }}>
                Changes saved here will automatically update the Navbar branding, Estimates, and Invoice Bill Print templates.
              </Typography>
            </Box>
          </Box>

          {/* Right Panel: Full Profile Forms (Scrollable, Full-Height) */}
          <Box
            sx={{
              flex: 1,
              p: { xs: 2, sm: 3 },
              overflowY: { xs: 'visible', md: 'auto' },
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            {/* Section 1: Store & Company Details */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StorefrontRoundedIcon sx={{ color: '#DC2626', fontSize: 20 }} />
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#991B1B' }}>
                  Store & Business Identity
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Company / Store Name *"
                    value={settings.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Enter your company / store name"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tagline / Description"
                    value={settings.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="e.g. Direct Manufacturer & Wholesale Supplier"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Owner / Contact Person"
                    value={settings.ownerName}
                    onChange={(e) => handleChange('ownerName', e.target.value)}
                    placeholder="e.g. Siva"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Email Address"
                    value={settings.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. contact@example.com"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Section 2: Contact & Phone Details */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PhoneInTalkRoundedIcon sx={{ color: '#D97706', fontSize: 20 }} />
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#334155' }}>
                  Contact Numbers & WhatsApp
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Primary Phone Number *"
                    value={settings.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="WhatsApp Number"
                    value={settings.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Section 3: Physical Address & Location */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocationOnRoundedIcon sx={{ color: '#16A34A', fontSize: 20 }} />
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#166534' }}>
                  Store Location & Postal Address
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Street Address / Location *"
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="e.g. 124, Sivakasi Main Road, Near Bus Stand"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="City *"
                    value={settings.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g. Sivakasi"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="State *"
                    value={settings.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="e.g. Tamil Nadu"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Pincode"
                    value={settings.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    placeholder="e.g. 626123"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Section 4: GSTIN & Tax Identification */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ReceiptLongRoundedIcon sx={{ color: '#2563EB', fontSize: 20 }} />
                  <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#1E40AF' }}>
                    Tax & Legal Registration
                  </Typography>
                </Box>

                {/* Tax / GST Toggle Button */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.2,
                    backgroundColor: settings.enableTax ? '#EFF6FF' : '#F8FAFC',
                    border: settings.enableTax ? '1.5px solid #93C5FD' : '1px solid #E2E8F0',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '20px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: settings.enableTax ? '#1D4ED8' : '#64748B' }}>
                    {settings.enableTax ? 'Tax / GST: ON' : 'Tax / GST: OFF'}
                  </Typography>
                  <Switch
                    checked={Boolean(settings.enableTax)}
                    onChange={(e) => handleChange('enableTax', e.target.checked)}
                    color="primary"
                    size="small"
                  />
                </Box>
              </Box>

              <Typography sx={{ fontSize: '12px', color: '#64748B', mb: 2 }}>
                {settings.enableTax
                  ? 'Tax calculation is ENABLED. Tax / GST percentage will be displayed and applied during billing.'
                  : 'Tax calculation is DISABLED. Tax / GST field will be hidden from billing.'}
              </Typography>

              <Grid container spacing={2}>
                {/* When Tax Toggle is ON, show Default Tax Rate field */}
                {settings.enableTax && (
                  <Grid size={{ xs: 12 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px dashed #93C5FD',
                        mb: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF', mb: 1 }}>
                        Default GST / Tax Rate (%)
                      </Typography>
                      <TextField
                        size="small"
                        value={settings.defaultTaxRate || ''}
                        onChange={(e) => handleChange('defaultTaxRate', e.target.value)}
                        placeholder="e.g. 18 or 5"
                        sx={{
                          maxWidth: '260px',
                          backgroundColor: '#FFFFFF',
                          '& .MuiInputBase-input': { fontWeight: 700, color: '#1D4ED8', fontSize: '14px' },
                        }}
                      />
                      <Typography sx={{ fontSize: '11.5px', color: '#3B82F6', mt: 0.8 }}>
                        This tax percentage will automatically apply as the default tax rate in the billing page.
                      </Typography>
                    </Box>
                  </Grid>
                )}

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="GSTIN Number"
                    value={settings.gstin}
                    onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="PAN Number"
                    value={settings.pan}
                    onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                    placeholder="e.g. AAAAA0000A"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Section 5: Annual Billing Restriction & Billing Period */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '12px',
                border: String(settings.billingYear) !== String(settings.systemYear || new Date().getFullYear())
                  ? '1.5px solid #EF4444'
                  : '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonthRoundedIcon sx={{ color: '#7C3AED', fontSize: 20 }} />
                  <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#5B21B6' }}>
                    Annual Billing & Billing Period
                  </Typography>
                </Box>

                <Chip
                  label={`Billing Status: ${settings.billingStatus || 'Active'}`}
                  size="small"
                  sx={{
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    fontWeight: 800,
                    fontSize: '12px',
                    border: '1px solid #86EFAC',
                  }}
                />
              </Box>

              <Typography sx={{ fontSize: '12px', color: '#64748B', mb: 2 }}>
                The billing year and annual billing dates are automatically synchronized with the authoritative system date.
              </Typography>

              {String(settings.billingYear) !== String(settings.systemYear || new Date().getFullYear()) && (
                <Alert
                  severity="error"
                  sx={{ mb: 2, fontWeight: 700, borderRadius: '8px' }}
                >
                  Billing year cannot be changed manually. The billing year must remain synchronized with the current system date ({settings.systemYear || new Date().getFullYear()}).
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="System Date"
                    value={settings.systemDate || `${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()}`}
                    slotProps={{
                      input: {
                        readOnly: true,
                      },
                    }}
                    helperText="Authoritative server system date"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Current Billing Year *"
                    value={settings.billingYear || ''}
                    onChange={(e) => handleChange('billingYear', e.target.value)}
                    error={String(settings.billingYear) !== String(settings.systemYear || new Date().getFullYear())}
                    helperText={
                      String(settings.billingYear) !== String(settings.systemYear || new Date().getFullYear())
                        ? "Mismatched year! Must equal system year"
                        : "Synchronized with system date"
                    }
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Billing Start Date"
                    value={settings.billingStartDate || `01-01-${new Date().getFullYear()}`}
                    slotProps={{
                      input: {
                        readOnly: true,
                      },
                    }}
                    helperText="January 1 of current billing year"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Billing End Date"
                    value={settings.billingEndDate || `31-12-${new Date().getFullYear()}`}
                    slotProps={{
                      input: {
                        readOnly: true,
                      },
                    }}
                    helperText="December 31 of current billing year"
                  />
                </Grid>
              </Grid>

              {/* Bill View Year Switcher Subsection */}
              <Box
                sx={{
                  mt: 2.5,
                  pt: 2,
                  borderTop: '1px dashed #CBD5E1',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryRoundedIcon sx={{ color: '#2563EB', fontSize: 18 }} />
                    <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#1E40AF' }}>
                      Bill View Year Switcher (Filter)
                    </Typography>
                  </Box>

                  <Chip
                    label={`Viewing: ${selectedBillYear} Bills`}
                    color={selectedBillYear === (settings.systemYear || new Date().getFullYear().toString()) ? 'primary' : 'warning'}
                    size="small"
                    sx={{ fontWeight: 800, fontSize: '11.5px' }}
                  />
                </Box>

                <Typography sx={{ fontSize: '11.5px', color: '#64748B', mb: 1.5 }}>
                  Select a year below to view historical bills. Switching view year filters bill records without altering the system date or existing invoices.
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  {getAvailableBillViewYears(settings.systemYear).map((opt) => {
                    const isSelected = opt.year === selectedBillYear;
                    return (
                      <Button
                        key={opt.year}
                        variant={isSelected ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleSelectBillViewYear(opt.year, opt.isFuture)}
                        startIcon={
                          isSelected ? (
                            <CheckRoundedIcon sx={{ fontSize: 16 }} />
                          ) : opt.isFuture ? (
                            <LockOutlinedIcon sx={{ fontSize: 15 }} />
                          ) : (
                            <HistoryRoundedIcon sx={{ fontSize: 15 }} />
                          )
                        }
                        sx={{
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: isSelected ? 800 : 700,
                          fontSize: '12.5px',
                          px: 1.8,
                          height: '34px',
                          ...(isSelected && {
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                          }),
                          ...(!isSelected && !opt.isFuture && {
                            borderColor: '#CBD5E1',
                            color: '#334155',
                            '&:hover': { backgroundColor: '#F1F5F9', borderColor: '#94A3B8' },
                          }),
                          ...(opt.isFuture && {
                            borderColor: '#FCA5A5',
                            color: '#9CA3AF',
                            backgroundColor: '#FEF2F2',
                          }),
                        }}
                      >
                        {opt.year} {opt.year === (settings.systemYear || new Date().getFullYear().toString()) ? '(Current)' : ''}
                      </Button>
                    );
                  })}
                </Box>

                {selectedBillYear !== (settings.systemYear || new Date().getFullYear().toString()) && (
                  <Alert severity="info" sx={{ mt: 1.5, fontSize: '12px', fontWeight: 600, py: 0.5, borderRadius: '8px' }}>
                    ℹ️ You are currently viewing historical bills generated in <strong>{selectedBillYear}</strong>. Authoritative system year remains <strong>{settings.systemYear || new Date().getFullYear()}</strong>.
                  </Alert>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Paper>

      {/* Snackbar Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%', fontWeight: 700, borderRadius: '10px' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
