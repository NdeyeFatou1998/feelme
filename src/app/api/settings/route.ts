/**
 * ============================================
 * FEEL ME - API Route /api/settings
 * GET  : Récupérer les paramètres entreprise (public)
 * PUT  : Modifier les paramètres (admin)
 * 
 * Un seul enregistrement en DB (singleton id=1).
 * Si aucun n'existe, on le crée avec les valeurs par défaut.
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Settings } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

/**
 * Récupère ou crée le singleton Settings (id=1)
 */
async function getOrCreateSettings() {
  let settings = await Settings.findByPk(1);
  if (!settings) {
    settings = await Settings.create({
      companyName: 'Feel Me',
      companyEmail: 'softechiris@gmail.com',
      companyPhone: '+221 77 000 00 00',
      companyAddress: 'Dakar, Sénégal',
      companyWebsite: 'www.feel-me.store',
    });
  }
  return settings;
}

/* --- GET : Récupérer les paramètres (public) --- */
export async function GET() {
  try {
    await syncDatabase();
    const settings = await getOrCreateSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[API/SETTINGS] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- PUT : Modifier les paramètres (admin) --- */
export async function PUT(req: NextRequest) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const body = await req.json();
    const settings = await getOrCreateSettings();

    /* --- Mettre à jour les champs fournis --- */
    const updateData: Record<string, string> = {};
    if (body.companyName !== undefined) updateData.companyName = body.companyName;
    if (body.companyEmail !== undefined) updateData.companyEmail = body.companyEmail;
    if (body.companyPhone !== undefined) updateData.companyPhone = body.companyPhone;
    if (body.companyAddress !== undefined) updateData.companyAddress = body.companyAddress;
    if (body.companyWebsite !== undefined) updateData.companyWebsite = body.companyWebsite;

    await settings.update(updateData);
    console.log('[API/SETTINGS] Paramètres mis à jour');

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[API/SETTINGS] PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
