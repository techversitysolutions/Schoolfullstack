const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC');
    return successResponse(res, 'Users loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch users', err, 500);
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'editor', status = 'active' } = req.body;

    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
      return errorResponse(res, 'Name, email and password are required', null, 400);
    }

    if (Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return errorResponse(res, 'Password must be between 12 and 72 bytes', null, 400);
    }
    if (!['admin', 'editor'].includes(role) || !['active', 'inactive'].includes(status)) {
      return errorResponse(res, 'Invalid user role or status', null, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, role, status]
    );

    return successResponse(res, 'User created successfully', null, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to create user', err, 500);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, password } = req.body;

    if (password && (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 72)) {
      return errorResponse(res, 'Password must be between 12 and 72 bytes', null, 400);
    }
    if ((role && !['admin', 'editor'].includes(role)) || (status && !['active', 'inactive'].includes(status))) {
      return errorResponse(res, 'Invalid user role or status', null, 400);
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      return errorResponse(res, 'User not found', null, 404);
    }

    const current = rows[0];
    const hashedPassword = password ? await bcrypt.hash(password, 12) : current.password;

    await pool.query(
      'UPDATE users SET name = ?, email = ?, role = ?, status = ?, password = ? WHERE id = ?',
      [name || current.name, email || current.email, role || current.role, status || current.status, hashedPassword, id]
    );

    return successResponse(res, 'User updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update user', err, 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return successResponse(res, 'User deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete user', err, 500);
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
