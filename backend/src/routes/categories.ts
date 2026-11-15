import { Router, Request, Response } from 'express';
import { Category, Product, syncDatabase } from '../models';
import { authenticateAdmin } from '../auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    await syncDatabase();
    const categories = await Category.findAll({
      include: [{ model: Product, as: 'products' }],
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, categories });
  } catch (error) {
    console.error('[API/CATEGORIES] GET error:', error);
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
    const { name, description, image } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Nom requis' });
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

    const category = await Category.create({
      name,
      slug,
      description: description || null,
      image: image || null,
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error('[API/CATEGORIES] POST error:', error);
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
    const { name, description, image } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({ error: 'Catégorie introuvable' });
      return;
    }

    const updateData: Record<string, any> = {};

    if (name) {
      updateData.name = name;
      updateData.slug = name
        .toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;

    await category.update(updateData);
    res.json({ success: true, category });
  } catch (error) {
    console.error('[API/CATEGORIES] PUT error:', error);
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

    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({ error: 'Catégorie introuvable' });
      return;
    }

    await category.destroy();
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('[API/CATEGORIES] DELETE error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
