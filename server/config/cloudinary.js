const cloudinary = require('cloudinary').v2;

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
  return Boolean(
    name &&
    key &&
    secret &&
    !name.includes('your_') &&
    !key.includes('your_') &&
    !secret.includes('your_')
  );
};

const createStorageUnreachableError = (originalError = null) => {
  const error = new Error('Cloud storage (Cloudinary) is currently unreachable. Please check your connection or try again later.');
  error.statusCode = 503;
  error.code = 'CLOUDINARY_UNREACHABLE';
  error.isStorageError = true;
  if (originalError) {
    error.originalError = originalError;
  }
  return error;
};

/**
 * Upload and process image exclusively to Cloudinary
 * Strictly disallows backend local storage.
 * Enforces folder-specific transformations:
 * - Banners: up to 1920x1080 limit for wide luxury carousel
 * - Categories: 800x800 square
 * - Campaigns: 1200x600 limit
 * - Products: exact 3:4 portrait ratio (900x1200) with AI framing
 */
const uploadAndProcessImage = async (fileBuffer, originalName, folder = 'friends_collections') => {
  if (!isCloudinaryConfigured()) {
    throw createStorageUnreachableError();
  }

  // Determine transformation based on destination folder
  let transformation;
  const lowerFolder = (folder || '').toLowerCase();
  if (lowerFolder.includes('banner')) {
    transformation = [
      {
        width: 1920,
        height: 1080,
        crop: 'limit',
        quality: 'auto:best',
        fetch_format: 'auto'
      }
    ];
  } else if (lowerFolder.includes('categor')) {
    transformation = [
      {
        width: 800,
        height: 800,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto:best',
        fetch_format: 'auto'
      }
    ];
  } else if (lowerFolder.includes('campaign')) {
    transformation = [
      {
        width: 1200,
        height: 600,
        crop: 'limit',
        quality: 'auto:best',
        fetch_format: 'auto'
      }
    ];
  } else {
    // Default: exact 3:4 portrait ratio for product catalog
    transformation = [
      {
        width: 900,
        height: 1200,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto:best',
        fetch_format: 'auto'
      }
    ];
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation,
        resource_type: 'image'
      },
      (error, result) => {
        if (settled) return;
        settled = true;
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(createStorageUnreachableError(error));
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.on('error', (err) => {
      if (settled) return;
      settled = true;
      console.error('Cloudinary upload stream network error:', err);
      reject(createStorageUnreachableError(err));
    });

    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload and process signature image:
 * Preserves transparency (PNG) and natural aspect ratio (fit: 'limit') without aggressive cropping.
 */
const uploadSignatureImage = async (fileBuffer, originalName, folder = 'friends_collections/signatures') => {
  if (!isCloudinaryConfigured()) {
    throw createStorageUnreachableError();
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [
          {
            width: 800,
            height: 260,
            crop: 'limit',
            quality: 'auto:best',
            fetch_format: 'png'
          }
        ],
        resource_type: 'image'
      },
      (error, result) => {
        if (settled) return;
        settled = true;
        if (error) {
          console.error('Cloudinary signature upload error:', error);
          reject(createStorageUnreachableError(error));
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.on('error', (err) => {
      if (settled) return;
      settled = true;
      console.error('Cloudinary signature stream network error:', err);
      reject(createStorageUnreachableError(err));
    });

    uploadStream.end(fileBuffer);
  });
};

/**
 * Extract public ID from a Cloudinary URL
 * Handles transformations, version prefixes, subfolders, query params and hashes.
 * Returns null if not a valid Cloudinary URL.
 */
const extractCloudinaryPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return null;

  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const uploadIndex = cleanUrl.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    const pathAfterUpload = cleanUrl.substring(uploadIndex + '/upload/'.length);
    const segments = pathAfterUpload.split('/');

    const contentSegments = [];
    let passedVersion = false;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!passedVersion && /^v\d+$/.test(seg)) {
        passedVersion = true;
        continue;
      }
      if (!passedVersion) {
        // Transformation parameters (e.g., c_fill,w_800 or f_auto or contains comma)
        if (seg.includes(',') || /^(c|w|h|q|f|fl|ar|b|e|co|l|u|a|o|dpr|pg|cs)_/.test(seg)) {
          continue;
        }
      }
      contentSegments.push(seg);
    }

    if (contentSegments.length === 0) return null;

    let fullPath = contentSegments.join('/');
    const lastDotIndex = fullPath.lastIndexOf('.');
    if (lastDotIndex > 0) {
      fullPath = fullPath.substring(0, lastDotIndex);
    }

    return decodeURIComponent(fullPath);
  } catch (err) {
    return null;
  }
};

/**
 * Destroy a single image on Cloudinary by its public ID or full URL
 */
const deleteCloudinaryImage = async (urlOrPublicId) => {
  if (!isCloudinaryConfigured() || !urlOrPublicId) return null;

  const publicId = urlOrPublicId.includes('cloudinary.com')
    ? extractCloudinaryPublicId(urlOrPublicId)
    : urlOrPublicId;

  if (!publicId) return null;

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true
    });
    return { publicId, result };
  } catch (err) {
    console.error(`Error deleting Cloudinary image [${publicId}]:`, err?.message || err);
    return { publicId, error: err?.message || String(err) };
  }
};

/**
 * Destroy multiple images on Cloudinary by their public IDs or full URLs
 */
const deleteMultipleCloudinaryImages = async (urlsOrPublicIds) => {
  if (!isCloudinaryConfigured() || !Array.isArray(urlsOrPublicIds) || urlsOrPublicIds.length === 0) {
    return [];
  }

  const distinct = Array.from(new Set(urlsOrPublicIds.filter(Boolean)));
  const results = await Promise.allSettled(
    distinct.map((item) => deleteCloudinaryImage(item))
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message }));
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadAndProcessImage,
  uploadSignatureImage,
  extractCloudinaryPublicId,
  deleteCloudinaryImage,
  deleteMultipleCloudinaryImages
};
