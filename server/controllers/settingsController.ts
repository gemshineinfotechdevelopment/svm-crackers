import type { Request, Response, NextFunction } from 'express';
import { Settings } from '../models/Settings';

/**
 * Get the current company settings from MongoDB database.
 */
export const getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
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
      if (needsSave) {
        await settings.save();
      }
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/**
 * Update company settings in MongoDB database.
 */
export const updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { _id, id, createdAt, updatedAt, __v, ...cleanedData } = req.body;
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: cleanedData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Company settings updated successfully in database',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};
