import jwt from 'jsonwebtoken';
import env from '../config/env.config.js';
import db from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError.js';

const authenticate = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, env.jwt.secret);

  const user = await db.User.findByPk(decoded.id, {
    attributes: { exclude: ['password'] },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid token. User not found.');
  }

  req.user = user;
  next();
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
};

export { authenticate, authorize };
