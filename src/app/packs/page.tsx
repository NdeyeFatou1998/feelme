/**
 * ============================================
 * FEEL ME - Page Packs (redirection)
 * Redirige vers la page d'accueil section achat
 * car le site est mono-produit (musc tahara)
 * ============================================
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PacksPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/#acheter'); }, [router]);
  return null;
}
