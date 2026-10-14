import { Request, Response } from 'express';
import PriceMap from '../models/PriceMap';
import { Product } from '../models/Product';

// Default price map names as per Reference Image 1
export const DEFAULT_PRICE_MAP_NAMES = ['SVM', 'MSK', 'Manjula', 'Gift', 'MPS'];

export const getPriceMaps = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const query: any = {};
    if (year && String(year).toUpperCase() !== 'ALL') {
      query.year = Number(year) || year;
    }

    let priceMaps = await PriceMap.find(query).sort({ createdAt: 1 });

    // Fetch active retail products directly from database ONLY (no static dummy data)
    const retailProducts = await Product.find({
      $or: [
        { productType: 'Retail' },
        { productType: 'Both' },
        { productType: { $exists: false } },
        { productType: null },
        { productType: '' },
      ],
    }).sort({ slNo: 1 });

    const retailNames = new Set(retailProducts.map((p) => p.name.trim().toLowerCase()));
    const retailIds = new Set(retailProducts.map((p) => String(p._id)));
    const retailMapById = new Map<string, any>();
    const retailMapByName = new Map<string, any>();
    retailProducts.forEach((p) => {
      retailMapById.set(String(p._id), p);
      retailMapByName.set(p.name.trim().toLowerCase(), p);
    });

    // Auto-seed default price maps if none exist (rates strictly from database retail products, or empty)
    if (priceMaps.length === 0) {
      console.log(`[PriceMap] No price maps found for year ${year}. Creating default Price Maps...`);
      const defaultDocs = DEFAULT_PRICE_MAP_NAMES.map((name) => ({
        name,
        year: Number(year) || new Date().getFullYear(),
        rates: retailProducts.map((p: any) => ({
          productId: String(p._id),
          code: p.slNo,
          productName: (p.name || '').trim(),
          quantity: p.qty || 1,
          rate: p.rate || 0,
        })),
      }));

      await PriceMap.insertMany(defaultDocs);
      priceMaps = await PriceMap.find(query).sort({ createdAt: 1 });
    } else {
      // Synchronize existing price maps with active retail products:
      // 1. Remove deleted retail products
      // 2. Add missing retail products (preserving custom rates)
      // 3. Ensure productId and code are updated
      let anyMapChanged = false;

      for (const pm of priceMaps) {
        let pmChanged = false;
        const currentRates = pm.rates || [];

        // Prune deleted products
        const validRates = currentRates.filter((r) => {
          const idValid = r.productId && retailIds.has(String(r.productId));
          const nameValid = r.productName && retailNames.has(r.productName.trim().toLowerCase());
          return idValid || nameValid;
        });

        if (validRates.length !== currentRates.length) {
          pmChanged = true;
        }

        // Check each valid rate to ensure productId and code are up to date
        const existingKeySet = new Set<string>();
        for (const r of validRates) {
          const matchedProd =
            (r.productId && retailMapById.get(String(r.productId))) ||
            (r.productName && retailMapByName.get(r.productName.trim().toLowerCase()));

          if (matchedProd) {
            if (!r.productId) {
              r.productId = String(matchedProd._id);
              pmChanged = true;
            }
            if (r.productName !== matchedProd.name.trim()) {
              r.productName = matchedProd.name.trim();
              pmChanged = true;
            }
            if (Number(r.code) !== Number(matchedProd.slNo)) {
              r.code = matchedProd.slNo;
              pmChanged = true;
            }
            existingKeySet.add(String(matchedProd._id));
            existingKeySet.add(matchedProd.name.trim().toLowerCase());
          }
        }

        // Add any active retail products missing from this price map
        for (const p of retailProducts) {
          const pId = String(p._id);
          const pKey = p.name.trim().toLowerCase();
          if (!existingKeySet.has(pId) && !existingKeySet.has(pKey)) {
            validRates.push({
              productId: pId,
              code: p.slNo,
              productName: p.name.trim(),
              quantity: p.qty || 1,
              rate: p.rate || 0,
            });
            pmChanged = true;
          }
        }

        if (pmChanged) {
          validRates.sort((a, b) => Number(a.code) - Number(b.code));
          pm.rates = validRates;
          await pm.save();
          anyMapChanged = true;
        }
      }

      if (anyMapChanged) {
        priceMaps = await PriceMap.find(query).sort({ createdAt: 1 });
      }
    }

    res.status(200).json({
      success: true,
      count: priceMaps.length,
      data: priceMaps,
    });
  } catch (error: any) {
    console.error('Error in getPriceMaps:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch Price Maps',
    });
  }
};

export const createPriceMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, rates, year } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Price Map name is required' });
      return;
    }

    const trimmedName = name.trim();
    const mapYear = year || new Date().getFullYear();

    const existing = await PriceMap.findOne({ name: trimmedName, year: mapYear });
    if (existing) {
      res.status(400).json({ success: false, message: `Price Map '${trimmedName}' already exists for this year` });
      return;
    }

    let initialRates = Array.isArray(rates) && rates.length > 0 ? rates : [];
    if (initialRates.length === 0) {
      // Auto-populate with current Retail products
      const currentRetail = await Product.find({
        $or: [
          { productType: 'Retail' },
          { productType: 'Both' },
          { productType: { $exists: false } },
          { productType: null },
          { productType: '' },
        ],
      }).sort({ slNo: 1 });

      initialRates = currentRetail.map((p) => ({
        productId: String(p._id),
        code: p.slNo,
        productName: p.name.trim(),
        quantity: p.qty || 1,
        rate: p.rate || 0,
      }));
    }

    const newMap = await PriceMap.create({
      name: trimmedName,
      rates: initialRates,
      year: mapYear,
    });

    res.status(201).json({
      success: true,
      message: `Price Map '${trimmedName}' created successfully`,
      data: newMap,
    });
  } catch (error: any) {
    console.error('Error in createPriceMap:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create Price Map' });
  }
};

export const updatePriceMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, rates, year } = req.body;

    let map = await PriceMap.findById(id);
    if (!map) {
      // Fallback by name
      map = await PriceMap.findOne({ name: id });
    }

    if (!map) {
      res.status(404).json({ success: false, message: 'Price Map not found' });
      return;
    }

    if (name && name.trim()) map.name = name.trim();
    if (rates !== undefined && Array.isArray(rates)) map.rates = rates;
    if (year !== undefined) map.year = year;

    await map.save();

    res.status(200).json({
      success: true,
      message: `Price Map '${map.name}' updated successfully`,
      data: map,
    });
  } catch (error: any) {
    console.error('Error in updatePriceMap:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update Price Map' });
  }
};

export const deletePriceMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let deleted = await PriceMap.findByIdAndDelete(id);
    if (!deleted) {
      deleted = await PriceMap.findOneAndDelete({ name: id });
    }

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Price Map not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Price Map '${deleted.name}' deleted successfully`,
      data: deleted,
    });
  } catch (error: any) {
    console.error('Error in deletePriceMap:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete Price Map' });
  }
};

export const batchSavePriceMaps = async (req: Request, res: Response): Promise<void> => {
  try {
    const { priceMaps, year } = req.body;
    if (!Array.isArray(priceMaps)) {
      res.status(400).json({ success: false, message: 'Invalid data format: priceMaps array expected' });
      return;
    }

    const currentYear = year || new Date().getFullYear();

    for (const item of priceMaps) {
      if (!item.name || !item.name.trim()) continue;
      const itemName = item.name.trim();

      await PriceMap.findOneAndUpdate(
        { name: itemName, year: currentYear },
        {
          name: itemName,
          rates: Array.isArray(item.rates) ? item.rates : [],
          year: currentYear,
        },
        { upsert: true, new: true }
      );
    }

    const updatedList = await PriceMap.find({ year: currentYear }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      message: 'All Price Maps saved successfully',
      data: updatedList,
    });
  } catch (error: any) {
    console.error('Error in batchSavePriceMaps:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to save Price Maps' });
  }
};
