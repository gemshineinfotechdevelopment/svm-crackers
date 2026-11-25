import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import { ChitReceiptTemplate, type ChitReceiptData } from './ChitReceiptTemplate';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ChitReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receipt: ChitReceiptData | null;
}

export const ChitReceiptModal: React.FC<ChitReceiptModalProps> = ({ open, onClose, receipt }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  if (!receipt) return null;

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open('', '', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt_${receipt.receiptNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #FFFFFF;
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0F172A;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table { border-collapse: collapse; width: 100%; }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: `Chit_Receipt_${receipt.receiptNumber}_${receipt.customer.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#FFFFFF',
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
        },
      };

      await html2pdf().set(opt).from(receiptRef.current).save();
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Could not download PDF. Please try Print instead.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '6px',
            overflow: 'hidden',
            maxHeight: '94vh',
          },
        },
      }}
    >
      {/* Header Bar */}
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
        <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
          Official Chit Payment Receipt — #{receipt.receiptNumber}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#475569', p: 0.3 }}>
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Printable Receipt Content */}
      <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 }, backgroundColor: '#F1F5F9' }}>
        <div ref={receiptRef}>
          <ChitReceiptTemplate receipt={receipt} />
        </div>
      </DialogContent>

      {/* Footer Action Buttons */}
      <DialogActions
        sx={{
          p: 1.5,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #CBD5E1',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={onClose}
          sx={{ color: '#64748B', fontWeight: 600, fontSize: '12px', textTransform: 'none' }}
        >
          Close
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleDownloadPdf}
            disabled={downloading}
            startIcon={
              downloading ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfRoundedIcon sx={{ fontSize: 16 }} />
            }
            sx={{
              borderColor: '#CBD5E1',
              color: '#1E293B',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.8,
              '&:hover': { borderColor: '#94A3B8', backgroundColor: '#F8FAFC' },
            }}
          >
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={handlePrint}
            startIcon={<PrintOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{
              backgroundColor: '#741748',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'none',
              px: 2,
              '&:hover': { backgroundColor: '#580e34' },
            }}
          >
            Print Receipt
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
