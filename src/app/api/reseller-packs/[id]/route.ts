/**
 * ============================================
 * FEEL ME - API Route /api/reseller-packs/[id]
 * PUT    : Modifier un pack revendeur (admin)
 * DELETE : Supprimer un pack revendeur (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { ResellerPack } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

/* --- PUT : Modifier un pack revendeur --- */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;
    const body = await req.json();

    const resellerPack = await ResellerPack.findByPk(id);
    if (!resellerPack) {
      return NextResponse.json({ error: 'Pack revendeur introuvable' }, { status: 404 });
    }

    /* --- Construction de l'objet de mise à jour --- */
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
    if (body.image !== undefined) updateData.image = body.image;
    if (body.items !== undefined) updateData.items = body.items;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    /* --- Recalculer automatiquement les prix en fonction des produits --- */
    const items = body.items || resellerPack.items;
    const { Product } = await import('@/lib/models');
    let totalNormalPrice = 0;
    
    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        const productPrice = product.promoPrice || product.price;
        totalNormalPrice += productPrice * item.quantity;
      }
    }

    const finalDiscountType = body.discountType || resellerPack.discountType || 'percentage';
    const finalDiscountValue = parseInt(body.discountValue) || resellerPack.discountValue || 20;
    let resellerPrice = 0;

    if (finalDiscountType === 'percentage') {
      resellerPrice = Math.round(totalNormalPrice * (1 - finalDiscountValue / 100));
    } else {
      resellerPrice = totalNormalPrice - finalDiscountValue;
    }

    const profit = totalNormalPrice - resellerPrice;

    updateData.normalPrice = totalNormalPrice;
    updateData.resellerPrice = resellerPrice;
    updateData.profit = profit;
    updateData.discountType = finalDiscountType;
    updateData.discountValue = finalDiscountValue;

    await resellerPack.update(updateData);
    return NextResponse.json({ success: true, resellerPack });
  } catch (error) {
    console.error('[API/RESELLER-PACKS] PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- DELETE : Supprimer un pack revendeur --- */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;

    const resellerPack = await ResellerPack.findByPk(id);
    if (!resellerPack) {
      return NextResponse.json({ error: 'Pack revendeur introuvable' }, { status: 404 });
    }

    await resellerPack.destroy();
    return NextResponse.json({ success: true, message: 'Pack revendeur supprimé' });
  } catch (error) {
    console.error('[API/RESELLER-PACKS] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
