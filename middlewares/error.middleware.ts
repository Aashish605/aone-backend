import { Request, Response, NextFunction } from 'express';
<<<<<<< HEAD
import { AppError } from '../utils/AppError.js';

const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
=======
import { AppError } from '../utils/AppError';

const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
  console.error(err.stack || err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  if (err.name === 'SequelizeValidationError') {
<<<<<<< HEAD
    const sequelizeErr = err as { errors?: Array<{ message: string }> };
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: sequelizeErr.errors?.map((e) => e.message) || [],
=======
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: (err as any).errors?.map((e: any) => e.message),
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
    });
    return;
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
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
