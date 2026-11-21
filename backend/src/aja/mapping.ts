/**
 * ============================================
 * FEEL ME - AJA : notre commande → OrderInput
 *
 * Montants : toujours des entiers XOF via toMinor (jamais de
 * nombre à virgule). Téléphone au format international pour
 * les boutons WhatsApp / Appeler de l'appli.
 * ============================================
 */

import { OrderInput, toMinor } from '@ajaflow/sdk';
import type { OrderLine } from '@ajaflow/sdk';
import type { OrderAttributes } from '../models/Order';
import { allowedNextLabels, paymentStatusOf, statusLabel } from './statuses';

export const CURRENCY = 'XOF';
export const TIMEZONE = 'Africa/Dakar';

/** Adresse e-mail factice posée sur les commandes manuelles sans e-mail. */
const PLACEHOLDER_EMAIL = 'non-fourni@manual.fm';

/** Numéro sénégalais à 9 chiffres → +221… ; les autres formats sont laissés tels quels. */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const compact = String(phone).replace(/[\s.()-]/g, '');
  if (!compact) return null;
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  if (/^221\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\d{9}$/.test(compact)) return `+221${compact}`;
  return compact;
}

/** Montant tel que stocké en base (FCFA, entier) → entier AJA. */
export function amount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  return toMinor(String(value), CURRENCY);
}

/** Les images d'upload sont relatives (/uploads/…) : AJA a besoin d'une URL complète. */
export function absoluteUrl(url: string | null | undefined, baseUrl: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

type OrderForAja = Pick<
  OrderAttributes,
  | 'id'
  | 'ref'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'address'
  | 'items'
  | 'totalAmount'
  | 'deposit'
  | 'remaining'
  | 'source'
  | 'notes'
  | 'status'
  | 'paymentMethod'
>;

export function buildOrderInput(order: OrderForAja, baseUrl: string | null): OrderInput {
  const total = amount(order.totalAmount) ?? 0;

  const lines: OrderLine[] = (Array.isArray(order.items) ? order.items : []).map((item) => {
    const extras: Record<string, unknown> = {};
    const image = absoluteUrl(item.image, baseUrl);
    if (image) extras.image_url = image;
    if (item.type === 'pack') extras.type = 'Pack';
    return {
      name: item.name || 'Article',
      quantity: Number(item.quantity) || 1,
      unit_price: amount(item.unitPrice) ?? 0,
      ...(Object.keys(extras).length ? { extras } : {}),
    };
  });

  /* AJA exige au moins une ligne : une commande manuelle sans article garde son total. */
  if (lines.length === 0) {
    lines.push({ name: `Commande ${order.ref}`, quantity: 1, unit_price: total });
  }

  const email = order.email && order.email !== PLACEHOLDER_EMAIL ? order.email : null;
  const name = `${order.firstName ?? ''} ${order.lastName ?? ''}`.trim() || null;

  const extras: Record<string, unknown> = {
    reference: order.ref,
    origine: order.source === 'manual' ? 'Saisie manuelle' : 'Site',
  };
  if (order.address && order.address !== 'Non précisée') extras.adresse_livraison = order.address;
  if (order.notes) extras.notes = order.notes;
  if (Number(order.deposit) > 0) {
    extras.acompte = amount(order.deposit);
    extras.reste_a_payer = amount(order.remaining);
  }

  return new OrderInput({
    externalId: String(order.id),
    status: statusLabel(order.status),
    allowedNext: allowedNextLabels(order.status),
    paymentStatus: paymentStatusOf(order),
    paymentMode: order.paymentMethod || null,
    total,
    currency: CURRENCY,
    customer: { name, phone: normalizePhone(order.phone), email },
    lines,
    extras,
  });
}
