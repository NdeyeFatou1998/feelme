/**
 * ============================================
 * FEEL ME - Script de Seed (initialisation DB)
 * Crée : admin par défaut, catégorie Musc,
 * produits initiaux (3ml, 6ml), pack 3x3ml
 * 
 * IMPORTANT : Sur Vercel serverless, le filesystem
 * n'est pas accessible. Les images sont référencées
 * via leur chemin public (/images/xxx.jpeg).
 * ============================================
 */

import bcrypt from 'bcryptjs';
import { syncDatabase, Admin, Category, Product, Pack } from './models';

/**
 * Retourne le chemin public de l'image.
 * Sur Vercel serverless, on ne peut PAS lire le filesystem (fs),
 * donc on utilise directement les URLs publiques /images/xxx.
 */
function getImagePath(filename: string): string {
  return `/images/${filename}`;
}

export async function seed() {
  try {
    /* --- 1. Synchroniser les tables --- */
    await syncDatabase();

    /* --- 2. Créer l'admin par défaut --- */
    const adminEmail = 'softechiris@gmail.com';
    const existingAdmin = await Admin.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Poiuytr123@', 12);
      await Admin.create({
        email: adminEmail,
        password: hashedPassword,
      });
      console.log('[SEED] Admin créé:', adminEmail);
    } else {
      console.log('[SEED] Admin existe déjà.');
    }

    /* --- 3. Créer la catégorie Musc --- */
    let muscCategory = await Category.findOne({ where: { slug: 'musc' } });
    if (!muscCategory) {
      muscCategory = await Category.create({
        name: 'Musc',
        slug: 'musc',
        description: 'Collection de muscs naturels et authentiques. Les senteurs du paradis.',
        image: getImagePath('feelmebanniere.jpeg'),
      });
      console.log('[SEED] Catégorie Musc créée.');
    }

    /* --- 4. Créer les produits --- */
    /* Note: on utilise dataValues.id car les class fields publiques de Sequelize
       masquent les getters, donc muscCategory.id peut être undefined */
    const catId = (muscCategory as any).dataValues.id;
    console.log('[SEED] Category ID:', catId);

    const productsData = [
      {
        name: 'Musc Tahara Original 3ml',
        slug: 'musc-tahara-3ml',
        description: 'Le Musc Tahara Original Feel Me en format 3ml. Un parfum délicat et envoûtant, idéal pour une utilisation quotidienne. Notes blanches et florales, pureté absolue.',
        price: 2000,
        promoPrice: null as number | null,
        image: getImagePath('feelme3ml.jpeg'),
        categoryId: catId,
        volume: '3ml',
        stock: 100,
        isActive: true,
      },
      {
        name: 'Musc Tahara Original 6ml',
        slug: 'musc-tahara-6ml',
        description: 'Le Musc Tahara Original Feel Me en format 6ml. La taille parfaite pour ceux qui veulent profiter plus longtemps de cette fragrance divine. Intense et longue tenue.',
        price: 3500,
        promoPrice: null as number | null,
        image: getImagePath('feelme6ml.jpeg'),
        categoryId: catId,
        volume: '6ml',
        stock: 100,
        isActive: true,
      },
    ];

    for (const pData of productsData) {
      const existing = await Product.findOne({ where: { slug: pData.slug } });
      if (!existing) {
        await Product.create(pData);
        console.log(`[SEED] Produit créé: ${pData.name}`);
      }
    }

    /* --- 5. Créer le pack 3x3ml --- */
    const product3ml = await Product.findOne({ where: { slug: 'musc-tahara-3ml' } });
    if (product3ml) {
      const prod3mlId = (product3ml as any).dataValues.id;
      const existingPack = await Pack.findOne({ where: { slug: 'pack-3x3ml' } });
      if (!existingPack) {
        await Pack.create({
          name: 'Pack 3 x Musc Tahara 3ml',
          slug: 'pack-3x3ml',
          description: 'Offre spéciale : 3 Musc Tahara 3ml au prix exceptionnel de 3500 FCFA au lieu de 6000 FCFA. Idéal pour offrir ou pour constituer votre stock personnel.',
          price: 6000,
          promoPrice: 3500,
          image: getImagePath('feelmepack3x3ml.jpeg'),
          items: [
            { productId: prod3mlId, productName: 'Musc Tahara 3ml', quantity: 3 },
          ],
          isActive: true,
        });
        console.log('[SEED] Pack 3x3ml créé.');
      }
    }

    console.log('[SEED] ✅ Initialisation terminée avec succès !');
  } catch (error) {
    console.error('[SEED] ❌ Erreur:', error);
    throw error;
  }
}
