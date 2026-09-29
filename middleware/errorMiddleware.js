const { errorResponse } = require('../utils/response');

const notFound = (req, res) => {
  return errorResponse(res, 'Route not found', null, 404);
};

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || err.status || (err.name === 'MulterError' ? 400 : 500);
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  return errorResponse(res, message, null, statusCode);
};

module.exports = { notFound, errorHandler };
