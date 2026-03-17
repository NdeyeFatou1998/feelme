/**
 * ============================================
 * FEEL ME - API Route /api/products/[id]
 * GET    : Détail d'un produit
 * PUT    : Modifier un produit (admin)
 * DELETE : Supprimer un produit (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Product, Category } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

/* --- GET : Détail d'un produit --- */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await syncDatabase();
    const { id } = await params;

    const product = await Product.findByPk(id, {
      include: [{ model: Category, as: 'category' }],
    });

    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('[API/PRODUCTS] GET by id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- PUT : Modifier un produit --- */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;
    const body = await req.json();

    const product = await Product.findByPk(id);
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    /* --- Construction de l'objet de mise à jour ---
       On utilise product.update() au lieu de modifier les propriétés + save()
       car les class fields publiques de Sequelize masquent les setters,
       empêchant Sequelize de détecter les changements. */
    const updateData: Record<string, any> = {};

    if (body.name) {
      updateData.name = body.name;
      updateData.slug = body.name.toLowerCase()
        .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u').replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = parseInt(body.price);
    if (body.promoPrice !== undefined) updateData.promoPrice = body.promoPrice ? parseInt(body.promoPrice) : null;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.categoryId !== undefined) updateData.categoryId = parseInt(body.categoryId);
    if (body.volume !== undefined) updateData.volume = body.volume;
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    await product.update(updateData);
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('[API/PRODUCTS] PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- DELETE : Supprimer un produit --- */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;

    const product = await Product.findByPk(id);
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    await product.destroy();
    return NextResponse.json({ success: true, message: 'Produit supprimé' });
  } catch (error) {
    console.error('[API/PRODUCTS] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
