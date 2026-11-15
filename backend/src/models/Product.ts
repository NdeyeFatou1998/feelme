/**
 * ============================================
 * FEEL ME - Modèle Product
 * Table des produits du catalogue
 * Champs : id, name, slug, description, price,
 *          promoPrice, image, categoryId, volume,
 *          stock, isActive
 * ============================================
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

/* --- Interface des attributs --- */
export interface ProductAttributes {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;           // Prix normal en FCFA
  promoPrice: number | null; // Prix promo (si défini, l'ancien prix est barré)
  image: string | null;    // Chemin vers l'image stockée
  categoryId: number;
  volume: string | null;   // Ex: "3ml", "6ml"
  stock: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'description' | 'promoPrice' | 'image' | 'volume' | 'stock' | 'isActive'> {}

/* --- Définition du modèle --- */
class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description!: string | null;
  public price!: number;
  public promoPrice!: number | null;
  public image!: string | null;
  public categoryId!: number;
  public volume!: string | null;
  public stock!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    promoPrice: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'promo_price',
    },
    image: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'category_id',
    },
    volume: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    tableName: 'products',
    timestamps: true,
  }
);

export default Product;
