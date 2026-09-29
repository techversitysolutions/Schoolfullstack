const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const getPublishedSlides = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM hero_slides WHERE status = 'published' ORDER BY display_order ASC, id ASC");
    return successResponse(res, 'Hero slides loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to load hero slides', err, 500);
  }
};

const getManagedSlides = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM hero_slides ORDER BY display_order ASC, id ASC');
    return successResponse(res, 'Hero slides loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to load hero slides', err, 500);
  }
};

const validateSlide = (body, current = {}) => {
  const mediaType = body.media_type || current.media_type || 'image';
  if (!['image', 'video', 'color'].includes(mediaType)) return 'Choose image, video, or solid color for the slide background.';

  if (mediaType === 'video') {
    const videoUrl = body.video_url || current.video_url || '';
    try {
      const url = new URL(videoUrl);
      if (url.protocol !== 'https:' || !/\.(mp4|webm)$/i.test(url.pathname)) {
        return 'Use a direct HTTPS MP4 or WebM video URL.';
      }
    } catch (error) {
      return 'Enter a valid HTTPS MP4 or WebM video URL.';
    }
  }

  const color = body.background_color || current.background_color || '#29235c';
  if (mediaType === 'color' && !/^#[0-9a-f]{6}$/i.test(color)) return 'Choose a valid six-digit hex background color.';
  if (body.button_link && !body.button_link.startsWith('/') && !/^https:\/\//i.test(body.button_link)) {
    return 'Button link must be a local path or HTTPS URL.';
  }
  return null;
};

const getValues = (body, current, uploadedImage, create = false) => ({
  title: body.title !== undefined ? body.title : current?.title,
  short_message: body.short_message !== undefined ? body.short_message : current?.short_message || '',
  media_type: body.media_type || current?.media_type || 'image',
  image_path: uploadedImage || (body.media_type && body.media_type !== 'image' ? null : current?.image_path || null),
  video_url: body.video_url !== undefined ? body.video_url : current?.video_url || null,
  background_color: body.background_color || current?.background_color || '#29235c',
  button_text: body.button_text !== undefined ? body.button_text : current?.button_text || '',
  button_link: body.button_link !== undefined ? body.button_link : current?.button_link || '',
  display_order: body.display_order !== undefined ? Number(body.display_order) : current?.display_order || 0,
  status: body.status || current?.status || (create ? 'draft' : 'draft'),
});

const createHeroSlide = async (req, res) => {
  try {
    const values = getValues(req.body || {}, null, req.file ? `/uploads/hero/${req.file.filename}` : null, true);
    if (typeof values.title !== 'string' || !values.title.trim()) {
      return errorResponse(res, 'Slide title is required.', null, 400);
    }
    if (values.media_type === 'image' && !values.image_path) {
      return errorResponse(res, 'Upload an image for this slide.', null, 400);
    }
    const validationError = validateSlide(req.body || {}, values);
    if (validationError) return errorResponse(res, validationError, null, 400);

    const [result] = await pool.execute(
      `INSERT INTO hero_slides (title, short_message, media_type, image_path, video_url, background_color, button_text, button_link, display_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [values.title.trim(), values.short_message, values.media_type, values.image_path, values.video_url, values.background_color, values.button_text, values.button_link, values.display_order, values.status]
    );
    return successResponse(res, 'Hero slide created', { id: result.insertId }, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to create hero slide', err, 500);
  }
};

const updateHeroSlide = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM hero_slides WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return errorResponse(res, 'Hero slide not found.', null, 404);

    const current = rows[0];
    const values = getValues(req.body || {}, current, req.file ? `/uploads/hero/${req.file.filename}` : null);
    if (typeof values.title !== 'string' || !values.title.trim()) {
      return errorResponse(res, 'Slide title is required.', null, 400);
    }
    if (values.media_type === 'image' && !values.image_path) {
      return errorResponse(res, 'Upload an image for this slide.', null, 400);
    }
    const validationError = validateSlide(req.body || {}, values);
    if (validationError) return errorResponse(res, validationError, null, 400);

    await pool.execute(
      `UPDATE hero_slides SET title = ?, short_message = ?, media_type = ?, image_path = ?, video_url = ?, background_color = ?, button_text = ?, button_link = ?, display_order = ?, status = ? WHERE id = ?`,
      [values.title.trim(), values.short_message, values.media_type, values.image_path, values.video_url, values.background_color, values.button_text, values.button_link, values.display_order, values.status, req.params.id]
    );
    return successResponse(res, 'Hero slide updated');
  } catch (err) {
    return errorResponse(res, 'Failed to update hero slide', err, 500);
  }
};

const deleteHeroSlide = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM hero_slides WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return errorResponse(res, 'Hero slide not found.', null, 404);
    return successResponse(res, 'Hero slide deleted');
  } catch (err) {
    return errorResponse(res, 'Failed to delete hero slide', err, 500);
  }
};

module.exports = { getPublishedSlides, getManagedSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide };