// Billing Multi-Session and Draft Persistence Manager

export interface ParticularDraftSession {
  id: string;
  title: string;
  mode: 'ESTIMATE' | 'QUOTATION';
  customerNo: string;
  billDate: string;
  billNo: string;
  rateType: string;
  customerGst: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  companyName: string;
  productRows: Array<{
    id: string;
    particular: string;
    quantity: string;
    rate: string;
    pktUnit: string;
    amount: string;
  }>;
  discountPercent: string;
  discountRs: string;
  packingRs: string;
  packingPercent: string;
  remarks: string;
  paymentMode: string;
  selectedYear?: number;
  lastUpdated: number;
}

export interface GstDraftSession {
  id: string;
  title: string;
  billNo: string;
  billDate: string;
  customerName: string;
  customerPhone?: string;
  customerMobile?: string;
  customerAddress: string;
  customerGst: string;
  customerAadhar: string;
  despatchedTo: string;
  lorryTransport: string;
  lrNo: string;
  lrDate: string;
  totalCases?: string;
  productRows: Array<{
    id: string;
    code?: string;
    particular: string;
    hsnCode?: string;
    quantity: string;
    unit: string;
    rate: string;
    amount: string;
  }>;
  taxPercent: string;
  taxType: 'CGST_SGST' | 'IGST' | string;
  billFlag?: boolean;
  selectedYear?: number;
  lastUpdated: number;
}

const PARTICULAR_SESSIONS_PREFIX = 'svm_particular_sessions_';
const GST_SESSIONS_PREFIX = 'svm_gst_sessions_';

// Particular / Quotation Sessions
export const getParticularSessions = (mode: 'ESTIMATE' | 'QUOTATION'): { sessions: ParticularDraftSession[]; activeId: string } => {
  try {
    const raw = localStorage.getItem(`${PARTICULAR_SESSIONS_PREFIX}${mode.toLowerCase()}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
        return {
          sessions: parsed.sessions,
          activeId: parsed.activeId || parsed.sessions[0].id,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading particular sessions:', err);
  }

  const defaultSession: ParticularDraftSession = {
    id: `session_${Date.now()}_1`,
    title: mode === 'QUOTATION' ? 'Quotation 1' : 'Bill 1',
    mode,
    customerNo: '',
    billDate: '',
    billNo: '',
    rateType: 'Befor Rate',
    customerGst: '',
    customerName: '',
    customerMobile: '',
    customerAddress: '',
    companyName: '',
    productRows: [{ id: '1', particular: '', pktUnit: '1 Box', rate: '0', quantity: '1', amount: '0' }],
    discountPercent: '0',
    discountRs: '0',
    packingRs: '',
    packingPercent: '',
    remarks: '',
    paymentMode: 'Cash',
    lastUpdated: Date.now(),
  };

  return { sessions: [defaultSession], activeId: defaultSession.id };
};

export const saveParticularSessions = (mode: 'ESTIMATE' | 'QUOTATION', sessions: ParticularDraftSession[], activeId: string) => {
  try {
    localStorage.setItem(
      `${PARTICULAR_SESSIONS_PREFIX}${mode.toLowerCase()}`,
      JSON.stringify({ sessions, activeId })
    );
  } catch (err) {
    console.warn('Error saving particular sessions:', err);
  }
};

// GST Bill Sessions
export const getGstSessions = (): { sessions: GstDraftSession[]; activeId: string } => {
  try {
    const raw = localStorage.getItem(GST_SESSIONS_PREFIX);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
        return {
          sessions: parsed.sessions,
          activeId: parsed.activeId || parsed.sessions[0].id,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading GST sessions:', err);
  }

  const defaultSession: GstDraftSession = {
    id: `gst_session_${Date.now()}_1`,
    title: 'Tax Bill 1',
    billNo: '',
    billDate: '',
    customerName: '',
    customerPhone: '',
    customerMobile: '',
    customerAddress: '',
    customerGst: '',
    customerAadhar: '',
    despatchedTo: '',
    lorryTransport: '',
    lrNo: '',
    lrDate: '',
    totalCases: '0',
    productRows: [
      { id: '1', code: '', particular: '', hsnCode: '3604', quantity: '', unit: 'Case', rate: '', amount: '0' },
    ],
    taxPercent: '18',
    taxType: 'IGST',
    billFlag: true,
    lastUpdated: Date.now(),
  };

  return { sessions: [defaultSession], activeId: defaultSession.id };
};

export const saveGstSessions = (sessions: GstDraftSession[], activeId: string) => {
  try {
    localStorage.setItem(
      GST_SESSIONS_PREFIX,
      JSON.stringify({ sessions, activeId })
    );
  } catch (err) {
    console.warn('Error saving GST sessions:', err);
  }
};
