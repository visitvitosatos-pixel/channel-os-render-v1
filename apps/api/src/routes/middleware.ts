import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/auth.js';

export type AuthedRequest = Request & { auth?: { email: string; role: 'owner' } };

export function requireAuth(request: AuthedRequest, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return response.status(401).json({ message: 'Missing token' });
  }

  try {
    request.auth = verifyToken(token);
    next();
  } catch {
    response.status(401).json({ message: 'Invalid token' });
  }
}
