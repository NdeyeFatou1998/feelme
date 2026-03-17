/**
 * ============================================
 * FEEL ME - Configuration de la base de données
 * Connexion Sequelize à PostgreSQL
 * ============================================
 */

import { Sequelize } from 'sequelize';

/* --- Singleton pour éviter les connexions multiples en dev (hot reload) --- */
const globalForDb = globalThis as unknown as { sequelize: Sequelize };

/**
 * Crée ou réutilise l'instance Sequelize.
 * Utilise DATABASE_URL si disponible, sinon les variables individuelles.
 */
/* --- URL de connexion : reconstruire à partir des variables Neon si DATABASE_URL n'existe pas --- */
const dbUrl = process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  (() => {
    // Variables créées par Neon
    const user = process.env.DATABASE_POSTGRES_USER;
    const password = process.env.DATABASE_POSTGRES_PASSWORD;
    const host = process.env.DATABASE_PGHOST;
    const port = process.env.DATABASE_PORT;
    const database = process.env.DATABASE_NAME;
    
    if (user && host && port && database) {
      return `postgresql://${user}:${password}@${host}:${port}/${database}`;
    }
    return '';
  })() || '';

export const sequelize: Sequelize =
  globalForDb.sequelize ||
  new Sequelize(
    dbUrl,
    {
      dialect: 'postgres',
      logging: false, // Mettre console.log pour debug SQL
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      /* --- SSL requis pour Neon Postgres (hébergement cloud) --- */
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }
  );

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sequelize = sequelize;
}

export default sequelize;
