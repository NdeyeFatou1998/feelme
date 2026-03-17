/**
 * ============================================
 * FEEL ME - API Route /api/categories
 * CRUD des catégories de produits
 * GET  : Liste toutes les catégories
 * POST : Crée une nouvelle catégorie (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Category, Product } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

/* --- GET : Récupérer toutes les catégories --- */
export async function GET() {
  try {
    await syncDatabase();
    const categories = await Category.findAll({
      include: [{ model: Product, as: 'products' }],
      order: [['createdAt', 'ASC']],
    });
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('[API/CATEGORIES] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- POST : Créer une catégorie (admin requis) --- */
export async function POST(req: NextRequest) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { name, description, image } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    }

    /* --- Génération du slug à partir du nom --- */
    const slug = name.toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const category = await Category.create({
      name,
      slug,
      description: description || null,
      image: image || null,
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    console.error('[API/CATEGORIES] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
