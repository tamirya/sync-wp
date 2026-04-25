import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import StoreModel from './stores.model';
import SupplierModel from './suppliers.model';
import UserModel from './users.model';

export interface CategoryRuleAttributes {
  id: number;
  userId: number;
  storeId: number;
  supplierId: number;
  supplierCategoryId: number;
  storeCategoryId: number;
  enabled: boolean;
}

export type CategoryRuleCreationAttributes = Optional<CategoryRuleAttributes, 'id' | 'enabled'>;

class CategoryRuleModel extends Model<CategoryRuleAttributes, CategoryRuleCreationAttributes> implements CategoryRuleAttributes {
  public id!: number;
  public userId!: number;
  public storeId!: number;
  public supplierId!: number;
  public supplierCategoryId!: number;
  public storeCategoryId!: number;
  public enabled!: boolean;
}

CategoryRuleModel.init(
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
    supplierCategoryId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    storeCategoryId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'category_rules',
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: 'category_rules_store_supplier_supplier_cat_unique',
        fields: ['storeId', 'supplierId', 'supplierCategoryId'],
      },
    ],
  },
);

UserModel.hasMany(CategoryRuleModel, { foreignKey: 'userId' });
CategoryRuleModel.belongsTo(UserModel, { foreignKey: 'userId' });

StoreModel.hasMany(CategoryRuleModel, { foreignKey: 'storeId' });
CategoryRuleModel.belongsTo(StoreModel, { foreignKey: 'storeId' });

SupplierModel.hasMany(CategoryRuleModel, { foreignKey: 'supplierId' });
CategoryRuleModel.belongsTo(SupplierModel, { foreignKey: 'supplierId' });

export default CategoryRuleModel;
