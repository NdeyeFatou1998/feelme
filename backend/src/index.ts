/**
 * ============================================
 * FEEL ME - Point d'entrée Express
 * ============================================
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { syncDatabase } from './models';

import healthRouter from './routes/health';
import testDbRouter from './routes/test-db';
import testPgRouter from './routes/test-pg';
import seedRouter from './routes/seed';
import authRouter from './routes/auth';
import categoriesRouter from './routes/categories';
import productsRouter from './routes/products';
import packsRouter from './routes/packs';
import resellerPacksRouter from './routes/reseller-packs';
import ordersRouter from './routes/orders';
import paymentRouter from './routes/payment';
import uploadRouter from './routes/upload';
import settingsRouter from './routes/settings';
import adminsRouter from './routes/admins';
import fixPackPriceRouter from './routes/fix-pack-price';
import { ajaDoor, startAja } from './aja';

const app = express();
const PORT = process.env.PORT || 4000;

const frontUrl = process.env.FRONT_URL || 'http://localhost:3000';
const corsOrigin = process.env.CORS_ORIGIN || frontUrl;

app.use(
  cors({
    origin: [corsOrigin, frontUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.use('/api/health', healthRouter);
app.use('/api/test-db', testDbRouter);
app.use('/api/test-pg', testPgRouter);
app.use('/api/seed', seedRouter);
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/packs', packsRouter);
app.use('/api/reseller-packs', resellerPacksRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/fix-pack-price', fixPackPriceRouter);

// AJA : la porte à laquelle AJA frappe (le front fait suivre feel-me.store/aja ici)
app.get('/aja', ajaDoor);

app.get('/', (_req, res) => {
  res.json({
    name: 'Feel Me API',
    status: 'ok',
    docs: '/api/health',
  });
});

async function start() {
  try {
    console.log('[SERVER] Synchronisation de la base de données...');
    await syncDatabase();
    console.log('[SERVER] Base de données prête.');
  } catch (error) {
    console.error('[SERVER] Erreur syncDatabase au démarrage:', error);
    console.warn('[SERVER] Le serveur démarre quand même — la DB sera retentée par les routes.');
  }

  app.listen(PORT, () => {
    console.log(`[SERVER] Feel Me API écoute sur le port ${PORT}`);
    console.log(`[SERVER] FRONT_URL=${frontUrl}`);
    console.log(`[SERVER] API_URL=${process.env.API_URL || `http://localhost:${PORT}`}`);
    startAja();
  });
}

start();
