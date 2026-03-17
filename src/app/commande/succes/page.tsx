/**
 * ============================================
 * FEEL ME - Page Succès de Commande
 * Affichée après un paiement réussi via PayTech
 * ou après création de commande sans paiement
 * ============================================
 */

'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';

/* --- Composant interne utilisant useSearchParams --- */
function SuccesContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [order, setOrder] = useState<any>(null);

  /* --- Charger les détails de la commande si ref présente --- */
  useEffect(() => {
    if (ref) {
      fetch(`/api/orders/${ref}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setOrder(data.order);
        })
        .catch(console.error);
    }
  }, [ref]);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-28 pb-20 text-center">
      {/* --- Icône succès --- */}
      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>

      <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold text-gray-800 mb-3">
        Commande confirmée !
      </h1>

      <p className="text-gray-500 text-lg mb-2">
        Merci pour votre achat chez Feel Me
      </p>

      {ref && (
        <p className="text-sm text-gray-400 mb-8">
          Référence : <span className="font-mono font-bold text-[#c9a84c]">{ref}</span>
        </p>
      )}

      {/* --- Détails de la commande --- */}
      {order && (
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-6 text-left mb-8">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#c9a84c]" />
            Détails de votre commande
          </h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Client :</span> <span className="font-medium">{order.first_name || order.firstName} {order.last_name || order.lastName}</span></p>
            <p><span className="text-gray-500">Email :</span> <span className="font-medium">{order.email}</span></p>
            <p><span className="text-gray-500">Téléphone :</span> <span className="font-medium">{order.phone}</span></p>
            <p><span className="text-gray-500">Adresse :</span> <span className="font-medium">{order.address}</span></p>
            <div className="pt-3 mt-3 border-t border-[#f0e6d3]">
              <p className="text-lg font-bold text-[#c9a84c]">
                Total : {(order.total_amount || order.totalAmount || 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-400 mb-8">
        Un email de confirmation avec votre facture vous a été envoyé.<br />
        Nous vous contacterons très bientôt pour la livraison.
      </p>

      {/* --- Bouton retour --- */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold py-3 px-6 rounded-full hover:from-[#a88a2e] hover:to-[#c9a84c] transition-all"
      >
        Retour à l&apos;accueil
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function SuccesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Chargement...</div>}>
        <SuccesContent />
      </Suspense>
      <Footer />
    </div>
  );
}
