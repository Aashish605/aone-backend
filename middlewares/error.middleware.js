import { AppError } from '../utils/AppError.js';

const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map((e) => e.message),
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

export default errorHandler;
