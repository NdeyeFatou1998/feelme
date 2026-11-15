import { Router, Request, Response } from 'express';
import { ResellerPack, Product, syncDatabase } from '../models';
import { authenticateAdmin } from '../auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    console.log('[API/RESELLER-PACKS] GET - Début');
    await syncDatabase();
    console.log('[API/RESELLER-PACKS] GET - DB synced');
    const resellerPacks = await ResellerPack.findAll({
      order: [['createdAt', 'DESC']],
    });
    console.log('[API/RESELLER-PACKS] GET - Found', resellerPacks.length, 'packs');
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.json({ success: true, resellerPacks });
  } catch (error) {
    console.error('[API/RESELLER-PACKS] GET error:', error);
    console.error(
      '[API/RESELLER-PACKS] Error stack:',
      error instanceof Error ? error.stack : 'No stack'
    );
    res.status(500).json({
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
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
    const { name, description, discountType, discountValue, image, items } = req.body;

    if (!name || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Nom et articles requis' });
      return;
    }

    let totalNormalPrice = 0;

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        const productPrice = product.promoPrice || product.price;
        totalNormalPrice += productPrice * item.quantity;
      }
    }

    const finalDiscountType = discountType || 'percentage';
    const finalDiscountValue = parseInt(discountValue) || 20;
    let resellerPrice = 0;

    if (finalDiscountType === 'percentage') {
      resellerPrice = Math.round(totalNormalPrice * (1 - finalDiscountValue / 100));
    } else {
      resellerPrice = totalNormalPrice - finalDiscountValue;
    }

    const profit = totalNormalPrice - resellerPrice;

    const slug = name
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingSlug = await ResellerPack.findOne({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const resellerPack = await ResellerPack.create({
      name,
      slug: finalSlug,
      description: description || null,
      normalPrice: totalNormalPrice,
      resellerPrice,
      profit,
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
      image: image || null,
      items,
      isActive: true,
    });

    res.status(201).json({ success: true, resellerPack });
  } catch (error) {
    console.error('[API/RESELLER-PACKS] POST error:', error);
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

    const resellerPack = await ResellerPack.findByPk(id);
    if (!resellerPack) {
      res.status(404).json({ error: 'Pack revendeur introuvable' });
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
    if (body.image !== undefined) updateData.image = body.image;
    if (body.items !== undefined) updateData.items = body.items;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const items = body.items || resellerPack.items;
    let totalNormalPrice = 0;

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        const productPrice = product.promoPrice || product.price;
        totalNormalPrice += productPrice * item.quantity;
      }
    }

    const finalDiscountType = body.discountType || resellerPack.discountType || 'percentage';
    const finalDiscountValue = parseInt(body.discountValue) || resellerPack.discountValue || 20;
    let resellerPrice = 0;

    if (finalDiscountType === 'percentage') {
      resellerPrice = Math.round(totalNormalPrice * (1 - finalDiscountValue / 100));
    } else {
      resellerPrice = totalNormalPrice - finalDiscountValue;
    }

    const profit = totalNormalPrice - resellerPrice;

    updateData.normalPrice = totalNormalPrice;
    updateData.resellerPrice = resellerPrice;
    updateData.profit = profit;
    updateData.discountType = finalDiscountType;
    updateData.discountValue = finalDiscountValue;

    await resellerPack.update(updateData);
    res.json({ success: true, resellerPack });
  } catch (error) {
    console.error('[API/RESELLER-PACKS] PUT error:', error);
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

    const resellerPack = await ResellerPack.findByPk(id);
    if (!resellerPack) {
      res.status(404).json({ error: 'Pack revendeur introuvable' });
      return;
    }

    await resellerPack.destroy();
    res.json({ success: true, message: 'Pack revendeur supprimé' });
  } catch (error) {
    console.error('[API/RESELLER-PACKS] DELETE error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
