/**
 * ============================================
 * FEEL ME - Moyen de paiement d'une commande payée en ligne
 *
 * La page /commande/succes confirme la commande dès le retour du client,
 * souvent avant l'IPN de PayTech, et note « Paiement en ligne » faute de
 * mieux. Quand l'IPN arrive ensuite, il apporte le vrai moyen (Wave,
 * Orange Money, Carte Bancaire…) et le jeton PayTech : on les garde,
 * sans écraser un moyen précis déjà saisi (dans l'admin, par exemple).
 * ============================================
 */

import type { OrderAttributes } from './models/Order';

/** Ce qui n'est pas un vrai moyen de paiement, juste « payé en ligne ». */
const PLACEHOLDERS = new Set(['', 'paytech', 'paiement en ligne']);

export function isPlaceholderMethod(method: string | null | undefined): boolean {
  return PLACEHOLDERS.has((method ?? '').trim().toLowerCase());
}

export function paymentDetailsFromIpn(
  order: Pick<OrderAttributes, 'paymentMethod' | 'paymentToken'>,
  ipnMethod: unknown,
  ipnToken: unknown
): Partial<Pick<OrderAttributes, 'paymentMethod' | 'paymentToken'>> | null {
  const method = typeof ipnMethod === 'string' ? ipnMethod.trim() : '';
  const token = typeof ipnToken === 'string' ? ipnToken.trim() : '';
  const update: Partial<Pick<OrderAttributes, 'paymentMethod' | 'paymentToken'>> = {};
  if (method && !isPlaceholderMethod(method) && isPlaceholderMethod(order.paymentMethod)) update.paymentMethod = method;
  if (token && !order.paymentToken) update.paymentToken = token;
  return Object.keys(update).length ? update : null;
}
