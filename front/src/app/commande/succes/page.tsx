/**
 * ============================================
 * FEEL ME - Page Succès de Commande
 * Affichée au retour de PayTech : attend que PayTech
 * confirme le paiement au serveur (IPN), puis le dit
 * ============================================
 */

'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CheckCircle, Clock, Loader2, Package, ArrowRight } from 'lucide-react';

type PublicOrder = { ref: string; firstName: string; lastName: string; totalAmount: number; status: string };
type State = 'checking' | 'paid' | 'waiting' | 'cancelled' | 'unknown';

/* Toutes les 3 s pendant 1 min : PayTech prévient le serveur (IPN) quelques secondes après le paiement. */
const POLL_MS = 3000;
const POLL_MAX = 20;

/* --- Composant interne utilisant useSearchParams --- */
function SuccesContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [state, setState] = useState<State>(ref ? 'checking' : 'unknown');

  /* --- Attendre la confirmation de PayTech --- */
  /* La commande n'est payée que lorsque PayTech l'a confirmée au serveur (IPN signé).
     Cette page ne fait que demander où elle en est, sans jamais la marquer payée. */
  useEffect(() => {
    if (!ref) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async (attempt: number) => {
      try {
        const res = await fetch('/api/orders/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref }),
        });
        const data = await res.json();
        if (stopped) return;
        if (data.success && data.order) setOrder(data.order);
        if (data.success && data.paid) {
          setState('paid');
          return;
        }
        if (data.success && data.status === 'cancelled') {
          setState('cancelled');
          return;
        }
        if (res.status === 404) {
          setState('unknown');
          return;
        }
      } catch (err) {
        console.error(`[SUCCES] Vérification ${attempt} impossible :`, err);
      }
      if (stopped) return;
      if (attempt < POLL_MAX) timer = setTimeout(() => check(attempt + 1), POLL_MS);
      else setState('waiting');
    };

    check(1);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [ref]);

  const title =
    state === 'paid' ? 'Commande confirmée !'
    : state === 'checking' ? 'Paiement en cours de vérification…'
    : state === 'waiting' ? 'Paiement en attente de confirmation'
    : state === 'cancelled' ? 'Commande annulée'
    : 'Commande introuvable';

  return (
    <div className="max-w-2xl mx-auto px-4 pt-28 pb-20 text-center">
      {/* --- Icône --- */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${state === 'paid' ? 'bg-green-50' : 'bg-[#faf6eb]'}`}>
        {state === 'paid' ? (
          <CheckCircle className="w-10 h-10 text-green-500" />
        ) : state === 'checking' ? (
          <Loader2 className="w-10 h-10 text-[#c9a84c] animate-spin" />
        ) : (
          <Clock className="w-10 h-10 text-[#c9a84c]" />
        )}
      </div>

      <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold text-gray-800 mb-3">{title}</h1>

      {state === 'paid' && <p className="text-gray-500 text-lg mb-2">Merci pour votre achat chez Feel Me</p>}
      {state === 'checking' && <p className="text-gray-500 text-lg mb-2">Merci de patienter quelques secondes.</p>}

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
            <p><span className="text-gray-500">Client :</span> <span className="font-medium">{order.firstName} {order.lastName}</span></p>
            <div className="pt-3 mt-3 border-t border-[#f0e6d3]">
              <p className="text-lg font-bold text-[#c9a84c]">
                Total : {(order.totalAmount || 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-400 mb-8">
        {state === 'paid' && (<>Un email de confirmation avec votre facture vous a été envoyé.<br />Nous vous contacterons très bientôt pour la livraison.</>)}
        {state === 'checking' && <>Nous attendons la confirmation de votre paiement par PayTech.</>}
        {state === 'waiting' && (<>Nous n&apos;avons pas encore reçu la confirmation de PayTech.<br />Si vous avez payé, pas d&apos;inquiétude : vous recevrez un email dès qu&apos;elle arrivera.</>)}
        {state === 'cancelled' && <>Cette commande a été annulée. Contactez-nous si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.</>}
        {state === 'unknown' && <>Nous ne retrouvons pas cette commande. Contactez-nous si vous avez payé.</>}
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
