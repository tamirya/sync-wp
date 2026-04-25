import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import UserModel from './users.model';

export interface SupplierAttributes {
  id: number;
  userId: number;
  name: string;
  url: string;
}

export type SupplierCreationAttributes = Optional<SupplierAttributes, 'id'>;

class SupplierModel extends Model<SupplierAttributes, SupplierCreationAttributes> implements SupplierAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public url!: string;
}

SupplierModel.init(
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
  },
  {
    sequelize,
    tableName: 'suppliers',
    timestamps: true,
  },
);

UserModel.hasMany(SupplierModel, { foreignKey: 'userId' });
SupplierModel.belongsTo(UserModel, { foreignKey: 'userId' });

export default SupplierModel;
