/**
 * ============================================
 * FEEL ME - API Route /api/orders/confirm
 * POST : Confirme le paiement d'une commande
 * 
 * FALLBACK si l'IPN PayTech n'a pas fonctionné.
 * Appelé par la page de succès après redirection.
 * Si la commande est encore en 'pending', la passe
 * en 'paid' et envoie les emails.
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await syncDatabase();
    const { ref } = await req.json();

    if (!ref) {
      return NextResponse.json({ error: 'Référence manquante' }, { status: 400 });
    }

    /* --- Retrouver la commande --- */
    const order = await Order.findOne({ where: { ref } });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 });
    }

    const orderData = order.toJSON();
    const currentStatus = (order as any).dataValues.status;

    /* --- Si la commande est encore en 'pending', la confirmer --- */
    /* Le client a été redirigé vers success_url = le paiement a réussi côté PayTech */
    if (currentStatus === 'pending') {
      await order.update({
        status: 'paid',
        paymentMethod: 'PayTech',
      });
      console.log(`[CONFIRM] Commande ${ref} confirmée via fallback (IPN manquant)`);

      /* --- Envoyer les emails --- */
      const updatedOrder = order.toJSON();
      try {
        await Promise.all([
          sendOrderConfirmationEmail(updatedOrder),
          sendAdminNotificationEmail(updatedOrder),
        ]);
        console.log(`[CONFIRM] Emails envoyés pour commande ${ref}`);
      } catch (emailError) {
        console.error(`[CONFIRM] Erreur emails pour ${ref}:`, emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Commande confirmée et emails envoyés',
        order: updatedOrder,
      });
    }

    /* --- Commande déjà payée (IPN a fonctionné) --- */
    if (currentStatus === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Commande déjà confirmée',
        order: orderData,
      });
    }

    /* --- Autre statut (annulée, etc.) --- */
    return NextResponse.json({
      success: true,
      message: `Commande en statut: ${currentStatus}`,
      order: orderData,
    });
  } catch (error) {
    console.error('[CONFIRM] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
