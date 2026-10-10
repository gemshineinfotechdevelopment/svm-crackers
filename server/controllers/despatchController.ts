import type { Request, Response, NextFunction } from 'express';
import { Despatch } from '../models/Despatch';
import { Particular } from '../models/Particular';
import { escapeRegex } from '../utils/ledgerUtils';
import { extractYearFromDate } from '../utils/yearUtils';

export const getDespatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, search, fromDate, toDate, transport, agent } = req.query;
    const andConditions: any[] = [];

    // 1. Year filter
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

    // 2. Search query (Party Name, Place, Transport, LR NO, Party NO, Agent, Bill No)
    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = escapeRegex(search.trim());
      andConditions.push({
        $or: [
          { partyName: { $regex: new RegExp(term, 'i') } },
          { place: { $regex: new RegExp(term, 'i') } },
          { transport: { $regex: new RegExp(term, 'i') } },
          { lrNo: { $regex: new RegExp(term, 'i') } },
          { partyNo: { $regex: new RegExp(term, 'i') } },
          { agent: { $regex: new RegExp(term, 'i') } },
          { billNo: { $regex: new RegExp(term, 'i') } },
          { sNo: { $regex: new RegExp(term, 'i') } },
        ],
      });
    }

    // 3. Transport filter
    if (transport && typeof transport === 'string' && transport.trim() !== '' && transport.toLowerCase() !== 'all') {
      andConditions.push({
        transport: { $regex: new RegExp(`^${escapeRegex(transport.trim())}$`, 'i') },
      });
    }

    // 4. Agent filter
    if (agent && typeof agent === 'string' && agent.trim() !== '' && agent.toLowerCase() !== 'all') {
      andConditions.push({
        agent: { $regex: new RegExp(`^${escapeRegex(agent.trim())}$`, 'i') },
      });
    }

    const filter: any = andConditions.length > 0 ? { $and: andConditions } : {};
    const despatches = await Despatch.find(filter).sort({ createdAt: -1, _id: -1 });

    res.status(200).json({
      success: true,
      count: despatches.length,
      data: despatches,
    });
  } catch (error) {
    next(error);
  }
};

export const getDespatchById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const despatch = await Despatch.findById(id);
    if (!despatch) {
      res.status(404).json({ success: false, message: 'Despatch entry not found' });
      return;
    }
    res.status(200).json({ success: true, data: despatch });
  } catch (error) {
    next(error);
  }
};

export const getNextSNo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const year = req.query.year ? String(req.query.year) : String(new Date().getFullYear());
    const filter: any = {};
    if (year && year.toUpperCase() !== 'ALL') {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear)) {
        filter.$or = [{ year: parsedYear }, { year: String(parsedYear) }];
      }
    }

    const allDespatches = await Despatch.find(filter).lean();
    let maxSNo = 0;
    for (const d of allDespatches) {
      const num = parseInt(String(d.sNo).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxSNo) {
        maxSNo = num;
      }
    }

    res.status(200).json({
      success: true,
      nextSNo: maxSNo + 1,
    });
  } catch (error) {
    next(error);
  }
};

export const createDespatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      sNo,
      date,
      partyName,
      place,
      bundles,
      transport,
      lrNo,
      partyNo,
      agent,
      billNo,
      billType,
      billId,
      year,
      status,
      remarks,
    } = req.body;

    if (!partyName || !partyName.trim()) {
      res.status(400).json({ success: false, message: 'Party Name is required' });
      return;
    }

    const currentYear = year || extractYearFromDate(date, new Date().getFullYear());

    // Auto compute sNo if not provided
    let finalSNo = sNo;
    if (!finalSNo || String(finalSNo).trim() === '') {
      const allDespatches = await Despatch.find({
        $or: [{ year: currentYear }, { year: String(currentYear) }],
      }).lean();
      let maxNum = 0;
      for (const d of allDespatches) {
        const num = parseInt(String(d.sNo).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      finalSNo = maxNum + 1;
    }

    const newDespatch = await Despatch.create({
      sNo: finalSNo,
      date: date || new Date().toISOString().split('T')[0],
      partyName: partyName.trim(),
      place: (place || '').trim(),
      bundles: bundles || '1',
      transport: (transport || '').trim(),
      lrNo: (lrNo || '').trim(),
      partyNo: (partyNo || '').trim(),
      agent: (agent || '').trim(),
      billNo: (billNo || '').trim(),
      billType: billType || 'MANUAL',
      billId: billId || null,
      year: currentYear,
      status: status || 'DESPATCHED',
      remarks: remarks || '',
    });

    res.status(201).json({
      success: true,
      message: 'Despatch entry created successfully',
      data: newDespatch,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDespatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await Despatch.findByIdAndUpdate(
      id,
      {
        ...req.body,
        ...(req.body.partyName && { partyName: req.body.partyName.trim() }),
        ...(req.body.place !== undefined && { place: req.body.place.trim() }),
        ...(req.body.transport !== undefined && { transport: req.body.transport.trim() }),
        ...(req.body.lrNo !== undefined && { lrNo: req.body.lrNo.trim() }),
        ...(req.body.partyNo !== undefined && { partyNo: req.body.partyNo.trim() }),
        ...(req.body.agent !== undefined && { agent: req.body.agent.trim() }),
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: 'Despatch entry not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Despatch entry updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDespatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await Despatch.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Despatch entry not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Despatch entry deleted successfully',
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

export const syncFromBills = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year } = req.body;
    const filter: any = {};
    if (year && String(year).toUpperCase() !== 'ALL') {
      const pYear = parseInt(String(year), 10);
      if (!isNaN(pYear)) {
        filter.$or = [{ year: pYear }, { year: String(pYear) }];
      }
    }

    const bills = await Particular.find(filter).sort({ createdAt: 1 }).lean();
    let createdCount = 0;
    let updatedCount = 0;

    // Get current max sNo
    const existingDespatches = await Despatch.find().lean();
    const existingBillIdMap = new Map<string, any>();
    let maxSNo = 0;

    for (const d of existingDespatches) {
      if (d.billId) {
        existingBillIdMap.set(String(d.billId), d);
      }
      const num = parseInt(String(d.sNo).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxSNo) maxSNo = num;
    }

    for (const b of bills) {
      const bId = String(b._id);
      const partyName = b.customerName || '';
      if (!partyName.trim()) continue;

      const place = b.despatchTo || b.customerAddress || '';
      const transport = b.lorryTransport || b.transport || '';
      const lrNo = b.lrNo || '';
      const partyNo = b.customerPhone || '';
      const bundles = b.caseCount || (b.products ? b.products.reduce((acc: number, p: any) => acc + (parseFloat(p.quantity) || 0), 0) : '1') || '1';
      const bYear = b.year || extractYearFromDate(b.date, new Date().getFullYear());

      if (existingBillIdMap.has(bId)) {
        const existing = existingBillIdMap.get(bId);
        // Update if details changed
        await Despatch.findByIdAndUpdate(existing._id, {
          partyName,
          place: place || existing.place,
          transport: transport || existing.transport,
          lrNo: lrNo || existing.lrNo,
          partyNo: partyNo || existing.partyNo,
          bundles: bundles || existing.bundles,
          date: b.date || existing.date,
          billNo: b.billNo || existing.billNo,
          billType: b.billType || 'REGULAR',
        });
        updatedCount++;
      } else {
        // Create new
        maxSNo++;
        await Despatch.create({
          sNo: maxSNo,
          date: b.date || new Date().toISOString().split('T')[0],
          partyName,
          place,
          bundles: String(bundles),
          transport,
          lrNo,
          partyNo,
          agent: '',
          billNo: b.billNo || '',
          billType: b.billType || (b.billNo && b.billNo.startsWith('GST') ? 'GST' : 'REGULAR'),
          billId: b._id,
          year: bYear,
          status: 'DESPATCHED',
        });
        createdCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Sync completed: ${createdCount} created, ${updatedCount} updated`,
      createdCount,
      updatedCount,
    });
  } catch (error) {
    next(error);
  }
};
