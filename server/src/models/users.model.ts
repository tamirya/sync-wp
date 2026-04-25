import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';

export interface UserAttributes {
  id: number;
  email: string;
  password: string;
}

export type UserCreationAttributes = Optional<UserAttributes, 'id'>;

class UserModel extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
}

UserModel.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    indexes: [{ unique: true, name: 'users_email_unique', fields: ['email'] }],
  },
);

export default UserModel;
