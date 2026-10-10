import type { BillPrintData } from '../components/BillPrintTemplate';
import { formatCompanyAddressLines, type GstBillPrintData } from '../components/GstBillPrintTemplate';
import { getStoredSettings } from '../components/SettingsPage';
import { numberToIndianWords } from './numberToWords';

/**
 * Robust date parser supporting DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, ISO, etc.
 */
export const parseDateToTimestamp = (dateStr: string): number => {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const clean = dateStr.trim();

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day).getTime();
  }

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day).getTime();
  }

  const parsed = Date.parse(clean);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Checks whether an item's date falls within [fromDate, toDate]
 */
export const isDateInRange = (dateStr: string, fromDateStr: string, toDateStr: string): boolean => {
  if (!fromDateStr && !toDateStr) return true;
  const itemTime = parseDateToTimestamp(dateStr);
  if (!itemTime) return true;

  if (fromDateStr) {
    const fromTime = parseDateToTimestamp(fromDateStr);
    if (fromTime && itemTime < fromTime) return false;
  }

  if (toDateStr) {
    const toTime = parseDateToTimestamp(toDateStr);
    // Include the full day until 23:59:59
    if (toTime && itemTime > toTime + (24 * 60 * 60 * 1000 - 1)) return false;
  }

  return true;
};

export const generateBillHtml = (bill: BillPrintData, copiesCount: number = 1): string => {
  const storeSettings = getStoredSettings();
  const displayCompanyName =
    storeSettings.companyName && storeSettings.companyName.trim() !== '' && storeSettings.companyName !== 'General'
      ? storeSettings.companyName.toUpperCase()
      : (bill.companyName && bill.companyName.trim() !== '' && bill.companyName !== 'General')
        ? bill.companyName.toUpperCase()
        : 'S.V.M FIREWORKS AGENCIES';

  const companyAddress = (storeSettings.address && !storeSettings.address.toLowerCase().includes('rajivgandhi') && !storeSettings.address.toLowerCase().includes('67 - h/e'))
    ? storeSettings.address.trim()
    : (bill.companyAddress && !bill.companyAddress.toLowerCase().includes('rajivgandhi') && !bill.companyAddress.toLowerCase().includes('67 - h/e'))
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

  const formatCur = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === '') return '0.00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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

  const totalQtyComputed = products.reduce((acc, p) => acc + (parseFloat(String(p.quantity || 0)) || 0), 0);

  const rawCustName = (bill.customerName || '').trim();
  const customerDisplayName = rawCustName ? (rawCustName.toLowerCase().startsWith('m/s') ? rawCustName : `M/s. ${rawCustName}`) : '';
  const customerAddressFormatted = bill.customerAddress && bill.customerAddress !== 'N/A' && bill.customerAddress !== '-'
    ? bill.customerAddress
    : '';
  const customerAadharOrPan = (bill.customerAadhar || bill.customerPan || '').trim();

  const rawDeliveryName = (bill.deliveryName || bill.customerName || '').trim();
  const deliveryDisplayName = rawDeliveryName ? (rawDeliveryName.toLowerCase().startsWith('m/s') ? rawDeliveryName : `M/s. ${rawDeliveryName}`) : '';
  const deliveryAddressFormatted = bill.deliveryAddress && bill.deliveryAddress !== 'N/A' && bill.deliveryAddress !== '-'
    ? bill.deliveryAddress
    : customerAddressFormatted;
  const deliveryAadharOrPan = (bill.deliveryAadhar || customerAadharOrPan || '').trim();

  const dispatchFrom = bill.dispatchFrom || bill.despatchFrom || 'Sivakasi';
  const dispatchTo = bill.dispatchTo || bill.despatchTo || bill.customerCity || '';

  const rawWords = numberToIndianWords(grandTotalNum);
  const wordsClean = rawWords
    .replace(/\s*Rupees\s*/i, ' ')
    .replace(/\s*Only\s*/i, '')
    .trim();

  const spacerMinHeight = Math.max(80, 520 - products.length * 26);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const ganeshaImgUrl = `${origin}/ganesha.jpg`;
  const companyLogoUrl = bill.logoUrl || storeSettings.logoUrl || `${origin}/logo.png`;

  const copyLabels = ['ORIGINAL', 'DUPLICATE', 'TRIPLICATE', 'EXTRA COPY'];
  const invoiceTitle = bill.invoiceTitle || (taxRate > 0 ? 'TAX INVOICE' : 'ESTIMATE');
  const receiptSrc = bill.pdfData || bill.pdfUrl || '';

  const productRowsHtml = products.length === 0
    ? `
      <tr style="vertical-align: top;">
        <td style="border-right: 1px solid #000000; text-align: center; padding: 5px 4px;">1</td>
        <td style="border-right: 1px solid #000000; padding: 5px 8px; font-weight: 600;">Assorted Crackers</td>
        <td style="border-right: 1px solid #000000; text-align: center; padding: 5px 4px;">11 Case</td>
        <td style="border-right: 1px solid #000000; text-align: right; padding: 5px 8px;">2,200.00</td>
        <td style="border-right: 1px solid #000000; text-align: center; padding: 5px 4px;">Case</td>
        <td style="text-align: right; padding: 5px 8px; font-weight: 600;">24,200.00</td>
      </tr>
    `
    : products.map((item, idx) => {
      const qNum = parseFloat(String(item.quantity || 0)) || 0;
      const rNum = parseFloat(String(item.rate || 0)) || 0;
      const rowAmount = item.amount ? parseFloat(String(item.amount).replace(/,/g, '')) : qNum * rNum;
      const unitDisplay = item.pktUnit || item.unit || item.per || 'Case';

      return `
          <tr style="vertical-align: top;">
            <td style="border-right: 1px solid #000000; text-align: center; padding: 4px 4px; font-weight: 500;">
              ${idx + 1}
            </td>
            <td style="border-right: 1px solid #000000; padding: 4px 8px; font-weight: 600;">
              ${item.particular}
            </td>
            <td style="border-right: 1px solid #000000; text-align: center; padding: 4px 4px;">
              ${item.quantity} ${unitDisplay}
            </td>
            <td style="border-right: 1px solid #000000; text-align: right; padding: 4px 8px;">
              ${formatCur(item.rate)}
            </td>
            <td style="border-right: 1px solid #000000; text-align: center; padding: 4px 4px;">
              ${unitDisplay}
            </td>
            <td style="text-align: right; padding: 4px 8px; font-weight: 600;">
              ${formatCur(rowAmount)}
            </td>
          </tr>
        `;
    }).join('');

  const renderSingleInvoice = (copyName: string) => `
    <div class="bill-page-wrapper">
      <!-- Top Copy Indicator -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 2px; padding-right: 2px;">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #000000;">
          ${copyName}
        </span>
      </div>

      <!-- Main Bordered Container -->
      <div class="bill-box">
        <!-- Header: Ganesha (Left) | Title (Center) | Apsara Logo (Right) -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 2px 10px 6px 10px; border-bottom: 1.5px solid #000000;">
          <div style="width: 75px; text-align: center; flex-shrink: 0;">
            <img src="${ganeshaImgUrl}" alt="Ganesha" style="max-height: 68px; max-width: 72px; object-fit: contain; display: block; margin: 0 auto;" />
          </div>

          <div style="flex: 1; text-align: center; padding: 0 8px;">
            <div style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em; line-height: 1.15; margin-bottom: 2px; color: #000000;">
              ${displayCompanyName}
            </div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #000000; margin-bottom: 2px;">
              (ALL KINDS OF CRACKERS AND FANCY VARIETIES AVAILABLE)
            </div>
            <div style="font-size: 11.5px; color: #000000; margin-bottom: 1px;">
              ${companyAddress}
            </div>
            <div style="font-size: 12.5px; font-weight: 800; color: #000000;">
              ${cityLine}
            </div>
            ${companyPhoneDisplay ? `<div style="font-size: 11px; font-weight: 700; color: #000000; margin-top: 1px;">Cell : ${companyPhoneDisplay}</div>` : ''}
          </div>

          <div style="width: 85px; text-align: center; flex-shrink: 0;">
            ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="${displayCompanyName}" style="max-height: 68px; max-width: 85px; object-fit: contain; display: block; margin: 0 auto;" />` : ''}
          </div>
        </div>

        <!-- 3-Column Section: To | Delivery To | Invoice Meta -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000; font-size: 11.5px;">
          <tbody>
            <tr>
              <!-- Column 1: To -->
              <td style="width: 38%; border-right: 1.5px solid #000000; padding: 6px 8px; vertical-align: top; line-height: 1.35;">
                <div style="font-weight: 700; margin-bottom: 2px;">To :</div>
                ${customerDisplayName ? `<div style="font-weight: 700; font-size: 12px; margin-bottom: 2px;">${customerDisplayName}</div>` : ''}
                ${customerAddressFormatted ? `<div style="margin-bottom: 2px;">${customerAddressFormatted}</div>` : ''}
                ${bill.customerPhone ? `<div style="margin-bottom: 2px; font-weight: 500;">Cell : ${bill.customerPhone}</div>` : ''}
                ${customerAadharOrPan ? `<div style="margin-top: 4px; font-weight: 600;">AADHAR/PAN No : ${customerAadharOrPan}</div>` : ''}
              </td>

              <!-- Column 2: Delivery To Details -->
              <td style="width: 38%; border-right: 1.5px solid #000000; padding: 6px 8px; vertical-align: top; line-height: 1.35;">
                <div style="font-weight: 600; margin-bottom: 2px;">Delivery To Details:</div>
                ${deliveryDisplayName ? `<div style="font-weight: 700; font-size: 12px; margin-bottom: 2px;">${deliveryDisplayName}</div>` : ''}
                ${deliveryAddressFormatted ? `<div style="margin-bottom: 2px;">${deliveryAddressFormatted}</div>` : ''}
                ${bill.deliveryPhone || bill.customerPhone ? `<div style="margin-bottom: 2px; font-weight: 500;">Cell : ${bill.deliveryPhone || bill.customerPhone}</div>` : ''}
                ${deliveryAadharOrPan ? `<div style="margin-top: 4px; font-weight: 600;">AADHAR/PAN No : ${deliveryAadharOrPan}</div>` : ''}
              </td>

              <!-- Column 3: Invoice Header, Bill No., Date -->
              <td style="width: 24%; padding: 0; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse; height: 100%;">
                  <tbody>
                    <tr>
                      <td style="background-color: #404040; color: #FFFFFF; font-weight: 800; font-size: 12px; text-align: center; padding: 5px 4px; border-bottom: 1px solid #000000; letter-spacing: 0.06em;">
                        ${invoiceTitle}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 8px; border-bottom: 1px solid #000000; font-size: 12px; font-weight: 700;">
                        Bill No. &nbsp;: &nbsp;<strong>${bill.billNo || ''}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 8px; font-size: 12px; font-weight: 700;">
                        Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;<strong>${bill.date}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Products Table with Continuous Vertical Lines -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000; font-size: 11.5px;">
          <thead>
            <tr style="background-color: #404040; color: #FFFFFF; font-weight: 700; text-transform: uppercase; font-size: 11px;">
              <th style="width: 6%; border-right: 1px solid #000000; padding: 5px 4px; text-align: center;">S.No</th>
              <th style="width: 44%; border-right: 1px solid #000000; padding: 5px 8px; text-align: center;">PRODUCT NAME</th>
              <th style="width: 13%; border-right: 1px solid #000000; padding: 5px 4px; text-align: center;">QUANTITY</th>
              <th style="width: 13%; border-right: 1px solid #000000; padding: 5px 6px; text-align: center;">RATE</th>
              <th style="width: 10%; border-right: 1px solid #000000; padding: 5px 4px; text-align: center;">PER</th>
              <th style="width: 14%; padding: 5px 8px; text-align: center;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${productRowsHtml}

            <!-- Continuous Vertical Lines Spacer to fill full A4 page -->
            <tr style="height: ${spacerMinHeight}px;">
              <td style="border-right: 1px solid #000000;">&nbsp;</td>
              <td style="border-right: 1px solid #000000;">&nbsp;</td>
              <td style="border-right: 1px solid #000000;">&nbsp;</td>
              <td style="border-right: 1px solid #000000;">&nbsp;</td>
              <td style="border-right: 1px solid #000000;">&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        <!-- Bottom Split Section: Dispatch Left | Totals Right -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000; font-size: 11.5px;">
          <tbody>
            <tr>
              <!-- Left Column: Dispatch, Transport, HSN, Total Cases -->
              <td style="width: 58%; border-right: 1.5px solid #000000; padding: 6px 8px; vertical-align: top; line-height: 1.45;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tbody>
                    <tr>
                      <td style="padding: 2px 0; width: 50%;">
                        Dispatch From &nbsp;: &nbsp;<strong>${dispatchFrom}</strong>
                      </td>
                      <td style="padding: 2px 0; width: 50%;">
                        To &nbsp;: &nbsp;<strong>${dispatchTo || '-'}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 3px 0; width: 50%;">
                        Transport &nbsp;: &nbsp;<strong>${transportDisplayName || '-'}</strong>
                      </td>
                      <td style="padding: 3px 0; width: 50%;">
                        Total Pieces &nbsp;: &nbsp;<strong>${totalQtyComputed}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>

                ${receiptSrc
      ? `
                  <div style="margin-top: 8px; border-top: 1px dashed #CBD5E1; padding-top: 6px;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; margin-bottom: 4px;">
                      ATTACHED TRANSPORT RECEIPT:
                    </div>
                    ${receiptSrc.startsWith('data:image') || receiptSrc.match(/\.(jpeg|jpg|png|webp|gif)$/i) || !receiptSrc.includes('application/pdf')
        ? `<img src="${receiptSrc}" alt="Receipt" style="max-height: 70px; max-width: 100%; object-fit: contain; display: block;" />`
        : `<span style="font-size: 11px; color: #0B4DB7; font-weight: 600;">PDF Attachment Included</span>`
      }
                  </div>
                `
      : ''
    }
              </td>

              <!-- Right Column: Calculations Table -->
              <td style="width: 42%; padding: 0; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
                  <tbody>
                    <tr>
                      <td style="padding: 2.5px 8px; font-weight: 600;">Total :</td>
                      <td style="padding: 2.5px 4px; text-align: center; width: 75px;">:</td>
                      <td style="padding: 2.5px 8px; text-align: right; font-weight: 600;">
                        ${formatCur(subtotal)}
                      </td>
                    </tr>
                    ${discountAmount > 0
      ? `
                    <tr>
                      <td style="padding: 2.5px 8px; font-weight: 500;">Less : Discount</td>
                      <td style="padding: 2.5px 4px; text-align: center;">: ${discountPercent} %</td>
                      <td style="padding: 2.5px 8px; text-align: right;">${formatCur(discountAmount)}</td>
                    </tr>`
      : ''
    }
                    ${packingAmount > 0
      ? `
                    <tr>
                      <td style="padding: 2.5px 8px; font-weight: 500;">ADD : P &amp; F CHGS</td>
                      <td style="padding: 2.5px 4px; text-align: center;">: ${packingPercent} %</td>
                      <td style="padding: 2.5px 8px; text-align: right;">${formatCur(packingAmount)}</td>
                    </tr>`
      : ''
    }
                    ${transportAmt > 0
      ? `
                    <tr>
                      <td style="padding: 2.5px 8px; font-weight: 500;">Transport Charges</td>
                      <td style="padding: 2.5px 4px; text-align: center;">:</td>
                      <td style="padding: 2.5px 8px; text-align: right;">${formatCur(transportAmt)}</td>
                    </tr>`
      : ''
    }
                    <tr>
                      <td style="padding: 2.5px 8px; font-weight: 600;">Value of Goods</td>
                      <td style="padding: 2.5px 4px; text-align: center;">:</td>
                      <td style="padding: 2.5px 8px; text-align: right; font-weight: 600;">
                        ${formatCur(valueOfGoods)}
                      </td>
                    </tr>
                    ${taxAmount > 0
      ? `
                    <tr>
                      <td style="padding: 2.5px 8px; font-weight: 500;">GST / Tax</td>
                      <td style="padding: 2.5px 4px; text-align: center;">: ${taxRate} %</td>
                      <td style="padding: 2.5px 8px; text-align: right;">${formatCur(taxAmount)}</td>
                    </tr>`
      : ''
    }
                    <tr>
                      <td style="padding: 2.5px 8px; font-weight: 500;">Round Off</td>
                      <td style="padding: 2.5px 4px; text-align: center;">:</td>
                      <td style="padding: 2.5px 8px; text-align: right;">
                        ${formatCur(roundOffNum)}
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid #000000;">
                      <td style="padding: 4px 8px; font-weight: 800; font-size: 12px;">Grand Total</td>
                      <td style="padding: 4px 4px; text-align: center; font-weight: 800;">:</td>
                      <td style="padding: 4px 8px; text-align: right; font-weight: 800; font-size: 12px;">
                        ${formatCur(grandTotalNum)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Amount in Words -->
        <div style="padding: 6px 8px; border-bottom: 1.5px solid #000000; font-size: 11.5px; font-weight: 700;">
          Rupees : &nbsp;${wordsClean} Only.
        </div>

        <!-- Footer: Terms Left | Signatory Right -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
          <tbody>
            <tr>
              <td style="width: 58%; border-right: 1.5px solid #000000; padding: 6px 8px; vertical-align: top;">
                <div style="line-height: 1.45;">
                  <div>1. Certified that the particulars given above are true and correct.</div>
                  <div>2. Goods once sold cannot be taken back on any account.</div>
                  <div>3. Subject to sivakasi jurisdiction</div>
                </div>
                <div style="text-align: right; padding-right: 28px; margin-top: 16px; font-weight: 700; font-size: 11px;">
                  E. &amp; O.E
                </div>
              </td>

              <td style="width: 42%; padding: 6px 8px; vertical-align: top; text-align: center;">
                <div style="font-weight: 800; font-size: 12px; text-transform: uppercase;">
                  For ${displayCompanyName}
                </div>
                <div style="height: 48px;"></div>
                <div style="font-size: 11px; font-weight: 600;">
                  Authorized Signatory
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Repeat for the requested number of copies
  const actualCopies = Math.max(1, copiesCount || 1);
  let pagesHtml = '';
  for (let i = 0; i < actualCopies; i++) {
    const copyTitle = copyLabels[i] || (bill.invoiceCopy || 'ORIGINAL');
    const isLast = i === actualCopies - 1;
    pagesHtml += `
      <div class="gst-print-copy ${!isLast ? 'page-break' : ''}">
        ${renderSingleInvoice(copyTitle)}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${invoiceTitle} #${bill.billNo || '1'} - ${displayCompanyName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 5mm 6mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff;
      color: #000000;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 11.5px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .gst-print-copy {
      width: 100%;
      box-sizing: border-box;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .bill-page-wrapper {
      width: 100%;
      min-height: 280mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .bill-box {
      border: 1.5px solid #000000;
      box-sizing: border-box;
      background-color: #ffffff;
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>
  `;
};

export const printBillDirectly = (bill: BillPrintData) => {
  const htmlContent = generateBillHtml(bill);
  triggerBrowserPrint(htmlContent);
};

export const generateGstBillHtml = (bill: GstBillPrintData, copiesCount: number = 1): string => {
  const storeSettings = getStoredSettings();
  const displayCompanyName =
    storeSettings.companyName && storeSettings.companyName.trim() !== '' && storeSettings.companyName !== 'General'
      ? storeSettings.companyName.trim()
      : bill.companyName && bill.companyName.trim() !== '' && bill.companyName !== 'General' && bill.companyName !== 'SVM Crackers'
        ? bill.companyName.trim()
        : 'S.V.M Fireworks Agencies';

  const gstinNo = storeSettings.gstin || bill.gstin || '33ADBFS7999E1ZO';
  const licNo = storeSettings.licNo || bill.licNo || 'E/SS/TN/24/83 (E86652)';

  const companyAddressLines = formatCompanyAddressLines(storeSettings.address || bill.companyAddress);
  const companyAddressHtml = companyAddressLines.map((l) => `<div>${l}</div>`).join('');

  const customerDisplayName = (bill.customerName || '').trim() || 'Ravikumar';
  const customerAddressDisplay = (bill.customerAddress || bill.customerCity || bill.despatchTo || bill.dispatchTo || '').trim() || 'BOMMSANDRA';
  const customerGstDisplay = (bill.customerGst && bill.customerGst !== 'N/A' && bill.customerGst !== '-')
    ? bill.customerGst.trim()
    : 'OWN USE';
  const customerAadharDisplay = (bill.customerAadhar && bill.customerAadhar !== 'N/A' && bill.customerAadhar !== '-')
    ? bill.customerAadhar.trim()
    : '';

  const despatchToDisplay = (bill.despatchTo || bill.dispatchTo || bill.customerCity || customerAddressDisplay || 'BOMMSANDRA').trim();
  const lorryTransportDisplay = (bill.lorryTransport || (bill.transport && bill.transport !== '-' && bill.transport !== '0') ? (bill.lorryTransport || bill.transport) : '') || '';
  const lrNoDisplay = (bill.lrNo && bill.lrNo !== '-') ? bill.lrNo : '';
  const lrDateDisplay = (bill.lrDate && bill.lrDate !== '-') ? bill.lrDate : '';

  const copyLabels = ['ORIGINAL', 'DUPLICATE', 'TRIPLICATE', 'EXTRA COPY'];

  const formatCur = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === '') return '0.00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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

  // Packing & Forwarding
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

  const rawTotalNum = parseFloat(String(bill.netAmount || bill.total || 0).replace(/,/g, '')) || 0;
  const grandTotalNum = rawTotalNum > 0 ? rawTotalNum : Math.round(netAmountExact);

  const rawWords = numberToIndianWords(grandTotalNum);
  const wordsClean = rawWords
    .replace(/\s*Rupees\s*/i, ' ')
    .replace(/\s*Only\s*/i, '')
    .trim();

  const spacerMinHeight = Math.max(80, 460 - products.length * 26);

  const productRowsHtml = products.length === 0
    ? `
      <tr style="vertical-align: top;">
        <td style="border-right: 1px solid #000000; text-align: center; padding: 4px 2px;">1</td>
        <td style="border-right: 1px solid #000000; padding: 4px 8px; font-weight: 500;">ASSORTED CRACKERS</td>
        <td style="border-right: 1px solid #000000; text-align: center; padding: 4px 2px;">3604</td>
        <td style="border-right: 1px solid #000000; text-align: center; padding: 4px 2px;">1</td>
        <td style="border-right: 1px solid #000000; text-align: right; padding: 4px 6px;">2300.00</td>
        <td style="border-right: 1px solid #000000; text-align: center; padding: 4px 2px;">Case</td>
        <td style="text-align: right; padding: 4px 6px;">2300.00</td>
      </tr>
    `
    : products.map((item, idx) => {
      const qNum = parseFloat(String(item.quantity || 0)) || 0;
      const rNum = parseFloat(String(item.rate || 0)) || 0;
      const rowAmount = item.amount ? parseFloat(String(item.amount).replace(/,/g, '')) : qNum * rNum;
      const unitDisplay = item.per || item.unit || 'Case';
      const hsnDisplay = item.hsnCode || bill.hsnNo || '3604';

      return `
          <tr style="vertical-align: top;">
            <td style="border-right: 1px solid #000000; text-align: center; padding: 3px 2px; font-weight: 500;">
              ${idx + 1}
            </td>
            <td style="border-right: 1px solid #000000; padding: 3px 8px; font-weight: 500; text-transform: uppercase;">
              ${item.particular}
            </td>
            <td style="border-right: 1px solid #000000; text-align: center; padding: 3px 2px;">
              ${hsnDisplay}
            </td>
            <td style="border-right: 1px solid #000000; text-align: center; padding: 3px 2px;">
              ${item.quantity}
            </td>
            <td style="border-right: 1px solid #000000; text-align: right; padding: 3px 6px;">
              ${formatCur(item.rate)}
            </td>
            <td style="border-right: 1px solid #000000; text-align: center; padding: 3px 2px;">
              ${unitDisplay}
            </td>
            <td style="text-align: right; padding: 3px 6px; font-weight: 500;">
              ${formatCur(rowAmount)}
            </td>
          </tr>
        `;
    }).join('');

  const renderSingleInvoice = (copyName: string) => `
    <div class="bill-page-wrapper">
      <!-- Centered Top Title & Copy Indicator -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px; padding: 0 2px;">
        <div style="width: 100px;"></div>
        <div style="text-align: center; flex: 1;">
          <u style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #000000;">
            TAX INVOICE
          </u>
        </div>
        <div style="width: 100px; text-align: right;">
          ${copiesCount > 1 ? `<span style="font-size: 10px; font-weight: 700; text-transform: uppercase;">${copyName}</span>` : ''}
        </div>
      </div>

      <!-- Main Bordered Container -->
      <div class="bill-box">
        <div>
          <!-- Row 1: Company Header (Left) | GSTIN & LIC NO (Right) -->
          <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000; font-size: 11.5px;">
            <tbody>
              <tr>
                <!-- Left Column: Company Name & Address -->
                <td style="width: 63%; padding: 8px 10px; vertical-align: middle; border-right: 1.5px solid #000000;">
                  <div style="font-size: 17px; font-weight: 800; color: #000000; margin-bottom: 3px; line-height: 1.2;">
                    ${displayCompanyName}
                  </div>
                  <div style="font-size: 11px; color: #000000; line-height: 1.35;">
                    ${companyAddressHtml}
                  </div>
                </td>

                <!-- Right Column: GSTIN & LIC NO -->
                <td style="width: 37%; padding: 8px 10px; vertical-align: middle; line-height: 1.6;">
                  <div style="font-size: 12px; font-weight: 700; color: #000000; margin-bottom: 2px;">
                    GSTIN &nbsp;: &nbsp;<strong>${gstinNo}</strong>
                  </div>
                  <div style="font-size: 12px; font-weight: 700; color: #000000;">
                    LIC NO &nbsp;: &nbsp;<strong>${licNo}</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Row 2: Customer (To) (Left) | Invoice No & Date (Right) -->
          <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000; font-size: 11.5px;">
            <tbody>
              <tr>
                <!-- Left Column: Customer (To) -->
                <td style="width: 63%; padding: 6px 10px; vertical-align: top; border-right: 1.5px solid #000000; line-height: 1.38;">
                  <div style="font-size: 11.5px; margin-bottom: 2px;">To</div>
                  <div style="padding-left: 14px;">
                    <div style="font-weight: 600; font-size: 12px;">
                      ${customerDisplayName}
                    </div>
                    ${customerAddressDisplay ? `<div>${customerAddressDisplay}</div>` : ''}
                    <div>GSTIN : ${customerGstDisplay}</div>
                    <div>Aadhar : ${customerAadharDisplay}</div>
                  </div>
                </td>

                <!-- Right Column: Invoice No & Date -->
                <td style="width: 37%; padding: 8px 10px; vertical-align: top; line-height: 1.65; font-size: 12px;">
                  <div>
                    Invoice No &nbsp;: &nbsp;<strong>${bill.billNo || '202'}</strong>
                  </div>
                  <div>
                    Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;<strong>${bill.date}</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Row 3: Products Table with Continuous Column Borders -->
          <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #000000; font-size: 11.5px;">
            <thead>
              <tr style="background-color: #FFFFFF; color: #000000; font-size: 11.5px; font-weight: 700; border-bottom: 1px solid #000000;">
                <th style="width: 6%; border-right: 1px solid #000000; padding: 4px 2px; text-align: center;">S.No.</th>
                <th style="width: 44%; border-right: 1px solid #000000; padding: 4px 8px; text-align: center;">Particulars</th>
                <th style="width: 10%; border-right: 1px solid #000000; padding: 4px 2px; text-align: center;">HSN</th>
                <th style="width: 8%; border-right: 1px solid #000000; padding: 4px 2px; text-align: center;">Qty</th>
                <th style="width: 12%; border-right: 1px solid #000000; padding: 4px 6px; text-align: center;">Rate ₹</th>
                <th style="width: 8%; border-right: 1px solid #000000; padding: 4px 2px; text-align: center;">Per</th>
                <th style="width: 12%; padding: 4px 6px; text-align: center;">Total ₹</th>
              </tr>
            </thead>
            <tbody>
              ${productRowsHtml}

              <!-- Continuous Vertical Lines Spacer to fill the A4 page -->
              <tr style="height: ${spacerMinHeight}px;">
                <td style="border-right: 1px solid #000000;">&nbsp;</td>
                <td style="border-right: 1px solid #000000;">&nbsp;</td>
                <td style="border-right: 1px solid #000000;">&nbsp;</td>
                <td style="border-right: 1px solid #000000;">&nbsp;</td>
                <td style="border-right: 1px solid #000000;">&nbsp;</td>
                <td style="border-right: 1px solid #000000;">&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Row 4: Bottom Split Section: Transport Info Left | Totals & Signatory Right -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <tbody>
            <tr>
              <!-- Left Column: Transport Info & Amount in Words -->
              <td style="width: 63%; border-right: 1.5px solid #000000; padding: 6px 8px; vertical-align: top;">
                <div style="display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; height: 100%;">
                  <div>
                    <div style="font-weight: 700; margin-bottom: 4px; font-size: 11.5px;">
                      <u>Transport Info</u>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.45;">
                      <tbody>
                        <tr>
                          <td style="width: 120px; padding: 1px 0;">Despatched To</td>
                          <td style="padding: 1px 0;">: &nbsp;<strong>${despatchToDisplay}</strong></td>
                        </tr>
                        <tr>
                          <td style="padding: 1px 0;">Lorry Transport</td>
                          <td style="padding: 1px 0;">: &nbsp;<strong>${lorryTransportDisplay}</strong></td>
                        </tr>
                        <tr>
                          <td style="padding: 1px 0;">LR No</td>
                          <td style="padding: 1px 0;">: &nbsp;<strong>${lrNoDisplay}</strong></td>
                        </tr>
                        <tr>
                          <td style="padding: 1px 0;">Date</td>
                          <td style="padding: 1px 0;">: &nbsp;<strong>${lrDateDisplay}</strong></td>
                        </tr>
                        <tr>
                          <td style="padding: 1px 0;">Total Cases</td>
                          <td style="padding: 1px 0;">: &nbsp;<strong>${totalCasesDisplay}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style="margin-top: 12px; padding-top: 4px; font-size: 11.5px;">
                    Rupees : &nbsp;<strong>${wordsClean}</strong>
                  </div>
                </div>
              </td>

              <!-- Right Column: Calculations Table & Signatory -->
              <td style="width: 37%; padding: 0; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
                  <tbody>
                    <tr>
                      <td style="padding: 3px 8px; border-bottom: 1px solid #000000; border-right: 1px solid #000000; width: 55%;">
                        Sub Total
                      </td>
                      <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #000000; width: 45%;">
                        ${formatCur(subtotal)}
                      </td>
                    </tr>
                    ${discountAmount > 0 ? `
                    <tr>
                      <td style="padding: 3px 8px; border-bottom: 1px solid #000000; border-right: 1px solid #000000;">
                        Less : Discount (${discountPercent}%)
                      </td>
                      <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #000000;">
                        ${formatCur(discountAmount)}
                      </td>
                    </tr>` : ''}
                    ${packingAmount > 0 ? `
                    <tr>
                      <td style="padding: 3px 8px; border-bottom: 1px solid #000000; border-right: 1px solid #000000;">
                        ADD : P &amp; F (${packingPercent}%)
                      </td>
                      <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #000000;">
                        ${formatCur(packingAmount)}
                      </td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding: 3px 8px; border-bottom: 1px solid #000000; border-right: 1px solid #000000;">
                        CGST - ${cgstPct}%
                      </td>
                      <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #000000;">
                        ${formatCur(cgstAmt)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 3px 8px; border-bottom: 1px solid #000000; border-right: 1px solid #000000;">
                        SGST - ${sgstPct}%
                      </td>
                      <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #000000;">
                        ${formatCur(sgstAmt)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 3px 8px; border-bottom: 1px solid #000000; border-right: 1px solid #000000;">
                        IGST - ${igstPct}%
                      </td>
                      <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #000000;">
                        ${formatCur(igstAmt)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 8px; border-bottom: 1px solid #000000; border-right: 1px solid #000000; font-weight: 700; font-size: 12.5px;">
                        Net Amount
                      </td>
                      <td style="padding: 4px 8px; text-align: right; border-bottom: 1px solid #000000; font-weight: 700; font-size: 12.5px;">
                        ${formatCur(grandTotalNum)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- For Company Name & Signature space -->
                <div style="padding: 6px 8px; text-align: center;">
                  <div style="font-size: 11px; font-weight: 600; text-transform: none;">
                    For ${displayCompanyName}
                  </div>
                  <div style="height: 36px; display: flex; align-items: flex-end; justify-content: center;">
                    <!-- Space for signature -->
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Repeat for the requested number of copies
  const actualCopies = Math.max(1, copiesCount || 1);
  let pagesHtml = '';
  for (let i = 0; i < actualCopies; i++) {
    const copyTitle = copyLabels[i] || (bill.invoiceCopy || 'ORIGINAL');
    const isLast = i === actualCopies - 1;
    pagesHtml += `
      <div class="gst-print-copy ${!isLast ? 'page-break' : ''}">
        ${renderSingleInvoice(copyTitle)}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GST Tax Invoice #${bill.billNo || '1'} - ${displayCompanyName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 5mm 6mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff;
      color: #000000;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 11.5px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .gst-print-copy {
      width: 100%;
      box-sizing: border-box;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .bill-page-wrapper {
      width: 100%;
      min-height: 280mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .bill-box {
      border: 1.5px solid #000000;
      box-sizing: border-box;
      background-color: #ffffff;
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>
  `;
};

/**
 * Print GST Bill Directly using hidden iframe
 */
export const printGstBillDirectly = (bill: GstBillPrintData, copiesCount: number = 1) => {
  const htmlContent = generateGstBillHtml(bill, copiesCount);
  triggerBrowserPrint(htmlContent);
};

/**
 * =======================================================================
 * MASTER / BULK LIST PRINT GENERATORS (Standard A4 Format)
 * =======================================================================
 */

export const generateCustomerListPrintHtml = (
  customers: any[],
  reportTitle = 'CUSTOMERS MASTER LEDGER & BALANCES REPORT',
  dateRangeText?: string
): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'S.V.M FIREWORKS AGENCIES').toUpperCase();
  const compSub = storeSettings.tagline || `Wholesale & Retail Trading • ${storeSettings.city || 'Sivakasi'}`;
  const phoneVal = (storeSettings.phone && !storeSettings.phone.includes('98765')) ? storeSettings.phone : '9843067073, 8778429299';

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '-');
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let totalDebit = 0;
  let totalCredit = 0;
  let totalPendingDue = 0;
  let totalAdvanceHeld = 0;

  customers.forEach((c) => {
    const deb = c.totalDebit || 0;
    const cred = c.totalCredit || 0;
    const due = c.pendingDue || 0;
    const net = c.netBalance || 0;

    totalDebit += deb;
    totalCredit += cred;
    totalPendingDue += due;
    if (net > 0) totalAdvanceHeld += net;
  });

  const rowsHtml = customers.map((c, idx) => {
    const idDisplay = c.idCode || `#${(idx + 1).toString().padStart(4, '0')}`;
    const deb = (c.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const cred = (c.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    let balanceHtml = '';
    if ((c.pendingDue || 0) > 0) {
      balanceHtml = `<span style="color:#DC2626; font-weight:800;">₹ ${(c.pendingDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Due)</span>`;
    } else if ((c.netBalance || 0) > 0) {
      balanceHtml = `<span style="color:#0284C7; font-weight:800;">+₹ ${(c.netBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Adv)</span>`;
    } else {
      balanceHtml = `<span style="color:#16A34A; font-weight:700;">₹ 0.00 (Settled)</span>`;
    }

    return `
      <tr class="list-row">
        <td class="text-center" style="width: 35px;">${idx + 1}</td>
        <td class="text-center" style="width: 60px; font-weight:700; color:#475569;">${idDisplay}</td>
        <td style="font-weight:800; color:#0F172A;">
          ${c.name}
          ${c.gst && c.gst !== 'N/A' ? `<div style="font-size:9.5px; color:#64748B; font-weight:600;">GSTIN: ${c.gst}</div>` : ''}
        </td>
        <td style="font-size:11px; color:#334155; width:95px;">${c.mobile || '-'}</td>
        <td style="font-size:10.5px; color:#475569; max-width:180px;">${c.address || '-'}</td>
        <td class="text-right" style="font-weight:700; color:#1E293B; width:105px;">₹ ${deb}</td>
        <td class="text-right" style="font-weight:700; color:#16A34A; width:105px;">₹ ${cred}</td>
        <td class="text-right" style="width:130px;">${balanceHtml}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${reportTitle} - ${compName} - ${currentDate}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-container {
      width: 100%;
      padding: 6px;
    }
    .company-banner {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .comp-name {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.01em;
      color: #0B4DB7;
    }
    .comp-sub {
      font-size: 10.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .report-heading {
      font-size: 14.5px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 3px;
    }
    .date-badge {
      display: inline-block;
      background-color: #EFF6FF;
      color: #0B4DB7;
      border: 1px solid #BFDBFE;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #334155;
      line-height: 1.35;
    }
    .meta-bold {
      font-weight: 700;
      color: #000000;
    }
    .kpi-summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .kpi-card {
      border: 1px solid #CBD5E1;
      border-radius: 5px;
      padding: 6px 8px;
      background-color: #F8FAFC;
    }
    .kpi-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
    }
    .kpi-val {
      font-size: 13.5px;
      font-weight: 900;
      color: #0F172A;
      margin-top: 2px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      border: 1px solid #000000;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    tr {
      page-break-inside: avoid;
    }
    .data-table th {
      background-color: #F1F5F9;
      color: #0F172A;
      font-weight: 800;
      font-size: 10.5px;
      padding: 6px 5px;
      border: 1px solid #94A3B8;
      text-align: left;
      letter-spacing: 0.02em;
    }
    .data-table td {
      padding: 5px 5px;
      border: 1px solid #CBD5E1;
      vertical-align: middle;
    }
    .text-center {
      text-align: center !important;
    }
    .text-right {
      text-align: right !important;
    }
    .totals-row td {
      background-color: #F8FAFC;
      border-top: 2px solid #000000 !important;
      border-bottom: 2px solid #000000 !important;
      font-size: 11.5px;
      font-weight: 900;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 22px;
      padding: 0 15px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 160px;
    }
    .sig-line {
      border-top: 1px solid #000000;
      margin-bottom: 4px;
    }
    .sig-label {
      font-size: 10.5px;
      font-weight: 700;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header Banner -->
    <div class="company-banner">
      <div>
        <div class="comp-name">${compName}</div>
        <div class="comp-sub">${compSub}</div>
        <div class="report-heading">${reportTitle}</div>
        ${dateRangeText ? `<div class="date-badge">${dateRangeText}</div>` : ''}
      </div>
      <div class="meta-box">
        <div>Generated: <span class="meta-bold">${currentDate} ${currentTime}</span></div>
        <div>Total Records: <span class="meta-bold">${customers.length} Customers</span></div>
        <div>Phone: ${phoneVal}</div>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="kpi-summary-grid">
      <div class="kpi-card">
        <div class="kpi-title">Total Customers</div>
        <div class="kpi-val">${customers.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Total Debit (Purchases)</div>
        <div class="kpi-val">₹ ${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Total Credit (Paid)</div>
        <div class="kpi-val" style="color:#16A34A;">₹ ${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card" style="background-color:#FEF2F2; border-color:#FECACA;">
        <div class="kpi-title" style="color:#991B1B;">Total Pending Due</div>
        <div class="kpi-val" style="color:#DC2626;">₹ ${totalPendingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card" style="background-color:#F0F9FF; border-color:#BAE6FD;">
        <div class="kpi-title" style="color:#0369A1;">Total Advance Balances</div>
        <div class="kpi-val" style="color:#0284C7;">₹ ${totalAdvanceHeld.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
    </div>

    <!-- Master Customer Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 35px;">#</th>
          <th class="text-center" style="width: 60px;">ID</th>
          <th>Customer Name</th>
          <th style="width: 95px;">Mobile</th>
          <th>Address</th>
          <th class="text-right" style="width: 105px;">Debit (Dr)</th>
          <th class="text-right" style="width: 105px;">Credit (Cr)</th>
          <th class="text-right" style="width: 130px;">Net Balance / Status</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="8" class="text-center" style="padding: 20px;">No customer records found for the selected range.</td></tr>'}
      </tbody>
      <tfoot>
        <tr class="totals-row">
          <td colspan="5" class="text-right" style="padding-right: 10px;">GRAND TOTALS (${customers.length} Customers):</td>
          <td class="text-right">₹ ${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right" style="color:#16A34A;">₹ ${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">
            ${totalPendingDue > 0
      ? `<span style="color:#DC2626;">Due: ₹ ${totalPendingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>`
      : `<span style="color:#16A34A;">Settled</span>`
    }
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Signature Section -->
    <div class="signature-section">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Prepared By</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Checked & Verified By</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

export const printCustomerListDirectly = (customers: any[], reportTitle?: string, dateRangeText?: string) => {
  const htmlContent = generateCustomerListPrintHtml(customers, reportTitle, dateRangeText);
  triggerBrowserPrint(htmlContent);
};

/**
 * Print Customer Account Statement / Ledger History (A4 Standard)
 */
export const generateLedgerStatementHtml = (
  customerName: string,
  ledgerEntries: any[],
  dateRangeText?: string
): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'S.V.M FIREWORKS AGENCIES').toUpperCase();
  const compSub = storeSettings.tagline || `Wholesale & Retail Trading • ${storeSettings.city || 'Sivakasi'}`;

  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  let totalDeb = 0;
  let totalCred = 0;

  const rowsHtml = ledgerEntries.map((entry, idx) => {
    const deb = parseFloat(String(entry.debit || '0').replace(/,/g, '')) || 0;
    const cred = parseFloat(String(entry.credit || '0').replace(/,/g, '')) || 0;
    totalDeb += deb;
    totalCred += cred;

    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center">${entry.date || '-'}</td>
        <td style="font-weight:700;">${entry.billNo ? `Bill #${entry.billNo}` : entry.type || 'PAYMENT'}</td>
        <td>${entry.companyName || '-'}</td>
        <td class="text-right" style="color:#1E293B; font-weight:700;">${deb > 0 ? `₹ ${deb.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
        <td class="text-right" style="color:#16A34A; font-weight:700;">${cred > 0 ? `₹ ${cred.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
        <td class="text-right" style="font-weight:800;">₹ ${entry.balance || '0.00'}</td>
      </tr>
    `;
  }).join('');

  const netBalance = totalCred - totalDeb;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Account Statement - ${customerName} - ${compName}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; margin:0; padding:10px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 900; color: #0B4DB7; }
    .sub { font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase; }
    .date-badge { display: inline-block; background: #EFF6FF; color: #0B4DB7; border: 1px solid #BFDBFE; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-top: 4px; }
    .table { width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #000; margin-top: 8px; }
    .table th { background: #F1F5F9; border: 1px solid #94A3B8; padding: 6px; font-weight: 800; font-size: 11px; }
    .table td { border: 1px solid #CBD5E1; padding: 5px 6px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals td { background: #F8FAFC; border-top: 2px solid #000; font-weight: 800; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${compName}</div>
      <div class="sub">${compSub}</div>
      <h2 style="font-size:15px; margin-top:4px;">ACCOUNT STATEMENT: ${customerName}</h2>
      ${dateRangeText ? `<div class="date-badge">${dateRangeText}</div>` : ''}
    </div>
    <div style="text-align:right; font-size:11.5px;">
      <div>Generated: <b>${currentDate}</b></div>
      <div>Total Entries: <b>${ledgerEntries.length}</b></div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th class="text-center" style="width:35px;">#</th>
        <th class="text-center" style="width:85px;">Date</th>
        <th>Particulars / Bill No</th>
        <th>Company</th>
        <th class="text-right" style="width:110px;">Debit (Dr)</th>
        <th class="text-right" style="width:110px;">Credit (Cr)</th>
        <th class="text-right" style="width:120px;">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" class="text-center" style="padding:18px;">No transaction entries found for the selected period.</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="totals">
        <td colspan="4" class="text-right">TOTALS:</td>
        <td class="text-right">₹ ${totalDeb.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td class="text-right" style="color:#16A34A;">₹ ${totalCred.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td class="text-right" style="color:${netBalance < 0 ? '#DC2626' : '#16A34A'};">
          ₹ ${Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${netBalance < 0 ? 'Dr' : 'Cr'}
        </td>
      </tr>
    </tfoot>
  </table>
</body>
</html>
  `;
};

export const printLedgerStatementDirectly = (customerName: string, ledgerEntries: any[], dateRangeText?: string) => {
  const htmlContent = generateLedgerStatementHtml(customerName, ledgerEntries, dateRangeText);
  triggerBrowserPrint(htmlContent);
};

/**
 * Print Particulars Bills Master List (A4 Standard)
 */
export const generateParticularsListPrintHtml = (particulars: any[], dateRangeText?: string): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'S.V.M FIREWORKS AGENCIES').toUpperCase();
  const compSub = storeSettings.tagline || `Wholesale & Retail Trading • ${storeSettings.city || 'Sivakasi'}`;

  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  let totalSum = 0;

  const rowsHtml = particulars.map((p, idx) => {
    const amt = parseFloat(String(p.total || p.amount || '0').replace(/,/g, '')) || 0;
    totalSum += amt;
    const countItems = (p.products || []).length;
    const billCompName = (p.companyName && p.companyName.trim() !== '' && p.companyName !== 'General')
      ? p.companyName
      : storeSettings.companyName || '-';

    return `
      <tr>
        <td class="text-center" style="width:35px;">${idx + 1}</td>
        <td class="text-center" style="font-weight:800; color:#0B4DB7; width:75px;">#${p.billNo || '-'}</td>
        <td class="text-center" style="width:85px;">${p.date || '-'}</td>
        <td style="font-weight:700;">${p.customerName || '-'}</td>
        <td>${billCompName}</td>
        <td class="text-center" style="width:60px;">${p.caseCount || '-'}</td>
        <td class="text-center" style="width:75px;">${countItems} items</td>
        <td class="text-right" style="font-weight:800; width:120px;">₹ ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Particulars Bills Master Report - ${compName} - ${currentDate}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; margin:0; padding:10px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 900; color: #0B4DB7; }
    .date-badge { display: inline-block; background: #EFF6FF; color: #0B4DB7; border: 1px solid #BFDBFE; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-top: 4px; }
    .table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000; margin-top: 8px; }
    .table th { background: #F1F5F9; border: 1px solid #94A3B8; padding: 6px; font-weight: 800; }
    .table td { border: 1px solid #CBD5E1; padding: 5px 6px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals td { background: #F8FAFC; border-top: 2px solid #000; font-weight: 900; font-size: 11.5px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${compName}</div>
      <div style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase;">${compSub}</div>
      <h2 style="font-size:15px; margin-top:4px;">PARTICULARS BILLS MASTER REPORT</h2>
      ${dateRangeText ? `<div class="date-badge">${dateRangeText}</div>` : ''}
    </div>
    <div style="text-align:right; font-size:11.5px;">
      <div>Generated: <b>${currentDate}</b></div>
      <div>Total Bills: <b>${particulars.length}</b></div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th class="text-center" style="width:35px;">#</th>
        <th class="text-center" style="width:75px;">Bill No</th>
        <th class="text-center" style="width:85px;">Date</th>
        <th>Customer Name</th>
        <th>Company</th>
        <th class="text-center" style="width:60px;">Cases</th>
        <th class="text-center" style="width:75px;">Products</th>
        <th class="text-right" style="width:120px;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" class="text-center" style="padding:18px;">No bill records found for the selected period.</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="totals">
        <td colspan="7" class="text-right">GRAND TOTAL (${particulars.length} Bills):</td>
        <td class="text-right">₹ ${totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>
  `;
};

export const printParticularsListDirectly = (particulars: any[], dateRangeText?: string) => {
  const htmlContent = generateParticularsListPrintHtml(particulars, dateRangeText);
  triggerBrowserPrint(htmlContent);
};

/**
 * Print Companies List (A4 Standard)
 */
export const generateCompaniesListPrintHtml = (companies: any[]): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'S.V.M FIREWORKS AGENCIES').toUpperCase();
  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const rowsHtml = companies.map((c, idx) => `
    <tr>
      <td class="text-center" style="width:40px;">${idx + 1}</td>
      <td style="font-weight:700; color:#0F172A;">${c.name}</td>
      <td style="color:#334155;">${c.gstin || '-'}</td>
      <td style="color:#475569;">${c.address || '-'}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Companies List - ${compName} - ${currentDate}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin:0; padding:10px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .table { width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #000; }
    .table th { background: #F1F5F9; border: 1px solid #94A3B8; padding: 7px; font-weight: 800; }
    .table td { border: 1px solid #CBD5E1; padding: 6px; }
    .text-center { text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:24px; font-weight:900; color:#0B4DB7;">${compName}</div>
      <h2 style="font-size:15px;">COMPANIES DIRECTORY</h2>
    </div>
    <div style="text-align:right; font-size:11.5px;">
      <div>Date: <b>${currentDate}</b></div>
      <div>Total Companies: <b>${companies.length}</b></div>
    </div>
  </div>
  <table class="table">
    <thead>
      <tr>
        <th class="text-center">#</th>
        <th>Company Name</th>
        <th>GSTIN</th>
        <th>Address</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="4" class="text-center">No companies found.</td></tr>'}
    </tbody>
  </table>
</body>
</html>
  `;
};

export const printCompaniesListDirectly = (companies: any[]) => {
  const htmlContent = generateCompaniesListPrintHtml(companies);
  triggerBrowserPrint(htmlContent);
};

/**
 * Print Products List (A4 Standard)
 */
export const generateProductsListPrintHtml = (products: any[], categoryTitle?: string, typeTitle?: string): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'S.V.M FIREWORKS AGENCIES').toUpperCase();
  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const catTitle = categoryTitle && categoryTitle !== 'ALL' ? ` - ${categoryTitle}` : '';
  const modeTitle = typeTitle && typeTitle !== 'ALL' ? ` [${typeTitle.toUpperCase()}]` : '';

  const rowsHtml = products.map((p, idx) => `
    <tr>
      <td class="text-center" style="width:35px;">${typeTitle === 'ALL' ? idx + 1 : (p.slNo || idx + 1)}</td>
      <td style="font-weight:700; color:#0F172A;">${p.name}</td>
      <td style="color:#1E40AF; font-weight:600;">${p.category || 'General'}</td>
      <td class="text-center" style="color:#475569;">${p.unit || 'Box'}</td>
      <td class="text-center" style="font-weight:600; font-size:10.5px; color:#4338CA;">${p.productType || 'Retail'}</td>
      <td style="text-align:right; color:#64748B;">${p.mrp ? '₹' + Number(p.mrp).toFixed(2) : '-'}</td>
      <td style="text-align:right; font-weight:700; color:#0F172A;">₹${(parseFloat(p.rate) || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Products Catalog${modeTitle} - ${compName} - ${currentDate}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin:0; padding:10px; color:#0F172A; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #94A3B8; }
    .table th { background: #F1F5F9; border: 1px solid #94A3B8; padding: 6px; font-weight: 800; font-size:11px; }
    .table td { border: 1px solid #CBD5E1; padding: 5px 6px; }
    .text-center { text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:22px; font-weight:900; color:#0B4DB7; letter-spacing:0.02em;">${compName}</div>
      <h2 style="font-size:14px; margin:3px 0 0 0; color:#1E293B;">PRODUCT MASTER CATALOG${modeTitle}${catTitle}</h2>
    </div>
    <div style="text-align:right; font-size:11px; color:#334155;">
      <div>Date: <b>${currentDate}</b></div>
      <div>Total Products: <b>${products.length}</b></div>
    </div>
  </div>
  <table class="table">
    <thead>
      <tr>
        <th class="text-center" style="width:35px;">S.No</th>
        <th style="text-align:left;">Product Name</th>
        <th style="text-align:left; width:130px;">Category</th>
        <th class="text-center" style="width:60px;">Unit</th>
        <th class="text-center" style="width:75px;">Type</th>
        <th style="text-align:right; width:80px;">MRP</th>
        <th style="text-align:right; width:90px;">Rate</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" class="text-center" style="padding:15px; color:#64748B;">No products found.</td></tr>'}
    </tbody>
  </table>
</body>
</html>
  `;
};

export const printProductsListDirectly = (products: any[], categoryTitle?: string, typeTitle?: string) => {
  const htmlContent = generateProductsListPrintHtml(products, categoryTitle, typeTitle);
  triggerBrowserPrint(htmlContent);
};

/**
 * Reusable hidden-iframe print helper with image loading support
 */
const triggerBrowserPrint = (htmlContent: string) => {
  // Clean up any existing iframe to avoid stale listeners or stacked frames
  const existingIframe = document.getElementById('apsara-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'apsara-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    let hasPrinted = false;
    let safetyTimeout: ReturnType<typeof setTimeout> | null = null;

    const doPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;

      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Print error:', err);
        }
      }, 150);
    };

    // Wait for all images in the print document to load
    const images = Array.from(doc.images);
    if (images.length === 0) {
      doPrint();
    } else {
      let loaded = 0;
      const total = images.length;
      const checkAllLoaded = () => {
        loaded++;
        if (loaded >= total) {
          doPrint();
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          checkAllLoaded();
        } else {
          img.onload = checkAllLoaded;
          img.onerror = checkAllLoaded;
        }
      });

      // Safety timeout in case any image takes too long or fails
      safetyTimeout = setTimeout(doPrint, 1200);
    }
  }
};
