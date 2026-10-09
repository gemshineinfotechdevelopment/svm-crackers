/**
 * Single Unified Year Management Utilities for Financial/Calendar Year Billing & Products
 */

export const SELECTED_YEAR_STORAGE_KEY = 'apsara_selected_year';
export const SELECTED_BILL_YEAR_STORAGE_KEY = 'apsara_selected_bill_year';
export const YEAR_CHANGE_EVENT = 'apsara_year_changed';
export const BILL_YEAR_CHANGE_EVENT = 'apsara_bill_year_changed';

export interface BillYearOption {
  year: string;
  isFuture: boolean;
  label: string;
}

/**
 * Get current system year as number
 */
export const getCurrentSystemYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Get currently selected active year as number (dynamically follows system calendar year)
 */
export const getActiveBillingYear = (): number => {
  const currentSysYear = getCurrentSystemYear();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(SELECTED_YEAR_STORAGE_KEY) || localStorage.getItem(SELECTED_BILL_YEAR_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 2000 && parsed <= currentSysYear + 2) {
          return parsed;
        }
      }
    }
  } catch {
    // fallback
  }
  return currentSysYear;
};

/**
 * Get currently selected active year as string
 */
export const getSelectedBillYear = (systemYear?: string): string => {
  const currentSysYear = systemYear || getCurrentSystemYear().toString();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(SELECTED_BILL_YEAR_STORAGE_KEY) || localStorage.getItem(SELECTED_YEAR_STORAGE_KEY);
      if (saved) {
        const yearNum = parseInt(saved, 10);
        const sysYearNum = parseInt(currentSysYear, 10);
        if (!isNaN(yearNum) && yearNum <= sysYearNum && yearNum >= 2000 && yearNum <= sysYearNum + 2) {
          return saved;
        }
      }
    }
  } catch (e) {
    console.error('Failed to read selected bill year from localStorage:', e);
  }
  return currentSysYear;
};

/**
 * Set active billing year and notify all listening components
 */
export const setActiveBillingYear = (year: number | string): void => {
  try {
    const yearStr = String(year);
    const yearNum = parseInt(yearStr, 10);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SELECTED_YEAR_STORAGE_KEY, yearStr);
      localStorage.setItem(SELECTED_BILL_YEAR_STORAGE_KEY, yearStr);
      window.dispatchEvent(new CustomEvent(YEAR_CHANGE_EVENT, { detail: { year: yearNum } }));
      window.dispatchEvent(new CustomEvent(BILL_YEAR_CHANGE_EVENT, { detail: { year: yearStr } }));
    }
  } catch (err) {
    console.error('Failed to set active billing year:', err);
  }
};

/**
 * Set selected bill year (alias for setSelectedBillYear with structured return)
 */
export const setSelectedBillYear = (
  year: string | number,
  systemYear?: string
): { success: boolean; message: string; year: string } => {
  const currentSysYear = systemYear || getCurrentSystemYear().toString();
  const yearStr = String(year);
  const yearNum = parseInt(yearStr, 10);
  const sysYearNum = parseInt(currentSysYear, 10);

  if (isNaN(yearNum) || yearNum > sysYearNum) {
    const msg = `${yearStr} billing year is not available yet. The system is currently in ${currentSysYear}.`;
    return {
      success: false,
      message: msg,
      year: getSelectedBillYear(currentSysYear),
    };
  }

  setActiveBillingYear(yearNum);

  return {
    success: true,
    message: `Viewing bills for ${yearStr}`,
    year: yearStr,
  };
};

/**
 * Generate standard list of years dynamically based on current system year
 */
export const getStandardYearOptions = (): number[] => {
  const current = getCurrentSystemYear();
  const start = Math.min(2023, current - 3);
  const end = current + 1;
  const years: number[] = [];
  for (let y = end; y >= start; y--) {
    years.push(y);
  }
  return years;
};

/**
 * Get available bill view years with future status labels
 */
export const getAvailableBillViewYears = (systemYearStr?: string): BillYearOption[] => {
  const currentSysYear = parseInt(systemYearStr || getCurrentSystemYear().toString(), 10);
  const startYear = Math.min(2023, currentSysYear - 3);
  const options: BillYearOption[] = [];

  // Historical and current system years (selectable)
  for (let y = startYear; y <= currentSysYear; y++) {
    options.push({
      year: y.toString(),
      isFuture: false,
      label: y === currentSysYear ? `${y} (Current System Year)` : `${y}`,
    });
  }

  // Future years (blocked / disabled)
  for (let y = currentSysYear + 1; y <= currentSysYear + 2; y++) {
    options.push({
      year: y.toString(),
      isFuture: true,
      label: `${y} (Future Year)`,
    });
  }

  return options;
};

/**
 * Check if a date string matches a specific year
 * Supported formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, ISO string
 */
export const validateDateMatchesYear = (dateStr: string, targetYear: number | string): boolean => {
  if (!dateStr) return true;
  const target = typeof targetYear === 'number' ? targetYear : parseInt(targetYear, 10);
  if (isNaN(target)) return true;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch && dmyMatch[3]) {
    return parseInt(dmyMatch[3], 10) === target;
  }

  // YYYY-MM-DD
  const ymdMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch && ymdMatch[1]) {
    return parseInt(ymdMatch[1], 10) === target;
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.getFullYear() === target;
  }

  return true;
};
