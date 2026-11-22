import { Router, Request, Response } from 'express';
import { Pack, syncDatabase } from '../models';
import { authenticateAdmin } from '../auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    await syncDatabase();
    const packs = await Pack.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.json({ success: true, packs });
  } catch (error) {
    console.error('[API/PACKS] GET error:', error);
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
    const { name, description, price, promoPrice, image, items } = req.body;

    if (!name || !price || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Nom, prix et articles requis' });
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingSlug = await Pack.findOne({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const pack = await Pack.create({
      name,
      slug: finalSlug,
      description: description || null,
      price: parseInt(price),
      promoPrice: promoPrice ? parseInt(promoPrice) : null,
      image: image || null,
      items,
      isActive: true,
    });

    res.status(201).json({ success: true, pack });
  } catch (error) {
    console.error('[API/PACKS] POST error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const id = String(req.params.id);
    const body = req.body;

    const pack = await Pack.findByPk(id);
    if (!pack) {
      res.status(404).json({ error: 'Pack introuvable' });
      return;
    }

    const updateData: Record<string, any> = {};

    if (body.name) {
      updateData.name = body.name;
      updateData.slug = body.name
        .toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = parseInt(body.price);
    if (body.promoPrice !== undefined)
      updateData.promoPrice = body.promoPrice ? parseInt(body.promoPrice) : null;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.items !== undefined) updateData.items = body.items;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    await pack.update(updateData);
    res.json({ success: true, pack });
  } catch (error) {
    console.error('[API/PACKS] PUT error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const admin = authenticateAdmin(req);
    if (!admin) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    await syncDatabase();
    const id = String(req.params.id);

    const pack = await Pack.findByPk(id);
    if (!pack) {
      res.status(404).json({ error: 'Pack introuvable' });
      return;
    }

    await pack.destroy();
    res.json({ success: true, message: 'Pack supprimé' });
  } catch (error) {
    console.error('[API/PACKS] DELETE error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
