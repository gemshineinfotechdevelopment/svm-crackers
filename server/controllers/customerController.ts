import type { Request, Response, NextFunction } from 'express';
import { Customer } from '../models/Customer';
import { AccountLedger } from '../models/AccountLedger';
import { escapeRegex } from '../utils/ledgerUtils';

export const getCustomers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Backfill missing idCode for existing records if any
    const missingIdCustomers = await Customer.find({
      $or: [{ idCode: { $exists: false } }, { idCode: null }, { idCode: '' }],
    });

    if (missingIdCustomers.length > 0) {
      const allCustomers = await Customer.find().sort({ createdAt: 1 });
      let currentMax = 0;
      allCustomers.forEach((c) => {
        if (c.idCode) {
          const match = c.idCode.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > currentMax) currentMax = num;
          }
        }
      });

      for (let i = 0; i < allCustomers.length; i++) {
        const c = allCustomers[i];
        if (!c.idCode) {
          currentMax += 1;
          c.idCode = `#${currentMax.toString().padStart(4, '0')}`;
          await c.save();
        }
      }
    }

    const customers = await Customer.find().sort({ createdAt: 1 }).lean();
    const allLedgerEntries = await AccountLedger.find({}).lean();

    // Group ledger by customer name (normalized lowercase)
    const statsMap = new Map<string, { totalDebit: number; totalCredit: number; lastDate: string }>();

    for (const entry of allLedgerEntries) {
      const key = (entry.customerName || '').trim().toLowerCase();
      if (!key) continue;

      const deb = parseFloat(String(entry.debit || '0').replace(/,/g, '')) || 0;
      const cred = parseFloat(String(entry.credit || '0').replace(/,/g, '')) || 0;

      const existing = statsMap.get(key) || { totalDebit: 0, totalCredit: 0, lastDate: '' };
      existing.totalDebit += deb;
      existing.totalCredit += cred;
      if (entry.date && (!existing.lastDate || entry.date > existing.lastDate)) {
        existing.lastDate = entry.date;
      }
      statsMap.set(key, existing);
    }

    const enrichedCustomers = customers.map((c: any) => {
      const key = (c.name || '').trim().toLowerCase();
      const stats = statsMap.get(key) || { totalDebit: 0, totalCredit: 0, lastDate: '' };
      const totalDebit = Number(stats.totalDebit.toFixed(2));
      const totalCredit = Number(stats.totalCredit.toFixed(2));
      const pendingDue = Number(Math.max(0, totalDebit - totalCredit).toFixed(2));
      const netBalance = Number((totalCredit - totalDebit).toFixed(2));

      let status: 'PENDING' | 'SETTLED' | 'ADVANCE' = 'SETTLED';
      if (pendingDue > 0) {
        status = 'PENDING';
      } else if (netBalance > 0) {
        status = 'ADVANCE';
      }

      return {
        ...c,
        totalDebit,
        totalCredit,
        pendingDue,
        netBalance,
        status,
        lastTransactionDate: stats.lastDate || null,
      };
    });

    res.status(200).json({ success: true, count: enrichedCustomers.length, data: enrichedCustomers });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, mobile, address, gst, idCode } = req.body;

    let finalIdCode = idCode ? String(idCode).trim() : '';
    if (!finalIdCode) {
      const allCustomers = await Customer.find().sort({ createdAt: 1 });
      let maxNum = 0;
      allCustomers.forEach((c) => {
        if (c.idCode) {
          const match = c.idCode.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      });
      finalIdCode = `#${(maxNum + 1).toString().padStart(4, '0')}`;
    }

    const customer = await Customer.create({
      name,
      mobile,
      address,
      gst,
      idCode: finalIdCode,
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const oldCustomer = await Customer.findById(req.params.id);
    if (!oldCustomer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }
    const oldName = oldCustomer.name;
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (customer && req.body.name && req.body.name.trim() !== oldName.trim()) {
      const newName = req.body.name.trim();
      const escapedOldName = escapeRegex(oldName.trim());
      const { Particular } = await import('../models/Particular');
      const { AccountLedger } = await import('../models/AccountLedger');
      await Particular.updateMany(
        { customerName: { $regex: new RegExp(`^${escapedOldName}$`, 'i') } },
        { customerName: newName }
      );
      await AccountLedger.updateMany(
        { customerName: { $regex: new RegExp(`^${escapedOldName}$`, 'i') } },
        { customerName: newName }
      );
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }
    const customerName = customer.name;
    const escapedName = escapeRegex(customerName.trim());

    // 1. Delete customer
    await Customer.findByIdAndDelete(req.params.id);

    // 2. Cascade Delete: Delete all Particulars for this customer
    const { Particular } = await import('../models/Particular');
    await Particular.deleteMany({
      customerName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });

    // 3. Cascade Delete: Delete all AccountLedger entries for this customer
    const { AccountLedger } = await import('../models/AccountLedger');
    await AccountLedger.deleteMany({
      customerName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
