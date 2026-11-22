/**
 * ============================================
 * FEEL ME - AJA : créations déjà faites
 *
 * Chaque création demandée depuis AJA porte un actionId. On le garde
 * en base avec l'article créé : si AJA renvoie la même demande (après
 * un redémarrage du serveur par exemple), on rend le même article au
 * lieu d'en créer un second. Table créée seulement à la première
 * création venue d'AJA.
 * ============================================
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class AjaAction extends Model {}

AjaAction.init(
  {
    actionId: { type: DataTypes.STRING(200), primaryKey: true, field: 'action_id' },
    ref: { type: DataTypes.STRING(50), allowNull: false },
  },
  { sequelize, tableName: 'aja_actions', timestamps: true }
);

let ready: Promise<unknown> | null = null;

export function ensureAjaActions(): Promise<unknown> {
  ready ??= AjaAction.sync().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
