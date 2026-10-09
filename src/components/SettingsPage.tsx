import React, { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Snackbar,
  Alert,
  Switch,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import CircularProgress from '@mui/material/CircularProgress';
import defaultProjectLogo from '../assets/logo.png';
import { SettingsApi } from '../services/api';

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
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Manjula Crackers',
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

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a === 0 || (r >= threshold && g >= threshold && b >= threshold)) {
            data[idx + 3] = 0;
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
      if (!parsed.companyName || parsed.companyName.toLowerCase().includes('varun') || parsed.companyName.toLowerCase().includes('dheeksha') || parsed.companyName.toLowerCase().includes('apsara') || parsed.companyName.toLowerCase().includes('svm')) {
        parsed.companyName = 'Manjula Crackers';
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

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await SettingsApi.get();
        const data = (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
        if (data && typeof data === 'object') {
          const compName = (!data.companyName || data.companyName.toLowerCase().includes('varun') || data.companyName.toLowerCase().includes('dheeksha') || data.companyName.toLowerCase().includes('apsara') || data.companyName.toLowerCase().includes('svm'))
            ? 'Manjula Crackers'
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
          };
          setSettings(remoteSettings);
          localStorage.setItem('apsara_app_settings', JSON.stringify(remoteSettings));
          window.dispatchEvent(new Event('apsara_settings_updated'));
        }
      } catch (err) {
        console.warn('Could not fetch settings from backend, using local storage:', err);
      }
    };
    loadSettings();
  }, []);

  const handleChange = <K extends keyof CompanySettings>(field: K, value: CompanySettings[K]) => {
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
            message: 'Logo uploaded & processed! Click "Save Settings" to apply.',
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
        message: 'White background removed from logo successfully!',
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
    try {
      setIsSaving(true);
      localStorage.setItem('apsara_app_settings', JSON.stringify(settings));
      window.dispatchEvent(new Event('apsara_settings_updated'));

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
        };
        setSettings(syncedSettings);
        localStorage.setItem('apsara_app_settings', JSON.stringify(syncedSettings));
        window.dispatchEvent(new Event('apsara_settings_updated'));
      }

      setToast({
        open: true,
        message: 'Company profile & settings saved successfully!',
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Failed to save settings to server:', err);
      setToast({
        open: true,
        message: 'Profile saved locally!',
        severity: 'success',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm('Reset company profile details to default values?')) {
      setSettings(DEFAULT_COMPANY_SETTINGS);
      localStorage.setItem('apsara_app_settings', JSON.stringify(DEFAULT_COMPANY_SETTINGS));
      window.dispatchEvent(new Event('apsara_settings_updated'));
      try {
        await SettingsApi.update(DEFAULT_COMPANY_SETTINGS);
      } catch (e) {
        console.error(e);
      }
      setToast({
        open: true,
        message: 'Company profile reset to default.',
        severity: 'info',
      });
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 'calc(100vh - 48px)',
        bgcolor: '#D9E4F2',
        p: { xs: 1, sm: 1.5 },
        boxSizing: 'border-box',
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Main ERP Window Card */}
      <Paper
        elevation={0}
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
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsRoundedIcon sx={{ fontSize: 18, color: '#1E3A8A' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', letterSpacing: 0.2 }}>
              System & Company Profile Settings
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Button
              size="small"
              onClick={handleResetToDefault}
              startIcon={<RestartAltRoundedIcon sx={{ fontSize: 15 }} />}
              sx={{
                bgcolor: '#EDF4FB',
                border: '1px solid #94A3B8',
                color: '#0F172A',
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '3px',
                px: 1.2,
                py: 0.3,
                '&:hover': { bgcolor: '#E2E8F0' },
              }}
            >
              Reset Default
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={isSaving}
              onClick={handleSave}
              startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                bgcolor: '#741748',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '3px',
                px: 1.8,
                py: 0.4,
                '&:hover': { bgcolor: '#580e34' },
              }}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Box>

        {/* Content Body: Split Left & Right */}
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.5,
          }}
        >
          {/* Left Panel: Logo & Invoice Header Preview */}
          <Box
            sx={{
              width: { xs: '100%', md: '300px', lg: '320px' },
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            {/* Logo Fieldset */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Company Logo</legend>

              <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  width: '100%',
                  height: '140px',
                  borderRadius: '2px',
                  border: isDraggingLogo
                    ? '1.5px dashed #DC2626'
                    : settings.logoUrl
                    ? '1px solid #CBD5E1'
                    : '1px dashed #94A3B8',
                  bgcolor: isDraggingLogo ? '#FEF2F2' : settings.logoUrl ? '#FFFFFF' : '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  p: 1,
                  boxSizing: 'border-box',
                  '&:hover': { bgcolor: '#F1F7FD', borderColor: '#1E3A8A' },
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
                    }}
                  />
                ) : (
                  <>
                    <PhotoCameraRoundedIcon sx={{ fontSize: 28, color: '#94A3B8', mb: 0.5 }} />
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
                      Click or Drag Logo Image
                    </Typography>
                    <Typography sx={{ fontSize: '10.5px', color: '#94A3B8' }}>
                      PNG, JPG, SVG (Max 5MB)
                    </Typography>
                  </>
                )}
              </Box>

              {/* Logo Action Buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 1, justifyContent: 'center' }}>
                <Button
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: '#EDF4FB',
                    border: '1px solid #94A3B8',
                    color: '#0F172A',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '2px',
                    py: 0.2,
                    px: 1,
                    '&:hover': { bgcolor: '#E2E8F0' },
                  }}
                >
                  {settings.logoUrl ? 'Change' : 'Upload'}
                </Button>

                {settings.logoUrl && (
                  <Button
                    size="small"
                    onClick={handleManualRemoveWhiteBg}
                    disabled={isProcessingLogo}
                    sx={{
                      bgcolor: '#EDF4FB',
                      border: '1px solid #94A3B8',
                      color: '#1E3A8A',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: '2px',
                      py: 0.2,
                      px: 1,
                      '&:hover': { bgcolor: '#E2E8F0' },
                    }}
                  >
                    {isProcessingLogo ? '...' : 'Remove White BG'}
                  </Button>
                )}

                {settings.logoUrl && (
                  <Button
                    size="small"
                    color="error"
                    onClick={handleRemoveLogo}
                    startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: '2px',
                      py: 0.2,
                      px: 1,
                    }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </fieldset>

            {/* Live Invoice Header Preview */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Live Header Preview</legend>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                {settings.logoUrl ? (
                  <Box
                    component="img"
                    src={settings.logoUrl}
                    alt="Logo"
                    sx={{ width: 34, height: 34, objectFit: 'contain' }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '2px',
                      bgcolor: '#741748',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '14px',
                    }}
                  >
                    {settings.companyName.charAt(0) || 'S'}
                  </Box>
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>
                    {settings.companyName || 'Company Name'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: '10.5px', color: '#64748B' }}>
                    {settings.city || 'Sivakasi'}{settings.state ? `, ${settings.state}` : ''}
                  </Typography>
                </Box>
              </Box>
              {settings.tagline && (
                <Typography sx={{ fontSize: '10.5px', color: '#64748B', fontStyle: 'italic', mb: 0.4 }}>
                  "{settings.tagline}"
                </Typography>
              )}
              <Typography sx={{ fontSize: '10.5px', color: '#475569', fontWeight: 600 }}>
                Phone: {settings.phone || '-'} • WhatsApp: {settings.whatsapp || '-'}
              </Typography>
            </fieldset>
          </Box>

          {/* Right Panel: Grouped Form Settings */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Fieldset: Business Identity */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Business Identity</legend>
              <Grid container spacing={1.2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    Company / Store Name <span style={{ color: '#DC2626' }}>*</span>
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    value={settings.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    Tagline / Subtitle
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    value={settings.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    Contact Person / Owner
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    value={settings.ownerName}
                    onChange={(e) => handleChange('ownerName', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    Email Address
                  </Typography>
                  <input
                    type="email"
                    className="erp-input"
                    value={settings.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </Grid>
              </Grid>
            </fieldset>

            {/* Fieldset: Phone & Communication */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Contact & Communication Numbers</legend>
              <Grid container spacing={1.2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    Primary Phone Number <span style={{ color: '#DC2626' }}>*</span>
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    value={settings.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    WhatsApp Phone Number
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    value={settings.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                  />
                </Grid>
              </Grid>
            </fieldset>

            {/* Fieldset: Address & Location */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Store Location & Address</legend>
              <Grid container spacing={1.2}>
                <Grid size={{ xs: 12 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    Street Address <span style={{ color: '#DC2626' }}>*</span>
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    City <span style={{ color: '#DC2626' }}>*</span>
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    value={settings.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    State <span style={{ color: '#DC2626' }}>*</span>
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    value={settings.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    Pincode
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    value={settings.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                  />
                </Grid>
              </Grid>
            </fieldset>

            {/* Fieldset: Tax & Legal */}
            <fieldset className="erp-fieldset">
              <legend className="erp-legend">Tax & Legal Registration</legend>
              <Grid container spacing={1.2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    GSTIN Number
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    value={settings.gstin}
                    onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', mb: 0.2 }}>
                    PAN Number
                  </Typography>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. AAAAA0000A"
                    value={settings.pan}
                    onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A' }}>
                      Estimate Tax Calculation:
                    </Typography>
                    <Switch
                      size="small"
                      checked={Boolean(settings.enableTax)}
                      onChange={(e) => handleChange('enableTax', e.target.checked)}
                    />
                    <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                      {settings.enableTax ? 'Tax calculation enabled on Quotation' : 'Tax calculation disabled'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </fieldset>
          </Box>
        </Box>
      </Paper>

      {/* Floating Feedback Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%', fontWeight: 600, fontSize: '12px', borderRadius: '3px' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
