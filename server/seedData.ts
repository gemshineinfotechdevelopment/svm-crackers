import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import { connectDB } from './config/db';
import { Customer } from './models/Customer';
import { Company } from './models/Company';
import { Product } from './models/Product';
import { Particular } from './models/Particular';
import { AccountLedger } from './models/AccountLedger';
import { seedDefaultAdmin } from './controllers/authController';

const seedSampleData = async () => {
  try {
    console.log('🌱 Connecting to database...');
    await connectDB();

    console.log('👤 Ensuring default admin exists...');
    await seedDefaultAdmin();

    console.log('🧹 Clearing existing sample collections (preserving admin)...');
    await Customer.deleteMany({});
    await Company.deleteMany({});
    await Product.deleteMany({});
    await Particular.deleteMany({});
    await AccountLedger.deleteMany({});

    console.log('📦 Seeding Products...');
    const products = await Product.insertMany([
      { slNo: 1, name: 'Cotton Shirt Fabric 40s' },
      { slNo: 2, name: 'Linen Blend Fabric 60s' },
      { slNo: 3, name: 'Silk Jacquard Material' },
      { slNo: 4, name: 'Denim Indigo 12oz' },
      { slNo: 5, name: 'Rayon Printed Fabric' },
      { slNo: 6, name: 'Polyester Twill Grey' },
      { slNo: 7, name: 'Knitted Jersey Single' },
    ]);

    console.log('🏢 Seeding Companies...');
    const companies = await Company.insertMany([
      {
        slNo: '01',
        name: 'Apsara Crackers',
        avatarLetter: 'A',
        avatarBg: '#DBEAFE',
        avatarColor: '#0B4DB7',
        address: '14, Textile Park Road, Tirupur, Tamil Nadu - 641602',
        gstin: '33AAACD1234F1Z5',
      },
      {
        slNo: '02',
        name: 'Sri Lakshmi Textiles',
        avatarLetter: 'S',
        avatarBg: '#DCFCE7',
        avatarColor: '#166534',
        address: '88, Bazaar Street, Erode, Tamil Nadu - 638001',
        gstin: '33AABCS5678K1Z2',
      },
      {
        slNo: '03',
        name: 'Royal Fabrics & Weaving',
        avatarLetter: 'R',
        avatarBg: '#FEF3C7',
        avatarColor: '#92400E',
        address: '25, Mill Road, Coimbatore, Tamil Nadu - 641001',
        gstin: '33AAECR9012M1Z9',
      },
    ]);

    console.log('👥 Seeding Customers...');
    const customers = await Customer.insertMany([
      {
        idCode: 'CUST-001',
        name: 'Saravana Tex & Garments',
        avatarLetter: 'S',
        avatarBg: '#E0E7FF',
        avatarColor: '#3730A3',
        address: '45, Gandhi Road, Salem, Tamil Nadu - 636007',
        mobile: '+91 98765 43210',
        gst: '33AABCS1111A1Z1',
      },
      {
        idCode: 'CUST-002',
        name: 'Murugan Apparel Traders',
        avatarLetter: 'M',
        avatarBg: '#FCE7F3',
        avatarColor: '#9D174D',
        address: '12, Cross Cut Road, Madurai, Tamil Nadu - 625001',
        mobile: '+91 98421 23456',
        gst: '33AADCM2222B1Z2',
      },
      {
        idCode: 'CUST-003',
        name: 'Annamalai Clothing Hub',
        avatarLetter: 'A',
        avatarBg: '#F3E8FF',
        avatarColor: '#6B21A8',
        address: '77, Main Bazaar, Tiruchirappalli, Tamil Nadu - 620002',
        mobile: '+91 94432 98765',
        gst: '33AAICA3333C1Z3',
      },
    ]);

    console.log('📄 Seeding Particulars (Bills)...');
    const bill1 = await Particular.create({
      customerName: 'Saravana Tex & Garments',
      companyName: 'Apsara Crackers',
      caseCount: '4',
      billNo: '1001',
      date: '2026-08-20',
      discount: '500',
      transport: '300',
      packing: '200',
      tax: '1500',
      amount: '28000.00',
      total: '29500.00',
      products: [
        {
          particular: 'Cotton Shirt Fabric 40s',
          quantity: '200',
          rate: '100',
          pktUnit: 'MTR',
          amount: '20000.00',
        },
        {
          particular: 'Linen Blend Fabric 60s',
          quantity: '50',
          rate: '160',
          pktUnit: 'MTR',
          amount: '8000.00',
        },
      ],
    });

    const bill2 = await Particular.create({
      customerName: 'Murugan Apparel Traders',
      companyName: 'Sri Lakshmi Textiles',
      caseCount: '2',
      billNo: '1002',
      date: '2026-08-22',
      discount: '0',
      transport: '200',
      packing: '100',
      tax: '900',
      amount: '18000.00',
      total: '19200.00',
      products: [
        {
          particular: 'Silk Jacquard Material',
          quantity: '60',
          rate: '300',
          pktUnit: 'MTR',
          amount: '18000.00',
        },
      ],
    });

    console.log('💰 Seeding Account Ledgers...');
    await AccountLedger.insertMany([
      {
        particularId: bill1._id.toString(),
        billNo: '1001',
        customerName: 'Saravana Tex & Garments',
        companyName: 'Apsara Crackers',
        date: '2026-08-20',
        debit: '29500.00',
        credit: '0.00',
        balance: '29500.00',
        type: 'BILL',
      },
      {
        customerName: 'Saravana Tex & Garments',
        companyName: 'Apsara Crackers',
        date: '2026-08-25',
        debit: '0.00',
        credit: '15000.00',
        balance: '14500.00',
        type: 'CREDIT',
      },
      {
        particularId: bill2._id.toString(),
        billNo: '1002',
        customerName: 'Murugan Apparel Traders',
        companyName: 'Sri Lakshmi Textiles',
        date: '2026-08-22',
        debit: '19200.00',
        credit: '0.00',
        balance: '19200.00',
        type: 'BILL',
      },
    ]);

    console.log('=============================================');
    console.log('✅ Sample data seeded successfully into MongoDB!');
    console.log(`   - ${products.length} Products`);
    console.log(`   - ${companies.length} Companies`);
    console.log(`   - ${customers.length} Customers`);
    console.log(`   - 2 Particulars (Bills)`);
    console.log(`   - 3 Account Ledger Entries`);
    console.log('=============================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedSampleData();
