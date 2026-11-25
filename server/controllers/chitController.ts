import type { Request, Response } from 'express';
import { ChitCustomer } from '../models/ChitCustomer';
import { ChitAllocation, type IChitInstallment } from '../models/ChitAllocation';
import { ChitPayment } from '../models/ChitPayment';
import { ChitReceipt } from '../models/ChitReceipt';
import { ChitScheme } from '../models/ChitScheme';
import { getNextChitSeq } from '../models/ChitCounter';
import { Settings } from '../models/Settings';

// Helper: Format Dates consistently
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDateDisplay(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// Helper: Build Safe Customer Query (Avoids CastError on _id when given string/numeric ID or legacy CHIT-CUS-)
function buildCustomerQuery(idStr: string) {
  const clean = String(idStr || '').trim();
  const stripped = clean.replace(/^CHIT-CUS-/i, '');
  if (clean.match(/^[0-9a-fA-F]{24}$/)) {
    return { $or: [{ _id: clean }, { chitCustomerId: clean }, { chitCustomerId: stripped }] };
  }
  return clean === stripped
    ? { chitCustomerId: clean }
    : { $or: [{ chitCustomerId: clean }, { chitCustomerId: stripped }] };
}

// Generate Installment Schedule
function generateInstallments(
  startMonthStr: string,
  duration: number,
  dueDay: number,
  monthlyAmount: number
): IChitInstallment[] {
  let startYear = new Date().getFullYear();
  let startMonthIdx = new Date().getMonth();

  if (startMonthStr) {
    if (/^\d{4}-\d{2}/.test(startMonthStr)) {
      const parts = startMonthStr.split('-');
      startYear = parseInt(parts[0], 10);
      startMonthIdx = parseInt(parts[1], 10) - 1;
    } else {
      const parsed = new Date(startMonthStr);
      if (!isNaN(parsed.getTime())) {
        startYear = parsed.getFullYear();
        startMonthIdx = parsed.getMonth();
      }
    }
  }

  const installments: IChitInstallment[] = [];
  const safeDay = Math.min(Math.max(1, dueDay || 10), 28);

  for (let i = 0; i < duration; i++) {
    const currentMonthTotal = startMonthIdx + i;
    const targetYear = startYear + Math.floor(currentMonthTotal / 12);
    const targetMonthIdx = currentMonthTotal % 12;

    const dueDate = new Date(targetYear, targetMonthIdx, safeDay, 23, 59, 59);
    const monthShort = MONTH_NAMES[targetMonthIdx];
    const dueDateStr = `${String(safeDay).padStart(2, '0')} ${monthShort} ${targetYear}`;
    const monthLabel = `Month ${i + 1} (${monthShort} ${targetYear})`;

    installments.push({
      installmentNumber: i + 1,
      monthLabel,
      dueDate,
      dueDateStr,
      amountDue: monthlyAmount,
      paidAmount: 0,
      remainingAmount: monthlyAmount,
      status: 'Pending',
      lastPaymentDate: null,
      lastPaymentDateStr: null,
    });
  }

  return installments;
}

// Determine payment timing
function calculatePaymentTiming(paymentDate: Date, dueDate: Date): 'On Time' | 'Advance' | 'Delay' {
  const pYear = paymentDate.getFullYear();
  const pMonth = paymentDate.getMonth();
  const dYear = dueDate.getFullYear();
  const dMonth = dueDate.getMonth();

  if (pYear < dYear || (pYear === dYear && pMonth < dMonth)) {
    return 'Advance';
  }

  // End of due day
  const endOfDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 23, 59, 59, 999);
  if (paymentDate.getTime() <= endOfDueDate.getTime()) {
    return 'On Time';
  }

  return 'Delay';
}

// -------------------------------------------------------------
// 1. Dashboard Summary
// -------------------------------------------------------------
export const getChitDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalCustomers, activeCustomers, allocations, payments] = await Promise.all([
      ChitCustomer.countDocuments(),
      ChitCustomer.countDocuments({ status: 'Active' }),
      ChitAllocation.find({ status: { $ne: 'Closed' } }),
      ChitPayment.aggregate([{ $group: { _id: null, totalCollected: { $sum: '$amountReceived' } } }]),
    ]);

    let totalPersons = 0;
    let expectedMonthly = 0;
    let totalPending = 0;

    allocations.forEach((alloc) => {
      totalPersons += alloc.personCount || 0;
      expectedMonthly += alloc.totalMonthlyAmount || 0;
      if (Array.isArray(alloc.installments)) {
        alloc.installments.forEach((inst: any) => {
          totalPending += inst.remainingAmount || 0;
        });
      }
    });

    const totalCollected = payments.length > 0 ? payments[0].totalCollected : 0;

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        totalPersons,
        expectedMonthly: Math.round(expectedMonthly * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
      },
    });
  } catch (err: any) {
    console.error('Error in getChitDashboard:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch chit dashboard' });
  }
};

// -------------------------------------------------------------
// 2. Chit Customer Controller
// -------------------------------------------------------------
export const createChitCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, mobile, whatsapp, email, address, city, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Customer Name is required' });
      return;
    }
    if (!mobile || !mobile.trim()) {
      res.status(400).json({ success: false, error: 'Mobile number is required' });
      return;
    }

    let chitCustomerId = '';
    let isUnique = false;
    while (!isUnique) {
      const seq = await getNextChitSeq('chitCustomer');
      chitCustomerId = String(seq).padStart(5, '0');
      const existing = await ChitCustomer.findOne({ chitCustomerId });
      if (!existing) {
        isUnique = true;
      }
    }

    const newCustomer = await ChitCustomer.create({
      chitCustomerId,
      name: name.trim(),
      mobile: mobile.trim(),
      whatsapp: whatsapp ? whatsapp.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      notes: notes ? notes.trim() : '',
      status: 'Active',
    });

    // If scheme information was provided during registration, auto-allocate
    const rawSchemes = req.body.schemes || (req.body.scheme ? [req.body.scheme] : []);
    if (rawSchemes.length > 0) {
      for (const s of rawSchemes) {
        if (!s.schemeName || !s.monthlyAmountPerPerson) continue;
        const schemeName = (s.schemeName || 'Chit Scheme').trim();
        const monthlyAmountPerPerson = parseFloat(s.monthlyAmountPerPerson) || 0;
        const personCount = Math.max(1, parseInt(s.personCount, 10) || 1);
        const duration = Math.max(1, parseInt(s.duration, 10) || 10);
        const startMonth = s.startMonth || new Date().toISOString().slice(0, 7);
        const dueDay = Math.min(Math.max(1, parseInt(s.dueDay, 10) || 10), 28);
        const bonusDetails = s.bonusDetails ? String(s.bonusDetails).trim() : '';
        const giftDetails = s.giftDetails ? String(s.giftDetails).trim() : '';

        if (monthlyAmountPerPerson > 0) {
          const totalMonthlyAmount = Math.round(monthlyAmountPerPerson * personCount * 100) / 100;
          const totalChitValue = Math.round(totalMonthlyAmount * duration * 100) / 100;
          const allocSeq = await getNextChitSeq('chitAllocation');
          const allocationId = `ALLOC-${String(allocSeq).padStart(5, '0')}`;
          const installments = generateInstallments(startMonth, duration, dueDay, totalMonthlyAmount);

          await ChitAllocation.create({
            allocationId,
            chitCustomerId: newCustomer.chitCustomerId,
            customerRef: newCustomer._id,
            schemeName,
            monthlyAmountPerPerson,
            personCount,
            totalMonthlyAmount,
            duration,
            startMonth,
            dueDay,
            totalChitValue,
            bonusDetails,
            giftDetails,
            status: 'Active',
            installments,
          });
        }
      }
    }

    res.status(201).json({ success: true, data: newCustomer });
  } catch (err: any) {
    console.error('Error in createChitCustomer:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create chit customer' });
  }
};

export const getAllChitCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const filter: any = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { chitCustomerId: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [customers, total] = await Promise.all([
      ChitCustomer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ChitCustomer.countDocuments(filter),
    ]);

    // Attach allocation summaries
    const customerIds = customers.map((c) => c.chitCustomerId);
    const allocations = await ChitAllocation.find({ chitCustomerId: { $in: customerIds } }).lean();

    const allocationMap = new Map<string, any[]>();
    allocations.forEach((a) => {
      const list = allocationMap.get(a.chitCustomerId) || [];
      list.push(a);
      allocationMap.set(a.chitCustomerId, list);
    });

    const enriched = customers.map((c) => {
      const allocs = allocationMap.get(c.chitCustomerId) || [];
      const totalPersons = allocs.reduce((sum, a) => sum + (a.personCount || 0), 0);
      const totalMonthly = allocs.reduce((sum, a) => sum + (a.totalMonthlyAmount || 0), 0);
      const totalValue = allocs.reduce((sum, a) => sum + (a.totalChitValue || 0), 0);
      return {
        ...c,
        allocationsCount: allocs.length,
        totalPersons,
        totalMonthly,
        totalValue,
        schemes: allocs.map((a) => a.schemeName).join(', '),
      };
    });

    res.status(200).json({
      success: true,
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('Error in getAllChitCustomers:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch chit customers' });
  }
};

export const getChitCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const idStr = String(req.params.id || '');
    const customer = await ChitCustomer.findOne(buildCustomerQuery(idStr)).lean();

    if (!customer) {
      res.status(404).json({ success: false, error: 'Chit customer not found' });
      return;
    }

    const allocations = await ChitAllocation.find({ chitCustomerId: customer.chitCustomerId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...customer,
        allocations,
      },
    });
  } catch (err: any) {
    console.error('Error in getChitCustomerById:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch customer details' });
  }
};

export const updateChitCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const idStr = String(req.params.id || '');
    const { name, mobile, whatsapp, email, address, city, notes, status } = req.body;

    const customer = await ChitCustomer.findOneAndUpdate(
      buildCustomerQuery(idStr),
      {
        ...(name && { name: name.trim() }),
        ...(mobile && { mobile: mobile.trim() }),
        ...(whatsapp !== undefined && { whatsapp: whatsapp.trim() }),
        ...(email !== undefined && { email: email.trim() }),
        ...(address !== undefined && { address: address.trim() }),
        ...(city !== undefined && { city: city.trim() }),
        ...(notes !== undefined && { notes: notes.trim() }),
        ...(status && { status }),
      },
      { new: true }
    );

    if (!customer) {
      res.status(404).json({ success: false, error: 'Chit customer not found' });
      return;
    }

    res.status(200).json({ success: true, data: customer });
  } catch (err: any) {
    console.error('Error in updateChitCustomer:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update chit customer' });
  }
};

// -------------------------------------------------------------
// 3. Chit Allocation Controller
// -------------------------------------------------------------
export const allocateChitScheme = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chitCustomerId, schemes } = req.body;

    if (!chitCustomerId) {
      res.status(400).json({ success: false, error: 'chitCustomerId is required' });
      return;
    }

    const custIdStr = String(chitCustomerId || '');
    const customer = await ChitCustomer.findOne(buildCustomerQuery(custIdStr));

    if (!customer) {
      res.status(404).json({ success: false, error: 'Chit customer does not exist' });
      return;
    }

    const schemeList = Array.isArray(schemes) ? schemes : [req.body];
    if (schemeList.length === 0) {
      res.status(400).json({ success: false, error: 'At least one scheme allocation is required' });
      return;
    }

    const createdAllocations = [];

    for (const s of schemeList) {
      const schemeName = (s.schemeName || 'Chit Scheme').trim();
      const monthlyAmountPerPerson = parseFloat(s.monthlyAmountPerPerson) || 0;
      const personCount = Math.max(1, parseInt(s.personCount, 10) || 1);
      const duration = Math.max(1, parseInt(s.duration, 10) || 10);
      const startMonth = s.startMonth || new Date().toISOString().slice(0, 7);
      const dueDay = Math.min(Math.max(1, parseInt(s.dueDay, 10) || 10), 28);
      const bonusDetails = s.bonusDetails ? String(s.bonusDetails).trim() : '';
      const giftDetails = s.giftDetails ? String(s.giftDetails).trim() : '';

      if (monthlyAmountPerPerson <= 0) {
        res.status(400).json({ success: false, error: 'Monthly installment per person must be greater than 0' });
        return;
      }

      const totalMonthlyAmount = Math.round(monthlyAmountPerPerson * personCount * 100) / 100;
      const totalChitValue = Math.round(totalMonthlyAmount * duration * 100) / 100;

      const seq = await getNextChitSeq('chitAllocation');
      const allocationId = `ALLOC-${String(seq).padStart(5, '0')}`;

      const installments = generateInstallments(startMonth, duration, dueDay, totalMonthlyAmount);

      const allocation = await ChitAllocation.create({
        allocationId,
        chitCustomerId: customer.chitCustomerId,
        customerRef: customer._id,
        schemeName,
        monthlyAmountPerPerson,
        personCount,
        totalMonthlyAmount,
        duration,
        startMonth,
        dueDay,
        totalChitValue,
        bonusDetails,
        giftDetails,
        status: 'Active',
        installments,
      });

      createdAllocations.push(allocation);
    }

    res.status(201).json({
      success: true,
      message: `Successfully allocated ${createdAllocations.length} scheme(s)`,
      data: createdAllocations,
    });
  } catch (err: any) {
    console.error('Error in allocateChitScheme:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to allocate chit scheme' });
  }
};

export const getCustomerAllocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const allocations = await ChitAllocation.find({ chitCustomerId: customerId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: allocations });
  } catch (err: any) {
    console.error('Error in getCustomerAllocations:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch allocations' });
  }
};

export const updateAllocationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { allocationId } = req.params;
    const { status } = req.body;

    if (!['Active', 'Completed', 'Closed'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid allocation status' });
      return;
    }

    const updated = await ChitAllocation.findOneAndUpdate(
      { allocationId },
      { status },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, error: 'Allocation not found' });
      return;
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error in updateAllocationStatus:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update allocation' });
  }
};

// -------------------------------------------------------------
// 4. Collections Overview
// -------------------------------------------------------------
export const getChitCollectionsOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, paymentStatus, scheme, month, page = 1, limit = 25 } = req.query;

    const customerQuery: any = {};
    if (status && status !== 'All') {
      customerQuery.status = status;
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      customerQuery.$or = [
        { name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { chitCustomerId: { $regex: q, $options: 'i' } },
      ];
    }

    const customers = await ChitCustomer.find(customerQuery).sort({ createdAt: -1 }).lean();
    if (customers.length === 0) {
      res.status(200).json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
      });
      return;
    }

    const customerIds = customers.map((c) => c.chitCustomerId);

    const allocQuery: any = { chitCustomerId: { $in: customerIds } };
    if (scheme && scheme !== 'All') {
      allocQuery.schemeName = { $regex: String(scheme).trim(), $options: 'i' };
    }

    const allocations = await ChitAllocation.find(allocQuery).lean();

    const allocationMap = new Map<string, any[]>();
    allocations.forEach((a) => {
      const list = allocationMap.get(a.chitCustomerId) || [];
      list.push(a);
      allocationMap.set(a.chitCustomerId, list);
    });

    let rows = customers
      .map((c) => {
        const userAllocs = allocationMap.get(c.chitCustomerId) || [];
        if (scheme && scheme !== 'All' && userAllocs.length === 0) {
          return null; // filtered out by scheme
        }

        let totalPersons = 0;
        let monthlyInstallment = 0;
        let totalChitValue = 0;
        let totalPaid = 0;
        let remainingAmount = 0;
        let paidMonths = 0;
        let pendingMonths = 0;

        userAllocs.forEach((a) => {
          totalPersons += a.personCount || 0;
          monthlyInstallment += a.totalMonthlyAmount || 0;
          totalChitValue += a.totalChitValue || 0;

          if (Array.isArray(a.installments)) {
            a.installments.forEach((inst: any) => {
              if (month && month !== 'All' && !inst.monthLabel.toLowerCase().includes(String(month).toLowerCase())) {
                return;
              }
              totalPaid += inst.paidAmount || 0;
              remainingAmount += inst.remainingAmount || 0;
              if (inst.status === 'Paid') {
                paidMonths += 1;
              } else {
                pendingMonths += 1;
              }
            });
          }
        });

        totalPaid = Math.round(totalPaid * 100) / 100;
        remainingAmount = Math.round(remainingAmount * 100) / 100;

        let computedPaymentStatus = 'Pending';
        if (totalPaid > 0 && remainingAmount <= 0) {
          computedPaymentStatus = 'Fully Paid';
        } else if (totalPaid > 0 && remainingAmount > 0) {
          computedPaymentStatus = 'Partially Paid';
        } else {
          computedPaymentStatus = 'Pending';
        }

        return {
          chitCustomerId: c.chitCustomerId,
          customerName: c.name,
          mobile: c.mobile,
          city: c.city,
          address: c.address,
          totalPersons,
          monthlyInstallment,
          totalChitValue,
          totalPaid,
          remainingAmount,
          paidMonths,
          pendingMonths,
          paymentStatus: computedPaymentStatus,
          customerStatus: c.status,
          allocationsCount: userAllocs.length,
          schemes: userAllocs.map((a) => a.schemeName),
        };
      })
      .filter(Boolean) as any[];

    // Filter by paymentStatus if provided
    if (paymentStatus && paymentStatus !== 'All') {
      rows = rows.filter((r) => r.paymentStatus === paymentStatus);
    }

    const total = rows.length;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 25);
    const skip = (pageNum - 1) * limitNum;
    const paginated = rows.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('Error in getChitCollectionsOverview:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch collections' });
  }
};

// -------------------------------------------------------------
// 5. Individual Customer Collection Details (Month-wise Installments)
// -------------------------------------------------------------
export const getCustomerCollectionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const idStr = String(req.params.customerId || '');
    const customer = await ChitCustomer.findOne(buildCustomerQuery(idStr)).lean();

    if (!customer) {
      res.status(404).json({ success: false, error: 'Chit customer not found' });
      return;
    }

    const allocations = await ChitAllocation.find({ chitCustomerId: customer.chitCustomerId })
      .sort({ createdAt: -1 })
      .lean();

    const payments = await ChitPayment.find({ chitCustomerId: customer.chitCustomerId })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    // Summary calculations
    let totalPersons = 0;
    let combinedMonthlyAmount = 0;
    let totalChitValue = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    allocations.forEach((a) => {
      totalPersons += a.personCount || 0;
      combinedMonthlyAmount += a.totalMonthlyAmount || 0;
      totalChitValue += a.totalChitValue || 0;
      if (Array.isArray(a.installments)) {
        a.installments.forEach((inst: any) => {
          totalPaid += inst.paidAmount || 0;
          totalRemaining += inst.remainingAmount || 0;
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        customer,
        summary: {
          totalPersons,
          combinedMonthlyAmount: Math.round(combinedMonthlyAmount * 100) / 100,
          totalChitValue: Math.round(totalChitValue * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalRemaining: Math.round(totalRemaining * 100) / 100,
        },
        allocations,
        payments,
      },
    });
  } catch (err: any) {
    console.error('Error in getCustomerCollectionDetails:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch customer collection details' });
  }
};

// -------------------------------------------------------------
// 6. Record Payment & Auto-Generate Receipt
// -------------------------------------------------------------
export const recordChitPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      chitCustomerId,
      allocationId,
      installmentNumber,
      amountReceived,
      paymentDate,
      paymentMode = 'Cash',
      transactionReference,
      notes,
    } = req.body;

    if (!chitCustomerId || !allocationId || installmentNumber === undefined || amountReceived === undefined) {
      res.status(400).json({
        success: false,
        error: 'chitCustomerId, allocationId, installmentNumber, and amountReceived are required',
      });
      return;
    }

    const payAmountNum = Math.round(parseFloat(amountReceived) * 100) / 100;
    if (isNaN(payAmountNum) || payAmountNum <= 0) {
      res.status(400).json({ success: false, error: 'Payment amount must be greater than 0' });
      return;
    }

    // Find Customer
    const customer = await ChitCustomer.findOne({ chitCustomerId });
    if (!customer) {
      res.status(404).json({ success: false, error: 'Chit customer not found' });
      return;
    }

    // Find Allocation
    const allocation = await ChitAllocation.findOne({ allocationId, chitCustomerId });
    if (!allocation) {
      res.status(404).json({ success: false, error: 'Chit allocation record not found' });
      return;
    }

    // Find target installment
    const instNum = parseInt(String(installmentNumber), 10);
    const targetInst = (allocation.installments as any[]).find((i) => i.installmentNumber === instNum);
    if (!targetInst) {
      res.status(404).json({ success: false, error: `Installment #${instNum} not found in this scheme` });
      return;
    }

    const remainingBal = Math.round(targetInst.remainingAmount * 100) / 100;
    if (remainingBal <= 0) {
      res.status(400).json({
        success: false,
        error: `Installment #${instNum} (${targetInst.monthLabel}) is already FULLY PAID! Overpayment is prohibited.`,
      });
      return;
    }

    if (payAmountNum > remainingBal) {
      res.status(400).json({
        success: false,
        error: `Cannot receive ₹${payAmountNum}. Outstanding balance for ${targetInst.monthLabel} is only ₹${remainingBal}. Overpayment is prohibited.`,
      });
      return;
    }

    // Parse payment date
    let effectiveDate = new Date();
    if (paymentDate) {
      const parsed = new Date(paymentDate);
      if (!isNaN(parsed.getTime())) {
        effectiveDate = parsed;
      }
    }
    const paymentDateStr = formatDateDisplay(effectiveDate);

    // Calculate Payment Timing: On Time, Advance, Delay
    const timing = calculatePaymentTiming(effectiveDate, new Date(targetInst.dueDate));

    const prevPaid = targetInst.paidAmount || 0;
    const newPaid = Math.round((prevPaid + payAmountNum) * 100) / 100;
    const newRemaining = Math.round((targetInst.amountDue - newPaid) * 100) / 100;

    targetInst.paidAmount = newPaid;
    targetInst.remainingAmount = Math.max(0, newRemaining);
    targetInst.status = newRemaining <= 0 ? 'Paid' : 'Partial';
    targetInst.lastPaymentDate = effectiveDate;
    targetInst.lastPaymentDateStr = paymentDateStr;

    // Check if entire allocation is completed
    const allPaid = (allocation.installments as any[]).every((i) => i.status === 'Paid');
    if (allPaid) {
      allocation.status = 'Completed';
    }

    await allocation.save();

    // Generate unique sequential payment ID and receipt number
    const paySeq = await getNextChitSeq('chitPayment');
    const paymentId = `PAY-${String(paySeq).padStart(5, '0')}`;

    const recSeq = await getNextChitSeq('chitReceipt');
    const receiptNumber = `CR-${String(recSeq).padStart(5, '0')}`;

    // Fetch store company settings for official receipt branding
    const companySettingsDoc = await Settings.findOne();
    const companyName = companySettingsDoc?.companyName || 'Sai Yogi Crackers';
    const companyAddress = companySettingsDoc?.address || 'Main Road, Sivakasi';
    const companyPhone = companySettingsDoc?.phone || '+91 98765 43210';
    const companyLogo = companySettingsDoc?.logoUrl || '';

    // Build Receipt Snapshot
    const receiptDataSnapshot = {
      receiptNumber,
      receiptDate: paymentDateStr,
      company: {
        name: companyName,
        address: companyAddress,
        phone: companyPhone,
        logoUrl: companyLogo,
      },
      customer: {
        chitCustomerId: customer.chitCustomerId,
        name: customer.name,
        mobile: customer.mobile,
        address: customer.address,
        city: customer.city,
      },
      scheme: {
        allocationId: allocation.allocationId,
        schemeName: allocation.schemeName,
        personCount: allocation.personCount,
        monthlyAmountPerPerson: allocation.monthlyAmountPerPerson,
        totalMonthlyAmount: allocation.totalMonthlyAmount,
        duration: allocation.duration,
        totalChitValue: allocation.totalChitValue,
      },
      payment: {
        paymentId,
        paymentMonth: targetInst.monthLabel,
        installmentNumber: targetInst.installmentNumber,
        installmentDueDate: targetInst.dueDateStr,
        monthlyInstallmentAmount: targetInst.amountDue,
        previouslyPaidAmount: prevPaid,
        currentPaymentAmount: payAmountNum,
        remainingInstallmentBalance: targetInst.remainingAmount,
        paymentDate: paymentDateStr,
        paymentMode,
        transactionReference: transactionReference || '-',
        paymentTimingStatus: timing,
        notes: notes || '',
      },
    };

    // Save Payment Record
    const paymentDoc = await ChitPayment.create({
      paymentId,
      chitCustomerId: customer.chitCustomerId,
      customerRef: customer._id,
      allocationId: allocation.allocationId,
      allocationRef: allocation._id,
      installmentId: targetInst._id,
      installmentNumber: targetInst.installmentNumber,
      paymentMonth: targetInst.monthLabel,
      amountDue: targetInst.amountDue,
      amountReceived: payAmountNum,
      paymentDate: effectiveDate,
      paymentDateStr,
      paymentMode,
      transactionReference: transactionReference ? String(transactionReference).trim() : '',
      paymentTimingStatus: timing,
      notes: notes ? String(notes).trim() : '',
      receiptId: receiptNumber,
    });

    // Save Receipt Record
    const receiptDoc = await ChitReceipt.create({
      receiptNumber,
      paymentId,
      chitCustomerId: customer.chitCustomerId,
      allocationId: allocation.allocationId,
      receiptDataSnapshot,
    });

    res.status(201).json({
      success: true,
      message: `Payment of ₹${payAmountNum} recorded successfully. Receipt #${receiptNumber} generated.`,
      data: {
        payment: paymentDoc,
        receipt: receiptDoc,
        allocation,
      },
    });
  } catch (err: any) {
    console.error('Error in recordChitPayment:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to record payment' });
  }
};

// -------------------------------------------------------------
// 7. Payment History & Receipts
// -------------------------------------------------------------
export const getCustomerPaymentHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const payments = await ChitPayment.find({ chitCustomerId: customerId })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: payments });
  } catch (err: any) {
    console.error('Error in getCustomerPaymentHistory:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch payment history' });
  }
};

export const getChitReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { receiptNumber } = req.params;
    const receipt = await ChitReceipt.findOne({
      $or: [{ receiptNumber }, { paymentId: receiptNumber }],
    }).lean();

    if (!receipt) {
      res.status(404).json({ success: false, error: 'Chit receipt not found' });
      return;
    }

    res.status(200).json({ success: true, data: receipt });
  } catch (err: any) {
    console.error('Error in getChitReceipt:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch chit receipt' });
  }
};

// -------------------------------------------------------------
// 8. Chit Schemes Master (Create / Read / Update / Delete)
// -------------------------------------------------------------
export const createChitScheme = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      schemeName,
      startDate,
      durationMonths,
      monthlyAmount,
      dueDay,
      status,
      description,
    } = req.body;

    if (!schemeName || !schemeName.trim()) {
      res.status(400).json({ success: false, error: 'Scheme name is required' });
      return;
    }

    const duration = Number(durationMonths) || 9;
    const amount = Number(monthlyAmount) || 0;
    const day = Number(dueDay) || 10;
    const totalValue = duration * amount;

    const seq = await getNextChitSeq('chit_scheme');
    const schemeId = `SCH-${String(seq).padStart(4, '0')}`;

    const scheme = await ChitScheme.create({
      schemeId,
      schemeName: schemeName.trim(),
      startDate: String(startDate || new Date().toISOString().split('T')[0]).trim(),
      durationMonths: duration,
      monthlyAmount: amount,
      dueDay: Math.min(Math.max(1, day), 31),
      totalValue,
      status: status || 'Active',
      description: (description || '').trim(),
    });

    res.status(201).json({ success: true, data: scheme });
  } catch (err: any) {
    console.error('Error in createChitScheme:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create scheme' });
  }
};

export const getAllChitSchemes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;
    const query: any = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      query.$or = [
        { schemeName: { $regex: term, $options: 'i' } },
        { schemeId: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
    }

    const schemes = await ChitScheme.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: schemes });
  } catch (err: any) {
    console.error('Error in getAllChitSchemes:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch schemes' });
  }
};

export const getChitSchemeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = String(id || '').trim();
    const query = idStr.match(/^[0-9a-fA-F]{24}$/)
      ? { $or: [{ _id: idStr }, { schemeId: idStr }] }
      : { schemeId: idStr };

    const scheme = await ChitScheme.findOne(query).lean();

    if (!scheme) {
      res.status(404).json({ success: false, error: 'Chit scheme not found' });
      return;
    }

    res.status(200).json({ success: true, data: scheme });
  } catch (err: any) {
    console.error('Error in getChitSchemeById:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch scheme' });
  }
};

export const updateChitScheme = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      schemeName,
      startDate,
      durationMonths,
      monthlyAmount,
      dueDay,
      status,
      description,
    } = req.body;

    const idStr = String(id || '').trim();
    const query = idStr.match(/^[0-9a-fA-F]{24}$/)
      ? { $or: [{ _id: idStr }, { schemeId: idStr }] }
      : { schemeId: idStr };

    const scheme = await ChitScheme.findOne(query);

    if (!scheme) {
      res.status(404).json({ success: false, error: 'Chit scheme not found' });
      return;
    }

    if (schemeName) scheme.schemeName = schemeName.trim();
    if (startDate) scheme.startDate = String(startDate).trim();
    if (durationMonths !== undefined) scheme.durationMonths = Number(durationMonths);
    if (monthlyAmount !== undefined) scheme.monthlyAmount = Number(monthlyAmount);
    if (dueDay !== undefined) scheme.dueDay = Math.min(Math.max(1, Number(dueDay)), 31);
    if (status) scheme.status = status;
    if (description !== undefined) scheme.description = (description || '').trim();

    scheme.totalValue = scheme.durationMonths * scheme.monthlyAmount;

    await scheme.save();
    res.status(200).json({ success: true, data: scheme });
  } catch (err: any) {
    console.error('Error in updateChitScheme:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update scheme' });
  }
};

export const deleteChitScheme = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = String(id || '').trim();
    const query = idStr.match(/^[0-9a-fA-F]{24}$/)
      ? { $or: [{ _id: idStr }, { schemeId: idStr }] }
      : { schemeId: idStr };

    const scheme = await ChitScheme.findOneAndDelete(query);

    if (!scheme) {
      res.status(404).json({ success: false, error: 'Chit scheme not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Scheme deleted successfully' });
  } catch (err: any) {
    console.error('Error in deleteChitScheme:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to delete scheme' });
  }
};
