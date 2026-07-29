import { Request, Response, NextFunction } from 'express';
import { auth } from '../auth/auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { UnauthorizedError } from '../utils/AppError.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
    isAdmin: boolean;
    contact?: string | null;
  };
}

const requireSession = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return next(new UnauthorizedError('Authentication required'));
    }

    req.user = session.user as AuthenticatedRequest['user'];
    next();
  } catch (err) {
    next(err);
  }
};

export { requireSession, AuthenticatedRequest };