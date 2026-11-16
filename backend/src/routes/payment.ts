import { Router, Request, Response } from 'express';
import { Order, syncDatabase } from '../models';
import { verifyIPNSha256 } from '../paytech';
import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '../email';
import { syncOrderInBackground } from '../aja';

const router = Router();

router.post('/ipn', async (req: Request, res: Response) => {
  try {
    await syncDatabase();

    const body = req.body;
    console.log('[IPN] Notification reçue:', JSON.stringify(body));

    const {
      type_event,
      ref_command,
      payment_method,
      api_key_sha256,
      api_secret_sha256,
    } = body;

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

    if (type_event === 'sale_complete') {
      const order = await Order.findOne({ where: { ref: ref_command } });

      if (!order) {
        console.error(`[IPN] Commande ${ref_command} introuvable en DB`);
        res.status(404).json({ error: 'Commande introuvable' });
        return;
      }

      const orderStatus = (order as any).dataValues.status;

      if (orderStatus === 'paid') {
        console.log(`[IPN] Commande ${ref_command} déjà payée, skip`);
        res.json({ success: true, message: 'Déjà traitée' });
        return;
      }

      await order.update({
        status: 'paid',
        paymentMethod: payment_method || 'PayTech',
        paymentToken: body.token || null,
      });
      console.log(`[IPN] Commande ${ref_command} mise à jour → paid (${payment_method})`);
      syncOrderInBackground(order);

      const orderJson = order.toJSON();
      try {
        await Promise.all([
          sendOrderConfirmationEmail(orderJson),
          sendAdminNotificationEmail(orderJson),
        ]);
        console.log(`[IPN] Emails envoyés pour commande ${ref_command}`);
      } catch (emailError) {
        console.error(`[IPN] Erreur envoi emails pour ${ref_command}:`, emailError);
      }
    } else if (type_event === 'sale_canceled') {
      const order = await Order.findOne({ where: { ref: ref_command } });
      if (order) {
        await order.update({ status: 'cancelled' });
        console.log(`[IPN] Commande ${ref_command} annulée`);
        syncOrderInBackground(order);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[IPN] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
