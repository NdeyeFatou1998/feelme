/**
 * ============================================
 * FEEL ME - Context du Panier (Cart Store)
 * Gestion globale du panier d'achat avec React Context
 * Fonctions : add, remove, update quantity, clear
 * Persistance via localStorage
 * ============================================
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/* --- Structure d'un article du panier --- */
export interface CartItem {
  id: string;          // Format: "product-{id}" ou "pack-{id}"
  type: 'product' | 'pack';
  itemId: number;
  name: string;
  price: number;       // Prix effectif (promo si applicable)
  originalPrice?: number; // Prix original (si promo)
  image: string | null;
  quantity: number;
}

/* --- Interface du contexte --- */
interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/* --- Clé localStorage --- */
const CART_STORAGE_KEY = 'feelme_cart';

/**
 * Provider du panier, à wrapper autour de l'application
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  /* --- Charger le panier depuis localStorage au montage --- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      console.error('[CART] Erreur lecture localStorage');
    }
    setIsLoaded(true);
  }, []);

  /* --- Sauvegarder dans localStorage à chaque changement --- */
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  /**
   * Ajouter un article au panier
   * Si l'article existe déjà, on incrémente la quantité
   */
  const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, { ...item, quantity }];
    });
  };

  /**
   * Supprimer un article du panier
   */
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  /**
   * Modifier la quantité d'un article
   * Si quantity <= 0, l'article est supprimé
   */
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  /**
   * Vider complètement le panier
   */
  const clearCart = () => {
    setItems([]);
  };

  /* --- Calculs dérivés --- */
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

/**
 * Hook pour accéder au panier depuis n'importe quel composant
 */
export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart doit être utilisé dans un CartProvider');
  }
  return context;
}
