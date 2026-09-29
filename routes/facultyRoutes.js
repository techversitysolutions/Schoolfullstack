const express = require('express');
const { getAllFaculty, getManagedFaculty, getFacultyById, createFaculty, updateFaculty, deleteFaculty } = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadFile } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getAllFaculty);
router.get('/manage', protect, authorize('admin', 'editor'), getManagedFaculty);
router.get('/:id', getFacultyById);
router.post('/', protect, authorize('admin', 'editor'), uploadFile('faculty', { fieldName: 'image' }), createFaculty);
router.put('/:id', protect, authorize('admin', 'editor'), uploadFile('faculty', { fieldName: 'image' }), updateFaculty);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteFaculty);

module.exports = router;
