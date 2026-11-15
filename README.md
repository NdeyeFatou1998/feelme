# Feel Me

Boutique e-commerce de parfums — front (Vercel) + backend (Railway).

```
feelme/
├── front/      # Next.js — UI boutique + admin (déployé sur Vercel)
└── backend/    # Express API — DB, PayTech, emails (déployé sur Railway)
                # Repo dédié : https://github.com/NdeyeFatou1998/feelmebackend
```

## Architecture

| Couche | Hébergement | Rôle |
|--------|-------------|------|
| Frontend | Vercel | Pages, panier, admin UI |
| Backend | Railway | API `/api/*`, uploads, IPN PayTech |
| PostgreSQL | Neon (actuel) ou Railway Postgres | Produits, commandes, admins |

Le front proxy `/api` et `/uploads` vers `NEXT_PUBLIC_API_URL`.

## Données : ne rien perdre

Voir le guide détaillé dans [`backend/README.md`](backend/README.md).

**Recommandé (zéro risque)** : coller la **même** `DATABASE_URL` Neon/Vercel dans Railway. Aucun export/import.

**Sinon** : `pg_dump` depuis Neon → `pg_restore` vers Postgres Railway (commandes dans le README backend).

## Dev local

```bash
# Terminal 1 — API
cd backend && cp .env.example .env   # remplir DATABASE_URL, etc.
npm install && npm run dev          # :4000

# Terminal 2 — Front
cd front && cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000
npm install && npm run dev          # :3000
```

## Déploiement

1. **Backend** → push sur [feelmebackend](https://github.com/NdeyeFatou1998/feelmebackend) → déployer sur Railway
2. Copier `DATABASE_URL` depuis Vercel/Neon vers Railway (Option A)
3. Variables Railway : `JWT_SECRET`, PayTech, SMTP, `API_URL`, `FRONT_URL`
4. PayTech IPN : `https://VOTRE-BACKEND.up.railway.app/api/payment/ipn`
5. **Front** Vercel : Root Directory = `front` + une seule variable `NEXT_PUBLIC_API_URL=https://VOTRE-BACKEND.up.railway.app`
   - Retirer de Vercel : `DATABASE_URL`, `JWT_SECRET`, PayTech, SMTP (tout ça est sur Railway)
