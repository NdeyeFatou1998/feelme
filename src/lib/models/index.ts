/**
 * ============================================
 * FEEL ME - Index des modèles Sequelize
 * Initialise les associations entre tables
 * et exporte tous les modèles
 * ============================================
 */

import sequelize from '../db';
import Admin from './Admin';
import Category from './Category';
import Product from './Product';
import Pack from './Pack';
import Order from './Order';
import ResellerPack from './ResellerPack';

/* --- Associations --- */

// Un produit appartient à une catégorie
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
// Une catégorie a plusieurs produits
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });

/* --- Variable globale pour tracker si la DB a déjà été synchronisée (survit au hot reload) --- */
const globalForSync = globalThis as unknown as { dbSynced: boolean };

/* --- Fonction de synchronisation de la DB (une seule fois par process) --- */
export async function syncDatabase() {
  try {
    await sequelize.authenticate();
    
    if (!globalForSync.dbSynced) {
      console.log('[DB] Connexion PostgreSQL établie avec succès.');
      
      // Sync toutes les tables (force:false = créer si n'existent pas, ne pas altérer)
      await sequelize.sync({ force: false });
      console.log('[DB] Tables synchronisées.');
      globalForSync.dbSynced = true;
    }
  } catch (error) {
    console.error('[DB] Erreur de connexion:', error);
    throw error;
  }
}

export { sequelize, Admin, Category, Product, Pack, Order, ResellerPack };
