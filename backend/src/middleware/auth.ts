import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'agrodesk-dev-secret-change-in-prod';

export interface AuthRequest extends Request {
  dealer_id?: string;
  is_demo?: boolean;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { dealer_id: string; is_demo?: boolean };
    req.dealer_id = payload.dealer_id;
    req.is_demo = payload.is_demo === true;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
