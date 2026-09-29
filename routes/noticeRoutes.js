const express = require('express');
const { getAllNotices, getManagedNotices, getNoticeById, createNotice, updateNotice, deleteNotice } = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadFile } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getAllNotices);
router.get('/manage', protect, authorize('admin', 'editor'), getManagedNotices);
router.get('/:id', getNoticeById);
router.post('/', protect, authorize('admin', 'editor'), uploadFile('notices', { fieldName: 'featured_image' }), createNotice);
router.put('/:id', protect, authorize('admin', 'editor'), uploadFile('notices', { fieldName: 'featured_image' }), updateNotice);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteNotice);

module.exports = router;
