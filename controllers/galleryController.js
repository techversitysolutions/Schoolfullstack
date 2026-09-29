const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const getAllGallery = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM gallery WHERE status = 'published' ORDER BY display_order ASC, created_at DESC");
    return successResponse(res, 'Gallery images loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch gallery', err, 500);
  }
};

const getManagedGallery = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM gallery ORDER BY display_order ASC, created_at DESC');
    return successResponse(res, 'Gallery images loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch gallery', err, 500);
  }
};

const getGalleryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM gallery WHERE id = ? AND status = 'published' LIMIT 1", [id]);

    if (!rows.length) {
      return errorResponse(res, 'Gallery image not found', null, 404);
    }

    return successResponse(res, 'Gallery image loaded', rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch gallery image', err, 500);
  }
};

const createGallery = async (req, res) => {
  try {
    const { title, category, caption, display_order = 0, status = 'published' } = req.body;

    if (!title) {
      return errorResponse(res, 'Gallery title is required', null, 400);
    }

    const image = req.file ? `/uploads/gallery/${req.file.filename}` : null;

    await pool.query(
      'INSERT INTO gallery (title, image, category, caption, display_order, status) VALUES (?, ?, ?, ?, ?, ?)',
      [title, image, category || 'School Life', caption, display_order, status]
    );

    return successResponse(res, 'Gallery image created successfully', null, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to create gallery image', err, 500);
  }
};

const updateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM gallery WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      return errorResponse(res, 'Gallery image not found', null, 404);
    }

    const current = rows[0];
    const { title, category, caption, display_order, status } = req.body;
    const image = req.file ? `/uploads/gallery/${req.file.filename}` : current.image;

    await pool.query(
      'UPDATE gallery SET title = ?, image = ?, category = ?, caption = ?, display_order = ?, status = ? WHERE id = ?',
      [title || current.title, image, category || current.category, caption !== undefined ? caption : current.caption, display_order !== undefined ? display_order : current.display_order, status || current.status, id]
    );

    return successResponse(res, 'Gallery image updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update gallery image', err, 500);
  }
};

const deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM gallery WHERE id = ?', [id]);
    return successResponse(res, 'Gallery image deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete gallery image', err, 500);
  }
};

module.exports = { getAllGallery, getManagedGallery, getGalleryById, createGallery, updateGallery, deleteGallery };
