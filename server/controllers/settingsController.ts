import type { Request, Response, NextFunction } from 'express';
import { Settings } from '../models/Settings';

/**
 * Server-authoritative system date and billing period helper.
 */
export const getSystemBillingInfo = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const billingStartDate = `01-01-${currentYear}`;
  const billingEndDate = `31-12-${currentYear}`;

  return {
    systemDate: now.toISOString(),
    systemYear: currentYear,
    billingYear: currentYear,
    billingStartDate,
    billingEndDate,
    billingStatus: 'Active',
  };
};

/**
 * Get the current company settings from MongoDB database.
 */
export const getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const billingInfo = getSystemBillingInfo();
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({
        companyName: 'Apsara Crackers',
        tagline: 'Standard Fire Works & Fancy Crackers',
        phone: '9843067073',
        whatsapp: '8778429299',
        address: '67 - H/E, Rajivgandhi Nagar, Near Ramji Polypack, Sivakasi Bus Stand , Sivakasi',
        city: 'Sivakasi',
        state: 'Tamil Nadu',
        pincode: '626123',
        billingYear: billingInfo.billingYear,
        billingStartDate: billingInfo.billingStartDate,
        billingEndDate: billingInfo.billingEndDate,
        billingStatus: billingInfo.billingStatus,
      });
    } else {
      let needsSave = false;
      if (!settings.companyName || settings.companyName.toLowerCase().includes('varun') || settings.companyName.toLowerCase().includes('dheeksha')) {
        settings.companyName = 'Apsara Crackers';
        needsSave = true;
      }
      if (!settings.phone || settings.phone.includes('98765')) {
        settings.phone = '9843067073';
        needsSave = true;
      }
      if (!settings.whatsapp || settings.whatsapp.includes('98765')) {
        settings.whatsapp = '8778429299';
        needsSave = true;
      }
      if (!settings.address || settings.address.toLowerCase().includes('tirupur') || settings.address.toLowerCase().includes('varun')) {
        settings.address = '67 - H/E, Rajivgandhi Nagar, Near Ramji Polypack, Sivakasi Bus Stand , Sivakasi';
        needsSave = true;
      }
      if (!settings.city) {
        settings.city = 'Sivakasi';
        needsSave = true;
      }
      if (!settings.state) {
        settings.state = 'Tamil Nadu';
        needsSave = true;
      }

      // Automatic Billing Period Synchronization with Server Date
      if (
        settings.billingYear !== billingInfo.billingYear ||
        settings.billingStartDate !== billingInfo.billingStartDate ||
        settings.billingEndDate !== billingInfo.billingEndDate ||
        settings.billingStatus !== billingInfo.billingStatus
      ) {
        settings.billingYear = billingInfo.billingYear;
        settings.billingStartDate = billingInfo.billingStartDate;
        settings.billingEndDate = billingInfo.billingEndDate;
        settings.billingStatus = billingInfo.billingStatus;
        needsSave = true;
      }

      if (needsSave) {
        await settings.save();
      }
    }

    const responseData = {
      ...(settings.toObject ? settings.toObject() : settings),
      systemDate: billingInfo.systemDate,
      systemYear: billingInfo.systemYear,
      billingYear: billingInfo.billingYear,
      billingStartDate: billingInfo.billingStartDate,
      billingEndDate: billingInfo.billingEndDate,
      billingStatus: billingInfo.billingStatus,
    };

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

/**
 * Update company settings in MongoDB database.
 */
export const updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const billingInfo = getSystemBillingInfo();
    const { _id, id, createdAt, updatedAt, __v, ...cleanedData } = req.body;

    // Backend Year Restriction & Validation
    const requestedYear = cleanedData.billingYear !== undefined
      ? cleanedData.billingYear
      : (cleanedData.billing_year !== undefined ? cleanedData.billing_year : undefined);

    if (requestedYear !== undefined && requestedYear !== null && requestedYear !== '') {
      const parsedYear = Number(requestedYear);
      if (isNaN(parsedYear) || parsedYear !== billingInfo.systemYear) {
        res.status(400).json({
          success: false,
          error: 'Invalid Billing Year: The selected billing year does not match the current system year. Billing dates are automatically synchronized with the system date.',
        });
        return;
      }
    }

    // Always enforce authoritative server billing period values
    cleanedData.billingYear = billingInfo.billingYear;
    cleanedData.billingStartDate = billingInfo.billingStartDate;
    cleanedData.billingEndDate = billingInfo.billingEndDate;
    cleanedData.billingStatus = billingInfo.billingStatus;

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: cleanedData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const responseData = {
      ...(settings ? (settings.toObject ? settings.toObject() : settings) : {}),
      systemDate: billingInfo.systemDate,
      systemYear: billingInfo.systemYear,
      billingYear: billingInfo.billingYear,
      billingStartDate: billingInfo.billingStartDate,
      billingEndDate: billingInfo.billingEndDate,
      billingStatus: billingInfo.billingStatus,
    };

    res.status(200).json({
      success: true,
      message: 'Company settings updated successfully in database',
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};
