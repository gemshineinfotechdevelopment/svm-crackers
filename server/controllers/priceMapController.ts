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

    // Auto-seed default price maps if none exist
    if (priceMaps.length === 0) {
      console.log(`[PriceMap] No price maps found for year ${year}. Seeding default Price Maps...`);
      const defaultDocs = DEFAULT_PRICE_MAP_NAMES.map((name) => ({
        name,
        year: Number(year) || new Date().getFullYear(),
        rates: REFERENCE_RETAIL_PRODUCTS.map((p) => ({
          code: p.code,
          productName: p.name,
          quantity: p.quantity,
          rate: p.rate,
        })),
      }));

      await PriceMap.insertMany(defaultDocs);
      priceMaps = await PriceMap.find(query).sort({ createdAt: 1 });
    }

    // Ensure retail products are in Product collection so website retail products list has them
    const retailCount = await Product.countDocuments({
      $or: [{ productType: 'Retail' }, { productType: 'Both' }],
    });
    if (retailCount < 10) {
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

    const newMap = await PriceMap.create({
      name: trimmedName,
      rates: Array.isArray(rates) ? rates : [],
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
