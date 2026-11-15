import { Router, Request, Response } from 'express';
import { sequelize } from '../db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
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
    await sequelize.authenticate();

    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_POSTGRES_URL || 'NOT_SET';
    const dbUrlMasked =
      dbUrl.length > 30
        ? dbUrl.substring(0, 20) + '...' + dbUrl.substring(dbUrl.length - 10)
        : 'URL trop courte ou vide';

    res.json({
      success: true,
      message: 'Connexion DB réussie !',
      dbUrl: dbUrlMasked,
      env: envStatus,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    res.json({
      success: false,
      message: errorMessage,
      env: envStatus,
    });
  }
});

export default router;
