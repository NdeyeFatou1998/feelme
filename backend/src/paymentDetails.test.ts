import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentDetailsFromIpn } from './paymentDetails';

test('IPN après la page succès : le vrai moyen remplace « Paiement en ligne »', () => {
  assert.deepEqual(paymentDetailsFromIpn({ paymentMethod: 'Paiement en ligne', paymentToken: 'tok' }, 'Wave', 'tok'), { paymentMethod: 'Wave' });
  assert.deepEqual(paymentDetailsFromIpn({ paymentMethod: null, paymentToken: null }, 'Orange Money', 'tok'), { paymentMethod: 'Orange Money', paymentToken: 'tok' });
  assert.deepEqual(paymentDetailsFromIpn({ paymentMethod: 'PayTech', paymentToken: 'tok' }, 'Carte Bancaire', 'tok'), { paymentMethod: 'Carte Bancaire' });
});

test('IPN : ne remplace jamais un moyen précis, ni par un texte vide', () => {
  assert.equal(paymentDetailsFromIpn({ paymentMethod: 'Wave', paymentToken: 'tok' }, 'Orange Money', 'tok'), null);
  assert.equal(paymentDetailsFromIpn({ paymentMethod: 'Paiement en ligne', paymentToken: 'tok' }, '', 'tok'), null);
  assert.equal(paymentDetailsFromIpn({ paymentMethod: 'Paiement en ligne', paymentToken: 'tok' }, 'PayTech', undefined), null);
});
