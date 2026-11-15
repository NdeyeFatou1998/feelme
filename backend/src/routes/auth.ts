import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Admin, syncDatabase } from '../models';
import { generateToken } from '../auth';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    await syncDatabase();

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email et mot de passe requis' });
      return;
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      res.status(401).json({ error: 'Identifiants incorrects' });
      return;
    }

    const adminData = (admin as any).dataValues;

    const isValid = await bcrypt.compare(password, adminData.password);
    if (!isValid) {
      res.status(401).json({ error: 'Identifiants incorrects' });
      return;
    }

    const token = generateToken({
      adminId: adminData.id,
      email: adminData.email,
    });

    res.json({
      success: true,
      token,
      admin: { id: adminData.id, email: adminData.email },
    });
  } catch (error) {
    console.error('[API/AUTH] Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
