import { Particular } from '../models/Particular';
import { Product } from '../models/Product';
import PriceList from '../models/PriceList';
import { Inventory } from '../models/Inventory';

/**
 * Robust helper to extract year from various date string formats or fallback to current year.
 */
export const extractYearFromDate = (dateStr: string | Date | undefined, fallbackYear = new Date().getFullYear()): number => {
  if (!dateStr) return fallbackYear;
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    return isNaN(y) ? fallbackYear : y;
  }
  const clean = String(dateStr).trim();

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^\d{1,2}[-/]\d{1,2}[-/](\d{4})/);
  if (dmyMatch) {
    const y = parseInt(dmyMatch[1], 10);
    if (!isNaN(y) && y >= 2000 && y <= 2100) return y;
  }

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})[-/]\d{1,2}[-/]\d{1,2}/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    if (!isNaN(y) && y >= 2000 && y <= 2100) return y;
  }

  // Try standard parse
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    const y = new Date(parsed).getFullYear();
    if (y >= 2000 && y <= 2100) return y;
  }

  return fallbackYear;
};

/**
 * Calculates Indian Financial Year starting year (April 1 to March 31).
 * Example: 01-04-2026 to 31-03-2027 => 2026
 * On 01-04-2027, advances to 2027 and restarts bill numbering from 1.
 */
export const getFinancialYear = (
  dateStr?: string | Date | undefined,
  fallbackYear = new Date().getFullYear()
): number => {
  if (!dateStr) {
    const now = new Date();
    return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  }
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    if (isNaN(y)) return fallbackYear;
    return dateStr.getMonth() < 3 ? y - 1 : y;
  }
  const clean = String(dateStr).trim();

  // Format: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    let y = parseInt(dmyMatch[3], 10);
    if (y < 100) y += 2000;
    const m = parseInt(dmyMatch[2], 10) - 1; // 0 = Jan, 1 = Feb, 2 = Mar, 3 = Apr
    if (!isNaN(y) && !isNaN(m)) {
      return m < 3 ? y - 1 : y;
    }
  }

  // Format: YYYY-MM-DD, YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    if (!isNaN(y) && !isNaN(m)) {
      return m < 3 ? y - 1 : y;
    }
  }

  // Fallback to standard parse
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const m = d.getMonth();
    return m < 3 ? y - 1 : y;
  }

  return fallbackYear;
};

/**
 * Safe database backfill to populate `year` field on historical records without changing any other data.
 */
export const backfillMissingYears = async (): Promise<void> => {
  try {
    const currentYear = new Date().getFullYear();

    // 1. Backfill Particulars (Bills)
    const unassignedBills = await Particular.find({
      $or: [{ year: { $exists: false } }, { year: null }, { year: 0 }],
    });

    if (unassignedBills.length > 0) {
      console.log(`[Backfill] Backfilling year for ${unassignedBills.length} bills...`);
      for (const bill of unassignedBills) {
        const derivedYear = extractYearFromDate(bill.date || bill.createdAt, currentYear);
        bill.year = derivedYear;
        await bill.save();
      }
      console.log(`[Backfill] Completed bill year backfill.`);
    }

    // 2. Backfill Products
    const unassignedProducts = await Product.find({
      $or: [{ year: { $exists: false } }, { year: null }, { year: 0 }],
    });

    if (unassignedProducts.length > 0) {
      console.log(`[Backfill] Backfilling year for ${unassignedProducts.length} products...`);
      for (const prod of unassignedProducts) {
        const derivedYear = extractYearFromDate(prod.createdAt, currentYear);
        prod.year = derivedYear;
        await prod.save();
      }
      console.log(`[Backfill] Completed product year backfill.`);
    }

    // 3. Backfill PriceLists
    const unassignedPriceLists = await PriceList.find({
      $or: [{ year: { $exists: false } }, { year: null }, { year: 0 }],
    });

    if (unassignedPriceLists.length > 0) {
      console.log(`[Backfill] Backfilling year for ${unassignedPriceLists.length} price list items...`);
      for (const item of unassignedPriceLists) {
        const derivedYear = extractYearFromDate(item.effectiveDate || item.createdAt, currentYear);
        item.year = derivedYear;
        await item.save();
      }
      console.log(`[Backfill] Completed price list year backfill.`);
    }

    // 4. Backfill Inventories
    const unassignedInventories = await Inventory.find({
      $or: [{ year: { $exists: false } }, { year: null }, { year: 0 }],
    });

    if (unassignedInventories.length > 0) {
      for (const inv of unassignedInventories) {
        inv.year = extractYearFromDate(inv.createdAt, currentYear);
        await inv.save();
      }
    }
  } catch (err) {
    console.warn('[Backfill Warning] Failed to complete year backfilling:', err);
  }
};
