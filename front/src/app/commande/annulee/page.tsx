/**
 * ============================================
 * FEEL ME - Page Commande Annulée
 * Affichée après annulation du paiement PayTech
 * ============================================
 */

'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { XCircle, ArrowRight } from 'lucide-react';

function AnnuleeContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  return (
    <div className="max-w-2xl mx-auto px-4 pt-28 pb-20 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-10 h-10 text-red-400" />
      </div>
      <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold text-gray-800 mb-3">
        Paiement annulé
      </h1>
      <p className="text-gray-500 text-lg mb-2">
        Votre paiement a été annulé. Aucun montant n&apos;a été débité.
      </p>
      {ref && (
        <p className="text-sm text-gray-400 mb-8">
          Référence : <span className="font-mono font-bold text-gray-600">{ref}</span>
        </p>
      )}
      <p className="text-sm text-gray-400 mb-8">
        Vous pouvez réessayer en ajoutant à nouveau vos articles au panier.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/boutique"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold py-3 px-6 rounded-full hover:from-[#a88a2e] hover:to-[#c9a84c] transition-all"
        >
          Retour à la boutique
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#c9a84c] font-semibold hover:text-[#a88a2e] transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

export default function AnnuleePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Chargement...</div>}>
        <AnnuleeContent />
      </Suspense>
      <Footer />
    </div>
  );
}
