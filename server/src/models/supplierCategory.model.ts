import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import SupplierModel from './suppliers.model';

export interface SupplierCategoryAttributes {
  id: number;
  supplierId: number;
  sourceCategoryId: number;
  parent: number | null;
  name: string;
  slug: string;
  payload: object | null;
}

export type SupplierCategoryCreationAttributes = Optional<
  SupplierCategoryAttributes,
  'id' | 'parent' | 'payload'
>;

class SupplierCategoryModel extends Model<SupplierCategoryAttributes, SupplierCategoryCreationAttributes>
  implements SupplierCategoryAttributes
{
  public id!: number;
  public supplierId!: number;
  public sourceCategoryId!: number;
  public parent!: number | null;
  public name!: string;
  public slug!: string;
  public payload!: object | null;
}

SupplierCategoryModel.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    supplierId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    sourceCategoryId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    parent: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(512),
      allowNull: false,
      defaultValue: '',
    },
    slug: {
      type: DataTypes.STRING(512),
      allowNull: false,
      defaultValue: '',
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'supplier_categories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: 'supplier_categories_supplier_source_id',
        fields: ['supplierId', 'sourceCategoryId'],
      },
    ],
  },
);

SupplierModel.hasMany(SupplierCategoryModel, { foreignKey: 'supplierId' });
SupplierCategoryModel.belongsTo(SupplierModel, { foreignKey: 'supplierId' });

export default SupplierCategoryModel;
