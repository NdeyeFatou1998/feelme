import { Router, Request, Response } from 'express';
import { Pack, syncDatabase } from '../models';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    await syncDatabase();

    const existing = await Pack.findOne({ where: { slug: 'pack-1x3ml-et-1x6ml' } });
    if (existing) {
      await existing.update({ price: 5500 });
      res.json({
        success: true,
        message: 'Pack existait déjà, prix corrigé à 5500',
        pack: existing.toJSON(),
      });
      return;
    }

    const pack = await Pack.create({
      name: 'Pack 1x3ml et 1x6ml',
      slug: 'pack-1x3ml-et-1x6ml',
      description: 'Un flacon 3ml et un flacon 6ml de votre choix',
      price: 5500,
      promoPrice: null,
      image: '/images/pack1x3et1x6.jpeg',
      items: [
        { productId: 0, productName: 'Parfum 3ml au choix', quantity: 1 },
        { productId: 0, productName: 'Parfum 6ml au choix', quantity: 1 },
      ],
      isActive: true,
    });

    console.log(`[FIX] Pack créé: ${pack.name} à ${pack.price} FCFA`);

    res.json({
      success: true,
      message: 'Pack créé avec succès à 5500 FCFA',
      pack: pack.toJSON(),
    });
  } catch (error) {
    console.error('[FIX] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur', details: String(error) });
  }
});

export default router;
