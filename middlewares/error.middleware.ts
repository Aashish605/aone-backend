import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

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

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

export default errorHandler;
