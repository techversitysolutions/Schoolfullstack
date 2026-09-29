const express = require('express');
const { getPublishedSlides, getManagedSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide } = require('../controllers/heroSlideController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadFile } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/published', getPublishedSlides);
router.get('/manage', protect, authorize('admin', 'editor'), getManagedSlides);
router.post('/', protect, authorize('admin', 'editor'), uploadFile('hero', { fieldName: 'image' }), createHeroSlide);
router.put('/:id', protect, authorize('admin', 'editor'), uploadFile('hero', { fieldName: 'image' }), updateHeroSlide);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteHeroSlide);

module.exports = router;