import type { Request, Response, NextFunction } from 'express';
import { Particular } from '../models/Particular';
import { AccountLedger } from '../models/AccountLedger';
import { Customer } from '../models/Customer';
import PriceList from '../models/PriceList';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { escapeRegex, recalculateCustomerBalance } from '../utils/ledgerUtils';
import { isCloudinaryConfigured, uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { extractYearFromDate } from '../utils/yearUtils';

// Stock tracking is disabled
const adjustStock = async (_products: any[], _multiplier: number): Promise<void> => {
  // No-op
};

export const getParticulars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerName, billType, year } = req.query;
    const filter: any = {};
    const andConditions: any[] = [];

    // Filter by Financial / Calendar Year if specified
    if (year && typeof year === 'string' && year.trim() !== '' && year.toUpperCase() !== 'ALL') {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear)) {
        andConditions.push({
          $or: [
            { year: parsedYear },
            { year: String(parsedYear) },
            { date: { $regex: new RegExp(String(parsedYear)) } },
          ],
        });
      }
    }

    // 2. Customer Name Filter
    if (customerName && typeof customerName === 'string' && customerName.trim() !== '' && customerName.toLowerCase() !== 'all') {
      andConditions.push({
        customerName: { $regex: new RegExp(`^${escapeRegex(customerName.trim())}$`, 'i') },
      });
    }

    // 3. Bill Type Filter (GST / REGULAR / QUOTATION)
    if (billType && typeof billType === 'string' && billType.trim() !== '' && billType.toLowerCase() !== 'all') {
      const bType = billType.trim().toUpperCase();
      if (bType === 'GST') {
        andConditions.push({
          $or: [{ billType: 'GST' }, { billNo: { $regex: /^GST/i } }],
        });
      } else if (bType === 'QUOTATION') {
        andConditions.push({
          billType: 'QUOTATION',
        });
      } else if (bType === 'REGULAR' || bType === 'ESTIMATE') {
        andConditions.push({
          billType: { $nin: ['GST', 'QUOTATION'] },
          billNo: { $not: { $regex: /^GST/i } },
        });
      } else {
        andConditions.push({ billType: bType });
      }
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const particulars = await Particular.find(filter).sort({ createdAt: -1, _id: -1 });
    res.status(200).json({ success: true, count: particulars.length, data: particulars });
  } catch (error) {
    next(error);
  }
};

export const getCustomerBillingHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerName = String(req.query.customerName || req.params.customerName || '').trim();
    const currentYear = Number(req.query.currentYear || req.query.year) || new Date().getFullYear();

    if (!customerName) {
      res.status(200).json({ success: true, data: { hasPreviousBills: false, currentYear, previousYears: [] } });
      return;
    }

    const bills = await Particular.find({
      customerName: { $regex: new RegExp(`^${escapeRegex(customerName)}$`, 'i') },
    }).lean();

    const yearCounts = new Map<number, number>();
    for (const b of bills) {
      const bYear = Number(b.year) || extractYearFromDate(b.date || b.createdAt, currentYear);
      if (bYear < currentYear) {
        yearCounts.set(bYear, (yearCounts.get(bYear) || 0) + 1);
      }
    }

    const previousYears = Array.from(yearCounts.entries())
      .map(([yr, billCount]) => ({ year: yr, billCount }))
      .sort((a, b) => b.year - a.year);

    res.status(200).json({
      success: true,
      data: {
        hasPreviousBills: previousYears.length > 0,
        currentYear,
        previousYears,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getParticularById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const particular = await Particular.findById(req.params.id);
    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }
    res.status(200).json({ success: true, data: particular });
  } catch (error) {
    next(error);
  }
};

export const getNextBillNo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const type = (req.query.type as string || '').toUpperCase();
    const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
    const yearQuery = year && !isNaN(year) ? { year } : {};

    if (type === 'GST') {
      const gstParticulars = await Particular.find({
        ...yearQuery,
        $or: [{ billType: 'GST' }, { billNo: { $regex: /^GST/i } }]
      }, 'billNo');
      let maxNum = 0;
      for (const p of gstParticulars) {
        if (p.billNo) {
          const match = p.billNo.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      const nextBillNo = (maxNum + 1).toString().padStart(4, '0');
      res.status(200).json({ success: true, data: { nextBillNo } });
      return;
    }

    if (type === 'QUOTATION') {
      const quotationParticulars = await Particular.find({
        ...yearQuery,
        billType: 'QUOTATION',
      }, 'billNo');
      let maxNum = 0;
      for (const p of quotationParticulars) {
        if (p.billNo) {
          const match = p.billNo.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      const nextBillNo = (maxNum > 0 ? maxNum + 1 : 1001).toString();
      res.status(200).json({ success: true, data: { nextBillNo } });
      return;
    }

    const regularParticulars = await Particular.find({
      ...yearQuery,
      $and: [
        { billType: { $nin: ['GST', 'QUOTATION'] } },
        { billNo: { $not: { $regex: /^GST/i } } }
      ]
    }, 'billNo');
    let maxNum = 0;
    for (const p of regularParticulars) {
      if (p.billNo) {
        const match = p.billNo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextBillNo = (maxNum > 0 ? maxNum + 1 : 1001).toString();
    res.status(200).json({ success: true, data: { nextBillNo } });
  } catch (error) {
    next(error);
  }
};

export const createParticular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentSystemYear = new Date().getFullYear();
    const {
      customerName,
      customerPhone,
      customerAddress,
      customerGst,
      customerAadhar,
      caseCount,
      companyName,
      discount,
      transport,
      packing,
      billNo,
      tax,
      amount,
      total,
      paymentStatus,
      paymentMode,
      paidAmount,
      notes,
      date,
      products,
      billType,
      placeOfSupply,
      reverseCharge,
      vehicleNo,
      ewayBillNo,
      gstRate,
      cgstTotal,
      sgstTotal,
      igstTotal,
      roundOff,
    } = req.body;

    let finalBillNo = billNo ? String(billNo).trim() : '';
    if (!finalBillNo) {
      if (billType === 'GST') {
        const gstParticulars = await Particular.find({
          $or: [{ billType: 'GST' }, { billNo: { $regex: /^GST/i } }]
        }, 'billNo');
        let maxNum = 0;
        for (const p of gstParticulars) {
          if (p.billNo) {
            const match = p.billNo.match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        }
        finalBillNo = (maxNum + 1).toString().padStart(4, '0');
      } else if (billType === 'QUOTATION') {
        const quotationParticulars = await Particular.find({
          billType: 'QUOTATION'
        }, 'billNo');
        let maxNum = 0;
        for (const p of quotationParticulars) {
          if (p.billNo) {
            const match = p.billNo.match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        }
        finalBillNo = (maxNum > 0 ? maxNum + 1 : 1001).toString();
      } else {
        const regularParticulars = await Particular.find({
          $and: [
            { billType: { $nin: ['GST', 'QUOTATION'] } },
            { billNo: { $not: { $regex: /^GST/i } } }
          ]
        }, 'billNo');
        let maxNum = 0;
        for (const p of regularParticulars) {
          if (p.billNo) {
            const match = p.billNo.match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        }
        finalBillNo = (maxNum > 0 ? maxNum + 1 : 1001).toString();
      }
    }

    const trimmedCustName = (customerName || 'General').trim();

    // Auto-create / update Customer in database if needed
    if (trimmedCustName) {
      try {
        const existingCustomer = await Customer.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(trimmedCustName)}$`, 'i') },
        });

        if (!existingCustomer) {
          const allCusts = await Customer.find().sort({ createdAt: 1 });
          let maxId = 0;
          allCusts.forEach((c) => {
            if (c.idCode) {
              const m = c.idCode.match(/\d+/);
              if (m) {
                const n = parseInt(m[0], 10);
                if (n > maxId) maxId = n;
              }
            }
          });

          const letter = trimmedCustName.charAt(0).toUpperCase() || 'C';
          const avatarColors = [
            { bg: '#EFF6FF', color: '#1D4ED8' },
            { bg: '#ECFDF5', color: '#047857' },
            { bg: '#FEF3C7', color: '#B45309' },
            { bg: '#FDF2F8', color: '#BE185D' },
            { bg: '#F5F3FF', color: '#6D28D9' },
            { bg: '#FFF1F2', color: '#BE123C' },
          ];
          const colorPair = avatarColors[trimmedCustName.length % avatarColors.length];

          await Customer.create({
            name: trimmedCustName,
            mobile: customerPhone || '-',
            address: customerAddress || '-',
            gst: customerGst || 'N/A',
            aadhar: customerAadhar || '',
            avatarLetter: trimmedCustName.charAt(0).toUpperCase(),
            avatarBg: colorPair.bg,
            avatarColor: colorPair.color,
            idCode: `#${(maxId + 1).toString().padStart(4, '0')}`,
            year: currentSystemYear,
          });
          console.log(`[Auto Customer Created]: ${trimmedCustName}`);
        } else if (customerPhone || customerAddress || customerGst || customerAadhar) {
          if ((!existingCustomer.mobile || existingCustomer.mobile === '-') && customerPhone) {
            existingCustomer.mobile = customerPhone;
          }
          if ((!existingCustomer.address || existingCustomer.address === '-') && customerAddress) {
            existingCustomer.address = customerAddress;
          }
          if ((!existingCustomer.gst || existingCustomer.gst === 'N/A') && customerGst) {
            existingCustomer.gst = customerGst;
          }
          if ((!existingCustomer.aadhar || existingCustomer.aadhar === '') && customerAadhar) {
            existingCustomer.aadhar = customerAadhar;
          }
          await existingCustomer.save();
        }
      } catch (custSyncErr) {
        console.warn('[Customer Sync Error]:', custSyncErr);
      }
    }

    const billTotalNum = parseFloat(String(total || amount || '0').replace(/,/g, '')) || 0;
    const paidNum = parseFloat(String(paidAmount || (paymentStatus === 'PAID' ? billTotalNum : '0')).replace(/,/g, '')) || 0;

    let computedStatus: 'PAID' | 'UNPAID' | 'PARTIAL' = 'UNPAID';
    if (paymentStatus === 'PAID' || (paidNum >= billTotalNum && billTotalNum > 0)) {
      computedStatus = 'PAID';
    } else if (paidNum > 0 && paidNum < billTotalNum) {
      computedStatus = 'PARTIAL';
    }

    const rawDate = date || new Date().toISOString().split('T')[0];
    const dateYear = extractYearFromDate(rawDate);
    const targetYear = req.body.year ? Number(req.body.year) : dateYear;

    if (req.body.year && dateYear !== Number(req.body.year)) {
      res.status(400).json({
        success: false,
        error: `Bill date does not belong to the selected year (${req.body.year}). Please select a date from ${req.body.year}.`,
      });
      return;
    }

    const particular = await Particular.create({
      customerName: trimmedCustName,
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      customerGst: customerGst || '',
      customerAadhar: customerAadhar || '',
      caseCount: caseCount || '0',
      companyName: companyName || 'General',
      discount: discount || '0',
      transport: transport || '-',
      packing: packing || '0',
      billNo: finalBillNo,
      tax: tax || '0',
      amount: amount || total || '0.00',
      total: total || amount || '0.00',
      paymentStatus: computedStatus,
      paymentMode: paymentMode || (computedStatus === 'PAID' ? 'CASH' : 'CREDIT'),
      paidAmount: paidNum > 0 ? paidNum.toFixed(2) : '0.00',
      notes: notes || '',
      date: rawDate,
      year: targetYear,
      products: products || [],
      billType: billType === 'GST' ? 'GST' : (billType === 'QUOTATION' ? 'QUOTATION' : 'REGULAR'),
      placeOfSupply: placeOfSupply || '',
      reverseCharge: reverseCharge || 'No',
      vehicleNo: vehicleNo || '',
      ewayBillNo: ewayBillNo || '',
      gstRate: gstRate || '18',
      cgstTotal: cgstTotal || '0.00',
      sgstTotal: sgstTotal || '0.00',
      igstTotal: igstTotal || '0.00',
      roundOff: roundOff || '0.00',
      despatchTo: req.body.despatchTo || req.body.dispatchTo || '',
      lorryTransport: req.body.lorryTransport || transport || '',
      lrNo: req.body.lrNo || '',
      lrDate: req.body.lrDate || '',
      taxType: req.body.taxType || 'IGST',
      taxPercent: req.body.taxPercent || gstRate || '18',
      cgstPercent: req.body.cgstPercent || '0',
      sgstPercent: req.body.sgstPercent || '0',
      igstPercent: req.body.igstPercent || '18',
      subTotal: req.body.subTotal || '0.00',
      netAmount: req.body.netAmount || total || '0.00',
      inWords: req.body.inWords || '',
      billFlag: req.body.billFlag || '',
    });

    // 1. Automatically log Bill DEBIT to Account Ledger (Regular / Estimate Bills ONLY, never for GST or QUOTATION)
    if (particular.billType !== 'GST' && particular.billType !== 'QUOTATION') {
      if (billTotalNum > 0) {
        await AccountLedger.create({
          particularId: String(particular._id),
          billNo: particular.billNo,
          customerName: particular.customerName,
          date: particular.date,
          companyName: particular.companyName,
          debit: billTotalNum.toFixed(2),
          credit: '0.00',
          balance: '0.00',
          type: 'BILL',
        });
      }

      // 2. If bill is Paid or Partial Paid, log Payment CREDIT to Account Ledger
      if (paidNum > 0) {
        await AccountLedger.create({
          particularId: String(particular._id),
          billNo: particular.billNo,
          customerName: particular.customerName,
          date: particular.date,
          companyName: particular.companyName,
          debit: '0.00',
          credit: paidNum.toFixed(2),
          balance: '0.00',
          type: 'PAYMENT',
        });
      }

      if (billTotalNum > 0 || paidNum > 0) {
        await recalculateCustomerBalance(particular.customerName);
      }
    }

    // 3. Automatically Deduct Sold Quantities from Stock (PriceList & Product collections)
    if (products && Array.isArray(products) && products.length > 0) {
      await adjustStock(products, -1);
    }

    res.status(201).json({ success: true, data: particular });
  } catch (error) {
    next(error);
  }
};

export const updateParticular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await Particular.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    const currentSystemYear = new Date().getFullYear();
    const billYear = Number(existing.year) || extractYearFromDate(existing.date, currentSystemYear);
    if (billYear < currentSystemYear) {
      res.status(400).json({
        success: false,
        message: `Previous Year Bill Locked: Bill #${existing.billNo} belongs to past year ${billYear}. Editing bills from previous years is not permitted.`,
        error: 'Editing previous year bills is restricted.',
      });
      return;
    }

    const oldCustomerName = existing.customerName;

    const {
      customerName,
      customerPhone,
      customerAddress,
      customerGst,
      caseCount,
      companyName,
      discount,
      transport,
      packing,
      billNo,
      tax,
      amount,
      total,
      paymentStatus,
      paymentMode,
      paidAmount,
      notes,
      date,
      products,
    } = req.body;

    const updatedParticular = await Particular.findByIdAndUpdate(
      id,
      {
        ...(customerName !== undefined && { customerName: String(customerName).trim() }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(customerAddress !== undefined && { customerAddress }),
        ...(customerGst !== undefined && { customerGst }),
        ...(req.body.customerAadhar !== undefined && { customerAadhar: req.body.customerAadhar }),
        ...(caseCount !== undefined && { caseCount }),
        ...(companyName !== undefined && { companyName }),
        ...(discount !== undefined && { discount }),
        ...(transport !== undefined && { transport }),
        ...(packing !== undefined && { packing }),
        ...(billNo !== undefined && { billNo: String(billNo).trim() }),
        ...(tax !== undefined && { tax }),
        ...(amount !== undefined && { amount }),
        ...(total !== undefined && { total }),
        ...(paymentStatus !== undefined && { paymentStatus }),
        ...(paymentMode !== undefined && { paymentMode }),
        ...(paidAmount !== undefined && { paidAmount }),
        ...(notes !== undefined && { notes }),
        ...(date !== undefined && { date }),
        ...(date !== undefined
          ? { year: req.body.year ? Number(req.body.year) : extractYearFromDate(date) }
          : (req.body.year !== undefined ? { year: Number(req.body.year) } : {})),
        ...(products !== undefined && { products }),
        ...(req.body.billType !== undefined && { billType: req.body.billType }),
        ...(req.body.placeOfSupply !== undefined && { placeOfSupply: req.body.placeOfSupply }),
        ...(req.body.reverseCharge !== undefined && { reverseCharge: req.body.reverseCharge }),
        ...(req.body.vehicleNo !== undefined && { vehicleNo: req.body.vehicleNo }),
        ...(req.body.ewayBillNo !== undefined && { ewayBillNo: req.body.ewayBillNo }),
        ...(req.body.gstRate !== undefined && { gstRate: req.body.gstRate }),
        ...(req.body.cgstTotal !== undefined && { cgstTotal: req.body.cgstTotal }),
        ...(req.body.sgstTotal !== undefined && { sgstTotal: req.body.sgstTotal }),
        ...(req.body.igstTotal !== undefined && { igstTotal: req.body.igstTotal }),
        ...(req.body.roundOff !== undefined && { roundOff: req.body.roundOff }),
        ...(req.body.despatchTo !== undefined && { despatchTo: req.body.despatchTo }),
        ...(req.body.lorryTransport !== undefined && { lorryTransport: req.body.lorryTransport }),
        ...(req.body.lrNo !== undefined && { lrNo: req.body.lrNo }),
        ...(req.body.lrDate !== undefined && { lrDate: req.body.lrDate }),
        ...(req.body.taxType !== undefined && { taxType: req.body.taxType }),
        ...(req.body.taxPercent !== undefined && { taxPercent: req.body.taxPercent }),
        ...(req.body.cgstPercent !== undefined && { cgstPercent: req.body.cgstPercent }),
        ...(req.body.sgstPercent !== undefined && { sgstPercent: req.body.sgstPercent }),
        ...(req.body.igstPercent !== undefined && { igstPercent: req.body.igstPercent }),
        ...(req.body.subTotal !== undefined && { subTotal: req.body.subTotal }),
        ...(req.body.netAmount !== undefined && { netAmount: req.body.netAmount }),
        ...(req.body.inWords !== undefined && { inWords: req.body.inWords }),
        ...(req.body.billFlag !== undefined && { billFlag: req.body.billFlag }),
      },
      { new: true, runValidators: true }
    );

    if (!updatedParticular) {
      res.status(404).json({ success: false, error: 'Failed to update particular bill' });
      return;
    }

    // Auto-create / update Customer record if needed
    const updatedCustName = (updatedParticular.customerName || '').trim();
    if (updatedCustName) {
      try {
        const existingCustomer = await Customer.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(updatedCustName)}$`, 'i') },
        });
        if (!existingCustomer) {
          const allCusts = await Customer.find().sort({ createdAt: 1 });
          let maxId = 0;
          allCusts.forEach((c) => {
            if (c.idCode) {
              const m = c.idCode.match(/\d+/);
              if (m) {
                const n = parseInt(m[0], 10);
                if (n > maxId) maxId = n;
              }
            }
          });

          const letter = updatedCustName.charAt(0).toUpperCase() || 'C';
          const avatarColors = [
            { bg: '#EFF6FF', color: '#1D4ED8' },
            { bg: '#ECFDF5', color: '#047857' },
            { bg: '#FEF3C7', color: '#B45309' },
            { bg: '#FDF2F8', color: '#BE185D' },
            { bg: '#F5F3FF', color: '#6D28D9' },
            { bg: '#FFF1F2', color: '#BE123C' },
          ];
          const colorPair = avatarColors[updatedCustName.length % avatarColors.length];

          await Customer.create({
            name: updatedCustName,
            mobile: updatedParticular.customerPhone || '-',
            address: updatedParticular.customerAddress || '-',
            gst: updatedParticular.customerGst || 'N/A',
            avatarLetter: letter,
            avatarBg: colorPair.bg,
            avatarColor: colorPair.color,
            idCode: `#${(maxId + 1).toString().padStart(4, '0')}`,
          });
        }
      } catch (custSyncErr) {
        console.warn('[Customer Update Sync Error]:', custSyncErr);
      }
    }

    // Update or re-sync AccountLedger entries (BILL and PAYMENT) - ONLY FOR REGULAR / ESTIMATE BILLS (NEVER GST or QUOTATION)
    if (updatedParticular.billType === 'GST' || updatedParticular.billType === 'QUOTATION') {
      await AccountLedger.deleteMany({ particularId: String(id) });
      if (oldCustomerName && oldCustomerName !== updatedParticular.customerName) {
        await recalculateCustomerBalance(oldCustomerName);
      }
      await recalculateCustomerBalance(updatedParticular.customerName);
    } else {
      const billTotalNum = parseFloat(String(updatedParticular.total || updatedParticular.amount || '0').replace(/,/g, '')) || 0;
      const paidNum = parseFloat(String(updatedParticular.paidAmount || (updatedParticular.paymentStatus === 'PAID' ? billTotalNum : '0')).replace(/,/g, '')) || 0;

      // 1. BILL Ledger entry
      const billLedgerEntry = await AccountLedger.findOne({
        particularId: String(id),
        type: 'BILL',
      });

      if (billLedgerEntry) {
        billLedgerEntry.customerName = updatedParticular.customerName;
        billLedgerEntry.companyName = updatedParticular.companyName;
        billLedgerEntry.date = updatedParticular.date;
        billLedgerEntry.billNo = updatedParticular.billNo;
        billLedgerEntry.debit = billTotalNum.toFixed(2);
        await billLedgerEntry.save();
      } else if (billTotalNum > 0) {
        await AccountLedger.create({
          particularId: String(updatedParticular._id),
          billNo: updatedParticular.billNo,
          customerName: updatedParticular.customerName,
          date: updatedParticular.date,
          companyName: updatedParticular.companyName,
          debit: billTotalNum.toFixed(2),
          credit: '0.00',
          balance: '0.00',
          type: 'BILL',
        });
      }

      // 2. PAYMENT Ledger entry
      const paymentLedgerEntry = await AccountLedger.findOne({
        particularId: String(id),
        type: 'PAYMENT',
      });

      if (paymentLedgerEntry) {
        if (paidNum > 0) {
          paymentLedgerEntry.customerName = updatedParticular.customerName;
          paymentLedgerEntry.companyName = updatedParticular.companyName;
          paymentLedgerEntry.date = updatedParticular.date;
          paymentLedgerEntry.billNo = updatedParticular.billNo;
          paymentLedgerEntry.credit = paidNum.toFixed(2);
          await paymentLedgerEntry.save();
        } else {
          await AccountLedger.findByIdAndDelete(paymentLedgerEntry._id);
        }
      } else if (paidNum > 0) {
        await AccountLedger.create({
          particularId: String(updatedParticular._id),
          billNo: updatedParticular.billNo,
          customerName: updatedParticular.customerName,
          date: updatedParticular.date,
          companyName: updatedParticular.companyName,
          debit: '0.00',
          credit: paidNum.toFixed(2),
          balance: '0.00',
          type: 'PAYMENT',
        });
      }

      // Recalculate balances
      if (oldCustomerName && oldCustomerName !== updatedParticular.customerName) {
        await recalculateCustomerBalance(oldCustomerName);
      }
      await recalculateCustomerBalance(updatedParticular.customerName);
    }

    res.status(200).json({ success: true, data: updatedParticular });
  } catch (error) {
    next(error);
  }
};

export const deleteParticular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const particular = await Particular.findById(req.params.id);
    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    const customerName = particular.customerName;

    // 1. Delete associated Cloudinary asset if present
    if (particular.pdfPublicId && isCloudinaryConfigured()) {
      await deleteFromCloudinary(particular.pdfPublicId);
    }

    // 2. Restore Stock for items in the deleted bill
    if (particular.products && Array.isArray(particular.products) && particular.products.length > 0) {
      await adjustStock(particular.products, 1);
    }

    // 3. Delete Particular Document
    await Particular.findByIdAndDelete(req.params.id);

    // 4. Cascade Delete: Delete matching AccountLedger entries (BILL and PAYMENT)
    await AccountLedger.deleteMany({
      $or: [
        { particularId: String(req.params.id) },
        { particularId: String(particular._id) },
      ],
    });

    // 5. Recalculate balance for this customer
    await recalculateCustomerBalance(customerName);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

export const uploadParticularPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { pdfData, pdfName } = req.body;

    if (!pdfData) {
      res.status(400).json({ success: false, error: 'Document data is required' });
      return;
    }

    const existingParticular = await Particular.findById(id);
    if (!existingParticular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    let savedUrl = pdfData;
    let publicId = '';

    if (isCloudinaryConfigured()) {
      try {
        if (existingParticular.pdfPublicId) {
          await deleteFromCloudinary(existingParticular.pdfPublicId);
        }

        const cloudRes = await uploadToCloudinary(
          pdfData,
          'apsara_crackers/bills',
          pdfName || `Bill-${existingParticular.billNo || 'receipt'}`
        );

        savedUrl = cloudRes.secure_url;
        publicId = cloudRes.public_id;
        console.log(`[Cloudinary Success] Uploaded: ${savedUrl}`);
      } catch (cloudErr) {
        console.warn('[Cloudinary Warning] Falling back to direct database storage:', cloudErr);
        savedUrl = pdfData;
      }
    } else {
      console.log('[Storage] Storing document directly in database (Cloudinary not configured)');
    }

    existingParticular.pdfData = savedUrl;
    existingParticular.pdfName = pdfName || 'transport-receipt';
    existingParticular.pdfPublicId = publicId;
    await existingParticular.save();

    res.status(200).json({
      success: true,
      message: 'Transport receipt uploaded successfully',
      data: existingParticular,
    });
  } catch (error: any) {
    console.error('[Upload Error]:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to upload document',
    });
  }
};

export const deleteParticularPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const particular = await Particular.findById(id);

    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    // Delete from Cloudinary if public_id exists
    if (particular.pdfPublicId && isCloudinaryConfigured()) {
      await deleteFromCloudinary(particular.pdfPublicId);
      console.log(`[Cloudinary Delete] Removed asset: ${particular.pdfPublicId}`);
    }

    particular.pdfData = '';
    particular.pdfName = '';
    particular.pdfPublicId = '';
    await particular.save();

    res.status(200).json({ success: true, message: 'PDF deleted successfully', data: particular });
  } catch (error) {
    next(error);
  }
};

export const convertQuotationToBill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const quotation = await Particular.findById(id);
    if (!quotation) {
      res.status(404).json({ success: false, error: 'Quotation not found' });
      return;
    }

    const currentYear = quotation.year || new Date().getFullYear();
    const regularParticulars = await Particular.find({
      year: currentYear,
      billType: { $nin: ['GST', 'QUOTATION'] },
      billNo: { $not: { $regex: /^GST/i } },
    }, 'billNo');

    let maxNum = 0;
    for (const p of regularParticulars) {
      if (p.billNo) {
        const match = p.billNo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const newBillNo = (maxNum > 0 ? maxNum + 1 : 1001).toString();

    quotation.billType = 'REGULAR';
    quotation.billNo = newBillNo;
    quotation.isConverted = true;
    quotation.convertedBillNo = newBillNo;
    quotation.convertedAt = new Date();
    await quotation.save();

    const billTotalNum = parseFloat(String(quotation.total || quotation.amount || '0').replace(/,/g, '')) || 0;
    const paidNum = parseFloat(String(quotation.paidAmount || (quotation.paymentStatus === 'PAID' ? billTotalNum : '0')).replace(/,/g, '')) || 0;

    // 1. Automatically log Bill DEBIT to Account Ledger
    if (billTotalNum > 0) {
      await AccountLedger.create({
        particularId: String(quotation._id),
        billNo: quotation.billNo,
        customerName: quotation.customerName,
        date: quotation.date,
        companyName: quotation.companyName,
        debit: billTotalNum.toFixed(2),
        credit: '0.00',
        balance: '0.00',
        type: 'BILL',
      });
    }

    // 2. If paid, log Payment CREDIT to Account Ledger
    if (paidNum > 0) {
      await AccountLedger.create({
        particularId: String(quotation._id),
        billNo: quotation.billNo,
        customerName: quotation.customerName,
        date: quotation.date,
        companyName: quotation.companyName,
        debit: '0.00',
        credit: paidNum.toFixed(2),
        balance: '0.00',
        type: 'PAYMENT',
      });
    }

    if (billTotalNum > 0 || paidNum > 0) {
      await recalculateCustomerBalance(quotation.customerName);
    }

    res.status(200).json({
      success: true,
      message: `Quotation converted to Estimate Bill #${newBillNo} successfully!`,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkDuplicateParticulars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentSystemYear = new Date().getFullYear();
    const { templateBill, customers, year } = req.body;

    if (!templateBill || !Array.isArray(customers) || customers.length === 0) {
      res.status(400).json({ success: false, error: 'templateBill and customers list are required' });
      return;
    }

    const bType = templateBill.billType === 'GST' ? 'GST' : (templateBill.billType === 'QUOTATION' ? 'QUOTATION' : 'REGULAR');
    const targetYear = year ? Number(year) : (templateBill.year ? Number(templateBill.year) : currentSystemYear);
    const yearQuery = targetYear && !isNaN(targetYear) ? { year: targetYear } : {};

    // Find current max bill number for this billType and year
    let maxNum = 0;
    if (bType === 'GST') {
      const gstParticulars = await Particular.find({
        ...yearQuery,
        $or: [{ billType: 'GST' }, { billNo: { $regex: /^GST/i } }],
      }, 'billNo');
      for (const p of gstParticulars) {
        if (p.billNo) {
          const match = p.billNo.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
    } else if (bType === 'QUOTATION') {
      const quotationParticulars = await Particular.find({
        ...yearQuery,
        billType: 'QUOTATION',
      }, 'billNo');
      for (const p of quotationParticulars) {
        if (p.billNo) {
          const match = p.billNo.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      if (maxNum === 0) maxNum = 1000;
    } else {
      const regularParticulars = await Particular.find({
        ...yearQuery,
        $and: [
          { billType: { $nin: ['GST', 'QUOTATION'] } },
          { billNo: { $not: { $regex: /^GST/i } } },
        ],
      }, 'billNo');
      for (const p of regularParticulars) {
        if (p.billNo) {
          const match = p.billNo.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      if (maxNum === 0) maxNum = 1000;
    }

    const createdBills = [];
    const billTotalNum = parseFloat(String(templateBill.total || templateBill.amount || '0').replace(/,/g, '')) || 0;
    const paidNum = parseFloat(String(templateBill.paidAmount || (templateBill.paymentStatus === 'PAID' ? billTotalNum : '0')).replace(/,/g, '')) || 0;

    let computedStatus: 'PAID' | 'UNPAID' | 'PARTIAL' = 'UNPAID';
    if (templateBill.paymentStatus === 'PAID' || (paidNum >= billTotalNum && billTotalNum > 0)) {
      computedStatus = 'PAID';
    } else if (paidNum > 0 && paidNum < billTotalNum) {
      computedStatus = 'PARTIAL';
    }

    const rawDate = templateBill.date || new Date().toISOString().split('T')[0];

    for (const cust of customers) {
      const trimmedCustName = (cust.name || 'General').trim();
      if (!trimmedCustName) continue;

      // Increment bill number
      maxNum++;
      let finalBillNo = '';
      if (bType === 'GST') {
        finalBillNo = maxNum.toString().padStart(4, '0');
      } else {
        finalBillNo = maxNum.toString();
      }

      // Auto-create / update Customer in database if needed
      try {
        const existingCustomer = await Customer.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(trimmedCustName)}$`, 'i') },
        });

        if (!existingCustomer) {
          const allCusts = await Customer.find().sort({ createdAt: 1 });
          let maxId = 0;
          allCusts.forEach((c) => {
            if (c.idCode) {
              const m = c.idCode.match(/\d+/);
              if (m) {
                const n = parseInt(m[0], 10);
                if (n > maxId) maxId = n;
              }
            }
          });

          const avatarColors = [
            { bg: '#EFF6FF', color: '#1D4ED8' },
            { bg: '#ECFDF5', color: '#047857' },
            { bg: '#FEF3C7', color: '#B45309' },
            { bg: '#FDF2F8', color: '#BE185D' },
            { bg: '#F5F3FF', color: '#6D28D9' },
            { bg: '#FFF1F2', color: '#BE123C' },
          ];
          const colorPair = avatarColors[trimmedCustName.length % avatarColors.length];

          await Customer.create({
            name: trimmedCustName,
            mobile: cust.mobile || cust.phone || '-',
            address: cust.address || '-',
            gst: cust.gst || 'N/A',
            aadhar: cust.aadhar || '',
            avatarLetter: trimmedCustName.charAt(0).toUpperCase(),
            avatarBg: colorPair.bg,
            avatarColor: colorPair.color,
            idCode: `#${(maxId + 1).toString().padStart(4, '0')}`,
            year: currentSystemYear,
          });
        }
      } catch (custSyncErr) {
        console.warn('[Bulk Customer Sync Error]:', custSyncErr);
      }

      const bill = await Particular.create({
        customerName: trimmedCustName,
        customerPhone: cust.phone || cust.mobile || templateBill.customerPhone || '',
        customerAddress: cust.address || templateBill.customerAddress || '',
        customerGst: cust.gst || templateBill.customerGst || '',
        customerAadhar: cust.aadhar || templateBill.customerAadhar || '',
        caseCount: templateBill.caseCount || '0',
        companyName: templateBill.companyName || 'General',
        discount: templateBill.discount || '0',
        transport: templateBill.transport || '-',
        packing: templateBill.packing || '0',
        billNo: finalBillNo,
        tax: templateBill.tax || '0',
        amount: templateBill.amount || templateBill.total || '0.00',
        total: templateBill.total || templateBill.amount || '0.00',
        paymentStatus: computedStatus,
        paymentMode: templateBill.paymentMode || (computedStatus === 'PAID' ? 'CASH' : 'CREDIT'),
        paidAmount: paidNum > 0 ? paidNum.toFixed(2) : '0.00',
        notes: templateBill.notes || '',
        date: rawDate,
        year: targetYear,
        products: templateBill.products || [],
        billType: bType,
        placeOfSupply: templateBill.placeOfSupply || '',
        reverseCharge: templateBill.reverseCharge || 'No',
        vehicleNo: templateBill.vehicleNo || '',
        ewayBillNo: templateBill.ewayBillNo || '',
        gstRate: templateBill.gstRate || '18',
        cgstTotal: templateBill.cgstTotal || '0.00',
        sgstTotal: templateBill.sgstTotal || '0.00',
        igstTotal: templateBill.igstTotal || '0.00',
        roundOff: templateBill.roundOff || '0.00',
        despatchTo: cust.address || templateBill.despatchTo || '',
        lorryTransport: templateBill.lorryTransport || templateBill.transport || '',
        lrNo: templateBill.lrNo || '',
        lrDate: templateBill.lrDate || '',
        taxType: templateBill.taxType || 'IGST',
        taxPercent: templateBill.taxPercent || templateBill.gstRate || '18',
        cgstPercent: templateBill.cgstPercent || '0',
        sgstPercent: templateBill.sgstPercent || '0',
        igstPercent: templateBill.igstPercent || '18',
        subTotal: templateBill.subTotal || '0.00',
        netAmount: templateBill.netAmount || templateBill.total || '0.00',
        inWords: templateBill.inWords || '',
        billFlag: templateBill.billFlag || '',
      });

      if (bType !== 'GST' && bType !== 'QUOTATION') {
        if (billTotalNum > 0) {
          await AccountLedger.create({
            particularId: String(bill._id),
            billNo: bill.billNo,
            customerName: bill.customerName,
            date: bill.date,
            companyName: bill.companyName,
            debit: billTotalNum.toFixed(2),
            credit: '0.00',
            balance: '0.00',
            type: 'BILL',
          });
        }
        if (paidNum > 0) {
          await AccountLedger.create({
            particularId: String(bill._id),
            billNo: bill.billNo,
            customerName: bill.customerName,
            date: bill.date,
            companyName: bill.companyName,
            debit: '0.00',
            credit: paidNum.toFixed(2),
            balance: '0.00',
            type: 'PAYMENT',
          });
        }
        if (billTotalNum > 0 || paidNum > 0) {
          await recalculateCustomerBalance(bill.customerName);
        }
      }

      createdBills.push(bill);
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdBills.length} bills`,
      count: createdBills.length,
      data: createdBills,
      billNos: createdBills.map((b) => b.billNo),
    });
  } catch (error) {
    next(error);
  }
};
