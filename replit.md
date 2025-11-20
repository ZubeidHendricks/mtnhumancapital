# Avatar Human Capital (AHC) - AI-Powered HR Management Platform

## Overview

Avatar Human Capital (AHC) is a comprehensive, AI-powered Human Resources Management platform designed to automate and optimize the entire employee lifecycle—from recruitment to ongoing HR management. The platform leverages advanced AI technologies including LangGraph for agentic workflows, Hume AI for empathic voice interviews, and Tavus for personalized video interactions.

The system provides:
- **Recruitment & Selection**: AI-powered candidate sourcing, screening, and ranking
- **Integrity Evaluation**: Automated background checks and risk scoring
- **Onboarding Automation**: Streamlined new hire workflows with digital provisioning
- **HR Management**: Performance tracking, KPI monitoring, and employee lifecycle management
- **Executive Dashboard**: Unified insights across HR, Finance, and Operations
- **Interview Suite**: Dual-stage AI assessment with voice-first screening and video interviews

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Technology Stack:**
- **Framework**: Vite + React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter (lightweight client-side routing)
- **Forms**: React Hook Form with Zod validation
- **Type Safety**: TypeScript with strict mode enabled

**Key Design Decisions:**
- **Component-Based Architecture**: Modular UI components following Radix UI patterns for accessibility
- **Server State vs Client State**: All API data managed through React Query for caching, invalidation, and optimistic updates
- **Type-Safe API Layer**: Shared schema definitions between client and server using Drizzle-Zod
- **Styling Strategy**: Utility-first CSS with Tailwind, custom CSS variables for theming, and motion animations via Framer Motion (note: dependency removed per package.json notes, but still referenced in code)

### Backend Architecture

**Framework & Technology Stack:**
- **Framework**: Express.js (Node.js) with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Driver**: Neon Serverless (supports WebSocket connections)
- **Development**: tsx for TypeScript execution
- **Build**: esbuild for production bundling

**Architectural Patterns:**
- **RESTful API Design**: Standard HTTP methods (GET, POST, PATCH, DELETE) for resource management
- **Storage Pattern**: Repository pattern implemented via `IStorage` interface in `server/storage.ts`
- **Database Layer**: Drizzle ORM provides type-safe database queries with schema-first approach
- **Request Validation**: Zod schemas for runtime type validation with helpful error messages
- **Error Handling**: Centralized error responses with appropriate HTTP status codes

**API Structure:**
The backend follows a resource-based API design with endpoints for:
- `/api/candidates` - Candidate management (CRUD operations)
- `/api/jobs` - Job posting management (CRUD operations)
- Additional planned endpoints per `BACKEND_REQUIREMENTS.md`:
  - `/api/v1/integrity/*` - Background check workflows
  - `/api/v1/onboarding/*` - Employee onboarding management
  - `/api/v1/agent/*` - AI agent interactions and RAG workflows

**Database Schema Design:**
- **Core Entities**: Users, Jobs, Candidates
- **Relationships**: Jobs have many Candidates (one-to-many via `jobId` foreign key)
- **Metadata Storage**: JSONB fields for flexible, evolving data structures
- **Temporal Data**: `createdAt` and `updatedAt` timestamps on all major entities
- **Planned Extensions**: Tenants table for multi-tenancy/white-label support

### AI/ML Architecture

**Planned Integrations** (per specification documents):
- **LangGraph + LangChain**: Multi-step agentic workflows for recruitment, integrity checks, and HR management
- **LLM Provider**: LLaMA 3.1 70B via Groq API for candidate screening and analysis
- **Voice AI**: Hume AI for empathic voice interviews with emotion detection
- **Video AI**: Tavus for personalized video interview avatars
- **Vector Search**: PostgreSQL with pgvector extension for RAG (Retrieval-Augmented Generation)

**Workflow Design:**
- **State-Based Graphs**: Each AI agent maintains typed state (e.g., `RecruitmentState`, `IntegrityState`)
- **Async Task Queue**: Celery + Redis for long-running AI operations
- **Polling + WebSocket**: Frontend can poll or subscribe to real-time workflow updates

### Development & Deployment

**Build System:**
- **Frontend**: Vite with Turbopack support (mentioned in attached assets)
- **Backend**: esbuild with ESM output format
- **Database Migrations**: Drizzle Kit for schema management
- **Environment**: Node.js with ESM module resolution

**Development Workflow:**
- `npm run dev` - Starts Vite dev server (port 5000) + Express backend with hot reload
- `npm run build` - Produces production bundles (frontend to `dist/public`, backend to `dist`)
- `npm run db:push` - Pushes schema changes to database

**Infrastructure** (per attached documents):
- **Database**: DigitalOcean Managed PostgreSQL
- **Backend Deployment**: DigitalOcean App Platform
- **Frontend Deployment**: Vercel (configured via `vercel.json`)
- **File Storage**: AWS S3 Compatible (DigitalOcean Spaces) for resumes/reports

## External Dependencies

### Third-Party Services

**Authentication & Security:**
- **Planned**: JWT-based authentication with RS256 signing (not yet implemented)
- **Session Storage**: Planned integration with `connect-pg-simple` for PostgreSQL session store

**AI & ML Services:**
- **Hume AI**: Voice interview platform with emotion detection (`HUME_API_KEY`, `HUME_SECRET_KEY`)
- **Tavus**: Personalized video avatar generation (`TAVUS_API_KEY`)
- **Groq/OpenAI**: LLM inference for candidate screening (`OPENAI_API_KEY` in env spec)

**Background Check Vendors** (planned integrations):
- Checkr - Criminal background checks
- Experian - Credit checks
- Custom verification providers - ID verification, reference checks

**Storage & Infrastructure:**
- **DigitalOcean Spaces**: S3-compatible object storage (`DIGITALOCEAN_SPACES_KEY`, `DIGITALOCEAN_SPACES_SECRET`)
- **Redis**: Task queue and caching (`REDIS_URL`)

### Database & Data Layer

**PostgreSQL Extensions:**
- **pgvector**: Vector similarity search for RAG-based candidate matching
- **UUID Generation**: `gen_random_uuid()` for primary keys

**ORM & Schema Management:**
- **Drizzle ORM**: Type-safe database queries with schema introspection
- **Drizzle Kit**: Migration generation and database push operations
- **Zod Integration**: Runtime validation via `drizzle-zod` for insert/update schemas

### Frontend Libraries

**UI Components:**
- **Radix UI**: 20+ accessible component primitives (dialogs, dropdowns, tooltips, etc.)
- **shadcn/ui**: Pre-styled components built on Radix with Tailwind

**Data Fetching & State:**
- **TanStack Query**: Server state management with intelligent caching
- **Axios**: HTTP client for API requests

**Utilities:**
- **date-fns**: Date manipulation and formatting
- **class-variance-authority**: Type-safe component variants
- **clsx + tailwind-merge**: Conditional className composition
- **zod**: Schema validation
- **react-hook-form**: Form state management with validation

**Developer Experience:**
- **Replit Plugins**: Cartographer, dev banner, runtime error overlay (development only)
- **TypeScript**: Full type coverage across client and server
- **ESLint/Prettier**: Code quality and formatting (implied by project structure)

### Environment Variables

**Required Configuration:**
```
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port/0
JWT_SECRET_KEY=sk_...
OPENAI_API_KEY=sk-...
HUME_API_KEY=...
HUME_SECRET_KEY=...
TAVUS_API_KEY=...
DIGITALOCEAN_SPACES_KEY=...
DIGITALOCEAN_SPACES_SECRET=...
```

**Deployment Hosts:**
- Database: `aihr-postgres-do-user-23094081-0.g.db.ondigitalocean.com`
- Backend API: `aihr-backend-hmew5.ondigitalocean.app`
- Frontend: Deployed on Vercel with custom domain support