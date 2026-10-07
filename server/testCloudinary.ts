import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { isCloudinaryConfigured, uploadToCloudinary, deleteFromCloudinary } from './config/cloudinary';

async function test() {
  console.log('Testing Cloudinary configuration...');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('Is Configured:', isCloudinaryConfigured());

  if (!isCloudinaryConfigured()) {
    console.error('Cloudinary is NOT configured!');
    return;
  }

  // Sample 1x1 transparent png / sample data
  const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  try {
    const result = await uploadToCloudinary(sampleBase64, 'apsara_crackers/test', 'test_sample');
    console.log('Upload Result:', result);
    console.log('SUCCESS! Secure URL:', result.secure_url);

    // Clean up test file
    await deleteFromCloudinary(result.public_id);
    console.log('Test file deleted from Cloudinary successfully.');
  } catch (err) {
    console.error('Cloudinary Upload Test Failed:', err);
  }
}

test();
