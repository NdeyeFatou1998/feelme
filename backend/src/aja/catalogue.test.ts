/** Tests du catalogue AJA (sans base ni réseau). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_SCHEMA, packContentsText, packRef, packValues, productRef, productValues } from './catalogue';

test('formulaire : clés valides, uniques, un champ requis, ordre de la liste', () => {
  const keys = PRODUCT_SCHEMA.fields.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const k of keys) assert.match(k, /^[a-z][a-z0-9_]{0,63}$/);
  assert.ok(PRODUCT_SCHEMA.fields.some((f) => f.required));
  assert.deepEqual(keys.slice(0, 4), ['photo', 'nom', 'prix', 'stock']);
});

test('produit → valeurs du formulaire', () => {
  const values = productValues(
    { id: 12, name: 'Oud Royal', description: 'Notes boisées', price: 15000, promoPrice: 12000, image: '/uploads/oud.jpg', volume: '6ml', stock: 8 },
    'Parfums homme',
    { api: 'https://api.feelme.test', front: 'https://www.feelme.test' }
  );
  assert.deepEqual(values, {
    photo: 'https://api.feelme.test/uploads/oud.jpg',
    nom: 'Oud Royal',
    prix: 15000,
    stock: 8,
    prix_promo: 12000,
    type: 'Parfum',
    categorie: 'Parfums homme',
    contenance: '6ml',
    description: 'Notes boisées',
  });
  assert.equal(productRef(12), 'produit-12');
});

test('champs vides omis, jamais un faux 0', () => {
  const values = productValues(
    { id: 1, name: 'Musc', description: null, price: 5000, promoPrice: null, image: null, volume: null, stock: 0 },
    null,
    { api: null, front: null }
  );
  assert.deepEqual(values, { nom: 'Musc', prix: 5000, stock: 0, type: 'Parfum' });
});

test('image du front (/images/…) → adresse du front, en https', () => {
  const values = productValues(
    { id: 2, name: 'Feel Me 6ml', description: null, price: 5000, promoPrice: null, image: '/images/feelme6ml.jpeg', volume: '6ml', stock: 10 },
    null,
    { api: 'https://feelmebackend-production.up.railway.app', front: 'https://www.feel-me.store' }
  );
  assert.equal(values.photo, 'https://www.feel-me.store/images/feelme6ml.jpeg');
});

test('pack → valeurs avec son contenu', () => {
  const values = packValues(
    { id: 3, name: 'Coffret Découverte', description: null, price: 25000, promoPrice: null, image: 'https://cdn.x/p.jpg',
      items: [{ productId: 1, productName: 'Musc', quantity: 2 }, { productId: 4, quantity: 1 }] },
    null,
    { api: null, front: null }
  );
  assert.equal(values.contenu_pack, '2 × Musc\n1 × produit 4');
  assert.equal(values.type, 'Pack');
  assert.equal(values.prix, 25000);
  assert.equal(values.stock, undefined);
  assert.equal(packRef(3), 'pack-3');
});

test('contenu du pack avec le nom actuel du parfum (renommé depuis)', () => {
  const items = [{ quantity: 3, productId: 1, productName: 'Musc Tahara 3ml' }];
  const names = new Map([[1, 'Musc Tahara Original 3ml']]);
  assert.equal(packContentsText(items, names), '3 × Musc Tahara Original 3ml');
  assert.equal(packContentsText(items), '3 × Musc Tahara 3ml');
  const values = packValues(
    { id: 1, name: 'Pack 3 x Musc Tahara 3ml', description: null, price: 6000, promoPrice: 5000, image: null, items },
    null,
    { api: null, front: null },
    names
  );
  assert.equal(values.contenu_pack, '3 × Musc Tahara Original 3ml');
});
