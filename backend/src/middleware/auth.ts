/**
 * ============================================
 * FEEL ME - Middleware Express auth admin
 * Vérifie Authorization: Bearer <token>
 * ============================================
 */

import { Request, Response, NextFunction } from 'express';
import { authenticateAdmin, JWTPayload } from '../auth';

export interface AuthRequest extends Request {
  admin?: JWTPayload;
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const admin = authenticateAdmin(req);
  if (!admin) {
    res.status(401).json({ error: 'Non autorisé' });
    return;
  }
  req.admin = admin;
  next();
}
