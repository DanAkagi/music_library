import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  username: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export const signToken = (user: AuthUser): string =>
  jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const id = Number(payload.sub);
    const username = String(payload.username ?? '');
    if (!id || !username) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = { id, username };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
