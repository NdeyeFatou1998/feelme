/**
 * ============================================
 * FEEL ME - API Route /api/packs/[id]
 * PUT    : Modifier un pack (admin)
 * DELETE : Supprimer un pack (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pack } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

/* --- PUT : Modifier un pack --- */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;
    const body = await req.json();

    const pack = await Pack.findByPk(id);
    if (!pack) {
      return NextResponse.json({ error: 'Pack introuvable' }, { status: 404 });
    }

    /* --- Construction de l'objet de mise à jour ---
       On utilise pack.update() au lieu de modifier les propriétés + save()
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
    if (body.items !== undefined) updateData.items = body.items;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    await pack.update(updateData);
    return NextResponse.json({ success: true, pack });
  } catch (error) {
    console.error('[API/PACKS] PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- DELETE : Supprimer un pack --- */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;

    const pack = await Pack.findByPk(id);
    if (!pack) {
      return NextResponse.json({ error: 'Pack introuvable' }, { status: 404 });
    }

    await pack.destroy();
    return NextResponse.json({ success: true, message: 'Pack supprimé' });
  } catch (error) {
    console.error('[API/PACKS] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
