import React from 'react';
import { getStoredSettings } from './SettingsPage';
import { numberToIndianWords } from '../utils/numberToWords';

export interface BillPrintProduct {
  code?: string | number;
  particular: string;
  quantity: string | number;
  rate: string | number;
  pktUnit?: string;
  content?: string | number;
  amount?: string | number;
  per?: string;
}

export interface BillPrintData {
  billNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerGst?: string;
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyPincode?: string;
  companyState?: string;
  companyPhone?: string;
  companyWhatsapp?: string;
  logoUrl?: string;
  products: BillPrintProduct[];
  subtotal?: string | number;
  discount?: string | number;
  discountPercent?: string | number;
  packing?: string | number;
  packingCharges?: string | number;
  packingPercent?: string | number;
  tax?: string | number;
  amount?: string | number;
  total?: string | number;
  transport?: string;
  caseCount?: string | number;
  paymentMode?: string;
  paymentStatus?: string;
  paidAmount?: string | number;
  rateType?: string;
  notes?: string;
  pdfData?: string;
  pdfUrl?: string;
  isEstimate?: boolean;
  title?: string;
  invoiceTitle?: string;
}

interface BillPrintTemplateProps {
  bill: BillPrintData;
  copyLabel?: string;
}

export const formatCurrency = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatBillDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  const ymd = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    return `${ymd[3].padStart(2, '0')}-${ymd[2].padStart(2, '0')}-${ymd[1]}`;
  }
  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    return `${dmy[1].padStart(2, '0')}-${dmy[2].padStart(2, '0')}-${dmy[3]}`;
  }
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  }
  return clean;
};

export const numberToWordsClean = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num) || num === 0) return 'Zero';
  const full = numberToIndianWords(Math.round(num));
  return full
    .replace(/\s*Rupees\s*/gi, ' ')
    .replace(/\s*Only\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const DEFAULT_CRACKER_CODES: Record<string, string> = {
  'ground chakkar big': '7',
  'ground chakkar special': '8',
  'flower pot big': '15',
  'flower pot special': '16',
  "4' twinkling star": '22',
  "4' twingling star": '22',
  "1.5' twinkling star": '20',
  "1.5' twingling star": '20',
  'red bijili': '27',
  'stripped bijili': '28',
  'kuruvi cracker': '5',
  'kuruvi crackers': '5',
  '3.5" laxmi': '6',
  'bullet bomb': '23',
  'marathon bomb': '25',
  'mini siren': '94',
  'golden rain': '40',
  'golden rain ( 5 pcs )': '40',
  'top spin': '92',
  'top spin (pamparam)': '92',
  'butterfly': '93',
  'serpent egg sony': '122',
  'annam 5 in 1': '101',
  'photo flash': '158',
  'kit kat': '91',
  'cocktail tri color': '11',
  'cocktail tri color ( ayyan )': '11',
  'color stone': '90',
  'tin fountain': '38',
  '100 lar': '147',
  'selfie stick': '30',
  'ultra pencil': '31',
  '7 shot': '137',
  'chotta': '61',
  'pogo': '62',
  'pogo ( ayyan )': '62',
  '2" pipe': '65',
  '1 k': '148',
  '12 cm crackling': '106',
  '12 cm electrick': '105',
  '12 cm green': '107',
  '12 cm red': '108',
  '24 deluxe': '144',
  '30 shots': '79',
  '2" pipe ( 3 pcs )': '66',
  '12 shot raider': '75',
  'money bank 3 pcs': '177',
  '4" cracker': '4',
  '4" gold laxmi': '1',
  '4" gold ganesh': '1',
  '2" sower': '44',
  '2" sower ( 5 verity )': '44',
  'helicopter': '96',
  'helicopter ( ayyan )': '96',
  '15 cm crackling': '110',
  'rocket bomp': '120',
  'traffic signal': '140',
  '3.5" pipe': '71',
  '3.5" pipe (ajanta )': '71',
  '30 cm green': '115',
  'wire chakkar': '14',
  'color smoke': '37',
  'special edition': '50',
  'special edition ( 2 pcs )': '50',
};

export const getProductCode = (item: BillPrintProduct): string => {
  if (item.code !== undefined && item.code !== null && String(item.code).trim() !== '') {
    return String(item.code).trim();
  }
  const cleanName = (item.particular || '').toLowerCase().trim();
  if (DEFAULT_CRACKER_CODES[cleanName]) {
    return DEFAULT_CRACKER_CODES[cleanName];
  }
  const noParens = cleanName.replace(/\(.*?\)/g, '').trim();
  if (DEFAULT_CRACKER_CODES[noParens]) {
    return DEFAULT_CRACKER_CODES[noParens];
  }
  return '';
};

export const splitProductParticular = (particular: string): { name: string; extra: string } => {
  if (!particular) return { name: '', extra: '' };
  const clean = particular.trim();
  const matchParen = clean.match(/^(.*?)\s*(\([^)]{1,25}\))\s*$/);
  if (matchParen && matchParen[1].trim()) {
    return { name: matchParen[1].trim(), extra: matchParen[2].trim() };
  }
  const matchSony = clean.match(/^(.*?)\s+(Sony)$/i);
  if (matchSony) {
    return { name: matchSony[1].trim(), extra: matchSony[2].trim() };
  }
  return { name: clean, extra: '' };
};

export const splitRateAndContent = (item: BillPrintProduct): { rate: string; content: string } => {
  const rNum = parseFloat(String(item.rate || 0).replace(/,/g, '')) || 0;
  const rateStr = Number.isInteger(rNum) ? String(rNum) : rNum.toFixed(2);
  let content = item.content || item.per;
  if (!content && item.pktUnit && !isNaN(Number(item.pktUnit))) {
    content = item.pktUnit;
  }
  if (!content) {
    content = '1';
  }
  return { rate: rateStr, content: String(content).trim() };
};

export const formatRateAndContent = (item: BillPrintProduct): string => {
  const { rate, content } = splitRateAndContent(item);
  return `${rate} / ${content}`;
};

export const paginateProducts = (products: BillPrintProduct[]): BillPrintProduct[][] => {
  if (products.length === 0) return [[]];
  if (products.length <= 28) {
    return [products];
  }
  const pages: BillPrintProduct[][] = [];
  pages.push(products.slice(0, 35));
  let currentIndex = 35;
  while (currentIndex < products.length) {
    const remaining = products.length - currentIndex;
    if (remaining <= 30) {
      pages.push(products.slice(currentIndex, currentIndex + remaining));
      currentIndex += remaining;
    } else {
      pages.push(products.slice(currentIndex, currentIndex + 35));
      currentIndex += 35;
    }
  }
  return pages;
};

export const BillPrintTemplate: React.FC<BillPrintTemplateProps> = ({ bill }) => {
  const [storeSettings, setStoreSettings] = React.useState(() => getStoredSettings());

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Header Details
  const companyNameLine1 =
    (storeSettings.companyName && storeSettings.companyName !== 'General' && storeSettings.companyName !== 'false'
      ? storeSettings.companyName
      : bill.companyName && bill.companyName !== 'General' && bill.companyName !== 'false'
      ? bill.companyName
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

  // Subtotal Calculation
  const products = bill.products || [];
  const prodSubtotal = products.reduce((acc, p) => {
    const q = parseFloat(String(p.quantity || 0)) || 0;
    const r = parseFloat(String(p.rate || 0)) || 0;
    const amt = p.amount ? parseFloat(String(p.amount).replace(/,/g, '')) : q * r;
    return acc + amt;
  }, 0);
  const subtotal =
    prodSubtotal > 0
      ? prodSubtotal
      : parseFloat(String(bill.subtotal || bill.amount || bill.total || 0).replace(/,/g, '')) || 0;

  // Discount Calculation
  let discountPercent = '0';
  let discountAmount = 0;
  if (bill.discountPercent !== undefined && bill.discountPercent !== null && bill.discountPercent !== '') {
    const dPct = parseFloat(String(bill.discountPercent)) || 0;
    discountPercent = Number.isInteger(dPct) ? String(dPct) : dPct.toFixed(2);
    discountAmount = (subtotal * dPct) / 100;
  } else if (bill.discount !== undefined && bill.discount !== null && bill.discount !== '') {
    const rawDisc = String(bill.discount).trim();
    const dVal = parseFloat(rawDisc.replace(/[^0-9.]/g, '')) || 0;
    if (rawDisc.includes('%') || (dVal > 0 && dVal <= 100 && !rawDisc.startsWith('₹'))) {
      discountPercent = Number.isInteger(dVal) ? String(dVal) : dVal.toFixed(2);
      discountAmount = (subtotal * dVal) / 100;
    } else {
      discountAmount = dVal;
      const pct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
      discountPercent = Number.isInteger(pct) ? String(pct) : pct.toFixed(0);
    }
  }

  // Packing Calculation
  let packingPercent = '0';
  let packingAmount = 0;
  if (bill.packingPercent !== undefined && bill.packingPercent !== null && bill.packingPercent !== '') {
    const pPct = parseFloat(String(bill.packingPercent)) || 0;
    packingPercent = Number.isInteger(pPct) ? String(pPct) : pPct.toFixed(2);
    packingAmount = (subtotal * pPct) / 100;
  } else if (
    (bill.packingCharges !== undefined && bill.packingCharges !== null && bill.packingCharges !== '') ||
    (bill.packing !== undefined && bill.packing !== null && bill.packing !== '')
  ) {
    const rawPack = String(bill.packingCharges ?? bill.packing).trim();
    const pVal = parseFloat(rawPack.replace(/[^0-9.]/g, '')) || 0;
    if (rawPack.includes('%')) {
      packingPercent = Number.isInteger(pVal) ? String(pVal) : pVal.toFixed(2);
      packingAmount = (subtotal * pVal) / 100;
    } else {
      packingAmount = pVal;
      const pct = subtotal > 0 ? (packingAmount / subtotal) * 100 : 0;
      packingPercent = Number.isInteger(pct) ? String(pct) : pct.toFixed(0);
    }
  }

  // Net Amount
  const netCalculated = Math.max(0, subtotal - discountAmount + packingAmount);
  const rawTotalNum = parseFloat(String(bill.total || 0).replace(/,/g, '')) || 0;
  const grandTotalNum = rawTotalNum > 0 ? rawTotalNum : Math.round(netCalculated);

  const formattedDate = formatBillDate(bill.date);
  const invoiceTitle = bill.invoiceTitle || bill.title || (bill.isEstimate ? 'Estimate' : 'Estimate');

  // Paginate items to guarantee exact match with photo
  const pages = paginateProducts(products);

  return (
    <div
      className="svm-bill-print-container"
      style={{
        width: '100%',
        maxWidth: '794px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        boxSizing: 'border-box',
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
            .svm-bill-print-container {
              width: 100% !important;
              max-width: none !important;
            }
            .svm-page-wrapper {
              page-break-after: always !important;
              break-after: page !important;
              box-shadow: none !important;
              margin-bottom: 0 !important;
            }
            .svm-page-wrapper:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          }
        `}
      </style>

      {pages.map((pageProducts, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === pages.length - 1;
        const startItemIndex = pageIdx === 0 ? 0 : 35 + (pageIdx - 1) * 35;
        const pageNumber = pageIdx + 1;

        // Dynamic spacer calculation to push vertical lines down
        const targetPageItems = isLastPage ? 28 : 35;
        const spacerHeight = Math.max(16, (targetPageItems - pageProducts.length) * 22);

        return (
          <div
            key={pageIdx}
            className="svm-page-wrapper"
            style={{
              position: 'relative',
              boxSizing: 'border-box',
              marginBottom: pageIdx < pages.length - 1 ? '32px' : '0',
              paddingBottom: '22px',
            }}
          >
            {/* Outer Box Enclosing Entire Bill */}
            <div
              style={{
                border: '1px solid #000000',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
              }}
            >
              {/* Header: Company (Left 70%) | Contacts (Right 30%) - Only on Page 1 */}
              {isFirstPage && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      borderBottom: '1px solid #000000',
                      minHeight: '76px',
                    }}
                  >
                    {/* Left 70%: Company Details */}
                    <div
                      style={{
                        width: '70%',
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

                    {/* Right 30%: Contact Information */}
                    <div
                      style={{
                        width: '30%',
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '4px',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                        <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>
                          {companyEmail}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Title Bar: Estimate */}
                  <div
                    style={{
                      borderBottom: '1px solid #000000',
                      textAlign: 'center',
                      padding: '2px 0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {invoiceTitle}
                    </span>
                  </div>

                  {/* Info Row: To (Left 65%) | Estimate No & Date (Right 35%) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      borderBottom: '1px solid #000000',
                      fontSize: '11px',
                    }}
                  >
                    {/* Left: To */}
                    <div
                      style={{
                        width: '65%',
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
                          {bill.customerName || 'CASH'}
                        </span>
                      </div>
                      {(bill.customerAddress || bill.customerCity) && (
                        <div style={{ paddingLeft: '32px', textTransform: 'capitalize' }}>
                          {bill.customerAddress || bill.customerCity}
                        </div>
                      )}
                      {bill.customerPhone && (
                        <div style={{ paddingLeft: '32px', fontWeight: 600 }}>
                          {bill.customerPhone}
                        </div>
                      )}
                    </div>

                    {/* Right: Estimate No & Date */}
                    <div
                      style={{
                        width: '35%',
                        padding: '4px 12px',
                        lineHeight: 1.45,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>Estimate No:</span>
                        <span style={{ fontWeight: 700 }}>{bill.billNo || '1'}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-start',
                          gap: '8px',
                          marginTop: '2px',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Date :</span>
                        <span style={{ fontWeight: 700 }}>{formattedDate}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Products Table */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11px',
                  backgroundColor: '#FFFFFF',
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid #000000',
                      height: '24px',
                      backgroundColor: '#FFFFFF',
                      color: '#000000',
                    }}
                  >
                    <th
                      style={{
                        width: '6%',
                        borderRight: '1px solid #000000',
                        textAlign: 'center',
                        padding: '3px 2px',
                        fontWeight: 700,
                      }}
                    >
                      S.No.
                    </th>
                    <th
                      style={{
                        width: '7%',
                        borderRight: '1px solid #000000',
                        textAlign: 'center',
                        padding: '3px 2px',
                        fontWeight: 700,
                      }}
                    >
                      Code
                    </th>
                    <th
                      style={{
                        width: '49%',
                        borderRight: '1px solid #000000',
                        textAlign: 'center',
                        padding: '3px 8px',
                        fontWeight: 700,
                      }}
                    >
                      Product
                    </th>
                    <th
                      style={{
                        width: '6%',
                        borderRight: '1px solid #000000',
                        textAlign: 'center',
                        padding: '3px 2px',
                        fontWeight: 700,
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        width: '18%',
                        borderRight: '1px solid #000000',
                        textAlign: 'center',
                        padding: '3px 4px',
                        fontWeight: 700,
                      }}
                    >
                      Rate (Rs.) / Content
                    </th>
                    <th
                      style={{
                        width: '14%',
                        textAlign: 'center',
                        padding: '3px 4px',
                        fontWeight: 700,
                      }}
                    >
                      Total ₹
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pageProducts.map((item, idx) => {
                    const rowSNo = startItemIndex + idx + 1;
                    const codeDisplay = getProductCode(item);
                    const { rate, content } = splitRateAndContent(item);
                    const { name: prodName, extra: prodExtra } = splitProductParticular(item.particular);
                    const qNum = parseFloat(String(item.quantity || 0)) || 0;
                    const rNum = parseFloat(String(item.rate || 0)) || 0;
                    const rowAmount = item.amount
                      ? parseFloat(String(item.amount).replace(/,/g, ''))
                      : qNum * rNum;

                    return (
                      <tr
                        key={idx}
                        style={{
                          height: '22px',
                          verticalAlign: 'middle',
                        }}
                      >
                        {/* 1. S.No. */}
                        <td
                          style={{
                            borderRight: '1px solid #000000',
                            textAlign: 'center',
                            padding: '2px 2px',
                            fontWeight: 500,
                          }}
                        >
                          {rowSNo}
                        </td>

                        {/* 2. Code */}
                        <td
                          style={{
                            borderRight: '1px solid #000000',
                            textAlign: 'center',
                            padding: '2px 2px',
                            fontWeight: 600,
                          }}
                        >
                          {codeDisplay}
                        </td>

                        {/* 3. Product */}
                        <td
                          style={{
                            borderRight: '1px solid #000000',
                            textAlign: 'left',
                            padding: '2px 8px',
                            fontWeight: 500,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {prodExtra ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <span>{prodName}</span>
                              <span style={{ paddingLeft: '8px', color: '#000000' }}>{prodExtra}</span>
                            </div>
                          ) : (
                            <span>{prodName}</span>
                          )}
                        </td>

                        {/* 4. Qty */}
                        <td
                          style={{
                            borderRight: '1px solid #000000',
                            textAlign: 'right',
                            paddingRight: '10px',
                            fontWeight: 700,
                          }}
                        >
                          {item.quantity}
                        </td>

                        {/* 5. Rate (Rs.) / Content */}
                        <td
                          style={{
                            borderRight: '1px solid #000000',
                            padding: '2px 0',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                            <span style={{ width: '48%', textAlign: 'right', paddingRight: '4px', fontWeight: 600 }}>
                              {rate}
                            </span>
                            <span style={{ width: '52%', textAlign: 'left', paddingLeft: '4px', fontWeight: 600 }}>
                              / {content}
                            </span>
                          </div>
                        </td>

                        {/* 6. Total ₹ */}
                        <td
                          style={{
                            textAlign: 'right',
                            paddingRight: '10px',
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(rowAmount)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Spacer to push table down and keep vertical borders running */}
                  {spacerHeight > 0 && (
                    <tr style={{ height: `${spacerHeight}px` }}>
                      <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  )}

                  {/* Totals Summary Footer (Printed ONLY on the Last Page) */}
                  {isLastPage && (
                    <>
                      {/* Row 1: Sub Total */}
                      <tr style={{ height: '24px', borderTop: '1px solid #000000' }}>
                        {/* Cols 1, 2, 3, 4: Empty space spanning S.No., Code, Product, Qty */}
                        <td
                          colSpan={4}
                          rowSpan={4}
                          style={{
                            borderRight: '1px solid #000000',
                          }}
                        >
                          &nbsp;
                        </td>

                        {/* Col 5: Sub Total Label */}
                        <td
                          style={{
                            borderRight: '1px solid #000000',
                            borderBottom: '1px solid #000000',
                            textAlign: 'center',
                            fontWeight: 600,
                            padding: '2px 4px',
                            fontSize: '11px',
                          }}
                        >
                          Sub Total
                        </td>

                        {/* Col 6: Sub Total Amount */}
                        <td
                          style={{
                            borderBottom: '1px solid #000000',
                            textAlign: 'right',
                            fontWeight: 600,
                            paddingRight: '10px',
                            fontSize: '11px',
                          }}
                        >
                          {formatCurrency(subtotal)}
                        </td>
                      </tr>

                      {/* Row 2: Discount */}
                      <tr style={{ height: '24px' }}>
                        <td
                          style={{
                            borderRight: '1px solid #000000',
                            borderBottom: '1px solid #000000',
                            textAlign: 'center',
                            fontWeight: 600,
                            padding: '2px 4px',
                            fontSize: '11px',
                          }}
                        >
                          Discount ({discountPercent}%)
                        </td>
                        <td
                          style={{
                            borderBottom: '1px solid #000000',
                            textAlign: 'right',
                            fontWeight: 600,
                            paddingRight: '10px',
                            fontSize: '11px',
                          }}
                        >
                          {formatCurrency(discountAmount)}
                        </td>
                      </tr>

                      {/* Row 3: Packing */}
                      <tr style={{ height: '24px' }}>
                        <td
                          style={{
                            borderRight: '1px solid #000000',
                            borderBottom: '1px solid #000000',
                            textAlign: 'center',
                            fontWeight: 600,
                            padding: '2px 4px',
                            fontSize: '11px',
                          }}
                        >
                          Packing ({packingPercent}%)
                        </td>
                        <td
                          style={{
                            borderBottom: '1px solid #000000',
                            textAlign: 'right',
                            fontWeight: 600,
                            paddingRight: '10px',
                            fontSize: '11px',
                          }}
                        >
                          {formatCurrency(packingAmount)}
                        </td>
                      </tr>

                      {/* Row 4: Net Amount */}
                      <tr style={{ height: '26px' }}>
                        <td
                          style={{
                            borderRight: '1px solid #000000',
                            textAlign: 'center',
                            fontWeight: 700,
                            padding: '2px 4px',
                            fontSize: '12px',
                          }}
                        >
                          Net Amount
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            fontSize: '14px',
                            paddingRight: '10px',
                          }}
                        >
                          {formatCurrency(grandTotalNum)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Right Page Number (e.g. 1, 2) */}
            <div
              style={{
                position: 'absolute',
                right: '4px',
                bottom: '2px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#000000',
              }}
            >
              {pageNumber}
            </div>
          </div>
        );
      })}
    </div>
  );
};
