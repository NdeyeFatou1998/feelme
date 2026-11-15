# Feel Me — Frontend

Next.js 16 (App Router) — boutique + admin UI.

L’API vit sur le backend Railway. Ce front proxy `/api` et `/uploads` via `NEXT_PUBLIC_API_URL` (voir `next.config.ts`).

## Dev

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev
```

## Vercel

1. Root Directory : `front`
2. Variable : `NEXT_PUBLIC_API_URL=https://votre-backend.up.railway.app`
3. Redéployer après changement d’URL API

Repo backend : https://github.com/NdeyeFatou1998/feelmebackend
