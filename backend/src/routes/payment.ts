import { Router, Request, Response } from 'express';
import { Order, syncDatabase } from '../models';
import { isAuthenticIpn } from '../paytech';
import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '../email';
import { orderChanged } from '../aja';
import { updateStock } from '../stock';
import { paymentDetailsFromIpn } from '../paymentDetails';

const router = Router();

router.post('/ipn', async (req: Request, res: Response) => {
  try {
    await syncDatabase();

    const body = (req.body ?? {}) as Record<string, unknown>;
    const { type_event, ref_command, payment_method } = body as Record<string, any>;
    console.log(`[IPN] Notification reçue : ${type_event ?? '?'} pour ${ref_command ?? '?'} (${payment_method ?? '-'})`);

    /* Seul PayTech peut passer une commande en payée : une notification non signée est refusée. */
    const auth = isAuthenticIpn(body);
    if (!auth.ok) {
      console.warn(`[IPN] ⛔ Notification refusée pour ${ref_command ?? '?'} : ${auth.how}`);
      res.status(401).json({ error: 'Notification non authentifiée' });
      return;
    }
    console.log(`[IPN] ✅ Signature PayTech vérifiée (${auth.how})`);

    if (type_event === 'sale_complete') {
      const order = await Order.findOne({ where: { ref: ref_command } });

      if (!order) {
        console.error(`[IPN] Commande ${ref_command} introuvable en DB`);
        res.status(404).json({ error: 'Commande introuvable' });
        return;
      }

      const orderStatus = (order as any).dataValues.status;

      if (orderStatus === 'paid' || orderStatus === 'shipped' || orderStatus === 'delivered') {
        /* Le retour du client sur /commande/succes arrive souvent avant l'IPN : la commande est
           déjà payée, mais en « Paiement en ligne ». On garde le vrai moyen (Wave, Orange Money…). */
        const details = paymentDetailsFromIpn(order.get({ plain: true }) as any, payment_method, body.token);
        if (details) {
          await order.update(details);
          orderChanged(order);
          console.log(`[IPN] Commande ${ref_command} déjà payée, moyen de paiement enregistré : ${details.paymentMethod ?? '-'}`);
        } else {
          console.log(`[IPN] Commande ${ref_command} déjà payée, skip`);
        }
        res.json({ success: true, message: 'Déjà traitée' });
        return;
      }

      await order.update({
        status: 'paid',
        paymentMethod: payment_method || 'PayTech',
        paymentToken: typeof body.token === 'string' && body.token ? body.token : null,
      });
      console.log(`[IPN] Commande ${ref_command} mise à jour → paid (${payment_method})`);
      orderChanged(order);
      updateStock(order.get('id') as number);

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
        orderChanged(order);
        updateStock(order.get('id') as number);
        console.log(`[IPN] Commande ${ref_command} annulée`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[IPN] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
