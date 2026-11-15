# Feel Me — Backend API

API Express + TypeScript pour la boutique Feel Me (Sequelize / PostgreSQL).

## Prérequis

- Node.js >= 20
- Une base PostgreSQL (Neon existante, ou Postgres Railway)

## Démarrage local

```bash
cd backend
cp .env.example .env
# Remplir DATABASE_URL, JWT_SECRET, PayTech, SMTP, FRONT_URL, API_URL

npm install
npm run dev
```

Le serveur écoute sur `http://localhost:4000`.

Scripts utiles :

| Script | Description |
|--------|-------------|
| `npm run dev` | Mode watch (`tsx watch`) |
| `npm start` | Démarrage production (`tsx src/index.ts`) |
| `npm run build` | Compile TypeScript vers `dist/` |
| `npm run seed` | Initialise admin / catégories / produits |

---

## 1. Déployer sur Railway

1. Créer un compte sur [railway.app](https://railway.app) et un nouveau projet.
2. **New → GitHub Repo** (ou empty service + upload), pointer le service sur le dossier `backend/` :
   - Root Directory : `backend`
   - Start Command : `npm start` (défini aussi dans `railway.json` / `Procfile`)
3. Ajouter les variables d’environnement (voir checklist ci-dessous).
4. Déployer. Railway expose une URL du type `https://xxx.up.railway.app`.
5. Mettre à jour `API_URL` avec cette URL publique, puis redéployer si besoin.
6. Vérifier : `GET https://votre-backend.up.railway.app/api/health`

> **Astuce** : si vous n’ajoutez pas de Postgres Railway et réutilisez Neon (Option A), vous n’avez rien à migrer.

---

## 2. Migrer les données depuis Vercel / Neon SANS PERTE

### Option A — Réutiliser la même Neon `DATABASE_URL` (recommandé, zéro migration)

C’est l’option la plus sûre et immédiate : Railway pointe vers **exactement** la même base Neon que Vercel.

1. Dans le dashboard Vercel (ou Neon), copier `DATABASE_URL` (chaîne `postgresql://...`).
2. Dans Railway → Variables, coller la **même** valeur dans `DATABASE_URL`.
3. Déployer le backend. Aucun `pg_dump` / `pg_restore`.
4. Une fois le backend validé, pointer le frontend Vercel vers la nouvelle API (`NEXT_PUBLIC_API_URL` ou équivalent).
5. Optionnel : retirer les routes API Next.js plus tard ; la DB reste intacte.

**Avantages** : aucune perte, aucun downtime DB, rollback trivial.

---

### Option B — Copier Neon → Postgres Railway (`pg_dump` / `pg_restore`)

Utilisez cette option si vous voulez héberger la DB sur Railway.

#### Étape 1 — Dump depuis Neon

```bash
# Installer les clients PostgreSQL si besoin (macOS)
# brew install libpq && brew link --force libpq

# Exporter (format custom, recommandé)
pg_dump "$NEON_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  -f feelme_backup.dump

# Ou format SQL plain :
# pg_dump "$NEON_DATABASE_URL" --no-owner --no-acl -f feelme_backup.sql
```

Remplacez `$NEON_DATABASE_URL` par l’URL Neon (souvent avec `?sslmode=require`).

#### Étape 2 — Créer Postgres sur Railway

1. Railway → **New** → **Database** → **PostgreSQL**.
2. Copier la variable `DATABASE_URL` fournie par Railway.

#### Étape 3 — Restore vers Railway

```bash
# Format custom
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  -d "$RAILWAY_DATABASE_URL" \
  feelme_backup.dump

# Ou format SQL :
# psql "$RAILWAY_DATABASE_URL" -f feelme_backup.sql
```

#### Étape 4 — Vérifier

```bash
psql "$RAILWAY_DATABASE_URL" -c "\dt"
psql "$RAILWAY_DATABASE_URL" -c "SELECT COUNT(*) FROM products;"
psql "$RAILWAY_DATABASE_URL" -c "SELECT COUNT(*) FROM orders;"
```

Puis mettre `DATABASE_URL` du service API Railway sur l’URL Postgres Railway et redéployer.

> **Important** : faites le dump pendant une fenêtre calme, ou mettez le site en maintenance le temps du restore pour éviter d’écrire sur Neon pendant la copie.

---

## 3. Checklist des variables d’environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `PORT` | Non (défaut 4000) | Port d’écoute |
| `DATABASE_URL` | **Oui** | PostgreSQL (Neon ou Railway) |
| `JWT_SECRET` | **Oui** | Secret JWT admin |
| `PAYTECH_API_KEY` | Oui (paiements) | Clé API PayTech |
| `PAYTECH_API_SECRET` | Oui (paiements) | Secret PayTech |
| `PAYTECH_ENV` | Non (`test` / `prod`) | Environnement PayTech |
| `SMTP_HOST` | Emails | Ex. `smtp.gmail.com` |
| `SMTP_PORT` | Emails | Ex. `587` |
| `SMTP_USER` | Emails | Compte SMTP |
| `SMTP_PASS` | Emails | Mot de passe / app password |
| `SMTP_FROM` | Non | Expéditeur affiché |
| `API_URL` | **Oui** (prod) | URL publique du backend Railway |
| `FRONT_URL` | **Oui** (prod) | URL du frontend (Vercel) |
| `CORS_ORIGIN` | Non | Origine CORS (sinon = `FRONT_URL`) |

Exemple (voir aussi `.env.example`) :

```env
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=votre_secret_long
PAYTECH_API_KEY=...
PAYTECH_API_SECRET=...
PAYTECH_ENV=prod
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Feel Me <softechiris@gmail.com>
API_URL=https://your-backend.up.railway.app
FRONT_URL=https://feelme-six.vercel.app
CORS_ORIGIN=https://feelme-six.vercel.app
```

---

## 4. Mettre à jour l’URL IPN PayTech

Après déploiement Railway, dans le dashboard PayTech (ou via les URLs envoyées à chaque paiement) :

1. Définir `API_URL=https://votre-backend.up.railway.app` sur Railway.
2. L’IPN générée par l’API est :  
   **`https://votre-backend.up.railway.app/api/payment/ipn`**
3. Les redirections client utilisent `FRONT_URL` :
   - Succès : `{FRONT_URL}/commande/succes?ref=...`
   - Annulation : `{FRONT_URL}/commande/annulee?ref=...`
4. Tester un paiement en `PAYTECH_ENV=test`, puis passer en `prod`.

---

## Routes API

Toutes sous `/api/...` — même contrat que les anciennes routes Next.js :

- `GET /api/health`
- `GET /api/test-db`, `GET /api/test-pg`
- `GET /api/seed`
- `POST /api/auth/login`
- CRUD `/api/categories`, `/api/products`, `/api/packs`, `/api/reseller-packs`
- `GET|POST /api/orders`, `GET|PUT|DELETE /api/orders/:id`
- `POST /api/orders/manual`, `POST /api/orders/confirm`
- `GET /api/orders/:id/invoice`
- `POST /api/payment/ipn`
- `POST /api/upload`
- `GET|PUT /api/settings`
- `GET|POST /api/admins`, `PUT /api/admins/password`
- `GET /api/fix-pack-price`

Les fichiers uploadés sont servis sous `/uploads/...`.
