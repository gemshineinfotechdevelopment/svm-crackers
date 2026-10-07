import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { Particular } from './models/Particular';
import PriceList from './models/PriceList';
import { Product } from './models/Product';
import { Customer } from './models/Customer';
import { AccountLedger } from './models/AccountLedger';
import Category from './models/Category';

const DEFAULT_CATEGORIES = [
  { name: 'One Sound Crackers', code: 'OSC', description: 'Single sound crackers and atom bombs', color: '#DC2626', displayOrder: 1 },
  { name: 'Ground Chakkars', code: 'GCK', description: 'Ground spinning chakkars and wheels', color: '#EA580C', displayOrder: 2 },
  { name: 'Flower Pots / Sparklers', code: 'FPS', description: 'Color flower pots and brilliant sparklers', color: '#D97706', displayOrder: 3 },
  { name: 'Rockets & Missiles', code: 'RKT', description: 'Sky rockets and whistling missiles', color: '#7C3AED', displayOrder: 4 },
  { name: 'Fancy Aerial Shots', code: 'FAS', description: 'Multi-color aerial repeaters and display cakes', color: '#2563EB', displayOrder: 5 },
  { name: 'Garland Crackers (Wala)', code: 'GCW', description: '100 to 10,000 count celebration garlands', color: '#059669', displayOrder: 6 },
  { name: 'Gift Boxes', code: 'GFB', description: 'Festival combo assortment gift boxes', color: '#DB2777', displayOrder: 7 },
  { name: 'General & Miscellaneous', code: 'GEN', description: 'Matches, caps, and novelty items', color: '#4B5563', displayOrder: 8 },
];

const clearAllDatabaseData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    console.log('🗑️ Clearing collections...');
    const [partRes, priceRes, prodRes, custRes, accRes, catRes] = await Promise.all([
      Particular.deleteMany({}),
      PriceList.deleteMany({}),
      Product.deleteMany({}),
      Customer.deleteMany({}),
      AccountLedger.deleteMany({}),
      Category.deleteMany({}),
    ]);

    console.log(`- Deleted ${partRes.deletedCount} Bills/Invoices (Particulars)`);
    console.log(`- Deleted ${priceRes.deletedCount} Price List items`);
    console.log(`- Deleted ${prodRes.deletedCount} Products`);
    console.log(`- Deleted ${custRes.deletedCount} Customers`);
    console.log(`- Deleted ${accRes.deletedCount} Ledger/Credit records`);
    console.log(`- Deleted ${catRes.deletedCount} Categories`);

    console.log('\n✨ Database is now completely clean and empty, ready for your fresh testing!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
};

clearAllDatabaseData();
