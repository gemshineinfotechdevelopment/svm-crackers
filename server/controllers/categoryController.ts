import { Request, Response } from 'express';
import Category from '../models/Category';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error while fetching categories',
    });
  }
};

export const clearAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await Category.deleteMany({});
    res.status(200).json({
      success: true,
      message: `Successfully deleted all ${result.deletedCount} categories`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, description, color, displayOrder, isActive } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Category name is required' });
      return;
    }

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      res.status(400).json({ success: false, error: 'A category with this name already exists' });
      return;
    }

    const category = await Category.create({
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : '',
      description: description ? description.trim() : '',
      color: color || '#DC2626',
      displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const oldCategory = await Category.findById(req.params.id);
    if (!oldCategory) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    const oldName = oldCategory.name;
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    // If category name was renamed, cascade update Products & PriceList
    if (req.body.name && req.body.name.trim() !== oldName.trim()) {
      const newName = req.body.name.trim();
      const escapedOldName = oldName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const { Product } = await import('../models/Product');
      const { default: PriceList } = await import('../models/PriceList');

      await Product.updateMany(
        { category: { $regex: new RegExp(`^${escapedOldName}$`, 'i') } },
        { category: newName }
      );
      await PriceList.updateMany(
        { category: { $regex: new RegExp(`^${escapedOldName}$`, 'i') } },
        { category: newName }
      );
    }

    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    const categoryName = category.name;
    await Category.findByIdAndDelete(req.params.id);

    // Cascade update: Reassign affected products and price list items to 'General'
    if (categoryName && categoryName.trim()) {
      const escapedName = categoryName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const { Product } = await import('../models/Product');
      const { default: PriceList } = await import('../models/PriceList');

      await Product.updateMany(
        { category: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
        { category: 'General' }
      );
      await PriceList.updateMany(
        { category: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
        { category: 'General' }
      );
    }

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
