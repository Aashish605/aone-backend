import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

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

  if (err.name === 'SequelizeValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: (err as any).errors?.map((e: any) => e.message),
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
