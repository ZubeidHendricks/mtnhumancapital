import { Sequelize } from 'sequelize';
import { UserModel, initUserModel } from './models/User';
import { PostModel, initPostModel } from './models/Post';
import { MediaModel, initMediaModel } from './models/Media';
import { CommentModel, initCommentModel } from './models/Comment';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'uixpress',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

// Initialize models
const User = initUserModel(sequelize);
const Post = initPostModel(sequelize);
const Media = initMediaModel(sequelize);
const Comment = initCommentModel(sequelize);

// Define relationships
Post.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
User.hasMany(Post, { foreignKey: 'author_id', as: 'posts' });

Comment.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Post.hasMany(Comment, { foreignKey: 'post_id', as: 'comments' });

Media.belongsTo(User, { foreignKey: 'user_id', as: 'uploader' });

export { sequelize, User, Post, Media, Comment };

export async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
