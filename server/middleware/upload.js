const multer = require('multer');
const path = require('path');

// Store in memory so Cloudinary / Sharp can process and enforce exact 3:4 ratio
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpeg|jpg|png|webp|avif|heic|gif)$/i;
  const isImage = file.mimetype.startsWith('image/') || allowedExtensions.test(file.originalname);

  if (isImage) {
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
