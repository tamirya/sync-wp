import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import UserModel from './users.model';
import SupplierModel from './suppliers.model';

export type PriceOverrideType = 'product' | 'category';

export interface PriceOverrideAttributes {
  id: number;
  userId: number;
  supplierId: number;
  type: PriceOverrideType;
  /** sourceProductId (when type='product') or sourceCategoryId (when type='category') */
  targetId: number;
  /** Markup applied on each product's supplier base price at sync time (e.g. 10 = +10%). */
  markupPercent: number;
  /** When true, use supplier sale price as base when available. */
  useSalePrices: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PriceOverrideCreationAttributes = Optional<
  PriceOverrideAttributes,
  'id' | 'createdAt' | 'updatedAt'
>;

class PriceOverrideModel
  extends Model<PriceOverrideAttributes, PriceOverrideCreationAttributes>
  implements PriceOverrideAttributes
{
  public id!: number;
  public userId!: number;
  public supplierId!: number;
  public type!: PriceOverrideType;
  public targetId!: number;
  public markupPercent!: number;
  public useSalePrices!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PriceOverrideModel.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    supplierId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'suppliers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('product', 'category'),
      allowNull: false,
    },
    targetId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    markupPercent: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
    },
    useSalePrices: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'price_overrides',
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: 'price_overrides_unique',
        fields: ['userId', 'supplierId', 'type', 'targetId'],
      },
    ],
  },
);

UserModel.hasMany(PriceOverrideModel, { foreignKey: 'userId' });
PriceOverrideModel.belongsTo(UserModel, { foreignKey: 'userId' });

SupplierModel.hasMany(PriceOverrideModel, { foreignKey: 'supplierId' });
PriceOverrideModel.belongsTo(SupplierModel, { foreignKey: 'supplierId' });

export default PriceOverrideModel;
