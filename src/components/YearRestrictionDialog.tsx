import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { getSelectedBillYear, setSelectedBillYear } from '../utils/billYearUtils';

export interface YearRestrictionDialogDetail {
  selectedYear?: string;
  currentSystemYear?: string;
  isFutureYear?: boolean;
  message?: string;
  title?: string;
  onProceed?: () => void;
  onSwitch?: () => void;
}

export const triggerYearRestrictionDialog = (options: YearRestrictionDialogDetail = {}) => {
  const currentSysYear = new Date().getFullYear().toString();
  const selYear = options.selectedYear || getSelectedBillYear();
  const isFuture = options.isFutureYear ?? (Number(selYear) > Number(currentSysYear));

  window.dispatchEvent(
    new CustomEvent<YearRestrictionDialogDetail>('apsara_show_year_restriction', {
      detail: {
        selectedYear: selYear,
        currentSystemYear: currentSysYear,
        isFutureYear: isFuture,
        title: options.title || (isFuture ? 'Future Year Restricted' : 'Previous Year Notice'),
        message: options.message || (
          isFuture
            ? `${selYear} is not available yet. Please wait until the system year changes to ${selYear}.`
            : `You are currently viewing ${selYear} records. You can switch to current year (${currentSysYear}) or continue in ${selYear}.`
        ),
        onProceed: options.onProceed,
        onSwitch: options.onSwitch,
      },
    })
  );
};

export const YearRestrictionDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [dialogData, setDialogData] = useState<YearRestrictionDialogDetail>({
    selectedYear: '2025',
    currentSystemYear: new Date().getFullYear().toString(),
    isFutureYear: false,
    title: 'Previous Year Notice',
    message: '',
  });

  useEffect(() => {
    const handleShowDialog = (e: Event) => {
      const customEvent = e as CustomEvent<YearRestrictionDialogDetail>;
      if (customEvent.detail) {
        setDialogData(customEvent.detail);
        setOpen(true);
      }
    };

    window.addEventListener('apsara_show_year_restriction', handleShowDialog);
    return () => {
      window.removeEventListener('apsara_show_year_restriction', handleShowDialog);
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  const handleStay = () => {
    setOpen(false);
    if (dialogData.onProceed) {
      dialogData.onProceed();
    }
  };

  const handleSwitchToCurrentYear = () => {
    const sysYear = dialogData.currentSystemYear || new Date().getFullYear().toString();
    setSelectedBillYear(sysYear);
    setOpen(false);
    if (dialogData.onSwitch) {
      dialogData.onSwitch();
    } else if (dialogData.onProceed) {
      dialogData.onProceed();
    }
  };

  const currentSysYear = dialogData.currentSystemYear || new Date().getFullYear().toString();
  const selYear = dialogData.selectedYear || getSelectedBillYear();
  const isFuture = dialogData.isFutureYear;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '4px',
            border: '1px solid #B0C4DE',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            bgcolor: '#FFFFFF',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Title Header Bar (ERP Window Style) */}
      <DialogTitle
        sx={{
          background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
          borderBottom: '1px solid #A8C2DC',
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isFuture ? (
            <LockRoundedIcon sx={{ fontSize: 18, color: '#D97706' }} />
          ) : (
            <WarningAmberRoundedIcon sx={{ fontSize: 19, color: '#B91C1C' }} />
          )}
          <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', letterSpacing: '0.01em' }}>
            {dialogData.title || (isFuture ? 'Future Year Restricted' : 'Previous Year Notice')}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{
            color: '#64748B',
            p: 0.5,
            '&:hover': { color: '#0F172A', bgcolor: 'rgba(0,0,0,0.06)' },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </DialogTitle>

      {/* Dialog Body Content */}
      <DialogContent sx={{ p: 2, bgcolor: '#FFFFFF' }}>
        <Box
          sx={{
            p: 1.5,
            bgcolor: isFuture ? '#FFFBEB' : '#FEF2F2',
            border: isFuture ? '1px solid #FDE68A' : '1px solid #FECACA',
            borderRadius: '3px',
            mb: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.2,
          }}
        >
          <CalendarTodayRoundedIcon
            sx={{
              fontSize: 18,
              color: isFuture ? '#D97706' : '#DC2626',
              mt: 0.2,
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: '12.5px', color: '#1E293B', lineHeight: 1.5, fontWeight: 500 }}>
            {dialogData.message}
          </Typography>
        </Box>

        {!isFuture && (
          <Typography sx={{ fontSize: '12px', color: '#64748B', px: 0.5 }}>
            Do you want to switch to the current year <b>({currentSysYear})</b> or proceed in <b>{selYear}</b>?
          </Typography>
        )}
      </DialogContent>

      {/* Action Buttons (Sales Page Style: [Switch to Current Year] [Stay in Year] [Exit]) */}
      <DialogActions
        sx={{
          bgcolor: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          px: 2,
          py: 1.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        {/* Switch to Current Year (Burgundy Button - like Sales Save Button) */}
        {!isFuture && (
          <Button
            onClick={handleSwitchToCurrentYear}
            variant="contained"
            sx={{
              bgcolor: '#741748',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              px: 2,
              py: 0.5,
              borderRadius: '3px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#580e34', boxShadow: 'none' },
            }}
          >
            Switch to {currentSysYear}
          </Button>
        )}

        {/* Stay in Year & Proceed (Grey Button - like Sales Print/Grid Buttons) */}
        {!isFuture && (
          <Button
            onClick={handleStay}
            variant="outlined"
            sx={{
              bgcolor: '#E5ECF4',
              borderColor: '#94A3B8',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '12px',
              px: 2,
              py: 0.5,
              borderRadius: '3px',
              textTransform: 'none',
              '&:hover': { bgcolor: '#D9E4F2' },
            }}
          >
            Stay in {selYear}
          </Button>
        )}

        {/* Exit / Close Button (Clean Outlined) */}
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            bgcolor: '#FFFFFF',
            borderColor: '#CBD5E1',
            color: '#475569',
            fontWeight: 600,
            fontSize: '12px',
            px: 1.5,
            py: 0.5,
            borderRadius: '3px',
            textTransform: 'none',
            '&:hover': { bgcolor: '#F1F5F9', borderColor: '#94A3B8' },
          }}
        >
          {isFuture ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
