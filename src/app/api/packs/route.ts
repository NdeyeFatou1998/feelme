/**
 * ============================================
 * FEEL ME - API Route /api/packs
 * CRUD des packs (combinaisons de produits)
 * GET  : Liste tous les packs
 * POST : Crée un nouveau pack (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pack } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

/* --- GET : Récupérer tous les packs --- */
export async function GET() {
  try {
    await syncDatabase();
    const packs = await Pack.findAll({
      order: [['createdAt', 'DESC']],
    });
    return NextResponse.json(
      { success: true, packs },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[API/PACKS] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- Configuration Next.js : désactiver le cache statique --- */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* --- POST : Créer un pack (admin requis) --- */
export async function POST(req: NextRequest) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const body = await req.json();
    const { name, description, price, promoPrice, image, items } = body;

    /* --- Validation --- */
    if (!name || !price || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Nom, prix et articles requis' },
        { status: 400 }
      );
    }

    /* --- Génération du slug --- */
    const slug = name.toLowerCase()
      .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u').replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingSlug = await Pack.findOne({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const pack = await Pack.create({
      name,
      slug: finalSlug,
      description: description || null,
      price: parseInt(price),
      promoPrice: promoPrice ? parseInt(promoPrice) : null,
      image: image || null,
      items,
      isActive: true,
    });

    return NextResponse.json({ success: true, pack }, { status: 201 });
  } catch (error) {
    console.error('[API/PACKS] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
