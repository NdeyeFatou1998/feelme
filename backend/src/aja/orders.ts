/**
 * ============================================
 * FEEL ME - AJA : les commandes
 *
 * Ce que le SDK ne peut pas deviner : quelles commandes montrer,
 * comment les lire, et comment appliquer le statut choisi par le
 * marchand dans l'appli. Le reste (synchro, signatures, reprises)
 * est fait par @ajaflow/sdk.
 * ============================================
 */

import { Op, WhereOptions } from 'sequelize';
import { Refusal, type Order as AjaOrder, type OrdersAdapter } from '@ajaflow/sdk';
import { Order } from '../models';
import type { OrderAttributes } from '../models/Order';

type Status = OrderAttributes['status'];

/** Nos statuts, tels que le marchand les lit dans l'appli. */
export const STATUS_LABELS: Record<Status, string> = {
  pending: 'En attente',
  paid: 'Payée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

/** Même enchaînement que l'admin du site. */
const NEXT: Record<Status, Status[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** « Expédiée », « expediee » ou « shipped » → 'shipped' ; inconnu → null. */
export function parseStatus(value: string): Status | null {
  const wanted = fold(value);
  for (const key of Object.keys(STATUS_LABELS) as Status[]) {
    if (fold(key) === wanted || fold(STATUS_LABELS[key]) === wanted) return key;
  }
  return null;
}

const MANUAL_EMAIL = 'non-fourni@manual.fm';

/**
 * Commandes montrées au marchand : celles saisies dans l'admin, et celles
 * du site une fois payées. Une commande du site jamais payée (paiement
 * abandonné ou refusé par PayTech) reste hors d'AJA.
 */
export function isVisible(o: Pick<OrderAttributes, 'source' | 'status' | 'paymentMethod'>): boolean {
  if (o.source === 'manual') return true;
  if (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') return true;
  return o.status === 'cancelled' && !!o.paymentMethod;
}

const VISIBLE: WhereOptions = {
  [Op.or]: [
    { source: 'manual' },
    { status: { [Op.in]: ['paid', 'shipped', 'delivered'] } },
    { status: 'cancelled', paymentMethod: { [Op.ne]: null } },
  ],
};

export type ImageBases = { api: string | null; front: string | null };

/** « /images/x.jpg » vit sur le front, « /uploads/x.jpg » sur le backend ; AJA veut une adresse https complète. */
export function imageUrl(url: string | null | undefined, bases: ImageBases): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.replace(/^\/+/, '');
  const base = path.startsWith('uploads/') ? bases.api : bases.front;
  return base ? `${base.replace(/\/+$/, '')}/${path}` : null;
}

export function toAjaOrder(o: OrderAttributes, bases: ImageBases): AjaOrder {
  const lines = (Array.isArray(o.items) ? o.items : []).map((i) => {
    const image = imageUrl(i.image, bases);
    const extras: Record<string, unknown> = {};
    if (image) extras.image_url = image;
    if (i.type === 'pack') extras.type = 'Pack';
    return {
      name: i.name,
      quantity: Number(i.quantity) || 1,
      unitPrice: Number(i.unitPrice) || 0,
      ...(Object.keys(extras).length ? { extras } : {}),
    };
  });
  if (lines.length === 0) lines.push({ name: `Commande ${o.ref}`, quantity: 1, unitPrice: Number(o.totalAmount) || 0 });

  const extras: Record<string, unknown> = { reference: o.ref, origine: o.source === 'manual' ? 'Admin' : 'Site' };
  if (o.address && o.address !== 'Non précisée') extras.adresse_livraison = o.address;
  if (o.notes) extras.notes = o.notes;
  if (Number(o.deposit) > 0) {
    extras.acompte = Number(o.deposit);
    extras.reste_a_payer = Number(o.remaining) || 0;
  }

  const name = [o.firstName, o.lastName].map((s) => (s ?? '').trim()).filter(Boolean).join(' ');
  return {
    id: o.id,
    updatedAt: o.updatedAt as Date,
    status: STATUS_LABELS[o.status] ?? o.status,
    allowedNext: (NEXT[o.status] ?? []).map((s) => STATUS_LABELS[s]),
    paymentStatus: o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered' ? 'paid' : 'pending',
    paymentMode: o.paymentMethod,
    total: Number(o.totalAmount) || 0,
    currency: 'XOF',
    customer: {
      name: name || null,
      phone: o.phone || null,
      email: o.email && o.email !== MANUAL_EMAIL ? o.email : null,
    },
    lines,
    extras,
  };
}

const plain = (row: Order) => row.get({ plain: true }) as OrderAttributes;

export function ordersAdapter(bases: () => ImageBases): OrdersAdapter {
  return {
    async list({ since, cursor, limit }) {
      const offset = Number(cursor ?? 0) || 0;
      const rows = await Order.findAll({
        where: { [Op.and]: [{ updatedAt: { [Op.gte]: new Date(since) } }, VISIBLE] },
        order: [['updatedAt', 'ASC'], ['id', 'ASC']],
        offset,
        limit,
      });
      const b = bases();
      return {
        items: rows.map((r) => toAjaOrder(plain(r), b)),
        next: rows.length === limit ? String(offset + limit) : null,
      };
    },

    async get(id) {
      const row = await Order.findByPk(Number(id));
      if (!row) return null;
      const o = plain(row);
      return isVisible(o) ? toAjaOrder(o, bases()) : null;
    },

    async changeStatus({ id, status }) {
      const row = await Order.findByPk(Number(id));
      if (!row) throw new Refusal('Commande introuvable sur le site.');
      const current = plain(row).status;
      const target = parseStatus(status);
      if (!target) throw new Refusal(`Statut inconnu : « ${status} ».`);
      if (target !== current) {
        if (!NEXT[current].includes(target)) {
          throw new Refusal(`Impossible de passer de « ${STATUS_LABELS[current]} » à « ${STATUS_LABELS[target]} ».`);
        }
        await row.update({ status: target });
      }
      return toAjaOrder(plain(row), bases());
    },
  };
}
