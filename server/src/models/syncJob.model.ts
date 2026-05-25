import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@databases';
import UserModel from './users.model';

export type SyncJobType =
  | 'supplier_categories'
  | 'supplier_catalog'
  | 'supplier_scraper'
  | 'store_categories'
  | 'store_catalog'
  | 'store_import_rules'
  | 'store_import_single_rule'
  | 'store_import_store_api';

export type SyncJobStatus = 'pending' | 'running' | 'done' | 'failed';

export interface SyncJobAttributes {
  id: string;
  type: SyncJobType;
  entityId: number;
  userId: number;
  status: SyncJobStatus;
  progress: number;
  result: object | null;
  error: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SyncJobCreationAttributes = Optional<SyncJobAttributes, 'progress' | 'result' | 'error' | 'createdAt' | 'updatedAt'>;

class SyncJobModel extends Model<SyncJobAttributes, SyncJobCreationAttributes> implements SyncJobAttributes {
  declare id: string;
  declare type: SyncJobType;
  declare entityId: number;
  declare userId: number;
  declare status: SyncJobStatus;
  declare progress: number;
  declare result: object | null;
  declare error: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SyncJobModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM(
        'supplier_categories',
        'supplier_catalog',
        'supplier_scraper',
        'store_categories',
        'store_catalog',
        'store_import_rules',
        'store_import_single_rule',
        'store_import_store_api',
      ),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'done', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    progress: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    result: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'sync_jobs',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'type', 'entityId'] },
      { fields: ['status'] },
    ],
  },
);

UserModel.hasMany(SyncJobModel, { foreignKey: 'userId' });
SyncJobModel.belongsTo(UserModel, { foreignKey: 'userId' });

export default SyncJobModel;
