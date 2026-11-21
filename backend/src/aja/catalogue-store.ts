/**
 * ============================================
 * FEEL ME - AJA : appliquer en base les décisions produit
 *
 * Création, modification, stock et suppression d'un produit
 * (« produit-<id> ») ou d'un pack (« pack-<id> ») décidés dans
 * l'espace AJA. Mêmes règles que l'admin : un produit a un nom,
 * un prix et une catégorie ; un pack a un nom, un prix et au moins
 * un parfum. La photo envoyée par AJA (gardée quelques jours chez
 * lui) est téléchargée dans /uploads.
 * ============================================
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Category, Pack, Product, syncDatabase } from '../models';
import type { PackItem } from '../models/Pack';
import { CataloguePort, ShopRefusal } from './decisions';
import type { AssetBases } from './mapping';
import { packRef, productRef } from './catalogue';
import {
  CatalogueRef,
  IncomingFields,
  ownImagePath,
  parsePackContents,
  parseRef,
  pickCategory,
  readValues,
  slugify,
} from './product-commands';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** Télécharge une photo https dans /uploads ; rend le chemin stocké en base (« /uploads/… »). */
export async function downloadImage(url: string): Promise<string> {
  if (!/^https:\/\//i.test(url)) throw new ShopRefusal('La photo doit être une adresse https.');
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: 'follow' });
  } catch {
    throw new ShopRefusal('Photo inaccessible : le site n’a pas pu la télécharger.');
  }
  if (!response.ok) throw new ShopRefusal(`Photo inaccessible (HTTP ${response.status}).`);
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = IMAGE_TYPES[type];
  if (!ext) throw new ShopRefusal('Le fichier de la photo n’est pas une image (JPEG, PNG, WebP, GIF ou AVIF).');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new ShopRefusal('La photo est vide.');
  if (buffer.length > MAX_IMAGE_BYTES) throw new ShopRefusal('La photo dépasse 10 Mo.');

  const dir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-aja-${randomUUID().slice(0, 8)}.${ext}`;
  await fs.promises.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}

type Deps = {
  bases: () => AssetBases;
  /** Après chaque création ou modification : renvoyer l'article à AJA sous la même référence. */
  onChanged: (ref: CatalogueRef) => void;
  download?: (url: string) => Promise<string>;
};

export function createCatalogueStore(deps: Deps): CataloguePort {
  const download = deps.download ?? downloadImage;
  /** Création rejouée (ack perdu) : on rend la même référence au lieu d'un doublon. */
  const created = new Map<string, string>();

  async function imagePath(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    return ownImagePath(url, deps.bases()) ?? (await download(url));
  }

  async function categories() {
    return (await Category.findAll({ order: [['id', 'ASC']] })).map((c) => c.toJSON() as { id: number; name: string });
  }

  async function productList() {
    return (await Product.findAll({ order: [['id', 'ASC']] })).map((p) => p.toJSON() as { id: number; name: string });
  }

  async function uniqueSlug(model: typeof Product | typeof Pack, name: string, exceptId?: number) {
    const slug = slugify(name) || `article-${Date.now()}`;
    const existing = await (model as typeof Product).findOne({ where: { slug } });
    if (!existing || (exceptId !== undefined && Number(existing.get('id')) === exceptId)) return slug;
    return `${slug}-${Date.now()}`;
  }

  function mustRef(externalId: string | null): CatalogueRef {
    const ref = parseRef(externalId);
    if (!ref) throw new ShopRefusal(`Référence inconnue sur le site : « ${externalId ?? ''} ».`);
    return ref;
  }

  return {
    async create(values, commandId) {
      const already = created.get(commandId);
      if (already) return already;
      await syncDatabase();
      const f = readValues(values);
      if (!f.name) throw new ShopRefusal('Le nom est obligatoire.');
      if (f.price === undefined) throw new ShopRefusal('Le prix est obligatoire.');

      let ref: CatalogueRef;
      if (f.kind === 'pack') {
        const items = parsePackContents(f.packContents, await productList());
        const image = await imagePath(f.photoUrl);
        const pack = await Pack.create({
          name: f.name,
          slug: await uniqueSlug(Pack, f.name),
          description: f.description ?? null,
          price: f.price,
          promoPrice: f.promoPrice ?? null,
          image,
          items: items as PackItem[],
          categoryId: f.category ? pickCategory(f.category, await categories()) : null,
          isActive: true,
        });
        ref = { kind: 'pack', id: Number(pack.get('id')) };
      } else {
        const categoryId = pickCategory(f.category, await categories());
        const image = await imagePath(f.photoUrl);
        const product = await Product.create({
          name: f.name,
          slug: await uniqueSlug(Product, f.name),
          description: f.description ?? null,
          price: f.price,
          promoPrice: f.promoPrice ?? null,
          image,
          categoryId,
          volume: f.volume ?? null,
          stock: f.stock ?? 100,
          isActive: true,
        });
        ref = { kind: 'product', id: Number(product.get('id')) };
      }
      const externalId = ref.kind === 'pack' ? packRef(ref.id) : productRef(ref.id);
      created.set(commandId, externalId);
      deps.onChanged(ref);
      return externalId;
    },

    async update(externalId, values) {
      const ref = mustRef(externalId);
      await syncDatabase();
      const f: IncomingFields = readValues(values);
      if (f.kind && f.kind !== ref.kind) {
        throw new ShopRefusal('Un parfum ne peut pas devenir un pack (ni l’inverse) : créez-en un nouveau.');
      }
      const changes: Record<string, unknown> = {};
      if (ref.kind === 'pack') {
        const pack = await Pack.findByPk(ref.id);
        if (!pack) throw new ShopRefusal('Pack introuvable sur le site.');
        if (f.name !== undefined) {
          changes.name = f.name;
          changes.slug = await uniqueSlug(Pack, f.name, ref.id);
        }
        if (f.price !== undefined) changes.price = f.price;
        if (f.promoPrice !== undefined) changes.promoPrice = f.promoPrice;
        if (f.description !== undefined) changes.description = f.description;
        if (f.category !== undefined) changes.categoryId = f.category ? pickCategory(f.category, await categories()) : null;
        if (f.packContents !== undefined) changes.items = parsePackContents(f.packContents, await productList());
        if (f.photoUrl !== undefined) changes.image = await imagePath(f.photoUrl);
        if (Object.keys(changes).length) await pack.update(changes);
      } else {
        const product = await Product.findByPk(ref.id);
        if (!product) throw new ShopRefusal('Produit introuvable sur le site.');
        if (f.name !== undefined) {
          changes.name = f.name;
          changes.slug = await uniqueSlug(Product, f.name, ref.id);
        }
        if (f.price !== undefined) changes.price = f.price;
        if (f.promoPrice !== undefined) changes.promoPrice = f.promoPrice;
        if (f.stock !== undefined) changes.stock = f.stock;
        if (f.volume !== undefined) changes.volume = f.volume;
        if (f.description !== undefined) changes.description = f.description;
        if (f.category !== undefined) changes.categoryId = pickCategory(f.category, await categories());
        if (f.photoUrl !== undefined) changes.image = await imagePath(f.photoUrl);
        if (Object.keys(changes).length) await product.update(changes);
      }
      deps.onChanged(ref);
    },

    async setStock(externalId, stock) {
      const ref = mustRef(externalId);
      if (ref.kind === 'pack') throw new ShopRefusal('Un pack n’a pas de stock : il dépend de ses parfums.');
      if (stock === null || !Number.isInteger(stock) || stock < 0) throw new ShopRefusal('Stock invalide.');
      await syncDatabase();
      const product = await Product.findByPk(ref.id);
      if (!product) throw new ShopRefusal('Produit introuvable sur le site.');
      await product.update({ stock });
      deps.onChanged(ref);
    },

    async remove(externalId) {
      const ref = mustRef(externalId);
      await syncDatabase();
      const row = ref.kind === 'pack' ? await Pack.findByPk(ref.id) : await Product.findByPk(ref.id);
      if (row) await row.destroy(); // déjà supprimé : rien à faire, la décision est confirmée
    },
  };
}
