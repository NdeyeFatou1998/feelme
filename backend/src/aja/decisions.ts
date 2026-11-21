/**
 * ============================================
 * FEEL ME - AJA : appliquer les décisions du marchand
 *
 * Suit la doc AJA : chaque décision est appliquée chez nous,
 * puis confirmée (ack) avec les statuts possibles ensuite.
 * - Refus (commande inconnue, passage interdit) → ack false + motif.
 * - Panne chez nous (base indisponible…) → pas d'ack : la décision revient.
 * - Type non traité → ack false 'unsupported_type' (sinon il bloque la file).
 * ============================================
 */

import { AjaError, COMMAND_TYPE_ORDER_TRANSITION } from '@ajaflow/sdk';
import type { Command } from '@ajaflow/sdk';
import { allowedNextLabels, canTransition, OrderStatus, parseStatus, statusLabel } from './statuses';

/** Refus métier : son message s'affiche tel quel au marchand. */
export class ShopRefusal extends Error {}

/** Ce dont la tâche a besoin côté AJA (le client du SDK convient). */
export interface CommandsPort {
  commands: {
    pending(): Promise<Command[]>;
    ack(commandId: string, ok: boolean, status?: string, allowedNext?: string[], reason?: string): Promise<void>;
  };
}

/** Ce dont la tâche a besoin côté base. */
export interface OrderStore {
  getStatus(externalId: string): Promise<OrderStatus | null>;
  setStatus(externalId: string, status: OrderStatus): Promise<void>;
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

export async function processCommandsOnce(aja: CommandsPort, store: OrderStore): Promise<number> {
  let handled = 0;
  for (const command of await aja.commands.pending()) {
    if (command.type !== COMMAND_TYPE_ORDER_TRANSITION) {
      await aja.commands.ack(command.id, false, undefined, [], 'unsupported_type');
      handled++;
      continue;
    }
    const target = command.targetStatus();
    try {
      const applied = await applyStatus(store, command.externalId, target);
      await aja.commands.ack(command.id, true, statusLabel(applied), allowedNextLabels(applied));
      console.log(`[AJA] Décision appliquée : commande ${command.externalId} → ${applied}`);
    } catch (error) {
      if (error instanceof AjaError) throw error;
      if (!(error instanceof ShopRefusal)) throw error; // panne chez nous : pas d'ack
      await aja.commands.ack(command.id, false, undefined, [], error.message);
      console.warn(`[AJA] Décision refusée : commande ${command.externalId} → ${target} (${error.message})`);
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
