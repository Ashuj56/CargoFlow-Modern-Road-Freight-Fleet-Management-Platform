const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }
  // Mongoose duplicate key
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
    errors = [{ field, message }];
  }
  // Cast error (bad ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  // Zod validation
  else if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (!(err instanceof ApiError)) {
    console.error('❌ Unhandled error:', err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length ? { errors } : {}),
  });
}

module.exports = errorHandler;
