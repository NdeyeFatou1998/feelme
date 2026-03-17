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
/* --- URL de connexion : utiliser DATABASE_URL fourni par Neon (SSL déjà inclus) --- */
const dbUrl = process.env.DATABASE_URL || '';

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
      /* --- Neon inclut déjà sslmode=require dans DATABASE_URL, pas besoin de SSL supplémentaire --- */
    }
  );

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sequelize = sequelize;
}

export default sequelize;
