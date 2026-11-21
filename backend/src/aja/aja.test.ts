/**
 * Tests de l'intégration AJA (sans base ni réseau).
 * Lancer : npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Command, toMinor } from '@ajaflow/sdk';
import { buildOrderInput, normalizePhone, imageUrl } from './mapping';
import { createSingleFlight, OrderStore, processCommandsOnce } from './decisions';
import { OrderStatus, parseStatus } from './statuses';

const baseOrder = {
  id: 42,
  ref: 'FM-20261121-ABCD',
  firstName: 'Awa',
  lastName: 'Diop',
  phone: '77 000 11 22',
  email: 'awa@example.com',
  address: 'Dakar, Plateau',
  items: [
    { type: 'product' as const, itemId: 1, name: 'Parfum Oud', quantity: 2, unitPrice: 15000, image: '/uploads/oud.jpg' },
    { type: 'pack' as const, itemId: 3, name: 'Pack Découverte', quantity: 1, unitPrice: 25000 },
  ],
  totalAmount: 55000,
  deposit: 0,
  remaining: 0,
  source: 'site' as const,
  notes: null,
  status: 'paid' as const,
  paymentMethod: 'Wave',
};

/* ---------- Correspondance d'une commande ---------- */

test('commande payée du site → OrderInput complet', () => {
  const body = buildOrderInput(baseOrder, { api: 'https://api.feelme.test', front: 'https://www.feelme.test' }).toJSON();
  assert.equal(body.external_id, '42');
  assert.equal(body.status, 'payée');
  assert.deepEqual(body.allowed_next, ['expédiée', 'annulée']);
  assert.equal(body.payment_status, 'paid');
  assert.equal(body.payment_mode, 'Wave');
  assert.equal(body.total, 55000);
  assert.equal(body.currency, 'XOF');
  assert.deepEqual(body.customer, { name: 'Awa Diop', phone: '+221770001122', email: 'awa@example.com' });
  const lines = body.lines as Array<Record<string, any>>;
  assert.equal(lines.length, 2);
  assert.equal(lines[0].unit_price, 15000);
  assert.equal(lines[0].extras.image_url, 'https://api.feelme.test/uploads/oud.jpg');
  assert.equal(lines[1].extras.type, 'Pack');
  const extras = body.extras as Record<string, unknown>;
  assert.equal(extras.reference, 'FM-20261121-ABCD');
  assert.equal(extras.adresse_livraison, 'Dakar, Plateau');
});

test('commande manuelle avec acompte, sans article ni e-mail', () => {
  const body = buildOrderInput(
    {
      ...baseOrder,
      source: 'manual',
      status: 'pending',
      items: [],
      email: 'non-fourni@manual.fm',
      address: 'Non précisée',
      deposit: 20000,
      remaining: 35000,
      paymentMethod: 'Espèces',
    },
    { api: null, front: null }
  ).toJSON();
  assert.equal(body.status, 'en attente');
  assert.deepEqual(body.allowed_next, ['payée', 'annulée']);
  assert.equal(body.payment_status, 'pending');
  assert.deepEqual(body.lines, [{ name: 'Commande FM-20261121-ABCD', quantity: 1, unit_price: 55000 }]);
  assert.equal((body.customer as any).email ?? null, null);
  const extras = body.extras as Record<string, unknown>;
  assert.equal(extras.acompte, 20000);
  assert.equal(extras.reste_a_payer, 35000);
  assert.equal(extras.adresse_livraison, undefined);
});

/* ---------- Montants et formats ---------- */

test('montants XOF : entiers, vide → null', () => {
  assert.equal(toMinor('15000', 'XOF'), 15000);
  assert.equal(toMinor('15000.00', 'XOF'), 15000);
  assert.equal(toMinor('', 'XOF'), null);
});

test('téléphones et URL d’images', () => {
  assert.equal(normalizePhone('770001122'), '+221770001122');
  assert.equal(normalizePhone('221770001122'), '+221770001122');
  assert.equal(normalizePhone('00221770001122'), '+221770001122');
  assert.equal(normalizePhone('+33612345678'), '+33612345678');
  assert.equal(normalizePhone(''), null);
  const bases = { api: 'https://api.x/', front: 'https://www.x' };
  assert.equal(imageUrl('https://cdn.x/a.jpg', bases), 'https://cdn.x/a.jpg');
  assert.equal(imageUrl('uploads/a.jpg', bases), 'https://api.x/uploads/a.jpg');
  assert.equal(imageUrl('/uploads/a.jpg', bases), 'https://api.x/uploads/a.jpg');
  assert.equal(imageUrl('/images/feelme6ml.jpeg', bases), 'https://www.x/images/feelme6ml.jpeg');
  assert.equal(imageUrl('/images/a.jpg', { api: 'https://api.x', front: null }), null);
});

test('libellés reconnus dans les deux sens', () => {
  assert.equal(parseStatus('Expédiée'), 'shipped');
  assert.equal(parseStatus('delivered'), 'delivered');
  assert.equal(parseStatus('inconnu'), null);
});

/* ---------- Tâche des décisions ---------- */

type Ack = { id: string; ok: boolean; status?: string; allowedNext?: string[]; reason?: string };

function fakeAja(rows: Array<Record<string, unknown>>) {
  const acks: Ack[] = [];
  return {
    acks,
    commands: {
      async pending() {
        return rows.map((r) => new Command(r));
      },
      async ack(id: string, ok: boolean, status?: string, allowedNext?: string[], reason?: string) {
        acks.push({ id, ok, status, allowedNext, reason });
      },
    },
  };
}

function fakeStore(initial: Record<string, OrderStatus>, failOn?: string): OrderStore & { db: Record<string, OrderStatus>; writes: number } {
  const store = {
    db: { ...initial },
    writes: 0,
    async getStatus(id: string) {
      if (id === failOn) throw new Error('base indisponible');
      return store.db[id] ?? null;
    },
    async setStatus(id: string, status: OrderStatus) {
      store.writes++;
      store.db[id] = status;
    },
  };
  return store;
}

const transition = (id: string, externalId: string, to: string) => ({
  id,
  type: 'order.transition',
  external_id: externalId,
  payload: { status: to },
  created_at: '2026-11-21T10:00:00Z',
});

test('décision acceptée : appliquée puis ack avec les boutons suivants', async () => {
  const aja = fakeAja([transition('c1', '42', 'expédiée')]);
  const store = fakeStore({ '42': 'paid' });
  await processCommandsOnce(aja, store);
  assert.equal(store.db['42'], 'shipped');
  assert.deepEqual(aja.acks, [{ id: 'c1', ok: true, status: 'expédiée', allowedNext: ['livrée', 'annulée'], reason: undefined }]);
});

test('décision refusée : passage interdit ou commande inconnue', async () => {
  const aja = fakeAja([transition('c1', '42', 'livrée'), transition('c2', '999', 'payée')]);
  const store = fakeStore({ '42': 'cancelled' });
  await processCommandsOnce(aja, store);
  assert.equal(store.db['42'], 'cancelled');
  assert.equal(aja.acks[0].ok, false);
  assert.match(aja.acks[0].reason ?? '', /annulée.*livrée/);
  assert.equal(aja.acks[1].ok, false);
  assert.match(aja.acks[1].reason ?? '', /introuvable/);
});

test('type non traité : refusé unsupported_type, la file avance', async () => {
  const aja = fakeAja([
    { id: 'p1', type: 'product.update', external_id: '7', payload: {}, created_at: '2026-11-21T10:00:00Z' },
    transition('c2', '42', 'payée'),
  ]);
  const store = fakeStore({ '42': 'pending' });
  await processCommandsOnce(aja, store);
  assert.deepEqual(aja.acks[0], { id: 'p1', ok: false, status: undefined, allowedNext: [], reason: 'unsupported_type' });
  assert.equal(aja.acks[1].ok, true);
  assert.equal(store.db['42'], 'paid');
});

test('décision rejouée : sans effet, reconfirmée', async () => {
  const aja = fakeAja([transition('c1', '42', 'payée')]);
  const store = fakeStore({ '42': 'paid' });
  await processCommandsOnce(aja, store);
  assert.equal(store.writes, 0);
  assert.equal(aja.acks[0].ok, true);
  assert.equal(aja.acks[0].status, 'payée');
});

test('panne chez nous : pas d’ack, la décision reviendra', async () => {
  const aja = fakeAja([transition('c1', '42', 'payée')]);
  const store = fakeStore({ '42': 'pending' }, '42');
  await assert.rejects(processCommandsOnce(aja, store), /base indisponible/);
  assert.equal(aja.acks.length, 0);
});

test('un seul relevé à la fois', async () => {
  let running = 0;
  let maxRunning = 0;
  let runs = 0;
  const flight = createSingleFlight(async () => {
    running++;
    runs++;
    maxRunning = Math.max(maxRunning, running);
    await new Promise((r) => setTimeout(r, 20));
    running--;
  });
  await Promise.all([flight(), flight(), flight()]);
  assert.equal(maxRunning, 1);
  assert.equal(runs, 2); // le premier + un relevé de rattrapage
});
