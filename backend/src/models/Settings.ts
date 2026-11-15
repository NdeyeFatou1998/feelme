/**
 * ============================================
 * FEEL ME - Modèle Settings
 * Table des paramètres de l'entreprise
 * Stocke : nom, email, téléphone, adresse
 * Un seul enregistrement (singleton) avec id=1
 * Configurable depuis le dashboard admin.
 * ============================================
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

/* --- Interface des attributs --- */
export interface SettingsAttributes {
  id: number;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyWebsite: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* --- Attributs optionnels à la création --- */
export interface SettingsCreationAttributes extends Optional<SettingsAttributes, 'id' | 'companyWebsite'> {}

/* --- Définition du modèle --- */
class Settings extends Model<SettingsAttributes, SettingsCreationAttributes> implements SettingsAttributes {
  public id!: number;
  public companyName!: string;
  public companyEmail!: string;
  public companyPhone!: string;
  public companyAddress!: string;
  public companyWebsite!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Settings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Feel Me',
      field: 'company_name',
    },
    companyEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'softechiris@gmail.com',
      field: 'company_email',
    },
    companyPhone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '+221 77 000 00 00',
      field: 'company_phone',
    },
    companyAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Dakar, Sénégal',
      field: 'company_address',
    },
    companyWebsite: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'www.feel-me.store',
      field: 'company_website',
    },
  },
  {
    sequelize,
    tableName: 'settings',
    timestamps: true,
  }
);

export default Settings;
