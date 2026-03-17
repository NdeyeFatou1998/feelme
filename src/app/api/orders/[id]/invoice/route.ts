/**
 * ============================================
 * FEEL ME - API Route /api/orders/[id]/invoice
 * GET : Télécharge la facture PDF d'une commande
 * 
 * Accessible depuis le dashboard admin.
 * Génère le PDF à la volée via PDFKit.
 * Retourne le fichier avec Content-Disposition: attachment.
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';
import { generateInvoicePDF } from '@/lib/invoice';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    /* --- Vérifier l'authentification admin --- */
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { id } = await params;

    /* --- Retrouver la commande par ID ou référence --- */
    let order = await Order.findByPk(id);
    if (!order && isNaN(Number(id))) {
      order = await Order.findOne({ where: { ref: id } });
    }

    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    /* --- Générer le PDF --- */
    const orderData = order.toJSON();
    const pdfBuffer = await generateInvoicePDF(orderData);

    /* --- Retourner le PDF en téléchargement (Uint8Array pour compatibilité TS) --- */
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Facture-${orderData.ref}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('[API/INVOICE] Erreur:', error);
    return NextResponse.json({ error: 'Erreur génération facture' }, { status: 500 });
  }
}
