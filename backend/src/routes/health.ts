import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    node: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      DATABASE_URL: process.env.DATABASE_URL
        ? 'SET (' + process.env.DATABASE_URL.substring(0, 15) + '...)'
        : 'NOT_SET',
      DATABASE_POSTGRES_URL: process.env.DATABASE_POSTGRES_URL ? 'SET' : 'NOT_SET',
      POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT_SET',
      DATABASE_POSTGRES_URL_NO_SSL: process.env.DATABASE_POSTGRES_URL_NO_SSL ? 'SET' : 'NOT_SET',
      DATABASE_PGHOST: process.env.DATABASE_PGHOST ? 'SET' : 'NOT_SET',
      DATABASE_PGUSER: process.env.DATABASE_PGUSER ? 'SET' : 'NOT_SET',
      DATABASE_PGPASSWORD: process.env.DATABASE_PGPASSWORD ? 'SET' : 'NOT_SET',
      DATABASE_PGDATABASE: process.env.DATABASE_PGDATABASE ? 'SET' : 'NOT_SET',
      DATABASE_POSTGRES_USER: process.env.DATABASE_POSTGRES_USER ? 'SET' : 'NOT_SET',
      DATABASE_POSTGRES_HOST: process.env.DATABASE_POSTGRES_HOST ? 'SET' : 'NOT_SET',
      DATABASE_POSTGRES_DATABASE: process.env.DATABASE_POSTGRES_DATABASE ? 'SET' : 'NOT_SET',
    },
  });
});

export default router;
