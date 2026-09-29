const express = require('express');
const { getAllPages, getManagedPages, getPageBySlug, createPage, updatePage, deletePage } = require('../controllers/pageController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadFile } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getAllPages);
router.get('/manage', protect, authorize('admin', 'editor'), getManagedPages);
router.get('/:slug', getPageBySlug);
router.post('/', protect, authorize('admin', 'editor'), uploadFile('general', { fieldName: 'featured_image' }), createPage);
router.put('/:id', protect, authorize('admin', 'editor'), uploadFile('general', { fieldName: 'featured_image' }), updatePage);
router.delete('/:id', protect, authorize('admin', 'editor'), deletePage);

module.exports = router;
