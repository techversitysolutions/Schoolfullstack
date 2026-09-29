const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { slugify } = require('../utils/slugify');

const getAllAcademics = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM academics WHERE status = 'published' ORDER BY display_order ASC, created_at DESC");
    return successResponse(res, 'Academic programs loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch academic programs', err, 500);
  }
};

const getManagedAcademics = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM academics ORDER BY display_order ASC, created_at DESC');
    return successResponse(res, 'Academic programs loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch academic programs', err, 500);
  }
};

const getAcademicById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM academics WHERE id = ? AND status = 'published' LIMIT 1", [id]);

    if (!rows.length) {
      return errorResponse(res, 'Academic program not found', null, 404);
    }

    return successResponse(res, 'Academic program loaded', rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch academic program', err, 500);
  }
};

const createAcademic = async (req, res) => {
  try {
    const { title, level, description, learning_method, subjects, display_order = 0, status = 'published' } = req.body;

    if (!title) {
      return errorResponse(res, 'Academic title is required', null, 400);
    }

    const slug = slugify(title);

    await pool.query(
      'INSERT INTO academics (title, slug, level, description, learning_method, subjects, display_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, level, description, learning_method, subjects, display_order, status]
    );

    return successResponse(res, 'Academic program created successfully', null, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to create academic program', err, 500);
  }
};

const updateAcademic = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM academics WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      return errorResponse(res, 'Academic program not found', null, 404);
    }

    const current = rows[0];
    const { title, level, description, learning_method, subjects, display_order, status } = req.body;
    const slug = title ? slugify(title) : current.slug;

    await pool.query(
      'UPDATE academics SET title = ?, slug = ?, level = ?, description = ?, learning_method = ?, subjects = ?, display_order = ?, status = ? WHERE id = ?',
      [title || current.title, slug, level || current.level, description !== undefined ? description : current.description, learning_method || current.learning_method, subjects || current.subjects, display_order !== undefined ? display_order : current.display_order, status || current.status, id]
    );

    return successResponse(res, 'Academic program updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update academic program', err, 500);
  }
};

const deleteAcademic = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM academics WHERE id = ?', [id]);
    return successResponse(res, 'Academic program deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete academic program', err, 500);
  }
};

module.exports = { getAllAcademics, getManagedAcademics, getAcademicById, createAcademic, updateAcademic, deleteAcademic };
