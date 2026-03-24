/**
 * ============================================
 * FEEL ME - API Route /api/orders/[id]
 * GET    : Récupérer une commande par ID ou référence (public)
 * PUT    : Modifier une commande (admin)
 * DELETE : Supprimer une commande (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

/* --- GET : Récupérer une commande par ID ou référence --- */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncDatabase();
    const { id } = await params;

    let order = await Order.findByPk(id);
    
    if (!order && isNaN(Number(id))) {
      order = await Order.findOne({ where: { ref: id } });
    }
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('[API/ORDERS/ID] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- PUT : Modifier une commande (admin uniquement) --- */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = authenticateAdmin(req);
    if (!adminAuth) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;
    const body = await req.json();

    const order = await Order.findByPk(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande introuvable' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount;
    if (body.deposit !== undefined) updateData.deposit = body.deposit;
    if (body.remaining !== undefined) updateData.remaining = body.remaining;
    if (body.items !== undefined) updateData.items = body.items;

    await order.update(updateData);
    await order.reload();

    console.log(`[API/ORDERS/ID] Commande ${id} modifiée par admin ${adminAuth.email}`);

    return NextResponse.json({
      success: true,
      message: 'Commande modifiée avec succès',
      order: order.toJSON(),
    });
  } catch (error) {
    console.error('[API/ORDERS/ID] PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- DELETE : Supprimer une commande (admin uniquement) --- */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = authenticateAdmin(req);
    if (!adminAuth) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;

    const order = await Order.findByPk(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande introuvable' },
        { status: 404 }
      );
    }

    const orderRef = (order as any).ref;
    await order.destroy();

    console.log(`[API/ORDERS/ID] Commande ${orderRef} supprimée par admin ${adminAuth.email}`);

    return NextResponse.json({
      success: true,
      message: 'Commande supprimée avec succès',
    });
  } catch (error) {
    console.error('[API/ORDERS/ID] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
