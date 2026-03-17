/**
 * ============================================
 * FEEL ME - API Route /api/seed
 * Initialise la base de données avec les données
 * par défaut (admin, catégories, produits, packs)
 * GET /api/seed
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
    return NextResponse.json(
      { success: false, message: 'Erreur lors de l\'initialisation' },
      { status: 500 }
    );
  }
}
