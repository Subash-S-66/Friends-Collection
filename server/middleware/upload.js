const multer = require('multer');
const path = require('path');

// Store in memory so Cloudinary / Sharp can process and enforce exact 3:4 ratio
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpe?g|png|webp|avif|heic|gif)$/i;

  // Explicitly reject SVG files to prevent stored Cross-Site Scripting (XSS)
  const isSvg =
    (file.mimetype && file.mimetype.toLowerCase().includes('svg')) ||
    /\.svg$/i.test(file.originalname);

  if (isSvg) {
    return cb(new Error('SVG files are not permitted for security reasons.'));
  }

  const hasValidExt = allowedExtensions.test(file.originalname);
  const hasValidMime = file.mimetype && file.mimetype.startsWith('image/');

  if (hasValidExt && hasValidMime) {
    return cb(null, true);
  }

  cb(new Error('Only high quality image files (JPEG, PNG, WEBP, AVIF, HEIC) are supported.'));
};

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 }, // 10MB limit
  fileFilter
});

module.exports = upload;
