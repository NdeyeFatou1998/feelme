/**
 * ============================================
 * FEEL ME - API Route /api/upload
 * Upload d'images vers le dossier public/uploads
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { authenticateAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    console.log('[API/UPLOAD] Début upload');
    
    const admin = authenticateAdmin(req);
    if (!admin) {
      console.log('[API/UPLOAD] Non autorisé');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('[API/UPLOAD] Admin authentifié');

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('[API/UPLOAD] Aucun fichier fourni');
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    console.log('[API/UPLOAD] Fichier reçu:', file.name, file.size, 'bytes');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Générer un nom de fichier unique avec timestamp
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${originalName}`;

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    console.log('[API/UPLOAD] Dossier uploads:', uploadsDir);
    
    try {
      await mkdir(uploadsDir, { recursive: true });
      console.log('[API/UPLOAD] Dossier créé/vérifié');
    } catch (mkdirError) {
      console.log('[API/UPLOAD] Erreur mkdir (probablement existe déjà):', mkdirError);
    }

    // Écrire le fichier
    const filepath = join(uploadsDir, filename);
    console.log('[API/UPLOAD] Écriture fichier:', filepath);
    await writeFile(filepath, buffer);
    console.log('[API/UPLOAD] Fichier écrit avec succès');

    // Retourner l'URL publique
    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('[API/UPLOAD] Error:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de l\'upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
