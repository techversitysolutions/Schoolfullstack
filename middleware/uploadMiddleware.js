const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const allowedMimeTypes = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/jpg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
const maxSize = 3 * 1024 * 1024;

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const createStorage = (folder) => {
  const uploadPath = path.join(__dirname, '..', 'uploads', folder);
  ensureDirectory(uploadPath);

  return multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadPath),
    filename: (_, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${crypto.randomUUID()}${extension}`;
      cb(null, uniqueName);
    },
  });
};

const createUploader = (folder, { pdfFields = [] } = {}) => {
  const storage = createStorage(folder);
  return multer({
    storage,
    limits: {
      fileSize: maxSize,
    },
    fileFilter: (_, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (pdfFields.includes(file.fieldname)) {
        const isJpg = ['image/jpeg', 'image/jpg'].includes(file.mimetype) && ['.jpg', '.jpeg'].includes(extension);
        const isPdf = file.mimetype === 'application/pdf' && extension === '.pdf';
        if (!isJpg && !isPdf) {
          const error = new Error('Upload a valid JPG or PDF file');
          error.statusCode = 400;
          return cb(error);
        }
        return cb(null, true);
      }

      const extensions = allowedMimeTypes[file.mimetype];
      if (!extensions || !extensions.includes(extension)) {
        const error = new Error('Upload a valid JPG, PNG or WEBP image');
        error.statusCode = 400;
        return cb(error);
      }
      cb(null, true);
    },
  });
};

const isValidImageSignature = async (file) => {
  const handle = await fs.promises.open(file.path, 'r');
  const header = Buffer.alloc(12);
  try {
    await handle.read(header, 0, header.length, 0);
  } finally {
    await handle.close();
  }

  if (file.mimetype === 'image/png') {
    return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (file.mimetype === 'image/webp') {
    return header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
  }
  return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
};

const isValidPdfSignature = async (file) => {
  const handle = await fs.promises.open(file.path, 'r');
  const header = Buffer.alloc(5);
  try {
    await handle.read(header, 0, header.length, 0);
  } finally {
    await handle.close();
  }
  return header.toString('ascii') === '%PDF-';
};

const validateUploadedFiles = (req, res, next) => {
  const files = req.file ? [req.file] : Object.values(req.files || {}).flat();
  Promise.all(files.map((file) => file.mimetype === 'application/pdf'
    ? isValidPdfSignature(file)
    : isValidImageSignature(file))).then(async (validFiles) => {
    if (validFiles.every(Boolean)) return next();
    await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
    const error = new Error('The uploaded file is not a valid image.');
    error.statusCode = 400;
    return next(error);
  }).catch(next);
};

const uploadFile = (folder, options = {}) => {
  const upload = createUploader(folder);
  const singleUpload = upload.single(options.fieldName || 'image');
  return (req, res, next) => singleUpload(req, res, (error) => {
    if (error) return next(error);
    validateUploadedFiles(req, res, next);
  });
};

const uploadFields = (folder, fieldNames, options = {}) => {
  const pdfFields = options.pdfFields || [];
  const upload = createUploader(folder, { pdfFields }).fields(fieldNames.map((name) => ({ name, maxCount: 1 })));
  return (req, res, next) => upload(req, res, (error) => {
    if (error) return next(error);
    validateUploadedFiles(req, res, next);
  });
};

module.exports = { uploadFile, uploadFields };
