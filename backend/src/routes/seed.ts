import { Router, Request, Response } from 'express';
import { seed } from '../seed';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    await seed();
    res.json({
      success: true,
      message: 'Base de données initialisée avec succès !',
    });
  } catch (error) {
    console.error('[API/SEED] Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    res.json({
      success: false,
      message: `Erreur: ${errorMessage}`,
    });
  }
});

export default router;
