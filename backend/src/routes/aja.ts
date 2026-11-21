/**
 * ============================================
 * FEEL ME - Adresse de réveil AJA
 * GET /api/aja/wake — publique (ni session, ni auth).
 *
 * AJA l'appelle pour prouver que le domaine est le nôtre
 * (handleWake renvoie le code) et à chaque décision du marchand.
 * On répond 204 tout de suite, puis on travaille.
 * ============================================
 */

import { Router, Request, Response } from 'express';
import { getAja, logAjaError, processCommands } from '../aja';

const router = Router();

router.get('/wake', async (req: Request, res: Response) => {
  res.sendStatus(204);
  console.log(`[AJA] Réveil reçu (${Object.keys(req.query).join(', ') || 'sans paramètre'})`);
  const aja = getAja();
  if (!aja) return;
  try {
    const verification = await aja.site.handleWake(
      req.query as Record<string, string | string[] | undefined>
    );
    if (verification) {
      console.log(
        `[AJA] Preuve du domaine : ${verification.verified ? 'OK' : 'refusée'} ${verification.domain ?? ''}`
      );
    }
    await processCommands();
  } catch (error) {
    logAjaError('Réveil', error);
  }
});

export default router;
