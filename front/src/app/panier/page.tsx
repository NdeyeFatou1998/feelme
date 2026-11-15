/**
 * ============================================
 * FEEL ME - Page Panier
 * Affiche le contenu du panier avec gestion
 * des quantités, suppression et total
 * Bouton vers le checkout
 * ============================================
 */

'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/lib/cart';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

export default function PanierPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="pt-28 sm:pt-32 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold text-[#1a1410] mb-8">
            Mon Panier
          </h1>

          {items.length === 0 ? (
            /* --- Panier vide --- */
            <div className="text-center py-20 bg-white rounded-2xl border border-[#f0e6d3]">
              <ShoppingBag className="w-16 h-16 text-[#c9a84c]/30 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">Votre panier est vide</p>
              <p className="text-gray-300 text-sm mb-8">Découvrez nos produits et ajoutez-les à votre panier</p>
              <Link
                href="/boutique"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold py-3 px-6 rounded-full hover:from-[#a88a2e] hover:to-[#c9a84c] transition-all"
              >
                Voir la boutique
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* --- Liste des articles --- */}
              <div className="bg-white rounded-2xl border border-[#f0e6d3] overflow-hidden">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-4 sm:p-6 ${
                      index < items.length - 1 ? 'border-b border-[#f0e6d3]' : ''
                    }`}
                  >
                    {/* Image produit */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#f9f3e8] flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-[#c9a84c]/30" />
                        </div>
                      )}
                    </div>

                    {/* Infos produit */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                        {item.name}
                      </h3>
                      {/* Badge type */}
                      <span className="inline-block text-xs bg-[#f9f3e8] text-[#c9a84c] px-2 py-0.5 rounded-full mt-1 font-medium">
                        {item.type === 'pack' ? 'Pack' : 'Produit'}
                      </span>
                      {/* Prix */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[#c9a84c] font-bold text-sm sm:text-base">
                          {item.price.toLocaleString('fr-FR')} FCFA
                        </span>
                        {item.originalPrice && (
                          <span className="price-strikethrough text-xs">
                            {item.originalPrice.toLocaleString('fr-FR')} FCFA
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contrôles de quantité */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f9f3e8] text-gray-600 hover:bg-[#f0e6d3] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f9f3e8] text-gray-600 hover:bg-[#f0e6d3] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Sous-total + Suppression */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-800 text-sm sm:text-base">
                        {(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="mt-1 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- Résumé et total --- */}
              <div className="bg-white rounded-2xl border border-[#f0e6d3] p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 text-sm">Articles ({totalItems})</span>
                  <span className="text-gray-800 font-medium">{totalPrice.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex items-center justify-between mb-6 pt-4 border-t border-[#f0e6d3]">
                  <span className="text-lg font-bold text-gray-800">Total</span>
                  <span className="text-xl font-bold text-[#c9a84c]">
                    {totalPrice.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <Link
                  href="/checkout"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold py-4 px-6 rounded-xl hover:from-[#a88a2e] hover:to-[#c9a84c] transition-all duration-300 text-base"
                >
                  Commander
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
