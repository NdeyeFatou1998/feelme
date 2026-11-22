/**
 * ============================================
 * FEEL ME - Stock des parfums
 *
 * Une commande payée (payée, expédiée ou livrée) retire du stock :
 * chaque parfum commandé, et chaque parfum contenu dans un pack
 * commandé. Si elle repasse en attente ou est annulée, le stock est
 * remis. Chaque commande ne compte qu'une fois : ce qui a été retiré
 * est noté dans la table stock_moves (une ligne par commande).
 *
 * La rupture n'empêche jamais une commande : le stock peut passer
 * sous zéro (ce qu'il manque), et un mail d'info part à l'admin.
 * ============================================
 */

import { DataTypes, Model, UniqueConstraintError } from 'sequelize';
import sequelize from './db';
import { Order, Pack, Product } from './models';
import type { OrderAttributes, OrderItem } from './models/Order';
import type { PackItem } from './models/Pack';
import { sendStockAlertEmail } from './email';

export type Need = { productId: number; quantity: number };

class StockMove extends Model {}

StockMove.init(
  {
    orderId: { type: DataTypes.INTEGER, primaryKey: true, field: 'order_id' },
    needs: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  },
  { sequelize, tableName: 'stock_moves', timestamps: true }
);

let ready: Promise<unknown> | null = null;
function ensureTable(): Promise<unknown> {
  ready ??= StockMove.sync().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

/** Après chaque changement de stock (pour prévenir AJA). */
let listener: (productId: number) => void = () => {};
export function onStockChanged(fn: (productId: number) => void): void {
  listener = fn;
}

const HELD: OrderAttributes['status'][] = ['paid', 'shipped', 'delivered'];

/**
 * Le stock n'est géré que pour les commandes créées à partir de ce jour.
 * Les anciennes commandes (déjà comptées à la main) ne retirent rien quand
 * on change leur statut, par exemple en passant une vieille commande en « Livrée ».
 */
export const STOCK_SINCE = new Date('2026-11-22T00:00:00Z');
export const holdsStock = (status: OrderAttributes['status']) => HELD.includes(status);

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Ce qu'une commande retire, parfum par parfum. Un article se reconnaît
 * par son id (commandes du site) ou, à défaut, par son nom (commandes
 * saisies à la main dans l'admin, où l'id vaut 0).
 */
export function stockNeeds(
  items: OrderItem[] | null | undefined,
  products: Array<{ id: number; name: string }>,
  packs: Array<{ id: number; name: string; items: PackItem[] }>
): { needs: Need[]; unknown: string[] } {
  const total = new Map<number, number>();
  const unknown: string[] = [];
  const add = (productId: number, quantity: number) =>
    total.set(productId, (total.get(productId) ?? 0) + quantity);

  for (const item of Array.isArray(items) ? items : []) {
    const quantity = Math.max(0, Math.trunc(Number(item.quantity) || 0));
    if (quantity === 0) continue;
    const id = Number(item.itemId) || 0;
    const byName = (list: Array<{ id: number; name: string }>) =>
      list.find((x) => norm(x.name) === norm(String(item.name ?? '')));

    if (item.type === 'pack') {
      const pack = packs.find((p) => p.id === id) ?? byName(packs) as (typeof packs)[number] | undefined;
      if (!pack) {
        unknown.push(item.name);
        continue;
      }
      for (const inside of pack.items ?? []) {
        add(Number(inside.productId), quantity * (Math.trunc(Number(inside.quantity)) || 1));
      }
    } else {
      const product = (id && products.find((p) => p.id === id)) || byName(products);
      if (product) {
        add(product.id, quantity);
        continue;
      }
      const pack = byName(packs) as (typeof packs)[number] | undefined; // « 2x Pack 3 x Musc » saisi à la main
      if (!pack) {
        unknown.push(item.name);
        continue;
      }
      for (const inside of pack.items ?? []) {
        add(Number(inside.productId), quantity * (Math.trunc(Number(inside.quantity)) || 1));
      }
    }
  }
  return { needs: [...total].map(([productId, quantity]) => ({ productId, quantity })), unknown };
}

type Changed = { id: number; name: string; stock: number; quantity: number };
type Outcome = { order: OrderAttributes; taken: Changed[]; restored: number[]; unknown: string[] };

/**
 * Tout se décide dans une seule transaction, la commande verrouillée :
 * deux changements de statut rapprochés (IPN + confirmation, admin, AJA)
 * passent l'un après l'autre et lisent chacun le statut à jour.
 * Les parfums sont verrouillés par id croissant (jamais d'interblocage).
 */
async function apply(orderId: number, mode: 'status' | 'release'): Promise<Outcome | null> {
  return sequelize.transaction(async (transaction) => {
    const row = await Order.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) return null;
    const order = row.get({ plain: true }) as OrderAttributes;
    if (order.createdAt && new Date(order.createdAt) < STOCK_SINCE) return null;
    const move = await StockMove.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
    const hold = mode === 'status' && holdsStock(order.status);

    if (hold && !move) {
      const [products, packs] = await Promise.all([
        Product.findAll({ attributes: ['id', 'name'], transaction }),
        Pack.findAll({ attributes: ['id', 'name', 'items'], transaction }),
      ]);
      const { needs, unknown } = stockNeeds(
        order.items,
        products.map((p) => p.get({ plain: true }) as { id: number; name: string }),
        packs.map((p) => p.get({ plain: true }) as { id: number; name: string; items: PackItem[] })
      );
      needs.sort((x, y) => x.productId - y.productId);
      await StockMove.create({ orderId, needs }, { transaction });
      const taken: Changed[] = [];
      for (const need of needs) {
        const product = await Product.findByPk(need.productId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!product) continue; // parfum supprimé depuis
        await product.decrement('stock', { by: need.quantity, transaction });
        await product.reload({ transaction });
        const p = product.get({ plain: true }) as { id: number; name: string; stock: number };
        taken.push({ id: p.id, name: p.name, stock: Number(p.stock), quantity: need.quantity });
      }
      return { order, taken, restored: [], unknown };
    }

    if (!hold && move) {
      const needs = [...((move.get('needs') as Need[]) ?? [])].sort((x, y) => x.productId - y.productId);
      await move.destroy({ transaction });
      for (const need of needs) {
        await Product.increment('stock', { by: need.quantity, where: { id: need.productId }, transaction });
      }
      return { order, taken: [], restored: needs.map((n) => n.productId), unknown: [] };
    }
    return null; // déjà à jour
  });
}

const isDeadlock = (error: unknown) =>
  (error as { parent?: { code?: string } })?.parent?.code === '40P01' ||
  (error as { original?: { code?: string } })?.original?.code === '40P01';

async function run(orderId: number, mode: 'status' | 'release'): Promise<void> {
  await ensureTable();
  let outcome: Outcome | null = null;
  for (let attempt = 1; ; attempt++) {
    try {
      outcome = await apply(orderId, mode);
      break;
    } catch (error) {
      if (error instanceof UniqueConstraintError) return; // déjà retiré pour cette commande
      if (isDeadlock(error) && attempt < 3) continue;
      throw error;
    }
  }
  if (!outcome) return;
  const { order, taken, restored, unknown } = outcome;
  if (unknown.length) console.warn(`[STOCK] ${order.ref} : article(s) non reconnu(s), stock inchangé : ${unknown.join(', ')}`);
  if (taken.length) {
    console.log(`[STOCK] ${order.ref} : ${taken.map((p) => `${p.name} −${p.quantity} → ${p.stock}`).join(', ')}`);
    taken.forEach((p) => listener(p.id));
    const out = taken.filter((p) => p.stock <= 0);
    if (out.length) await sendStockAlertEmail(order, out);
  }
  if (restored.length) {
    console.log(`[STOCK] ${order.ref} : stock remis (${restored.length} parfum(s)).`);
    restored.forEach((id) => listener(id));
  }
}

/** À appeler après chaque enregistrement d'une commande : retire ou remet le stock selon son statut. */
export function syncOrderStock(orderId: number | string): Promise<void> {
  return run(Number(orderId), 'status');
}

/**
 * Avant de supprimer une commande : une commande payée mais pas encore
 * expédiée rend son stock (elle est souvent supprimée pour être ressaisie).
 * Une commande expédiée ou livrée garde son stock retiré : les parfums sont partis.
 */
export async function releaseBeforeDelete(order: Pick<OrderAttributes, 'id' | 'status'>): Promise<void> {
  if (order.status !== 'paid') return;
  await run(Number(order.id), 'release');
}

/** Pour les routes : ne jamais faire échouer une commande à cause du stock. */
export function updateStock(orderId: number | string | null | undefined): void {
  if (orderId === null || orderId === undefined) return;
  syncOrderStock(orderId).catch((error) =>
    console.error(`[STOCK] commande ${orderId} : mise à jour du stock impossible :`, (error as Error).message)
  );
}
