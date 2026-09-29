const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { pool } = require('../config/database');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

    const [rows] = await pool.query('SELECT id, name, email, role, status FROM users WHERE id = ? LIMIT 1', [decoded.id]);

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'User account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to perform this action' });
    }

    next();
  };
};

module.exports = { protect, authorize };
