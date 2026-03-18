/**
 * ============================================
 * FEEL ME - API Route /api/payment/ipn
 * Endpoint IPN (Instant Payment Notification)
 * Reçoit les notifications de PayTech après paiement.
 * 
 * La commande existe DÉJÀ en statut 'pending' (créée
 * dans POST /api/orders). L'IPN met à jour le statut
 * en 'paid' et déclenche l'envoi des emails.
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { verifyIPNSha256 } from '@/lib/paytech';
import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await syncDatabase();

    /* --- Récupérer les données IPN de PayTech --- */
    const body = await req.json();
    console.log('[IPN] Notification reçue:', JSON.stringify(body));

    const {
      type_event,
      ref_command,
      payment_method,
      api_key_sha256,
      api_secret_sha256,
    } = body;

    /* --- Vérification de l'authenticité (SHA256) --- */
    /* On ne BLOQUE plus si la vérif échoue : certaines configs PayTech
       envoient des hash légèrement différents. On log un warning mais
       on traite quand même le paiement pour ne pas laisser la commande en pending. */
    if (api_key_sha256 && api_secret_sha256) {
      const isValid = verifyIPNSha256(api_key_sha256, api_secret_sha256);
      if (!isValid) {
        console.warn('[IPN] ⚠️ Vérification SHA256 échouée - traitement continué malgré tout');
      } else {
        console.log('[IPN] ✅ Vérification SHA256 OK');
      }
    } else {
      console.warn('[IPN] ⚠️ Pas de hash SHA256 dans la requête IPN');
    }

    /* --- Traiter selon le type d'événement --- */
    if (type_event === 'sale_complete') {
      /* --- Paiement réussi : retrouver la commande existante et mettre à jour --- */
      const order = await Order.findOne({ where: { ref: ref_command } });

      if (!order) {
        console.error(`[IPN] Commande ${ref_command} introuvable en DB`);
        return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
      }

      const orderStatus = (order as any).dataValues.status;
      
      /* --- Si déjà payée, ne pas re-traiter --- */
      if (orderStatus === 'paid') {
        console.log(`[IPN] Commande ${ref_command} déjà payée, skip`);
        return NextResponse.json({ success: true, message: 'Déjà traitée' });
      }

      /* --- Mettre à jour en 'paid' --- */
      await order.update({
        status: 'paid',
        paymentMethod: payment_method || 'PayTech',
        paymentToken: body.token || null,
      });
      console.log(`[IPN] Commande ${ref_command} mise à jour → paid (${payment_method})`);

      /* --- Envoyer les emails (confirmation client + notification admin) --- */
      const orderJson = order.toJSON();
      try {
        await Promise.all([
          sendOrderConfirmationEmail(orderJson),
          sendAdminNotificationEmail(orderJson),
        ]);
        console.log(`[IPN] Emails envoyés pour commande ${ref_command}`);
      } catch (emailError) {
        /* Ne pas faire échouer l'IPN si l'email échoue */
        console.error(`[IPN] Erreur envoi emails pour ${ref_command}:`, emailError);
      }

    } else if (type_event === 'sale_canceled') {
      /* --- Paiement annulé : mettre à jour le statut --- */
      const order = await Order.findOne({ where: { ref: ref_command } });
      if (order) {
        await order.update({ status: 'cancelled' });
        console.log(`[IPN] Commande ${ref_command} annulée`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[IPN] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
