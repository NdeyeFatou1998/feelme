/**
 * ============================================
 * FEEL ME - Modèle Order (Commande)
 * Table des commandes clients
 * Champs : id, ref, firstName, lastName, phone,
 *          email, address, items (JSON), totalAmount,
 *          status, paymentToken, paymentMethod
 * ============================================
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

/**
 * Structure d'un article dans la commande
 * type: 'product' ou 'pack'
 * itemId: id du produit ou pack
 * name: nom affiché
 * quantity: nombre commandé
 * unitPrice: prix unitaire appliqué
 */
export interface OrderItem {
  type: 'product' | 'pack';
  itemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

/* --- Interface des attributs --- */
export interface OrderAttributes {
  id: number;
  ref: string;               // Référence unique de commande ex: FM-20240101-XXXX
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;            // Adresse de livraison
  items: OrderItem[];         // Détail des articles (JSON)
  totalAmount: number;        // Montant total en FCFA
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  paymentToken: string | null;
  paymentMethod: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderCreationAttributes extends Optional<OrderAttributes, 'id' | 'status' | 'paymentToken' | 'paymentMethod'> {}

/* --- Définition du modèle --- */
class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public id!: number;
  public ref!: string;
  public firstName!: string;
  public lastName!: string;
  public phone!: string;
  public email!: string;
  public address!: string;
  public items!: OrderItem[];
  public totalAmount!: number;
  public status!: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  public paymentToken!: string | null;
  public paymentMethod!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ref: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'ref',
    },
    firstName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'last_name',
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    totalAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_amount',
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    paymentToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_token',
    },
    paymentMethod: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'payment_method',
    },
  },
  {
    sequelize,
    tableName: 'orders',
    timestamps: true,
  }
);

export default Order;
