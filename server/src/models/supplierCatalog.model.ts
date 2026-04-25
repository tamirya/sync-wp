import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import SupplierModel from './suppliers.model';

export interface SupplierCatalogAttributes {
  id: number;
  supplierId: number;
  sourceProductId: number;
  skuOriginal: string | null;
  sku: string;
  name: string | null;
  payload: object | null;
  categories: string[] | null;
}

export type SupplierCatalogCreationAttributes = Optional<SupplierCatalogAttributes, 'id' | 'name' | 'payload' | 'skuOriginal' | 'categories'>;

class SupplierCatalogModel extends Model<SupplierCatalogAttributes, SupplierCatalogCreationAttributes> implements SupplierCatalogAttributes {
  public id!: number;
  public supplierId!: number;
  public sourceProductId!: number;
  public skuOriginal!: string | null;
  public sku!: string;
  public name!: string | null;
  public payload!: object | null;
  public categories!: string[] | null;
}

SupplierCatalogModel.init(
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
    sourceProductId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    skuOriginal: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    sku: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    categories: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'supplier_catalog',
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: 'supplier_catalog_supplier_source_id',
        fields: ['supplierId', 'sourceProductId'],
      },
      {
        unique: true,
        name: 'supplier_catalog_supplier_sku',
        fields: ['supplierId', 'sku'],
      },
    ],
  },
);

SupplierModel.hasMany(SupplierCatalogModel, { foreignKey: 'supplierId' });
SupplierCatalogModel.belongsTo(SupplierModel, { foreignKey: 'supplierId' });

export default SupplierCatalogModel;
