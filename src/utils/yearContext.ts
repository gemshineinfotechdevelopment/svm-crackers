/**
 * Year Management Utilities for Financial/Calendar Year Billing & Products
 */

const SELECTED_YEAR_STORAGE_KEY = 'apsara_selected_year';
export const YEAR_CHANGE_EVENT = 'apsara_year_changed';

/**
 * Get current system year as number
 */
export const getCurrentSystemYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Get currently selected active year from localStorage or default to system year
 */
export const getActiveBillingYear = (): number => {
  try {
    const saved = localStorage.getItem(SELECTED_YEAR_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return getCurrentSystemYear();
};

/**
 * Set active billing year and notify all listening components
 */
export const setActiveBillingYear = (year: number): void => {
  try {
    localStorage.setItem(SELECTED_YEAR_STORAGE_KEY, String(year));
    window.dispatchEvent(new CustomEvent(YEAR_CHANGE_EVENT, { detail: { year } }));
  } catch (err) {
    console.error('Failed to set active billing year:', err);
  }
};

/**
 * Generate standard list of years including recent past, current, and near future
 */
export const getStandardYearOptions = (): number[] => {
  const current = getCurrentSystemYear();
  const start = 2023; // or earlier
  const end = Math.max(current + 2, 2028);
  const years: number[] = [];
  for (let y = end; y >= start; y--) {
    years.push(y);
  }
  return years;
};

/**
 * Check if a date string matches a specific year
 * Supported formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, ISO string
 */
export const validateDateMatchesYear = (dateStr: string, targetYear: number): boolean => {
  if (!dateStr) return true;
  
  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch && dmyMatch[3]) {
    return parseInt(dmyMatch[3], 10) === targetYear;
  }
  
  // YYYY-MM-DD
  const ymdMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch && ymdMatch[1]) {
    return parseInt(ymdMatch[1], 10) === targetYear;
  }
  
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.getFullYear() === targetYear;
  }
  
  return true;
};
