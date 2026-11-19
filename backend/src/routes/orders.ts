import { Router, Request, Response } from 'express';
import { Order, Settings, syncDatabase } from '../models';
import { authenticateAdmin } from '../auth';
import { createPaymentRequest } from '../paytech';
import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '../email';
import { generateInvoicePDF, CompanyInfo, DEFAULT_COMPANY } from '../invoice';

const router = Router();

function generateOrderRef(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FM-${date}-${random}`;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('[API/ORDERS] GET error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    await syncDatabase();
    const { firstName, lastName, phone, email, address, items, totalAmount } = req.body;

    if (!firstName || !lastName || !phone || !email || !address || !items || !totalAmount) {
      res.status(400).json({
        error:
          'Tous les champs sont requis : prénom, nom, téléphone, email, adresse, articles',
      });
      return;
    }

    const ref = generateOrderRef();
    const total = parseInt(totalAmount);

    const order = await Order.create({
      ref,
      firstName,
      lastName,
      phone,
      email,
      address,
      items,
      totalAmount: total,
      status: 'pending',
      paymentMethod: null,
      paymentToken: null,
    });
    console.log(`[API/ORDERS] Commande ${ref} créée en statut pending`);

    const itemNames = items.map((i: { name: string }) => i.name).join(', ');
    const paymentResponse = await createPaymentRequest({
      itemName: `Commande Feel Me - ${ref}`,
      itemPrice: total,
      refCommand: ref,
      commandName: `Feel Me: ${itemNames}`,
      customerEmail: email,
      customerPhone: phone,
      customerName: `${firstName} ${lastName}`,
      orderData: { ref },
    });

    if (paymentResponse.success === 1 && paymentResponse.redirect_url) {
      await order.update({ paymentToken: paymentResponse.token || null });

      res.status(200).json({
        success: true,
        ref,
        paymentUrl: paymentResponse.redirect_url,
        paymentToken: paymentResponse.token,
      });
    } else {
      console.error('[API/ORDERS] PayTech error:', paymentResponse.message);
      res.status(503).json({
        success: false,
        error:
          paymentResponse.message ||
          'Service de paiement temporairement indisponible. Veuillez réessayer.',
      });
    }
  } catch (error) {
    console.error('[API/ORDERS] POST error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/manual', async (req: Request, res: Response) => {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const body = req.body;

    const { firstName, lastName, phone, items, totalAmount, paymentMethod } = body;
    if (!firstName || !lastName || !phone || !items || !totalAmount) {
      res.status(400).json({
        error: 'Champs obligatoires : firstName, lastName, phone, items, totalAmount',
      });
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ref = `FM-M-${dateStr}-${random}`;

    const deposit = Number(body.deposit) || 0;
    const remaining = Math.max(0, Number(totalAmount) - deposit);

    const order = await Order.create({
      ref,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: body.email?.trim() || 'non-fourni@manual.fm',
      address: body.address?.trim() || 'Non précisée',
      items: Array.isArray(items) ? items : [],
      totalAmount: Number(totalAmount),
      deposit,
      remaining,
      source: 'manual',
      notes: body.notes?.trim() || null,
      status: deposit >= Number(totalAmount) ? 'paid' : 'pending',
      paymentMethod: paymentMethod?.trim() || 'Espèces',
      paymentToken: null,
    });

    console.log(`[ORDERS/MANUAL] Commande manuelle créée : ${ref} par admin`);

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('[ORDERS/MANUAL] Erreur:', error);
    res.status(500).json({ error: 'Erreur création commande manuelle' });
  }
});

router.post('/confirm', async (req: Request, res: Response) => {
  try {
    await syncDatabase();

    let ref: string | null = null;
    try {
      ref = req.body?.ref || null;
    } catch (parseError) {
      console.error('[CONFIRM] Erreur parsing body:', parseError);
    }

    if (!ref) {
      res.status(400).json({ error: 'Référence manquante' });
      return;
    }

    console.log(`[CONFIRM] Tentative de confirmation pour ref: ${ref}`);

    const order = await Order.findOne({ where: { ref } });
    if (!order) {
      console.error(`[CONFIRM] Commande ${ref} introuvable`);
      res.status(404).json({ success: false, error: 'Commande introuvable' });
      return;
    }

    const currentStatus = (order as any).dataValues.status;
    console.log(`[CONFIRM] Commande ${ref} trouvée, statut actuel: ${currentStatus}`);

    if (currentStatus === 'pending') {
      const currentMethod =
        (order as any).dataValues.payment_method || (order as any).dataValues.paymentMethod;
      await order.update({
        status: 'paid',
        ...(currentMethod ? {} : { paymentMethod: 'Paiement en ligne' }),
      });
      console.log(
        `[CONFIRM] ✅ Commande ${ref} confirmée → paid (canal: ${currentMethod || 'Paiement en ligne'})`
      );

      await order.reload();
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

      res.json({
        success: true,
        message: 'Commande confirmée et emails envoyés',
        order: updatedOrder,
      });
      return;
    }

    if (
      currentStatus === 'paid' ||
      currentStatus === 'shipped' ||
      currentStatus === 'delivered'
    ) {
      const orderData = order.toJSON();
      console.log(
        `[CONFIRM] Commande ${ref} déjà en statut '${currentStatus}', pas de changement`
      );
      res.json({
        success: true,
        message: 'Commande déjà confirmée',
        order: orderData,
      });
      return;
    }

    const orderData = order.toJSON();
    console.log(`[CONFIRM] Commande ${ref} en statut '${currentStatus}', pas de changement`);
    res.json({
      success: true,
      message: `Commande en statut: ${currentStatus}`,
      order: orderData,
    });
  } catch (error) {
    console.error('[CONFIRM] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id/invoice', async (req: Request, res: Response) => {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const id = String(req.params.id);

    let order = await Order.findByPk(id);
    if (!order && isNaN(Number(id))) {
      order = await Order.findOne({ where: { ref: id } });
    }

    if (!order) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    let companyInfo: CompanyInfo = DEFAULT_COMPANY;
    try {
      const settings = await Settings.findByPk(1);
      if (settings) {
        const s = settings.toJSON();
        companyInfo = {
          companyName: s.companyName || DEFAULT_COMPANY.companyName,
          companyEmail: s.companyEmail || DEFAULT_COMPANY.companyEmail,
          companyPhone: s.companyPhone || DEFAULT_COMPANY.companyPhone,
          companyAddress: s.companyAddress || DEFAULT_COMPANY.companyAddress,
          companyWebsite: s.companyWebsite || DEFAULT_COMPANY.companyWebsite,
        };
      }
    } catch (e) {
      console.warn('[API/INVOICE] Settings non chargées, valeurs par défaut');
    }

    const orderData = order.toJSON();
    const pdfBuffer = await generateInvoicePDF(orderData, companyInfo);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Facture-${orderData.ref}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[API/INVOICE] Erreur:', error);
    res.status(500).json({ error: 'Erreur génération facture' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    await syncDatabase();
    const id = String(req.params.id);

    let order = await Order.findByPk(id);

    if (!order && isNaN(Number(id))) {
      order = await Order.findOne({ where: { ref: id } });
    }

    if (!order) {
      res.status(404).json({ success: false, error: 'Commande introuvable' });
      return;
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('[API/ORDERS/ID] GET error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const adminAuth = authenticateAdmin(req);
    if (!adminAuth) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const id = String(req.params.id);
    const body = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Commande introuvable' });
      return;
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

    res.json({
      success: true,
      message: 'Commande modifiée avec succès',
      order: order.toJSON(),
    });
  } catch (error) {
    console.error('[API/ORDERS/ID] PUT error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const adminAuth = authenticateAdmin(req);
    if (!adminAuth) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const id = String(req.params.id);

    const order = await Order.findByPk(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Commande introuvable' });
      return;
    }

    const orderRef = (order as any).ref;
    await order.destroy();

    console.log(`[API/ORDERS/ID] Commande ${orderRef} supprimée par admin ${adminAuth.email}`);

    res.json({
      success: true,
      message: 'Commande supprimée avec succès',
    });
  } catch (error) {
    console.error('[API/ORDERS/ID] DELETE error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
