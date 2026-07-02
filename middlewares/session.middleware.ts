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
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    throw new UnauthorizedError('Authentication required');
  }

  req.user = session.user as AuthenticatedRequest['user'];
  next();
};

export { requireSession, AuthenticatedRequest };