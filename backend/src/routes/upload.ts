import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateAdmin } from '../auth';

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${originalName}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', (req: Request, res: Response) => {
  const admin = authenticateAdmin(req);
  if (!admin) {
    res.status(401).json({ error: 'Non autorisé' });
    return;
  }

  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[API/UPLOAD] Multer error:', err);
      res.status(500).json({
        error: "Erreur lors de l'upload",
        details: err instanceof Error ? err.message : 'Unknown error',
      });
      return;
    }

    if (!req.file) {
      console.log('[API/UPLOAD] Aucun fichier fourni');
      res.status(400).json({ error: 'Aucun fichier fourni' });
      return;
    }

    console.log('[API/UPLOAD] Fichier reçu:', req.file.originalname, req.file.size, 'bytes');
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: publicUrl });
  });
});

export default router;
