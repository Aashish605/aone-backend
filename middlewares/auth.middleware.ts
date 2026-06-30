import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env.config.js';
import db from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError.js';

interface JwtPayload {
  id: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

const authenticate = catchAsync(async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;

  const user = await db.User.findByPk(decoded.id, {
    attributes: { exclude: ['password'] },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid token. User not found.');
  }

  req.user = user;
  next();
});

const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
};

export { authenticate, authorize };
