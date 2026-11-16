/**
 * ============================================
 * FEEL ME - Adresse de réveil AJA
 * GET /api/aja/wake
 *
 * AJA l'appelle quand une décision du marchand attend,
 * et au rattachement avec un code (aja_verify) que
 * handleWake lui renvoie avec la clé : c'est la preuve
 * que ce serveur est bien celui de la boutique.
 * ============================================
 */

import { Router, Request, Response } from 'express';
import { getAjaClient, processCommands } from '../aja';

const router = Router();

router.get('/wake', (req: Request, res: Response) => {
  res.sendStatus(204);

  const aja = getAjaClient();
  if (!aja) return;

  void (async () => {
    try {
      const verification = await aja.site.handleWake(
        req.query as Record<string, string | string[] | undefined>
      );
      if (verification) {
        console.log(`[AJA] Rattachement : ${verification.verified ? 'confirmé' : 'refusé'}`);
      }
      await processCommands();
    } catch (error) {
      console.error('[AJA] Réveil:', error instanceof Error ? error.message : error);
    }
  })();
});

export default router;
