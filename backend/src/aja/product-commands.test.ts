/** Tests de la traduction des décisions produit (sans base ni réseau). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShopRefusal } from './decisions';
import { ownImagePath, parsePackContents, parseRef, pickCategory, readValues, slugify } from './product-commands';

test('références produit / pack', () => {
  assert.deepEqual(parseRef('produit-12'), { kind: 'product', id: 12 });
  assert.deepEqual(parseRef('pack-3'), { kind: 'pack', id: 3 });
  assert.equal(parseRef('P-01'), null);
  assert.equal(parseRef(null), null);
});

test('valeurs AJA → champs : montants XOF entiers, image en liste, mise à jour partielle', () => {
  assert.deepEqual(
    readValues({
      nom: ' Oud Royal ', prix: 15000, prix_promo: 12000, stock: '8', type: 'Parfum',
      contenance: '6ml', categorie: 'Homme', description: '', photo: ['https://cdn.aja/x.jpg'],
    }),
    {
      kind: 'product', name: 'Oud Royal', price: 15000, promoPrice: 12000, stock: 8,
      volume: '6ml', category: 'Homme', description: null, photoUrl: 'https://cdn.aja/x.jpg',
    }
  );
  assert.deepEqual(readValues({ prix: 9000 }), { price: 9000 });
  assert.deepEqual(readValues({ type: 'Pack' }), { kind: 'pack' });
  assert.deepEqual(readValues({ prix_promo: null }), { promoPrice: null });
});

test('valeurs invalides → refus lisible', () => {
  assert.throws(() => readValues({ nom: '' }), ShopRefusal);
  assert.throws(() => readValues({ prix: 0 }), /prix est obligatoire/);
  assert.throws(() => readValues({ prix: 'abc' }), /Prix invalide/);
  assert.throws(() => readValues({ stock: -2 }), /Stock invalide/);
  assert.throws(() => readValues({ type: 'Bougie' }), /Type inconnu/);
});

test('catégorie par nom, première par défaut, inconnue refusée', () => {
  const cats = [{ id: 4, name: 'Homme' }, { id: 7, name: 'Femme' }];
  assert.equal(pickCategory('femme', cats), 7);
  assert.equal(pickCategory(null, cats), 4);
  assert.throws(() => pickCategory('Enfant', cats), /Catégories : Homme, Femme/);
});

test('contenu du pack : même format que celui envoyé par le site', () => {
  const products = [{ id: 1, name: 'Musc' }, { id: 2, name: 'Oud Royal' }];
  assert.deepEqual(parsePackContents('2 × Musc\n1 x oud royal', products), [
    { productId: 1, productName: 'Musc', quantity: 2 },
    { productId: 2, productName: 'Oud Royal', quantity: 1 },
  ]);
  assert.deepEqual(parsePackContents('Musc', products), [{ productId: 1, productName: 'Musc', quantity: 1 }]);
  assert.throws(() => parsePackContents('1 × Vanille', products), /Vanille.*introuvable/);
  assert.throws(() => parsePackContents('', products), /contenu du pack/);
});

test('image déjà à nous → chemin en base ; externe → null (à télécharger)', () => {
  const bases = { api: 'https://api.feelme.test', front: 'https://www.feel-me.store' };
  assert.equal(ownImagePath('https://www.feel-me.store/images/feelme6ml.jpeg', bases), '/images/feelme6ml.jpeg');
  assert.equal(ownImagePath('https://api.feelme.test/uploads/a.jpg', bases), '/uploads/a.jpg');
  assert.equal(ownImagePath('https://files.ajaflow.com/x.jpg', bases), null);
});

test('slug identique à celui de l’admin', () => {
  assert.equal(slugify('Coffret Été Doré'), 'coffret-ete-dore');
});
