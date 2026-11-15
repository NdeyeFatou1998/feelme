import { Router, Request, Response } from 'express';
import { Client } from 'pg';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_POSTGRES_URL_NO_SSL ||
    '';

  if (!dbUrl) {
    res.json({
      success: false,
      message: 'Aucune variable DATABASE_URL trouvée',
      tried: [
        'DATABASE_URL',
        'DATABASE_POSTGRES_URL',
        'POSTGRES_URL',
        'DATABASE_POSTGRES_URL_NO_SSL',
      ],
    });
    return;
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW() as time, current_database() as db');
    await client.end();

    res.json({
      success: true,
      message: 'Connexion PostgreSQL réussie !',
      data: result.rows[0],
      urlSource: process.env.DATABASE_URL
        ? 'DATABASE_URL'
        : process.env.DATABASE_POSTGRES_URL
          ? 'DATABASE_POSTGRES_URL'
          : process.env.POSTGRES_URL
            ? 'POSTGRES_URL'
            : 'DATABASE_POSTGRES_URL_NO_SSL',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    res.json({
      success: false,
      message: msg,
      urlUsed: dbUrl.substring(0, 20) + '...',
    });
  }
});

export default router;
