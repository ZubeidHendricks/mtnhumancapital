import { DataTypes, Model, Sequelize } from 'sequelize';

export interface CommentAttributes {
  id?: number;
  post_id: number;
  user_id?: number;
  author_name?: string;
  author_email?: string;
  content: string;
  status: 'approved' | 'pending' | 'spam';
  created_at?: Date;
  updated_at?: Date;
}

export class CommentModel extends Model<CommentAttributes> implements CommentAttributes {
  public id!: number;
  public post_id!: number;
  public user_id!: number;
  public author_name!: string;
  public author_email!: string;
  public content!: string;
  public status!: 'approved' | 'pending' | 'spam';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initCommentModel(sequelize: Sequelize) {
  CommentModel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      post_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      author_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      author_email: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('approved', 'pending', 'spam'),
        defaultValue: 'pending',
      },
    },
    {
      sequelize,
      tableName: 'comments',
      underscored: true,
    }
  );

  return CommentModel;
}
