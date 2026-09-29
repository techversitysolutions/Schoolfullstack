const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { slugify } = require('../utils/slugify');

const getEvents = async (req, res, includeUnpublished) => {
  try {
    const requestedPage = Number(req.query.page || 1);
    const requestedLimit = Number(req.query.limit || 10);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let query = 'SELECT * FROM events';
    const conditions = [];
    const params = [];

    if (!includeUnpublished) conditions.push("status = 'published'");
    if (search) {
      conditions.push('(title LIKE ? OR category LIKE ? OR location LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ' ORDER BY event_date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM events${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''}`,
      search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
    );

    return successResponse(res, 'Events loaded', rows, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch events', err, 500);
  }
};

const getAllEvents = (req, res) => getEvents(req, res, false);
const getManagedEvents = (req, res) => getEvents(req, res, true);

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM events WHERE id = ? AND status = 'published' LIMIT 1", [id]);

    if (!rows.length) {
      return errorResponse(res, 'Event not found', null, 404);
    }

    return successResponse(res, 'Event loaded', rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch event', err, 500);
  }
};

const createEvent = async (req, res) => {
  try {
    const { title, description, event_date, event_end_date, location, category, status = 'published' } = req.body;

    if (!title) {
      return errorResponse(res, 'Event title is required', null, 400);
    }

    const slug = slugify(title);
    const image = req.file ? `/uploads/events/${req.file.filename}` : null;

    await pool.query(
      'INSERT INTO events (title, slug, description, event_date, event_end_date, location, image, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, description, event_date, event_end_date, location, image, category || 'General', status]
    );

    return successResponse(res, 'Event created successfully', null, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to create event', err, 500);
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      return errorResponse(res, 'Event not found', null, 404);
    }

    const current = rows[0];
    const { title, description, event_date, event_end_date, location, category, status } = req.body;
    const slug = title ? slugify(title) : current.slug;
    const image = req.file ? `/uploads/events/${req.file.filename}` : current.image;

    await pool.query(
      'UPDATE events SET title = ?, slug = ?, description = ?, event_date = ?, event_end_date = ?, location = ?, image = ?, category = ?, status = ? WHERE id = ?',
      [title || current.title, slug, description !== undefined ? description : current.description, event_date || current.event_date, event_end_date || current.event_end_date, location || current.location, image, category || current.category, status || current.status, id]
    );

    return successResponse(res, 'Event updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update event', err, 500);
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM events WHERE id = ?', [id]);
    return successResponse(res, 'Event deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete event', err, 500);
  }
};

module.exports = { getAllEvents, getManagedEvents, getEventById, createEvent, updateEvent, deleteEvent };
