/**
 * Centralized API Service for Apsara Crackers
 * Automatically resolves and normalizes backend base URL from Vite environment variables.
 */

const getApiBaseUrl = (): string => {
  // Check for standard VITE_API_URL or legacy VITE_API_BASE_URL
  const rawUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).trim();

  // If explicit URL is provided in .env
  if (rawUrl) {
    if (rawUrl.startsWith('/')) {
      return rawUrl.replace(/\/+$/, '');
    }
    const sanitized = rawUrl.replace(/\/+$/, '');
    return sanitized.endsWith('/api') ? sanitized : `${sanitized}/api`;
  }

  // If in browser on production domain (e.g. apsara-crackers.gemshine.tech)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }

  // Default to local backend server on Port 5015
  return 'http://localhost:5015/api';
};

export const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data: T;
  error?: string;
  message?: string;
}

// Generic Request Helper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  // Retrieve auth token if stored
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('apsara_auth_token')
    : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let json: any = {};
    const text = await response.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { error: text };
      }
    }

    if (!response.ok) {
      throw new Error(json.error || json.message || `HTTP error! Status: ${response.status}`);
    }

    return json.data !== undefined ? json.data : json;
  } catch (error) {
    console.error(`[API Error] Request to ${endpoint} failed:`, error);
    throw error;
  }
}

// Customers API
export const CustomersApi = {
  getAll: (year?: number | string) => request<any[]>(year ? `/customers?year=${year}` : '/customers'),
  getById: (id: string) => request<any>(`/customers/${id}`),
  create: (data: any) => request<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/customers/${id}`, { method: 'DELETE' }),
};

// Companies API
export const CompaniesApi = {
  getAll: () => request<any[]>('/companies'),
  getById: (id: string) => request<any>(`/companies/${id}`),
  create: (data: any) => request<any>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/companies/${id}`, { method: 'DELETE' }),
};

export const ProductsApi = {
  getAll: (searchOrYear?: string | number, yearParam?: string | number, typeParam?: string) => {
    const query = new URLSearchParams();
    let search: string | undefined;
    let year: string | number | undefined;
    let type: string | undefined = typeParam;

    if (typeof searchOrYear === 'number' || (typeof searchOrYear === 'string' && /^\d{4}$/.test(searchOrYear.trim()))) {
      year = searchOrYear;
    } else if (typeof searchOrYear === 'string') {
      if (['Retail', 'Wholesale', 'Both', 'ALL'].includes(searchOrYear.trim())) {
        type = searchOrYear.trim();
        year = yearParam;
      } else {
        search = searchOrYear;
        year = yearParam;
      }
    } else {
      year = yearParam;
    }

    if (search && search.trim() !== '') query.append('search', search.trim());
    if (year !== undefined && year !== null && String(year).toUpperCase() !== 'ALL') {
      query.append('year', String(year));
    }
    if (type && type !== 'ALL') {
      query.append('type', type);
    }
    const qs = query.toString();
    return request<any[]>(`/products${qs ? `?${qs}` : ''}`);
  },
  getById: (id: string) => request<any>(`/products/${id}`),
  create: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: string[]) => request<any>('/products/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkImport: (data: { items: any[]; defaultType?: string; replaceExisting?: boolean }) =>
    request<any>('/products/bulk-import', { method: 'POST', body: JSON.stringify(data) }),
};

// Categories API
export const CategoriesApi = {
  getAll: () => request<any[]>('/categories'),
  getById: (id: string) => request<any>(`/categories/${id}`),
  create: (data: any) => request<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/categories/${id}`, { method: 'DELETE' }),
  clearAll: () => request<any>('/categories/clear/all', { method: 'DELETE' }),
};

// Price Lists API
export const PriceListsApi = {
  getAll: (params?: { category?: string; search?: string; year?: number | string }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.year !== undefined && params?.year !== null && String(params.year).toUpperCase() !== 'ALL') {
      query.append('year', String(params.year));
    }
    const queryString = query.toString();
    return request<any[]>(`/pricelists${queryString ? `?${queryString}` : ''}`);
  },
  create: (data: any) => request<any>('/pricelists', { method: 'POST', body: JSON.stringify(data) }),
  bulkImport: (data: { items: any[]; batchName?: string; replaceExisting?: boolean; year?: number }) =>
    request<any>('/pricelists/bulk', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/pricelists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/pricelists/${id}`, { method: 'DELETE' }),
  deleteBatch: (batchName: string) => request<any>(`/pricelists/batch/${encodeURIComponent(batchName)}`, { method: 'DELETE' }),
  clearAll: () => request<any>('/pricelists/clear/all', { method: 'DELETE' }),
};

// Particulars API
export const ParticularsApi = {
  getAll: (customerName?: string, billType?: 'REGULAR' | 'GST' | 'QUOTATION' | 'ESTIMATE' | 'ALL' | string, year?: number | string) => {
    const params = new URLSearchParams();
    if (customerName && customerName !== 'ALL') params.append('customerName', customerName);
    if (billType && billType !== 'ALL') params.append('billType', billType);
    if (year !== undefined && year !== null && String(year).toUpperCase() !== 'ALL') params.append('year', String(year));
    const qs = params.toString();
    return request<any[]>(`/particulars${qs ? `?${qs}` : ''}`);
  },
  getNextBillNo: (type?: string, year?: number | string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (year !== undefined && year !== null && year !== 'ALL') params.append('year', String(year));
    const qs = params.toString();
    return request<{ nextBillNo: string }>(`/particulars/next-bill-no${qs ? `?${qs}` : ''}`);
  },
  getCustomerHistory: (customerName: string, currentYear?: number) => {
    const params = new URLSearchParams();
    if (currentYear) params.append('currentYear', String(currentYear));
    const qs = params.toString();
    return request<{
      hasPreviousBills: boolean;
      currentYear: number;
      previousYears: { year: number; billCount: number }[];
    }>(`/particulars/customer/${encodeURIComponent(customerName)}/history${qs ? `?${qs}` : ''}`);
  },
  getById: (id: string) => request<any>(`/particulars/${id}`),
  create: (data: any) => request<any>('/particulars', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/particulars/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/particulars/${id}`, { method: 'DELETE' }),
  convertToBill: (id: string) => request<any>(`/particulars/${id}/convert-to-bill`, { method: 'POST' }),
  bulkDuplicate: (data: { templateBill: any; customers: any[]; year?: number | string }) =>
    request<{ success: boolean; message: string; count: number; data: any[]; billNos: string[] }>('/particulars/bulk-duplicate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadPdf: (id: string, pdfData: string, pdfName: string) =>
    request<any>(`/particulars/${id}/pdf`, {
      method: 'POST',
      body: JSON.stringify({ pdfData, pdfName }),
    }),
  deletePdf: (id: string) =>
    request<any>(`/particulars/${id}/pdf`, {
      method: 'DELETE',
    }),
};

// Account / Ledger API
export const AccountsApi = {
  getAll: (customerName?: string) =>
    request<any[]>(`/accounts${customerName && customerName !== 'ALL' ? `?customerName=${encodeURIComponent(customerName)}` : ''}`),
  addCredit: (data: { customerName: string; companyName: string; creditAmount: string; date: string }) =>
    request<any>('/accounts/credit', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/accounts/${id}`, { method: 'DELETE' }),
};

// Auth API
export const AuthApi = {
  login: (credentials: { username: string; password: string }) =>
    request<{ token: string; user: { username: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => request<any>('/auth/me'),
};

// Settings API
export const SettingsApi = {
  get: () => request<any>('/settings'),
  update: (data: any) =>
    request<any>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Health Check API
export const HealthApi = {
  check: () => request<{ status: string; message: string; port?: number | string; timestamp: string }>('/health'),
  ping: async (): Promise<{ connected: boolean; url: string; error?: string }> => {
    try {
      await request('/health');
      return { connected: true, url: API_BASE_URL };
    } catch (err: any) {
      return { connected: false, url: API_BASE_URL, error: err?.message || 'Connection failed' };
    }
  },
};
