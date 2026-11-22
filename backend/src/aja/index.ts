/**
 * ============================================
 * FEEL ME - AJA (@ajaflow/sdk 2)
 *
 * La clé AJA_KEY (créée par `npx @ajaflow/sdk connect <CODE>`)
 * vit uniquement dans l'environnement du serveur de production.
 * Sans clé, le site fonctionne exactement comme avant : rien n'est
 * envoyé, la porte /aja répond 404.
 * ============================================
 */

import type { RequestHandler } from 'express';
import { Aja } from '@ajaflow/sdk';
import { isVisible, ordersAdapter, type ImageBases } from './orders';
import { packRef, productRef, productsAdapter } from './products';
import type { OrderAttributes } from '../models/Order';

function imageBases(): ImageBases {
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null;
  return { api: process.env.API_URL || railway, front: process.env.FRONT_URL || null };
}

function create(): Aja | null {
  if (!process.env.AJA_KEY) {
    console.log('[aja] AJA_KEY absente : intégration désactivée.');
    return null;
  }
  try {
    const aja = new Aja({ currency: 'XOF', timezone: 'Africa/Dakar' });
    aja.ordersAdapter(ordersAdapter(imageBases));
    aja.productsAdapter(productsAdapter(imageBases));
    return aja;
  } catch (error) {
    // Clé absente, abîmée ou d'un ancien format : le site tourne, AJA reste éteint.
    console.error(`[aja] intégration désactivée : ${(error as Error).message}`);
    return null;
  }
}

const aja = create();
const door = aja?.door();

/** La porte à laquelle AJA frappe (GET, publique). */
export const ajaDoor: RequestHandler = (req, res, next) => {
  if (!door) return next();
  door(req, res);
};

export function startAja(): void {
  aja?.start();
}

/** Après chaque enregistrement d'une commande : AJA l'apprend tout de suite. */
export function orderChanged(order: Pick<OrderAttributes, 'id' | 'source' | 'status' | 'paymentMethod'> | null | undefined): void {
  if (!aja || !order) return;
  const o = typeof (order as { get?: unknown }).get === 'function'
    ? ((order as unknown as { get: (o: { plain: true }) => OrderAttributes }).get({ plain: true }))
    : order;
  if (isVisible(o)) aja.changed('orders', o.id);
}

export function productChanged(id: number | string): void {
  aja?.changed('products', productRef(Number(id)));
}

export function packChanged(id: number | string): void {
  aja?.changed('products', packRef(Number(id)));
}
