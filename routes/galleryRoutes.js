const express = require('express');
const { getAllGallery, getManagedGallery, getGalleryById, createGallery, updateGallery, deleteGallery } = require('../controllers/galleryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadFile } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getAllGallery);
router.get('/manage', protect, authorize('admin', 'editor'), getManagedGallery);
router.get('/:id', getGalleryById);
router.post('/', protect, authorize('admin', 'editor'), uploadFile('gallery', { fieldName: 'image' }), createGallery);
router.put('/:id', protect, authorize('admin', 'editor'), uploadFile('gallery', { fieldName: 'image' }), updateGallery);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteGallery);

module.exports = router;
