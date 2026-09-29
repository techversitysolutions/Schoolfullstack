const express = require('express');
const { getAllAcademics, getManagedAcademics, getAcademicById, createAcademic, updateAcademic, deleteAcademic } = require('../controllers/academicController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getAllAcademics);
router.get('/manage', protect, authorize('admin', 'editor'), getManagedAcademics);
router.get('/:id', getAcademicById);
router.post('/', protect, authorize('admin', 'editor'), createAcademic);
router.put('/:id', protect, authorize('admin', 'editor'), updateAcademic);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteAcademic);

module.exports = router;
