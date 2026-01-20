# Database Schema Documentation

## Overview

DragDropUI uses PostgreSQL with Sequelize ORM for data persistence.

## Models

### User Model
Located: `backend/src/database/models/User.ts`

```typescript
interface UserAttributes {
  id?: number;
  username: string;
  email: string;
  password: string;          // bcrypt hashed
  display_name?: string;
  role: 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';
  created_at?: Date;
  updated_at?: Date;
}
```

**Relationships:**
- `hasMany` → Post (as author)
- `hasMany` → Media (as uploader)

**Hooks:**
- `beforeCreate` - Hashes password with bcrypt
- `beforeUpdate` - Hashes password if changed

---

### Post Model
Located: `backend/src/database/models/Post.ts`

```typescript
interface PostAttributes {
  id?: number;
  title: string;
  content: string;
  excerpt?: string;
  author_id: number;
  status: 'publish' | 'draft' | 'pending' | 'private';
  post_type: 'post' | 'page';
  slug: string;
  created_at?: Date;
  updated_at?: Date;
  published_at?: Date;
}
```

**Relationships:**
- `belongsTo` → User (author)
- `hasMany` → Comment

---

### Media Model
Located: `backend/src/database/models/Media.ts`

```typescript
interface MediaAttributes {
  id?: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;              // bytes
  user_id: number;
  alt_text?: string;
  caption?: string;
  created_at?: Date;
  updated_at?: Date;
}
```

**Relationships:**
- `belongsTo` → User (uploader)

---

### Comment Model
Located: `backend/src/database/models/Comment.ts`

```typescript
interface CommentAttributes {
  id?: number;
  post_id: number;
  user_id?: number;
  author_name?: string;
  author_email?: string;
  content: string;
  status: 'approved' | 'pending' | 'spam' | 'trash';
  created_at?: Date;
  updated_at?: Date;
}
```

**Relationships:**
- `belongsTo` → Post
- `belongsTo` → User (optional - for registered users)

---

## Database Configuration

Configuration: `backend/src/database/index.ts`

```typescript
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dragdropui',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});
```

## Initialization

The database automatically syncs on startup:

```typescript
await sequelize.authenticate();
await sequelize.sync({ alter: true });
```

⚠️ **Note:** In production, use proper migrations instead of `sync()`.

## Migrations (TODO)

Future implementation will use Sequelize CLI for migrations:

```bash
# Create migration
npx sequelize-cli migration:generate --name create-users-table

# Run migrations
npx sequelize-cli db:migrate

# Rollback
npx sequelize-cli db:migrate:undo
```

---

**Last Updated:** December 2024
