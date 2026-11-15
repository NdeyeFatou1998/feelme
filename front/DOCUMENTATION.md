# Feel Me - Documentation Technique

## Présentation
Site e-commerce premium mono-produit pour la marque **Feel Me** — *"Les senteurs du paradis"*.
Vente de Musc Tahara Original avec paiement via PayTech.
Design immersif avec images plein écran, sections lifestyle et achat direct.

## Stack Technique
- **Frontend** : Next.js 16 (App Router) + React + TypeScript + TailwindCSS
- **Backend** : API Routes Next.js
- **Base de données** : PostgreSQL + Sequelize ORM
- **Paiement** : PayTech API (redirection)
- **Email** : Nodemailer (SMTP Gmail)
- **Auth admin** : JWT (jsonwebtoken + bcryptjs)
- **Polices** : Playfair Display (titres) + Inter (corps)

## Architecture des dossiers

```
feelme-app/
├── public/
│   └── images/                       # Images produit (servies statiquement)
│       ├── feelmebanniere.jpeg       # Bannière hero (3ml + 6ml)
│       ├── feelme3ml.jpeg            # Produit Musc 3ml
│       ├── feelme6ml.jpeg            # Produit Musc 6ml
│       ├── feelme3mlet6ml.jpeg       # Les 2 formats avec prix
│       ├── feelmecouple.jpeg         # Photo lifestyle couple
│       ├── feelmefemme.jpeg          # Photo lifestyle femme
│       ├── feelmehomme.jpeg          # Photo lifestyle homme
│       └── feelmepack3x3ml.jpeg      # Pack 3 x 3ml
├── src/
│   ├── app/                          # Pages Next.js (App Router)
│   │   ├── page.tsx                  # Page d'accueil immersive (tout-en-un)
│   │   ├── layout.tsx                # Layout global avec CartProvider
│   │   ├── globals.css               # Styles globaux (thème doré/noir)
│   │   ├── boutique/page.tsx         # Redirection → accueil #acheter
│   │   ├── packs/page.tsx            # Redirection → accueil #acheter
│   │   ├── panier/page.tsx           # Page panier
│   │   ├── checkout/page.tsx         # Page commande + paiement
│   │   ├── commande/
│   │   │   ├── succes/page.tsx       # Confirmation commande réussie
│   │   │   └── annulee/page.tsx      # Commande annulée
│   │   ├── admin/
│   │   │   ├── login/page.tsx        # Login admin
│   │   │   └── page.tsx              # Dashboard admin complet
│   │   └── api/                      # API Routes backend
│   │       ├── seed/route.ts         # Initialisation DB
│   │       ├── auth/login/route.ts   # Authentification admin
│   │       ├── categories/           # CRUD catégories
│   │       ├── products/             # CRUD produits
│   │       ├── packs/                # CRUD packs
│   │       ├── orders/               # CRUD commandes
│   │       └── payment/ipn/route.ts  # Webhook PayTech (IPN)
│   ├── components/                   # Composants React réutilisables
│   │   ├── Header.tsx                # Nav fixed, transparent sur hero, scroll-aware
│   │   ├── Footer.tsx                # Pied de page dark premium
│   │   └── ProductCard.tsx           # Carte produit (utilisé dans l'admin)
│   └── lib/                          # Utilitaires et configuration
│       ├── db.ts                     # Connexion Sequelize PostgreSQL
│       ├── auth.ts                   # JWT : génération/vérification
│       ├── cart.tsx                   # Context React du panier (localStorage)
│       ├── email.ts                  # Service email (confirmation + admin)
│       ├── paytech.ts                # Service PayTech (paiement)
│       ├── seed.ts                   # Script d'initialisation (admin, produits)
│       └── models/                   # Modèles Sequelize
│           ├── index.ts              # Export + associations
│           ├── Admin.ts              # Table admins
│           ├── Category.ts           # Table categories
│           ├── Product.ts            # Table products
│           ├── Pack.ts               # Table packs (items en JSON)
│           └── Order.ts              # Table orders (items en JSON)
├── .env.local                        # Variables d'environnement
├── next.config.ts                    # Config Next.js
└── package.json                      # Dépendances
```

## Design du site (v2 — Premium High-Level)

### Animations et effets globaux
- **Scroll-Reveal** : IntersectionObserver ajoute `.visible` aux éléments `.reveal` / `.reveal-left` / `.reveal-right` / `.reveal-scale` quand ils entrent dans le viewport (seuil 15%)
- **Parallax** : L'image hero se déplace plus lentement que le scroll (`scrollY * 0.4`)
- **Shimmer** : Effet de brillance traversant (bande avantages, badge "Meilleure offre")
- **Glassmorphism** : Classes `.glass` et `.glass-light` (backdrop-blur + bordure semi-transparente)
- **Gold-line** : Séparateur doré animé avec gradient qui défile
- **Particules dorées** : 7 points flottants en arrière-plan fixe, 3 vitesses d'animation
- **Btn-glow** : Halo doré pulsant au hover sur les boutons CTA principaux
- **Magnetic-hover** : Scale 1.05 au hover, 0.97 au click sur les boutons
- **Img-zoom** : Scale 1.08 au hover sur les conteneurs d'images

### Page d'accueil (tout-en-un)
1. **Hero fullscreen** — Image `feelmebanniere.jpeg` en fond plein écran avec parallax, overlay gradient multi-couches, titre doré animé (gradient shimmer), ligne dorée animée, badge glassmorphism, scroll indicator animé, boutons CTA avec glow
2. **Bande avantages** — Fond noir avec shimmer, 4 icônes (Authentique, Livraison, Premium, Satisfaction)
3. **Section couple** — Image `feelmecouple.jpeg` (object-position: top) avec reveal-left + badge glassmorphism flottant, texte reveal-right avec icônes dorées
4. **Section Pour Elle / Pour Lui** — 2 colonnes : `feelmefemme.jpeg` (reveal-left) + `feelmehomme.jpeg` (reveal-right), images `object-position: top` pour ne pas couper les visages, overlay gradient bas, tags glassmorphism (Florales, Poudrées, Sensuelles / Boisées, Musquées, Profondes)
5. **Section formats** — Image `feelme3mlet6ml.jpeg` fullwidth cinématique (reveal-scale), overlay gradient directionnel, ligne dorée, bouton glassmorphism
6. **Section boutique** — Grille produits (3ml, 6ml) + packs avec reveal en cascade (reveal-delay-1 à 6), cards avec hover 3D (translateY + scale), badges glassmorphism, boutons avec transition gradient au hover
7. **Citation** — Image `feelmecouple.jpeg` en fond (reveal-scale), overlay sombre, citation Playfair Display italique, ligne dorée
8. **CTA final** — Fond gradient sombre avec glow doré central, texte reveal, bouton glow

### Header (glassmorphism premium)
- Fixed, transparent sur hero → `bg-white/80 backdrop-blur-xl` au scroll (seuil 80px)
- Logo avec sparkle icon au hover, gradient doré sur fond hero
- Liens desktop avec underline animé au hover (trait doré qui s'étend)
- Menu mobile avec slide transition (max-h animé)
- Compteur panier gradient doré avec shadow

### Footer (premium dark)
- Ligne dorée animée en haut (gold-line)
- Glow central subtil en arrière-plan
- Layout 12 colonnes (5+3+4)
- Liens avec trait doré extensible au hover + flèche ArrowUpRight
- Icônes Mail/MapPin dans carrés semi-transparents
- Tags décoratifs (Musc Tahara, Premium, Authentique)

## Base de données PostgreSQL

### Tables
- **admins** : id, email, password (bcrypt hash)
- **categories** : id, name, slug, description, image
- **products** : id, name, slug, description, price, promo_price, image, category_id, volume, stock, is_active
- **packs** : id, name, slug, description, price, promo_price, image, items (JSONB), is_active
- **orders** : id, ref, first_name, last_name, phone, email, address, items (JSONB), total_amount, status, payment_token, payment_method

### Statuts de commande
- `pending` : En attente de paiement
- `paid` : Payée
- `shipped` : Expédiée
- `delivered` : Livrée
- `cancelled` : Annulée

## Compte Admin par défaut
- **Email** : softechiris@gmail.com
- **Password** : Poiuytr123@
- **URL** : http://localhost:3000/admin/login

## Produits initiaux (seed)
1. **Musc Tahara Original 3ml** — 2 000 FCFA (catégorie Musc)
2. **Musc Tahara Original 6ml** — 3 500 FCFA (catégorie Musc)
3. **Pack 3 x Musc Tahara 3ml** — 3 500 FCFA (au lieu de 6 000 FCFA, soit -42%)

## Images utilisées (toutes dans public/images/)
- `feelmebanniere.jpeg` → Hero banner (3ml + 6ml sur plateau)
- `feelme3ml.jpeg` → Carte produit 3ml
- `feelme6ml.jpeg` → Carte produit 6ml
- `feelme3mlet6ml.jpeg` → Section "Deux tailles" avec prix
- `feelmecouple.jpeg` → Section présentation + citation
- `feelmefemme.jpeg` → Galerie lifestyle "Pour elle"
- `feelmehomme.jpeg` → Galerie lifestyle "Pour lui"
- `feelmepack3x3ml.jpeg` → Carte pack 3x3ml

## Fonctionnalités

### Site public (mono-produit)
- Landing page immersive tout-en-un (pas de pages séparées boutique/packs)
- Sections : Hero → Avantages → Couple → Lifestyle → Prix → Achat → Citation → CTA
- Ajout au panier avec feedback visuel ("Ajouté !")
- Panier avec gestion des quantités et prix barré si promo
- Checkout (prénom, nom, téléphone, email, adresse) → paiement PayTech
- Pages succès / annulation de commande

### Dashboard Admin (/admin)
- Tableau de bord avec statistiques (revenus, commandes, produits, catégories)
- CRUD Produits : nom, catégorie, prix, prix promo, volume, stock, image (upload)
- CRUD Catégories : nom, description, image
- CRUD Packs : choix des produits + quantités (ex: 3x Musc 3ml + 2x Musc 6ml)
- Gestion des commandes : vue détaillée dépliable, changement de statut
- Sidebar responsive (burger menu mobile)

### Prix Promo
- Définir un prix promo dans le dashboard admin
- Le site affiche automatiquement le prix barré et le nouveau prix
- Badge PROMO ou pourcentage de réduction sur la carte produit

### Packs configurables
- Choisir les produits à inclure dans chaque pack
- Définir la quantité de chaque produit (ex: 3x Musc 3ml, 2x Musc 6ml)
- Prix du pack avec possibilité de prix promo
- Badge "Meilleure offre" sur les packs

### Emails
- Email de confirmation + facture HTML premium au client après paiement
- Email de notification à l'admin pour chaque nouvelle commande

## API PayTech
- **URL** : https://paytech.sn/api/payment/request-payment
- **Environnement** : test (modifiable via PAYTECH_ENV dans .env.local)
- **IPN** : POST /api/payment/ipn (notification automatique)
- **Vérification** : HMAC-SHA256 + SHA256

## Lancement
```bash
cd feelme-app
npm run dev
# Puis visiter http://localhost:3000
# La DB s'initialise automatiquement au premier chargement (seed)
# Dashboard admin : http://localhost:3000/admin/login
```
