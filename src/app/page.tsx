/**
 * ============================================
 * FEEL ME - Page d'Accueil Premium
 * Landing page immersive haut de gamme
 * Hero fullscreen bannière, scroll-reveal,
 * sections lifestyle, grille produits premium
 * IntersectionObserver pour animations au scroll
 * ============================================
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/lib/cart';
import {
  ShoppingBag, Sparkles, Truck, Shield, Star,
  Check, ChevronDown, ArrowRight, Heart, Droplets, Layers, Users, TrendingUp
} from 'lucide-react';

/* --- Interfaces typées pour les données API --- */
interface ProductData {
  id: number; name: string; price: number; promoPrice: number | null;
  image: string | null; volume: string | null; slug: string; isActive: boolean;
}
interface PackData {
  id: number; name: string; price: number; promoPrice: number | null;
  image: string | null; slug: string; isActive: boolean;
  items: { productId: number; productName?: string; quantity: number }[];
}

export default function HomePage() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [packs, setPacks] = useState<PackData[]>([]);
  const [resellerPacks, setResellerPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);

  /* --- Ref pour le parallax du hero --- */
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroOffset, setHeroOffset] = useState(0);

  /* =============================================
   * SCROLL REVEAL — IntersectionObserver
   * Ajoute .visible aux éléments .reveal quand
   * ils entrent dans le viewport (seuil 15%)
   * ============================================= */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    /* Observer tous les éléments avec classe reveal */
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [loading]); /* re-observe quand le contenu dynamique charge */

  /* =============================================
   * PARALLAX — Effet de profondeur sur le hero
   * L'image de fond bouge plus lentement que le scroll
   * ============================================= */
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrollY = window.scrollY;
        const heroHeight = heroRef.current.offsetHeight;
        /* Appliquer le parallax uniquement quand le hero est visible */
        if (scrollY < heroHeight) {
          setHeroOffset(scrollY * 0.4);
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* --- Chargement des données API --- */
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, packRes, resellerRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/packs'),
          fetch('/api/reseller-packs')
        ]);
        const [prodData, packData, resellerData] = await Promise.all([
          prodRes.json(),
          packRes.json(),
          resellerRes.json()
        ]);
        if (prodData.success) setProducts(prodData.products);
        if (packData.success) setPacks(packData.packs);
        if (resellerData.success) setResellerPacks(resellerData.resellerPacks);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    loadData();
  }, []);

  /* --- Ajouter au panier avec feedback visuel animé --- */
  const handleAdd = useCallback((id: string, type: 'product' | 'pack', itemId: number, name: string, price: number, originalPrice: number | undefined, image: string | null) => {
    addItem({ id, type, itemId, name, price, originalPrice, image });
    setAddedId(id);
    setTimeout(() => setAddedId(null), 1800);
  }, [addItem]);

  /* --- Scroll fluide vers la section boutique --- */
  const scrollToShop = () => {
    document.getElementById('acheter')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative overflow-hidden">

      {/* ===== Particules dorées flottantes en arrière-plan ===== */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-[10%] left-[5%] w-2 h-2 bg-[#c9a84c] rounded-full animate-float-slow" />
        <div className="absolute top-[25%] right-[10%] w-1.5 h-1.5 bg-[#e8d48b] rounded-full animate-float-medium" />
        <div className="absolute top-[45%] left-[20%] w-1 h-1 bg-[#c9a84c] rounded-full animate-float-fast" />
        <div className="absolute top-[65%] right-[25%] w-2.5 h-2.5 bg-[#e8d48b] rounded-full animate-float-slow" />
        <div className="absolute top-[80%] left-[60%] w-1.5 h-1.5 bg-[#c9a84c] rounded-full animate-float-medium" />
        <div className="absolute top-[15%] left-[70%] w-1 h-1 bg-[#e8d48b] rounded-full animate-float-fast" />
        <div className="absolute top-[55%] left-[45%] w-2 h-2 bg-[#c9a84c] rounded-full animate-float-slow" />
      </div>

      <Header />

      {/* ==========================================================
          HERO — Fullscreen avec image bannière, parallax, overlay
          ========================================================== */}
      <section ref={heroRef} className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
        {/* Image de fond avec parallax */}
        <div
          className="absolute inset-0 w-full h-[105%]"
          style={{ transform: `translateY(-${heroOffset}px)` }}
        >
          <img
            src="/images/feelmebanniere.jpeg"
            alt="Feel Me — Les senteurs du paradis"
            className="w-full h-full object-cover object-center scale-100"
          />
        </div>

        {/* Overlay gradient premium — dégradé multi-couches */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

        {/* Contenu du hero — séquençage d'animations */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge animé */}
          <div className="inline-flex items-center gap-2 glass text-white/90 text-xs font-semibold px-6 py-2.5 rounded-full mb-8 animate-fade-in-down">
            <Sparkles className="w-3.5 h-3.5 text-[#e8d48b] animate-pulse" />
            Les senteurs du paradis
          </div>

          {/* Titre principal — gradient doré animé */}
          <h1 className="font-[var(--font-playfair)] text-7xl sm:text-8xl lg:text-9xl font-bold italic bg-gradient-to-r from-[#e8d48b] via-white to-[#e8d48b] bg-clip-text text-transparent mb-6 animate-fade-in-up bg-[length:200%_auto] animate-gradient leading-none">
            Feel Me
          </h1>

          {/* Ligne dorée animée sous le titre */}
          <div className="gold-line w-32 sm:w-48 mx-auto mb-8 animate-fade-in animation-delay-200" />

          {/* Sous-titre */}
          <p className="font-[var(--font-playfair)] text-xl sm:text-2xl lg:text-3xl text-white/90 mb-4 animate-fade-in-up animation-delay-400 tracking-wide">
            Musc Tahara Original
          </p>

          {/* Description */}
          <p className="text-white/60 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed mb-12 animate-fade-in-up animation-delay-600">
            Une fragrance divine aux notes blanches et florales d&apos;une pureté absolue.
            L&apos;essence même du paradis sur votre peau.
          </p>

          {/* Boutons CTA premium */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-in-up animation-delay-800">
            <button
              onClick={scrollToShop}
              className="btn-glow magnetic-hover group inline-flex items-center gap-3 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold px-10 py-4.5 rounded-full text-base tracking-wide"
            >
              <ShoppingBag className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              Commander maintenant
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <button
              onClick={scrollToShop}
              className="magnetic-hover inline-flex items-center gap-3 glass text-white font-semibold px-10 py-4.5 rounded-full hover:bg-white/15 transition-all duration-300 text-base"
            >
              Découvrir
              <ChevronDown className="w-4 h-4 scroll-indicator" />
            </button>
          </div>
        </div>

        {/* Scroll indicator en bas du hero */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-fade-in animation-delay-1000">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-[#e8d48b] rounded-full scroll-indicator" />
          </div>
        </div>

        {/* Transition douce vers la section suivante */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fdfbf7] to-transparent" />
      </section>


      {/* ==========================================================
          SECTION — Présentation avec image couple (scroll-reveal)
          ========================================================== */}
      <section className="py-20 sm:py-28 bg-[#fdfbf7] relative overflow-hidden">
        {/* Décoration de fond */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#c9a84c]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#e8d48b]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image couple — avec cadrage correct et effet zoom */}
            <div className="reveal-left img-zoom relative rounded-3xl overflow-hidden shadow-2xl shadow-black/15">
              <img
                src="/images/feelmecouple.jpeg"
                alt="Feel Me — Couple"
                className="w-full h-[550px] sm:h-[650px] object-cover object-top"
              />
              {/* Overlay subtil en bas */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              {/* Badge flottant glassmorphism */}
              <div className="absolute bottom-6 left-6 glass text-white px-5 py-3 rounded-2xl">
                <p className="text-xs uppercase tracking-widest text-[#e8d48b] mb-0.5">Musc Tahara</p>
                <p className="font-[var(--font-playfair)] text-lg font-bold italic">L&apos;intimité sublimée</p>
              </div>
            </div>

            {/* Texte — reveal depuis la droite */}
            <div className="reveal-right">
              <div className="flex items-center gap-3 mb-6">
                <Droplets className="w-5 h-5 text-[#c9a84c]" />
                <p className="text-[#c9a84c] text-xs uppercase tracking-[0.3em] font-semibold">
                  Le musc de l&apos;intimité
                </p>
              </div>
              <h2 className="font-[var(--font-playfair)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1a1410] mb-8 leading-tight">
                Une fragrance divine pour des moments
                <span className="italic text-[#c9a84c]"> inoubliables</span>
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8 text-base lg:text-lg">
                Le Musc Tahara Original Feel Me est bien plus qu&apos;un parfum. C&apos;est une expérience sensorielle unique,
                aux notes blanches et florales d&apos;une pureté absolue. Utilisé depuis des siècles dans les traditions orientales,
                il sublime votre peau et laisse une empreinte olfactive irrésistible.
              </p>

              {/* Liste d'avantages avec icônes dorées */}
              <ul className="space-y-4 mb-10">
                {[
                  { text: 'Notes blanches pures et envoûtantes', icon: Sparkles },
                  { text: 'Tenue longue durée sur la peau', icon: Star },
                  { text: 'Idéal pour homme et femme', icon: Heart },
                  { text: 'Formule naturelle et authentique', icon: Shield },
                ].map(({ text, icon: Icon }) => (
                  <li key={text} className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c9a84c]/15 to-[#e8d48b]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-[#c9a84c]" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              <button
                onClick={scrollToShop}
                className="btn-glow magnetic-hover inline-flex items-center gap-3 bg-[#1a1410] text-white font-semibold py-4 px-10 rounded-full hover:bg-[#c9a84c] transition-all duration-500 text-sm tracking-wide"
              >
                <ShoppingBag className="w-4 h-4" />
                Commander maintenant
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          SECTION — Pour Elle / Pour Lui (plein impact visuel)
          Images object-position: top pour ne pas couper les visages
          ========================================================== */}
      <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Titre de section */}
          <div className="text-center mb-16 reveal">
            <p className="text-[#c9a84c] text-xs uppercase tracking-[0.3em] font-semibold mb-4">Pour elle &amp; pour lui</p>
            <h2 className="font-[var(--font-playfair)] text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1a1410] mb-5">
              Un parfum pour <span className="italic text-[#c9a84c]">chacun(e)</span>
            </h2>
            <div className="gold-line w-24 mx-auto mb-6" />
            <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed text-base lg:text-lg">
              Le Musc Tahara transcende les genres. Que vous soyez homme ou femme,
              cette fragrance s&apos;adapte à votre peau pour révéler votre essence unique.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">

            {/* ====== POUR ELLE ====== */}
            <div className="reveal-left group">
              <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-black/10 img-zoom">
                {/* Image avec cadrage visage préservé */}
                <img
                  src="/images/feelmefemme.jpeg"
                  alt="Feel Me — Pour elle"
                  className="w-full h-[500px] sm:h-[620px] object-cover object-top"
                />
                {/* Overlay gradient élégant */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Contenu superposé */}
                <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10">
                  <p className="text-xs uppercase tracking-[0.3em] mb-3 text-[#e8d48b]">Pour elle</p>
                  <h3 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold italic text-white mb-4">
                    Douceur &amp; Élégance
                  </h3>
                  <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-5 max-w-md">
                    Une fragrance délicate qui sublime la féminité. Notes florales et poudrées
                    qui enveloppent la peau d&apos;une aura de mystère et de sensualité.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['Florales', 'Poudrées', 'Sensuelles'].map((tag) => (
                      <span key={tag} className="glass text-white/90 text-xs px-4 py-1.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ====== POUR LUI ====== */}
            <div className="reveal-right group">
              <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-black/10 img-zoom">
                {/* Image avec cadrage visage préservé */}
                <img
                  src="/images/feelmehomme.jpeg"
                  alt="Feel Me — Pour lui"
                  className="w-full h-[500px] sm:h-[620px] object-cover object-top"
                />
                {/* Overlay gradient élégant */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Contenu superposé */}
                <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10">
                  <p className="text-xs uppercase tracking-[0.3em] mb-3 text-[#e8d48b]">Pour lui</p>
                  <h3 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold italic text-white mb-4">
                    Force &amp; Raffinement
                  </h3>
                  <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-5 max-w-md">
                    Une signature olfactive masculine et raffinée. La force tranquille
                    et le charisme naturel, avec des notes boisées et musquées profondes.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['Boisées', 'Musquées', 'Profondes'].map((tag) => (
                      <span key={tag} className="glass text-white/90 text-xs px-4 py-1.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          SECTION — Image 3ml + 6ml (Cinématique fullwidth)
          ========================================================== */}
      <section className="relative overflow-hidden">
        <div className="reveal-scale">
          <div className="relative h-[450px] sm:h-[550px] overflow-hidden">
            <img
              src="/images/feelme3mlet6ml.jpeg"
              alt="Feel Me Musc Tahara 3ml et 6ml"
              className="w-full h-full object-cover"
            />
            {/* Overlay sombre élégant */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/40 to-black/20" />

            {/* Contenu */}
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-6 sm:px-12 w-full">
                <div className="max-w-xl">
                  <p className="text-[#e8d48b] text-xs uppercase tracking-[0.4em] mb-4 font-semibold">Nos formats</p>
                  <h2 className="font-[var(--font-playfair)] text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5 italic leading-tight">
                    Deux tailles,<br />un même enchantement
                  </h2>
                  <div className="gold-line w-20 mb-6" />
                  <p className="text-white/80 text-sm sm:text-base lg:text-lg leading-relaxed mb-8">
                    Choisissez le format qui vous convient : 3ml pour l&apos;essayer, 6ml pour ne plus s&apos;en passer.
                  </p>
                  <button
                    onClick={scrollToShop}
                    className="magnetic-hover inline-flex items-center gap-3 glass text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white/20 transition-all duration-300 text-sm"
                  >
                    Voir les formats
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          SECTION BOUTIQUE — Produits + Packs (scroll-reveal)
          ========================================================== */}
      <section id="acheter" className="py-20 sm:py-28 bg-gradient-to-b from-[#fdfbf7] to-white relative">
        {/* Décoration de fond */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#c9a84c]/3 rounded-full blur-[120px]" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* En-tête de section */}
          <div className="text-center mb-16 reveal">
            <Sparkles className="w-7 h-7 text-[#c9a84c] mx-auto mb-4" />
            <h2 className="font-[var(--font-playfair)] text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1a1410] mb-4">
              Choisissez votre <span className="italic text-[#c9a84c]">Musc</span>
            </h2>
            <div className="gold-line w-24 mx-auto mb-5" />
            <p className="text-gray-400 text-sm sm:text-base">
              Musc Tahara Original — disponible à l&apos;unité ou en pack
            </p>
          </div>

          {/* --- Grille de produits --- */}
          {loading ? (
            /* Squelettes de chargement animés */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl border border-[#f0e6d3] animate-pulse overflow-hidden bg-white">
                  <div className="aspect-[3/4] bg-gradient-to-b from-[#f5f0e8] to-[#ede5d5]" />
                  <div className="p-6 space-y-4">
                    <div className="h-5 bg-[#f5f0e8] rounded-full w-3/4" />
                    <div className="h-7 bg-[#f5f0e8] rounded-full w-1/2" />
                    <div className="h-12 bg-[#f5f0e8] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

              {/* === PRODUITS INDIVIDUELS === */}
              {products.filter(p => p.isActive !== false).map((p, index) => {
                const hasPromo = p.promoPrice !== null && p.promoPrice !== undefined && p.promoPrice < p.price;
                const effectivePrice = hasPromo ? p.promoPrice! : p.price;
                const cartId = `product-${(p as any).dataValues?.id || p.id}`;
                const pId = (p as any).dataValues?.id || p.id;
                return (
                  <div
                    key={cartId}
                    className={`reveal reveal-delay-${index + 1} product-card group bg-white rounded-3xl border border-[#f0e6d3]/60 overflow-hidden`}
                  >
                    {/* Image produit avec zoom au survol */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-[#f9f5ef] to-[#f0e9db]">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#f9f5ef]">
                          <Droplets className="w-16 h-16 text-[#c9a84c]/30" />
                        </div>
                      )}
                      {/* Badge promo pulsant */}
                      {hasPromo && (
                        <div className="promo-badge absolute top-5 right-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                          PROMO
                        </div>
                      )}
                      {/* Badge volume */}
                      {p.volume && (
                        <div className="absolute top-5 left-5 glass-light text-[#1a1410] text-sm font-bold px-5 py-2 rounded-full shadow-sm">
                          {p.volume}
                        </div>
                      )}
                    </div>

                    {/* Infos produit */}
                    <div className="p-6">
                      <h3 className="font-[var(--font-playfair)] text-lg font-semibold text-[#1a1410] mb-2">{p.name}</h3>
                      <div className="flex items-baseline gap-3 mb-6">
                        <span className="text-2xl font-bold text-[#c9a84c]">
                          {effectivePrice.toLocaleString('fr-FR')} <span className="text-sm font-medium">FCFA</span>
                        </span>
                        {hasPromo && (
                          <span className="text-sm text-gray-400 line-through">
                            {p.price.toLocaleString('fr-FR')} FCFA
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAdd(cartId, 'product', pId, p.name, effectivePrice, hasPromo ? p.price : undefined, p.image || '')}
                        className={`magnetic-hover w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-full transition-all duration-500 text-sm tracking-wide ${
                          addedId === cartId
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-[#1a1410] text-white hover:bg-gradient-to-r hover:from-[#c9a84c] hover:to-[#e8d48b]'
                        }`}
                      >
                        {addedId === cartId
                          ? <><Check className="w-4 h-4" /> Ajouté !</>
                          : <><ShoppingBag className="w-4 h-4" /> Ajouter au panier</>}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* === PACKS === */}
              {packs.filter(p => p.isActive !== false).map((pk, index) => {
                const hasPromo = pk.promoPrice !== null && pk.promoPrice !== undefined && pk.promoPrice < pk.price;
                const effectivePrice = hasPromo ? pk.promoPrice! : pk.price;
                const cartId = `pack-${(pk as any).dataValues?.id || pk.id}`;
                const pkId = (pk as any).dataValues?.id || pk.id;
                const discountPercent = hasPromo ? Math.round(((pk.price - pk.promoPrice!) / pk.price) * 100) : 0;
                return (
                  <div
                    key={cartId}
                    className={`reveal reveal-delay-${products.length + index + 1} product-card group bg-white rounded-3xl border-2 border-[#c9a84c]/40 overflow-hidden relative`}
                  >
                    {/* Badge "Meilleure offre" doré shimmer */}
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#c9a84c] via-[#e8d48b] to-[#c9a84c] text-white text-center text-xs font-bold py-2 uppercase tracking-[0.15em] z-10 shimmer">
                      <Star className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Meilleure offre
                    </div>

                    {/* Image pack */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-[#f9f5ef] to-[#f0e9db] mt-8">
                      {pk.image ? (
                        <img
                          src={pk.image}
                          alt={pk.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#f9f5ef]">
                          <Layers className="w-16 h-16 text-[#c9a84c]/30" />
                        </div>
                      )}
                      {hasPromo && (
                        <div className="promo-badge absolute top-5 right-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                          -{discountPercent}%
                        </div>
                      )}
                    </div>

                    {/* Infos pack */}
                    <div className="p-6">
                      <h3 className="font-[var(--font-playfair)] text-lg font-semibold text-[#1a1410] mb-1">{pk.name}</h3>
                      <p className="text-xs text-gray-400 mb-4">
                        {pk.items?.map(i => `${i.quantity}x ${i.productName || 'Musc Tahara'}`).join(' + ')}
                      </p>
                      <div className="flex items-baseline gap-3 mb-6">
                        <span className="text-2xl font-bold text-[#c9a84c]">
                          {effectivePrice.toLocaleString('fr-FR')} <span className="text-sm font-medium">FCFA</span>
                        </span>
                        {hasPromo && (
                          <span className="text-sm text-gray-400 line-through">
                            {pk.price.toLocaleString('fr-FR')} FCFA
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAdd(cartId, 'pack', pkId, pk.name, effectivePrice, hasPromo ? pk.price : undefined, pk.image || '')}
                        className={`magnetic-hover w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-full transition-all duration-500 text-sm tracking-wide ${
                          addedId === cartId
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white hover:shadow-lg hover:shadow-[#c9a84c]/30'
                        }`}
                      >
                        {addedId === cartId
                          ? <><Check className="w-4 h-4" /> Ajouté !</>
                          : <><ShoppingBag className="w-4 h-4" /> Ajouter au panier</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ==========================================================
          SECTION — DEVENEZ REVENDEUR (Packs avec bénéfices)
          ========================================================== */}
      {resellerPacks.filter(rp => rp.isActive !== false).length > 0 && (
        <section className="py-20 sm:py-28 bg-gradient-to-b from-[#fdfbf7] via-[#f9f5ef] to-[#fdfbf7] relative overflow-hidden">
          {/* Décoration de fond */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#c9a84c]/10 to-[#e8d48b]/10 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Titre section */}
            <div className="text-center mb-16 reveal">
              <h2 className="font-[var(--font-playfair)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1a1410] mb-4">
                Devenez <span className="italic text-[#c9a84c]">Revendeur</span>
              </h2>
              <div className="gold-line w-24 mx-auto mb-6" />
              <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed text-base lg:text-lg">
                Achetez nos packs revendeurs à prix réduit et générez des bénéfices attractifs en revendant nos produits premium.
              </p>
            </div>

            {/* Grille des packs revendeurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {resellerPacks.filter(rp => rp.isActive !== false).map((rp, index) => {
                const rpId = (rp as any).dataValues?.id || rp.id;
                return (
                  <div
                    key={rpId}
                    className={`reveal reveal-delay-${index + 1} group bg-white rounded-3xl border-2 border-[#c9a84c]/30 overflow-hidden relative hover:shadow-2xl hover:shadow-[#c9a84c]/20 transition-all duration-500`}
                  >
                    {/* Badge "Revendeur" */}
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#c9a84c] via-[#e8d48b] to-[#c9a84c] text-white text-center text-xs font-bold py-2 uppercase tracking-[0.15em] z-10 shimmer">
                      <Users className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Pack Revendeur
                    </div>

                    {/* Image */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-[#f9f5ef] to-[#f0e9db] mt-8">
                      {rp.image ? (
                        <img
                          src={rp.image}
                          alt={rp.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#f9f5ef]">
                          <Layers className="w-16 h-16 text-[#c9a84c]/30" />
                        </div>
                      )}
                    </div>

                    {/* Infos pack */}
                    <div className="p-6">
                      <h3 className="font-[var(--font-playfair)] text-lg font-semibold text-[#1a1410] mb-1">{rp.name}</h3>
                      <p className="text-xs text-gray-400 mb-4">
                        {rp.items?.map((i: any) => `${i.quantity}x ${i.productName || 'Musc Tahara'}`).join(' + ')}
                      </p>

                      {/* Prix */}
                      <div className="mb-4 pb-4 border-b border-[#f0e6d3]">
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-xs text-gray-500">Prix public:</span>
                          <span className="text-sm text-gray-400 line-through">
                            {rp.normalPrice.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-[#c9a84c]">Votre prix:</span>
                          <span className="text-2xl font-bold text-[#c9a84c]">
                            {rp.resellerPrice.toLocaleString('fr-FR')} <span className="text-sm font-medium">FCFA</span>
                          </span>
                        </div>
                      </div>

                      {/* Bénéfice mis en avant */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700">
                            <TrendingUp className="w-5 h-5" />
                            <span className="text-xs font-medium">Votre bénéfice</span>
                          </div>
                          <span className="text-xl font-bold text-green-700">
                            +{rp.profit.toLocaleString('fr-FR')} F
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-2 text-center">
                          Achetez chez nous, revendez et gagnez <strong>{rp.profit.toLocaleString('fr-FR')} FCFA</strong> par pack !
                        </p>
                      </div>

                      {/* Bouton contact */}
                      <a
                        href={`https://wa.me/221YOUR_NUMBER?text=Bonjour, je suis intéressé(e) par le ${rp.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="magnetic-hover w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-full transition-all duration-500 text-sm tracking-wide bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white hover:shadow-lg hover:shadow-[#c9a84c]/30"
                      >
                        <Users className="w-4 h-4" /> Devenir revendeur
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==========================================================
          SECTION — Témoignage / Citation (image couple en fond)
          ========================================================== */}
      <section className="relative overflow-hidden">
        <div className="reveal-scale">
          <div className="relative h-[500px] sm:h-[600px] overflow-hidden">
            {/* Image de fond couple */}
            <img
              src="/images/feelmecouple.jpeg"
              alt=""
              className="w-full h-full object-cover object-top"
            />
            {/* Overlay premium */}
            <div className="absolute inset-0 bg-black/55" />

            {/* Contenu citation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-3xl mx-auto px-6 sm:px-12 text-center text-white">
                <Sparkles className="w-8 h-8 text-[#e8d48b] mx-auto mb-8" />
                <blockquote className="font-[var(--font-playfair)] text-2xl sm:text-3xl lg:text-5xl italic leading-relaxed mb-8">
                  &ldquo;Un parfum ne se porte pas, il se vit.&rdquo;
                </blockquote>
                <div className="gold-line w-16 mx-auto mb-6" />
                <p className="text-white/50 text-xs sm:text-sm uppercase tracking-[0.3em] font-medium">
                  Feel Me — Les senteurs du paradis
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          SECTION — CTA Final premium
          ========================================================== */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Fond gradient sombre */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1410] via-[#221c14] to-[#0f0d0a]" />
        {/* Effet de brillance en fond */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#c9a84c]/8 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center reveal">
          <Sparkles className="w-6 h-6 text-[#e8d48b] mx-auto mb-6" />
          <h2 className="font-[var(--font-playfair)] text-4xl sm:text-5xl lg:text-6xl font-bold italic text-white mb-5 leading-tight">
            Prêt(e) à vivre<br />l&apos;expérience ?
          </h2>
          <div className="gold-line w-20 mx-auto mb-6" />
          <p className="text-white/50 text-sm sm:text-base mb-10 max-w-lg mx-auto leading-relaxed">
            Commandez votre Musc Tahara Original et laissez-vous envoûter par les senteurs du paradis.
          </p>
          <button
            onClick={scrollToShop}
            className="btn-glow magnetic-hover inline-flex items-center gap-3 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold py-5 px-12 rounded-full text-base tracking-wide"
          >
            <ShoppingBag className="w-5 h-5" />
            Commander maintenant
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
