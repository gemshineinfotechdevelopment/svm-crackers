import React from 'react';
import { getStoredSettings } from './SettingsPage';
import { numberToIndianWords } from '../utils/numberToWords';

export interface GstProductItem {
  particular: string;
  hsnCode?: string;
  quantity: string | number;
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
    'No. 2/A13 & 2/A14, Sivakasi - Virudhunagar Road,',
    'Keela Thiruthangal - 626 130. Tamil Nadu',
  ];
  if (!addr || typeof addr !== 'string' || !addr.trim() || addr === 'false' || addr === 'true' || addr.toLowerCase().includes('rajivgandhi') || addr.toLowerCase().includes('67 - h/e')) {
    return fallback;
  }
  const clean = addr.trim();
  if (clean.includes('\n')) {
    const parts = clean.split('\n').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts;
  }
  const match = clean.match(/^(.*?(?:Sivakasi\s*-\s*Virudhunagar\s*Road,?|Road,?))\s*(.+)$/i);
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

export const GstBillPrintTemplate: React.FC<GstBillPrintTemplateProps> = ({ bill }) => {
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

  // Display Company Name from Settings / Bill
  const displayCompanyName =
    storeSettings.companyName && typeof storeSettings.companyName === 'string' && storeSettings.companyName.trim() !== '' && storeSettings.companyName !== 'General' && storeSettings.companyName !== 'false'
      ? storeSettings.companyName.trim()
      : bill.companyName && typeof bill.companyName === 'string' && bill.companyName.trim() !== '' && bill.companyName !== 'General' && bill.companyName !== 'SVM Crackers' && bill.companyName !== 'false'
        ? bill.companyName.trim()
        : 'S.V.M Fireworks Agencies';

  // GSTIN & License No
  const gstinNo = (storeSettings.gstin && typeof storeSettings.gstin === 'string' ? storeSettings.gstin : bill.gstin) || '33ADBFS7999E1ZO';
  const licNo = (storeSettings.licNo && typeof storeSettings.licNo === 'string' ? storeSettings.licNo : bill.licNo) || 'E/SS/TN/24/83 (E86652)';

  // Company Address from Settings / Bill
  const companyAddressLines = formatCompanyAddressLines(
    storeSettings.address && typeof storeSettings.address === 'string' && storeSettings.address !== 'false'
      ? storeSettings.address
      : bill.companyAddress
  );

  // Customer Details
  const customerDisplayName = (bill.customerName || '').trim();
  const customerAddressDisplay = (bill.customerAddress || bill.customerCity || '').trim();
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

  // Total cases computed / provided
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
    const iRate = bill.igstPercent !== undefined && bill.igstPercent !== null && bill.igstPercent !== ''
      ? parseFloat(String(bill.igstPercent))
      : (bill.taxPercent ? parseFloat(String(bill.taxPercent)) : 18);
    igstPct = String(iRate);
    igstAmt = parseFloat(String(bill.igstTotal !== undefined ? bill.igstTotal : 0)) || (taxableBase * iRate) / 100;
    cgstPct = '0';
    cgstAmt = 0;
    sgstPct = '0';
    sgstAmt = 0;
  } else {
    const cRate = bill.cgstPercent !== undefined && bill.cgstPercent !== null && bill.cgstPercent !== ''
      ? parseFloat(String(bill.cgstPercent))
      : (bill.taxPercent ? parseFloat(String(bill.taxPercent)) / 2 : 9);
    const sRate = bill.sgstPercent !== undefined && bill.sgstPercent !== null && bill.sgstPercent !== ''
      ? parseFloat(String(bill.sgstPercent))
      : (bill.taxPercent ? parseFloat(String(bill.taxPercent)) / 2 : 9);
    cgstPct = String(cRate);
    cgstAmt = parseFloat(String(bill.cgstTotal !== undefined ? bill.cgstTotal : 0)) || (taxableBase * cRate) / 100;
    sgstPct = String(sRate);
    sgstAmt = parseFloat(String(bill.sgstTotal !== undefined ? bill.sgstTotal : 0)) || (taxableBase * sRate) / 100;
    igstPct = '0';
    igstAmt = 0;
  }

  const totalTaxAmount = isIgst ? igstAmt : (cgstAmt + sgstAmt);
  const netAmountExact = taxableBase + totalTaxAmount;

  // Grand Total & Round Off
  const rawTotalNum = parseFloat(String(bill.netAmount || bill.total || 0).replace(/,/g, '')) || 0;
  const grandTotalNum = rawTotalNum > 0 ? rawTotalNum : Math.round(netAmountExact);

  // Amount in Words
  const rawWords = numberToIndianWords(grandTotalNum);
  const wordsClean = rawWords
    .replace(/\s*Rupees\s*/i, ' ')
    .replace(/\s*Only\s*/i, '')
    .trim();

  // Dynamic spacer height to keep continuous vertical table grid lines running down
  const spacerMinHeight = Math.max(80, 460 - products.length * 26);

  return (
    <div
      className="gst-bill-print-wrapper"
      style={{
        width: '100%',
        maxWidth: '820px',
        minHeight: '280mm',
        margin: '0 auto',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        boxSizing: 'border-box',
        padding: '6px 8px',
        fontSize: '11.5px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Centered Top Title */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '6px',
        }}
      >
        <u
          style={{
            fontSize: '14px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#000000',
          }}
        >
          TAX INVOICE
        </u>
      </div>

      {/* Main Bordered Bill Container */}
      <div
        className="bill-box"
        style={{
          border: '1.5px solid #000000',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Row 1: Company Header (Left) | GSTIN & LIC NO (Right) */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderBottom: '1.5px solid #000000',
              fontSize: '11.5px',
            }}
          >
            <tbody>
              <tr>
                {/* Left Column: Company Name & Address */}
                <td
                  style={{
                    width: '63%',
                    padding: '8px 10px',
                    verticalAlign: 'middle',
                    borderRight: '1.5px solid #000000',
                  }}
                >
                  <div
                    style={{
                      fontSize: '17px',
                      fontWeight: 800,
                      color: '#000000',
                      marginBottom: '3px',
                      lineHeight: 1.2,
                    }}
                  >
                    {displayCompanyName}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#000000',
                      lineHeight: 1.35,
                    }}
                  >
                    {companyAddressLines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </td>

                {/* Right Column: GSTIN & LIC NO */}
                <td
                  style={{
                    width: '37%',
                    padding: '8px 10px',
                    verticalAlign: 'middle',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#000000', marginBottom: '2px' }}>
                    GSTIN &nbsp;: &nbsp;<strong>{gstinNo}</strong>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#000000' }}>
                    LIC NO &nbsp;: &nbsp;<strong>{licNo}</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Row 2: Customer (To) (Left) | Invoice No & Date (Right) */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderBottom: '1.5px solid #000000',
              fontSize: '11.5px',
            }}
          >
            <tbody>
              <tr>
                {/* Left Column: Customer (To) */}
                <td
                  style={{
                    width: '63%',
                    padding: '6px 10px',
                    verticalAlign: 'top',
                    borderRight: '1.5px solid #000000',
                    lineHeight: 1.38,
                  }}
                >
                  <div style={{ fontSize: '11.5px', marginBottom: '2px' }}>To</div>
                  <div style={{ paddingLeft: '14px' }}>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>
                      {customerDisplayName}
                    </div>
                    {customerAddressDisplay ? (
                      <div>{customerAddressDisplay}</div>
                    ) : null}
                    <div>
                      GSTIN : {customerGstDisplay}
                    </div>
                    <div>
                      Aadhar : {customerAadharDisplay}
                    </div>
                  </div>
                </td>

                {/* Right Column: Invoice No & Date */}
                <td
                  style={{
                    width: '37%',
                    padding: '8px 10px',
                    verticalAlign: 'top',
                    lineHeight: 1.65,
                    fontSize: '12px',
                  }}
                >
                  <div>
                    Invoice No &nbsp;: &nbsp;<strong>{bill.billNo || '202'}</strong>
                  </div>
                  <div>
                    Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;<strong>{bill.date}</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Row 3: Products Table with Continuous Vertical Lines */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderBottom: '1.5px solid #000000',
              fontSize: '11.5px',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  borderBottom: '1px solid #000000',
                }}
              >
                <th
                  style={{
                    width: '6%',
                    borderRight: '1px solid #000000',
                    padding: '4px 2px',
                    textAlign: 'center',
                  }}
                >
                  S.No.
                </th>
                <th
                  style={{
                    width: '44%',
                    borderRight: '1px solid #000000',
                    padding: '4px 8px',
                    textAlign: 'center',
                  }}
                >
                  Particulars
                </th>
                <th
                  style={{
                    width: '10%',
                    borderRight: '1px solid #000000',
                    padding: '4px 2px',
                    textAlign: 'center',
                  }}
                >
                  HSN
                </th>
                <th
                  style={{
                    width: '8%',
                    borderRight: '1px solid #000000',
                    padding: '4px 2px',
                    textAlign: 'center',
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    width: '12%',
                    borderRight: '1px solid #000000',
                    padding: '4px 6px',
                    textAlign: 'center',
                  }}
                >
                  Rate ₹
                </th>
                <th
                  style={{
                    width: '8%',
                    borderRight: '1px solid #000000',
                    padding: '4px 2px',
                    textAlign: 'center',
                  }}
                >
                  Per
                </th>
                <th
                  style={{
                    width: '12%',
                    padding: '4px 6px',
                    textAlign: 'center',
                  }}
                >
                  Total ₹
                </th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr style={{ verticalAlign: 'top' }}>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '4px 2px' }}>1</td>
                  <td style={{ borderRight: '1px solid #000000', padding: '4px 8px', fontWeight: 500 }}>ASSORTED CRACKERS</td>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '4px 2px' }}>3604</td>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '4px 2px' }}>1</td>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'right', padding: '4px 6px' }}>2300.00</td>
                  <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '4px 2px' }}>Case</td>
                  <td style={{ textAlign: 'right', padding: '4px 6px' }}>2300.00</td>
                </tr>
              ) : (
                products.map((item, idx) => {
                  const qNum = parseFloat(String(item.quantity || 0)) || 0;
                  const rNum = parseFloat(String(item.rate || 0)) || 0;
                  const rowAmount = item.amount ? parseFloat(String(item.amount).replace(/,/g, '')) : qNum * rNum;
                  const unitDisplay = item.per || item.unit || 'Case';
                  const hsnDisplay = item.hsnCode || bill.hsnNo || '3604';

                  return (
                    <tr key={idx} style={{ verticalAlign: 'top' }}>
                      <td
                        style={{
                          borderRight: '1px solid #000000',
                          textAlign: 'center',
                          padding: '3px 2px',
                          fontWeight: 500,
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          borderRight: '1px solid #000000',
                          padding: '3px 8px',
                          fontWeight: 500,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.particular}
                      </td>
                      <td
                        style={{
                          borderRight: '1px solid #000000',
                          textAlign: 'center',
                          padding: '3px 2px',
                        }}
                      >
                        {hsnDisplay}
                      </td>
                      <td
                        style={{
                          borderRight: '1px solid #000000',
                          textAlign: 'center',
                          padding: '3px 2px',
                        }}
                      >
                        {item.quantity}
                      </td>
                      <td
                        style={{
                          borderRight: '1px solid #000000',
                          textAlign: 'right',
                          padding: '3px 6px',
                        }}
                      >
                        {formatCurrency(item.rate)}
                      </td>
                      <td
                        style={{
                          borderRight: '1px solid #000000',
                          textAlign: 'center',
                          padding: '3px 2px',
                        }}
                      >
                        {unitDisplay}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '3px 6px',
                          fontWeight: 500,
                        }}
                      >
                        {formatCurrency(rowAmount)}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Continuous Vertical Lines Spacer to fill the A4 page */}
              <tr style={{ height: `${spacerMinHeight}px` }}>
                <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000000' }}>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Row 4: Bottom Split Section: Transport Info Left | Totals & Signatory Right */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11.5px',
          }}
        >
          <tbody>
            <tr>
              {/* Left Column: Transport Info & Amount in Words */}
              <td
                style={{
                  width: '63%',
                  borderRight: '1.5px solid #000000',
                  padding: '6px 8px',
                  verticalAlign: 'top',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '140px',
                    height: '100%',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '11.5px' }}>
                      <u>Transport Info</u>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', lineHeight: 1.45 }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '120px', padding: '1px 0' }}>Despatched To</td>
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

                  <div style={{ marginTop: '12px', paddingTop: '4px', fontSize: '11.5px' }}>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000', width: '55%' }}>
                        Sub Total
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', borderBottom: '1px solid #000000', width: '45%' }}>
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                    {discountAmount > 0 && (
                      <tr>
                        <td style={{ padding: '3px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000' }}>
                          Less : Discount ({discountPercent}%)
                        </td>
                        <td style={{ padding: '3px 8px', textAlign: 'right', borderBottom: '1px solid #000000' }}>
                          {formatCurrency(discountAmount)}
                        </td>
                      </tr>
                    )}
                    {packingAmount > 0 && (
                      <tr>
                        <td style={{ padding: '3px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000' }}>
                          ADD : P &amp; F ({packingPercent}%)
                        </td>
                        <td style={{ padding: '3px 8px', textAlign: 'right', borderBottom: '1px solid #000000' }}>
                          {formatCurrency(packingAmount)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000' }}>
                        CGST - {cgstPct}%
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', borderBottom: '1px solid #000000' }}>
                        {formatCurrency(cgstAmt)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000' }}>
                        SGST - {sgstPct}%
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', borderBottom: '1px solid #000000' }}>
                        {formatCurrency(sgstAmt)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #000000', borderRight: '1px solid #000000' }}>
                        IGST - {igstPct}%
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', borderBottom: '1px solid #000000' }}>
                        {formatCurrency(igstAmt)}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: '4px 8px',
                          borderBottom: '1px solid #000000',
                          borderRight: '1px solid #000000',
                          fontWeight: 700,
                          fontSize: '12.5px',
                        }}
                      >
                        Net Amount
                      </td>
                      <td
                        style={{
                          padding: '4px 8px',
                          textAlign: 'right',
                          borderBottom: '1px solid #000000',
                          fontWeight: 700,
                          fontSize: '12.5px',
                        }}
                      >
                        {formatCurrency(grandTotalNum)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* For Company Name & Signature space */}
                <div style={{ padding: '6px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'none' }}>
                    For {displayCompanyName}
                  </div>
                  <div style={{ height: '36px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
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
