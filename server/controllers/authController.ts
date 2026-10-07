import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Admin } from '../models/Admin';

const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
};

export const seedDefaultAdmin = async (): Promise<void> => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
      const defaultPassword = (process.env.ADMIN_PASSWORD || 'password123').trim();
      // Create initial default admin credentials
      await Admin.create({
        username: defaultUsername,
        password: hashPassword(defaultPassword),
        role: 'admin',
      });
      console.log('=============================================');
      console.log('[Auth] Default Admin created successfully:');
      console.log(`       Username: ${defaultUsername}`);
      console.log(`       Password: ${defaultPassword}`);
      console.log('=============================================');
    }
  } catch (error) {
    console.error('[Auth Error] Failed to seed default admin:', error);
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
      if (totalAdmins === 0 && (cleanUsername === 'admin' || cleanUsername === 'apsara')) {
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
