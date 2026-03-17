/**
 * ============================================
 * FEEL ME - Configuration de la base de données
 * Connexion Sequelize à PostgreSQL (Neon)
 * 
 * Variables supportées (ordre de priorité) :
 *   1. DATABASE_URL (standard Neon/Vercel)
 *   2. DATABASE_POSTGRES_URL (préfixe Neon)
 *   3. POSTGRES_URL (ancien format Vercel)
 *   4. DATABASE_POSTGRES_URL_NO_SSL + SSL manuel
 * 
 * SSL : activé automatiquement en production
 * pour compatibilité avec Neon serverless.
 * ============================================
 */

import { Sequelize } from 'sequelize';

/* --- Singleton pour éviter les connexions multiples en dev (hot reload) --- */
const globalForDb = globalThis as unknown as { sequelize: Sequelize };

/**
 * Résout l'URL de connexion PostgreSQL parmi les différentes
 * variables d'environnement que Neon/Vercel peuvent fournir.
 */
const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_POSTGRES_PRISMA_URL ||
  process.env.DATABASE_POSTGRES_URL_NO_SSL ||
  '';

/* --- Log au démarrage pour diagnostiquer quelle variable est utilisée --- */
console.log('[DB] URL résolue depuis :', 
  process.env.DATABASE_URL ? 'DATABASE_URL' :
  process.env.DATABASE_POSTGRES_URL ? 'DATABASE_POSTGRES_URL' :
  process.env.POSTGRES_URL ? 'POSTGRES_URL' :
  process.env.DATABASE_POSTGRES_PRISMA_URL ? 'DATABASE_POSTGRES_PRISMA_URL' :
  process.env.DATABASE_POSTGRES_URL_NO_SSL ? 'DATABASE_POSTGRES_URL_NO_SSL' :
  'AUCUNE VARIABLE TROUVÉE'
);

/**
 * Crée ou réutilise l'instance Sequelize.
 * En production (Vercel), on force SSL avec rejectUnauthorized=false
 * car Neon exige une connexion chiffrée.
 */
const isProduction = process.env.NODE_ENV === 'production';

export const sequelize: Sequelize =
  globalForDb.sequelize ||
  new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 3,   /* --- Réduit pour serverless (évite les limites de connexion Neon) --- */
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    /* --- SSL obligatoire pour Neon en production --- */
    dialectOptions: isProduction
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });

/* --- Cache le singleton uniquement en dev (en prod, chaque invocation serverless est isolée) --- */
if (!isProduction) {
  globalForDb.sequelize = sequelize;
}

export default sequelize;
