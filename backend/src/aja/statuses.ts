/**
 * ============================================
 * FEEL ME - AJA : statuts et boutons du marchand
 *
 * AJA n'impose aucune liste de statuts : on lui envoie nos
 * propres mots, en français, tels que le marchand les voit
 * sur son téléphone. allowedNext = les boutons qu'il a ensuite.
 * ============================================
 */

import type { OrderAttributes } from '../models/Order';

export type OrderStatus = OrderAttributes['status'];

/** Libellé envoyé à AJA pour chaque statut de notre base. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'en attente',
  paid: 'payée',
  shipped: 'expédiée',
  delivered: 'livrée',
  cancelled: 'annulée',
};

/** Libellé d'une commande supprimée par l'admin (plus aucun bouton). */
export const DELETED_LABEL = 'supprimée';

/** Statuts que le marchand peut choisir ensuite, depuis chaque statut. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function statusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status];
}

/** Les boutons du marchand pour une commande dans ce statut. */
export function allowedNextLabels(status: OrderStatus): string[] {
  return (NEXT_STATUSES[status] ?? []).map(statusLabel);
}

/** Libellé AJA (ou clé de notre base) → statut de notre base ; null si inconnu. */
export function parseStatus(value: string | null | undefined): OrderStatus | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  for (const key of Object.keys(STATUS_LABELS) as OrderStatus[]) {
    if (v === key || v === STATUS_LABELS[key]) return key;
  }
  return null;
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (NEXT_STATUSES[from] ?? []).includes(to);
}

/** Une commande est « validée » (donc envoyée à AJA) quand elle est payée, ou saisie par l'admin. */
export function isValidated(order: Pick<OrderAttributes, 'status' | 'source'>): boolean {
  if (order.source === 'manual') return true;
  return order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered';
}

/** paymentStatus AJA : pending, paid, failed ou refunded. */
export function paymentStatusOf(order: Pick<OrderAttributes, 'status' | 'remaining' | 'deposit' | 'totalAmount'>): 'paid' | 'pending' {
  if (order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') return 'paid';
  if (Number(order.totalAmount) > 0 && Number(order.deposit) >= Number(order.totalAmount)) return 'paid';
  return 'pending';
}
