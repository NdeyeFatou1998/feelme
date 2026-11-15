/**
 * ============================================
 * FEEL ME - Modèle Pack
 * Table des packs (combinaisons de produits)
 * Un pack contient N produits 3ml, N produits 6ml,
 * et éventuellement d'autres produits du site.
 * Champs : id, name, slug, description, price,
 *          promoPrice, image, items (JSON), isActive
 * ============================================
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

/**
 * Structure d'un item dans le pack
 * productId : référence vers le produit
 * quantity  : nombre d'unités de ce produit dans le pack
 */
export interface PackItem {
  productId: number;
  productName?: string;
  quantity: number;
}

/* --- Interface des attributs --- */
export interface PackAttributes {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;             // Prix du pack en FCFA
  promoPrice: number | null; // Prix promo du pack
  image: string | null;
  categoryId: number | null; // Catégorie du pack
  items: PackItem[];         // Liste des produits et quantités (stocké en JSON)
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PackCreationAttributes extends Optional<PackAttributes, 'id' | 'description' | 'promoPrice' | 'image' | 'categoryId' | 'isActive'> {}

/* --- Définition du modèle --- */
class Pack extends Model<PackAttributes, PackCreationAttributes> implements PackAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description!: string | null;
  public price!: number;
  public promoPrice!: number | null;
  public image!: string | null;
  public categoryId!: number | null;
  public items!: PackItem[];
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Pack.init(
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
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'category_id',
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
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
    tableName: 'packs',
    timestamps: true,
  }
);

export default Pack;
