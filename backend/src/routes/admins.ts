import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Admin, syncDatabase } from '../models';
import { authenticateAdmin } from '../auth';
import { sendNewAdminEmail } from '../email';

const router = Router();

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const admins = await Admin.findAll({
      attributes: ['id', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, admins });
  } catch (error) {
    console.error('[API/ADMINS] GET error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email requis' });
      return;
    }

    const existing = await Admin.findOne({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Un admin avec cet email existe déjà' });
      return;
    }

    const plainPassword = generatePassword(10);
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const newAdmin = await Admin.create({
      email,
      password: hashedPassword,
    });
    console.log(`[ADMINS] Nouvel admin créé: ${email}`);

    try {
      await sendNewAdminEmail(email, plainPassword);
      console.log(`[ADMINS] Mail envoyé à ${email} avec mot de passe`);
    } catch (emailError) {
      console.error(`[ADMINS] Erreur envoi mail à ${email}:`, emailError);
    }

    res.status(201).json({
      success: true,
      admin: { id: newAdmin.id, email: newAdmin.email },
      message: `Admin créé et mail envoyé à ${email}`,
    });
  } catch (error) {
    console.error('[API/ADMINS] POST error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/password', async (req: Request, res: Response) => {
  try {
    const adminPayload = authenticateAdmin(req);
    if (!adminPayload) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Ancien et nouveau mot de passe requis' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({
        error: 'Le nouveau mot de passe doit faire au moins 6 caractères',
      });
      return;
    }

    const admin = await Admin.findByPk(adminPayload.adminId);
    if (!admin) {
      res.status(404).json({ error: 'Admin introuvable' });
      return;
    }

    const adminData = (admin as any).dataValues;
    const isValid = await bcrypt.compare(currentPassword, adminData.password);
    if (!isValid) {
      res.status(403).json({ error: 'Ancien mot de passe incorrect' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await admin.update({ password: hashedPassword });
    console.log(`[ADMINS] Mot de passe changé pour admin ${adminPayload.email}`);

    res.json({ success: true, message: 'Mot de passe changé avec succès' });
  } catch (error) {
    console.error('[API/ADMINS/PASSWORD] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
