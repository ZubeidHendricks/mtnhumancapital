# UiXpress TypeScript Server

A complete TypeScript REST API server providing backend functionality for the UiXpress WordPress admin dashboard.

## 🎉 Conversion Status: 45% Complete (24/53 files)

### ✅ 100% Complete: All REST API Endpoints (20/20)
All core WordPress REST API endpoints have been successfully converted to TypeScript!

## Features

### Core APIs (100% Complete ✅)
- **Analytics**: Track and analyze WordPress site metrics
- **User Analytics**: User registration statistics and analytics
- **Media Analytics**: Media library statistics and file type breakdown
- **User Management**: Handle user roles and capabilities
- **Media Library**: Manage WordPress media files
  - Upload, delete, and manage media
  - Bulk download (ZIP creation)
  - Media replacement
  - Media tagging system
  - Media usage tracking
- **Activity Logging**: Monitor and log user activities
- **Server Health**: Monitor server performance and health
- **Plugin Management**: Manage WordPress plugins
- **Plugin Metrics**: Collect plugin performance metrics
- **Role Editor**: Edit and customize user roles
- **Database Explorer**: Explore and query WordPress database
- **Search**: Extended search including meta fields
- **Posts Tables**: Advanced posts/pages table management
- **Admin Notices**: Persistent admin notification system
- **Authentication**: Logout and permission checking

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- WordPress site with REST API enabled
- WordPress Application Password for authentication

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your WordPress site details:

```env
PORT=3000
SERVER_URL=http://localhost:3000
NODE_ENV=development

# WordPress Connection
WORDPRESS_URL=http://localhost/wordpress
WORDPRESS_USERNAME=admin
WORDPRESS_PASSWORD=your_application_password

# Database (if using direct DB access)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wordpress
DB_USER=root
DB_PASSWORD=

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Features
ANALYTICS_ENABLED=true
ACTIVITY_LOG_ENABLED=true
```

## Development

Run the development server with hot reload:

```bash
npm run dev
```

## Build

Build the TypeScript code:

```bash
npm run build
```

## Production

Start the production server:

```bash
npm start
```

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Analytics
- `GET /analytics/overview` - Get analytics overview
- `GET /analytics/stats` - Get detailed statistics
- `GET /user-analytics` - Get user registration analytics (with date filtering)
- `GET /media-analytics` - Get media library analytics
- `POST /media-analytics/refresh` - Refresh media analytics cache

### Users
- `GET /users/roles` - Get all user roles
- `GET /users/capabilities` - Get user capabilities

### Media Management
- `GET /media` - List media files
- `POST /media/upload` - Upload media file
- `DELETE /media/:id` - Delete media file
- `POST /media/bulk-download` - Create ZIP of multiple media files
- `GET /media/:id/usage` - Get media usage information
- `POST /media/replace` - Replace media file while keeping same ID
- `GET /media/tags` - Get all media tags
- `POST /media/tags` - Create new media tag
- `POST /media/:id/tags` - Update media item tags

### Activity Log
- `GET /activity-log` - Get activity logs
- `POST /activity-log` - Create activity log entry

### Server & Monitoring
- `GET /server-health` - Get server health status
- `GET /plugin-metrics` - Get plugin performance metrics

### Plugins
- `GET /plugins` - List installed plugins
- `PUT /plugins/:id/activate` - Activate plugin
- `PUT /plugins/:id/deactivate` - Deactivate plugin

### Roles & Database
- `GET /role-editor` - Get all roles
- `PUT /role-editor/:id` - Update role capabilities
- `GET /database/tables` - List database tables
- `POST /database/query` - Execute database query

### Other
- `POST /logout` - Logout endpoint
- `GET /notices` - Get admin notices
- `POST /notices/seen` - Mark notice as seen
- `GET /search` - Search posts/pages/users including meta
- `GET /posts-tables` - Get posts table data with advanced filtering

## Authentication

All endpoints require Basic Authentication using WordPress credentials:

```bash
# Example with curl
curl -X GET http://localhost:3000/api/v1/analytics/overview \
  -u username:application_password
```

## Project Structure

```
uixpress-ts/
├── src/
│   ├── app/
│   │   └── UiXpress.ts              # Main application class
│   ├── rest/                        # All REST API endpoints (100% complete)
│   │   ├── Analytics.ts             # General analytics
│   │   ├── UserAnalytics.ts         # User analytics
│   │   ├── MediaAnalytics.ts        # Media analytics
│   │   ├── UserRoles.ts             # User roles management
│   │   ├── UserCapabilities.ts      # User capabilities
│   │   ├── Media.ts                 # Media management
│   │   ├── MediaBulk.ts             # Bulk media operations
│   │   ├── MediaReplace.ts          # Media replacement
│   │   ├── MediaTags.ts             # Media tagging
│   │   ├── ActivityLog.ts           # Activity logging
│   │   ├── ServerHealth.ts          # Server health monitoring
│   │   ├── PluginManager.ts         # Plugin management
│   │   ├── PluginMetricsCollector.ts # Plugin metrics
│   │   ├── RoleEditor.ts            # Role editor
│   │   ├── DatabaseExplorer.ts      # Database explorer
│   │   ├── RestPermissionChecker.ts # Permission checking
│   │   ├── RestLogout.ts            # Logout endpoint
│   │   ├── AdminNotices.ts          # Admin notices
│   │   ├── SearchMeta.ts            # Meta search
│   │   └── PostsTables.ts           # Posts tables
│   ├── types/
│   │   └── index.ts                 # TypeScript type definitions
│   └── index.ts                     # Application entry point
├── .env.example                     # Environment variables template
├── package.json                     # NPM dependencies
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # This file
```

## Dependencies

### Runtime Dependencies
- `express` - Web framework
- `cors` - CORS support
- `dotenv` - Environment configuration
- `archiver` - ZIP file creation
- `uuid` - Unique ID generation
- `multer` - File upload handling

### Development Dependencies
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution
- `nodemon` - Development auto-reload
- `@types/*` - TypeScript type definitions

## Conversion Progress

- ✅ Core App: 100% (3/3 files)
- ✅ REST API: 100% (20/20 files)
- ✅ Security: 100% (1/1 files)
- ⏳ Pages: 0% (WordPress UI - not needed for API)
- ⏳ Activity System: 0% (4 files - WordPress-specific)
- ⏳ Analytics System: 0% (3 files - WordPress-specific)
- ⏳ Options: 0% (5 files - WordPress UI)
- ⏳ Update System: 0% (1 file - WordPress-specific)
- ⏳ Tables: 0% (1 file - WordPress UI)

**Total: 45% Complete (24/53 files)**

The remaining files are primarily WordPress-specific UI components and backend systems that may not be necessary for a standalone TypeScript API server.

## Notes

- This server acts as a proxy to WordPress REST API
- Some features require WordPress-side implementation (e.g., custom taxonomies for media tags)
- Activity and Analytics systems in WordPress may need separate database schema
- WordPress UI components (Pages, Options, Tables) are not needed for API-only server

## License

ISC
