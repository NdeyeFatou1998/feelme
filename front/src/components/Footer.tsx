/**
 * ============================================
 * FEEL ME - Composant Footer
 * Pied de page premium avec gold-line,
 * glassmorphism, liens hover animés
 * ============================================
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Mail, MapPin, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-[#0c0a07] text-white/60 overflow-hidden">
      {/* Ligne dorée animée en haut du footer */}
      <div className="gold-line w-full" />

      {/* Effet de brillance subtil en arrière-plan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#c9a84c]/5 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

          {/* --- Colonne 1 : Marque (plus large) --- */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#c9a84c]" />
              <h3 className="font-[var(--font-playfair)] text-3xl font-bold italic bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] bg-clip-text text-transparent">
                Feel Me
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-white/35 max-w-xs mb-6">
              Les senteurs du paradis.<br />
              Musc Tahara Original — une fragrance authentique et envoûtante qui sublime chaque instant.
            </p>
            {/* Tags décoratifs */}
            <div className="flex flex-wrap gap-2">
              {['Musc Tahara', 'Premium', 'Authentique'].map((tag) => (
                <span key={tag} className="text-[10px] uppercase tracking-widest text-white/20 border border-white/10 px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* --- Colonne 2 : Liens --- */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold text-[#c9a84c]/60 uppercase tracking-[0.25em] mb-5">
              Navigation
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Accueil', href: '/' },
                { label: 'Boutique', href: '/#acheter' },
                { label: 'Mon Panier', href: '/panier' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="group flex items-center gap-2 text-sm text-white/40 hover:text-[#e8d48b] transition-all duration-300"
                  >
                    <span className="w-0 group-hover:w-3 h-px bg-[#c9a84c] transition-all duration-300" />
                    {label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* --- Colonne 3 : Contact --- */}
          <div className="md:col-span-4">
            <h4 className="text-xs font-semibold text-[#c9a84c]/60 uppercase tracking-[0.25em] mb-5">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-3.5 h-3.5 text-[#c9a84c]/60" />
                </span>
                <span className="text-sm text-white/40">softechiris@gmail.com</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-[#c9a84c]/60" />
                </span>
                <span className="text-sm text-white/40">Livraison partout au Sénégal</span>
              </li>
            </ul>
          </div>
        </div>

        {/* --- Séparateur doré + Copyright --- */}
        <div className="mt-14 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-white/20 tracking-wide">
            &copy; {new Date().getFullYear()} Feel Me — Les senteurs du paradis. Tous droits réservés.
          </p>
          <p className="text-[11px] text-white/20 tracking-wide font-[var(--font-playfair)] italic">
            Musc Tahara Original
          </p>
        </div>
      </div>
    </footer>
  );
}
