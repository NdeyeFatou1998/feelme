/**
 * ============================================
 * FEEL ME - Index des modèles Sequelize
 * Initialise les associations entre tables
 * et exporte tous les modèles.
 * 
 * syncDatabase() crée les tables si elles
 * n'existent pas (ALTER = false).
 * En serverless (Vercel), pas de cache car
 * chaque invocation est un process isolé.
 * ============================================
 */

import sequelize from '../db';
import Admin from './Admin';
import Category from './Category';
import Product from './Product';
import Pack from './Pack';
import Order from './Order';
import ResellerPack from './ResellerPack';
import Settings from './Settings';

/* --- Associations --- */

// Un produit appartient à une catégorie
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
// Une catégorie a plusieurs produits
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });

/**
 * Synchronise toutes les tables dans PostgreSQL.
 * force:false = crée les tables manquantes, ne supprime rien.
 * alter:false = ne modifie pas les colonnes existantes.
 * En production serverless, on exécute toujours car chaque
 * invocation est un process isolé (pas de state persistant).
 */
export async function syncDatabase() {
  console.log('[DB] Début syncDatabase...');
  await sequelize.authenticate();
  console.log('[DB] Authentification réussie.');
  
  /* --- Synchroniser chaque modèle individuellement pour un meilleur diagnostic --- */
  await Admin.sync({ force: false });
  console.log('[DB] Table admins OK.');
  
  await Category.sync({ force: false });
  console.log('[DB] Table categories OK.');
  
  await Product.sync({ force: false });
  console.log('[DB] Table products OK.');
  
  await Pack.sync({ force: false });
  console.log('[DB] Table packs OK.');
  
  await Order.sync({ force: false });
  console.log('[DB] Table orders OK.');
  
  await ResellerPack.sync({ force: false });
  console.log('[DB] Table reseller_packs OK.');
  
  await Settings.sync({ force: false });
  console.log('[DB] Table settings OK.');
  
  console.log('[DB] ✅ Toutes les tables synchronisées.');
}

export { sequelize, Admin, Category, Product, Pack, Order, ResellerPack, Settings };
