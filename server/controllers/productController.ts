import type { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import PriceList from '../models/PriceList';
import PriceMap from '../models/PriceMap';

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, year, search } = req.query;
    const filter: any = {};

    const andConditions: any[] = [];

    if (type && typeof type === 'string' && type !== 'ALL') {
      andConditions.push({
        $or: [
          { productType: type },
          { productType: 'Both' },
          ...(type === 'Retail' ? [{ productType: { $exists: false } }, { productType: null }, { productType: '' }] : []),
        ],
      });
    }

    if (year && typeof year === 'string' && year.trim() !== '' && year.toLowerCase() !== 'all') {
      const yearStr = year.trim();
      const yearNum = parseInt(yearStr, 10);
      if (!isNaN(yearNum)) {
        const startOfYear = new Date(Date.UTC(yearNum, 0, 1, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));
        andConditions.push({
          $or: [
            { year: yearNum },
            { year: yearStr },
            { createdAt: { $gte: startOfYear, $lte: endOfYear } },
          ],
        });
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      andConditions.push({ name: { $regex: search.trim(), $options: 'i' } });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
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
    const { shopStock, godownStock, stock, selectedViewYear: _v, viewYear: _vy, ...rest } = req.body;
    const targetType = rest.productType || 'Retail';

    let requestedSlNo = Number(rest.slNo);
    const existingSlNo = requestedSlNo > 0 ? await Product.findOne({
      slNo: requestedSlNo,
      $or: [
        { productType: targetType },
        { productType: 'Both' },
        ...(targetType === 'Retail' ? [{ productType: { $exists: false } }, { productType: null }, { productType: '' }] : []),
      ],
    }) : null;

    if (!requestedSlNo || requestedSlNo <= 0 || existingSlNo) {
      const highestProd = await Product.findOne({
        $or: [
          { productType: targetType },
          { productType: 'Both' },
          ...(targetType === 'Retail' ? [{ productType: { $exists: false } }, { productType: null }, { productType: '' }] : []),
        ],
      }).sort({ slNo: -1 });

      rest.slNo = (highestProd?.slNo || 0) + 1;
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

    // Sync to ALL PriceMaps if Retail or Both
    try {
      const isRetail = !product.productType || product.productType === 'Retail' || product.productType === 'Both';
      if (isRetail) {
        const cleanName = (product.name || '').trim();
        const prodIdStr = String(product._id);
        const targetYear = rest.year || new Date().getFullYear();

        const priceMaps = await PriceMap.find({
          $or: [{ year: targetYear }, { year: Number(targetYear) }, { year: String(targetYear) }],
        });

        // Also include all maps if year query returned empty
        const mapsToUpdate = priceMaps.length > 0 ? priceMaps : await PriceMap.find({});

        for (const pm of mapsToUpdate) {
          const rates = pm.rates || [];
          const exists = rates.some(
            (r) =>
              (r.productId && String(r.productId) === prodIdStr) ||
              (r.productName && r.productName.trim().toLowerCase() === cleanName.toLowerCase())
          );

          if (!exists) {
            rates.push({
              productId: prodIdStr,
              code: product.slNo,
              productName: cleanName,
              quantity: product.qty || 1,
              rate: product.rate || 0,
            });
            rates.sort((a, b) => Number(a.code) - Number(b.code));
            pm.rates = rates;
            await pm.save();
          }
        }
      }
    } catch (pmErr) {
      console.warn('[Sync to PriceMap Warning]:', pmErr);
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
    const oldSlNo = oldProduct.slNo;
    const { shopStock, godownStock, stock, ...updatePayload } = req.body;

    if (updatePayload.slNo && Number(updatePayload.slNo) > 0) {
      const targetType = updatePayload.productType || oldProduct.productType || 'Retail';
      const collision = await Product.findOne({
        _id: { $ne: req.params.id },
        slNo: Number(updatePayload.slNo),
        $or: [
          { productType: targetType },
          { productType: 'Both' },
          ...(targetType === 'Retail' ? [{ productType: { $exists: false } }, { productType: null }, { productType: '' }] : []),
        ],
      });
      if (collision) {
        updatePayload.slNo = oldProduct.slNo;
      }
    }

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

    // Sync update to ALL PriceMaps (preserving each price map's custom rates)
    try {
      const isRetail = !product.productType || product.productType === 'Retail' || product.productType === 'Both';
      if (isRetail) {
        const prodIdStr = String(product._id);
        const cleanName = product.name.trim();
        const oldClean = oldName.trim().toLowerCase();

        const allMaps = await PriceMap.find({});
        for (const pm of allMaps) {
          let pmChanged = false;
          const rates = pm.rates || [];

          for (const r of rates) {
            const isMatch =
              (r.productId && String(r.productId) === prodIdStr) ||
              (r.productName && r.productName.trim().toLowerCase() === oldClean) ||
              (Number(r.code) === Number(oldSlNo));

            if (isMatch) {
              r.productId = prodIdStr;
              r.productName = cleanName;
              r.code = product.slNo;
              r.quantity = product.qty || 1;
              // Preserve custom rate for this price map, fallback if missing
              if (r.rate === undefined || r.rate === null || r.rate === 0) {
                r.rate = product.rate || 0;
              }
              pmChanged = true;
            }
          }

          if (pmChanged) {
            rates.sort((a, b) => Number(a.code) - Number(b.code));
            pm.rates = rates;
            await pm.save();
          }
        }
      }
    } catch (syncPmErr) {
      console.warn('[Product Update PriceMap Sync Warning]:', syncPmErr);
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

    const cleanName = (product.name || '').trim();
    const prodIdStr = String(product._id);

    // Also remove from PriceList if present
    try {
      if (cleanName) {
        const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        await PriceList.deleteMany({ itemName: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
      }
    } catch (err) {
      console.warn('[Delete Product Sync Warning]:', err);
    }

    // Delete product from ALL PriceMaps in database (both by productId and by productName)
    try {
      const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await PriceMap.updateMany(
        {},
        {
          $pull: {
            rates: {
              $or: [
                ...(prodIdStr ? [{ productId: prodIdStr }] : []),
                ...(cleanName ? [{ productName: { $regex: new RegExp(`^${escapedName}$`, 'i') } }] : []),
              ],
            },
          },
        }
      );
    } catch (pmErr) {
      console.warn('[Delete Product PriceMap Sync Warning]:', pmErr);
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

    const prodsToDelete = await Product.find({ _id: { $in: ids } }).select('name _id');
    const names = prodsToDelete.map((p) => (p.name || '').trim()).filter(Boolean);
    const idStrs = prodsToDelete.map((p) => String(p._id));

    await Product.deleteMany({ _id: { $in: ids } });

    // Sync bulk delete to PriceList
    try {
      if (names.length > 0) {
        await PriceList.deleteMany({ itemName: { $in: names } });
      }
    } catch (err) {
      console.warn('[Bulk Delete Product Sync Warning]:', err);
    }

    // Sync bulk delete to ALL PriceMaps: completely remove deleted products from all price maps
    try {
      const nameRegexes = names.map((n) => ({
        productName: { $regex: new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      }));

      await PriceMap.updateMany(
        {},
        {
          $pull: {
            rates: {
              $or: [
                ...(idStrs.length > 0 ? [{ productId: { $in: idStrs } }] : []),
                ...(names.length > 0 ? [{ productName: { $in: names } }] : []),
                ...nameRegexes,
              ],
            },
          },
        }
      );
    } catch (pmErr) {
      console.warn('[Bulk Delete PriceMap Sync Warning]:', pmErr);
    }

    res.status(200).json({ success: true, message: `${ids.length} products deleted successfully` });
  } catch (error) {
    next(error);
  }
};

export const bulkImportProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items, defaultType = 'Retail', replaceExisting = false } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Please provide items array for bulk import' });
      return;
    }

    if (replaceExisting) {
      if (defaultType && defaultType !== 'ALL') {
        await Product.deleteMany({
          $or: [
            { productType: defaultType },
            ...(defaultType === 'Retail' ? [{ productType: { $exists: false } }, { productType: null }, { productType: '' }] : []),
          ],
        });
      } else {
        await Product.deleteMany({});
      }
    }

    const existingProds = await Product.find({
      $or: [
        { productType: defaultType },
        { productType: 'Both' },
        ...(defaultType === 'Retail' ? [{ productType: { $exists: false } }, { productType: null }, { productType: '' }] : []),
      ],
    }).select('slNo');

    const usedSlNos = new Set<number>(replaceExisting ? [] : existingProds.map((p) => Number(p.slNo)).filter((n) => n > 0));
    let nextAvailable = 1;

    const currentYear = new Date().getFullYear();
    const formattedDocs = items
      .map((item: any) => {
        const name = String(item.name || item.itemName || '').trim();
        if (!name) return null;
        const targetType = item.productType || defaultType || 'Retail';
        let sNum = Number(item.slNo);
        if (!sNum || sNum <= 0 || usedSlNos.has(sNum)) {
          while (usedSlNos.has(nextAvailable)) {
            nextAvailable++;
          }
          sNum = nextAvailable;
        }
        usedSlNos.add(sNum);

        return {
          slNo: sNum,
          sku: item.sku || String(sNum),
          name,
          category: String(item.category || 'General').trim() || 'General',
          rate: Number(item.rate || item.price || 0),
          mrp: Number(item.mrp || 0),
          unit: String(item.unit || 'Box').trim() || 'Box',
          productType: targetType,
          year: item.year ? Number(item.year) : currentYear,
        };
      })
      .filter(Boolean);

    if (formattedDocs.length === 0) {
      res.status(400).json({ success: false, error: 'No valid products found in import payload' });
      return;
    }

    const inserted = await Product.insertMany(formattedDocs, { ordered: false });

    // Sync imported retail products to PriceMaps
    try {
      const retailInserted = inserted.filter(
        (p: any) => !p.productType || p.productType === 'Retail' || p.productType === 'Both'
      );
      if (retailInserted.length > 0) {
        const allMaps = await PriceMap.find({});
        for (const pm of allMaps) {
          const rates = pm.rates || [];
          for (const p of retailInserted) {
            const pId = String(p._id);
            const pName = (p.name || '').trim();
            const exists = rates.some(
              (r) =>
                (r.productId && String(r.productId) === pId) ||
                (r.productName && r.productName.trim().toLowerCase() === pName.toLowerCase())
            );
            if (!exists) {
              rates.push({
                productId: pId,
                code: p.slNo,
                productName: pName,
                quantity: p.qty || 1,
                rate: p.rate || 0,
              });
            }
          }
          rates.sort((a, b) => Number(a.code) - Number(b.code));
          pm.rates = rates;
          await pm.save();
        }
      }
    } catch (pmErr) {
      console.warn('[Bulk Import PriceMap Sync Warning]:', pmErr);
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} products into ${defaultType}`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
};
