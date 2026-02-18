# MTN Human Capital (MTNHC)

## Overview

MTN Human Capital is a comprehensive, multi-tenant SaaS platform for human resources management, built for the South African market. It covers the entire employee lifecycle — recruitment, integrity checks, onboarding, HR management, fleet logistics, learning management, KPI performance tracking, and more. The platform is branded under MTN's design system (Y'ello yellow, navy, etc.) and supports AI-powered features like candidate screening, interview simulations, and document automation.

The application consists of 12 core modules that can be enabled/disabled per tenant:
- **Recruitment** — AI-powered candidate sourcing, screening, job description generation
- **Integrity** — Background checks with risk scoring
- **Onboarding** — Employee onboarding workflows
- **HR Management** — Core HR operations
- **FleetLogix** — Fleet management with drivers, vehicles, routes, loads, salaries, and reconciliation
- **Workforce Intelligence** — Analytics and insights
- **LMS** — Learning management with courses, certificates, leaderboards
- **KPI Performance** — 360° performance reviews
- **Social Screening** — Social media screening
- **Document Automation** — AI-generated documents and templates
- **WhatsApp** — Candidate communication integration
- **PNet** — Job board integration (South African job portal)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Styling**: Tailwind CSS with MTN brand design system (custom CSS variables for MTN Yellow `#FFCB00`, MTN Navy `#002868`, etc.)
- **UI Components**: shadcn/ui (Radix UI primitives) configured in `components.json` with "new-york" style
- **State Management**: TanStack React Query for server state
- **Forms**: React Hook Form with Zod resolvers
- **Routing**: Client-side routing (React Router or similar)
- **Source Location**: `client/src/` directory with aliases `@/` → `client/src/`, `@shared/` → `shared/`

### Backend
- **Runtime**: Node.js with TypeScript (tsx for development)
- **Framework**: Express.js
- **Entry Point**: `server/index.ts`
- **API Pattern**: RESTful endpoints under `/api/` namespace
- **Authentication**: JWT-based auth with bcryptjs for password hashing. Tokens stored in localStorage as `ahc_auth_token`. Session/cookie-based auth also supported.
- **Key Files**: `server/routes.ts` (route definitions), `server/storage.ts` (data access layer), `server/db.ts` (database connection)

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (Neon serverless — `@neondatabase/serverless`)
- **Schema**: Defined in `shared/schema.ts` — shared between frontend and backend
- **Migrations**: Located in `migrations/` directory, managed via Drizzle Kit (`drizzle-kit push` for schema sync)
- **Config**: `drizzle.config.ts` reads `DATABASE_URL` from environment

### Multi-Tenancy
- Tenant isolation via `tenant_id` column on all data tables
- `tenant_config` table stores per-tenant settings: company name, subdomain, primary color, enabled modules, API keys
- Module access controlled via `modules_enabled` JSONB field on tenant config
- Tenants identified by subdomain (e.g., `fleetlogix`, `company`)

### Key Data Models (from schema)
- **Users**: username, email, password (hashed), role, tenantId, isSuperAdmin
- **Tenant Config**: subdomain, companyName, primaryColor, modulesEnabled, apiKeysConfigured
- **FleetLogix**: fleetlogixDrivers, fleetlogixVehicles, fleetlogixRoutes, fleetlogixLoads (all tenant-scoped)
- **LMS**: courses, certificates, certificate templates, leaderboard
- **Recruitment**: candidates, jobs, interviews, integrity checks

### Build & Deploy
- **Dev**: `npm run dev` starts Express server with tsx on port 5000, Vite dev server proxied
- **Build**: Vite builds frontend to `dist/public/`, esbuild bundles server to `dist/index.js`
- **Production**: `npm start` runs `node dist/index.js`
- **Deployment targets**: Replit, DigitalOcean (with PM2), Vercel (frontend only with API proxy to DigitalOcean backend)

### Scripts
- `db:push` — Push Drizzle schema to database
- `tenant:setup` — Set up a new tenant (`scripts/setup-tenant.ts`)
- `tenant:create-admin` — Create admin user for a tenant
- `tenant:list` — List all tenants

## External Dependencies

### Database
- **Neon PostgreSQL** — Serverless Postgres via `@neondatabase/serverless`. Connection string in `DATABASE_URL` environment variable.

### AI/ML Services
- **Groq API** — Used for AI-powered features (candidate screening, job description generation, integrity checks). Previously used `llama-3.1-70b-versatile` model (now decommissioned — needs update to current Groq models). Requires `GROQ_API_KEY` environment variable.

### Job Board Integrations
- **PNet** — South African job portal integration for candidate sourcing
- **APIJobs** — Global job search API
- **jobdataAPI** — Aggregated job listings

### Communication
- **WhatsApp Integration** — For candidate engagement and communication

### AI Interview Platform
- **Tavus** — AI video interview avatars with persona IDs for conducting structured interviews

### Authentication
- **JWT** (`jsonwebtoken`) — Token-based API authentication
- **bcryptjs** — Password hashing

### File Processing
- **xlsx** — Excel file parsing for FleetLogix data imports
- **multer** — File upload handling
- **adm-zip** — ZIP file processing

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required)
- `GROQ_API_KEY` — Groq AI API key (for AI features)
- `ADMIN_API_KEY` — Secret key for admin API endpoints
- `NODE_ENV` — `development` or `production`