/** Le statut se lit bien sur une vraie instance Sequelize (champs publics masqués). */
process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import Order from '../models/Order';
import { readStatus } from './index';

test('readStatus lit le statut malgré les champs publics du modèle', () => {
  const order = Order.build({ status: 'shipped' } as any);
  assert.equal(readStatus(order), 'shipped');
});
