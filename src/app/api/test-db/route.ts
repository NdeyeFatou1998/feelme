/**
 * Route de test pour diagnostiquer la connexion DB
 */

import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/db';

export async function GET() {
  try {
    // Test de connexion
    await sequelize.authenticate();
    
    // Récupérer les variables d'environnement (masquées)
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'NOT_SET';
    const dbUrlMasked = dbUrl.substring(0, 20) + '...' + dbUrl.substring(dbUrl.length - 10);
    
    return NextResponse.json({
      success: true,
      message: 'Connexion DB réussie',
      dbUrl: dbUrlMasked,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV,
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      stack: errorStack,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
}
