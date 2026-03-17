/**
 * ============================================
 * FEEL ME - API Route /api/orders
 * GET  : Liste toutes les commandes (admin)
 * POST : Crée une nouvelle commande (public)
 *        et lance le paiement PayTech
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';
import { createPaymentRequest } from '@/lib/paytech';

/**
 * Génère une référence unique pour la commande
 * Format : FM-YYYYMMDD-XXXX (4 caractères aléatoires)
 */
function generateOrderRef(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FM-${date}-${random}`;
}

/* --- GET : Récupérer toutes les commandes (admin) --- */
export async function GET(req: NextRequest) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']],
    });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('[API/ORDERS] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- POST : Créer la commande (pending) puis lancer le paiement --- */
export async function POST(req: NextRequest) {
  try {
    await syncDatabase();
    const body = await req.json();
    const { firstName, lastName, phone, email, address, items, totalAmount } = body;

    /* --- Validation des champs obligatoires --- */
    if (!firstName || !lastName || !phone || !email || !address || !items || !totalAmount) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis : prénom, nom, téléphone, email, adresse, articles' },
        { status: 400 }
      );
    }

    /* --- Générer une référence unique --- */
    const ref = generateOrderRef();
    const total = parseInt(totalAmount);

    /* --- CRÉER la commande en statut 'pending' AVANT le paiement --- */
    /* Cela garantit que la commande est enregistrée même si l'IPN échoue */
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

    /* --- Lancer la demande de paiement PayTech --- */
    const itemNames = items.map((i: { name: string }) => i.name).join(', ');
    const paymentResponse = await createPaymentRequest({
      itemName: `Commande Feel Me - ${ref}`,
      itemPrice: total,
      refCommand: ref,
      commandName: `Feel Me: ${itemNames}`,
      customerEmail: email,
      customerPhone: phone,
      customerName: `${firstName} ${lastName}`,
      /* custom_field réduit : juste la ref, le reste est déjà en DB */
      orderData: { ref },
    });

    if (paymentResponse.success === 1 && paymentResponse.redirect_url) {
      /* --- Mettre à jour le token PayTech sur la commande --- */
      await order.update({ paymentToken: paymentResponse.token || null });

      return NextResponse.json({
        success: true,
        ref,
        paymentUrl: paymentResponse.redirect_url,
        paymentToken: paymentResponse.token,
      }, { status: 200 });
    } else {
      /* --- Erreur PayTech : la commande reste en pending --- */
      console.error('[API/ORDERS] PayTech error:', paymentResponse.message);
      return NextResponse.json({
        success: false,
        error: paymentResponse.message || 'Service de paiement temporairement indisponible. Veuillez réessayer.',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('[API/ORDERS] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
