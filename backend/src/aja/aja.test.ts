import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Refusal } from '@ajaflow/sdk';
import { Op } from 'sequelize';
import { imageUrl, isVisible, parseOrderCursor, parseStatus, toAjaOrder, toAjaPayment } from './orders';
import {
  PRODUCT_FORM,
  afterWhere,
  parseProductCursor,
  ownImagePath,
  packContentsText,
  packToAja,
  parsePackContents,
  parseRef,
  pickCategory,
  productToAja,
  readValues,
} from './products';
import type { OrderAttributes } from '../models/Order';
import type { PackAttributes } from '../models/Pack';
import type { ProductAttributes } from '../models/Product';

const bases = { api: 'https://api.example.com', front: 'https://www.feel-me.store' };
const when = new Date('2026-11-01T10:00:00Z');

const order = (o: Partial<OrderAttributes> = {}): OrderAttributes => ({
  id: 7,
  ref: 'FM-M-20261101-ABCD',
  firstName: 'Awa',
  lastName: 'Diop',
  phone: '+221770000000',
  email: 'non-fourni@manual.fm',
  address: 'Non précisée',
  items: [{ type: 'pack', itemId: 1, name: 'Pack 3 x Musc', quantity: 2, unitPrice: 5000, image: '/images/pack.jpeg' }],
  totalAmount: 10000,
  deposit: 0,
  remaining: 0,
  source: 'manual',
  notes: null,
  status: 'paid',
  paymentToken: null,
  paymentMethod: 'Espèces',
  updatedAt: when,
  ...o,
});

test('statuts : libellé ou clé, sans accents ni majuscules', () => {
  assert.equal(parseStatus('Expédiée'), 'shipped');
  assert.equal(parseStatus('expediee'), 'shipped');
  assert.equal(parseStatus('delivered'), 'delivered');
  assert.equal(parseStatus('perdue'), null);
});

test('commandes montrées : admin, ou site payée', () => {
  assert.equal(isVisible({ source: 'manual', status: 'pending', paymentMethod: null }), true);
  assert.equal(isVisible({ source: 'site', status: 'pending', paymentMethod: null }), false);
  assert.equal(isVisible({ source: 'site', status: 'paid', paymentMethod: 'Wave' }), true);
  assert.equal(isVisible({ source: 'site', status: 'cancelled', paymentMethod: null }), false);
  assert.equal(isVisible({ source: 'site', status: 'cancelled', paymentMethod: 'Wave' }), true);
  assert.equal(isVisible({ source: 'site', status: 'cancelled', paymentMethod: '' }), false);
  assert.equal(isVisible({ source: 'site', status: 'cancelled', paymentMethod: ' ' }), false);
});

test('commande → AJA : statuts en français, image https, email factice retiré', () => {
  const o = toAjaOrder(order(), bases);
  assert.equal(o.status, 'Payée');
  assert.deepEqual(o.allowedNext, ['Expédiée', 'Annulée']);
  assert.equal(o.paymentStatus, 'paid');
  assert.equal(o.total, 10000);
  assert.equal(o.currency, 'XOF');
  assert.deepEqual(o.customer, { name: 'Awa Diop', phone: '+221770000000', email: null });
  assert.deepEqual(o.lines[0], {
    name: 'Pack 3 x Musc',
    quantity: 2,
    unitPrice: 5000,
    extras: { image_url: 'https://www.feel-me.store/images/pack.jpeg', type: 'Pack' },
  });
  assert.equal(o.extras?.adresse_livraison, undefined);
});

test('paiement : ce que feel-me sait, rien de plus', () => {
  const pay = (paymentMethod: string | null, paymentToken: string | null = null) => toAjaPayment({ paymentMethod, paymentToken });
  assert.deepEqual(pay('Wave', 'tok_123'), { label: 'Wave', method: 'mobile_money', provider: 'Wave', reference: 'tok_123' });
  assert.deepEqual(pay('Orange Money'), { label: 'Orange Money', method: 'mobile_money', provider: 'Orange Money' });
  assert.deepEqual(pay('Orange Money CI'), { label: 'Orange Money CI', method: 'mobile_money', provider: 'Orange Money' });
  assert.deepEqual(pay('Wave CI'), { label: 'Wave CI', method: 'mobile_money', provider: 'Wave' });
  assert.deepEqual(pay('Moov Money BJ'), { label: 'Moov Money BJ', method: 'mobile_money', provider: 'Moov Money' });
  assert.deepEqual(pay('Wavex'), { label: 'Wavex' });
  assert.deepEqual(pay('Carte Bancaire'), { label: 'Carte bancaire', method: 'card' });
  assert.deepEqual(pay('Virement bancaire'), { label: 'Virement bancaire', method: 'bank_transfer' });
  assert.deepEqual(pay('PayTech', 'tok_9'), { label: 'Paiement en ligne', provider: 'PayTech', reference: 'tok_9' });
  assert.deepEqual(pay('Especes'), { label: 'Espèces' });
  assert.deepEqual(pay('Espèces'), { label: 'Espèces' });
  assert.deepEqual(pay('En boutique'), { label: 'En boutique' });
  assert.deepEqual(pay(null, 'tok_1'), { provider: 'PayTech', reference: 'tok_1' });
  assert.equal(pay(null), null);
  assert.equal(pay('  '), null);
});

test('commande → AJA : paiement et date de la facture', () => {
  const o = toAjaOrder(order({ paymentMethod: 'Wave', paymentToken: 'tok_5' }), bases);
  assert.deepEqual(o.payment, { label: 'Wave', method: 'mobile_money', provider: 'Wave', reference: 'tok_5' });
  assert.equal(o.invoiceAt, when);
});

test('commande sans article : une ligne au total', () => {
  const o = toAjaOrder(order({ items: [], status: 'pending', deposit: 3000, remaining: 7000 }), bases);
  assert.deepEqual(o.lines, [{ name: 'Commande FM-M-20261101-ABCD', quantity: 1, unitPrice: 10000 }]);
  assert.equal(o.paymentStatus, 'pending');
  assert.equal(o.extras?.acompte, 3000);
  assert.equal(o.extras?.reste_a_payer, 7000);
});

test('images : /images sur le front, /uploads sur le backend', () => {
  assert.equal(imageUrl('/images/a.jpg', bases), 'https://www.feel-me.store/images/a.jpg');
  assert.equal(imageUrl('/uploads/a.jpg', bases), 'https://api.example.com/uploads/a.jpg');
  assert.equal(imageUrl('https://cdn.x/a.jpg', bases), 'https://cdn.x/a.jpg');
  assert.equal(ownImagePath('https://api.example.com/uploads/a.jpg', bases), '/uploads/a.jpg');
  assert.equal(ownImagePath('https://cdn.x/a.jpg', bases), null);
});

test('références', () => {
  assert.deepEqual(parseRef('produit-12'), { kind: 'product', id: 12 });
  assert.deepEqual(parseRef('pack-3'), { kind: 'pack', id: 3 });
  assert.equal(parseRef('12'), null);
});

test('parfum et pack → AJA : clés du formulaire uniquement', () => {
  const keys = new Set(PRODUCT_FORM.fields.map((f) => f.key));
  const p = productToAja(
    {
      id: 1, name: 'Musc 3ml', slug: 'musc-3ml', description: null, price: 2500, promoPrice: null,
      image: '/images/m.jpeg', categoryId: 1, volume: '3ml', stock: 40, isActive: true, updatedAt: when,
    } as ProductAttributes,
    'Musc',
    bases
  );
  assert.equal(p.id, 'produit-1');
  assert.deepEqual(p.values, {
    photo: 'https://www.feel-me.store/images/m.jpeg', nom: 'Musc 3ml', prix: 2500, stock: 40,
    en_vente: true, type: 'Parfum', categorie: 'Musc', contenance: '3ml',
  });
  const k = packToAja(
    {
      id: 1, name: 'Pack 3', slug: 'pack-3', description: null, price: 6000, promoPrice: 5000, image: null,
      categoryId: null, items: [{ productId: 1, productName: 'Ancien nom', quantity: 3 }], isActive: true, updatedAt: when,
    } as PackAttributes,
    null,
    bases,
    new Map([[1, 'Musc 3ml']])
  );
  assert.equal(k.id, 'pack-1');
  assert.equal(k.values.contenu_pack, '3 × Musc 3ml');
  for (const v of [p, k]) for (const key of Object.keys(v.values)) assert.ok(keys.has(key), key);
});

test('valeurs AJA → site', () => {
  assert.deepEqual(readValues({ nom: ' Musc ', prix: 3000, en_vente: false, type: 'Parfum', stock: '12' }), {
    name: 'Musc', price: 3000, active: false, kind: 'product', stock: 12,
  });
  assert.equal(readValues({ photo: ['https://a/b.jpg'] }).photo, 'https://a/b.jpg');
  assert.throws(() => readValues({ prix: 0 }), Refusal);
  assert.throws(() => readValues({ prix: '12.5' }), Refusal);
  assert.throws(() => readValues({ nom: '' }), Refusal);
  assert.throws(() => readValues({ type: 'Bougie' }), Refusal);
});

test('catégorie', () => {
  const cats = [{ id: 1, name: 'Musc' }, { id: 2, name: 'Oud' }];
  assert.equal(pickCategory(null, cats), 1);
  assert.equal(pickCategory('oud', cats), 2);
  assert.throws(() => pickCategory('Bougie', cats), /Catégories : Musc, Oud/);
});

test('contenu du pack : nom actuel, ancien nom ou refus', () => {
  const products = [{ id: 1, name: 'Musc Tahara Original 3ml' }, { id: 2, name: 'Oud 6ml' }];
  assert.deepEqual(parsePackContents('3 × Musc Tahara Original 3ml\n1 x oud 6ml', products), [
    { productId: 1, productName: 'Musc Tahara Original 3ml', quantity: 3 },
    { productId: 2, productName: 'Oud 6ml', quantity: 1 },
  ]);
  assert.deepEqual(parsePackContents('3 × Musc Tahara 3ml', products, [{ id: 1, name: 'Musc Tahara 3ml' }]), [
    { productId: 1, productName: 'Musc Tahara Original 3ml', quantity: 3 },
  ]);
  assert.throws(() => parsePackContents('Rose', products), /introuvable/);
  assert.throws(() => parsePackContents('', products), Refusal);
  assert.equal(packContentsText([{ productId: 9, quantity: 2 }]), '2 × produit 9');
});

test('curseurs : « après (updatedAt, id) », texte inconnu = première page', () => {
  assert.deepEqual(parseOrderCursor('1731000000000_42'), { t: 1731000000000, id: 42 });
  assert.equal(parseOrderCursor(null), null);
  assert.equal(parseOrderCursor('100'), null);
  assert.deepEqual(parseProductCursor('1731000000000_pack_3'), { t: 1731000000000, kind: 'pack', id: 3 });
  assert.equal(parseProductCursor('1731000000000_bougie_3'), null);
});

test('catalogue : après un pack à l’instant T, les parfums de T suivent ; après un parfum, les packs de T sont passés', () => {
  const t = 1731000000000;
  const T = new Date(t);
  assert.deepEqual(afterWhere('product', null), {});
  assert.deepEqual(afterWhere('product', { t, kind: 'pack', id: 9 }), { updatedAt: { [Op.gte]: T } });
  assert.deepEqual(afterWhere('pack', { t, kind: 'product', id: 1 }), { updatedAt: { [Op.gt]: T } });
  assert.deepEqual(afterWhere('pack', { t, kind: 'pack', id: 4 }), {
    [Op.or]: [{ updatedAt: { [Op.gt]: T } }, { updatedAt: T, id: { [Op.gt]: 4 } }],
  });
});
