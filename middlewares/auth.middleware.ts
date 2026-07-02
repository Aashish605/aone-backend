import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
<<<<<<< HEAD
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
=======
import env from '../config/env.config';
import db from '../models/index';
import catchAsync from '../utils/catchAsync';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError';
import User from '../models/user.model';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const authenticate = catchAsync(async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];
<<<<<<< HEAD
  const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
=======
  const decoded = jwt.verify(token, env.jwt.secret) as { id: string };
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28

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
<<<<<<< HEAD
    if (!req.user || !roles.includes(req.user.role)) {
=======
    if (!roles.includes(req.user!.role)) {
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
      throw new ForbiddenError();
    }
    next();
  };
};

<<<<<<< HEAD
export { authenticate, authorize };
=======
export { authenticate, authorize, AuthenticatedRequest };
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
