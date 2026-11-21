/**
 * ============================================
 * FEEL ME - Intégration AJA (SDK @ajaflow/sdk)
 *
 * - Déclare la boutique (XOF, Africa/Dakar, adresse de réveil)
 *   au démarrage puis chaque jour.
 * - Envoie chaque commande validée (payée, ou saisie par l'admin).
 * - Relève chaque minute, et à chaque réveil, les décisions du
 *   marchand et les applique dans notre base.
 *
 * Clé lue dans AJA_KEY (variable Railway). Sans clé, rien n'est
 * envoyé. Une panne d'AJA ne bloque jamais une vente : chaque
 * appel est dans un try, l'erreur est seulement journalisée.
 * ============================================
 */

import { ApiError, Client, ErrorCode } from '@ajaflow/sdk';
import { Category, Order, Pack, Product, syncDatabase } from '../models';
import type { PackAttributes } from '../models/Pack';
import type { ProductAttributes } from '../models/Product';
import { PRODUCT_SCHEMA, SCHEMA_VERSION, packRef, packValues, productRef, productValues } from './catalogue';
import type { OrderAttributes } from '../models/Order';
import { createSingleFlight, OrderStore, processCommandsOnce } from './decisions';
import { AssetBases, buildOrderInput, CURRENCY, TIMEZONE } from './mapping';
import { allowedNextLabels, DELETED_LABEL, isValidated, paymentStatusOf, statusLabel } from './statuses';

const POLL_INTERVAL_MS = 60_000;
/* Au redéploiement, Railway sert encore l'ancien conteneur quelques secondes :
   on attend avant de se déclarer, pour qu'AJA joigne bien le nouveau. */
const STARTUP_DELAY_MS = 60_000;
const CATALOGUE_PAUSE_MS = 500;
const PROFILE_INTERVAL_MS = 24 * 60 * 60_000;

let client: Client | null = null;

export function ajaEnabled(): boolean {
  return Boolean(process.env.AJA_KEY);
}

export function getAja(): Client | null {
  if (!ajaEnabled()) return null;
  if (!client) client = new Client({ apiKey: process.env.AJA_KEY as string });
  return client;
}

/** Adresse publique du backend (celle déclarée dans AJA). */
export function publicBaseUrl(): string | null {
  const fromEnv = process.env.API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  return railway ? `https://${railway}` : null;
}

/** Adresses publiques d'où partent nos images (backend pour /uploads, front pour le reste). */
export function assetBases(): AssetBases {
  const front = process.env.FRONT_URL?.trim().replace(/\/+$/, '') || null;
  return { api: publicBaseUrl(), front };
}

export function wakeUrl(): string | null {
  const base = publicBaseUrl();
  return base ? `${base}/api/aja/wake` : null;
}

export function logAjaError(context: string, error: unknown): void {
  if (error instanceof ApiError) {
    console.error(`[AJA] ${context} : ${error.code} (requête ${error.requestId ?? '-'}) ${error.message}`);
  } else {
    console.error(`[AJA] ${context} :`, error instanceof Error ? error.message : error);
  }
}

/* ---------- 1. Déclarer la boutique ---------- */

export async function declareShop(): Promise<void> {
  const aja = getAja();
  if (!aja) return;
  const url = wakeUrl();
  if (!url) {
    console.error('[AJA] API_URL manquant : impossible de déclarer l\'adresse de réveil.');
    return;
  }
  try {
    await aja.site.putProfile({ currency: CURRENCY, timezone: TIMEZONE, wakeUrl: url });
    console.log(`[AJA] Boutique déclarée (${CURRENCY}, ${TIMEZONE}, réveil : ${url})`);
  } catch (error) {
    logAjaError('Déclaration de la boutique', error);
  }
}

/* ---------- 2. Envoyer les commandes ---------- */

type OrderLike = { toJSON(): unknown } | OrderAttributes;

function plain(order: OrderLike): OrderAttributes {
  return ('toJSON' in order && typeof order.toJSON === 'function' ? order.toJSON() : order) as OrderAttributes;
}

/** Envoie la commande entière (create remplace tout). Ne lève jamais. */
export async function sendOrder(order: OrderLike): Promise<void> {
  const aja = getAja();
  if (!aja) return;
  const data = plain(order);
  try {
    if (isValidated(data)) {
      await aja.orders.create(buildOrderInput(data, assetBases()));
      console.log(`[AJA] Commande ${data.ref} envoyée (${data.status})`);
    } else if (data.status === 'cancelled') {
      await sendStatus(data);
    }
  } catch (error) {
    logAjaError(`Envoi de la commande ${data.ref}`, error);
  }
}

/** Prévient AJA d'un changement de statut né chez nous. Ne lève jamais. */
export async function sendStatus(order: OrderLike): Promise<void> {
  const aja = getAja();
  if (!aja) return;
  const data = plain(order);
  try {
    await aja.orders.update(String(data.id), {
      status: statusLabel(data.status),
      allowed_next: allowedNextLabels(data.status),
      payment_status: paymentStatusOf(data),
    });
    console.log(`[AJA] Statut de ${data.ref} envoyé : ${data.status}`);
  } catch (error) {
    if (error instanceof ApiError && error.code === ErrorCode.ORDER_NOT_FOUND) {
      /* AJA ne la connaît pas encore : on l'envoie entière si elle est validée. */
      if (isValidated(data)) await sendOrder(data);
      return;
    }
    logAjaError(`Statut de la commande ${data.ref}`, error);
  }
}

/** Commande supprimée par l'admin : AJA n'a pas de suppression, on la ferme sans bouton. */
export async function sendDeleted(order: OrderLike): Promise<void> {
  const aja = getAja();
  if (!aja) return;
  const data = plain(order);
  try {
    await aja.orders.update(String(data.id), { status: DELETED_LABEL, allowed_next: [] });
  } catch (error) {
    if (error instanceof ApiError && error.code === ErrorCode.ORDER_NOT_FOUND) return;
    logAjaError(`Suppression de la commande ${data.ref}`, error);
  }
}

/* ---------- 3. Appliquer les décisions du marchand ---------- */

/* Les champs publics du modèle masquent les getters Sequelize : toujours lire via get(). */
export function readStatus(order: Order): OrderAttributes['status'] {
  return order.get('status') as OrderAttributes['status'];
}

const orderStore: OrderStore = {
  async getStatus(externalId) {
    if (!/^\d+$/.test(externalId)) return null;
    await syncDatabase();
    const order = await Order.findByPk(Number(externalId));
    return order ? readStatus(order) : null;
  },
  async setStatus(externalId, status) {
    const order = await Order.findByPk(Number(externalId));
    if (!order) throw new Error(`Commande ${externalId} disparue pendant la décision`);
    await order.update({ status });
  },
};

export const processCommands = createSingleFlight(async () => {
  const aja = getAja();
  if (!aja) return;
  await processCommandsOnce(aja, orderStore);
});

/* ---------- 4. Le catalogue ---------- */

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Plain<T> = { toJSON(): unknown } | T;
function plainOf<T>(row: Plain<T>): T {
  return (row && typeof (row as any).toJSON === 'function' ? (row as any).toJSON() : row) as T;
}

async function categoryName(categoryId: number | null | undefined): Promise<string | null> {
  if (!categoryId) return null;
  const category = await Category.findByPk(categoryId);
  return category ? ((category.get('name') as string) ?? null) : null;
}

function isProductMissing(error: unknown): boolean {
  return error instanceof ApiError && (error.code === ErrorCode.PRODUCT_NOT_FOUND || error.code === ErrorCode.NOT_FOUND);
}

/** Envoie (ou retire, s'il n'est plus en vente) un produit. Ne lève jamais. */
export async function sendProduct(row: Plain<ProductAttributes>, catName?: string | null): Promise<void> {
  const aja = getAja();
  if (!aja) return;
  const product = plainOf<ProductAttributes>(row);
  try {
    if (!product.isActive) {
      await removeProduct(product.id);
      return;
    }
    const name = catName !== undefined ? catName : await categoryName(product.categoryId);
    await aja.products.upsert(productRef(product.id), productValues(product, name, assetBases()), SCHEMA_VERSION);
  } catch (error) {
    logAjaError(`Envoi du produit ${product.id}`, error);
  }
}

export async function removeProduct(id: number | string): Promise<void> {
  const aja = getAja();
  if (!aja) return;
  try {
    await aja.products.delete(productRef(id));
  } catch (error) {
    if (!isProductMissing(error)) logAjaError(`Retrait du produit ${id}`, error);
  }
}

/** Envoie (ou retire, s'il n'est plus en vente) un pack. Ne lève jamais. */
export async function sendPack(row: Plain<PackAttributes>, catName?: string | null): Promise<void> {
  const aja = getAja();
  if (!aja) return;
  const pack = plainOf<PackAttributes>(row);
  try {
    if (!pack.isActive) {
      await removePack(pack.id);
      return;
    }
    const name = catName !== undefined ? catName : await categoryName(pack.categoryId);
    await aja.products.upsert(packRef(pack.id), packValues(pack, name, assetBases()), SCHEMA_VERSION);
  } catch (error) {
    logAjaError(`Envoi du pack ${pack.id}`, error);
  }
}

export async function removePack(id: number | string): Promise<void> {
  const aja = getAja();
  if (!aja) return;
  try {
    await aja.products.delete(packRef(id));
  } catch (error) {
    if (!isProductMissing(error)) logAjaError(`Retrait du pack ${id}`, error);
  }
}

/** Formulaire puis tout le catalogue, un article toutes les demi-secondes. Rejouable sans risque. */
export const syncCatalogue = createSingleFlight(async () => {
  const aja = getAja();
  if (!aja) return;
  try {
    await aja.products.putSchema(PRODUCT_SCHEMA);
  } catch (error) {
    /* Le marchand règle peut-être le formulaire dans AJA : on envoie quand même les produits. */
    logAjaError('Formulaire produit', error);
  }

  await syncDatabase();
  const categories = new Map<number, string>();
  for (const c of await Category.findAll()) {
    const cat = c.toJSON() as { id: number; name: string };
    categories.set(cat.id, cat.name);
  }

  let sent = 0;
  for (const row of await Product.findAll({ order: [['id', 'ASC']] })) {
    const product = row.toJSON() as ProductAttributes;
    await sendProduct(product, categories.get(product.categoryId) ?? null);
    sent++;
    await pause(CATALOGUE_PAUSE_MS);
  }
  for (const row of await Pack.findAll({ order: [['id', 'ASC']] })) {
    const pack = row.toJSON() as PackAttributes;
    await sendPack(pack, pack.categoryId ? categories.get(pack.categoryId) ?? null : null);
    sent++;
    await pause(CATALOGUE_PAUSE_MS);
  }
  console.log(`[AJA] Catalogue envoyé : ${sent} article(s) traité(s).`);
});

/* ---------- Démarrage ---------- */

export function startAja(): void {
  if (!ajaEnabled()) {
    console.log('[AJA] AJA_KEY absent : intégration désactivée.');
    return;
  }
  console.log('[AJA] Intégration active.');

  const daily = async () => {
    await declareShop();
    await syncCatalogue().catch((error) => logAjaError('Catalogue', error));
  };
  setTimeout(() => void daily(), STARTUP_DELAY_MS).unref();
  setInterval(() => void daily(), PROFILE_INTERVAL_MS).unref();

  const poll = () =>
    processCommands().catch((error) => logAjaError('Relevé des décisions', error));
  setTimeout(poll, 5_000).unref();
  setInterval(poll, POLL_INTERVAL_MS).unref();
}
