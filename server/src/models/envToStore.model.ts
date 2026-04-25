import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import StoreModel from './stores.model';

export interface EnvToStoreAttributes {
  id: number;
  storeId: number;
  consumerKey: string;
  consumerSecret: string;
}

export type EnvToStoreCreationAttributes = Optional<EnvToStoreAttributes, 'id'>;

class EnvToStoreModel extends Model<EnvToStoreAttributes, EnvToStoreCreationAttributes> implements EnvToStoreAttributes {
  public id!: number;
  public storeId!: number;
  public consumerKey!: string;
  public consumerSecret!: string;
}

EnvToStoreModel.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    storeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      references: {
        model: 'stores',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    consumerKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    consumerSecret: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'env_to_store',
    timestamps: true,
  },
);

StoreModel.hasOne(EnvToStoreModel, { foreignKey: 'storeId' });
EnvToStoreModel.belongsTo(StoreModel, { foreignKey: 'storeId' });

export default EnvToStoreModel;
