const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { slugify } = require('../utils/slugify');
const { cleanHtml } = require('../utils/sanitizeHtml');

const getAllPages = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM pages WHERE status = 'published' ORDER BY created_at DESC");
    return successResponse(res, 'Pages loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch pages', err, 500);
  }
};

const getManagedPages = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pages ORDER BY created_at DESC');
    return successResponse(res, 'Pages loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch pages', err, 500);
  }
};

const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await pool.query("SELECT * FROM pages WHERE slug = ? AND status = 'published' LIMIT 1", [slug]);

    if (!rows.length) {
      return errorResponse(res, 'Page not found', null, 404);
    }

    return successResponse(res, 'Page loaded', rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch page', err, 500);
  }
};

const createPage = async (req, res) => {
  try {
    const { title, content, meta_title, meta_description, status = 'published' } = req.body;

    if (!title) {
      return errorResponse(res, 'Page title is required', null, 400);
    }

    const slug = slugify(req.body.slug || title);
    const featured_image = req.file ? `/uploads/general/${req.file.filename}` : null;

    await pool.query(
      'INSERT INTO pages (title, slug, content, meta_title, meta_description, featured_image, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, slug, cleanHtml(content), meta_title || title, meta_description || '', featured_image, status]
    );

    return successResponse(res, 'Page created successfully', null, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to create page', err, 500);
  }
};

const updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM pages WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      return errorResponse(res, 'Page not found', null, 404);
    }

    const current = rows[0];
    const { title, slug, content, meta_title, meta_description, status } = req.body;
    const nextSlug = slug ? slugify(slug) : current.slug;
    const featured_image = req.file ? `/uploads/general/${req.file.filename}` : current.featured_image;

    await pool.query(
      'UPDATE pages SET title = ?, slug = ?, content = ?, meta_title = ?, meta_description = ?, featured_image = ?, status = ? WHERE id = ?',
      [title || current.title, nextSlug, content !== undefined ? cleanHtml(content) : current.content, meta_title || current.meta_title, meta_description !== undefined ? meta_description : current.meta_description, featured_image, status || current.status, id]
    );

    return successResponse(res, 'Page updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update page', err, 500);
  }
};

const deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pages WHERE id = ?', [id]);
    return successResponse(res, 'Page deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete page', err, 500);
  }
};

module.exports = { getAllPages, getManagedPages, getPageBySlug, createPage, updatePage, deletePage };
