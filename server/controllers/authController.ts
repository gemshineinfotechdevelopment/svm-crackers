import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Admin } from '../models/Admin';

const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
};

export const seedDefaultAdmin = async (): Promise<void> => {
  try {
    // 1. Ensure Default Admin user exists with role: 'admin'
    const defaultUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const defaultPassword = (process.env.ADMIN_PASSWORD || 'password123').trim();
    const admin = await Admin.findOne({ username: defaultUsername });
    if (!admin) {
      await Admin.create({
        username: defaultUsername,
        password: hashPassword(defaultPassword),
        role: 'admin',
      });
      console.log(`[Auth] Default Admin created: ${defaultUsername}`);
    }

    // 2. Ensure Super User: 'shana_maayo_16' exists with role: 'superadmin' and password: 'admin123'
    const shanaAdmin = await Admin.findOne({ username: 'shana_maayo_16' });
    if (!shanaAdmin) {
      await Admin.create({
        username: 'shana_maayo_16',
        password: hashPassword('admin123'),
        role: 'superadmin',
      });
      console.log('[Auth] Super Admin "shana_maayo_16" created successfully (role: superadmin, password: admin123)');
    } else if (shanaAdmin.role !== 'superadmin') {
      shanaAdmin.role = 'superadmin';
      await shanaAdmin.save();
      console.log('[Auth] "shana_maayo_16" verified with role: superadmin');
    }
  } catch (error) {
    console.error('[Auth Error] Failed to seed admin accounts:', error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Please enter both username and password' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const hashedPassword = hashPassword(cleanPassword);

    // Find admin user by username
    let admin = await Admin.findOne({ username: cleanUsername });

    // If no admin exists in DB at all, auto seed and re-fetch
    if (!admin) {
      const totalAdmins = await Admin.countDocuments();
      if (totalAdmins === 0 && (cleanUsername === 'admin' || cleanUsername === 'svm')) {
        admin = await Admin.create({
          username: cleanUsername,
          password: hashedPassword,
          role: 'admin',
        });
      }
    }

    if (!admin) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    // Verify password (check hashed or legacy plain)
    const isMatch = admin.password === hashedPassword || admin.password === cleanPassword;

    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = await Admin.findOne().select('-password');
    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
};

export const getAllAdmins = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admins = await Admin.find().select('username role createdAt updatedAt').sort({ role: -1, username: 1 });
    res.status(200).json({ success: true, data: admins });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      operatorUsername,
      targetUsername,
      username,
      newPassword,
      confirmPassword,
      currentPassword,
    } = req.body;

    const target = String(targetUsername || username || '').trim().toLowerCase();
    const operator = String(operatorUsername || '').trim().toLowerCase();

    if (!target) {
      res.status(400).json({ success: false, error: 'Target username is required' });
      return;
    }

    if (!newPassword || !String(newPassword).trim()) {
      res.status(400).json({ success: false, error: 'New password is required' });
      return;
    }

    const cleanNewPass = String(newPassword).trim();

    if (confirmPassword !== undefined && cleanNewPass !== String(confirmPassword).trim()) {
      res.status(400).json({ success: false, error: 'New password and confirm password do not match' });
      return;
    }

    if (cleanNewPass.length < 4) {
      res.status(400).json({ success: false, error: 'Password must be at least 4 characters long' });
      return;
    }

    // Find the target admin user in the database
    const targetAdmin = await Admin.findOne({ username: target });
    if (!targetAdmin) {
      res.status(404).json({ success: false, error: `User "${target}" not found in database` });
      return;
    }

    // Check if operator is a Super Admin
    let isSuperAdmin = false;
    if (operator) {
      const opUser = await Admin.findOne({ username: operator });
      if (opUser && opUser.role === 'superadmin') {
        isSuperAdmin = true;
      }
    }

    // Only Super Admin can change passwords of other users
    if (operator && operator !== target && !isSuperAdmin) {
      res.status(403).json({
        success: false,
        error: 'Permission denied: Only Super Admin can change passwords for other users.',
      });
      return;
    }

    // If currentPassword is provided, verify it against the database (unless superadmin override)
    if (currentPassword && String(currentPassword).trim()) {
      const cleanCurrent = String(currentPassword).trim();
      const currentHashed = hashPassword(cleanCurrent);
      const isMatch = targetAdmin.password === currentHashed || targetAdmin.password === cleanCurrent;
      if (!isMatch && !isSuperAdmin) {
        res.status(400).json({ success: false, error: 'Current password does not match' });
        return;
      }
    }

    // Update ONLY the target user's password in MongoDB
    const newHashedPassword = hashPassword(cleanNewPass);
    targetAdmin.password = newHashedPassword;
    await targetAdmin.save();

    console.log(`[Auth] Password updated in MongoDB for user: "${targetAdmin.username}" (role: ${targetAdmin.role})`);

    res.status(200).json({
      success: true,
      message: `Password updated successfully in database for user "${targetAdmin.username}"`,
      user: {
        username: targetAdmin.username,
        role: targetAdmin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
