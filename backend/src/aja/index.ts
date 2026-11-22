/**
 * ============================================
 * FEEL ME - AJA (@ajaflow/sdk 2)
 *
 * Suit https://www.ajaflow.com/documentation/node : une instance Aja,
 * les adaptateurs commandes et produits, la porte GET /aja, start()
 * au démarrage et changed() après chaque enregistrement. Un module
 * éteint côté AJA est ignoré par le SDK lui-même (2.0.1).
 *
 * La clé AJA_KEY (créée par `npx @ajaflow/sdk connect <CODE>`)
 * vit uniquement dans l'environnement du serveur de production.
 * Sans clé, le site fonctionne exactement comme avant : rien n'est
 * envoyé, la porte /aja répond 404.
 * ============================================
 */

import type { RequestHandler } from 'express';
import { Aja } from '@ajaflow/sdk';
import { isVisible, ordersAdapter, type ImageBases } from './orders';
import { packRef, productRef, productsAdapter } from './products';
import type { OrderAttributes } from '../models/Order';
import type { PackAttributes } from '../models/Pack';
import { Pack, Product } from '../models';
import { onStockChanged } from '../stock';

function imageBases(): ImageBases {
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null;
  return { api: process.env.API_URL || railway, front: process.env.FRONT_URL || null };
}

function create(): Aja | null {
  if (!process.env.AJA_KEY) {
    console.log('[aja] AJA_KEY absente : intégration désactivée.');
    return null;
  }
  try {
    const aja = new Aja({ currency: 'XOF', timezone: 'Africa/Dakar' });
    aja.ordersAdapter(ordersAdapter(imageBases));
    aja.productsAdapter(productsAdapter({ bases: imageBases, onProductRenamed: (id) => notify(packsWithProduct(id)) }));
    return aja;
  } catch (error) {
    // Clé absente, abîmée ou d'un ancien format : le site tourne, AJA reste éteint.
    console.error(`[aja] intégration désactivée : ${(error as Error).message}`);
    return null;
  }
}

const aja = create();
onStockChanged((productId) => productChanged(productId));
const door = aja?.door();

/** La porte à laquelle AJA frappe (GET, publique). */
export const ajaDoor: RequestHandler = (req, res, next) => {
  if (!door) return next();
  door(req, res);
};

export function startAja(): void {
  aja?.start();
}

type OrderLike = Pick<OrderAttributes, 'id' | 'source' | 'status' | 'paymentMethod'>;

function plainOrder(order: OrderLike): OrderLike {
  const get = (order as { get?: unknown }).get;
  return typeof get === 'function' ? (order as unknown as { get: (o: { plain: true }) => OrderLike }).get({ plain: true }) : order;
}

/** Vrai si AJA doit connaître cette commande (à lire AVANT de la modifier). */
export function orderShown(order: OrderLike | null | undefined): boolean {
  return !!order && isVisible(plainOrder(order));
}

/**
 * Après chaque enregistrement d'une commande. `wasShown` : la commande était
 * dans AJA avant le changement ; si elle n'y a plus sa place, le SDK lit
 * get() → null et la retire d'AJA.
 */
export function orderChanged(order: OrderLike | null | undefined, wasShown = false): void {
  if (!aja || !order) return;
  const o = plainOrder(order);
  if (wasShown || isVisible(o)) aja.changed('orders', o.id);
}

export function productChanged(id: number | string): void {
  aja?.changed('products', productRef(Number(id)));
}

export function packChanged(id: number | string): void {
  aja?.changed('products', packRef(Number(id)));
}

/** Packs qui contiennent ce parfum : leur « Contenu du pack » affiche son nom. */
export async function packsWithProduct(productId: number | string): Promise<void> {
  if (!aja) return;
  const packs = await Pack.findAll();
  for (const pack of packs) {
    const { id, items } = pack.get({ plain: true }) as PackAttributes;
    if ((items ?? []).some((i) => Number(i.productId) === Number(productId))) packChanged(id);
  }
}

/** Une catégorie renommée ou supprimée : ses parfums et ses packs affichent son nom. */
export async function categoryChanged(categoryId: number | string, ids?: { products: number[]; packs: number[] }): Promise<void> {
  if (!aja) return;
  const found = ids ?? (await catalogueInCategory(categoryId));
  found.products.forEach(productChanged);
  found.packs.forEach(packChanged);
}

/** À lire avant de supprimer une catégorie. */
export async function catalogueInCategory(categoryId: number | string): Promise<{ products: number[]; packs: number[] }> {
  const where = { categoryId: Number(categoryId) };
  const [products, packs] = await Promise.all([
    Product.findAll({ where, attributes: ['id'] }),
    Pack.findAll({ where, attributes: ['id'] }),
  ]);
  return { products: products.map((p) => Number(p.get('id'))), packs: packs.map((p) => Number(p.get('id'))) };
}

/** Pour les routes : ne jamais faire échouer l'admin à cause d'AJA. */
export function notify(work: Promise<unknown>): void {
  work.catch((error) => console.error('[aja] notification impossible :', (error as Error).message));
}
