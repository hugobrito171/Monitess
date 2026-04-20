import { Router, Request, Response, NextFunction } from 'express';
import { isAuthEnabled, verifyPassword, generateToken, verifyToken } from '../auth.js';

export const authRouter = Router();

// Middleware to protect routes
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthEnabled()) {
    next();
    return;
  }
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1] ?? req.query.token as string;
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response): void => {
  if (!isAuthEnabled()) {
    res.json({ token: generateToken(), authRequired: false });
    return;
  }
  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }
  if (!verifyPassword(password)) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  res.json({ token: generateToken(), authRequired: true });
});

// GET /api/auth/status
authRouter.get('/status', (_req: Request, res: Response): void => {
  res.json({ authEnabled: isAuthEnabled() });
});
