/**
 * ============================================
 * FEEL ME - API Route /api/auth/login
 * Authentification admin par email/password
 * POST : { email, password } → { token }
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Admin } from '@/lib/models';
import { generateToken } from '@/lib/auth';
import { syncDatabase } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    await syncDatabase();

    const { email, password } = await req.json();

    /* --- Validation des champs --- */
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    /* --- Recherche de l'admin --- */
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    /* --- Récupération fiable via dataValues (les class fields Sequelize masquent les getters) --- */
    const adminData = (admin as any).dataValues;

    /* --- Vérification du mot de passe --- */
    const isValid = await bcrypt.compare(password, adminData.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    /* --- Génération du token JWT --- */
    const token = generateToken({
      adminId: adminData.id,
      email: adminData.email,
    });

    return NextResponse.json({
      success: true,
      token,
      admin: { id: adminData.id, email: adminData.email },
    });
  } catch (error) {
    console.error('[API/AUTH] Erreur login:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
