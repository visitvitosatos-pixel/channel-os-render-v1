import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { signToken } from '../lib/auth.js';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const authRouter = Router();

authRouter.post('/api/auth/login', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  if (parsed.data.email !== env.ADMIN_EMAIL || parsed.data.password !== env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken({ email: env.ADMIN_EMAIL, role: 'owner' });
  res.json({ token, user: { email: env.ADMIN_EMAIL, role: 'owner' } });
});
