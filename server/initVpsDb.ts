import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

import { connectDB } from './config/db';
import { Admin } from './models/Admin';
import { Company } from './models/Company';
import { Settings } from './models/Settings';
import { Customer } from './models/Customer';
import { Product } from './models/Product';
import { Category } from './models/Category';
import { PriceList } from './models/PriceList';
import { Particular } from './models/Particular';
import { AccountLedger } from './models/AccountLedger';
import { Inventory } from './models/Inventory';

const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
};

export const initVpsDatabase = async (): Promise<void> => {
  console.log('=============================================');
  console.log('🚀 Initializing Apsara Crackers Database on VPS');
  console.log('=============================================');

  try {
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection instance not available.');
    }

    console.log(`\n📂 Target Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);

    // List of core collections to ensure exist
    const models = [
      { name: 'admins', model: Admin },
      { name: 'customers', model: Customer },
      { name: 'companies', model: Company },
      { name: 'products', model: Product },
      { name: 'categories', model: Category },
      { name: 'pricelists', model: PriceList },
      { name: 'particulars', model: Particular },
      { name: 'accountledgers', model: AccountLedger },
      { name: 'settings', model: Settings },
      { name: 'inventories', model: Inventory },
    ];

    console.log('\n🔨 Ensuring collections and indexes exist...');
    for (const item of models) {
      await item.model.createIndexes();
      console.log(`   ✓ Collection & indexes verified: ${item.name}`);
    }

    // 1. Seed or Verify Default Admin
    const defaultUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const defaultPassword = (process.env.ADMIN_PASSWORD || 'password123').trim();
    const existingAdmin = await Admin.findOne({ username: defaultUsername });

    if (!existingAdmin) {
      await Admin.create({
        username: defaultUsername,
        password: hashPassword(defaultPassword),
        role: 'admin',
      });
      console.log(`\n👤 Default Admin Created:`);
      console.log(`   Username: ${defaultUsername}`);
      console.log(`   Password: ${defaultPassword}`);
    } else {
      console.log(`\n👤 Admin user already exists: ${existingAdmin.username}`);
    }

    // 2. Seed Default Company (Apsara Crackers) if none exists
    const companyCount = await Company.countDocuments();
    if (companyCount === 0) {
      await Company.create({
        slNo: '01',
        name: 'Apsara Crackers',
        avatarLetter: 'A',
        avatarBg: '#DBEAFE',
        avatarColor: '#0B4DB7',
        address: 'Sivakasi, Tamil Nadu - 626123',
        gstin: '33AAAAA0000A1Z5',
      });
      console.log(`\n🏢 Default Company Created: Apsara Crackers`);
    }

    // 3. Seed Default Settings if none exists
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create({
        companyName: 'Apsara Crackers',
        address: 'Sivakasi, Tamil Nadu - 626123',
        phone: '9876543210',
        email: 'info@apsaracrackers.com',
        gstin: '33AAAAA0000A1Z5',
        theme: 'dark',
      });
      console.log(`⚙️ Default Application Settings Created`);
    }

    console.log('\n=============================================');
    console.log('✅ Apsara Crackers VPS Database initialized successfully!');
    console.log(`   Database Name : ${mongoose.connection.name}`);
    console.log(`   Admin Login   : ${defaultUsername} / ${defaultPassword}`);
    console.log('=============================================\n');

  } catch (error) {
    console.error('\n❌ Error during database initialization:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  }
};

// Execute if run directly from CLI
if (require.main === module) {
  initVpsDatabase();
}
