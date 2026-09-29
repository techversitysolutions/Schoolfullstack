const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { slugify } = require('../utils/slugify');
const { cleanHtml } = require('../utils/sanitizeHtml');

const getFaculty = async (req, res, includeUnpublished) => {
  try {
    const requestedPage = Number(req.query.page || 1);
    const requestedLimit = Number(req.query.limit || 10);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let query = 'SELECT * FROM faculty';
    const conditions = [];
    const params = [];

    if (!includeUnpublished) conditions.push("status = 'published'");
    if (search) {
      conditions.push('(name LIKE ? OR department LIKE ? OR position LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ' ORDER BY display_order ASC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM faculty${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''}`,
      search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
    );

    return successResponse(res, 'Faculty records loaded', rows, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch faculty', err, 500);
  }
};

const getAllFaculty = (req, res) => getFaculty(req, res, false);
const getManagedFaculty = (req, res) => getFaculty(req, res, true);

const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM faculty WHERE id = ? AND status = 'published' LIMIT 1", [id]);

    if (!rows.length) {
      return errorResponse(res, 'Faculty member not found', null, 404);
    }

    return successResponse(res, 'Faculty record', rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch faculty member', err, 500);
  }
};

const createFaculty = async (req, res) => {
  try {
    const { name, position, department, qualification, bio, display_order = 0, status = 'published' } = req.body;

    if (!name) {
      return errorResponse(res, 'Faculty name is required', null, 400);
    }

    const slug = slugify(name);
    const image = req.file ? `/uploads/faculty/${req.file.filename}` : null;

    await pool.query(
      'INSERT INTO faculty (name, slug, position, department, qualification, bio, image, display_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, slug, position, department, qualification, cleanHtml(bio), image, display_order, status]
    );

    return successResponse(res, 'Faculty created successfully', null, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to create faculty', err, 500);
  }
};

const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, department, qualification, bio, display_order, status } = req.body;
    const [rows] = await pool.query('SELECT * FROM faculty WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      return errorResponse(res, 'Faculty member not found', null, 404);
    }

    const current = rows[0];
    const slug = name ? slugify(name) : current.slug;
    const image = req.file ? `/uploads/faculty/${req.file.filename}` : current.image;

    await pool.query(
      'UPDATE faculty SET name = ?, slug = ?, position = ?, department = ?, qualification = ?, bio = ?, image = ?, display_order = ?, status = ? WHERE id = ?',
      [name || current.name, slug, position || current.position, department || current.department, qualification || current.qualification, bio !== undefined ? cleanHtml(bio) : current.bio, image, display_order !== undefined ? display_order : current.display_order, status || current.status, id]
    );

    return successResponse(res, 'Faculty updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update faculty', err, 500);
  }
};

const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM faculty WHERE id = ?', [id]);
    return successResponse(res, 'Faculty deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete faculty', err, 500);
  }
};

module.exports = { getAllFaculty, getManagedFaculty, getFacultyById, createFaculty, updateFaculty, deleteFaculty };
