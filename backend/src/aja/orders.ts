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
import { Refusal, type Order as AjaOrder, type OrderPayment, type OrdersAdapter } from '@ajaflow/sdk';
import { Order } from '../models';
import type { OrderAttributes } from '../models/Order';
import { updateStock } from '../stock';
import { generateInvoicePDF, loadCompanyInfo } from '../invoice';

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
 * Ce que feel-me sait du paiement : le texte « Mode de paiement » (renvoyé
 * par PayTech, ou choisi dans l'admin) et, pour un paiement en ligne, le
 * jeton PayTech. Rien d'autre (jamais de carte) : on n'envoie que cela,
 * et un moyen qu'on ne sait pas classer part sans `method`.
 */
const PAYMENT_WORDS: Array<{ match: RegExp; method?: NonNullable<OrderPayment['method']>; provider?: string; label?: string }> = [
  { match: /^wave$/, method: 'mobile_money', provider: 'Wave' },
  { match: /^(orange[ -]?money|om)$/, method: 'mobile_money', provider: 'Orange Money' },
  { match: /^free[ -]?money$/, method: 'mobile_money', provider: 'Free Money' },
  { match: /^(e-?money|expresso)$/, method: 'mobile_money', provider: 'E-Money' },
  { match: /^wizall/, method: 'mobile_money', provider: 'Wizall' },
  { match: /^visa$/, method: 'card', provider: 'Visa' },
  { match: /^master ?card$/, method: 'card', provider: 'Mastercard' },
  { match: /^(carte( bancaire)?|cb|card|credit card)$/, method: 'card', label: 'Carte bancaire' },
  { match: /^paypal$/, method: 'other', provider: 'PayPal' },
  { match: /^virement( bancaire)?$/, method: 'bank_transfer', label: 'Virement bancaire' },
  { match: /^(paytech|paiement en ligne)$/, provider: 'PayTech', label: 'Paiement en ligne' },
  { match: /^especes$/, label: 'Espèces' },
  { match: /^telephone$/, label: 'Téléphone' },
  { match: /^autre$/, method: 'other', label: 'Autre' },
];

export function toAjaPayment(o: Pick<OrderAttributes, 'paymentMethod' | 'paymentToken'>): OrderPayment | null {
  const text = (o.paymentMethod ?? '').trim().replace(/\s+/g, ' ');
  const reference = o.paymentToken?.trim() || null;
  if (!text) return reference ? { provider: 'PayTech', reference } : null;
  const known = PAYMENT_WORDS.find((w) => w.match.test(fold(text)));
  const payment: OrderPayment = { label: known?.label ?? text };
  if (known?.method) payment.method = known.method;
  if (known?.provider) payment.provider = known.provider;
  if (reference) payment.reference = reference;
  return payment;
}

/**
 * Commandes montrées au marchand : celles saisies dans l'admin, et celles
 * du site une fois payées. Une commande du site jamais payée (paiement
 * abandonné ou refusé par PayTech) reste hors d'AJA.
 */
export function isVisible(o: Pick<OrderAttributes, 'source' | 'status' | 'paymentMethod'>): boolean {
  if (o.source === 'manual') return true;
  if (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') return true;
  return o.status === 'cancelled' && !!o.paymentMethod?.trim();
}

const VISIBLE: WhereOptions = {
  [Op.or]: [
    { source: 'manual' },
    { status: { [Op.in]: ['paid', 'shipped', 'delivered'] } },
    { status: 'cancelled', paymentMethod: { [Op.and]: [{ [Op.ne]: null }, { [Op.notIn]: ['', ' '] }] } },
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
    payment: toAjaPayment(o),
    /* La facture est refaite à chaque demande avec la commande du moment (statut, paiement…) : elle date de son dernier changement. */
    invoiceAt: o.updatedAt as Date,
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

/** La commande d'un id AJA ; un id qui n'est pas un nombre entier n'en désigne aucune. */
function findOrder(id: string | number): Promise<Order | null> {
  const n = Number(id);
  return Number.isSafeInteger(n) && n > 0 ? Order.findByPk(n) : Promise.resolve(null);
}

/** « 1731000000000_42 » → { t, id } ; tout autre texte → première page. */
export function parseOrderCursor(cursor: string | null): { t: number; id: number } | null {
  const m = /^(\d+)_(\d+)$/.exec(cursor ?? '');
  return m ? { t: Number(m[1]), id: Number(m[2]) } : null;
}

export function ordersAdapter(bases: () => ImageBases): OrdersAdapter {
  return {
    async list({ since, cursor, limit }) {
      /* Curseur « après (updatedAt, id) » : une commande modifiée pendant la lecture ne fait sauter aucune autre. */
      const after = parseOrderCursor(cursor);
      const rows = await Order.findAll({
        where: {
          [Op.and]: [
            { updatedAt: { [Op.gte]: new Date(since) } },
            VISIBLE,
            ...(after
              ? [{ [Op.or]: [{ updatedAt: { [Op.gt]: new Date(after.t) } }, { updatedAt: new Date(after.t), id: { [Op.gt]: after.id } }] }]
              : []),
          ],
        },
        order: [['updatedAt', 'ASC'], ['id', 'ASC']],
        limit,
      });
      const b = bases();
      const items = rows.map((r) => plain(r));
      const last = items[items.length - 1];
      return {
        items: items.map((o) => toAjaOrder(o, b)),
        next: items.length === limit && last ? `${new Date(last.updatedAt as Date).getTime()}_${last.id}` : null,
      };
    },

    async get(id) {
      const row = await findOrder(id);
      if (!row) return null;
      const o = plain(row);
      return isVisible(o) ? toAjaOrder(o, bases()) : null;
    },

    async changeStatus({ id, status }) {
      const row = await findOrder(id);
      if (!row) throw new Refusal('Commande introuvable sur le site.');
      const current = plain(row).status;
      const target = parseStatus(status);
      if (!target) throw new Refusal(`Statut inconnu : « ${status} ».`);
      if (target !== current) {
        if (!NEXT[current].includes(target)) {
          throw new Refusal(`Impossible de passer de « ${STATUS_LABELS[current]} » à « ${STATUS_LABELS[target]} ».`);
        }
        await row.update({ status: target });
        updateStock(plain(row).id);
      }
      return toAjaOrder(plain(row), bases());
    },

    /** La même facture PDF que le bouton « Facture » de l'admin. */
    async invoice(id) {
      const row = await findOrder(id);
      if (!row) return null;
      const o = plain(row);
      if (!isVisible(o)) return null;
      return generateInvoicePDF(o, await loadCompanyInfo());
    },
  };
}
