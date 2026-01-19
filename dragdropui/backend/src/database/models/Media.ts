import { DataTypes, Model, Sequelize } from 'sequelize';

export interface MediaAttributes {
  id?: number;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  url: string;
  title?: string;
  alt_text?: string;
  user_id: number;
  created_at?: Date;
  updated_at?: Date;
}

export class MediaModel extends Model<MediaAttributes> implements MediaAttributes {
  public id!: number;
  public filename!: string;
  public original_name!: string;
  public mime_type!: string;
  public file_size!: number;
  public file_path!: string;
  public url!: string;
  public title!: string;
  public alt_text!: string;
  public user_id!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initMediaModel(sequelize: Sequelize) {
  MediaModel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      original_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      alt_text: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'media',
      underscored: true,
    }
  );

  return MediaModel;
}
