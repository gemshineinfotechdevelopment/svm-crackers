// @ts-ignore
import html2pdf from 'html2pdf.js';

export interface BillShareOptions {
  billNo: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: string | number;
  date?: string;
  companyName?: string;
  isGst?: boolean;
}

/**
 * Generate PDF blob from an HTMLElement using html2pdf.js
 */
export const generatePdfBlob = async (element: HTMLElement, filename: string): Promise<Blob> => {
  const opt = {
    margin: [4, 5, 4, 5] as [number, number, number, number],
    filename: filename,
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

  const worker = html2pdf().set(opt).from(element);
  const pdfBlob: Blob = await worker.outputPdf('blob');
  return pdfBlob;
};

/**
 * Direct PDF File Download
 */
export const downloadBillAsPdf = async (
  element: HTMLElement,
  options: BillShareOptions
): Promise<void> => {
  const prefix = options.isGst ? 'GST_Tax_Invoice' : 'Invoice';
  const filename = `${prefix}_${options.billNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  const opt = {
    margin: [4, 5, 4, 5] as [number, number, number, number],
    filename: filename,
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

  await html2pdf().set(opt).from(element).save();
};

/**
 * Share Bill via WhatsApp as PDF:
 * 1. Generates the PDF from the bill DOM element.
 * 2. If navigator.share supports files (Mobile devices / Web Share API), opens native share sheet directly targeting WhatsApp with the PDF file attached!
 * 3. Fallback for Desktop / non-supported browsers: Downloads the PDF directly and opens WhatsApp with a pre-formatted message.
 */
export const shareBillViaWhatsApp = async (
  element: HTMLElement,
  options: BillShareOptions
): Promise<{ success: boolean; method: 'web-share' | 'download-whatsapp' }> => {
  const prefix = options.isGst ? 'GST_Tax_Invoice' : 'Invoice';
  const cleanBillNo = options.billNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${prefix}_#${cleanBillNo}.pdf`;

  // 1. Generate the PDF Blob
  const pdfBlob = await generatePdfBlob(element, filename);
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  const compName = options.companyName || (options.isGst ? 'S.V.M FIREWORKS AGENCIES' : 'S.V.M FIREWORKS AGENCIES');
  const formattedAmt = typeof options.totalAmount === 'number'
    ? options.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(options.totalAmount);

  const shareText = `*${compName}*\n` +
    `🧾 ${options.isGst ? 'Tax Invoice' : 'Bill'} No: *#${options.billNo}*\n` +
    `👤 Customer: *${options.customerName}*\n` +
    (options.date ? `📅 Date: ${options.date}\n` : '') +
    `💰 Total: *₹${formattedAmt}*`;

  // 2. Check if native Web Share with Files is supported (Android Chrome, iOS Safari, etc.)
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: `${compName} - Invoice #${options.billNo}`,
        text: shareText,
      });
      return { success: true, method: 'web-share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'web-share' };
      }
      console.warn('Native share failed, falling back to download + WhatsApp link', err);
    }
  }

  // 3. Desktop / Browser Fallback: Download PDF & open WhatsApp Web/App
  // Trigger file download
  const blobUrl = URL.createObjectURL(pdfBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

  // Clean customer phone number
  let rawPhone = (options.customerPhone || '').replace(/\D/g, '');
  if (rawPhone.length === 10) {
    rawPhone = '91' + rawPhone;
  }
  const phoneParam = rawPhone ? `phone=${rawPhone}&` : '';

  const waMessage = encodeURIComponent(
    `${shareText}\n\n` +
    `📄 *Your Invoice PDF (${filename}) has been downloaded to your device.* Please attach it in this chat.`
  );

  const waUrl = `https://api.whatsapp.com/send?${phoneParam}text=${waMessage}`;
  window.open(waUrl, '_blank');

  return { success: true, method: 'download-whatsapp' };
};
