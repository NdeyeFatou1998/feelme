/**
 * ============================================
 * FEEL ME - Page Checkout (Commande)
 * Formulaire de commande : prénom, nom,
 * téléphone, email, adresse de livraison
 * Puis redirection vers PayTech pour paiement
 * ============================================
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/lib/cart';
import { ShoppingBag, Loader2, CreditCard, MapPin, User, Phone, Mail } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* --- Champs du formulaire --- */
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
  });

  /**
   * Met à jour un champ du formulaire
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * Soumet la commande et redirige vers PayTech
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    /* --- Validation basique --- */
    if (!form.firstName || !form.lastName || !form.phone || !form.email || !form.address) {
      setError('Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }

    if (items.length === 0) {
      setError('Votre panier est vide');
      setLoading(false);
      return;
    }

    try {
      /* --- Préparer les articles pour l'API --- */
      const orderItems = items.map((item) => ({
        type: item.type,
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        image: item.image,
      }));

      /* --- Envoyer la commande à l'API --- */
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: orderItems,
          totalAmount: totalPrice,
        }),
      });

      const data = await res.json();

      if (data.success && data.paymentUrl) {
        /* --- Redirection vers PayTech pour paiement --- */
        clearCart();
        window.location.href = data.paymentUrl;
      } else {
        /* --- Erreur PayTech ou autre erreur --- */
        setError(data.error || 'Service de paiement temporairement indisponible. Veuillez réessayer.');
      }
    } catch (err) {
      console.error('Erreur checkout:', err);
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  /* --- Si panier vide, rediriger --- */
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 pt-28 pb-20 text-center">
          <ShoppingBag className="w-16 h-16 text-[#c9a84c]/30 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-4">Votre panier est vide</p>
          <a
            href="/#acheter"
            className="inline-flex items-center gap-2 bg-[#1a1410] text-white font-semibold py-3 px-6 rounded-full hover:bg-[#c9a84c] transition-all"
          >
            Retour à la boutique
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="pt-28 sm:pt-32 pb-12 sm:pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold text-gray-800 mb-8">
            Finaliser la commande
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* --- Formulaire de commande (2/3) --- */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#f0e6d3] p-6 sm:p-8 space-y-6">
                <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-[#c9a84c]" />
                  Informations de livraison
                </h2>

                {/* Erreur */}
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200">
                    {error}
                  </div>
                )}

                {/* Prénom + Nom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Prénom *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="Votre prénom"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Nom *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Votre nom"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Téléphone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+221 77 000 00 00"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="votre@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
                    />
                  </div>
                </div>

                {/* Adresse de livraison */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Adresse de livraison *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Votre adresse complète de livraison"
                      required
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Bouton de paiement */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold py-4 px-6 rounded-xl hover:from-[#a88a2e] hover:to-[#c9a84c] transition-all duration-300 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Payer {totalPrice.toLocaleString('fr-FR')} FCFA
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* --- Résumé de commande (1/3) --- */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-[#f0e6d3] p-6 sticky top-24">
                <h2 className="font-semibold text-gray-800 text-lg mb-4">Résumé</h2>

                <div className="space-y-3 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#f9f3e8] flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-[#c9a84c]/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-gray-800">
                        {(item.price * item.quantity).toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#f0e6d3] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">Total</span>
                    <span className="text-xl font-bold text-[#c9a84c]">
                      {totalPrice.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
