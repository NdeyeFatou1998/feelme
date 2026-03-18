/**
 * ============================================
 * FEEL ME - API Route /api/admins/password
 * PUT : Changer son propre mot de passe (admin)
 * 
 * Requiert : ancien mot de passe + nouveau mot de passe
 * L'admin est identifié via le token JWT.
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Admin } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    /* --- Vérifier l'authentification --- */
    const adminPayload = authenticateAdmin(req);
    if (!adminPayload) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { currentPassword, newPassword } = await req.json();

    /* --- Validation --- */
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Ancien et nouveau mot de passe requis' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' }, { status: 400 });
    }

    /* --- Retrouver l'admin en base --- */
    const admin = await Admin.findByPk(adminPayload.adminId);
    if (!admin) {
      return NextResponse.json({ error: 'Admin introuvable' }, { status: 404 });
    }

    /* --- Vérifier l'ancien mot de passe --- */
    const adminData = (admin as any).dataValues;
    const isValid = await bcrypt.compare(currentPassword, adminData.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Ancien mot de passe incorrect' }, { status: 403 });
    }

    /* --- Hasher et sauvegarder le nouveau mot de passe --- */
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await admin.update({ password: hashedPassword });
    console.log(`[ADMINS] Mot de passe changé pour admin ${adminPayload.email}`);

    return NextResponse.json({ success: true, message: 'Mot de passe changé avec succès' });
  } catch (error) {
    console.error('[API/ADMINS/PASSWORD] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
