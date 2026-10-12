/**
 * Centralized Product Utilities for SVM Fireworks
 * Guarantees that only Retail sales products from Product Master are used
 * in Estimate, Quotation, and Tax Bill (GST Bill), with strictly unique serial numbers (no duplicates).
 */

export interface RetailProductItem {
  id: string;
  _id?: string;
  slNo: number;
  code: string;
  sku: string;
  name: string;
  category: string;
  rate: number;
  mrp: number;
  unit: string;
  qty?: number;
  pcs?: number;
  productType: string;
  hsn?: string;
  year?: number;
}

/**
 * Filters and normalizes products to strictly Retail sales products from Product Master,
 * guaranteeing 100% strictly unique serial numbers (slNo) with zero duplicates.
 *
 * Sorting: Ascending order by slNo (1, 2, 3...)
 */
export function getNormalizedRetailProducts(rawProducts: any[]): RetailProductItem[] {
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    return [];
  }

  // 1. Only include products belonging to Product Master "Retail" or "Both"
  const retailOnly = rawProducts.filter(
    (p: any) => !p.productType || p.productType === 'Retail' || p.productType === 'Both'
  );

  // 2. Guarantee 100% strictly UNIQUE serial number (slNo) starting from 1 with zero duplicates
  const usedSlNos = new Set<number>();
  let nextAvailable = 1;

  // First pass: register unique positive integer slNos
  const deduplicated = retailOnly.map((p) => {
    const rawNum = Number(p.slNo);
    if (Number.isInteger(rawNum) && rawNum > 0 && !usedSlNos.has(rawNum)) {
      usedSlNos.add(rawNum);
      return { p, slNo: rawNum };
    }
    return { p, slNo: -1 };
  });

  // Second pass: assign next available unique number to collisions or missing slNos
  const result: RetailProductItem[] = deduplicated.map(({ p, slNo }) => {
    let finalSlNo = slNo;
    if (finalSlNo === -1) {
      while (usedSlNos.has(nextAvailable)) {
        nextAvailable++;
      }
      finalSlNo = nextAvailable;
      usedSlNos.add(finalSlNo);
    }

    const id = String(p._id || p.id || `retail-${finalSlNo}`);
    const name = String(p.name || '').trim();
    const rate = typeof p.rate === 'number' ? p.rate : parseFloat(p.rate) || 0;
    const mrp = typeof p.mrp === 'number' ? p.mrp : parseFloat(p.mrp) || rate;
    const unit = String(p.unit || '1 Box').trim() || '1 Box';
    const category = String(p.category || 'General').trim() || 'General';
    const hsn = String(p.hsn || '3604').trim() || '3604';

    return {
      _id: id,
      id,
      slNo: finalSlNo,
      code: String(finalSlNo),
      sku: String(p.sku || finalSlNo),
      name,
      category,
      rate,
      mrp,
      unit,
      qty: typeof p.qty === 'number' && p.qty > 0 ? p.qty : 1,
      pcs: typeof p.pcs === 'number' && p.pcs >= 0 ? p.pcs : (Number(p.pcs) || 0),
      productType: p.productType || 'Retail',
      hsn,
      year: p.year ? Number(p.year) : undefined,
    };
  });

  // Sort ascending by serial number (1, 2, 3...)
  return result.sort((a, b) => a.slNo - b.slNo);
}

/**
 * Lookup helper to find a retail product by exact S.No, code, or sku
 */
export function findRetailProductByCode<T extends { slNo?: number | string; code?: string; sku?: string; name?: string }>(
  codeOrNo: string | number | undefined | null,
  options: T[]
): T | undefined {
  if (codeOrNo === undefined || codeOrNo === null) return undefined;
  const raw = String(codeOrNo).trim().toLowerCase();
  if (!raw) return undefined;

  const num = parseInt(raw, 10);

  // 1. Exact numeric match by slNo or code integer
  if (!isNaN(num)) {
    const foundNum = options.find((p) => {
      const pSlNo = p.slNo !== undefined ? Number(p.slNo) : NaN;
      const pCodeNum = p.code ? parseInt(p.code, 10) : NaN;
      return pSlNo === num || pCodeNum === num;
    });
    if (foundNum) return foundNum;
  }

  // 2. Exact string match by code, sku, or slNo
  const foundStr = options.find((p) => {
    const pCode = p.code ? String(p.code).trim().toLowerCase() : '';
    const pSku = p.sku ? String(p.sku).trim().toLowerCase() : '';
    const pSlNo = p.slNo !== undefined ? String(p.slNo).trim().toLowerCase() : '';
    return pCode === raw || pSku === raw || pSlNo === raw;
  });
  if (foundStr) return foundStr;

  // 3. Name exact match
  return options.find((p) => p.name && p.name.trim().toLowerCase() === raw);
}
