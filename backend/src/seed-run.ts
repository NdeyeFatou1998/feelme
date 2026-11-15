import 'dotenv/config';
import { seed } from './seed';

seed()
  .then(() => {
    console.log('[SEED-RUN] Terminé.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[SEED-RUN] Échec:', err);
    process.exit(1);
  });
