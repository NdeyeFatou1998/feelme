/**
 * ============================================
 * FEEL ME - Utilitaire d'authentification JWT
 * Fonctions : generateToken, verifyToken,
 * extraction Bearer pour Express Request
 * ============================================
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request } from 'express';

/**
 * Le code est public : un secret écrit ici permettrait à n'importe qui de fabriquer
 * un jeton admin. Sans JWT_SECRET, on tire un secret au hasard au démarrage :
 * personne ne peut le deviner, et l'admin doit juste se reconnecter après un redémarrage.
 */
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.error('[AUTH] JWT_SECRET absente : secret aléatoire, les sessions admin ne survivront pas à un redémarrage.');
}

export interface JWTPayload {
  adminId: number;
  email: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

export function authenticateAdmin(req: Request): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}
