/**
 * ============================================
 * FEEL ME - Test connexion PostgreSQL direct
 * GET /api/test-pg
 * 
 * Utilise le module pg directement (sans Sequelize)
 * pour tester la connexion à Neon.
 * Permet d'isoler si le problème vient de
 * Sequelize ou de la connexion PostgreSQL.
 * ============================================
 */

import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET() {
  /* --- Résoudre l'URL de connexion --- */
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_POSTGRES_URL_NO_SSL ||
    '';

  if (!dbUrl) {
    return NextResponse.json({
      success: false,
      message: 'Aucune variable DATABASE_URL trouvée',
      tried: ['DATABASE_URL', 'DATABASE_POSTGRES_URL', 'POSTGRES_URL', 'DATABASE_POSTGRES_URL_NO_SSL'],
    });
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW() as time, current_database() as db');
    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Connexion PostgreSQL réussie !',
      data: result.rows[0],
      urlSource: process.env.DATABASE_URL ? 'DATABASE_URL' :
                 process.env.DATABASE_POSTGRES_URL ? 'DATABASE_POSTGRES_URL' :
                 process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'DATABASE_POSTGRES_URL_NO_SSL',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({
      success: false,
      message: msg,
      urlUsed: dbUrl.substring(0, 20) + '...',
    });
  }
}
