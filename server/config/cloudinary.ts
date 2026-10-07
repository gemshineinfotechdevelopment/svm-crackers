import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

// Configure Cloudinary with environment variables
const initCloudinary = () => {
  // Always ensure fresh .env is loaded from server directory & root
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
  dotenv.config();

  const cloudinaryUrl = (process.env.CLOUDINARY_URL || '').trim();
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  if (cloudinaryUrl) {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    });
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
};

initCloudinary();

/**
 * Checks whether Cloudinary credentials are fully provided in environment
 */
export const isCloudinaryConfigured = (): boolean => {
  initCloudinary();

  const cloudinaryUrl = (process.env.CLOUDINARY_URL || '').trim();
  if (cloudinaryUrl) return true;

  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  return Boolean(cloudName && apiKey && apiSecret);
};

/**
 * Uploads a base64 string or file data directly to Cloudinary CDN
 */
export const uploadToCloudinary = async (
  fileBase64: string,
  folder = 'apsara_crackers/bills',
  filename?: string
): Promise<{ secure_url: string; public_id: string }> => {
  initCloudinary();

  const sanitizedName = filename
    ? `${filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`
    : `bill_${Date.now()}`;

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      fileBase64,
      {
        folder,
        resource_type: 'auto',
        public_id: sanitizedName,
      },
      (error, result) => {
        if (error || !result) {
          // Retry with resource_type raw for pdf files if auto fails
          cloudinary.uploader.upload(
            fileBase64,
            {
              folder,
              resource_type: 'raw',
              public_id: `${sanitizedName}.pdf`,
            },
            (rawError, rawResult) => {
              if (rawError || !rawResult) {
                return reject(rawError || error || new Error('Cloudinary upload failed'));
              }
              resolve({
                secure_url: rawResult.secure_url,
                public_id: rawResult.public_id,
              });
            }
          );
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
  });
};

/**
 * Deletes a file from Cloudinary given its public_id
 */
export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  if (!publicId) return null;
  initCloudinary();
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    if (res.result === 'not found') {
      return await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
    return res;
  } catch (err) {
    console.warn('[Cloudinary Warning] Could not delete file with publicId:', publicId, err);
    return null;
  }
};

export default cloudinary;
