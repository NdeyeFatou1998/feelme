import { Router, Request, Response } from 'express';
import { Product, Category, syncDatabase } from '../models';
import { authenticateAdmin } from '../auth';
import { productChanged } from '../aja';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    await syncDatabase();
    const products = await Product.findAll({
      include: [{ model: Category, as: 'category' }],
      order: [['createdAt', 'DESC']],
    });
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.json({ success: true, products });
  } catch (error) {
    console.error('[API/PRODUCTS] GET error:', error);
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
    const { name, description, price, promoPrice, image, categoryId, volume, stock } = req.body;

    if (!name || !price || !categoryId) {
      res.status(400).json({ error: 'Nom, prix et catégorie requis' });
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

    const existingSlug = await Product.findOne({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const product = await Product.create({
      name,
      slug: finalSlug,
      description: description || null,
      price: parseInt(price),
      promoPrice: promoPrice ? parseInt(promoPrice) : null,
      image: image || null,
      categoryId: parseInt(categoryId),
      volume: volume || null,
      stock: stock ? parseInt(stock) : 100,
      isActive: true,
    });

    productChanged(product.get('id') as number);
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('[API/PRODUCTS] POST error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    await syncDatabase();
    const id = String(req.params.id);

    const product = await Product.findByPk(id, {
      include: [{ model: Category, as: 'category' }],
    });

    if (!product) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('[API/PRODUCTS] GET by id error:', error);
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

    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ error: 'Produit introuvable' });
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
    if (body.categoryId !== undefined) updateData.categoryId = parseInt(body.categoryId);
    if (body.volume !== undefined) updateData.volume = body.volume;
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    await product.update(updateData);
    productChanged(id);
    res.json({ success: true, product });
  } catch (error) {
    console.error('[API/PRODUCTS] PUT error:', error);
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

    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }

    await product.destroy();
    productChanged(id);
    res.json({ success: true, message: 'Produit supprimé' });
  } catch (error) {
    console.error('[API/PRODUCTS] DELETE error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
