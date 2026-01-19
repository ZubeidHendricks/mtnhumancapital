import { DataTypes, Model, Sequelize } from 'sequelize';

export interface PostAttributes {
  id?: number;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  author_id: number;
  featured_image?: string;
  post_type: 'post' | 'page';
  created_at?: Date;
  updated_at?: Date;
  published_at?: Date;
}

export class PostModel extends Model<PostAttributes> implements PostAttributes {
  public id!: number;
  public title!: string;
  public content!: string;
  public excerpt!: string;
  public slug!: string;
  public status!: 'draft' | 'published' | 'archived';
  public author_id!: number;
  public featured_image!: string;
  public post_type!: 'post' | 'page';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public published_at!: Date;
}

export function initPostModel(sequelize: Sequelize) {
  PostModel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM('draft', 'published', 'archived'),
        defaultValue: 'draft',
      },
      author_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      featured_image: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      post_type: {
        type: DataTypes.ENUM('post', 'page'),
        defaultValue: 'post',
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'posts',
      underscored: true,
      hooks: {
        beforeCreate: (post: PostModel) => {
          if (!post.slug) {
            post.slug = post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          }
          if (post.status === 'published' && !post.published_at) {
            post.published_at = new Date();
          }
        },
      },
    }
  );

  return PostModel;
}
