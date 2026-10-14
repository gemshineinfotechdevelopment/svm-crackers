import { PriceMapsApi, type PriceMapRecord, type PriceMapRateItem } from '../services/api';

export const DEFAULT_PRICE_MAP_NAMES = ['SVM', 'MSK', 'Manjula', 'Gift', 'MPS'];

export const REFERENCE_RETAIL_PRODUCTS: PriceMapRateItem[] = [];

export const PRICEMAP_CHANGE_EVENT = 'svm_pricemaps_updated';

const getStorageKey = (year?: number | string) => `svm_pricemaps_${year || 'all'}`;

export const getLocalPriceMaps = (year?: number | string): PriceMapRecord[] => {
  try {
    const raw = localStorage.getItem(getStorageKey(year));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse price maps from localStorage', e);
  }

  // Fallback defaults with strictly empty rates (rates must come strictly from database)
  return DEFAULT_PRICE_MAP_NAMES.map((name) => ({
    name,
    year: year || new Date().getFullYear(),
    rates: [],
  }));
};

export const saveLocalPriceMaps = (maps: PriceMapRecord[], year?: number | string) => {
  try {
    localStorage.setItem(getStorageKey(year), JSON.stringify(maps));
    window.dispatchEvent(new CustomEvent(PRICEMAP_CHANGE_EVENT, { detail: { maps, year } }));
  } catch (e) {
    console.warn('Failed to save price maps to localStorage', e);
  }
};

export const fetchPriceMaps = async (year?: number | string): Promise<PriceMapRecord[]> => {
  try {
    const res = await PriceMapsApi.getAll(year);
    const data = Array.isArray(res) ? res : (res as any)?.data || [];
    if (data.length > 0) {
      saveLocalPriceMaps(data, year);
      return data;
    }
  } catch (err) {
    console.warn('API call failed for PriceMaps, falling back to local storage:', err);
  }
  return getLocalPriceMaps(year);
};

export const syncPriceMaps = async (maps: PriceMapRecord[], year?: number | string): Promise<boolean> => {
  saveLocalPriceMaps(maps, year);
  try {
    await PriceMapsApi.saveAll(maps, year);
    return true;
  } catch (err) {
    console.warn('Could not sync PriceMaps to remote API:', err);
    return false;
  }
};

/**
 * Completely removes a product from ALL price maps in local storage & triggers updates
 */
export const removeProductFromAllPriceMaps = (
  productId?: string,
  productName?: string,
  year?: number | string
): PriceMapRecord[] => {
  const cleanName = (productName || '').trim().toLowerCase();
  const idStr = productId ? String(productId) : '';
  const maps = getLocalPriceMaps(year);

  const updated = maps.map((pm) => ({
    ...pm,
    rates: (pm.rates || []).filter((r) => {
      const idMatches = Boolean(idStr && r.productId && String(r.productId) === idStr);
      const nameMatches = Boolean(cleanName && r.productName && r.productName.trim().toLowerCase() === cleanName);
      return !idMatches && !nameMatches;
    }),
  }));

  saveLocalPriceMaps(updated, year);
  return updated;
};

/**
 * Updates a product in ALL price maps while strictly preserving each price map's individual custom rate
 */
export const updateProductInAllPriceMaps = (
  product: { id?: string; _id?: string; name: string; slNo: number; qty?: number; rate?: number },
  oldName?: string,
  year?: number | string
): PriceMapRecord[] => {
  const idStr = String(product._id || product.id || '');
  const cleanName = product.name.trim();
  const oldClean = (oldName || cleanName).trim().toLowerCase();
  const maps = getLocalPriceMaps(year);

  const updated = maps.map((pm) => {
    const rates = pm.rates || [];
    let found = false;
    const updatedRates = rates.map((r) => {
      const isMatch =
        (idStr && r.productId && String(r.productId) === idStr) ||
        (r.productName && r.productName.trim().toLowerCase() === oldClean) ||
        (Number(r.code) === Number(product.slNo));

      if (isMatch) {
        found = true;
        return {
          ...r,
          productId: idStr || r.productId,
          productName: cleanName,
          code: product.slNo,
          quantity: product.qty || 1,
          rate: (r.rate !== undefined && r.rate !== null && r.rate > 0) ? r.rate : (product.rate || 0),
        };
      }
      return r;
    });

    if (!found) {
      updatedRates.push({
        productId: idStr,
        code: product.slNo,
        productName: cleanName,
        quantity: product.qty || 1,
        rate: product.rate || 0,
      });
    }

    updatedRates.sort((a, b) => Number(a.code) - Number(b.code));
    return { ...pm, rates: updatedRates };
  });

  saveLocalPriceMaps(updated, year);
  return updated;
};

/**
 * Adds a new product to ALL price maps with initial rate
 */
export const addProductToAllPriceMaps = (
  product: { id?: string; _id?: string; name: string; slNo: number; qty?: number; rate?: number },
  year?: number | string
): PriceMapRecord[] => {
  const idStr = String(product._id || product.id || '');
  const cleanName = product.name.trim();
  const maps = getLocalPriceMaps(year);

  const updated = maps.map((pm) => {
    const rates = pm.rates || [];
    const exists = rates.some(
      (r) =>
        (idStr && r.productId && String(r.productId) === idStr) ||
        (r.productName && r.productName.trim().toLowerCase() === cleanName.toLowerCase())
    );

    if (exists) {
      return pm;
    }

    const newRates = [
      ...rates,
      {
        productId: idStr,
        code: product.slNo,
        productName: cleanName,
        quantity: product.qty || 1,
        rate: product.rate || 0,
      },
    ].sort((a, b) => Number(a.code) - Number(b.code));

    return { ...pm, rates: newRates };
  });

  saveLocalPriceMaps(updated, year);
  return updated;
};

