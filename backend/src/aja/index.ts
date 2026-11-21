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
import { Order, syncDatabase } from '../models';
import type { OrderAttributes } from '../models/Order';
import { createSingleFlight, OrderStore, processCommandsOnce } from './decisions';
import { buildOrderInput, CURRENCY, TIMEZONE } from './mapping';
import { allowedNextLabels, DELETED_LABEL, isValidated, paymentStatusOf, statusLabel } from './statuses';

const POLL_INTERVAL_MS = 60_000;
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
      await aja.orders.create(buildOrderInput(data, publicBaseUrl()));
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

/* ---------- Démarrage ---------- */

export function startAja(): void {
  if (!ajaEnabled()) {
    console.log('[AJA] AJA_KEY absent : intégration désactivée.');
    return;
  }
  console.log('[AJA] Intégration active.');

  void declareShop();
  setInterval(() => void declareShop(), PROFILE_INTERVAL_MS).unref();

  const poll = () =>
    processCommands().catch((error) => logAjaError('Relevé des décisions', error));
  setTimeout(poll, 5_000).unref();
  setInterval(poll, POLL_INTERVAL_MS).unref();
}
