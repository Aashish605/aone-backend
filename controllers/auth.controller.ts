import { Request, Response } from 'express';
<<<<<<< HEAD
import jwt, { type SignOptions } from 'jsonwebtoken';
=======
import jwt from 'jsonwebtoken';
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
import { validationResult } from 'express-validator';
import db from '../models/index';
import env from '../config/env.config';
import catchAsync from '../utils/catchAsync';
import { ValidationError, ConflictError, UnauthorizedError } from '../utils/AppError';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

<<<<<<< HEAD
interface AuthRequest extends Request {
  user?: Record<string, unknown>;
}

const generateToken = (user: { id: string; role: string }): string => {
  const options: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ id: user.id, role: user.role }, env.jwt.secret, options);
};

const register = catchAsync(async (req: Request, res: Response): Promise<void> => {
=======
const generateToken = (user: { id: string; role: string }): string => {
  return jwt.sign({ id: user.id, role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

const register = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
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

<<<<<<< HEAD
const login = catchAsync(async (req: Request, res: Response): Promise<void> => {
=======
const login = catchAsync(async (req: Request, res: Response) => {
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
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

<<<<<<< HEAD
const getMe = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
=======
const getMe = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
  res.json({
    success: true,
    data: { user: req.user },
  });
});

export { register, login, getMe };
