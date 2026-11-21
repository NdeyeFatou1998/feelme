/**
 * ============================================
 * FEEL ME - AJA : appliquer les décisions du marchand
 *
 * Suit la doc AJA : chaque décision est appliquée chez nous,
 * puis confirmée (ack) avec les statuts possibles ensuite.
 * - Refus (commande inconnue, passage interdit) → ack false + motif.
 * - Panne chez nous (base indisponible…) → pas d'ack : la décision revient.
 * - Type non traité → ack false 'unsupported_type' (sinon il bloque la file).
 * - Décisions produit (product.*) : création, modification, stock,
 *   suppression, et la sonde product.probe ; à la création, l'ack rend
 *   la référence que nous attribuons (« produit-12 », « pack-3 »).
 * ============================================
 */

import {
  COMMAND_TYPE_ORDER_TRANSITION,
  COMMAND_TYPE_PRODUCT_CREATE,
  COMMAND_TYPE_PRODUCT_DELETE,
  COMMAND_TYPE_PRODUCT_PROBE,
  COMMAND_TYPE_PRODUCT_STOCK,
  COMMAND_TYPE_PRODUCT_UPDATE,
} from '@ajaflow/sdk';
import type { Command } from '@ajaflow/sdk';
import { allowedNextLabels, canTransition, OrderStatus, parseStatus, statusLabel } from './statuses';

/** Refus métier : son message s'affiche tel quel au marchand. */
export class ShopRefusal extends Error {}

/** Ce dont la tâche a besoin côté AJA (le client du SDK convient). */
export interface CommandsPort {
  commands: {
    pending(): Promise<Command[]>;
    ack(
      commandId: string,
      ok: boolean,
      status?: string,
      allowedNext?: string[],
      reason?: string,
      externalId?: string
    ): Promise<void>;
  };
}

/** Ce dont la tâche a besoin côté base. */
export interface OrderStore {
  getStatus(externalId: string): Promise<OrderStatus | null>;
  setStatus(externalId: string, status: OrderStatus): Promise<void>;
}

/** Ce dont la tâche a besoin côté catalogue. Refus = ShopRefusal ; panne = toute autre erreur. */
export interface CataloguePort {
  /** Crée le produit (ou le pack) et rend sa référence : « produit-12 », « pack-3 ». */
  create(values: Record<string, unknown>, commandId: string): Promise<string>;
  update(externalId: string | null, values: Record<string, unknown>): Promise<void>;
  setStock(externalId: string | null, stock: number | null): Promise<void>;
  remove(externalId: string | null): Promise<void>;
}

/** Applique le statut choisi sur le téléphone. Rejouer la même décision est sans effet. */
export async function applyStatus(store: OrderStore, externalId: string | null, target: string | null): Promise<OrderStatus> {
  const wanted = parseStatus(target);
  if (!wanted) throw new ShopRefusal(`Statut inconnu : « ${target ?? ''} ».`);
  if (!externalId) throw new ShopRefusal('Commande introuvable.');

  const current = await store.getStatus(externalId);
  if (!current) throw new ShopRefusal('Commande introuvable sur le site.');
  if (current === wanted) return current;
  if (!canTransition(current, wanted)) {
    throw new ShopRefusal(
      `Impossible de passer de « ${statusLabel(current)} » à « ${statusLabel(wanted)} ».`
    );
  }
  await store.setStatus(externalId, wanted);
  return wanted;
}

/** Décision produit : appliquer chez nous, puis confirmer. */
export async function applyProductCommand(aja: CommandsPort, catalogue: CataloguePort, command: Command): Promise<void> {
  switch (command.type) {
    case COMMAND_TYPE_PRODUCT_CREATE: {
      const ref = await catalogue.create(command.values(), command.id);
      await aja.commands.ack(command.id, true, undefined, [], undefined, ref);
      console.log(`[AJA] Produit créé depuis AJA : ${ref}`);
      return;
    }
    case COMMAND_TYPE_PRODUCT_UPDATE:
      await catalogue.update(command.externalId, command.values());
      break;
    case COMMAND_TYPE_PRODUCT_STOCK:
      await catalogue.setStock(command.externalId, command.stock());
      break;
    case COMMAND_TYPE_PRODUCT_DELETE:
      await catalogue.remove(command.externalId);
      break;
    case COMMAND_TYPE_PRODUCT_PROBE:
      break;
    default:
      await aja.commands.ack(command.id, false, undefined, [], 'unsupported_type');
      return;
  }
  await aja.commands.ack(command.id, true);
  console.log(`[AJA] Décision produit appliquée : ${command.type} ${command.externalId ?? ''}`.trim());
}

export async function processCommandsOnce(
  aja: CommandsPort,
  store: OrderStore,
  catalogue: CataloguePort
): Promise<number> {
  let handled = 0;
  for (const command of await aja.commands.pending()) {
    try {
      if (command.type === COMMAND_TYPE_ORDER_TRANSITION) {
        const applied = await applyStatus(store, command.externalId, command.targetStatus());
        await aja.commands.ack(command.id, true, statusLabel(applied), allowedNextLabels(applied));
        console.log(`[AJA] Décision appliquée : commande ${command.externalId} → ${applied}`);
      } else if (command.type.startsWith('product.')) {
        await applyProductCommand(aja, catalogue, command);
      } else {
        await aja.commands.ack(command.id, false, undefined, [], 'unsupported_type');
      }
    } catch (error) {
      if (!(error instanceof ShopRefusal)) throw error; // panne chez nous ou chez AJA : pas d'ack
      await aja.commands.ack(command.id, false, undefined, [], error.message);
      console.warn(`[AJA] Décision refusée : ${command.type} ${command.externalId ?? ''} (${error.message})`);
    }
    handled++;
  }
  return handled;
}

/**
 * Un seul relevé à la fois : la tâche de chaque minute et l'adresse de réveil
 * peuvent tomber ensemble. Un appel pendant un relevé en demande un autre juste après.
 */
export function createSingleFlight(run: () => Promise<unknown>): () => Promise<void> {
  let running: Promise<void> | null = null;
  let again = false;
  return () => {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          again = false;
          await run();
        } while (again);
      } finally {
        running = null;
      }
    })();
    return running;
  };
}
