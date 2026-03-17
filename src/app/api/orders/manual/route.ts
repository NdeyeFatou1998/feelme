/**
 * ============================================
 * FEEL ME - API Route /api/orders/manual
 * POST : Créer une commande manuelle (admin)
 * 
 * Permet à l'admin d'enregistrer des commandes
 * reçues en dehors du site (WhatsApp, téléphone, etc.)
 * avec acompte, restant dû, et mode de réception.
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    /* --- Vérifier l'authentification admin --- */
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const body = await req.json();

    /* --- Validation des champs obligatoires --- */
    const { firstName, lastName, phone, items, totalAmount, paymentMethod } = body;
    if (!firstName || !lastName || !phone || !items || !totalAmount) {
      return NextResponse.json(
        { error: 'Champs obligatoires : firstName, lastName, phone, items, totalAmount' },
        { status: 400 }
      );
    }

    /* --- Générer une référence unique pour la commande manuelle --- */
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ref = `FM-M-${dateStr}-${random}`;

    /* --- Calculer acompte et restant --- */
    const deposit = Number(body.deposit) || 0;
    const remaining = Math.max(0, Number(totalAmount) - deposit);

    /* --- Créer la commande en base --- */
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

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    console.error('[ORDERS/MANUAL] Erreur:', error);
    return NextResponse.json({ error: 'Erreur création commande manuelle' }, { status: 500 });
  }
}
