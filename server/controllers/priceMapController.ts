import { Request, Response } from 'express';
import PriceMap from '../models/PriceMap';
import { Product } from '../models/Product';

// Default price map names as per Reference Image 1
export const DEFAULT_PRICE_MAP_NAMES = ['SVM', 'MSK', 'Manjula', 'Gift', 'MPS'];

// Reference products as per Reference Image 2
export const REFERENCE_RETAIL_PRODUCTS = [
  { code: 1, name: '4" Gold ganesh', quantity: 1, rate: 86 },
  { code: 2, name: '4" Dlx Laxmi', quantity: 1, rate: 64 },
  { code: 3, name: '4" Mega Dlx 20 Ply', quantity: 1, rate: 130 },
  { code: 4, name: '5" Lady Dlx', quantity: 1, rate: 100 },
  { code: 5, name: '5 Mega dlx', quantity: 1, rate: 120 },
  { code: 6, name: '6" Dlx', quantity: 1, rate: 140 },
  { code: 7, name: 'Kuruvi Crckers', quantity: 1, rate: 20 },
  { code: 8, name: '2 Sound', quantity: 1, rate: 100 },
  { code: 9, name: 'Gr Chakkar Big 10p', quantity: 1, rate: 80 },
  { code: 10, name: 'Gr Chakkar Spl', quantity: 1, rate: 150 },
  { code: 11, name: 'Gr Chakkar Dlx', quantity: 1, rate: 300 },
  { code: 12, name: 'Gr Chakkar Spinner', quantity: 1, rate: 250 },
  { code: 13, name: 'Tora Tora', quantity: 1, rate: 320 },
  { code: 14, name: 'Hot wheel', quantity: 1, rate: 500 },
  { code: 15, name: 'Wire chakkar', quantity: 1, rate: 400 },
  { code: 16, name: 'Whistling chakkar', quantity: 1, rate: 400 },
  { code: 17, name: 'Titto [6in1]', quantity: 1, rate: 260 },
  { code: 18, name: 'Lottus wheel', quantity: 1, rate: 350 },
  { code: 19, name: 'Flower pot small', quantity: 1, rate: 160 },
  { code: 20, name: 'Flowert pot big', quantity: 1, rate: 190 },
  { code: 21, name: 'Flower pot spl', quantity: 1, rate: 240 },
  { code: 22, name: 'Color koti', quantity: 1, rate: 490 },
];

export const getPriceMaps = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const query: any = {};
    if (year && String(year).toUpperCase() !== 'ALL') {
      query.year = Number(year) || year;
    }

    let priceMaps = await PriceMap.find(query).sort({ createdAt: 1 });

    // Ensure retail products are in Product collection on completely empty fresh DB
    const retailCount = await Product.countDocuments({
      $or: [{ productType: 'Retail' }, { productType: 'Both' }],
    });
    if (retailCount === 0) {
      for (const p of REFERENCE_RETAIL_PRODUCTS) {
        const exists = await Product.findOne({ name: p.name });
        if (!exists) {
          await Product.create({
            slNo: p.code,
            name: p.name,
            rate: p.rate,
            mrp: Math.round(p.rate * 1.25),
            unit: 'Box',
            productType: 'Retail',
            category: 'General',
            year: Number(year) || new Date().getFullYear(),
          });
        }
      }
    }

    // Fetch active retail products
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

    // Auto-seed default price maps if none exist
    if (priceMaps.length === 0) {
      console.log(`[PriceMap] No price maps found for year ${year}. Seeding default Price Maps...`);
      const defaultDocs = DEFAULT_PRICE_MAP_NAMES.map((name) => ({
        name,
        year: Number(year) || new Date().getFullYear(),
        rates: (retailProducts.length > 0 ? retailProducts : REFERENCE_RETAIL_PRODUCTS).map((p: any) => ({
          productId: p._id ? String(p._id) : undefined,
          code: p.slNo || p.code,
          productName: (p.name || '').trim(),
          quantity: p.qty || p.quantity || 1,
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
