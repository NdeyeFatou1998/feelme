/**
 * ============================================
 * FEEL ME - Modèle Category
 * Table des catégories de produits
 * Champs : id, name, slug, description, image
 * ============================================
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

/* --- Interface des attributs --- */
export interface CategoryAttributes {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'description' | 'image'> {}

/* --- Définition du modèle --- */
class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description!: string | null;
  public image!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'categories',
    timestamps: true,
  }
);

export default Category;
