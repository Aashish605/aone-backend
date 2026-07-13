import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

interface SequelizeError extends Error {
  name: string;
  errors?: Array<{ message: string }>;
}

const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err.stack || err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  const seqErr = err as SequelizeError;

  if (seqErr.name === 'SequelizeValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: seqErr.errors?.map((e) => e.message) || [],
    });
    return;
  }

  if (seqErr.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({
      success: false,
      message: 'Resource already exists',
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

export default errorHandler;
