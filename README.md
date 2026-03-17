# 🌸 Feel Me - E-commerce de Parfums

Application e-commerce Next.js avec intégration PayTech pour les paiements mobiles (Orange Money, Wave, etc.) au Sénégal.

## ✨ Fonctionnalités

### 🛒 Boutique en ligne
- Catalogue de produits et packs
- Panier d'achat avec localStorage
- Système de packs revendeurs avec calcul de bénéfices
- Catégorisation des produits

### 💳 Paiement sécurisé PayTech
- Intégration complète de l'API PayTech
- Redirection automatique vers la page de paiement
- Commandes créées uniquement après paiement confirmé
- Vérification SHA256 des notifications IPN
- Support Orange Money, Wave, Visa, Mastercard

### 📧 Emails automatiques
- Confirmation de commande avec facture HTML au client
- Notification à l'admin avec détails de commande
- Envoi via SMTP Gmail

### 🎨 Dashboard Admin
- Gestion des produits, packs, catégories
- Gestion des packs revendeurs avec remise flexible (% ou montant fixe)
- Gestion des commandes avec statuts
- Upload d'images
- Authentification JWT

## 🚀 Déploiement sur Vercel

### Prérequis
- Compte Vercel (gratuit)
- Compte PayTech (https://paytech.sn)
- Compte Gmail avec mot de passe d'application
- Base de données PostgreSQL (Vercel Postgres ou autre)

### Étapes de déploiement

1. **Connectez-vous à Vercel** : https://vercel.com

2. **Importez le projet** :
   - Cliquez sur "Add New" → "Project"
   - Importez depuis GitHub (Vercel créera automatiquement le repo)

3. **Configurez les variables d'environnement** :
   ```env
   # Base de données
   DATABASE_URL=postgresql://user:password@host:5432/feelme
   
   # JWT
   JWT_SECRET=votre_secret_jwt_tres_securise
   
   # PayTech
   PAYTECH_API_KEY=votre_api_key
   PAYTECH_API_SECRET=votre_api_secret
   PAYTECH_ENV=test
   
   # SMTP Gmail
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=votre_email@gmail.com
   SMTP_PASS=votre_mot_de_passe_application
   SMTP_FROM=Feel Me <votre_email@gmail.com>
   
   # App URL (sera fourni par Vercel après déploiement)
   APP_URL=https://votre-app.vercel.app
   ```

4. **Déployez** : Cliquez sur "Deploy"

5. **Après le déploiement** :
   - Mettez à jour `APP_URL` avec l'URL Vercel
   - Configurez l'URL IPN dans votre dashboard PayTech : `https://votre-app.vercel.app/api/payment/ipn`

## 🛠️ Installation locale

```bash
# Installer les dépendances
npm install

# Créer .env.local avec vos variables d'environnement
cp .env.example .env.local

# Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **FLUX_PAIEMENT.md** : Documentation complète du flux de paiement PayTech
- **DOCUMENTATION.md** : Documentation technique de l'application

## 🔐 Accès Admin

- URL : `/admin/login`
- Email par défaut : `admin@feelme.com`
- Mot de passe par défaut : `admin123` (à changer en production)

## 🗄️ Base de données

L'application utilise PostgreSQL avec Sequelize ORM. Les tables sont créées automatiquement au premier lancement.

### Tables principales :
- `products` : Produits individuels
- `packs` : Packs de produits
- `reseller_packs` : Packs pour revendeurs
- `categories` : Catégories de produits
- `orders` : Commandes clients
- `admins` : Comptes administrateurs

## 📧 Configuration Gmail

1. Activez la validation en 2 étapes sur votre compte Gmail
2. Générez un "Mot de passe d'application" dans les paramètres de sécurité
3. Utilisez ce mot de passe dans `SMTP_PASS`

## 💰 Configuration PayTech

1. Créez un compte sur https://paytech.sn
2. Récupérez vos clés API dans le dashboard
3. Configurez l'URL IPN : `https://votre-domaine.com/api/payment/ipn`
4. Utilisez `PAYTECH_ENV=test` pour les tests
5. Passez à `PAYTECH_ENV=prod` en production

## 🎨 Technologies

- **Framework** : Next.js 16 (App Router)
- **Base de données** : PostgreSQL + Sequelize
- **Paiement** : PayTech API
- **Emails** : Nodemailer + Gmail SMTP
- **Authentification** : JWT
- **Styling** : Tailwind CSS
- **Icons** : Lucide React

## 📝 Licence

Propriétaire - Feel Me © 2024

## 🌸 Les Senteurs du Paradis

Feel Me - Parfums de qualité supérieure
