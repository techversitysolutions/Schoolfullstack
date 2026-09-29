const successResponse = (res, message, data = null, statusCode = 200, pagination = null) => {
  const payload = {
    success: true,
    message,
    data,
  };

  if (pagination) {
    payload.pagination = pagination;
  }

  return res.status(statusCode).json(payload);
};

const errorResponse = (res, message, error = null, statusCode = 500) => {
  const payload = {
    success: false,
    message,
  };

  if (error && process.env.NODE_ENV !== 'production') {
    payload.error = error.message || error;
  }

  return res.status(statusCode).json(payload);
};

module.exports = { successResponse, errorResponse };
