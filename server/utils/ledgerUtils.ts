import { AccountLedger } from '../models/AccountLedger';

export const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

export const recalculateCustomerBalance = async (customerName: string): Promise<void> => {
  if (!customerName || customerName.trim() === '' || customerName.toLowerCase() === 'all') return;
  try {
    const escapedName = escapeRegex(customerName.trim());
    const entries = await AccountLedger.find({
      customerName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    }).sort({ createdAt: 1, _id: 1 });

    let currentBalance = 0;
    for (const entry of entries) {
      const deb = parseFloat(String(entry.debit || '0').replace(/,/g, '')) || 0;
      const cred = parseFloat(String(entry.credit || '0').replace(/,/g, '')) || 0;
      currentBalance = currentBalance + cred - deb;
      entry.balance = currentBalance.toFixed(2);
      await entry.save();
    }
  } catch (err) {
    console.error(`Failed to recalculate balance for customer ${customerName}:`, err);
  }
};

