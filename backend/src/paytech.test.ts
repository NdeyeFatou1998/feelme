import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { isAuthenticIpn } from './paytech';

const keys = { apiKey: 'cle-test', apiSecret: 'secret-test' };
const sha = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const hmac = (price: unknown, ref: unknown) =>
  crypto.createHmac('sha256', keys.apiSecret).update(`${price}|${ref}|${keys.apiKey}`).digest('hex');

test('IPN signé par HMAC : accepté, et refusé si le prix ou la référence change', () => {
  const body = { type_event: 'sale_complete', item_price: '5000', ref_command: 'FM-1', hmac_compute: hmac('5000', 'FM-1') };
  assert.deepEqual(isAuthenticIpn(body, keys), { ok: true, how: 'HMAC' });
  assert.deepEqual(isAuthenticIpn({ ...body, item_price: '1' }, keys), { ok: false, how: 'signature invalide' });
  assert.equal(isAuthenticIpn({ ...body, ref_command: 'FM-2' }, keys).ok, false);
  assert.equal(isAuthenticIpn({ ...body, hmac_compute: hmac('5000', 'FM-1').toUpperCase() }, keys).ok, true);
});

test('IPN signé par SHA256 des clés : accepté ; une seule empreinte ou une fausse : refusé', () => {
  const body = { api_key_sha256: sha(keys.apiKey), api_secret_sha256: sha(keys.apiSecret) };
  assert.deepEqual(isAuthenticIpn(body, keys), { ok: true, how: 'SHA256 (sans HMAC)' });
  assert.equal(isAuthenticIpn({ api_key_sha256: sha(keys.apiKey) }, keys).ok, false);
  /* Comme en production : HMAC et SHA256 ensemble. Un HMAC qui ne correspond pas n'empêche pas un vrai paiement (SHA256 bon). */
  const both = { item_price: '100', ref_command: 'FM-1', hmac_compute: hmac('100', 'FM-1'), ...body };
  assert.deepEqual(isAuthenticIpn(both, keys), { ok: true, how: 'HMAC' });
  assert.equal(isAuthenticIpn({ ...both, hmac_compute: 'ab'.repeat(32) }, keys).how.startsWith('SHA256'), true);
  assert.equal(isAuthenticIpn({ ...both, hmac_compute: 'ab'.repeat(32), api_key_sha256: sha('x') }, keys).ok, false);
  assert.equal(isAuthenticIpn({ ...body, api_secret_sha256: sha('autre') }, keys).ok, false);
  assert.equal(isAuthenticIpn({ ...body, api_secret_sha256: 'pas-hex' }, keys).ok, false);
});

test('IPN sans signature, ou serveur sans clés : refusé', () => {
  assert.deepEqual(isAuthenticIpn({ type_event: 'sale_complete', ref_command: 'FM-1' }, keys), { ok: false, how: 'aucune signature' });
  const body = { api_key_sha256: sha(''), api_secret_sha256: sha('') };
  assert.equal(isAuthenticIpn(body, { apiKey: '', apiSecret: '' }).ok, false);
  assert.equal(isAuthenticIpn({ ...body, hmac_compute: ['x'] } as any, keys).ok, false);
});
