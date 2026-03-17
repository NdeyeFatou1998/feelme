/**
 * ============================================
 * FEEL ME - Modèle Admin
 * Table des administrateurs du site
 * Champs : id, email, password (hashé bcrypt)
 * ============================================
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

/* --- Interface des attributs --- */
export interface AdminAttributes {
  id: number;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* --- Attributs optionnels à la création --- */
export interface AdminCreationAttributes extends Optional<AdminAttributes, 'id'> {}

/* --- Définition du modèle --- */
class Admin extends Model<AdminAttributes, AdminCreationAttributes> implements AdminAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Admin.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'admins',
    timestamps: true,
  }
);

export default Admin;
