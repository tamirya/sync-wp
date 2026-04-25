import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import StoreModel from './stores.model';
import SupplierModel from './suppliers.model';
import UserModel from './users.model';

export interface ProductCategoryRuleAttributes {
  id: number;
  userId: number;
  storeId: number;
  supplierId: number;
  sourceProductId: number;
  storeCategoryId: number;
  enabled: boolean;
}

export type ProductCategoryRuleCreationAttributes = Optional<ProductCategoryRuleAttributes, 'id' | 'enabled'>;

class ProductCategoryRuleModel extends Model<ProductCategoryRuleAttributes, ProductCategoryRuleCreationAttributes>
  implements ProductCategoryRuleAttributes
{
  public id!: number;
  public userId!: number;
  public storeId!: number;
  public supplierId!: number;
  public sourceProductId!: number;
  public storeCategoryId!: number;
  public enabled!: boolean;
}

ProductCategoryRuleModel.init(
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
    sourceProductId: {
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
    tableName: 'product_category_rules',
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: 'product_category_rules_store_supplier_product_unique',
        fields: ['storeId', 'supplierId', 'sourceProductId'],
      },
    ],
  },
);

UserModel.hasMany(ProductCategoryRuleModel, { foreignKey: 'userId' });
ProductCategoryRuleModel.belongsTo(UserModel, { foreignKey: 'userId' });

StoreModel.hasMany(ProductCategoryRuleModel, { foreignKey: 'storeId' });
ProductCategoryRuleModel.belongsTo(StoreModel, { foreignKey: 'storeId' });

SupplierModel.hasMany(ProductCategoryRuleModel, { foreignKey: 'supplierId' });
ProductCategoryRuleModel.belongsTo(SupplierModel, { foreignKey: 'supplierId' });

export default ProductCategoryRuleModel;
