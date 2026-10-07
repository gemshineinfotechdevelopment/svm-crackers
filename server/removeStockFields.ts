import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

import { connectDB } from './config/db';

export const removeStockFields = async (): Promise<void> => {
  console.log('=============================================');
  console.log('🧹 Removing Stock Fields from MongoDB Collections');
  console.log('=============================================');

  try {
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection instance not available.');
    }

    console.log(`\n📂 Target Database: ${mongoose.connection.name}`);

    const fieldsToUnset = {
      shopStock: '',
      godownStock: '',
      stock: '',
      shop_stock: '',
      godown_stock: '',
      totalStock: '',
      shop: '',
      godown: '',
      counterStock: '',
      quantity: '',
      qty: '',
      Stock: '',
      'Shop Stock': '',
      'Godown Stock': '',
      'Total Stock': '',
    };

    // 1. Unset in 'products' collection
    console.log('\n📦 Cleaning products collection...');
    const prodRes = await db.collection('products').updateMany(
      {},
      { $unset: fieldsToUnset }
    );
    console.log(`   ✓ Matched: ${prodRes.matchedCount}, Modified: ${prodRes.modifiedCount} products`);

    // 2. Unset in 'pricelists' collection
    console.log('\n📋 Cleaning pricelists collection...');
    const priceRes = await db.collection('pricelists').updateMany(
      {},
      { $unset: fieldsToUnset }
    );
    console.log(`   ✓ Matched: ${priceRes.matchedCount}, Modified: ${priceRes.modifiedCount} price list items`);

    // 3. Drop or Clean 'inventories' collection if present
    try {
      const collections = await db.listCollections({ name: 'inventories' }).toArray();
      if (collections.length > 0) {
        console.log('\n🏪 Dropping unused inventories collection...');
        await db.collection('inventories').drop();
        console.log('   ✓ inventories collection dropped successfully');
      }
    } catch (invErr: any) {
      console.log('   ℹ inventories collection clean:', invErr.message);
    }

    console.log('\n=============================================');
    console.log('✅ Stock details removed from database successfully!');
    console.log('=============================================\n');

  } catch (error) {
    console.error('\n❌ Error removing stock fields:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  }
};

if (require.main === module) {
  removeStockFields();
}
