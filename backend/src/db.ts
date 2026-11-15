/**
 * ============================================
 * FEEL ME - Configuration de la base de données
 * Connexion Sequelize à PostgreSQL (Neon / Railway)
 *
 * Variables supportées (ordre de priorité) :
 *   1. DATABASE_URL (standard Neon/Vercel/Railway)
 *   2. DATABASE_POSTGRES_URL (préfixe Neon)
 *   3. POSTGRES_URL (ancien format Vercel)
 *   4. DATABASE_POSTGRES_URL_NO_SSL + SSL manuel
 *
 * SSL : activé en production, ou si l'URL
 * contient neon / railway / sslmode=require.
 * ============================================
 */

import { Sequelize } from 'sequelize';

const globalForDb = globalThis as unknown as { sequelize: Sequelize };

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_POSTGRES_PRISMA_URL ||
  process.env.DATABASE_POSTGRES_URL_NO_SSL ||
  '';

console.log(
  '[DB] URL résolue depuis :',
  process.env.DATABASE_URL
    ? 'DATABASE_URL'
    : process.env.DATABASE_POSTGRES_URL
      ? 'DATABASE_POSTGRES_URL'
      : process.env.POSTGRES_URL
        ? 'POSTGRES_URL'
        : process.env.DATABASE_POSTGRES_PRISMA_URL
          ? 'DATABASE_POSTGRES_PRISMA_URL'
          : process.env.DATABASE_POSTGRES_URL_NO_SSL
            ? 'DATABASE_POSTGRES_URL_NO_SSL'
            : 'AUCUNE VARIABLE TROUVÉE'
);

if (!dbUrl) {
  console.error(
    '[DB] ❌ Aucune DATABASE_URL. Ajoutez-la dans .env (local) ou Variables Railway.'
  );
}

const isProduction = process.env.NODE_ENV === 'production';
const needsSsl =
  isProduction ||
  Boolean(process.env.RAILWAY_ENVIRONMENT) ||
  /neon\.tech|railway\.app|sslmode=require/i.test(dbUrl);

/* Placeholder évite un crash Sequelize si l'URL est vide ; authenticate() échouera clairement. */
const connectionUrl = dbUrl || 'postgres://localhost:5432/feelme_missing_database_url';

export const sequelize: Sequelize =
  globalForDb.sequelize ||
  new Sequelize(connectionUrl, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: needsSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });

if (!isProduction) {
  globalForDb.sequelize = sequelize;
}

export default sequelize;
