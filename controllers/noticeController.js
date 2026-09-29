const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { slugify } = require('../utils/slugify');

const getNotices = async (req, res, includeUnpublished) => {
  try {
    const requestedPage = Number(req.query.page || 1);
    const requestedLimit = Number(req.query.limit || 10);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let query = 'SELECT * FROM notices';
    const conditions = [];
    const params = [];

    if (!includeUnpublished) conditions.push("status = 'published'");
    if (search) {
      conditions.push('(title LIKE ? OR category LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ' ORDER BY published_date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM notices${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''}`,
      search ? (includeUnpublished ? [`%${search}%`, `%${search}%`] : [`%${search}%`, `%${search}%`]) : []
    );

    return successResponse(res, 'Notices loaded', rows, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch notices', err, 500);
  }
};

const getAllNotices = (req, res) => getNotices(req, res, false);
const getManagedNotices = (req, res) => getNotices(req, res, true);

const getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM notices WHERE id = ? AND status = 'published' LIMIT 1", [id]);

    if (!rows.length) {
      return errorResponse(res, 'Notice not found', null, 404);
    }

    return successResponse(res, 'Notice loaded', rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch notice', err, 500);
  }
};

const createNotice = async (req, res) => {
  try {
    const { title, category, short_description, content, published_date, status = 'published' } = req.body;

    if (!title) {
      return errorResponse(res, 'Notice title is required', null, 400);
    }

    const slug = slugify(title);
    const featured_image = req.file ? `/uploads/notices/${req.file.filename}` : null;

    await pool.query(
      'INSERT INTO notices (title, slug, category, short_description, content, featured_image, published_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, category || 'General', short_description, content, featured_image, published_date || new Date(), status]
    );

    return successResponse(res, 'Notice created successfully', null, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to create notice', err, 500);
  }
};

const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM notices WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      return errorResponse(res, 'Notice not found', null, 404);
    }

    const current = rows[0];
    const { title, category, short_description, content, published_date, status } = req.body;
    const slug = title ? slugify(title) : current.slug;
    const featured_image = req.file ? `/uploads/notices/${req.file.filename}` : current.featured_image;

    await pool.query(
      'UPDATE notices SET title = ?, slug = ?, category = ?, short_description = ?, content = ?, featured_image = ?, published_date = ?, status = ? WHERE id = ?',
      [title || current.title, slug, category || current.category, short_description !== undefined ? short_description : current.short_description, content !== undefined ? content : current.content, featured_image, published_date || current.published_date, status || current.status, id]
    );

    return successResponse(res, 'Notice updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update notice', err, 500);
  }
};

const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notices WHERE id = ?', [id]);
    return successResponse(res, 'Notice deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete notice', err, 500);
  }
};

module.exports = { getAllNotices, getManagedNotices, getNoticeById, createNotice, updateNotice, deleteNotice };
