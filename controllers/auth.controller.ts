import { Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import db from '../models/index.js';
import env from '../config/env.config.js';
import catchAsync from '../utils/catchAsync.js';
import { ValidationError, ConflictError, UnauthorizedError } from '../utils/AppError.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const generateAccessToken = (user: { id: string; role: string }): string => {
  const options: SignOptions = { expiresIn: '15m' };
  return jwt.sign({ id: user.id, role: user.role }, env.jwt.secret, options);
};

const generateRefreshToken = (user: { id: string; role: string }): string => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign({ id: user.id, role: user.role }, env.jwt.secret, options);
};

const signup = catchAsync(async (req: Request, res: Response): Promise<void> => {
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
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user: { ...user.toJSON(), accessToken } },
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

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: { ...user.toJSON(), accessToken } },
  });
});

const getMe = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

const refresh = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new UnauthorizedError('No refresh token provided');
  }

  const decoded = jwt.verify(token, env.jwt.secret) as { id: string; role: string };

  const user = await db.User.findByPk(decoded.id, {
    attributes: { exclude: ['password'] },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const accessToken = generateAccessToken(user);

  res.json({
    success: true,
    message: 'Access token refreshed successfully',
    data: { accessToken },
  });
});

export { signup, login, getMe, refresh };
