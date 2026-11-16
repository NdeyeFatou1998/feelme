/**
 * ============================================
 * FEEL ME - Intégration AJA (ajaflow.com)
 *
 * - Envoie chaque commande validée à AJA (appli marchand).
 * - Relève chaque minute les décisions prises sur le téléphone
 *   (changements de statut) et les applique dans notre base.
 * - Déclare la boutique (devise, fuseau, adresse de réveil)
 *   au démarrage puis une fois par jour.
 *
 * La clé est lue dans AJA_KEY (variable Railway). Sans clé,
 * l'intégration est désactivée et rien n'est envoyé.
 * Une panne d'AJA ne bloque jamais une vente : toutes les
 * erreurs sont journalisées puis ignorées.
 * ============================================
 */

import { AjaError, ApiError, Client, COMMAND_TYPE_ORDER_TRANSITION, OrderInput } from 'aja-sdk';
import type { OrderLine } from 'aja-sdk';
import { Order } from './models';
import type { OrderAttributes } from './models/Order';

type Status = OrderAttributes['status'];

const CURRENCY = 'XOF';
const TIMEZONE = 'Africa/Dakar';
const POLL_INTERVAL_MS = 60_000;
const PROFILE_INTERVAL_MS = 24 * 60 * 60_000;

/** Statuts que le marchand peut choisir ensuite (les boutons de l'appli AJA). */
const NEXT_STATUSES: Record<Status, Status[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const PAID_STATUSES: Status[] = ['paid', 'shipped', 'delivered'];

const STATUS_LABELS: Record<Status, string> = {
  pending: 'en attente',
  paid: 'payée',
  shipped: 'expédiée',
  delivered: 'livrée',
  cancelled: 'annulée',
};

let client: Client | null = null;

export function ajaEnabled(): boolean {
  return Boolean(process.env.AJA_KEY);
}

export function getAjaClient(): Client | null {
  return getClient();
}

function getClient(): Client | null {
  if (!ajaEnabled()) return null;
  if (!client) {
    client = new Client({
      apiKey: process.env.AJA_KEY as string,
      /* Uniquement pour les tests locaux (faux serveur AJA) ; vide en production. */
      ...(process.env.AJA_BASE_URL ? { baseUrl: process.env.AJA_BASE_URL } : {}),
    });
  }
  return client;
}

function logError(context: string, error: unknown): void {
  if (error instanceof ApiError) {
    console.error(`[AJA] ${context}: ${error.code} (requête ${error.requestId}) ${error.message}`);
  } else {
    console.error(`[AJA] ${context}:`, error instanceof Error ? error.message : error);
  }
}

export function nextStatuses(status: Status): Status[] {
  return NEXT_STATUSES[status] ?? [];
}

function isStatus(value: string | null): value is Status {
  return value !== null && Object.prototype.hasOwnProperty.call(NEXT_STATUSES, value);
}

/** Numéro sénégalais à 9 chiffres → format international, pour les boutons WhatsApp/Appeler. */
export function normalizePhone(phone: string): string {
  const compact = phone.replace(/[\s.()-]/g, '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  if (/^221\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\d{9}$/.test(compact)) return `+221${compact}`;
  return compact;
}

function absoluteUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = (process.env.FRONT_URL || '').replace(/\/$/, '');
  return base ? `${base}${path.startsWith('/') ? '' : '/'}${path}` : undefined;
}

/** Une commande Feel Me, telle qu'AJA l'attend. */
export function toOrderInput(order: OrderAttributes): OrderInput {
  const lines: OrderLine[] = (order.items || []).map((item) => {
    const image = absoluteUrl(item.image);
    return {
      name: item.name,
      quantity: Number(item.quantity) || 1,
      unit_price: Math.round(Number(item.unitPrice) || 0),
      ...(image ? { extras: { image_url: image } } : {}),
    };
  });

  const email = order.email && !order.email.endsWith('@manual.fm') ? order.email : null;
  const extras: Record<string, unknown> = {
    reference: order.ref,
    adresse: order.address,
    origine: order.source === 'manual' ? 'Saisie manuelle' : 'Site',
  };
  if (order.notes) extras.customer_note = order.notes;
  if (order.deposit > 0 && order.remaining > 0) {
    extras.acompte = order.deposit;
    extras.reste_a_payer = order.remaining;
  }

  return new OrderInput({
    externalId: order.ref,
    status: order.status,
    allowedNext: nextStatuses(order.status),
    paymentStatus: PAID_STATUSES.includes(order.status) ? 'paid' : 'pending',
    paymentMode: order.paymentMethod || undefined,
    total: Math.round(Number(order.totalAmount) || 0),
    currency: CURRENCY,
    customer: {
      name: `${order.firstName} ${order.lastName}`.trim(),
      phone: normalizePhone(order.phone),
      ...(email ? { email } : {}),
    },
    lines: lines.length > 0 ? lines : [{ name: `Commande ${order.ref}`, quantity: 1, unit_price: Math.round(Number(order.totalAmount) || 0) }],
    extras,
  });
}

/**
 * Envoie (ou met à jour) une commande chez AJA.
 * - commande annulée : on prévient AJA seulement si elle y est déjà ;
 * - commande manuelle, payée, expédiée ou livrée : envoi complet (sans risque de doublon) ;
 * - commande du site en attente de paiement : rien (pas encore validée).
 * Ne lève jamais d'erreur.
 */
export async function syncOrder(order: OrderAttributes): Promise<void> {
  const aja = getClient();
  if (!aja) return;
  try {
    if (order.status === 'cancelled') {
      await aja.orders.update(order.ref, { status: 'cancelled', allowed_next: [] });
      console.log(`[AJA] Commande ${order.ref} annulée chez AJA`);
    } else if (order.source === 'manual' || PAID_STATUSES.includes(order.status)) {
      await aja.orders.create(toOrderInput(order));
      console.log(`[AJA] Commande ${order.ref} envoyée (${order.status})`);
    }
  } catch (error) {
    if (error instanceof ApiError && error.code === 'ORDER_NOT_FOUND') return;
    logError(`envoi commande ${order.ref}`, error);
  }
}

/** Version « tirer et oublier » pour les routes : ne retarde jamais la réponse au client. */
export function syncOrderInBackground(order: Order): void {
  void syncOrder(order.get({ plain: true }) as OrderAttributes);
}

/**
 * Applique une décision du marchand. Renvoie le statut appliqué, ou le motif du refus
 * (affiché tel quel au marchand). Rejouer la même décision est sans effet.
 */
async function applyTransition(externalId: string | null, target: string | null): Promise<{ refused: string } | { status: Status }> {
  if (!externalId) return { refused: 'Commande sans référence' };
  if (!isStatus(target)) return { refused: `Statut inconnu : ${target ?? 'vide'}` };

  const order = await Order.findOne({ where: { ref: externalId } });
  if (!order) return { refused: 'Commande introuvable sur le site' };

  /* Les champs de classe du modèle masquent les attributs Sequelize : on lit via get(). */
  const data = order.get({ plain: true }) as OrderAttributes;
  const current = data.status;
  if (current === target) return { status: current };
  if (!nextStatuses(current).includes(target)) {
    return {
      refused: `Une commande ${STATUS_LABELS[current]} ne peut pas passer à « ${STATUS_LABELS[target]} »`,
    };
  }

  const changes: Partial<OrderAttributes> = { status: target };
  if (target === 'paid' && data.remaining > 0) {
    changes.deposit = data.totalAmount;
    changes.remaining = 0;
  }
  await order.update(changes);
  console.log(`[AJA] Commande ${externalId} : ${current} → ${target} (décision du marchand)`);
  return { status: target };
}

let processing = false;

/** Relève et applique les décisions du marchand. Sans effet si un relevé est déjà en cours. */
export async function processCommands(): Promise<void> {
  const aja = getClient();
  if (!aja || processing) return;
  processing = true;
  try {
    for (;;) {
      const commands = await aja.commands.pending();
      if (commands.length === 0) break;
      for (const command of commands) {
        if (command.type !== COMMAND_TYPE_ORDER_TRANSITION) {
          await aja.commands.ack(command.id, false, undefined, [], 'unsupported_type');
          continue;
        }
        const result = await applyTransition(command.externalId, command.targetStatus());
        if ('refused' in result) {
          await aja.commands.ack(command.id, false, undefined, [], result.refused);
        } else {
          await aja.commands.ack(command.id, true, result.status, nextStatuses(result.status));
        }
      }
      if (commands.length < 20) break;
    }
  } catch (error) {
    /* La décision non confirmée reviendra au prochain relevé. */
    logError(error instanceof AjaError ? 'relevé des décisions' : 'application d’une décision', error);
  } finally {
    processing = false;
  }
}

/** Adresse de réveil : sur le domaine du back déclaré dans AJA. */
export function wakeUrl(): string {
  const base = (process.env.API_URL || '').replace(/\/$/, '');
  return `${base}/api/aja/wake`;
}

async function declareSite(): Promise<void> {
  const aja = getClient();
  if (!aja) return;
  try {
    await aja.site.putProfile({ currency: CURRENCY, timezone: TIMEZONE, wakeUrl: wakeUrl() });
    console.log(`[AJA] Boutique déclarée (réveil : ${wakeUrl()})`);
  } catch (error) {
    logError('déclaration de la boutique', error);
  }
}

let started = false;

/** À appeler une fois au démarrage du serveur. */
export function startAja(): void {
  if (started) return;
  if (!ajaEnabled()) {
    console.log('[AJA] AJA_KEY absente : intégration désactivée.');
    return;
  }
  if (!process.env.API_URL) {
    console.warn('[AJA] API_URL absente : adresse de réveil impossible à déclarer.');
  }
  started = true;
  void declareSite();
  setInterval(() => void declareSite(), PROFILE_INTERVAL_MS).unref();
  setInterval(() => void processCommands(), POLL_INTERVAL_MS).unref();
  void processCommands();
}
