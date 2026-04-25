import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import UserModel from './users.model';

export interface StoreAttributes {
  id: number;
  userId: number;
  name: string;
  /** WooCommerce site base URL to import *into* (wc/v3 target). */
  url: string;
  port: number | null;
}

export type StoreCreationAttributes = Optional<StoreAttributes, 'id' | 'port'>;

class StoreModel extends Model<StoreAttributes, StoreCreationAttributes> implements StoreAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public url!: string;
  public port!: number | null;
}

StoreModel.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    port: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'stores',
    timestamps: true,
  },
);

UserModel.hasMany(StoreModel, { foreignKey: 'userId' });
StoreModel.belongsTo(UserModel, { foreignKey: 'userId' });

export default StoreModel;
