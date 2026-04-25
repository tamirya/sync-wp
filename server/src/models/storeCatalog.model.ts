import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import StoreModel from './stores.model';
import SupplierModel from './suppliers.model';

export interface StoreCatalogAttributes {
  id: number;
  storeId: number;
  wooProductId: number;
  sku: string;
  name: string | null;
  sourceSupplierId: number | null;
  sourceProductId: number | null;
  payload: object | null;
  categories: string[] | null;
}

export type StoreCatalogCreationAttributes = Optional<
  StoreCatalogAttributes,
  'id' | 'name' | 'payload' | 'sourceSupplierId' | 'sourceProductId' | 'categories'
>;

class StoreCatalogModel extends Model<StoreCatalogAttributes, StoreCatalogCreationAttributes> implements StoreCatalogAttributes {
  public id!: number;
  public storeId!: number;
  public wooProductId!: number;
  public sku!: string;
  public name!: string | null;
  public sourceSupplierId!: number | null;
  public sourceProductId!: number | null;
  public payload!: object | null;
  public categories!: string[] | null;
}

StoreCatalogModel.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    storeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    wooProductId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    sourceSupplierId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'suppliers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    sourceProductId: {
      type: DataTypes.INTEGER.UNSIGNED,
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
    tableName: 'store_catalog',
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: 'store_catalog_store_woo_id',
        fields: ['storeId', 'wooProductId'],
      },
      {
        unique: true,
        name: 'store_catalog_store_sku',
        fields: ['storeId', 'sku'],
      },
    ],
  },
);

StoreModel.hasMany(StoreCatalogModel, { foreignKey: 'storeId' });
StoreCatalogModel.belongsTo(StoreModel, { foreignKey: 'storeId' });

SupplierModel.hasMany(StoreCatalogModel, { foreignKey: 'sourceSupplierId' });
StoreCatalogModel.belongsTo(SupplierModel, { foreignKey: 'sourceSupplierId' });

export default StoreCatalogModel;
