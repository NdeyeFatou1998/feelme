/**
 * ============================================
 * FEEL ME - AJA : le catalogue (parfums + packs)
 *
 * Un seul catalogue dans AJA : chaque parfum (« produit-12 ») et
 * chaque pack (« pack-3 »). Le formulaire décrit notre fiche ; le
 * marchand crée, modifie, change le stock ou supprime depuis l'appli,
 * avec les mêmes règles que l'admin du site.
 * ============================================
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Op } from 'sequelize';
import { Refusal, type Product as AjaProduct, type ProductForm, type ProductsAdapter } from '@ajaflow/sdk';
import { Category, Pack, Product } from '../models';
import type { PackAttributes, PackItem } from '../models/Pack';
import type { ProductAttributes } from '../models/Product';
import { imageUrl, type ImageBases } from './orders';

/** À incrémenter dès que les champs changent. */
export const PRODUCT_FORM: ProductForm = {
  version: 1,
  fields: [
    { key: 'photo', label: 'Photo', type: 'image' },
    { key: 'nom', label: 'Nom', type: 'text', required: true },
    { key: 'prix', label: 'Prix', type: 'money', required: true },
    { key: 'stock', label: 'Stock', type: 'number' },
    { key: 'prix_promo', label: 'Prix promo', type: 'money' },
    { key: 'en_vente', label: 'En vente', type: 'boolean' },
    { key: 'type', label: 'Type', type: 'select', options: ['Parfum', 'Pack'] },
    { key: 'categorie', label: 'Catégorie', type: 'text' },
    { key: 'contenance', label: 'Contenance', type: 'text' },
    { key: 'contenu_pack', label: 'Contenu du pack (une ligne par parfum : « 2 × Nom »)', type: 'textarea' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
};

// ————— références —————

export type Ref = { kind: 'product' | 'pack'; id: number };
export const productRef = (id: number) => `produit-${id}`;
export const packRef = (id: number) => `pack-${id}`;

export function parseRef(ref: string | null | undefined): Ref | null {
  const m = /^(produit|pack)-(\d+)$/.exec(String(ref ?? '').trim());
  return m ? { kind: m[1] === 'pack' ? 'pack' : 'product', id: Number(m[2]) } : null;
}

// ————— site → AJA —————

/** Un champ vide n'est pas envoyé : mieux vaut absent qu'un faux 0. */
const compact = (v: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null && x !== undefined && x !== ''));

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** « Contenu du pack », une ligne par parfum, avec le nom ACTUEL du parfum. */
export function packContentsText(items: PackItem[] | null | undefined, names: Map<number, string> = new Map()): string {
  return (Array.isArray(items) ? items : [])
    .map((i) => `${Number(i.quantity) || 1} × ${names.get(Number(i.productId)) || i.productName || `produit ${i.productId}`}`)
    .join('\n');
}

export function productToAja(p: ProductAttributes, category: string | null, bases: ImageBases): AjaProduct {
  return {
    id: productRef(p.id),
    updatedAt: p.updatedAt as Date,
    values: compact({
      photo: imageUrl(p.image, bases),
      nom: p.name,
      prix: Number(p.price),
      stock: p.stock === null || p.stock === undefined ? null : Number(p.stock),
      prix_promo: p.promoPrice ? Number(p.promoPrice) : null,
      en_vente: !!p.isActive,
      type: 'Parfum',
      categorie: category,
      contenance: p.volume,
      description: p.description,
    }),
  };
}

export function packToAja(
  p: PackAttributes,
  category: string | null,
  bases: ImageBases,
  names: Map<number, string>
): AjaProduct {
  return {
    id: packRef(p.id),
    updatedAt: p.updatedAt as Date,
    values: compact({
      photo: imageUrl(p.image, bases),
      nom: p.name,
      prix: Number(p.price),
      prix_promo: p.promoPrice ? Number(p.promoPrice) : null,
      en_vente: !!p.isActive,
      type: 'Pack',
      categorie: category,
      contenu_pack: packContentsText(p.items, names),
      description: p.description,
    }),
  };
}

// ————— AJA → site —————

/** Ce que le marchand a rempli ; absent = non fourni (une modification peut être partielle). */
export type Incoming = {
  kind?: 'product' | 'pack';
  name?: string;
  price?: number;
  promoPrice?: number | null;
  stock?: number;
  active?: boolean;
  category?: string | null;
  volume?: string | null;
  packContents?: string | null;
  description?: string | null;
  photo?: string | null;
};

const has = (v: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(v, k);

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

/** Montant en francs CFA, entier positif (XOF n'a pas de centimes). */
function money(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, ''));
  if (!Number.isInteger(n) || n < 0) throw new Refusal(`${label} invalide : « ${String(value)} ».`);
  return n;
}

function bool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'oui', 'yes'].includes(fold(String(value)));
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export function readValues(v: Record<string, unknown>): Incoming {
  const out: Incoming = {};
  if (has(v, 'type')) {
    const t = text(v.type);
    if (t === null || fold(t) === 'parfum') out.kind = 'product';
    else if (fold(t) === 'pack') out.kind = 'pack';
    else throw new Refusal(`Type inconnu : « ${t} » (Parfum ou Pack).`);
  }
  if (has(v, 'nom')) {
    const name = text(v.nom);
    if (!name) throw new Refusal('Le nom est obligatoire.');
    out.name = name;
  }
  if (has(v, 'prix')) {
    const price = money(v.prix, 'Prix');
    if (!price) throw new Refusal('Le prix est obligatoire.');
    out.price = price;
  }
  if (has(v, 'prix_promo')) out.promoPrice = money(v.prix_promo, 'Prix promo') || null;
  if (has(v, 'stock') && v.stock !== null && v.stock !== '') {
    const n = typeof v.stock === 'number' ? v.stock : Number(String(v.stock).trim());
    if (!Number.isInteger(n) || n < 0) throw new Refusal(`Stock invalide : « ${String(v.stock)} ».`);
    out.stock = n;
  }
  if (has(v, 'en_vente') && v.en_vente !== null && v.en_vente !== '') out.active = bool(v.en_vente);
  if (has(v, 'categorie')) out.category = text(v.categorie);
  if (has(v, 'contenance')) out.volume = text(v.contenance);
  if (has(v, 'contenu_pack')) out.packContents = text(v.contenu_pack);
  if (has(v, 'description')) out.description = text(v.description);
  if (has(v, 'photo')) out.photo = text(Array.isArray(v.photo) ? v.photo[0] : v.photo);
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

/** Catégorie par son nom ; vide → la première ; inconnue → refus qui liste les catégories. */
export function pickCategory(wanted: string | null | undefined, categories: Array<{ id: number; name: string }>): number {
  if (categories.length === 0) throw new Refusal('Aucune catégorie sur le site : créez-en une dans l’admin.');
  if (!wanted) return categories[0].id;
  const found = categories.find((c) => norm(c.name) === norm(wanted));
  if (!found) throw new Refusal(`Catégorie « ${wanted} » inconnue. Catégories : ${categories.map((c) => c.name).join(', ')}.`);
  return found.id;
}

/**
 * « Contenu du pack » : « 2 × Musc », « 2 x Musc » ou « Musc », une ligne par parfum.
 * `aliases` : anciens noms gardés dans le pack, si un parfum a été renommé depuis.
 */
export function parsePackContents(
  contents: string | null | undefined,
  products: Array<{ id: number; name: string }>,
  aliases: Array<{ id: number; name: string }> = []
): PackItem[] {
  const lines = String(contents ?? '')
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Refusal('Indiquez le contenu du pack, une ligne par parfum : « 2 × Nom ».');
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
      throw new Refusal(`Parfum « ${name} » introuvable pour le pack. Parfums : ${products.map((p) => p.name).join(', ')}.`);
    }
    if (quantity < 1) throw new Refusal(`Quantité invalide pour « ${name} ».`);
    return { productId: product.id, productName: product.name, quantity };
  });
}

/** Une adresse d'image déjà à nous redevient le chemin stocké en base ; sinon null. */
export function ownImagePath(url: string, bases: ImageBases): string | null {
  for (const base of [bases.api, bases.front]) {
    if (!base) continue;
    const prefix = `${base.replace(/\/+$/, '')}/`;
    if (url.startsWith(prefix)) return `/${url.slice(prefix.length)}`;
  }
  return null;
}

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** La photo choisie dans l'appli est copiée dans /uploads (AJA ne la garde que quelques jours). */
export async function downloadImage(url: string): Promise<string> {
  if (!/^https:\/\//i.test(url)) throw new Refusal('La photo doit être une adresse https.');
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new Refusal('Photo inaccessible : le site n’a pas pu la télécharger.');
  }
  if (!response.ok) throw new Refusal(`Photo inaccessible (HTTP ${response.status}).`);
  const ext = IMAGE_TYPES[(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()];
  if (!ext) throw new Refusal('Le fichier de la photo n’est pas une image (JPEG, PNG, WebP, GIF ou AVIF).');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Refusal('La photo est vide.');
  if (buffer.length > 10 * 1024 * 1024) throw new Refusal('La photo dépasse 10 Mo.');
  const dir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-aja-${randomUUID().slice(0, 8)}.${ext}`;
  await fs.promises.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}

// ————— l'adaptateur —————

type Row = { kind: 'product'; data: ProductAttributes } | { kind: 'pack'; data: PackAttributes };

export function productsAdapter(bases: () => ImageBases, download = downloadImage): ProductsAdapter {
  /** Création rejouée avec le même actionId : on rend le même article, pas un doublon. */
  const created = new Map<string, string>();

  const categories = async () =>
    (await Category.findAll({ order: [['id', 'ASC']] })).map((c) => c.get({ plain: true }) as { id: number; name: string });
  const productNames = async () =>
    (await Product.findAll({ order: [['id', 'ASC']] })).map((p) => p.get({ plain: true }) as { id: number; name: string });

  async function context() {
    const [cats, prods] = await Promise.all([categories(), productNames()]);
    return {
      catName: new Map(cats.map((c) => [c.id, c.name])),
      names: new Map(prods.map((p) => [p.id, p.name])),
      bases: bases(),
    };
  }

  function toAja(row: Row, ctx: Awaited<ReturnType<typeof context>>): AjaProduct {
    if (row.kind === 'product') return productToAja(row.data, ctx.catName.get(Number(row.data.categoryId)) ?? null, ctx.bases);
    const cat = row.data.categoryId ? ctx.catName.get(Number(row.data.categoryId)) ?? null : null;
    return packToAja(row.data, cat, ctx.bases, ctx.names);
  }

  async function find(ref: Ref): Promise<Row | null> {
    if (ref.kind === 'product') {
      const r = await Product.findByPk(ref.id);
      return r ? { kind: 'product', data: r.get({ plain: true }) as ProductAttributes } : null;
    }
    const r = await Pack.findByPk(ref.id);
    return r ? { kind: 'pack', data: r.get({ plain: true }) as PackAttributes } : null;
  }

  async function read(id: string): Promise<AjaProduct | null> {
    const ref = parseRef(id);
    if (!ref) return null;
    const row = await find(ref);
    return row ? toAja(row, await context()) : null;
  }

  async function uniqueSlug(model: typeof Product | typeof Pack, name: string, exceptId?: number) {
    const slug = slugify(name) || `article-${Date.now()}`;
    const existing = await (model as typeof Product).findOne({ where: { slug } });
    if (!existing || (exceptId !== undefined && Number(existing.get('id')) === exceptId)) return slug;
    return `${slug}-${Date.now()}`;
  }

  async function image(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    return ownImagePath(url, bases()) ?? (await download(url));
  }

  function mustRef(id: string): Ref {
    const ref = parseRef(id);
    if (!ref) throw new Refusal(`Référence inconnue sur le site : « ${id} ».`);
    return ref;
  }

  return {
    form: PRODUCT_FORM,

    /** Parfums et packs mélangés, du plus ancien changement au plus récent. */
    async list({ since, cursor, limit }) {
      const offset = Number(cursor ?? 0) || 0;
      const where = { updatedAt: { [Op.gte]: new Date(since) } };
      const [products, packs] = await Promise.all([
        Product.findAll({ where, order: [['updatedAt', 'ASC'], ['id', 'ASC']], limit: offset + limit }),
        Pack.findAll({ where, order: [['updatedAt', 'ASC'], ['id', 'ASC']], limit: offset + limit }),
      ]);
      const rows: Row[] = [
        ...products.map((r) => ({ kind: 'product' as const, data: r.get({ plain: true }) as ProductAttributes })),
        ...packs.map((r) => ({ kind: 'pack' as const, data: r.get({ plain: true }) as PackAttributes })),
      ].sort(
        (a, b) =>
          new Date(a.data.updatedAt as Date).getTime() - new Date(b.data.updatedAt as Date).getTime() ||
          a.kind.localeCompare(b.kind) ||
          a.data.id - b.data.id
      );
      const page = rows.slice(offset, offset + limit);
      const ctx = await context();
      return {
        items: page.map((r) => toAja(r, ctx)),
        next: rows.length > offset + limit || page.length === limit ? String(offset + limit) : null,
      };
    },

    async get(id) {
      return read(id);
    },

    async create({ values, actionId }) {
      const already = created.get(actionId);
      if (already) return (await read(already)) ?? { id: already };
      const f = readValues(values);
      if (!f.name) throw new Refusal('Le nom est obligatoire.');
      if (f.price === undefined) throw new Refusal('Le prix est obligatoire.');

      let ref: string;
      if (f.kind === 'pack') {
        const items = parsePackContents(f.packContents, await productNames());
        const pack = await Pack.create({
          name: f.name,
          slug: await uniqueSlug(Pack, f.name),
          description: f.description ?? null,
          price: f.price,
          promoPrice: f.promoPrice ?? null,
          image: await image(f.photo),
          items,
          categoryId: f.category ? pickCategory(f.category, await categories()) : null,
          isActive: f.active ?? true,
        });
        ref = packRef(Number(pack.get('id')));
      } else {
        const categoryId = pickCategory(f.category, await categories());
        const product = await Product.create({
          name: f.name,
          slug: await uniqueSlug(Product, f.name),
          description: f.description ?? null,
          price: f.price,
          promoPrice: f.promoPrice ?? null,
          image: await image(f.photo),
          categoryId,
          volume: f.volume ?? null,
          stock: f.stock ?? 100,
          isActive: f.active ?? true,
        });
        ref = productRef(Number(product.get('id')));
      }
      created.set(actionId, ref);
      return (await read(ref)) ?? { id: ref };
    },

    async update({ id, values }) {
      const ref = mustRef(id);
      const f = readValues(values);
      if (f.kind && f.kind !== ref.kind) {
        throw new Refusal('Un parfum ne peut pas devenir un pack (ni l’inverse) : créez-en un nouveau.');
      }
      const changes: Record<string, unknown> = {};
      if (f.price !== undefined) changes.price = f.price;
      if (f.promoPrice !== undefined) changes.promoPrice = f.promoPrice;
      if (f.description !== undefined) changes.description = f.description;
      if (f.active !== undefined) changes.isActive = f.active;

      if (ref.kind === 'pack') {
        const pack = await Pack.findByPk(ref.id);
        if (!pack) throw new Refusal('Pack introuvable sur le site.');
        if (f.name !== undefined) {
          changes.name = f.name;
          changes.slug = await uniqueSlug(Pack, f.name, ref.id);
        }
        if (f.category !== undefined) changes.categoryId = f.category ? pickCategory(f.category, await categories()) : null;
        if (f.packContents !== undefined) {
          /* AJA renvoie souvent tout le formulaire : un contenu identique à celui du site ne change rien. */
          const products = await productNames();
          const items = (pack.get({ plain: true }) as PackAttributes).items ?? [];
          const names = new Map(products.map((p) => [p.id, p.name]));
          const unchanged = [packContentsText(items, names), packContentsText(items)].some(
            (t) => norm(t) === norm(f.packContents ?? '')
          );
          if (!unchanged) {
            const aliases = items
              .filter((i) => i.productName)
              .map((i) => ({ id: Number(i.productId), name: String(i.productName) }));
            changes.items = parsePackContents(f.packContents, products, aliases);
          }
        }
        if (f.photo !== undefined) changes.image = await image(f.photo);
        if (Object.keys(changes).length) await pack.update(changes);
      } else {
        const product = await Product.findByPk(ref.id);
        if (!product) throw new Refusal('Produit introuvable sur le site.');
        if (f.name !== undefined) {
          changes.name = f.name;
          changes.slug = await uniqueSlug(Product, f.name, ref.id);
        }
        if (f.stock !== undefined) changes.stock = f.stock;
        if (f.volume !== undefined) changes.volume = f.volume;
        if (f.category !== undefined) changes.categoryId = pickCategory(f.category, await categories());
        if (f.photo !== undefined) changes.image = await image(f.photo);
        if (Object.keys(changes).length) await product.update(changes);
      }
      return (await read(id)) ?? undefined;
    },

    async setStock({ id, stock }) {
      const ref = mustRef(id);
      if (ref.kind === 'pack') throw new Refusal('Un pack n’a pas de stock : il dépend de ses parfums.');
      if (!Number.isInteger(stock) || stock < 0) throw new Refusal('Stock invalide.');
      const product = await Product.findByPk(ref.id);
      if (!product) throw new Refusal('Produit introuvable sur le site.');
      await product.update({ stock });
      return (await read(id)) ?? undefined;
    },

    async remove({ id }) {
      const ref = mustRef(id);
      const row = ref.kind === 'pack' ? await Pack.findByPk(ref.id) : await Product.findByPk(ref.id);
      if (row) await row.destroy(); // déjà supprimé : rien à faire
    },
  };
}
