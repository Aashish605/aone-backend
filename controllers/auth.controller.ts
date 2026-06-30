import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import db from '../models/index';
import env from '../config/env.config';
import catchAsync from '../utils/catchAsync';
import { ValidationError, ConflictError, UnauthorizedError } from '../utils/AppError';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const generateToken = (user: { id: string; role: string }): string => {
  return jwt.sign({ id: user.id, role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

const register = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array());
  }

  const { name, email, password } = req.body;

  const existingUser = await db.User.findOne({ where: { email } });
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  const user = await db.User.create({ name, email, password, role: 'user' });
  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user: { ...user.toJSON(), token } },
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array());
  }

  const { email, password } = req.body;

  const user = await db.User.findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: { ...user.toJSON(), token } },
  });
});

const getMe = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

export { register, login, getMe };
