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

    /* --- Lire le body en toute sécurité --- */
    let ref: string | null = null;
    try {
      const body = await req.json();
      ref = body.ref || null;
    } catch (parseError) {
      console.error('[CONFIRM] Erreur parsing body:', parseError);
    }

    if (!ref) {
      return NextResponse.json({ error: 'Référence manquante' }, { status: 400 });
    }

    console.log(`[CONFIRM] Tentative de confirmation pour ref: ${ref}`);

    /* --- Retrouver la commande --- */
    const order = await Order.findOne({ where: { ref } });
    if (!order) {
      console.error(`[CONFIRM] Commande ${ref} introuvable`);
      return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 });
    }

    const currentStatus = (order as any).dataValues.status;
    console.log(`[CONFIRM] Commande ${ref} trouvée, statut actuel: ${currentStatus}`);

    /* --- Si la commande est encore en 'pending', la confirmer --- */
    /* Le client a été redirigé vers success_url = le paiement a réussi côté PayTech */
    if (currentStatus === 'pending') {
      /* Ne pas écraser paymentMethod si déjà renseigné par l'IPN */
      const currentMethod = (order as any).dataValues.payment_method || (order as any).dataValues.paymentMethod;
      await order.update({
        status: 'paid',
        ...(currentMethod ? {} : { paymentMethod: 'Paiement en ligne' }),
      });
      console.log(`[CONFIRM] ✅ Commande ${ref} confirmée → paid (canal: ${currentMethod || 'Paiement en ligne'})`);

      /* Recharger la commande après update pour avoir les bonnes données */
      await order.reload();
      const updatedOrder = order.toJSON();

      /* --- Envoyer les emails --- */
      try {
        await Promise.all([
          sendOrderConfirmationEmail(updatedOrder),
          sendAdminNotificationEmail(updatedOrder),
        ]);
        console.log(`[CONFIRM] Emails envoyés pour commande ${ref}`);
      } catch (emailError) {
        /* Ne pas bloquer la confirmation si l'email échoue */
        console.error(`[CONFIRM] Erreur emails pour ${ref}:`, emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Commande confirmée et emails envoyés',
        order: updatedOrder,
      });
    }

    /* --- Commande déjà payée (IPN a fonctionné avant) --- */
    if (currentStatus === 'paid' || currentStatus === 'shipped' || currentStatus === 'delivered') {
      const orderData = order.toJSON();
      console.log(`[CONFIRM] Commande ${ref} déjà en statut '${currentStatus}', pas de changement`);
      return NextResponse.json({
        success: true,
        message: 'Commande déjà confirmée',
        order: orderData,
      });
    }

    /* --- Autre statut (annulée, etc.) --- */
    const orderData = order.toJSON();
    console.log(`[CONFIRM] Commande ${ref} en statut '${currentStatus}', pas de changement`);
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
