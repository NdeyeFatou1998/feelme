/**
 * ============================================
 * FEEL ME - Composant Header (Navigation)
 * Barre de navigation premium glassmorphism
 * Transparent sur hero → glass-light au scroll
 * Logo + liens + panier animé
 * ============================================
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X, Sparkles } from 'lucide-react';
import { useCart } from '@/lib/cart';

export default function Header() {
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  /* --- Détection du scroll pour changer le style du header --- */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* --- Scroll vers la section achat (page d'accueil) --- */
  const scrollToShop = () => {
    if (isHome) {
      document.getElementById('acheter')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/#acheter';
    }
    setMenuOpen(false);
  };

  /* --- Styles dynamiques selon scroll et page --- */
  const headerBg = isHome && !scrolled
    ? 'bg-transparent border-transparent'
    : 'bg-white/80 backdrop-blur-xl border-[#f0e6d3]/50 shadow-sm shadow-black/5';
  const textColor = isHome && !scrolled ? 'text-white/90' : 'text-gray-600';
  const logoColor = isHome && !scrolled
    ? 'bg-gradient-to-r from-[#e8d48b] via-white to-[#e8d48b] bg-clip-text text-transparent'
    : 'text-[#c9a84c]';
  const hoverColor = isHome && !scrolled ? 'hover:text-[#e8d48b]' : 'hover:text-[#c9a84c]';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-500 ${headerBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">

          {/* --- Logo avec shimmer doré --- */}
          <Link href="/" className="flex items-center gap-2 group">
            <Sparkles className={`w-4 h-4 transition-all duration-300 opacity-0 group-hover:opacity-100 ${isHome && !scrolled ? 'text-[#e8d48b]' : 'text-[#c9a84c]'}`} />
            <span className={`font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold italic transition-all duration-500 ${logoColor}`}>
              Feel Me
            </span>
          </Link>

          {/* --- Navigation desktop --- */}
          <nav className="hidden md:flex items-center gap-10">
            <Link href="/"
              className={`relative text-xs font-medium ${hoverColor} transition-all duration-300 uppercase tracking-[0.25em] ${textColor} after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[1.5px] after:bg-[#c9a84c] after:transition-all after:duration-300 hover:after:w-full`}>
              Accueil
            </Link>
            <button onClick={scrollToShop}
              className={`relative text-xs font-medium ${hoverColor} transition-all duration-300 uppercase tracking-[0.25em] ${textColor} after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[1.5px] after:bg-[#c9a84c] after:transition-all after:duration-300 hover:after:w-full`}>
              Boutique
            </button>
            <Link href="/panier"
              className={`relative text-xs font-medium ${hoverColor} transition-all duration-300 uppercase tracking-[0.25em] ${textColor} after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[1.5px] after:bg-[#c9a84c] after:transition-all after:duration-300 hover:after:w-full`}>
              Panier
            </Link>
          </nav>

          {/* --- Actions (panier + menu mobile) --- */}
          <div className="flex items-center gap-5">
            {/* Bouton panier avec compteur animé */}
            <Link href="/panier" className="relative group magnetic-hover">
              <ShoppingBag className={`w-5 h-5 group-hover:text-[#c9a84c] transition-all duration-300 ${textColor}`} />
              {totalItems > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-[#c9a84c]/30 animate-fade-in">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Bouton menu mobile */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden ${hoverColor} transition-all duration-300 ${textColor}`}
            >
              {menuOpen
                ? <X className="w-6 h-6" />
                : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* --- Menu mobile déroulant avec glass effect --- */}
        <div className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
          menuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-white/95 backdrop-blur-xl border-t border-[#f0e6d3]/50 py-4 space-y-1 -mx-4 px-6">
            <Link href="/" onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-gray-600 hover:text-[#c9a84c] uppercase tracking-[0.2em] py-3.5 border-b border-[#f0e6d3]/30 transition-colors">
              Accueil
            </Link>
            <button onClick={scrollToShop}
              className="block w-full text-left text-sm font-medium text-gray-600 hover:text-[#c9a84c] uppercase tracking-[0.2em] py-3.5 border-b border-[#f0e6d3]/30 transition-colors">
              Boutique
            </button>
            <Link href="/panier" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between text-sm font-medium text-gray-600 hover:text-[#c9a84c] uppercase tracking-[0.2em] py-3.5 transition-colors">
              <span>Panier</span>
              {totalItems > 0 && (
                <span className="bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
