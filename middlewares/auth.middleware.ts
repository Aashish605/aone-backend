import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env.config';
import db from '../models/index';
import catchAsync from '../utils/catchAsync';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError';
import User from '../models/user.model';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const authenticate = catchAsync(async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, env.jwt.secret) as { id: string };

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
    if (!roles.includes(req.user!.role)) {
      throw new ForbiddenError();
    }
    next();
  };
};

export { authenticate, authorize, AuthenticatedRequest };
