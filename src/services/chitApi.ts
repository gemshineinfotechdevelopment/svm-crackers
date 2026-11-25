import { API_BASE_URL } from './api';

export interface ChitCustomerItem {
  _id?: string;
  chitCustomerId: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  status: 'Active' | 'Inactive' | 'Closed';
  allocationsCount?: number;
  totalPersons?: number;
  totalMonthly?: number;
  totalValue?: number;
  schemes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChitInstallmentItem {
  _id?: string;
  installmentNumber: number;
  monthLabel: string;
  dueDate: string;
  dueDateStr: string;
  amountDue: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'Pending' | 'Partial' | 'Paid';
  lastPaymentDate?: string | null;
  lastPaymentDateStr?: string | null;
}

export interface ChitAllocationItem {
  _id?: string;
  allocationId: string;
  chitCustomerId: string;
  schemeName: string;
  monthlyAmountPerPerson: number;
  personCount: number;
  totalMonthlyAmount: number;
  duration: number;
  startMonth: string;
  dueDay: number;
  totalChitValue: number;
  bonusDetails?: string;
  giftDetails?: string;
  status: 'Active' | 'Completed' | 'Closed';
  installments: ChitInstallmentItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ChitPaymentItem {
  _id?: string;
  paymentId: string;
  chitCustomerId: string;
  allocationId: string;
  installmentNumber: number;
  paymentMonth: string;
  amountDue: number;
  amountReceived: number;
  paymentDate: string;
  paymentDateStr: string;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer';
  transactionReference?: string;
  paymentTimingStatus: 'On Time' | 'Advance' | 'Delay';
  notes?: string;
  receiptId: string;
  createdAt?: string;
}

export interface ChitReceiptItem {
  _id?: string;
  receiptNumber: string;
  paymentId: string;
  chitCustomerId: string;
  allocationId: string;
  receiptDataSnapshot: any;
  createdAt?: string;
}

export interface ChitSchemeItem {
  _id?: string;
  schemeId: string;
  schemeName: string;
  startDate: string;
  durationMonths: number;
  monthlyAmount: number;
  dueDay: number;
  totalValue: number;
  status: 'Active' | 'Inactive' | 'Completed';
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChitDashboardData {
  totalCustomers: number;
  activeCustomers: number;
  totalPersons: number;
  expectedMonthly: number;
  totalCollected: number;
  totalPending: number;
}

export interface ChitCollectionRow {
  chitCustomerId: string;
  customerName: string;
  mobile: string;
  city?: string;
  address?: string;
  totalPersons: number;
  monthlyInstallment: number;
  totalChitValue: number;
  totalPaid: number;
  remainingAmount: number;
  paidMonths: number;
  pendingMonths: number;
  paymentStatus: 'Fully Paid' | 'Partially Paid' | 'Pending';
  customerStatus: string;
  allocationsCount: number;
  schemes: string[];
}

export interface CustomerCollectionDetailsData {
  customer: ChitCustomerItem;
  summary: {
    totalPersons: number;
    combinedMonthlyAmount: number;
    totalChitValue: number;
    totalPaid: number;
    totalRemaining: number;
  };
  allocations: ChitAllocationItem[];
  payments: ChitPaymentItem[];
}

async function chitRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}/chits${normalized}`;

  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('svm_auth_token') || localStorage.getItem('svm_auth_token'))
    : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }

  if (!response.ok) {
    throw new Error(json.error || json.message || `Request failed with status ${response.status}`);
  }

  return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
}

export const ChitsApi = {
  getDashboard: () => chitRequest<ChitDashboardData>('/dashboard'),

  // Customers
  getCustomers: (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString();
    return chitRequest<any>(`/customers${qs ? `?${qs}` : ''}`);
  },

  getCustomerById: (id: string) => chitRequest<ChitCustomerItem & { allocations: ChitAllocationItem[] }>(`/customers/${id}`),

  createCustomer: (data: {
    name: string;
    mobile: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    city?: string;
    notes?: string;
    scheme?: any;
    schemes?: any[];
  }) => chitRequest<ChitCustomerItem>('/customers', { method: 'POST', body: JSON.stringify(data) }),

  updateCustomer: (id: string, data: Partial<ChitCustomerItem>) =>
    chitRequest<ChitCustomerItem>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Allocations
  allocateSchemes: (data: { chitCustomerId: string; schemes: any[] }) =>
    chitRequest<ChitAllocationItem[]>('/allocations', { method: 'POST', body: JSON.stringify(data) }),

  getCustomerAllocations: (customerId: string) =>
    chitRequest<ChitAllocationItem[]>(`/allocations/customer/${customerId}`),

  updateAllocationStatus: (allocationId: string, status: 'Active' | 'Completed' | 'Closed') =>
    chitRequest<ChitAllocationItem>(`/allocations/${allocationId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Collections
  getCollections: (params?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    scheme?: string;
    month?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    if (params?.paymentStatus && params.paymentStatus !== 'All') q.append('paymentStatus', params.paymentStatus);
    if (params?.scheme && params.scheme !== 'All') q.append('scheme', params.scheme);
    if (params?.month && params.month !== 'All') q.append('month', params.month);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString();
    return chitRequest<any>(`/collections${qs ? `?${qs}` : ''}`);
  },

  getCustomerCollectionDetails: (customerId: string) =>
    chitRequest<CustomerCollectionDetailsData>(`/collections/${customerId}`),

  // Payments & Receipts
  recordPayment: (data: {
    chitCustomerId: string;
    allocationId: string;
    installmentNumber: number;
    amountReceived: number;
    paymentDate?: string;
    paymentMode?: 'Cash' | 'UPI' | 'Bank Transfer';
    transactionReference?: string;
    notes?: string;
  }) =>
    chitRequest<{ payment: ChitPaymentItem; receipt: ChitReceiptItem; allocation: ChitAllocationItem }>(
      '/payments',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  getCustomerPaymentHistory: (customerId: string) =>
    chitRequest<ChitPaymentItem[]>(`/payments/customer/${customerId}`),

  getReceipt: (receiptNumber: string) => chitRequest<ChitReceiptItem>(`/receipts/${receiptNumber}`),

  // Schemes Master
  getSchemes: (params?: { search?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    const qs = q.toString();
    return chitRequest<ChitSchemeItem[]>(`/schemes${qs ? `?${qs}` : ''}`);
  },

  getSchemeById: (id: string) => chitRequest<ChitSchemeItem>(`/schemes/${id}`),

  createScheme: (data: {
    schemeName: string;
    startDate: string;
    durationMonths: number;
    monthlyAmount: number;
    dueDay: number;
    status?: 'Active' | 'Inactive' | 'Completed';
    description?: string;
  }) => chitRequest<ChitSchemeItem>('/schemes', { method: 'POST', body: JSON.stringify(data) }),

  updateScheme: (id: string, data: Partial<ChitSchemeItem>) =>
    chitRequest<ChitSchemeItem>(`/schemes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteScheme: (id: string) =>
    chitRequest<{ success: boolean; message: string }>(`/schemes/${id}`, { method: 'DELETE' }),
};
