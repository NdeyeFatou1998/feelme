/**
 * ============================================
 * FEEL ME - API Route /api/payment/ipn
 * Endpoint IPN (Instant Payment Notification)
 * Reçoit les notifications de PayTech après paiement
 * POST : Notification de paiement PayTech
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
      item_price,
      payment_method,
      client_phone,
      api_key_sha256,
      api_secret_sha256,
      custom_field,
    } = body;

    /* --- Vérification de l'authenticité (SHA256) --- */
    if (api_key_sha256 && api_secret_sha256) {
      const isValid = verifyIPNSha256(api_key_sha256, api_secret_sha256);
      if (!isValid) {
        console.error('[IPN] Vérification SHA256 échouée');
        return NextResponse.json({ error: 'Vérification échouée' }, { status: 403 });
      }
    }

    /* --- Traiter selon le type d'événement --- */
    if (type_event === 'sale_complete') {
      /* --- Paiement réussi : CRÉER la commande maintenant --- */
      
      // Récupérer les données de commande depuis custom_field
      let orderData;
      try {
        orderData = JSON.parse(custom_field);
      } catch (e) {
        console.error('[IPN] Erreur parsing custom_field:', e);
        return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
      }

      // Vérifier si la commande existe déjà
      const existingOrder = await Order.findOne({ where: { ref: ref_command } });
      if (existingOrder) {
        console.log(`[IPN] Commande ${ref_command} existe déjà`);
        return NextResponse.json({ success: true, message: 'Commande déjà traitée' });
      }

      // Créer la commande avec statut 'paid'
      const order = await Order.create({
        ref: orderData.ref || ref_command,
        firstName: orderData.firstName,
        lastName: orderData.lastName,
        phone: orderData.phone,
        email: orderData.email,
        address: orderData.address,
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        status: 'paid',
        paymentMethod: payment_method || 'PayTech',
        paymentToken: body.token || null,
      });

      console.log(`[IPN] Commande ${ref_command} créée et payée via ${payment_method}`);

      /* --- Envoyer les emails (confirmation client + notification admin) --- */
      const orderJson = order.toJSON();
      await Promise.all([
        sendOrderConfirmationEmail(orderJson),
        sendAdminNotificationEmail(orderJson),
      ]);

      console.log(`[IPN] Emails envoyés pour commande ${ref_command}`);
    } else if (type_event === 'sale_canceled') {
      /* --- Paiement annulé : ne rien créer --- */
      console.log(`[IPN] Paiement ${ref_command} annulé - aucune commande créée`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[IPN] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
