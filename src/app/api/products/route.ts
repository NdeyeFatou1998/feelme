/**
 * ============================================
 * FEEL ME - API Route /api/products
 * CRUD des produits du catalogue
 * GET  : Liste tous les produits (avec catégorie)
 * POST : Crée un nouveau produit (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Product, Category } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

/* --- GET : Récupérer tous les produits --- */
export async function GET() {
  try {
    await syncDatabase();
    const products = await Product.findAll({
      include: [{ model: Category, as: 'category' }],
      order: [['createdAt', 'DESC']],
    });
    return NextResponse.json(
      { success: true, products },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[API/PRODUCTS] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- Configuration Next.js : désactiver le cache statique --- */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* --- POST : Créer un produit (admin requis) --- */
export async function POST(req: NextRequest) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const body = await req.json();
    const { name, description, price, promoPrice, image, categoryId, volume, stock } = body;

    /* --- Validation --- */
    if (!name || !price || !categoryId) {
      return NextResponse.json(
        { error: 'Nom, prix et catégorie requis' },
        { status: 400 }
      );
    }

    /* --- Génération du slug --- */
    const slug = name.toLowerCase()
      .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u').replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    /* --- Vérification unicité du slug --- */
    const existingSlug = await Product.findOne({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const product = await Product.create({
      name,
      slug: finalSlug,
      description: description || null,
      price: parseInt(price),
      promoPrice: promoPrice ? parseInt(promoPrice) : null,
      image: image || null,
      categoryId: parseInt(categoryId),
      volume: volume || null,
      stock: stock ? parseInt(stock) : 100,
      isActive: true,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error('[API/PRODUCTS] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
