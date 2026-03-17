/**
 * ============================================
 * FEEL ME - API Route /api/seed
 * Initialise la base de données avec les données
 * par défaut (admin, catégories, produits, packs)
 * GET /api/seed
 * 
 * NOTE : retourne toujours HTTP 200 pour que Vercel
 * ne masque pas le JSON de réponse en cas d'erreur.
 * Le champ "success" indique le vrai statut.
 * ============================================
 */

import { NextResponse } from 'next/server';
import { seed } from '@/lib/seed';

export async function GET() {
  try {
    await seed();
    return NextResponse.json({ 
      success: true, 
      message: 'Base de données initialisée avec succès !' 
    });
  } catch (error) {
    console.error('[API/SEED] Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    /* --- Pas de status 500, sinon Vercel masque le JSON --- */
    return NextResponse.json({
      success: false,
      message: `Erreur: ${errorMessage}`,
    });
  }
}
