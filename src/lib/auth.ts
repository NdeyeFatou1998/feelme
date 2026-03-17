/**
 * ============================================
 * FEEL ME - Utilitaire d'authentification JWT
 * Fonctions : generateToken, verifyToken,
 * middleware de vérification admin
 * ============================================
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'feelme_default_secret';

/* --- Payload du token JWT --- */
export interface JWTPayload {
  adminId: number;
  email: string;
}

/**
 * Génère un token JWT pour un admin authentifié
 * Expiration : 7 jours
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Vérifie et décode un token JWT
 * Retourne le payload si valide, null sinon
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Extrait le token du header Authorization d'une requête
 * Format attendu : "Bearer <token>"
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

/**
 * Vérifie qu'une requête provient d'un admin authentifié
 * Retourne le payload du token ou null
 */
export function authenticateAdmin(req: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}
