/**
 * ============================================
 * FEEL ME - AJA : décisions produit venues de l'espace AJA
 *
 * Traduit les valeurs du formulaire AJA (clés de PRODUCT_SCHEMA)
 * en champs de nos modèles. Aucune base ici : fonctions pures.
 * Toute valeur inacceptable lève un ShopRefusal, dont le message
 * s'affiche tel quel au marchand.
 * ============================================
 */

import { fromMinor } from '@ajaflow/sdk';
import { ShopRefusal } from './decisions';
import { CURRENCY } from './mapping';

export type CatalogueKind = 'product' | 'pack';
export type CatalogueRef = { kind: CatalogueKind; id: number };

/** « produit-12 » / « pack-3 » → { kind, id } ; null si la référence n'est pas la nôtre. */
export function parseRef(ref: string | null | undefined): CatalogueRef | null {
  const m = /^(produit|pack)-(\d+)$/.exec(String(ref ?? '').trim());
  if (!m) return null;
  return { kind: m[1] === 'pack' ? 'pack' : 'product', id: Number(m[2]) };
}

/** Champs lus dans les valeurs AJA ; absent = non fourni (une mise à jour peut être partielle). */
export type IncomingFields = {
  kind?: CatalogueKind;
  name?: string;
  price?: number;
  promoPrice?: number | null;
  stock?: number;
  volume?: string | null;
  description?: string | null;
  category?: string | null;
  packContents?: string | null;
  photoUrl?: string | null;
};

const has = (values: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(values, key);

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

/** Champ money : entier dans la plus petite unité (XOF = francs) → entier FCFA de notre base. */
function money(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  let decimal: string;
  try {
    decimal = fromMinor(value as number | string, CURRENCY);
  } catch {
    throw new ShopRefusal(`${label} invalide : « ${String(value)} ».`);
  }
  const n = Number(decimal);
  if (!Number.isInteger(n) || n < 0) throw new ShopRefusal(`${label} invalide : « ${String(value)} ».`);
  return n;
}

function wholeNumber(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0) throw new ShopRefusal(`${label} invalide : « ${String(value)} ».`);
  return n;
}

/** Champ image : une adresse, ou une liste d'adresses (on garde la première). */
function photo(value: unknown): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return text(first);
}

export function readValues(values: Record<string, unknown>): IncomingFields {
  const out: IncomingFields = {};
  if (has(values, 'type')) {
    const t = text(values.type)?.toLowerCase();
    if (t === 'pack') out.kind = 'pack';
    else if (t === 'parfum' || t === null) out.kind = 'product';
    else throw new ShopRefusal(`Type inconnu : « ${String(values.type)} » (Parfum ou Pack).`);
  }
  if (has(values, 'nom')) {
    const name = text(values.nom);
    if (!name) throw new ShopRefusal('Le nom est obligatoire.');
    out.name = name;
  }
  if (has(values, 'prix')) {
    const price = money(values.prix, 'Prix');
    if (price === null || price <= 0) throw new ShopRefusal('Le prix est obligatoire.');
    out.price = price;
  }
  if (has(values, 'prix_promo')) out.promoPrice = money(values.prix_promo, 'Prix promo') || null;
  if (has(values, 'stock') && values.stock !== null && values.stock !== '') {
    out.stock = wholeNumber(values.stock, 'Stock');
  }
  if (has(values, 'contenance')) out.volume = text(values.contenance);
  if (has(values, 'description')) out.description = text(values.description);
  if (has(values, 'categorie')) out.category = text(values.categorie);
  if (has(values, 'contenu_pack')) out.packContents = text(values.contenu_pack);
  if (has(values, 'photo')) out.photoUrl = photo(values.photo);
  return out;
}

/** Même règle que les routes de l'admin. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Catégorie par son nom (sans tenir compte des majuscules) ; vide → la première ; inconnue → refus. */
export function pickCategory(
  wanted: string | null | undefined,
  categories: Array<{ id: number; name: string }>
): number {
  if (categories.length === 0) throw new ShopRefusal('Aucune catégorie sur le site : créez-en une dans l’admin.');
  if (!wanted) return categories[0].id;
  const found = categories.find((c) => c.name.trim().toLowerCase() === wanted.trim().toLowerCase());
  if (!found) {
    throw new ShopRefusal(
      `Catégorie « ${wanted} » inconnue. Catégories : ${categories.map((c) => c.name).join(', ')}.`
    );
  }
  return found.id;
}

/**
 * « Contenu du pack », une ligne par parfum : « 2 × Musc », « 2 x Musc » ou « Musc ».
 * C'est le format que le site envoie lui-même à AJA.
 */
export function parsePackContents(
  contents: string | null | undefined,
  products: Array<{ id: number; name: string }>,
  /** Anciens noms connus (ceux gardés dans le pack), si un parfum a été renommé depuis. */
  aliases: Array<{ id: number; name: string }> = []
): Array<{ productId: number; productName: string; quantity: number }> {
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  const lines = String(contents ?? '')
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new ShopRefusal('Indiquez le contenu du pack, une ligne par parfum : « 2 × Nom ».');
  return lines.map((line) => {
    const m = /^(\d+)\s*[×x*]\s*(.+)$/i.exec(line);
    const quantity = m ? Number(m[1]) : 1;
    const name = (m ? m[2] : line).trim();
    let product = products.find((p) => norm(p.name) === norm(name));
    if (!product) {
      const alias = aliases.find((a) => norm(a.name) === norm(name));
      product = alias ? products.find((p) => p.id === alias.id) : undefined;
    }
    if (!product) {
      throw new ShopRefusal(
        `Parfum « ${name} » introuvable pour le pack. Parfums : ${products.map((p) => p.name).join(', ')}.`
      );
    }
    if (quantity < 1) throw new ShopRefusal(`Quantité invalide pour « ${name} ».`);
    return { productId: product.id, productName: product.name, quantity };
  });
}

/**
 * Une adresse d'image déjà à nous (renvoyée telle quelle par AJA) redevient
 * le chemin stocké en base ; sinon null (image externe, à télécharger).
 */
export function ownImagePath(url: string, bases: { api: string | null; front: string | null }): string | null {
  for (const base of [bases.api, bases.front]) {
    if (!base) continue;
    const prefix = `${base.replace(/\/+$/, '')}/`;
    if (url.startsWith(prefix)) return `/${url.slice(prefix.length)}`;
  }
  return null;
}
