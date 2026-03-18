/**
 * ============================================
 * FEEL ME - Route temporaire pour corriger le prix
 * du pack "1x3ml et 1x6ml" de 5000 à 5500 FCFA.
 * À SUPPRIMER après exécution.
 * ============================================
 */

import { NextResponse } from 'next/server';
import { Pack } from '@/lib/models';
import { syncDatabase } from '@/lib/models';
import { Op } from 'sequelize';

export async function GET() {
  try {
    await syncDatabase();

    /* --- Chercher le pack par nom contenant "1x3" et "1x6" ou prix = 5000 --- */
    const packs = await Pack.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: '%1x3%1x6%' } },
          { name: { [Op.iLike]: '%3ml%6ml%' } },
          { price: 5000 },
        ],
      },
    });

    console.log(`[FIX] Packs trouvés:`, packs.map(p => ({ id: p.id, name: p.name, price: p.price })));

    const results: any[] = [];

    for (const pack of packs) {
      const packData = (pack as any).dataValues;
      if (packData.price === 5000) {
        await pack.update({ price: 5500 });
        results.push({ id: packData.id, name: packData.name, oldPrice: 5000, newPrice: 5500 });
        console.log(`[FIX] Pack "${packData.name}" (id=${packData.id}) : 5000 → 5500 FCFA`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} pack(s) corrigé(s)`,
      results,
    });
  } catch (error) {
    console.error('[FIX] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur', details: String(error) }, { status: 500 });
  }
}
