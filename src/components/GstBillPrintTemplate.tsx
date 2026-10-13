import React from 'react';
import { getStoredSettings } from './SettingsPage';
import { numberToIndianWords } from '../utils/numberToWords';
import { splitProductParticular } from './BillPrintTemplate';

export interface GstProductItem {
  particular: string;
  hsnCode?: string;
  quantity: string | number;
  pcs?: string | number;
  unit?: string;
  rate: string | number;
  discount?: string | number;
  taxableAmount?: string | number;
  gstRate?: string | number;
  cgst?: string | number;
  sgst?: string | number;
  igst?: string | number;
  amount: string | number;
  per?: string;
}

export interface GstBillPrintData {
  billNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerGst?: string;
  customerAadhar?: string;
  customerPan?: string;
  deliveryName?: string;
  deliveryPhone?: string;
  deliveryAddress?: string;
  deliveryGst?: string;
  deliveryAadhar?: string;
  customerState?: string;
  customerStateCode?: string;
  placeOfSupply?: string;
  reverseCharge?: string;
  vehicleNo?: string;
  ewayBillNo?: string;
  transport?: string;
  transportGstin?: string;
  dispatchFrom?: string;
  dispatchTo?: string;
  despatchFrom?: string;
  despatchTo?: string;
  lorryTransport?: string;
  lrNo?: string;
  lrDate?: string;
  caseCount?: string | number;
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyPincode?: string;
  companyState?: string;
  companyPhone?: string;
  companyWhatsapp?: string;
  gstin?: string;
  licNo?: string;
  hsnNo?: string;
  products: GstProductItem[];
  subtotal?: string | number;
  discount?: string | number;
  discountPercent?: string | number;
  packingCharges?: string | number;
  packingPercent?: string | number;
  taxableAmount?: string | number;
  taxType?: string;
  taxPercent?: string | number;
  cgstPercent?: string | number;
  cgstTotal?: string | number;
  sgstPercent?: string | number;
  sgstTotal?: string | number;
  igstPercent?: string | number;
  igstTotal?: string | number;
  roundOff?: string | number;
  netAmount?: string | number;
  total: string | number;
  previousTurnover?: string | number;
  thisBillTurnover?: string | number;
  totalTurnover?: string | number;
  paymentStatus?: string;
  paymentMode?: string;
  paidAmount?: string | number;
  invoiceCopy?: string;
}

interface GstBillPrintTemplateProps {
  bill: GstBillPrintData;
  copyLabel?: string;
}

export const formatCompanyAddressLines = (addr?: string): string[] => {
  const fallback = [
    '2/A13-14, SIVAKASI-VIRUDHUNAGAR MAIN ROAD,',
    'THIRUTHANGAL, SIVAKASI - 626130.',
  ];
  if (!addr || typeof addr !== 'string' || !addr.trim() || addr === 'false' || addr === 'true' || addr.toLowerCase().includes('rajivgandhi') || addr.toLowerCase().includes('67 - h/e')) {
    return fallback;
  }
  const clean = addr.trim();
  if (clean.includes('\n')) {
    const parts = clean.split('\n').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts;
  }
  const match = clean.match(/^(.*?(?:Sivakasi\s*-\s*Virudhunagar\s*Main\s*Road,?|Road,?))\s*(.+)$/i);
  if (match) {
    let line1 = match[1].trim();
    if (!line1.endsWith(',')) line1 += ',';
    const line2 = match[2].trim();
    return [line1, line2];
  }
  const commaIdx = clean.indexOf(',');
  if (commaIdx !== -1 && commaIdx < clean.length - 1) {
    const secondCommaIdx = clean.indexOf(',', commaIdx + 1);
    const splitPoint = secondCommaIdx !== -1 ? secondCommaIdx + 1 : commaIdx + 1;
    return [clean.slice(0, splitPoint).trim(), clean.slice(splitPoint).trim()];
  }
  return [clean];
};

export const formatCurrency = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatTurnover = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
  return num.toFixed(2);
};

export const GstBillPrintTemplate: React.FC<GstBillPrintTemplateProps> = ({ bill, copyLabel }) => {
  const [storeSettings, setStoreSettings] = React.useState(() => getStoredSettings());

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    window.addEventListener('svm_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('svm_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Company Details
  const companyNameLine1 =
    (storeSettings.companyName && typeof storeSettings.companyName === 'string' && storeSettings.companyName.trim() !== '' && storeSettings.companyName !== 'General' && storeSettings.companyName !== 'false'
      ? storeSettings.companyName.trim()
      : bill.companyName && typeof bill.companyName === 'string' && bill.companyName.trim() !== '' && bill.companyName !== 'General' && bill.companyName !== 'SVM Crackers' && bill.companyName !== 'false'
        ? bill.companyName.trim()
        : 'S.V.M FIREWORKS AGENCIES').toUpperCase();

  const companySubtitle = 'MANJULA TRADERS';
  const companyAddressLine1 = '2/A13-14, SIVAKASI-VIRUDHUNAGAR MAIN ROAD,';
  const companyAddressLine2 = 'THIRUTHANGAL, SIVAKASI - 626130.';

  const companyPhones =
    storeSettings.phone && storeSettings.phone.trim() !== ''
      ? storeSettings.phone
      : '+91 96292 85344, 97900 62612';

  const companyEmail =
    storeSettings.email && storeSettings.email.trim() !== ''
      ? storeSettings.email
      : 'crackersbazarsivakasi@gmail.com';

  const gstinNo = (storeSettings.gstin && typeof storeSettings.gstin === 'string' ? storeSettings.gstin : bill.gstin) || '33ADBFS7999E1ZO';
  const licNo = (storeSettings.licNo && typeof storeSettings.licNo === 'string' ? storeSettings.licNo : bill.licNo) || 'E/SS/TN/24/83 (E86652)';

  // Customer Details
  const customerDisplayName = (bill.customerName || '').trim();
  const customerAddressDisplay = (bill.customerAddress || bill.customerCity || '').trim();
  const customerPhoneDisplay = (bill.customerPhone || '').trim();
  const customerGstDisplay = (bill.customerGst && bill.customerGst !== 'N/A' && bill.customerGst !== '-')
    ? bill.customerGst.trim()
    : '';
  const customerAadharDisplay = (bill.customerAadhar && bill.customerAadhar !== 'N/A' && bill.customerAadhar !== '-')
    ? bill.customerAadhar.trim()
    : '';

  // Despatch / Transport Info
  const despatchToDisplay = (bill.despatchTo || bill.dispatchTo || customerAddressDisplay || '').trim();
  const lorryTransportDisplay = (bill.lorryTransport || (bill.transport && bill.transport !== '-' && bill.transport !== '0') ? (bill.lorryTransport || bill.transport) : '') || '';
  const lrNoDisplay = (bill.lrNo && bill.lrNo !== '-') ? bill.lrNo : '';
  const lrDateDisplay = (bill.lrDate && bill.lrDate !== '-') ? bill.lrDate : '';

  // Products
  const products = bill.products || [];
  const prodSubtotal = products.reduce((acc, p) => {
    const q = parseFloat(String(p.quantity || 0)) || 0;
    const r = parseFloat(String(p.rate || 0)) || 0;
    const amt = p.amount ? parseFloat(String(p.amount).replace(/,/g, '')) : q * r;
    return acc + amt;
  }, 0);
  const subtotal = prodSubtotal > 0 ? prodSubtotal : (parseFloat(String(bill.subtotal || bill.total || 0).replace(/,/g, '')) || 0);

  const totalQtyComputed = products.reduce((acc, p) => acc + (parseFloat(String(p.quantity || 0)) || 0), 0);
  const totalCasesDisplay = (bill.caseCount !== undefined && bill.caseCount !== '' && bill.caseCount !== '0')
    ? String(bill.caseCount)
    : (totalQtyComputed > 0 ? String(totalQtyComputed) : '1');

  // Discount calculation
  let discountPercent = '0.00';
  let discountAmount = 0;
  if (bill.discountPercent !== undefined && bill.discountPercent !== null && bill.discountPercent !== '') {
    const dPct = parseFloat(String(bill.discountPercent)) || 0;
    discountPercent = dPct.toFixed(2);
    discountAmount = (subtotal * dPct) / 100;
  } else if (bill.discount !== undefined && bill.discount !== null && bill.discount !== '') {
    const dVal = parseFloat(String(bill.discount).replace(/[^0-9.]/g, '')) || 0;
    if (String(bill.discount).includes('%') || (dVal > 0 && dVal <= 100 && !String(bill.discount).startsWith('₹'))) {
      discountPercent = dVal.toFixed(2);
      discountAmount = (subtotal * dVal) / 100;
    } else {
      discountAmount = dVal;
      discountPercent = subtotal > 0 ? ((discountAmount / subtotal) * 100).toFixed(2) : '0.00';
    }
  }

  // Packing & Forwarding (P & F CHGS)
  let packingPercent = '0.00';
  let packingAmount = 0;
  if (bill.packingPercent !== undefined && bill.packingPercent !== null && bill.packingPercent !== '') {
    const pPct = parseFloat(String(bill.packingPercent)) || 0;
    packingPercent = pPct.toFixed(2);
    packingAmount = (subtotal * pPct) / 100;
  } else if (bill.packingCharges !== undefined && bill.packingCharges !== null && bill.packingCharges !== '') {
    const pVal = parseFloat(String(bill.packingCharges).replace(/[^0-9.]/g, '')) || 0;
    if (String(bill.packingCharges).includes('%')) {
      packingPercent = pVal.toFixed(2);
      packingAmount = (subtotal * pVal) / 100;
    } else {
      packingAmount = pVal;
      packingPercent = subtotal > 0 ? ((packingAmount / subtotal) * 100).toFixed(2) : '0.00';
    }
  }

  // Tax calculations
  const taxableBase = Math.max(0, subtotal - discountAmount + packingAmount);
  const taxType = bill.taxType || (parseFloat(String(bill.igstTotal || 0)) > 0 ? 'IGST' : (parseFloat(String(bill.cgstTotal || 0)) > 0 ? 'CGST_SGST' : 'IGST'));
  const isIgst = taxType === 'IGST' || (parseFloat(String(bill.igstTotal || 0)) > 0 && parseFloat(String(bill.cgstTotal || 0)) === 0);

  let cgstPct = '0';
  let cgstAmt = 0;
  let sgstPct = '0';
  let sgstAmt = 0;
  let igstPct = '0';
  let igstAmt = 0;

  if (isIgst) {
    if (bill.igstPercent !== undefined && bill.igstPercent !== null && bill.igstPercent !== '') {
      igstPct = String(bill.igstPercent);
      igstAmt = (taxableBase * (parseFloat(igstPct) || 0)) / 100;
    } else if (bill.igstTotal !== undefined && bill.igstTotal !== null && bill.igstTotal !== '') {
      igstAmt = parseFloat(String(bill.igstTotal).replace(/,/g, '')) || 0;
      igstPct = taxableBase > 0 ? ((igstAmt / taxableBase) * 100).toFixed(0) : '18';
    } else if (bill.taxPercent !== undefined && bill.taxPercent !== null && bill.taxPercent !== '') {
      igstPct = String(bill.taxPercent);
      igstAmt = (taxableBase * (parseFloat(igstPct) || 0)) / 100;
    } else {
      igstPct = '18';
      igstAmt = (taxableBase * 18) / 100;
    }
  } else {
    if (bill.cgstPercent !== undefined && bill.cgstPercent !== null && bill.cgstPercent !== '') {
      cgstPct = String(bill.cgstPercent);
      cgstAmt = (taxableBase * (parseFloat(cgstPct) || 0)) / 100;
    } else if (bill.cgstTotal !== undefined && bill.cgstTotal !== null && bill.cgstTotal !== '') {
      cgstAmt = parseFloat(String(bill.cgstTotal).replace(/,/g, '')) || 0;
      cgstPct = taxableBase > 0 ? ((cgstAmt / taxableBase) * 100).toFixed(0) : '9';
    } else {
      cgstPct = '9';
      cgstAmt = (taxableBase * 9) / 100;
    }

    if (bill.sgstPercent !== undefined && bill.sgstPercent !== null && bill.sgstPercent !== '') {
      sgstPct = String(bill.sgstPercent);
      sgstAmt = (taxableBase * (parseFloat(sgstPct) || 0)) / 100;
    } else if (bill.sgstTotal !== undefined && bill.sgstTotal !== null && bill.sgstTotal !== '') {
      sgstAmt = parseFloat(String(bill.sgstTotal).replace(/,/g, '')) || 0;
      sgstPct = taxableBase > 0 ? ((sgstAmt / taxableBase) * 100).toFixed(0) : '9';
    } else {
      sgstPct = '9';
      sgstAmt = (taxableBase * 9) / 100;
    }
  }

  const taxSum = isIgst ? igstAmt : cgstAmt + sgstAmt;
  const netCalculated = taxableBase + taxSum;

  const rawTotalNum = parseFloat(String(bill.total || bill.netAmount || 0).replace(/,/g, '')) || 0;
  const grandTotalNum = rawTotalNum > 0 ? rawTotalNum : Math.round(netCalculated);

  const amountInWords = numberToIndianWords(Math.round(grandTotalNum));
  const wordsClean = amountInWords
    .replace(/\s*Rupees\s*/gi, ' ')
    .replace(/\s*Only\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Spacer calculation to push vertical lines down
  const spacerMinHeight = Math.max(30, (18 - products.length) * 22);

  return (
    <div
      className="gst-bill-container"
      style={{
        width: '100%',
        maxWidth: '794px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        boxSizing: 'border-box',
        fontSize: '11px',
      }}
    >
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 6mm;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #FFFFFF !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .gst-bill-container {
              width: 100% !important;
              max-width: none !important;
            }
            .gst-page-wrapper {
              page-break-after: always !important;
              break-after: page !important;
              box-shadow: none !important;
              margin-bottom: 0 !important;
            }
            .gst-page-wrapper:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          }
        `}
      </style>

      {/* Main Outer Box */}
      <div
        className="gst-page-wrapper"
        style={{
          border: '1px solid #000000',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Row 1: Company Header (Left 68%) | Contact & GSTIN / LIC (Right 32%) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderBottom: '1px solid #000000',
              minHeight: '76px',
            }}
          >
            {/* Left 68%: Company Details */}
            <div
              style={{
                width: '68%',
                borderRight: '1px solid #000000',
                textAlign: 'center',
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                  color: '#000000',
                }}
              >
                {companyNameLine1}
              </div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 800,
                  letterSpacing: '0.03em',
                  lineHeight: 1.25,
                  marginTop: '1px',
                  color: '#000000',
                }}
              >
                {companySubtitle}
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  lineHeight: 1.25,
                  marginTop: '2px',
                  color: '#000000',
                }}
              >
                {companyAddressLine1}
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: '#000000',
                }}
              >
                {companyAddressLine2}
              </div>
            </div>

            {/* Right 32%: Contact, GSTIN, LIC NO */}
            <div
              style={{
                width: '32%',
                padding: '6px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                fontSize: '10.5px',
                lineHeight: 1.45,
                color: '#000000',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                <span style={{ fontWeight: 600 }}>{companyPhones}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{companyEmail}</span>
              </div>
              <div style={{ marginTop: '2px', fontWeight: 700 }}>
                GSTIN : <span>{gstinNo}</span>
              </div>
              <div style={{ fontWeight: 700 }}>
                LIC NO : <span>{licNo}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Title Bar (TAX INVOICE) */}
          <div
            style={{
              borderBottom: '1px solid #000000',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 8px',
            }}
          >
            <div style={{ width: '80px' }}></div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  letterSpacing: '0.04em',
                }}
              >
                TAX INVOICE
              </span>
            </div>
            <div style={{ width: '80px', textAlign: 'right', fontSize: '10px', fontWeight: 700 }}>
              {bill.invoiceCopy || copyLabel || ''}
            </div>
          </div>

          {/* Row 3: Customer (To) (Left 63%) | Invoice No & Date (Right 37%) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderBottom: '1px solid #000000',
              fontSize: '11px',
            }}
          >
            {/* Left 63%: Customer (To) */}
            <div
              style={{
                width: '63%',
                borderRight: '1px solid #000000',
                padding: '4px 8px',
                lineHeight: 1.35,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    border: '1px solid #000000',
                    padding: '0.5px 4px',
                    fontWeight: 700,
                    fontSize: '11px',
                    marginRight: '8px',
                    lineHeight: 1.1,
                  }}
                >
                  To
                </span>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '11.5px' }}>
                  {customerDisplayName || 'CASH'}
                </span>
              </div>
              {customerAddressDisplay && (
                <div style={{ paddingLeft: '32px', textTransform: 'capitalize' }}>
                  {customerAddressDisplay}
                </div>
              )}
              {customerPhoneDisplay && (
                <div style={{ paddingLeft: '32px', fontWeight: 600 }}>
                  {customerPhoneDisplay}
                </div>
              )}
              {customerGstDisplay && (
                <div style={{ paddingLeft: '32px' }}>
                  GSTIN : <strong>{customerGstDisplay}</strong>
                </div>
              )}
              {customerAadharDisplay && (
                <div style={{ paddingLeft: '32px' }}>
                  Aadhar : <strong>{customerAadharDisplay}</strong>
                </div>
              )}
            </div>

            {/* Right 37%: Invoice No & Date */}
            <div
              style={{
                width: '37%',
                padding: '4px 12px',
                lineHeight: 1.45,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px' }}>
                <span style={{ fontWeight: 600 }}>Invoice No:</span>
                <span style={{ fontWeight: 700 }}>{bill.billNo || '202'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontWeight: 600 }}>Date :</span>
                <span style={{ fontWeight: 700 }}>{bill.date}</span>
              </div>
              {bill.placeOfSupply && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: '2px' }}>
                  <span style={{ fontWeight: 600 }}>Place of Supply:</span>
                  <span style={{ fontWeight: 600 }}>{bill.placeOfSupply}</span>
                </div>
              )}
              {bill.vehicleNo && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginTop: '2px' }}>
                  <span style={{ fontWeight: 600 }}>Vehicle No:</span>
                  <span style={{ fontWeight: 600 }}>{bill.vehicleNo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Products Table */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderBottom: '1px solid #000000',
              fontSize: '11px',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderBottom: '1px solid #000000',
                  height: '24px',
                }}
              >
                <th style={{ width: '6%', borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px' }}>S.No.</th>
                <th style={{ width: '38%', borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 8px' }}>Particulars</th>
                <th style={{ width: '9%', borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px' }}>HSN</th>
                <th style={{ width: '7%', borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px' }}>Qty</th>
                <th style={{ width: '8%', borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px' }}>Pcs</th>
                <th style={{ width: '11%', borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 4px' }}>Rate ₹</th>
                <th style={{ width: '8%', borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px' }}>Per</th>
                <th style={{ width: '13%', textAlign: 'center', padding: '3px 4px' }}>Total ₹</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr style={{ height: '22px', verticalAlign: 'middle' }}>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '2px 2px' }}>1</td>
                  <td style={{ borderRight: '1px solid #000000', padding: '2px 8px', fontWeight: 500 }}>ASSORTED CRACKERS</td>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '2px 2px' }}>3604</td>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'right', paddingRight: '8px' }}>1</td>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '2px 2px' }}>0</td>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'right', paddingRight: '8px' }}>2300.00</td>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '2px 2px' }}>Case</td>
                  <td style={{ textAlign: 'right', paddingRight: '8px' }}>2300.00</td>
                </tr>
              ) : (
                products.map((item, idx) => {
                  const qNum = parseFloat(String(item.quantity || 0)) || 0;
                  const rNum = parseFloat(String(item.rate || 0)) || 0;
                  const rowAmount = item.amount ? parseFloat(String(item.amount).replace(/,/g, '')) : qNum * rNum;
                  const unitDisplay = item.per || item.unit || 'Case';
                  const hsnDisplay = item.hsnCode || bill.hsnNo || '3604';
                  const { name: prodName, extra: prodExtra } = splitProductParticular(item.particular);

                  return (
                    <tr key={idx} style={{ height: '22px', verticalAlign: 'middle' }}>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '2px 2px', fontWeight: 500 }}>
                        {idx + 1}
                      </td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'left', padding: '2px 8px', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {prodExtra ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>{prodName}</span>
                            <span style={{ paddingLeft: '8px', color: '#000000' }}>{prodExtra}</span>
                          </div>
                        ) : (
                          <span>{prodName}</span>
                        )}
                      </td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '2px 2px' }}>
                        {hsnDisplay}
                      </td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'right', paddingRight: '8px', fontWeight: 700 }}>
                        {item.quantity}
                      </td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '2px 2px' }}>
                        {item.pcs || '0'}
                      </td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'right', paddingRight: '8px', fontWeight: 600 }}>
                        {formatCurrency(item.rate)}
                      </td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '2px 2px' }}>
                        {unitDisplay}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 600 }}>
                        {formatCurrency(rowAmount)}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Spacer rows */}
              {spacerMinHeight > 0 && (
                <tr style={{ height: `${spacerMinHeight}px` }}>
                  <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Row 5: Bottom Section: Transport Info (Left 63%) | Totals & Signatory (Right 37%) */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
          }}
        >
          <tbody>
            <tr>
              {/* Left Column: Transport Info & Amount in Words */}
              <td
                style={{
                  width: '63%',
                  borderRight: '1px solid #000000',
                  padding: '6px 8px',
                  verticalAlign: 'top',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '130px',
                    height: '100%',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '11px' }}>
                      <u>Transport Info</u>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', lineHeight: 1.45 }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '110px', padding: '1px 0' }}>Despatched To</td>
                          <td style={{ padding: '1px 0' }}>: &nbsp;<strong>{despatchToDisplay}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ padding: '1px 0' }}>Lorry Transport</td>
                          <td style={{ padding: '1px 0' }}>: &nbsp;<strong>{lorryTransportDisplay}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ padding: '1px 0' }}>LR No</td>
                          <td style={{ padding: '1px 0' }}>: &nbsp;<strong>{lrNoDisplay}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ padding: '1px 0' }}>Date</td>
                          <td style={{ padding: '1px 0' }}>: &nbsp;<strong>{lrDateDisplay}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ padding: '1px 0' }}>Total Cases</td>
                          <td style={{ padding: '1px 0' }}>: &nbsp;<strong>{totalCasesDisplay}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: '8px', paddingTop: '4px', fontSize: '11px' }}>
                    Rupees : &nbsp;<strong>{wordsClean}</strong>
                  </div>
                </div>
              </td>

              {/* Right Column: Calculations Table & Signatory */}
              <td
                style={{
                  width: '37%',
                  padding: 0,
                  verticalAlign: 'top',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <tbody>
                    <tr style={{ height: '22px' }}>
                      <td style={{ padding: '2px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000', width: '55%', fontWeight: 600 }}>
                        Sub Total
                      </td>
                      <td style={{ padding: '2px 8px', textAlign: 'right', borderBottom: '1px solid #000000', width: '45%', fontWeight: 600 }}>
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                    {discountAmount > 0 && (
                      <tr style={{ height: '22px' }}>
                        <td style={{ padding: '2px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000', fontWeight: 600 }}>
                          Less : Discount ({discountPercent}%)
                        </td>
                        <td style={{ padding: '2px 8px', textAlign: 'right', borderBottom: '1px solid #000000', fontWeight: 600 }}>
                          {formatCurrency(discountAmount)}
                        </td>
                      </tr>
                    )}
                    {packingAmount > 0 && (
                      <tr style={{ height: '22px' }}>
                        <td style={{ padding: '2px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000', fontWeight: 600 }}>
                          ADD : P &amp; F ({packingPercent}%)
                        </td>
                        <td style={{ padding: '2px 8px', textAlign: 'right', borderBottom: '1px solid #000000', fontWeight: 600 }}>
                          {formatCurrency(packingAmount)}
                        </td>
                      </tr>
                    )}
                    <tr style={{ height: '22px' }}>
                      <td style={{ padding: '2px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000', fontWeight: 600 }}>
                        CGST - {cgstPct}%
                      </td>
                      <td style={{ padding: '2px 8px', textAlign: 'right', borderBottom: '1px solid #000000', fontWeight: 600 }}>
                        {formatCurrency(cgstAmt)}
                      </td>
                    </tr>
                    <tr style={{ height: '22px' }}>
                      <td style={{ padding: '2px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000', fontWeight: 600 }}>
                        SGST - {sgstPct}%
                      </td>
                      <td style={{ padding: '2px 8px', textAlign: 'right', borderBottom: '1px solid #000000', fontWeight: 600 }}>
                        {formatCurrency(sgstAmt)}
                      </td>
                    </tr>
                    <tr style={{ height: '22px' }}>
                      <td style={{ padding: '2px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000', fontWeight: 600 }}>
                        IGST - {igstPct}%
                      </td>
                      <td style={{ padding: '2px 8px', textAlign: 'right', borderBottom: '1px solid #000000', fontWeight: 600 }}>
                        {formatCurrency(igstAmt)}
                      </td>
                    </tr>
                    <tr style={{ height: '26px' }}>
                      <td
                        style={{
                          padding: '3px 8px',
                          borderBottom: '1px solid #000000',
                          borderRight: '1px solid #000000',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        Net Amount
                      </td>
                      <td
                        style={{
                          padding: '3px 8px',
                          textAlign: 'right',
                          borderBottom: '1px solid #000000',
                          fontWeight: 800,
                          fontSize: '14px',
                        }}
                      >
                        {formatCurrency(grandTotalNum)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* For Company Name & Signature space */}
                <div style={{ padding: '4px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'none' }}>
                    For {companyNameLine1}
                  </div>
                  <div style={{ height: '32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    {/* Space for signature */}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
