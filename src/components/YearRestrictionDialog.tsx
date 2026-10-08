import React, { useState, useEffect } from 'react';
import {
  Dialog,
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
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { getSelectedBillYear, setSelectedBillYear } from '../utils/billYearUtils';

export interface YearRestrictionDialogDetail {
  selectedYear?: string;
  currentSystemYear?: string;
  isFutureYear?: boolean;
  message?: string;
  title?: string;
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
        title: options.title || (isFuture ? 'Future Year Restricted' : 'Previous Year Selected'),
        message: options.message || (
          isFuture
            ? `${selYear} is not available yet. Please wait until the system year changes to ${selYear}.`
            : `You are currently viewing ${selYear} data. New bills and products can only be created in the current system year (${currentSysYear}). Please switch to ${currentSysYear} before creating.`
        ),
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
    title: 'Previous Year Selected',
    message: '',
  });

  useEffect(() => {
    const handleShowDialog = (e: Event) => {
      const customEvent = e as CustomEvent<YearRestrictionDialogDetail>;
      if (customEvent.detail) {
        setDialogData((prev) => ({
          ...prev,
          ...customEvent.detail,
        }));
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

  const handleSwitchToCurrentYear = () => {
    const sysYear = dialogData.currentSystemYear || new Date().getFullYear().toString();
    setSelectedBillYear(sysYear);
    setOpen(false);
  };

  const currentSysYear = dialogData.currentSystemYear || new Date().getFullYear().toString();
  const selYear = dialogData.selectedYear || getSelectedBillYear();
  const isFuture = dialogData.isFutureYear;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            p: 1.5,
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.22), 0 8px 16px rgba(0, 0, 0, 0.08)',
            border: isFuture ? '1px solid rgba(217, 119, 6, 0.2)' : '1px solid rgba(220, 38, 38, 0.2)',
            background: '#FFFFFF',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header Close Icon */}
      <Box sx={{ position: 'relative', pt: 1.5, px: 2, pb: 1, textAlign: 'center' }}>
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: '#9CA3AF',
            '&:hover': { color: '#374151', backgroundColor: '#F3F4F6' },
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>

        {/* Circular Accent Badge */}
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: isFuture ? '#FEF3C7' : '#FEE2E2',
            color: isFuture ? '#D97706' : '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
            boxShadow: isFuture ? '0 0 0 8px rgba(254, 243, 199, 0.4)' : '0 0 0 8px rgba(254, 226, 226, 0.4)',
          }}
        >
          {isFuture ? (
            <LockRoundedIcon sx={{ fontSize: 34 }} />
          ) : (
            <WarningAmberRoundedIcon sx={{ fontSize: 36 }} />
          )}
        </Box>

        {/* Dialog Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: '#111827',
            fontSize: '1.2rem',
            letterSpacing: '-0.015em',
            mb: 1,
          }}
        >
          {dialogData.title || (isFuture ? 'Future Year Restricted' : 'Previous Year Selected')}
        </Typography>

        {/* Dialog Content Message */}
        <Typography
          variant="body2"
          sx={{
            color: '#4B5563',
            lineHeight: 1.6,
            fontSize: '0.935rem',
            px: 1,
          }}
        >
          {dialogData.message}
        </Typography>
      </Box>

      {/* Action Buttons */}
      <DialogActions sx={{ px: 2, pb: 1.5, pt: 2, flexDirection: 'column', gap: 1 }}>
        {!isFuture && (
          <Button
            fullWidth
            variant="contained"
            onClick={handleSwitchToCurrentYear}
            startIcon={<CalendarTodayRoundedIcon />}
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              py: 1.2,
              borderRadius: '12px',
              fontSize: '0.95rem',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
              '&:hover': {
                backgroundColor: '#B91C1C',
                boxShadow: '0 6px 18px rgba(220, 38, 38, 0.45)',
              },
            }}
          >
            Switch to Current Year ({currentSysYear})
          </Button>
        )}
        <Button
          fullWidth
          variant="outlined"
          onClick={handleClose}
          sx={{
            color: '#4B5563',
            borderColor: '#D1D5DB',
            fontWeight: 600,
            textTransform: 'none',
            py: 1,
            borderRadius: '12px',
            fontSize: '0.9rem',
            '&:hover': {
              borderColor: '#9CA3AF',
              backgroundColor: '#F9FAFB',
            },
          }}
        >
          {isFuture ? 'Close' : `Stay in ${selYear} View`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
