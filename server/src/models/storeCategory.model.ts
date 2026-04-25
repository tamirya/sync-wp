import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import StoreModel from './stores.model';

export interface StoreCategoryAttributes {
  id: number;
  storeId: number;
  wooCategoryId: number;
  parent: number | null;
  name: string;
  slug: string;
  count: number | null;
  payload: object | null;
}

export type StoreCategoryCreationAttributes = Optional<
  StoreCategoryAttributes,
  'id' | 'parent' | 'count' | 'payload'
>;

class StoreCategoryModel extends Model<StoreCategoryAttributes, StoreCategoryCreationAttributes>
  implements StoreCategoryAttributes
{
  public id!: number;
  public storeId!: number;
  public wooCategoryId!: number;
  public parent!: number | null;
  public name!: string;
  public slug!: string;
  public count!: number | null;
  public payload!: object | null;
}

StoreCategoryModel.init(
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
    wooCategoryId: {
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
    count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'store_categories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: 'store_categories_store_woo_id',
        fields: ['storeId', 'wooCategoryId'],
      },
    ],
  },
);

StoreModel.hasMany(StoreCategoryModel, { foreignKey: 'storeId' });
StoreCategoryModel.belongsTo(StoreModel, { foreignKey: 'storeId' });

export default StoreCategoryModel;
