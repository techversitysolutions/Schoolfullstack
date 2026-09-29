const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return errorResponse(res, 'Name, email and message are required', null, 400);
    }

    await pool.query(
      'INSERT INTO contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, subject, message]
    );

    return successResponse(res, 'Your message has been sent successfully', null, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to submit contact form', err, 500);
  }
};

const getAllContacts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
    return successResponse(res, 'Contact messages loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch contacts', err, 500);
  }
};

const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM contacts WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      return errorResponse(res, 'Contact message not found', null, 404);
    }

    return successResponse(res, 'Contact message loaded', rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch contact message', err, 500);
  }
};

const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE contacts SET status = ? WHERE id = ?', [status || 'read', id]);
    return successResponse(res, 'Contact status updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update contact message', err, 500);
  }
};

const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contacts WHERE id = ?', [id]);
    return successResponse(res, 'Contact message deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete contact message', err, 500);
  }
};

module.exports = { submitContact, getAllContacts, getContactById, updateContact, deleteContact };
