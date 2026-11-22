import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdsStock, stockNeeds } from './stock';

const products = [
  { id: 1, name: 'Musc Tahara Original 3ml' },
  { id: 2, name: 'Musc Tahara Original 6ml' },
];
const packs = [{ id: 1, name: 'Pack 3 x Musc Tahara 3ml', items: [{ productId: 1, quantity: 3 }] }];

test('commande du site : parfums et packs par id, quantités cumulées', () => {
  const { needs, unknown } = stockNeeds(
    [
      { type: 'product', itemId: 1, name: 'x', quantity: 2, unitPrice: 2500 },
      { type: 'pack', itemId: 1, name: 'y', quantity: 2, unitPrice: 5000 },
      { type: 'product', itemId: 2, name: 'z', quantity: 1, unitPrice: 4000 },
    ],
    products,
    packs
  );
  assert.deepEqual(needs, [{ productId: 1, quantity: 8 }, { productId: 2, quantity: 1 }]);
  assert.deepEqual(unknown, []);
});

test('commande saisie à la main (id 0) : reconnue par le nom, parfum ou pack', () => {
  const { needs, unknown } = stockNeeds(
    [
      { type: 'product', itemId: 0, name: 'musc tahara original 6ml', quantity: 2, unitPrice: 0 },
      { type: 'product', itemId: 0, name: 'Pack 3 x Musc Tahara 3ml', quantity: 1, unitPrice: 0 },
      { type: 'product', itemId: 0, name: 'Bougie', quantity: 1, unitPrice: 0 },
    ],
    products,
    packs
  );
  assert.deepEqual(needs, [{ productId: 2, quantity: 2 }, { productId: 1, quantity: 3 }]);
  assert.deepEqual(unknown, ['Bougie']);
});

test('statuts qui retirent le stock', () => {
  assert.equal(holdsStock('paid'), true);
  assert.equal(holdsStock('delivered'), true);
  assert.equal(holdsStock('pending'), false);
  assert.equal(holdsStock('cancelled'), false);
});
