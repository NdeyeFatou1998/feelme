/**
 * ============================================
 * FEEL ME - API Route /api/reseller-packs
 * CRUD des packs revendeurs
 * GET  : Liste tous les packs revendeurs
 * POST : Crée un nouveau pack revendeur (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { ResellerPack } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* --- GET : Récupérer tous les packs revendeurs --- */
export async function GET() {
  try {
    console.log('[API/RESELLER-PACKS] GET - Début');
    await syncDatabase();
    console.log('[API/RESELLER-PACKS] GET - DB synced');
    const resellerPacks = await ResellerPack.findAll({
      order: [['createdAt', 'DESC']],
    });
    console.log('[API/RESELLER-PACKS] GET - Found', resellerPacks.length, 'packs');
    return NextResponse.json(
      { success: true, resellerPacks },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[API/RESELLER-PACKS] GET error:', error);
    console.error('[API/RESELLER-PACKS] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/* --- POST : Créer un pack revendeur (admin requis) --- */
export async function POST(req: NextRequest) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const body = await req.json();
    const { name, description, discountType, discountValue, image, items } = body;

    /* --- Validation --- */
    if (!name || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Nom et articles requis' },
        { status: 400 }
      );
    }

    /* --- Calcul automatique des prix en fonction des produits --- */
    const { Product } = await import('@/lib/models');
    let totalNormalPrice = 0;
    
    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        const productPrice = product.promoPrice || product.price;
        totalNormalPrice += productPrice * item.quantity;
      }
    }

    const finalDiscountType = discountType || 'percentage';
    const finalDiscountValue = parseInt(discountValue) || 20;
    let resellerPrice = 0;

    if (finalDiscountType === 'percentage') {
      resellerPrice = Math.round(totalNormalPrice * (1 - finalDiscountValue / 100));
    } else {
      resellerPrice = totalNormalPrice - finalDiscountValue;
    }

    const profit = totalNormalPrice - resellerPrice;

    /* --- Génération du slug --- */
    const slug = name.toLowerCase()
      .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u').replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingSlug = await ResellerPack.findOne({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const resellerPack = await ResellerPack.create({
      name,
      slug: finalSlug,
      description: description || null,
      normalPrice: totalNormalPrice,
      resellerPrice,
      profit,
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
      image: image || null,
      items,
      isActive: true,
    });

    return NextResponse.json({ success: true, resellerPack }, { status: 201 });
  } catch (error) {
    console.error('[API/RESELLER-PACKS] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
