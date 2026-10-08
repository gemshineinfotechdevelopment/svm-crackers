/**
 * Annual Bill Year Switcher Utility
 * Manages view-filtering year selection without changing system or billing dates.
 */

export interface BillYearOption {
  year: string;
  isFuture: boolean;
  label: string;
}

export const getSelectedBillYear = (systemYear?: string): string => {
  const currentSysYear = systemYear || new Date().getFullYear().toString();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('apsara_selected_bill_year');
      if (saved) {
        const yearNum = parseInt(saved, 10);
        const sysYearNum = parseInt(currentSysYear, 10);
        // Only return saved year if it is a valid integer and <= current system year
        if (!isNaN(yearNum) && yearNum <= sysYearNum) {
          return saved;
        }
      }
    }
  } catch (e) {
    console.error('Failed to read selected bill year from localStorage:', e);
  }
  return currentSysYear;
};

export const setSelectedBillYear = (
  year: string,
  systemYear?: string
): { success: boolean; message: string; year: string } => {
  const currentSysYear = systemYear || new Date().getFullYear().toString();
  const yearNum = parseInt(year, 10);
  const sysYearNum = parseInt(currentSysYear, 10);

  if (isNaN(yearNum) || yearNum > sysYearNum) {
    const msg = `${year} billing year is not available yet. The system is currently in ${currentSysYear}.`;
    return {
      success: false,
      message: msg,
      year: getSelectedBillYear(currentSysYear),
    };
  }

  if (typeof window !== 'undefined') {
    if (window.localStorage) {
      localStorage.setItem('apsara_selected_bill_year', year);
    }
    window.dispatchEvent(new CustomEvent('apsara_bill_year_changed', { detail: { year } }));
  }

  return {
    success: true,
    message: `Viewing bills for ${year}`,
    year,
  };
};

export const getAvailableBillViewYears = (systemYearStr?: string): BillYearOption[] => {
  const currentSysYear = parseInt(systemYearStr || new Date().getFullYear().toString(), 10);
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
