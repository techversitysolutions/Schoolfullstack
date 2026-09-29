const express = require('express');
const { submitContact, getAllContacts, getContactById, updateContact, deleteContact } = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { publicSubmissionLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/', publicSubmissionLimiter, submitContact);
router.get('/', protect, authorize('admin', 'editor'), getAllContacts);
router.get('/:id', protect, authorize('admin', 'editor'), getContactById);
router.put('/:id', protect, authorize('admin', 'editor'), updateContact);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteContact);

module.exports = router;
