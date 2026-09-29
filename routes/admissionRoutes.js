const express = require('express');
const { submitAdmission, getAllAdmissions, updateAdmissionStatus } = require('../controllers/admissionController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { publicSubmissionLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/', publicSubmissionLimiter, submitAdmission);
router.get('/', protect, authorize('admin', 'editor'), getAllAdmissions);
router.put('/:id', protect, authorize('admin', 'editor'), updateAdmissionStatus);

module.exports = router;
