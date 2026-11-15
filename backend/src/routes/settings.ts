import { Router, Request, Response } from 'express';
import { Settings, syncDatabase } from '../models';
import { authenticateAdmin } from '../auth';

const router = Router();

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

router.get('/', async (_req: Request, res: Response) => {
  try {
    await syncDatabase();
    const settings = await getOrCreateSettings();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('[API/SETTINGS] GET error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const body = req.body;
    const settings = await getOrCreateSettings();

    const updateData: Record<string, string> = {};
    if (body.companyName !== undefined) updateData.companyName = body.companyName;
    if (body.companyEmail !== undefined) updateData.companyEmail = body.companyEmail;
    if (body.companyPhone !== undefined) updateData.companyPhone = body.companyPhone;
    if (body.companyAddress !== undefined) updateData.companyAddress = body.companyAddress;
    if (body.companyWebsite !== undefined) updateData.companyWebsite = body.companyWebsite;

    await settings.update(updateData);
    console.log('[API/SETTINGS] Paramètres mis à jour');

    res.json({ success: true, settings });
  } catch (error) {
    console.error('[API/SETTINGS] PUT error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
