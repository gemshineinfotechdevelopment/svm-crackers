import type { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import PriceList from '../models/PriceList';

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, search } = req.query;
    const filter: any = {};

    if (year && typeof year === 'string' && year.trim() !== '' && year.toLowerCase() !== 'all') {
      const yearStr = year.trim();
      const yearNum = parseInt(yearStr, 10);
      if (!isNaN(yearNum)) {
        const startOfYear = new Date(Date.UTC(yearNum, 0, 1, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));
        filter.$or = [
          { year: yearNum },
          { year: yearStr },
          { createdAt: { $gte: startOfYear, $lte: endOfYear } },
        ];
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchFilter = { name: { $regex: search.trim(), $options: 'i' } };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, searchFilter];
        delete filter.$or;
      } else {
        filter.name = searchFilter.name;
      }
    }

    const products = await Product.find(filter).lean().sort({ slNo: 1, createdAt: 1 });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.status(200).json({ success: true, data: p });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentSystemYear = new Date().getFullYear();
    const selectedViewYear = req.body.selectedViewYear || req.body.viewYear || req.query.viewYear;

    // Security Restriction: Product creation ONLY allowed in current system year
    if (selectedViewYear && Number(selectedViewYear) !== currentSystemYear) {
      res.status(400).json({
        success: false,
        message: `Previous Year Selected: You are currently viewing ${selectedViewYear} data. New products can only be added to the current system year (${currentSystemYear}). Please switch to ${currentSystemYear} before adding a new product.`,
        error: 'Product creation is only allowed in the current system year.',
      });
      return;
    }

    const { shopStock, godownStock, stock, selectedViewYear: _v, viewYear: _vy, ...rest } = req.body;
    rest.year = rest.year ? Number(rest.year) : currentSystemYear;
    if (!rest.slNo) {
      const highestSl = await Product.findOne().sort({ slNo: -1 });
      rest.slNo = (highestSl?.slNo || 0) + 1;
    }

    const product = await Product.create(rest);

    // Sync to PriceList
    try {
      const cleanName = (product.name || '').trim();
      if (cleanName) {
        const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`^${escapedName}$`, 'i');
        const targetYear = rest.year;
        const existingPriceItem = await PriceList.findOne({
          itemName: { $regex: nameRegex },
          $or: [{ year: targetYear }, { year: String(targetYear) }],
        });
        if (!existingPriceItem) {
          await PriceList.create({
            slNo: product.slNo,
            itemName: cleanName,
            category: product.category || 'General',
            unit: product.unit || 'Box',
            rate: product.rate || 0,
            mrp: product.mrp || 0,
            year: targetYear,
          });
        }
      }
    } catch (e) {
      console.warn('[Sync Warning] Could not sync new product to price list:', e);
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const oldName = oldProduct.name;
    const { shopStock, godownStock, stock, ...updatePayload } = req.body;

    const product = await Product.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    // Sync update to PriceList
    try {
      const escapedOldName = oldName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await PriceList.updateMany(
        { itemName: { $regex: new RegExp(`^${escapedOldName}$`, 'i') } },
        {
          ...(product.name && { itemName: product.name.trim() }),
          ...(product.category && { category: product.category }),
          ...(product.unit && { unit: product.unit }),
          ...(product.rate !== undefined && { rate: Number(product.rate) }),
          ...(product.mrp !== undefined && { mrp: Number(product.mrp) }),
        }
      );
    } catch (syncErr) {
      console.warn('[Product Update Sync Warning]:', syncErr);
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    // Also remove from PriceList if present
    try {
      if (product.name) {
        const escapedName = product.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        await PriceList.deleteMany({ itemName: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
      }
    } catch (err) {
      console.warn('[Delete Product Sync Warning]:', err);
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'Please provide an array of product IDs' });
      return;
    }

    const prodsToDelete = await Product.find({ _id: { $in: ids } }).select('name');
    const names = prodsToDelete.map((p) => p.name).filter(Boolean);

    await Product.deleteMany({ _id: { $in: ids } });

    // Sync bulk delete to PriceList
    try {
      if (names.length > 0) {
        await PriceList.deleteMany({ itemName: { $in: names } });
      }
    } catch (err) {
      console.warn('[Bulk Delete Product Sync Warning]:', err);
    }

    res.status(200).json({ success: true, message: `${ids.length} products deleted successfully` });
  } catch (error) {
    next(error);
  }
};
