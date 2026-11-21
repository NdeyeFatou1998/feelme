/**
 * ============================================
 * FEEL ME - AJA : le catalogue (produits + packs)
 *
 * Le formulaire (putSchema) décrit notre fiche produit ; chaque
 * produit et chaque pack en vente est envoyé avec upsert, sous une
 * référence stable : « produit-12 », « pack-3 ». Un article supprimé
 * ou retiré de la vente est retiré d'AJA (delete).
 * Montants : entiers XOF via toMinor.
 * ============================================
 */

import type { ProductSchema } from '@ajaflow/sdk';
import type { ProductAttributes } from '../models/Product';
import type { PackAttributes } from '../models/Pack';
import { AssetBases, amount, imageUrl } from './mapping';

/** À incrémenter dès que les champs du formulaire changent. */
export const SCHEMA_VERSION = 1;

/**
 * La liste de l'appli montre la première image, le premier texte,
 * le premier prix et le premier nombre dont la key contient « stock ».
 */
export const PRODUCT_SCHEMA: ProductSchema = {
  version: SCHEMA_VERSION,
  fields: [
    { key: 'photo', label: 'Photo', type: 'image' },
    { key: 'nom', label: 'Nom', type: 'text', required: true },
    { key: 'prix', label: 'Prix', type: 'money', required: true },
    { key: 'stock', label: 'Stock', type: 'number' },
    { key: 'prix_promo', label: 'Prix promo', type: 'money' },
    { key: 'type', label: 'Type', type: 'select', options: ['Parfum', 'Pack'] },
    { key: 'categorie', label: 'Catégorie', type: 'text' },
    { key: 'contenance', label: 'Contenance', type: 'text' },
    { key: 'contenu_pack', label: 'Contenu du pack', type: 'textarea' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
};

export const productRef = (id: number | string) => `produit-${id}`;
export const packRef = (id: number | string) => `pack-${id}`;

/** Retire les valeurs vides : un champ absent vaut mieux qu'un faux 0 ou une chaîne vide. */
function compact(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
}

type ProductLike = Pick<
  ProductAttributes,
  'id' | 'name' | 'description' | 'price' | 'promoPrice' | 'image' | 'volume' | 'stock'
>;

export function productValues(
  product: ProductLike,
  categoryName: string | null,
  bases: AssetBases
): Record<string, unknown> {
  return compact({
    photo: imageUrl(product.image, bases),
    nom: product.name,
    prix: amount(product.price),
    stock: product.stock === null || product.stock === undefined ? null : Number(product.stock),
    prix_promo: amount(product.promoPrice),
    type: 'Parfum',
    categorie: categoryName,
    contenance: product.volume,
    description: product.description,
  });
}

type PackLike = Pick<PackAttributes, 'id' | 'name' | 'description' | 'price' | 'promoPrice' | 'image' | 'items'>;

/** « Contenu du pack », une ligne par parfum, avec le nom ACTUEL du parfum (pas celui gardé dans le pack). */
export function packContentsText(
  items: PackLike['items'],
  productNames: Map<number, string> = new Map()
): string {
  return (Array.isArray(items) ? items : [])
    .map((i) => `${Number(i.quantity) || 1} × ${productNames.get(Number(i.productId)) || i.productName || `produit ${i.productId}`}`)
    .join('\n');
}

export function packValues(
  pack: PackLike,
  categoryName: string | null,
  bases: AssetBases,
  productNames: Map<number, string> = new Map()
): Record<string, unknown> {
  const contents = packContentsText(pack.items, productNames);
  return compact({
    photo: imageUrl(pack.image, bases),
    nom: pack.name,
    prix: amount(pack.price),
    prix_promo: amount(pack.promoPrice),
    type: 'Pack',
    categorie: categoryName,
    contenu_pack: contents,
    description: pack.description,
  });
}
