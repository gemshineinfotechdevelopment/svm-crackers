import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import CircularProgress from '@mui/material/CircularProgress';
import { BillPrintTemplate, type BillPrintData } from './BillPrintTemplate';
import { printBillDirectly } from '../utils/printUtils';
import { shareBillViaWhatsApp, downloadBillAsPdf } from '../utils/pdfShareUtils';

interface BillPrintModalProps {
  open: boolean;
  onClose: () => void;
  bill: BillPrintData | null;
}

export const BillPrintModal: React.FC<BillPrintModalProps> = ({ open, onClose, bill }) => {
  if (!bill) return null;

  const printAreaRef = React.useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = React.useState<boolean>(false);
  const [downloading, setDownloading] = React.useState<boolean>(false);

  const handleTriggerPrint = () => {
    printBillDirectly(bill);
  };

  const handleShareWhatsApp = async () => {
    if (!printAreaRef.current) return;
    setSharing(true);
    try {
      await shareBillViaWhatsApp(printAreaRef.current, {
        billNo: bill.billNo,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        totalAmount: bill.total || bill.amount || 0,
        date: bill.date,
        companyName: bill.companyName || 'APSARA CRACKERS',
        isGst: false,
      });
    } catch (err) {
      console.error('Failed to share PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setDownloading(true);
    try {
      await downloadBillAsPdf(printAreaRef.current, {
        billNo: bill.billNo,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        totalAmount: bill.total || bill.amount || 0,
        date: bill.date,
        companyName: bill.companyName || 'APSARA CRACKERS',
        isGst: false,
      });
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Hidden print styling that guarantees ONLY the bill template is printed */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .apsara-printable-section,
            .apsara-printable-section * {
              visibility: visible !important;
            }
            .apsara-printable-section {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #FFFFFF !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .apsara-no-print {
              display: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}
      </style>

      {/* Screen Dialog for Previewing */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '14px',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        {/* Modal Top Bar */}
        <Box
          className="apsara-no-print"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 1.8,
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            borderBottom: '1px solid #E2E8F0',
            color: '#FFFFFF',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Bill Preview - #{bill.billNo || 'New'}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#FEE2E2', fontWeight: 500 }}>
              {bill.customerName} | {bill.companyName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              disableElevation
              onClick={handleTriggerPrint}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: '18px !important', color: '#DC2626' }} />}
              sx={{
                backgroundColor: '#FFFFFF',
                color: '#DC2626',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                py: 0.6,
                borderRadius: '6px',
                '&:hover': {
                  backgroundColor: '#F8FAFC',
                },
              }}
            >
              Print Invoice
            </Button>
            <IconButton onClick={onClose} sx={{ color: '#FFFFFF', p: 0.8 }}>
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Modal Body with Bill Document */}
        <DialogContent
          sx={{
            p: { xs: 1.5, sm: 3 },
            backgroundColor: '#F1F5F9',
            display: 'flex',
            justifyContent: 'center',
            overflowY: 'auto',
          }}
        >
          <Box
            ref={printAreaRef}
            className="apsara-printable-section"
            sx={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
              borderRadius: '0px',
              border: 'none',
              width: '100%',
              maxWidth: '820px',
            }}
          >
            <BillPrintTemplate bill={bill} />
          </Box>
        </DialogContent>

        {/* Modal Bottom Actions */}
        <DialogActions
          className="apsara-no-print"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1.5,
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              color: '#475569',
              borderColor: '#CBD5E1',
              py: 1,
              '&:hover': { borderColor: '#94A3B8', backgroundColor: '#F8FAFC' },
            }}
          >
            Close Preview
          </Button>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.2,
              alignItems: 'center',
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <Button
              onClick={handleDownloadPdf}
              variant="outlined"
              disabled={downloading || sharing}
              startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfRoundedIcon />}
              sx={{
                color: '#DC2626',
                borderColor: '#FCA5A5',
                px: 2,
                py: 1,
                fontWeight: 700,
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
              }}
            >
              {downloading ? 'Creating PDF...' : 'Download PDF'}
            </Button>

            <Button
              onClick={handleShareWhatsApp}
              variant="contained"
              disabled={sharing || downloading}
              startIcon={sharing ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <WhatsAppIcon />}
              sx={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                px: 2.5,
                py: 1.1,
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { backgroundColor: '#15803D' },
              }}
            >
              {sharing ? 'Generating PDF...' : 'Share on WhatsApp (PDF)'}
            </Button>

            <Button
              variant="contained"
              disableElevation
              onClick={handleTriggerPrint}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: '18px !important' }} />}
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 2.5,
                py: 1.1,
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                width: { xs: '100%', sm: 'auto' },
                '&:hover': {
                  background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                },
              }}
            >
              Print
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};
