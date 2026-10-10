import type { Request, Response, NextFunction } from 'express';
import { Settings } from '../models/Settings';

/**
 * Get system date and annual billing information derived from authoritative server date.
 */
export const getBillingPeriodInfo = (customDate?: Date) => {
  const now = customDate || new Date();
  const currentYear = now.getFullYear();
  const systemYear = currentYear.toString();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const systemDateStr = `${day}-${month}-${systemYear}`;
  
  return {
    systemDate: systemDateStr,
    systemYear: currentYear,
    billingYear: currentYear,
    billingStartDate: `01-01-${currentYear}`,
    billingEndDate: `31-12-${currentYear}`,
    billingStatus: 'Active',
  };
};

export const getSystemBillingInfo = getBillingPeriodInfo;

/**
 * Get the current company settings from MongoDB database.
 */
export const getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const billingInfo = getBillingPeriodInfo();
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({
        companyName: 'S.V.M Fireworks Agencies',
        tagline: 'Standard Fire Works & Fancy Crackers',
        phone: '9843067073',
        whatsapp: '8778429299',
        address: 'No. 2/A13 & 2/A14, Sivakasi - Virudhunagar Road, Keela Thiruthangal - 626 130. Tamil Nadu',
        city: 'Sivakasi',
        state: 'Tamil Nadu',
        pincode: '626130',
        gstin: '33ADBFS7999E1ZO',
        licNo: 'E/SS/TN/24/83 (E86652)',
        billingYear: billingInfo.billingYear,
        billingStartDate: billingInfo.billingStartDate,
        billingEndDate: billingInfo.billingEndDate,
        billingStatus: billingInfo.billingStatus,
      });
    } else {
      let needsSave = false;
      if (!settings.companyName || settings.companyName.toLowerCase().includes('varun') || settings.companyName.toLowerCase().includes('dheeksha') || settings.companyName.toLowerCase().includes('apsara') || settings.companyName.toLowerCase().includes('manjula')) {
        settings.companyName = 'S.V.M Fireworks Agencies';
        needsSave = true;
      }
      if (!settings.phone) {
        settings.phone = '9843067073';
        needsSave = true;
      }
      if (!settings.whatsapp) {
        settings.whatsapp = '8778429299';
        needsSave = true;
      }
      if (!settings.address || settings.address.toLowerCase().includes('tirupur') || settings.address.toLowerCase().includes('varun') || settings.address.toLowerCase().includes('rajivgandhi') || settings.address.toLowerCase().includes('67 - h/e')) {
        settings.address = 'No. 2/A13 & 2/A14, Sivakasi - Virudhunagar Road, Keela Thiruthangal - 626 130. Tamil Nadu';
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
      if (!settings.gstin) {
        settings.gstin = '33ADBFS7999E1ZO';
        needsSave = true;
      }
      if (!settings.licNo) {
        settings.licNo = 'E/SS/TN/24/83 (E86652)';
        needsSave = true;
      }

      // Auto-sync billing fields if year rolled over or fields missing
      if (
        String(settings.billingYear) !== String(billingInfo.billingYear) ||
        !settings.billingStartDate ||
        !settings.billingEndDate
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
      ...(settings ? (settings.toObject ? settings.toObject() : settings) : {}),
      ...billingInfo,
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
    const billingInfo = getBillingPeriodInfo();
    const { _id, id, createdAt, updatedAt, __v, ...cleanedData } = req.body;

    // Backend Validation: Compare requested billingYear against authoritative server system year
    if (cleanedData.billingYear && Number(cleanedData.billingYear) !== billingInfo.systemYear) {
      res.status(400).json({
        success: false,
        error: 'Billing year cannot be changed manually. The billing year must remain synchronized with the current system date.',
        message: 'Invalid Billing Year. The selected billing year does not match the current system year. Billing dates are automatically synchronized with the system date.',
      });
      return;
    }

    // Always enforce server system billing period fields
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
      ...billingInfo,
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
