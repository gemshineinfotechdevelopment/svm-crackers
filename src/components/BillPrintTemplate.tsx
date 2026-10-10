import React from 'react';
import defaultGaneshaLogo from '../assets/ganesha.jpg';
import { getStoredSettings } from './SettingsPage';
import { numberToIndianWords } from '../utils/numberToWords';

export interface BillPrintProduct {
  particular: string;
  quantity: string | number;
  rate: string | number;
  pktUnit?: string | number;
  unit?: string | number;
  per?: string | number;
  amount: string | number;
  hsnCode?: string;
}

export interface BillPrintData {
  billNo: string;
  date: string;
  rateType?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerGst?: string;
  customerAadhar?: string;
  customerPan?: string;
  deliveryName?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryAadhar?: string;
  companyName: string;
  companyAddress?: string;
  companyCity?: string;
  companyPincode?: string;
  companyState?: string;
  companyPhone?: string;
  companyWhatsapp?: string;
  logoUrl?: string;
  preparedBy?: string;
  phone?: string;
  email?: string;
  website?: string;
  transport?: string;
  transportGstin?: string;
  dispatchFrom?: string;
  dispatchTo?: string;
  despatchFrom?: string;
  despatchTo?: string;
  hsnNo?: string;
  caseCount?: string | number;
  products: BillPrintProduct[];
  amount?: string | number;
  subtotal?: string | number;
  discount?: string | number;
  discountPercent?: string | number;
  packing?: string | number;
  packingCharges?: string | number;
  packingPercent?: string | number;
  tax?: string | number;
  roundOff?: string | number;
  total?: string | number;
  paymentStatus?: string;
  paymentMode?: string;
  paidAmount?: string | number;
  notes?: string;
  pdfData?: string;
  pdfUrl?: string;
  pdfName?: string;
  invoiceCopy?: string;
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

export const BillPrintTemplate: React.FC<BillPrintTemplateProps> = ({ bill, copyLabel }) => {
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

  // Display Company Name
  const displayCompanyName =
    storeSettings.companyName && typeof storeSettings.companyName === 'string' && storeSettings.companyName.trim() !== '' && storeSettings.companyName !== 'General' && storeSettings.companyName !== 'false'
      ? storeSettings.companyName.toUpperCase()
      : (bill.companyName && typeof bill.companyName === 'string' && bill.companyName.trim() !== '' && bill.companyName !== 'General' && bill.companyName !== 'false')
        ? bill.companyName.toUpperCase()
        : 'S.V.M FIREWORKS AGENCIES';

  const companyAddress = (storeSettings.address && typeof storeSettings.address === 'string' && storeSettings.address !== 'false' && !storeSettings.address.toLowerCase().includes('rajivgandhi') && !storeSettings.address.toLowerCase().includes('67 - h/e'))
    ? storeSettings.address.trim()
    : (bill.companyAddress && typeof bill.companyAddress === 'string' && bill.companyAddress !== 'false' && !bill.companyAddress.toLowerCase().includes('rajivgandhi') && !bill.companyAddress.toLowerCase().includes('67 - h/e'))
      ? bill.companyAddress.trim()
      : 'No. 2/A13 & 2/A14, Sivakasi - Virudhunagar Road, Keela Thiruthangal - 626 130. Tamil Nadu';
  const companyCity = (bill.companyCity || storeSettings.city || 'Sivakasi').trim();
  const companyPincode = (bill.companyPincode || storeSettings.pincode || '626123').trim();
  const companyState = (bill.companyState || storeSettings.state || 'Tamil Nadu').trim();

  let cityLine = companyCity.toUpperCase();
  if (companyPincode) {
    cityLine += ` - ${companyPincode}`;
  }
  if (companyState && !cityLine.toLowerCase().includes(companyState.toLowerCase())) {
    cityLine += `, ${companyState.toUpperCase()}`;
  }

  const primaryPhone = (bill.companyPhone || bill.phone || storeSettings.phone || '').trim();
  const whatsappPhone = (bill.companyWhatsapp || storeSettings.whatsapp || '').trim();
  const phoneNumbersList: string[] = [];
  if (primaryPhone) phoneNumbersList.push(primaryPhone);
  if (whatsappPhone && whatsappPhone !== primaryPhone) phoneNumbersList.push(whatsappPhone);
  const companyPhoneDisplay = phoneNumbersList.join(', ');

  // Company Logo from Settings / Bill
  const companyLogoUrl = bill.logoUrl || storeSettings.logoUrl || '';

  // Subtotal from products
  const products = bill.products || [];
  const prodSubtotal = products.reduce((acc, p) => {
    const q = parseFloat(String(p.quantity || 0)) || 0;
    const r = parseFloat(String(p.rate || 0)) || 0;
    const amt = p.amount ? parseFloat(String(p.amount).replace(/,/g, '')) : q * r;
    return acc + amt;
  }, 0);
  const subtotal = prodSubtotal > 0 ? prodSubtotal : (parseFloat(String(bill.subtotal || bill.amount || bill.total || 0).replace(/,/g, '')) || 0);

  // Discount calculation
  let discountPercent = '0.00';
  let discountAmount = 0;
  if (bill.discountPercent !== undefined && bill.discountPercent !== null && bill.discountPercent !== '') {
    const dPct = parseFloat(String(bill.discountPercent)) || 0;
    discountPercent = dPct.toFixed(2);
    discountAmount = (subtotal * dPct) / 100;
  } else if (bill.discount !== undefined && bill.discount !== null && bill.discount !== '') {
    const rawDisc = String(bill.discount).trim();
    const dVal = parseFloat(rawDisc.replace(/[^0-9.]/g, '')) || 0;
    if (rawDisc.includes('%') || (dVal > 0 && dVal <= 100 && !rawDisc.startsWith('₹'))) {
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
  } else if ((bill.packingCharges !== undefined && bill.packingCharges !== null && bill.packingCharges !== '') ||
    (bill.packing !== undefined && bill.packing !== null && bill.packing !== '')) {
    const rawPack = String(bill.packingCharges ?? bill.packing).trim();
    const pVal = parseFloat(rawPack.replace(/[^0-9.]/g, '')) || 0;
    if (rawPack.includes('%')) {
      packingPercent = pVal.toFixed(2);
      packingAmount = (subtotal * pVal) / 100;
    } else {
      packingAmount = pVal;
      packingPercent = subtotal > 0 ? ((packingAmount / subtotal) * 100).toFixed(2) : '0.00';
    }
  }

  // Transport calculation
  const rawTransportStr = String(bill.transport ?? '').trim();
  const cleanTrans = rawTransportStr.replace(/[^0-9.]/g, '');
  const transNum = parseFloat(cleanTrans) || 0;
  const transportAmt = (!isNaN(Number(rawTransportStr)) && transNum > 0) ? transNum : 0;
  const transportDisplayName = (!rawTransportStr || rawTransportStr === '0' || rawTransportStr === '-') ? '' : rawTransportStr;

  // Tax calculation
  const rawTaxStr = String(bill.tax ?? '').trim();
  const cleanTax = rawTaxStr.replace(/[^0-9.]/g, '');
  const taxRate = parseFloat(cleanTax) || 0;

  // Value of Goods
  const valueOfGoods = Math.max(0, subtotal - discountAmount + packingAmount + transportAmt);
  const taxAmount = taxRate > 0 ? (valueOfGoods * taxRate) / 100 : 0;

  // Grand Total & Round Off
  const rawTotalNum = parseFloat(String(bill.total || 0).replace(/,/g, '')) || 0;
  const calculatedTotal = valueOfGoods + taxAmount;
  const grandTotalNum = rawTotalNum > 0 ? rawTotalNum : Math.round(calculatedTotal);
  const roundOffNum = bill.roundOff !== undefined && bill.roundOff !== null && bill.roundOff !== ''
    ? (parseFloat(String(bill.roundOff)) || 0)
    : (grandTotalNum - calculatedTotal);

  // Total Quantity / Pieces Count
  const totalQtyComputed = products.reduce((acc, p) => acc + (parseFloat(String(p.quantity || 0)) || 0), 0);

  // Customer Name formatting
  const rawCustName = (bill.customerName || '').trim();
  const customerDisplayName = rawCustName ? (rawCustName.toLowerCase().startsWith('m/s') ? rawCustName : `M/s. ${rawCustName}`) : '';

  // Customer Address
  const customerAddressFormatted = bill.customerAddress && bill.customerAddress !== 'N/A' && bill.customerAddress !== '-'
    ? bill.customerAddress
    : '';

  // Customer Aadhar / PAN
  const customerAadharOrPan = (bill.customerAadhar || bill.customerPan || '').trim();

  // Delivery To Details
  const rawDeliveryName = (bill.deliveryName || bill.customerName || '').trim();
  const deliveryDisplayName = rawDeliveryName ? (rawDeliveryName.toLowerCase().startsWith('m/s') ? rawDeliveryName : `M/s. ${rawDeliveryName}`) : '';
  const deliveryAddressFormatted = bill.deliveryAddress && bill.deliveryAddress !== 'N/A' && bill.deliveryAddress !== '-'
    ? bill.deliveryAddress
    : customerAddressFormatted;
  const deliveryAadharOrPan = (bill.deliveryAadhar || customerAadharOrPan || '').trim();

  // Dispatch Details
  const dispatchFrom = bill.dispatchFrom || bill.despatchFrom || 'Sivakasi';
  const dispatchTo = bill.dispatchTo || bill.despatchTo || bill.customerCity || '';

  // Amount in Words
  const rawWords = numberToIndianWords(grandTotalNum);
  const wordsClean = rawWords
    .replace(/\s*Rupees\s*/i, ' ')
    .replace(/\s*Only\s*/i, '')
    .trim();

  // Dynamic spacer height to keep table lines running down continuously while filling the full A4 page
  const spacerMinHeight = Math.max(80, 520 - products.length * 26);

  const displayCopy = copyLabel || bill.invoiceCopy || 'ORIGINAL';
  const invoiceTitle = bill.invoiceTitle || (taxRate > 0 ? 'TAX INVOICE' : 'ESTIMATE');

  // Lorry Receipt Source if present
  const receiptSrc = bill.pdfData || bill.pdfUrl || '';

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
        padding: '4px 6px',
        fontSize: '11.5px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Copy Indicator (e.g. ORIGINAL) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '2px',
          paddingRight: '2px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#000000',
          }}
        >
          {displayCopy}
        </span>
      </div>

      {/* Main Bordered Bill Container */}
      <div
        className="bill-box"
        style={{
          border: '1.5px solid #000000',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Header: Ganesha (Left) | Title & Address (Center) | Apsara Logo (Right) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 10px 6px 10px',
            borderBottom: '1.5px solid #000000',
          }}
        >
          {/* Left: Lord Ganesha */}
          <div style={{ width: '75px', textAlign: 'center', flexShrink: 0 }}>
            <img
              src={defaultGaneshaLogo}
              alt="Ganesha"
              style={{
                maxHeight: '68px',
                maxWidth: '72px',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto',
              }}
            />
          </div>

          {/* Center: Apsara Traders Details */}
          <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                lineHeight: 1.15,
                marginBottom: '2px',
                color: '#000000',
              }}
            >
              {displayCompanyName}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#000000',
                marginBottom: '2px',
              }}
            >
              (ALL KINDS OF CRACKERS AND FANCY VARIETIES AVAILABLE)
            </div>
            <div style={{ fontSize: '11.5px', color: '#000000', marginBottom: '1px' }}>
              {companyAddress}
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#000000' }}>
              {cityLine}
            </div>
            {companyPhoneDisplay ? (
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#000000', marginTop: '1px' }}>
                Cell : {companyPhoneDisplay}
              </div>
            ) : null}
          </div>

          {/* Right: Company Logo from Settings */}
          <div style={{ width: '85px', textAlign: 'center', flexShrink: 0 }}>
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={displayCompanyName}
                style={{
                  maxHeight: '68px',
                  maxWidth: '85px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
            ) : null}
          </div>
        </div>

        {/* 3-Column Section: To (Left) | Delivery To Details (Middle) | Invoice Meta (Right) */}
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
              {/* Column 1: To */}
              <td
                style={{
                  width: '38%',
                  borderRight: '1.5px solid #000000',
                  padding: '6px 8px',
                  verticalAlign: 'top',
                  lineHeight: 1.35,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '2px' }}>To :</div>
                {customerDisplayName ? (
                  <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '2px' }}>
                    {customerDisplayName}
                  </div>
                ) : null}
                {customerAddressFormatted ? (
                  <div style={{ marginBottom: '2px' }}>{customerAddressFormatted}</div>
                ) : null}
                {bill.customerPhone ? (
                  <div style={{ marginBottom: '2px', fontWeight: 500 }}>
                    Cell : {bill.customerPhone}
                  </div>
                ) : null}
                {customerAadharOrPan ? (
                  <div style={{ marginTop: '4px', fontWeight: 600 }}>
                    AADHAR/PAN No : {customerAadharOrPan}
                  </div>
                ) : null}
              </td>

              {/* Column 2: Delivery To Details */}
              <td
                style={{
                  width: '38%',
                  borderRight: '1.5px solid #000000',
                  padding: '6px 8px',
                  verticalAlign: 'top',
                  lineHeight: 1.35,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>Delivery To Details:</div>
                {deliveryDisplayName ? (
                  <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '2px' }}>
                    {deliveryDisplayName}
                  </div>
                ) : null}
                {deliveryAddressFormatted ? (
                  <div style={{ marginBottom: '2px' }}>{deliveryAddressFormatted}</div>
                ) : null}
                {bill.deliveryPhone || bill.customerPhone ? (
                  <div style={{ marginBottom: '2px', fontWeight: 500 }}>
                    Cell : {bill.deliveryPhone || bill.customerPhone}
                  </div>
                ) : null}
                {deliveryAadharOrPan ? (
                  <div style={{ marginTop: '4px', fontWeight: 600 }}>
                    AADHAR/PAN No : {deliveryAadharOrPan}
                  </div>
                ) : null}
              </td>

              {/* Column 3: Invoice Header, Bill No., Date */}
              <td
                style={{
                  width: '24%',
                  padding: 0,
                  verticalAlign: 'top',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', height: '100%' }}>
                  <tbody>
                    <tr>
                      <td
                        style={{
                          backgroundColor: '#404040',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '12px',
                          textAlign: 'center',
                          padding: '5px 4px',
                          borderBottom: '1px solid #000000',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {invoiceTitle}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #000000',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        Bill No. &nbsp;: &nbsp;<strong>{bill.billNo || ''}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: '6px 8px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;<strong>{bill.date}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Products Table with Continuous Vertical Lines */}
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
                backgroundColor: '#404040',
                color: '#FFFFFF',
                fontWeight: 700,
                textTransform: 'uppercase',
                fontSize: '11px',
              }}
            >
              <th
                style={{
                  width: '6%',
                  borderRight: '1px solid #000000',
                  padding: '5px 4px',
                  textAlign: 'center',
                }}
              >
                S.No
              </th>
              <th
                style={{
                  width: '44%',
                  borderRight: '1px solid #000000',
                  padding: '5px 8px',
                  textAlign: 'center',
                }}
              >
                PRODUCT NAME
              </th>
              <th
                style={{
                  width: '13%',
                  borderRight: '1px solid #000000',
                  padding: '5px 4px',
                  textAlign: 'center',
                }}
              >
                QUANTITY
              </th>
              <th
                style={{
                  width: '13%',
                  borderRight: '1px solid #000000',
                  padding: '5px 6px',
                  textAlign: 'center',
                }}
              >
                RATE
              </th>
              <th
                style={{
                  width: '10%',
                  borderRight: '1px solid #000000',
                  padding: '5px 4px',
                  textAlign: 'center',
                }}
              >
                PER
              </th>
              <th
                style={{
                  width: '14%',
                  padding: '5px 8px',
                  textAlign: 'center',
                }}
              >
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr style={{ verticalAlign: 'top' }}>
                <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '6px 4px' }}>1</td>
                <td style={{ borderRight: '1px solid #000000', padding: '6px 8px', fontWeight: 600 }}>Assorted Crackers</td>
                <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '6px 4px' }}>11 Case</td>
                <td style={{ borderRight: '1px solid #000000', textAlign: 'right', padding: '6px 8px' }}>2,200.00</td>
                <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '6px 4px' }}>Case</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>24,200.00</td>
              </tr>
            ) : (
              products.map((item, idx) => {
                const qNum = parseFloat(String(item.quantity || 0)) || 0;
                const rNum = parseFloat(String(item.rate || 0)) || 0;
                const rowAmount = item.amount ? parseFloat(String(item.amount).replace(/,/g, '')) : qNum * rNum;
                const unitDisplay = item.pktUnit || item.unit || item.per || 'Case';

                return (
                  <tr key={idx} style={{ verticalAlign: 'top' }}>
                    <td
                      style={{
                        borderRight: '1px solid #000000',
                        textAlign: 'center',
                        padding: '4px 4px',
                        fontWeight: 500,
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td
                      style={{
                        borderRight: '1px solid #000000',
                        padding: '4px 8px',
                        fontWeight: 600,
                      }}
                    >
                      {item.particular}
                    </td>
                    <td
                      style={{
                        borderRight: '1px solid #000000',
                        textAlign: 'center',
                        padding: '4px 4px',
                      }}
                    >
                      {item.quantity} {unitDisplay}
                    </td>
                    <td
                      style={{
                        borderRight: '1px solid #000000',
                        textAlign: 'right',
                        padding: '4px 8px',
                      }}
                    >
                      {formatCurrency(item.rate)}
                    </td>
                    <td
                      style={{
                        borderRight: '1px solid #000000',
                        textAlign: 'center',
                        padding: '4px 4px',
                      }}
                    >
                      {unitDisplay}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '4px 8px',
                        fontWeight: 600,
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
              <td>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Split Section: Dispatch Left | Totals Right */}
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
              {/* Left Column: Dispatch, Transport, HSN, Total Cases */}
              <td
                style={{
                  width: '58%',
                  borderRight: '1.5px solid #000000',
                  padding: '6px 8px',
                  verticalAlign: 'top',
                  lineHeight: 1.45,
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2px 0', width: '50%' }}>
                        Dispatch From &nbsp;: &nbsp;<strong>{dispatchFrom}</strong>
                      </td>
                      <td style={{ padding: '2px 0', width: '50%' }}>
                        To &nbsp;: &nbsp;<strong>{dispatchTo || '-'}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', width: '50%' }}>
                        Transport &nbsp;: &nbsp;<strong>{transportDisplayName || '-'}</strong>
                      </td>
                      <td style={{ padding: '3px 0', width: '50%' }}>
                        Total Pieces &nbsp;: &nbsp;<strong>{totalQtyComputed}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Optional Uploaded Transport Receipt Preview if present */}
                {receiptSrc && (
                  <div style={{ marginTop: '8px', borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                      ATTACHED TRANSPORT RECEIPT:
                    </div>
                    {receiptSrc.startsWith('data:image') || receiptSrc.match(/\.(jpeg|jpg|png|webp|gif)$/i) || !receiptSrc.includes('application/pdf') ? (
                      <img
                        src={receiptSrc}
                        alt="Receipt"
                        style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#0B4DB7', fontWeight: 600 }}>PDF Attachment Included</span>
                    )}
                  </div>
                )}
              </td>

              {/* Right Column: Calculations Table */}
              <td
                style={{
                  width: '42%',
                  padding: 0,
                  verticalAlign: 'top',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2.5px 8px', fontWeight: 600 }}>Total :</td>
                      <td style={{ padding: '2.5px 4px', textAlign: 'center', width: '75px' }}>:</td>
                      <td style={{ padding: '2.5px 8px', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                    {discountAmount > 0 && (
                      <tr>
                        <td style={{ padding: '2.5px 8px', fontWeight: 500 }}>Less : Discount</td>
                        <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>
                          : {discountPercent} %
                        </td>
                        <td style={{ padding: '2.5px 8px', textAlign: 'right' }}>
                          {formatCurrency(discountAmount)}
                        </td>
                      </tr>
                    )}
                    {packingAmount > 0 && (
                      <tr>
                        <td style={{ padding: '2.5px 8px', fontWeight: 500 }}>ADD : P &amp; F CHGS</td>
                        <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>
                          : {packingPercent} %
                        </td>
                        <td style={{ padding: '2.5px 8px', textAlign: 'right' }}>
                          {formatCurrency(packingAmount)}
                        </td>
                      </tr>
                    )}
                    {transportAmt > 0 && (
                      <tr>
                        <td style={{ padding: '2.5px 8px', fontWeight: 500 }}>Transport Charges</td>
                        <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>:</td>
                        <td style={{ padding: '2.5px 8px', textAlign: 'right' }}>
                          {formatCurrency(transportAmt)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '2.5px 8px', fontWeight: 600 }}>Value of Goods</td>
                      <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>:</td>
                      <td style={{ padding: '2.5px 8px', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(valueOfGoods)}
                      </td>
                    </tr>
                    {taxAmount > 0 && (
                      <tr>
                        <td style={{ padding: '2.5px 8px', fontWeight: 500 }}>GST / Tax</td>
                        <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>
                          : {taxRate} %
                        </td>
                        <td style={{ padding: '2.5px 8px', textAlign: 'right' }}>
                          {formatCurrency(taxAmount)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '2.5px 8px', fontWeight: 500 }}>Round Off</td>
                      <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>:</td>
                      <td style={{ padding: '2.5px 8px', textAlign: 'right' }}>
                        {formatCurrency(roundOffNum)}
                      </td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #000000' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 800, fontSize: '12px' }}>Grand Total</td>
                      <td style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 800 }}>:</td>
                      <td
                        style={{
                          padding: '4px 8px',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '12px',
                        }}
                      >
                        {formatCurrency(grandTotalNum)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words (Rupees : ...) */}
        <div
          style={{
            padding: '6px 8px',
            borderBottom: '1.5px solid #000000',
            fontSize: '11.5px',
            fontWeight: 700,
          }}
        >
          Rupees : &nbsp;{wordsClean} Only.
        </div>

        {/* Footer: Terms Left | Signatory Right */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
          <tbody>
            <tr>
              {/* Terms Left */}
              <td
                style={{
                  width: '58%',
                  borderRight: '1.5px solid #000000',
                  padding: '6px 8px',
                  verticalAlign: 'top',
                }}
              >
                <div style={{ lineHeight: 1.45 }}>
                  <div>1. Certified that the particulars given above are true and correct.</div>
                  <div>2. Goods once sold cannot be taken back on any account.</div>
                  <div>3. Subject to sivakasi jurisdiction</div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    paddingRight: '28px',
                    marginTop: '16px',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                >
                  E. &amp; O.E
                </div>
              </td>

              {/* Signatory Right */}
              <td
                style={{
                  width: '42%',
                  padding: '6px 8px',
                  verticalAlign: 'top',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                  For {displayCompanyName}
                </div>
                <div style={{ height: '48px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>
                  Authorized Signatory
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
