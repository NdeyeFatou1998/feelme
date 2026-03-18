/**
 * ============================================
 * FEEL ME - API Route /api/admins
 * GET  : Lister tous les admins (admin)
 * POST : Créer un nouvel admin + envoyer mail
 *        avec mot de passe généré (admin)
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Admin } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { authenticateAdmin } from '@/lib/auth';
import { sendNewAdminEmail } from '@/lib/email';

/**
 * Génère un mot de passe aléatoire de 10 caractères
 * Mélange lettres majuscules, minuscules et chiffres
 */
function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/* --- GET : Lister les admins --- */
export async function GET(req: NextRequest) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const admins = await Admin.findAll({
      attributes: ['id', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    return NextResponse.json({ success: true, admins });
  } catch (error) {
    console.error('[API/ADMINS] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* --- POST : Créer un nouvel admin --- */
export async function POST(req: NextRequest) {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await syncDatabase();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    /* --- Vérifier si l'email existe déjà --- */
    const existing = await Admin.findOne({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Un admin avec cet email existe déjà' }, { status: 409 });
    }

    /* --- Générer un mot de passe aléatoire --- */
    const plainPassword = generatePassword(10);
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    /* --- Créer l'admin en base --- */
    const newAdmin = await Admin.create({
      email,
      password: hashedPassword,
    });
    console.log(`[ADMINS] Nouvel admin créé: ${email}`);

    /* --- Envoyer le mail avec les identifiants --- */
    try {
      await sendNewAdminEmail(email, plainPassword);
      console.log(`[ADMINS] Mail envoyé à ${email} avec mot de passe`);
    } catch (emailError) {
      console.error(`[ADMINS] Erreur envoi mail à ${email}:`, emailError);
    }

    return NextResponse.json({
      success: true,
      admin: { id: newAdmin.id, email: newAdmin.email },
      message: `Admin créé et mail envoyé à ${email}`,
    }, { status: 201 });
  } catch (error) {
    console.error('[API/ADMINS] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
