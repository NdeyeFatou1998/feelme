/**
 * ============================================
 * FEEL ME - Composant ProductCard
 * Carte produit premium avec image, prix,
 * prix promo (barré) et bouton ajout panier
 * Utilisé pour les produits ET les packs
 * ============================================
 */

'use client';

import React from 'react';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { useCart } from '@/lib/cart';

/* --- Props du composant --- */
interface ProductCardProps {
  id: number;
  type: 'product' | 'pack';
  name: string;
  price: number;
  promoPrice: number | null;
  image: string | null;
  volume?: string | null;
  description?: string | null;
}

export default function ProductCard({
  id,
  type,
  name,
  price,
  promoPrice,
  image,
  volume,
}: ProductCardProps) {
  const { addItem } = useCart();

  /* --- Prix effectif : promo si disponible, sinon prix normal --- */
  const effectivePrice = promoPrice || price;
  const hasPromo = promoPrice !== null && promoPrice !== undefined && promoPrice < price;

  /* --- Calcul du pourcentage de réduction --- */
  const discountPercent = hasPromo
    ? Math.round(((price - promoPrice!) / price) * 100)
    : 0;

  /**
   * Ajouter au panier avec les infos nécessaires
   */
  const handleAddToCart = () => {
    addItem({
      id: `${type}-${id}`,
      type,
      itemId: id,
      name,
      price: effectivePrice,
      originalPrice: hasPromo ? price : undefined,
      image,
    });
  };

  return (
    <div className="product-card bg-white rounded-2xl overflow-hidden border border-[#f0e6d3] group">
      {/* --- Image du produit --- */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f9f3e8]">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-[#c9a84c]/30" />
          </div>
        )}

        {/* --- Badge promo --- */}
        {hasPromo && (
          <div className="promo-badge absolute top-3 right-3 bg-[#c9a84c] text-white text-xs font-bold px-3 py-1.5 rounded-full">
            -{discountPercent}%
          </div>
        )}

        {/* --- Badge volume (3ml, 6ml, etc.) --- */}
        {volume && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#c9a84c] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#f0e6d3]">
            {volume}
          </div>
        )}

        {/* --- Badge type Pack --- */}
        {type === 'pack' && (
          <div className="absolute top-3 left-3 bg-[#c9a84c] text-white text-xs font-bold px-3 py-1.5 rounded-full">
            PACK
          </div>
        )}
      </div>

      {/* --- Informations produit --- */}
      <div className="p-4 sm:p-5">
        {/* Nom du produit */}
        <h3 className="font-[var(--font-playfair)] text-base sm:text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
          {name}
        </h3>

        {/* Prix */}
        <div className="flex items-center gap-2 mb-4">
          {hasPromo ? (
            <>
              {/* Prix promo en or */}
              <span className="text-xl font-bold text-[#c9a84c]">
                {promoPrice!.toLocaleString('fr-FR')} FCFA
              </span>
              {/* Prix original barré */}
              <span className="price-strikethrough text-sm">
                {price.toLocaleString('fr-FR')} FCFA
              </span>
            </>
          ) : (
            <span className="text-xl font-bold text-[#c9a84c]">
              {price.toLocaleString('fr-FR')} FCFA
            </span>
          )}
        </div>

        {/* Bouton ajout au panier */}
        <button
          onClick={handleAddToCart}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold py-3 px-4 rounded-xl hover:from-[#a88a2e] hover:to-[#c9a84c] transition-all duration-300 text-sm"
        >
          <ShoppingBag className="w-4 h-4" />
          Ajouter au panier
        </button>
      </div>
    </div>
  );
}
