import { DataTypes, Model, Sequelize } from 'sequelize';
import bcrypt from 'bcrypt';

export interface UserAttributes {
  id?: number;
  username: string;
  email: string;
  password: string;
  display_name?: string;
  role: 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';
  created_at?: Date;
  updated_at?: Date;
}

export class UserModel extends Model<UserAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public display_name!: string;
  public role!: 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

export function initUserModel(sequelize: Sequelize) {
  UserModel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      display_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM('admin', 'editor', 'author', 'contributor', 'subscriber'),
        defaultValue: 'subscriber',
      },
    },
    {
      sequelize,
      tableName: 'users',
      underscored: true,
      hooks: {
        beforeCreate: async (user: UserModel) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
        beforeUpdate: async (user: UserModel) => {
          if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
      },
    }
  );

  return UserModel;
}
