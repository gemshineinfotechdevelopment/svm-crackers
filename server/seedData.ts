import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import { connectDB } from './config/db';
import { Customer } from './models/Customer';
import { Company } from './models/Company';
import { Product } from './models/Product';
import { Category } from './models/Category';
import { PriceList } from './models/PriceList';
import { Inventory } from './models/Inventory';
import { Particular } from './models/Particular';
import { AccountLedger } from './models/AccountLedger';
import { Settings } from './models/Settings';
import { seedDefaultAdmin } from './controllers/authController';

const seedSampleData = async () => {
  try {
    console.log('🌱 Connecting to MongoDB database...');
    await connectDB();

    console.log('👤 Ensuring default admin exists...');
    await seedDefaultAdmin();

    console.log('🧹 Cleaning existing collections for clean seed (preserving admin)...');
    await Customer.deleteMany({});
    await Company.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await PriceList.deleteMany({});
    await Inventory.deleteMany({});
    await Particular.deleteMany({});
    await AccountLedger.deleteMany({});
    await Settings.deleteMany({});

    console.log('⚙️ Seeding Settings...');
    await Settings.create({
      companyName: 'SVM Crackers',
      tagline: 'Premium Sivakasi Crackers & Fancy Fireworks',
      ownerName: 'Apsara Traders',
      phone: '9843067073',
      whatsapp: '8778429299',
      email: 'contact@apsaracrackers.com',
      address: '67 - H/E, Rajivgandhi Nagar, Near Ramji Polypack, Sivakasi Bus Stand',
      city: 'Sivakasi',
      pincode: '626123',
      state: 'Tamil Nadu',
      gstin: '33AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      enableTax: false,
      defaultTaxRate: '18',
      gstTurnoverBaseline: '726900.00',
      gstTurnoverCurrent: '726900.00',
    });

    console.log('📂 Seeding Categories...');
    const categories = await Category.insertMany([
      { name: 'Single Sound Crackers', code: 'SSC', description: 'Traditional loud sound crackers', color: '#EF4444', displayOrder: 1 },
      { name: 'Sparklers', code: 'SPK', description: 'Electric & color sparkling sticks', color: '#F59E0B', displayOrder: 2 },
      { name: 'Flower Pots & Chakkars', code: 'FPC', description: 'Fountains and spinning wheels', color: '#10B981', displayOrder: 3 },
      { name: 'Rockets & Missiles', code: 'RKT', description: 'Sky rockets and whistling missiles', color: '#3B82F6', displayOrder: 4 },
      { name: 'Multi Color Sky Shots', code: 'MCS', description: 'Aerial repeating shots and fountains', color: '#8B5CF6', displayOrder: 5 },
      { name: 'Fancy Novelties', code: 'FNV', description: 'Twinkling stars, waterfalls and torches', color: '#EC4899', displayOrder: 6 },
      { name: 'Gift Boxes', code: 'GFB', description: 'Assorted family gift combos', color: '#6366F1', displayOrder: 7 },
    ]);

    console.log('📦 Seeding Products...');
    const products = await Product.insertMany([
      { slNo: 1, sku: 'CRK-001', name: '2 3/4" Kuruvi Crackers', category: 'Single Sound Crackers', mrp: 40, rate: 10, unit: 'Pkt' },
      { slNo: 2, sku: 'CRK-002', name: '3 1/2" Lakshmi Crackers', category: 'Single Sound Crackers', mrp: 80, rate: 20, unit: 'Pkt' },
      { slNo: 3, sku: 'CRK-003', name: '4" Deluxe Lakshmi Crackers', category: 'Single Sound Crackers', mrp: 140, rate: 35, unit: 'Pkt' },
      { slNo: 4, sku: 'CRK-004', name: '10 cm Electric Sparklers', category: 'Sparklers', mrp: 60, rate: 15, unit: 'Box' },
      { slNo: 5, sku: 'CRK-005', name: '15 cm Color Sparklers', category: 'Sparklers', mrp: 120, rate: 30, unit: 'Box' },
      { slNo: 6, sku: 'CRK-006', name: 'Flower Pots Special', category: 'Flower Pots & Chakkars', mrp: 200, rate: 50, unit: 'Box' },
      { slNo: 7, sku: 'CRK-007', name: 'Ground Chakkar Deluxe', category: 'Flower Pots & Chakkars', mrp: 180, rate: 45, unit: 'Box' },
      { slNo: 8, sku: 'CRK-008', name: 'Baby Rocket', category: 'Rockets & Missiles', mrp: 160, rate: 40, unit: 'Box' },
      { slNo: 9, sku: 'CRK-009', name: '12 Shots Sky Fountain', category: 'Multi Color Sky Shots', mrp: 600, rate: 180, unit: 'Box' },
      { slNo: 10, sku: 'CRK-010', name: '30 Shots Multi Sky Shot', category: 'Multi Color Sky Shots', mrp: 1500, rate: 450, unit: 'Box' },
      { slNo: 11, sku: 'CRK-011', name: '28 Items Standard Gift Box', category: 'Gift Boxes', mrp: 1800, rate: 550, unit: 'Box' },
      { slNo: 12, sku: 'CRK-012', name: '45 Items Mega VIP Gift Box', category: 'Gift Boxes', mrp: 3500, rate: 1100, unit: 'Box' },
    ]);

    console.log('🏷️ Seeding Price List...');
    const todayStr = new Date().toISOString().split('T')[0];
    const priceListItems = products.map((p, idx) => ({
      slNo: idx + 1,
      itemName: p.name,
      category: p.category || 'General',
      unit: p.unit || 'Box',
      mrp: p.mrp || 0,
      discountPercent: 75,
      rate: p.rate || 0,
      effectiveDate: todayStr,
      batchName: 'Diwali 2026 Wholesale List',
    }));
    await PriceList.insertMany(priceListItems);

    console.log('📊 Seeding Inventory Stock...');
    const inventoryItems = products.map((p) => ({
      sku: p.sku,
      productName: p.name,
      shopStock: 50,
      godownStock: 250,
      totalStock: 300,
      stock: 300,
      unit: p.unit,
      category: p.category,
      rate: p.rate,
      mrp: p.mrp,
      costPrice: (p.rate || 10) * 0.7,
      minStockAlert: 30,
    }));
    await Inventory.insertMany(inventoryItems);

    console.log('🏢 Seeding Companies...');
    const companies = await Company.insertMany([
      {
        slNo: '01',
        name: 'SVM Crackers',
        avatarLetter: 'A',
        avatarBg: '#DBEAFE',
        avatarColor: '#0B4DB7',
        address: '67 - H/E, Rajivgandhi Nagar, Sivakasi, Tamil Nadu - 626123',
        gstin: '33AAAAA0000A1Z5',
      },
      {
        slNo: '02',
        name: 'SVM Fireworks',
        avatarLetter: 'S',
        avatarBg: '#DCFCE7',
        avatarColor: '#166534',
        address: '102, Satchiyapuram Main Road, Sivakasi, Tamil Nadu - 626124',
        gstin: '33AABCS5678K1Z2',
      },
      {
        slNo: '03',
        name: 'Sri Meenakshi Agencies',
        avatarLetter: 'M',
        avatarBg: '#FEF3C7',
        avatarColor: '#92400E',
        address: '25, Factory Road, Virudhunagar, Tamil Nadu - 626001',
        gstin: '33AAECR9012M1Z9',
      },
    ]);

    console.log('👥 Seeding Customers...');
    const customers = await Customer.insertMany([
      {
        idCode: 'CUST-001',
        name: 'Saravana Crackers & Traders',
        avatarLetter: 'S',
        avatarBg: '#E0E7FF',
        avatarColor: '#3730A3',
        address: '45, Gandhi Road, Salem, Tamil Nadu - 636007',
        mobile: '+91 98765 43210',
        gst: '33AABCS1111A1Z1',
      },
      {
        idCode: 'CUST-002',
        name: 'Murugan Fireworks Mart',
        avatarLetter: 'M',
        avatarBg: '#FCE7F3',
        avatarColor: '#9D174D',
        address: '12, Cross Cut Road, Madurai, Tamil Nadu - 625001',
        mobile: '+91 98421 23456',
        gst: '33AADCM2222B1Z2',
      },
      {
        idCode: 'CUST-003',
        name: 'Balaji Novelty Stores',
        avatarLetter: 'B',
        avatarBg: '#F3E8FF',
        avatarColor: '#6B21A8',
        address: '77, Anna Salai, Chennai, Tamil Nadu - 600002',
        mobile: '+91 94432 98765',
        gst: '33AAICA3333C1Z3',
      },
      {
        idCode: 'CUST-004',
        name: 'Shanmuga Agencies',
        avatarLetter: 'S',
        avatarBg: '#FEF3C7',
        avatarColor: '#B45309',
        address: '15, DB Road, RS Puram, Coimbatore, Tamil Nadu - 641002',
        mobile: '+91 99441 55667',
        gst: '33AASSA4444D1Z4',
      },
    ]);

    console.log('📄 Seeding Particulars (Bills)...');
    const bill1 = await Particular.create({
      customerName: 'Saravana Crackers & Traders',
      customerPhone: '+91 98765 43210',
      customerAddress: '45, Gandhi Road, Salem, Tamil Nadu - 636007',
      customerGst: '33AABCS1111A1Z1',
      companyName: 'SVM Crackers',
      caseCount: '5',
      billNo: '1001',
      date: '2026-09-15',
      discount: '500',
      transport: '400',
      packing: '200',
      tax: '0',
      amount: '22500.00',
      total: '22600.00',
      paymentStatus: 'PARTIAL',
      paymentMode: 'CREDIT',
      paidAmount: '10000.00',
      products: [
        {
          particular: '4" Deluxe Lakshmi Crackers',
          quantity: '100',
          rate: '35',
          pktUnit: 'Pkt',
          amount: '3500.00',
        },
        {
          particular: '15 cm Color Sparklers',
          quantity: '100',
          rate: '30',
          pktUnit: 'Box',
          amount: '3000.00',
        },
        {
          particular: '30 Shots Multi Sky Shot',
          quantity: '20',
          rate: '450',
          pktUnit: 'Box',
          amount: '9000.00',
        },
        {
          particular: '28 Items Standard Gift Box',
          quantity: '10',
          rate: '550',
          pktUnit: 'Box',
          amount: '5500.00',
        },
        {
          particular: 'Ground Chakkar Deluxe',
          quantity: '30',
          rate: '45',
          pktUnit: 'Box',
          amount: '1350.00',
        },
      ],
    });

    const bill2 = await Particular.create({
      customerName: 'Murugan Fireworks Mart',
      customerPhone: '+91 98421 23456',
      customerAddress: '12, Cross Cut Road, Madurai, Tamil Nadu - 625001',
      customerGst: '33AADCM2222B1Z2',
      companyName: 'SVM Crackers',
      caseCount: '3',
      billNo: '1002',
      date: '2026-09-18',
      discount: '200',
      transport: '300',
      packing: '150',
      tax: '0',
      amount: '14450.00',
      total: '14700.00',
      paymentStatus: 'PAID',
      paymentMode: 'UPI',
      paidAmount: '14700.00',
      products: [
        {
          particular: '12 Shots Sky Fountain',
          quantity: '30',
          rate: '180',
          pktUnit: 'Box',
          amount: '5400.00',
        },
        {
          particular: '45 Items Mega VIP Gift Box',
          quantity: '5',
          rate: '1100',
          pktUnit: 'Box',
          amount: '5500.00',
        },
        {
          particular: 'Flower Pots Special',
          quantity: '40',
          rate: '50',
          pktUnit: 'Box',
          amount: '2000.00',
        },
        {
          particular: '10 cm Electric Sparklers',
          quantity: '105',
          rate: '15',
          pktUnit: 'Box',
          amount: '1575.00',
        },
      ],
    });

    const bill3 = await Particular.create({
      customerName: 'Balaji Novelty Stores',
      customerPhone: '+91 94432 98765',
      customerAddress: '77, Anna Salai, Chennai, Tamil Nadu - 600002',
      customerGst: '33AAICA3333C1Z3',
      companyName: 'SVM Fireworks',
      caseCount: '6',
      billNo: '1003',
      date: '2026-09-20',
      discount: '1000',
      transport: '600',
      packing: '300',
      tax: '0',
      amount: '31500.00',
      total: '31400.00',
      paymentStatus: 'UNPAID',
      paymentMode: 'CREDIT',
      paidAmount: '0.00',
      products: [
        {
          particular: '45 Items Mega VIP Gift Box',
          quantity: '20',
          rate: '1100',
          pktUnit: 'Box',
          amount: '22000.00',
        },
        {
          particular: '30 Shots Multi Sky Shot',
          quantity: '15',
          rate: '450',
          pktUnit: 'Box',
          amount: '6750.00',
        },
        {
          particular: 'Baby Rocket',
          quantity: '50',
          rate: '40',
          pktUnit: 'Box',
          amount: '2000.00',
        },
        {
          particular: '3 1/2" Lakshmi Crackers',
          quantity: '37',
          rate: '20',
          pktUnit: 'Pkt',
          amount: '750.00',
        },
      ],
    });

    console.log('💰 Seeding Account Ledgers...');
    await AccountLedger.insertMany([
      {
        particularId: bill1._id.toString(),
        billNo: '1001',
        customerName: 'Saravana Crackers & Traders',
        companyName: 'SVM Crackers',
        date: '2026-09-15',
        debit: '22600.00',
        credit: '0.00',
        balance: '22600.00',
        type: 'BILL',
      },
      {
        customerName: 'Saravana Crackers & Traders',
        companyName: 'SVM Crackers',
        date: '2026-09-20',
        debit: '0.00',
        credit: '10000.00',
        balance: '12600.00',
        type: 'CREDIT',
      },
      {
        particularId: bill2._id.toString(),
        billNo: '1002',
        customerName: 'Murugan Fireworks Mart',
        companyName: 'SVM Crackers',
        date: '2026-09-18',
        debit: '14700.00',
        credit: '0.00',
        balance: '14700.00',
        type: 'BILL',
      },
      {
        particularId: bill2._id.toString(),
        billNo: '1002',
        customerName: 'Murugan Fireworks Mart',
        companyName: 'SVM Crackers',
        date: '2026-09-18',
        debit: '0.00',
        credit: '14700.00',
        balance: '0.00',
        type: 'CREDIT',
      },
      {
        particularId: bill3._id.toString(),
        billNo: '1003',
        customerName: 'Balaji Novelty Stores',
        companyName: 'SVM Fireworks',
        date: '2026-09-20',
        debit: '31400.00',
        credit: '0.00',
        balance: '31400.00',
        type: 'BILL',
      },
    ]);

    console.log('=============================================');
    console.log('✨ All Sample Data Seeded Successfully into MongoDB!');
    console.log(`   - 1 Admin user (admin / password123)`);
    console.log(`   - 1 Business Settings (SVM Crackers)`);
    console.log(`   - ${categories.length} Categories`);
    console.log(`   - ${products.length} Products`);
    console.log(`   - ${priceListItems.length} Price List items`);
    console.log(`   - ${inventoryItems.length} Inventory Stock items`);
    console.log(`   - ${companies.length} Companies`);
    console.log(`   - ${customers.length} Customers`);
    console.log(`   - 3 Bills / Invoices`);
    console.log(`   - 5 Ledger Transactions`);
    console.log('=============================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedSampleData();
