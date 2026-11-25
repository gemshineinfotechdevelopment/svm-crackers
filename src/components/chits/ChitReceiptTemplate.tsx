import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

export interface ChitReceiptData {
  receiptNumber: string;
  receiptDate: string;
  company: {
    name: string;
    address: string;
    phone: string;
    logoUrl?: string;
  };
  customer: {
    chitCustomerId: string;
    name: string;
    mobile: string;
    address?: string;
    city?: string;
  };
  scheme: {
    allocationId: string;
    schemeName: string;
    personCount: number;
    monthlyAmountPerPerson: number;
    totalMonthlyAmount: number;
    duration: number;
    totalChitValue: number;
  };
  payment: {
    paymentId: string;
    paymentMonth: string;
    installmentNumber: number;
    installmentDueDate?: string;
    monthlyInstallmentAmount: number;
    previouslyPaidAmount: number;
    currentPaymentAmount: number;
    remainingInstallmentBalance: number;
    paymentDate: string;
    paymentMode: string;
    transactionReference?: string;
    paymentTimingStatus: 'On Time' | 'Advance' | 'Delay' | string;
    notes?: string;
  };
}

interface ChitReceiptTemplateProps {
  receipt: ChitReceiptData;
}

export const ChitReceiptTemplate: React.FC<ChitReceiptTemplateProps> = ({ receipt }) => {
  const { company, customer, scheme, payment } = receipt;

  const timingColor =
    payment.paymentTimingStatus === 'On Time'
      ? '#059669'
      : payment.paymentTimingStatus === 'Advance'
      ? '#2563EB'
      : '#DC2626';

  const timingBg =
    payment.paymentTimingStatus === 'On Time'
      ? '#ECFDF5'
      : payment.paymentTimingStatus === 'Advance'
      ? '#EFF6FF'
      : '#FEF2F2';

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '700px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        p: { xs: 2, sm: 3 },
        border: '1.5px solid #CBD5E1',
        borderRadius: '6px',
        boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* 1. Header / Company Branding */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pb: 1.5,
          borderBottom: '2px solid #741748',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontSize: '22px',
              fontWeight: 900,
              color: '#741748',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {company?.name || 'SAI YOGI CRACKERS'}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#475569', mt: 0.3, fontWeight: 500 }}>
            {company?.address || 'Main Road, Sivakasi - 626123, Tamil Nadu'}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
            Phone: {company?.phone || '+91 98765 43210'}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Box
            sx={{
              display: 'inline-block',
              backgroundColor: '#741748',
              color: '#FFFFFF',
              px: 1.5,
              py: 0.4,
              borderRadius: '3px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              mb: 0.5,
            }}
          >
            Chit Payment Receipt
          </Box>
          <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
            Receipt No: <span style={{ color: '#741748' }}>{receipt.receiptNumber}</span>
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
            Date: {receipt.receiptDate}
          </Typography>
        </Box>
      </Box>

      {/* 2. Customer & Scheme Identity Section */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
          py: 1.5,
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        {/* Customer Details Box */}
        <Box sx={{ p: 1.2, backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
          <Typography sx={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', mb: 0.5 }}>
            Customer Details
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
            {customer.name}
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#1E3A8A' }}>
            ID: {customer.chitCustomerId}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#475569' }}>
            Mobile: {customer.mobile}
          </Typography>
          {(customer.address || customer.city) && (
            <Typography sx={{ fontSize: '11.5px', color: '#64748B', mt: 0.2 }}>
              {[customer.address, customer.city].filter(Boolean).join(', ')}
            </Typography>
          )}
        </Box>

        {/* Scheme Details Box */}
        <Box sx={{ p: 1.2, backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
          <Typography sx={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', mb: 0.5 }}>
            Scheme Information
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#741748' }}>
            {scheme.schemeName}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, fontSize: '12px' }}>
            <span style={{ color: '#64748B' }}>Persons Enrolled:</span>
            <span style={{ fontWeight: 800, color: '#0F172A' }}>{scheme.personCount} Person(s)</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748B' }}>Rate / Person:</span>
            <span style={{ fontWeight: 600 }}>₹{scheme.monthlyAmountPerPerson?.toLocaleString('en-IN')} / mo</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748B' }}>Total Duration:</span>
            <span style={{ fontWeight: 600 }}>{scheme.duration} Months (₹{scheme.totalChitValue?.toLocaleString('en-IN')})</span>
          </Box>
        </Box>
      </Box>

      {/* 3. Installment & Payment Breakdown Table */}
      <Box sx={{ my: 1.5 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12.5px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1.5px solid #CBD5E1' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: '#1E293B', fontWeight: 800 }}>Description</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', color: '#1E293B', fontWeight: 800 }}>Due Date</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', color: '#1E293B', fontWeight: 800 }}>Monthly Due</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', color: '#1E293B', fontWeight: 800 }}>Paid Prior</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', color: '#059669', fontWeight: 800 }}>Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={{ padding: '10px', fontWeight: 700, color: '#0F172A' }}>
                {payment.paymentMonth}
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                  Installment #{payment.installmentNumber} of {scheme.duration}
                </div>
              </td>
              <td style={{ textAlign: 'center', padding: '10px', color: '#475569' }}>
                {payment.installmentDueDate || '-'}
              </td>
              <td style={{ textAlign: 'right', padding: '10px', fontWeight: 600 }}>
                ₹{payment.monthlyInstallmentAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td style={{ textAlign: 'right', padding: '10px', color: '#64748B' }}>
                ₹{payment.previouslyPaidAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td style={{ textAlign: 'right', padding: '10px', fontWeight: 900, color: '#059669', fontSize: '14px' }}>
                ₹{payment.currentPaymentAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </Box>

      {/* 4. Payment Details & Balance Summary Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1.3fr 1fr' },
          gap: 2,
          p: 1.5,
          backgroundColor: '#F8FAFC',
          borderRadius: '4px',
          border: '1px solid #E2E8F0',
          mb: 1.5,
        }}
      >
        {/* Left: Mode, Timing & Reference */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, fontSize: '12px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ color: '#64748B', minWidth: '105px' }}>Payment Mode:</span>
            <span style={{ fontWeight: 800, color: '#0F172A' }}>{payment.paymentMode}</span>
          </Box>
          {payment.transactionReference && payment.transactionReference !== '-' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ color: '#64748B', minWidth: '105px' }}>Transaction Ref:</span>
              <span style={{ fontWeight: 700, color: '#1E3A8A' }}>{payment.transactionReference}</span>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ color: '#64748B', minWidth: '105px' }}>Payment Timing:</span>
            <span
              style={{
                display: 'inline-block',
                padding: '1px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 800,
                color: timingColor,
                backgroundColor: timingBg,
                border: `1px solid ${timingColor}`,
              }}
            >
              {payment.paymentTimingStatus}
            </span>
          </Box>
          {payment.notes && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 0.5 }}>
              <span style={{ color: '#64748B', minWidth: '105px' }}>Remarks:</span>
              <span style={{ color: '#334155' }}>{payment.notes}</span>
            </Box>
          )}
        </Box>

        {/* Right: Balance Overview Box */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, fontSize: '12.5px', textAlign: 'right' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B' }}>Amount Received:</span>
            <span style={{ fontWeight: 900, color: '#059669', fontSize: '15px' }}>
              ₹{payment.currentPaymentAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', pt: 0.5 }}>
            <span style={{ color: '#64748B' }}>Month Balance Left:</span>
            <span style={{ fontWeight: 800, color: payment.remainingInstallmentBalance > 0 ? '#DC2626' : '#059669' }}>
              {payment.remainingInstallmentBalance > 0
                ? `₹${payment.remainingInstallmentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : 'NIL (Fully Cleared)'}
            </span>
          </Box>
        </Box>
      </Box>

      {/* 5. Footer / Signatures */}
      <Divider sx={{ my: 1.5 }} />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          pt: 1,
        }}
      >
        <Box sx={{ maxWidth: '380px' }}>
          <Typography sx={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
            * This is a computer-generated official receipt for chit scheme installment payment.
          </Typography>
          <Typography sx={{ fontSize: '11px', color: '#059669', fontWeight: 700, mt: 0.3 }}>
            Thank you for your timely payment!
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center', minWidth: '140px' }}>
          <Box sx={{ height: '32px' }} />
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#1E293B',
              borderTop: '1px solid #64748B',
              pt: 0.4,
            }}
          >
            Authorized Signature
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
