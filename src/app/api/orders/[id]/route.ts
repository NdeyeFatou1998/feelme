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

    // Essayer de trouver par ID numérique d'abord
    let order = await Order.findByPk(id);
    
    // Si pas trouvé et que ce n'est pas un nombre, chercher par référence
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
