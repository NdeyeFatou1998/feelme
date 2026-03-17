/**
 * ============================================
 * FEEL ME - Route de diagnostic DB
 * GET /api/test-db
 * Teste la connexion PostgreSQL et affiche
 * quelles variables d'environnement sont définies.
 * ============================================
 */

import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/db';

export async function GET() {
  /* --- Inventaire des variables DB disponibles --- */
  const envStatus = {
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
    DATABASE_POSTGRES_URL: process.env.DATABASE_POSTGRES_URL ? 'SET' : 'NOT_SET',
    POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT_SET',
    DATABASE_POSTGRES_PRISMA_URL: process.env.DATABASE_POSTGRES_PRISMA_URL ? 'SET' : 'NOT_SET',
    DATABASE_POSTGRES_URL_NO_SSL: process.env.DATABASE_POSTGRES_URL_NO_SSL ? 'SET' : 'NOT_SET',
    DATABASE_PGHOST: process.env.DATABASE_PGHOST ? 'SET' : 'NOT_SET',
    DATABASE_POSTGRES_USER: process.env.DATABASE_POSTGRES_USER ? 'SET' : 'NOT_SET',
    DATABASE_POSTGRES_PASSWORD: process.env.DATABASE_POSTGRES_PASSWORD ? 'SET' : 'NOT_SET',
    DATABASE_POSTGRES_DATABASE: process.env.DATABASE_POSTGRES_DATABASE ? 'SET' : 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
  };

  try {
    /* --- Tester la connexion --- */
    await sequelize.authenticate();

    /* --- Masquer l'URL pour la sécurité --- */
    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_POSTGRES_URL || 'NOT_SET';
    const dbUrlMasked = dbUrl.length > 30
      ? dbUrl.substring(0, 20) + '...' + dbUrl.substring(dbUrl.length - 10)
      : 'URL trop courte ou vide';

    return NextResponse.json({
      success: true,
      message: 'Connexion DB réussie !',
      dbUrl: dbUrlMasked,
      env: envStatus,
    });
  } catch (error) {
    /* --- En cas d'erreur, on retourne le détail SANS status 500 --- */
    /* --- pour que Vercel ne masque pas la réponse JSON --- */
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

    return NextResponse.json({
      success: false,
      message: errorMessage,
      env: envStatus,
    });
  }
}
