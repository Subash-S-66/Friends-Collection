const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true
});

const isCloudinaryConfigured = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Boolean(name && key && secret && !name.includes('your_') && !key.includes('your_'));
};

/**
 * Upload and process image to enforce EXACT 3:4 portrait ratio (900x1200)
 * Uses Cloudinary with crop 'fill' & gravity 'auto' for best framing,
 * or Sharp locally as high-performance fallback.
 */
const uploadAndProcessImage = async (fileBuffer, originalName, folder = 'friends_collections') => {
  // If Cloudinary credentials are fully active:
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          transformation: [
            {
              width: 900,
              height: 1200,
              crop: 'fill',
              gravity: 'auto',
              quality: 'auto:best',
              fetch_format: 'auto'
            }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  // Local fallback with Sharp to enforce exact 900x1200 3:4 portrait ratio
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;
  const targetPath = path.join(uploadsDir, filename);

  await sharp(fileBuffer)
    .resize(900, 1200, {
      fit: 'cover',
      position: 'top' // Focus on neckline / top of dress
    })
    .webp({ quality: 90 })
    .toFile(targetPath);

  return `/uploads/${filename}`;
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadAndProcessImage
};
