import type { Request, Response, NextFunction } from 'express';
import { Company } from '../models/Company';
import { escapeRegex } from '../utils/ledgerUtils';

export const getCompanies = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Backfill missing slNo for existing records if any
    const missingSlNoCompanies = await Company.find({
      $or: [{ slNo: { $exists: false } }, { slNo: null }, { slNo: '' }],
    });

    if (missingSlNoCompanies.length > 0) {
      const allCompanies = await Company.find().sort({ createdAt: 1 });
      let currentMax = 0;
      allCompanies.forEach((c) => {
        if (c.slNo) {
          const match = c.slNo.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > currentMax) currentMax = num;
          }
        }
      });

      for (let i = 0; i < allCompanies.length; i++) {
        const c = allCompanies[i];
        if (!c.slNo) {
          currentMax += 1;
          c.slNo = currentMax.toString().padStart(2, '0');
          await c.save();
        }
      }
    }

    const companies = await Company.find().sort({ createdAt: 1 });
    res.status(200).json({ success: true, count: companies.length, data: companies });
  } catch (error) {
    next(error);
  }
};

export const getCompanyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }
    res.status(200).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const createCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let { slNo } = req.body;
    if (!slNo) {
      const allCompanies = await Company.find({}, 'slNo createdAt').sort({ createdAt: 1 });
      let maxNum = 0;
      for (const comp of allCompanies) {
        if (comp.slNo) {
          const match = comp.slNo.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      if (maxNum === 0) {
        maxNum = allCompanies.length;
      }
      const nextNum = maxNum + 1;
      slNo = nextNum.toString().padStart(2, '0');
    }

    const company = await Company.create({
      ...req.body,
      slNo,
    });
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const oldCompany = await Company.findById(req.params.id);
    if (!oldCompany) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }
    const oldName = oldCompany.name;
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (company && req.body.name && req.body.name.trim() !== oldName.trim()) {
      const newName = req.body.name.trim();
      const escapedOldName = escapeRegex(oldName.trim());
      const { Particular } = await import('../models/Particular');
      const { AccountLedger } = await import('../models/AccountLedger');
      await Particular.updateMany(
        { companyName: { $regex: new RegExp(`^${escapedOldName}$`, 'i') } },
        { companyName: newName }
      );
      await AccountLedger.updateMany(
        { companyName: { $regex: new RegExp(`^${escapedOldName}$`, 'i') } },
        { companyName: newName }
      );
    }
    res.status(200).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const deleteCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }
    const companyName = company.name;
    const escapedCompName = escapeRegex(companyName.trim());

    // 1. Delete Company
    await Company.findByIdAndDelete(req.params.id);

    // 2. Cascade Delete: Delete all Particulars for this company
    const { Particular } = await import('../models/Particular');
    const { AccountLedger } = await import('../models/AccountLedger');
    const { recalculateCustomerBalance } = await import('../utils/ledgerUtils');

    const particularsToDelete = await Particular.find({
      companyName: { $regex: new RegExp(`^${escapedCompName}$`, 'i') },
    });
    const affectedCustomers = [...new Set(particularsToDelete.map((p) => p.customerName))];

    await Particular.deleteMany({
      companyName: { $regex: new RegExp(`^${escapedCompName}$`, 'i') },
    });

    // 3. Cascade Delete: Delete all AccountLedger entries for this company
    await AccountLedger.deleteMany({
      companyName: { $regex: new RegExp(`^${escapedCompName}$`, 'i') },
    });

    // 4. Recalculate balances for affected customers
    for (const custName of affectedCustomers) {
      await recalculateCustomerBalance(custName);
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

