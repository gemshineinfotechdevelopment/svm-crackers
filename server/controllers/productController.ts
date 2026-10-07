import type { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import PriceList from '../models/PriceList';

export const getProducts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await Product.find().lean().sort({ slNo: 1, createdAt: 1 });
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
    const { shopStock, godownStock, stock, ...rest } = req.body;
    const product = await Product.create(rest);

    // Sync to PriceList
    try {
      const cleanName = (product.name || '').trim();
      if (cleanName) {
        const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`^${escapedName}$`, 'i');
        const existingPriceItem = await PriceList.findOne({ itemName: { $regex: nameRegex } });
        if (!existingPriceItem) {
          await PriceList.create({
            slNo: product.slNo,
            itemName: cleanName,
            category: product.category || 'General',
            unit: product.unit || 'Box',
            rate: product.rate || 0,
            mrp: product.mrp || 0,
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
