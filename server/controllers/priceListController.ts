import type { Request, Response } from 'express';
import PriceList from '../models/PriceList';
import Category from '../models/Category';
import { Product } from '../models/Product';

// Helper to remove noise words and standardize names
const cleanToEnglish = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[^\x00-\x7F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeName = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s\-_/\\|.,()[\]{}'"]+/g, ' ').trim();
};

// Helper: Auto-sync newly imported or created items into Categories and Products
const syncCategoriesAndProducts = async (items: any[]) => {
  try {
    const categoriesSet = new Set<string>();
    items.forEach((item) => {
      const cat = cleanToEnglish(String(item.category || '')).trim();
      if (cat && cat.length >= 2) {
        categoriesSet.add(cat);
      }
    });

    // 1. Sync Categories
    for (const catName of categoriesSet) {
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (!existing) {
        const catCount = await Category.countDocuments();
        const colors = ['#DC2626', '#D97706', '#2563EB', '#059669', '#7C3AED', '#DB2777', '#EA580C', '#4B5563'];
        await Category.create({
          name: catName,
          code: catName.substring(0, 3).toUpperCase(),
          color: colors[catCount % colors.length],
          displayOrder: catCount + 1,
        });
      }
    }

    // 2. Sync Products
    const existingProducts = await Product.find({});
    const existingProdMap = new Map<string, any>();
    existingProducts.forEach((p) => {
      existingProdMap.set((p.name || '').toLowerCase().trim(), p);
      existingProdMap.set(normalizeName(p.name || ''), p);
    });

    let maxSlNo = existingProducts.length > 0 ? Math.max(...existingProducts.map((p) => p.slNo || 0)) : 0;

    for (const item of items) {
      const cleanName = cleanToEnglish(String(item.itemName || '')).trim();
      if (!cleanName) continue;

      const nameKey = cleanName.toLowerCase();
      if (!nameKey) continue;

      const rateVal = Number(item.rate || item.price || 0);
      const mrpVal = Number(item.mrp || 0);
      const unitVal = cleanToEnglish(String(item.unit || 'Box')) || 'Box';
      const catVal = cleanToEnglish(String(item.category || 'General')) || 'General';

      if (existingProdMap.has(nameKey)) {
        // Update product rate/category
        const existing = existingProdMap.get(nameKey);
        if (existing) {
          await Product.findByIdAndUpdate(existing._id, {
            category: catVal,
            rate: rateVal,
            mrp: mrpVal,
            unit: unitVal,
          });
        }
      } else {
        // Insert new product
        maxSlNo += 1;
        const created = await Product.create({
          slNo: maxSlNo,
          name: cleanName,
          category: catVal,
          rate: rateVal,
          mrp: mrpVal,
          unit: unitVal,
        });
        existingProdMap.set(nameKey, created);
      }
    }
  } catch (syncErr) {
    console.error('[Sync Error] Failed to sync categories and products:', syncErr);
  }
};

export const getPriceList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    const filter: any = {};

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { itemName: { $regex: String(search), $options: 'i' } },
        { category: { $regex: String(search), $options: 'i' } },
        { batchName: { $regex: String(search), $options: 'i' } },
      ];
    }

    const items = await PriceList.find(filter).lean().sort({ slNo: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error while fetching price list',
    });
  }
};

export const createPriceListItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemName, category, unit, mrp, discountPercent, rate, effectiveDate, batchName, slNo } = req.body;

    if (!itemName || !itemName.trim()) {
      res.status(400).json({ success: false, error: 'Item name is required' });
      return;
    }

    const nextSlNo = slNo || (await PriceList.countDocuments()) + 1;

    const item = await PriceList.create({
      slNo: nextSlNo,
      itemName: itemName.trim(),
      category: category || 'General',
      unit: unit || 'Box',
      mrp: Number(mrp) || 0,
      discountPercent: Number(discountPercent) || 0,
      rate: Number(rate) || 0,
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      batchName: batchName || 'Manual Entry',
    });

    // Auto-sync category and product
    await syncCategoriesAndProducts([item]);

    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const bulkImportPriceList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, batchName, replaceExisting } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'No items provided for import' });
      return;
    }

    if (replaceExisting) {
      await PriceList.deleteMany({});
      await Product.deleteMany({});
    }

    const currentCount = replaceExisting ? 0 : await PriceList.countDocuments();
    const batchTitle = batchName || `Upload-${new Date().toLocaleDateString('en-GB')}`;

    const formattedItems = items.map((item: any, idx: number) => {
      return {
        slNo: item.slNo || currentCount + idx + 1,
        itemName: cleanToEnglish(String(item.itemName || item.name || item['Product Name'] || item['Item Name'] || '')),
        category: cleanToEnglish(String(item.category || item.Category || 'General')) || 'General',
        unit: cleanToEnglish(String(item.unit || item.Unit || 'Box')) || 'Box',
        mrp: Number(item.mrp || item.MRP || item['M.R.P'] || 0),
        discountPercent: Number(item.discountPercent || item.discount || item['Discount %'] || 0),
        rate: Number(item.rate || item.price || item.Rate || item['Net Rate'] || item['Selling Price'] || 0),
        effectiveDate: item.effectiveDate || new Date().toISOString().split('T')[0],
        batchName: batchTitle,
      };
    }).filter((i: any) => Boolean(i.itemName));

    if (formattedItems.length === 0) {
      res.status(400).json({ success: false, error: 'No valid items with names found in the uploaded file' });
      return;
    }

    const inserted = await PriceList.insertMany(formattedItems);

    // Auto-sync into Categories and Products collections
    await syncCategoriesAndProducts(formattedItems);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} price list items, and synced Categories & Products!`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePriceListItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const oldItem = await PriceList.findById(req.params.id);
    if (!oldItem) {
      res.status(404).json({ success: false, error: 'Price item not found' });
      return;
    }

    const { shopStock, godownStock, stock, ...updatePayload } = req.body;

    const item = await PriceList.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'Price item not found' });
      return;
    }

    // Auto sync update to product
    await syncCategoriesAndProducts([item]);

    res.status(200).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePriceListItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await PriceList.findByIdAndDelete(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Price item not found' });
      return;
    }

    // Auto-delete matching product from Products collection!
    const escapedName = item.itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await Product.deleteMany({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });

    res.status(200).json({ success: true, message: `Price item "${item.itemName}" and matching product deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePriceListBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchName } = req.params;
    if (!batchName) {
      res.status(400).json({ success: false, error: 'Batch name is required' });
      return;
    }

    const itemsToDelete = await PriceList.find({ batchName });
    const itemNames = itemsToDelete.map((i) => i.itemName.trim());

    await PriceList.deleteMany({ batchName });

    if (itemNames.length > 0) {
      await Product.deleteMany({
        name: { $in: itemNames },
      });
    }

    res.status(200).json({
      success: true,
      message: `Deleted ${itemsToDelete.length} items from batch "${batchName}" and removed them from Products catalog.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const clearAllPriceList = async (_req: Request, res: Response): Promise<void> => {
  try {
    await PriceList.deleteMany({});
    await Product.deleteMany({});
    res.status(200).json({ success: true, message: 'All price list items and products cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
