const sanitizeHtml = require('sanitize-html');

const cleanHtml = (value) => sanitizeHtml(typeof value === 'string' ? value : '');

module.exports = { cleanHtml };
