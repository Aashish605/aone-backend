import { Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import db from '../models/index.js';
import env from '../config/env.config.js';
import catchAsync from '../utils/catchAsync.js';
import { ValidationError, ConflictError, UnauthorizedError } from '../utils/AppError.js';

interface AuthRequest extends Request {
  user?: Record<string, unknown>;
}

const generateToken = (user: { id: string; role: string }): string => {
  const options: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ id: user.id, role: user.role }, env.jwt.secret, options);
};

const register = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array());
  }

  const { name, email, password } = req.body;

  const existingUser = await db.User.findOne({ where: { email } });
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  const user = await db.User.create({ name, email, password });
  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user: { ...user.toJSON(), token } },
  });
});

const login = catchAsync(async (req: Request, res: Response): Promise<void> => {
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

const getMe = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

export { register, login, getMe };
