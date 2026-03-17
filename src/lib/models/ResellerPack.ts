/**
 * ============================================
 * FEEL ME - Modèle ResellerPack
 * Packs spéciaux pour revendeurs avec bénéfices
 * ============================================
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

interface ResellerPackAttributes {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  normalPrice: number;
  resellerPrice: number;
  profit: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  image: string | null;
  categoryId: number | null;
  items: Array<{ productId: number; productName?: string; quantity: number }>;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ResellerPackCreationAttributes extends Optional<ResellerPackAttributes, 'id' | 'description' | 'image' | 'categoryId' | 'isActive' | 'discountType' | 'discountValue' | 'createdAt' | 'updatedAt'> {}

class ResellerPack extends Model<ResellerPackAttributes, ResellerPackCreationAttributes> implements ResellerPackAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description!: string | null;
  public normalPrice!: number;
  public resellerPrice!: number;
  public profit!: number;
  public discountType!: 'percentage' | 'fixed';
  public discountValue!: number;
  public image!: string | null;
  public categoryId!: number | null;
  public items!: Array<{ productId: number; productName?: string; quantity: number }>;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ResellerPack.init(
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
    normalPrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Prix de vente public normal en FCFA',
    },
    resellerPrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Prix pour les revendeurs en FCFA',
    },
    profit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Bénéfice par pack en FCFA (normalPrice - resellerPrice)',
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false,
      defaultValue: 'percentage',
      comment: 'Type de remise : pourcentage ou montant fixe',
    },
    discountValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      comment: 'Valeur de la remise (pourcentage ou FCFA selon discountType)',
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
      comment: 'Liste des produits inclus dans le pack avec quantités',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'reseller_packs',
    timestamps: true,
  }
);

export default ResellerPack;
