const express = require('express');
const { getAllEvents, getManagedEvents, getEventById, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadFile } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getAllEvents);
router.get('/manage', protect, authorize('admin', 'editor'), getManagedEvents);
router.get('/:id', getEventById);
router.post('/', protect, authorize('admin', 'editor'), uploadFile('events', { fieldName: 'image' }), createEvent);
router.put('/:id', protect, authorize('admin', 'editor'), uploadFile('events', { fieldName: 'image' }), updateEvent);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteEvent);

module.exports = router;
