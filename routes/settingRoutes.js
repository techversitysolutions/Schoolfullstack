const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadFields } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getSettings);
router.put('/', protect, authorize('admin'), uploadFields('branding', ['logo', 'favicon', 'hero_image', 'promotion_media', 'promotion_media_2', 'promotion_media_3'], { pdfFields: ['promotion_media', 'promotion_media_2', 'promotion_media_3'] }), updateSettings);

module.exports = router;
