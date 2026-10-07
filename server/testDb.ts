import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  let uri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
  console.log('Original URI:', uri);
  if (uri.includes('<') && uri.includes('>')) {
    uri = uri.replace(/<([^>]+)>/g, '$1');
  }
  // ensure database name is present
  if (!uri.includes('.mongodb.net/apsara_crackers_db')) {
    uri = uri.replace('.mongodb.net/?', '.mongodb.net/apsara_crackers_db?');
  }
  console.log('Sanitized URI:', uri.replace(/:([^@]+)@/, ':****@'));

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('CONNECTED SUCCESSFULLY to:', conn.connection.host, 'DB:', conn.connection.name);
    process.exit(0);
  } catch (err: any) {
    console.error('CONNECTION FAILED:', err.message);
    process.exit(1);
  }
}

test();
