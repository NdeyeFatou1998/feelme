/**
 * ============================================
 * FEEL ME - Route temporaire pour créer le pack
 * "Pack 1x3ml et 1x6ml" à 5500 FCFA.
 * À SUPPRIMER après exécution.
 * ============================================
 */

import { NextResponse } from 'next/server';
import { Pack } from '@/lib/models';
import { syncDatabase } from '@/lib/models';

export async function GET() {
  try {
    await syncDatabase();

    /* --- Vérifier si le pack existe déjà --- */
    const existing = await Pack.findOne({ where: { slug: 'pack-1x3ml-et-1x6ml' } });
    if (existing) {
      /* Si déjà créé, juste corriger le prix */
      await existing.update({ price: 5500 });
      return NextResponse.json({
        success: true,
        message: 'Pack existait déjà, prix corrigé à 5500',
        pack: existing.toJSON(),
      });
    }

    /* --- Créer le pack --- */
    const pack = await Pack.create({
      name: 'Pack 1x3ml et 1x6ml',
      slug: 'pack-1x3ml-et-1x6ml',
      description: 'Un flacon 3ml et un flacon 6ml de votre choix',
      price: 5500,
      promoPrice: null,
      image: '/images/pack1x3et1x6.jpeg',
      items: [
        { productId: 0, productName: 'Parfum 3ml au choix', quantity: 1 },
        { productId: 0, productName: 'Parfum 6ml au choix', quantity: 1 },
      ],
      isActive: true,
    });

    console.log(`[FIX] Pack créé: ${pack.name} à ${pack.price} FCFA`);

    return NextResponse.json({
      success: true,
      message: 'Pack créé avec succès à 5500 FCFA',
      pack: pack.toJSON(),
    });
  } catch (error) {
    console.error('[FIX] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur', details: String(error) }, { status: 500 });
  }
}
