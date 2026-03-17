/**
 * ============================================
 * FEEL ME - API Route /api/categories/[id]
 * PUT    : Modifier une catégorie (admin)
 * DELETE : Supprimer une catégorie (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Category } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

/* --- PUT : Modifier une catégorie --- */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;
    const { name, description, image } = await req.json();

    const category = await Category.findByPk(id);
    if (!category) {
      return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 });
    }

    /* --- Construction de l'objet de mise à jour ---
       On utilise category.update() car les class fields Sequelize masquent les setters */
    const updateData: Record<string, any> = {};

    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase()
        .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u').replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;

    await category.update(updateData);
    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('[API/CATEGORIES] PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- DELETE : Supprimer une catégorie --- */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;

    const category = await Category.findByPk(id);
    if (!category) {
      return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 });
    }

    await category.destroy();
    return NextResponse.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('[API/CATEGORIES] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
