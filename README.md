# 🚀 Avatar Human Capital (AHC)

> **AI-Powered Human Resources Management Platform for the Modern Workplace**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-green.svg)](https://expressjs.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [AI Integration](#ai-integration)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**Avatar Human Capital** is a comprehensive, multi-tenant SaaS platform that revolutionizes the entire employee lifecycle management. Built for the South African market, AHC combines cutting-edge AI technology with practical HR workflows to deliver:

- 🤖 **AI-Powered Recruitment** - Automated candidate sourcing, screening, and ranking
- 🎤 **Voice & Video Interviews** - Dual-stage AI assessment with emotion analysis
- 🔍 **Integrity Evaluation** - Automated background checks with risk scoring
- 📄 **Smart Document Automation** - AI-generated CVs, templates, and compliance docs
- 💬 **WhatsApp Integration** - Candidate communication and engagement
- 📊 **360° KPI Management** - Performance reviews and workforce intelligence
- 🚀 **Automated Onboarding** - Streamlined workflows with task automation

### Target Market
- Recruitment agencies
- HR consultancies
- Corporate HR departments
- White-label partners

---

## ✨ Features

### 🎯 HR Command Centre
- **AI Job Research** - Enter a job title and AI automatically researches and generates complete job specifications from industry standards
- **Smart Job Creation** - Three modes: AI Research (auto-generate), Chat (conversational), or Paste (from existing specs)
- **Clickable Job Cards** - View full job details including duties, qualifications, remuneration, and more
- **Comprehensive Job Specs** - Fields include Customer, Introduction, Duties, Attributes, Qualifications, Remuneration, Gender, Ethics, City/Province

### 🎯 Recruitment & Sourcing
- **AI Recruitment Agent** - Conversational AI for candidate matching and intelligent sourcing
- **Multi-Source Candidate Search** - Search across PNet, LinkedIn, and local database simultaneously
- **Candidate Pipeline** - Visual kanban board with drag-and-drop stage management
- **CV Parsing** - Automatic skill extraction and profile creation using AI
- **RAG-Powered Matching** - Semantic search using pgvector embeddings for best candidate fit
- **Bulk CV Upload** - Upload multiple CVs at once for batch processing

### 🎙️ AI Interview Suite
- **Voice Interview (Hume AI)** - Empathic voice screening with sentiment analysis
- **Video Interview (Tavus)** - Personalized avatar interviews with recording
- **Automated Transcription** - Full interview transcript generation
- **Emotion Analytics** - Tone, confidence, and engagement scoring

### 🔐 Integrity & Compliance
- **Background Checks** - Criminal, credit, ID verification orchestration
- **Risk Assessment** - AI-powered risk scoring (0-100)
- **Social Screening** - LinkedIn/social media analysis with consent
- **Compliance Tracking** - Audit logs and document retention

### 📋 Onboarding & Documentation
- **Automated Workflows** - Task checklists and progress tracking
- **Document Requests** - Batch document collection from candidates
- **Template Generation** - AI-powered CV and document templates
- **Reminder Service** - Automated email/WhatsApp reminders

### 💼 HR Management
- **360° Feedback** - Multi-rater performance reviews
- **KPI Tracking** - Goal setting and performance monitoring
- **Workforce Intelligence** - Analytics and insights dashboard
- **Executive Dashboard** - High-level metrics and visualizations
- **Learning Management** - Training modules and skill development tracking
- **Document Automation** - AI-generated contracts, letters, and HR documents

### 🏢 Multi-Tenant Architecture
- **White-Label Branding** - Custom logos, colors, and domains
- **Subdomain Isolation** - Tenant-specific URLs (client.ahc.ai)
- **Modular Features** - Enable/disable modules per tenant in real-time
- **Role-Based Access** - User, Admin, Super Admin roles
- **Tenant Management Dashboard** - Control subscriptions, payments, and module access
- **Admin Tenant Switching** - View any tenant's workspace as admin
- **Subscription Tiers** - Free, Basic, Professional, and Enterprise plans

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework with modern hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **TailwindCSS 4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animation library
- **TanStack Query** - Server state management
- **Wouter** - Lightweight routing
- **React Hook Form** - Form validation with Zod

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Primary database with pgvector
- **Neon Serverless** - Managed PostgreSQL

### AI & External Services
- **Groq** - LLaMA 3.3 70B for candidate analysis, CV parsing, job creation
- **Hume AI** - Empathic voice interface (EVI)
- **Tavus** - Conversational video avatars
- **OpenAI** - Embeddings for RAG (optional)
- **Twilio/Meta** - WhatsApp Business API

### Infrastructure
- **DigitalOcean** - Hosting and DNS
- **Vercel** - Frontend CDN (optional)
- **GitHub Actions** - CI/CD (optional)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Client (React SPA)                      │
│  - 37 Pages (Dashboards, Agents, Interviews, Admin)    │
│  - Radix UI Components + TailwindCSS                    │
│  - Real-time updates via TanStack Query                 │
└─────────────────────────────────────────────────────────┘
                         ↓ REST API (250 endpoints)
┌─────────────────────────────────────────────────────────┐
│              Express Server (17,732 lines)              │
│  - Tenant Middleware (subdomain resolution)             │
│  - 21 Service Modules (orchestrators, agents)           │
│  - Admin Authentication (Bearer tokens)                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│           PostgreSQL Database (50 tables)               │
│  - Drizzle ORM (type-safe schema)                      │
│  - pgvector extension (1536-dim embeddings)             │
│  - Multi-tenant data isolation                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              AI & External Services                     │
│  Groq | Hume AI | Tavus | WhatsApp | Email             │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **PostgreSQL** 14+ with pgvector extension
- **Git** for version control
- API keys for: Groq, Hume AI (optional), Tavus (optional)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/ZubeidHendricks/AvatarHumanCapital.git
cd AvatarHumanCapital

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Set up the database
npm run db:push

# 5. Seed initial data (optional)
npm run seed

# 6. Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

---

## 🔑 Environment Setup

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ahc

# AI Services
GROQ_API_KEY=gsk_...                    # Required for AI features
HUME_API_KEY=...                        # Optional: Voice interviews
HUME_SECRET_KEY=...                     # Optional: Voice interviews
TAVUS_API_KEY=...                       # Optional: Video interviews
OPENAI_API_KEY=sk-...                   # Optional: Better embeddings

# WhatsApp (optional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+...

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Application
NODE_ENV=development
PORT=5000
SESSION_SECRET=your-random-secret-key
ADMIN_API_KEY=your-admin-api-key      # For protected endpoints
```

### Getting API Keys

#### Groq (Required)
1. Sign up at [console.groq.com](https://console.groq.com)
2. Create API key
3. Free tier: 30 requests/min, 14,400/day

#### Hume AI (Optional)
1. Sign up at [beta.hume.ai](https://beta.hume.ai)
2. Access EVI (Empathic Voice Interface)
3. Get API key and Secret key

#### Tavus (Optional)
1. Request access at [tavus.io](https://tavus.io)
2. Create conversational replica
3. Get API key

---

## 🗄️ Database Setup

### Option 1: Local PostgreSQL

```bash
# Install PostgreSQL 14+
sudo apt install postgresql postgresql-contrib

# Enable pgvector extension
sudo apt install postgresql-14-pgvector

# Create database
createdb ahc

# Connect and enable pgvector
psql ahc
CREATE EXTENSION vector;
\q

# Run migrations
npm run db:push
```

### Option 2: Neon Serverless (Recommended)

1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Enable pgvector in SQL Editor:
   ```sql
   CREATE EXTENSION vector;
   ```
4. Copy connection string to `DATABASE_URL`

### Database Schema

The platform includes **50 tables** covering:
- **Core**: Users, Tenants, Jobs, Candidates, Applications
- **Documents**: CVs, Job Specs, Batches, Requirements
- **Interviews**: Sessions, Recordings, Transcripts, Feedback
- **Integrity**: Checks, Risk Assessments, Social Screening
- **Onboarding**: Workflows, Tasks, Checklists
- **KPIs**: Reviews, Assignments, 360 Feedback
- **Communication**: WhatsApp Messages, Conversation State
- **AI Telemetry**: Model Events, Agent Logs, Recommendations

View full schema: [`shared/schema.ts`](./shared/schema.ts)

---

## 🎮 Running the Application

### Development Mode

```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2 (optional): Frontend only with HMR
npm run dev:client
```

Backend runs on `http://localhost:5000` and serves both API and frontend.

### Production Build

```bash
# Build frontend and backend
npm run build

# Start production server
npm start
```

### Database Management

```bash
# Push schema changes to database
npm run db:push

# Generate migrations (future)
npx drizzle-kit generate

# View database in Drizzle Studio
npx drizzle-kit studio
```

### Type Checking

```bash
# Run TypeScript compiler check
npm run check
```

---

## 📁 Project Structure

```
AvatarHumanCapital/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # 37 route components
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # Radix UI primitives
│   │   │   ├── layout/      # Navbar, Footer
│   │   │   ├── sections/    # Landing page sections
│   │   │   └── voice-agent/ # Hume visualizer
│   │   ├── lib/             # API client, utils
│   │   ├── hooks/           # Custom React hooks
│   │   └── contexts/        # Tenant context
│   ├── public/              # Static assets
│   └── index.html
│
├── server/                    # Express backend (17,732 lines)
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # 250 API endpoints (6,452 lines)
│   ├── storage.ts            # Database abstraction layer
│   ├── db.ts                 # Drizzle connection
│   │
│   ├── *-service.ts          # Core services
│   │   ├── groq-service.ts         # LLM integration
│   │   ├── email-service.ts        # SMTP notifications
│   │   ├── embedding-service.ts    # Vector embeddings
│   │   ├── reminder-service.ts     # Task reminders
│   │   └── whatsapp-service.ts     # WhatsApp API
│   │
│   ├── *-orchestrator.ts     # Business logic
│   │   ├── integrity-orchestrator.ts      # Background checks
│   │   ├── interview-orchestrator.ts      # Interview flow
│   │   ├── onboarding-orchestrator.ts     # Onboarding tasks
│   │   ├── recruitment-orchestrator.ts    # Hiring pipeline
│   │   └── social-screening-orchestrator.ts
│   │
│   ├── *-agent.ts            # AI agents
│   │   ├── job-creation-agent.ts     # AI job descriptions
│   │   ├── onboarding-agent.ts       # Task automation
│   │   └── social-screening-agent.ts # Profile analysis
│   │
│   ├── cv-parser.ts          # Resume extraction
│   ├── cv-template-generator.ts
│   ├── recruitment-agents.ts
│   ├── sourcing-specialists.ts
│   ├── tenant-middleware.ts  # Multi-tenancy
│   ├── admin-middleware.ts   # Auth guards
│   └── seed*.ts              # Database seeders
│
├── shared/                    # Shared types
│   └── schema.ts             # Drizzle schema (50 tables)
│
├── uploads/                   # File storage
│   └── documents/            # Candidate documents
│
├── attached_assets/          # Project assets
├── migrations/               # DB migration files
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
└── README.md
```

---

## 📚 API Documentation

### Authentication
Most endpoints support optional `Authorization: Bearer <ADMIN_API_KEY>` for admin operations.

### Core Endpoints

#### Candidates
- `GET /api/candidates` - List all candidates (tenant-scoped)
- `POST /api/candidates` - Create candidate
- `GET /api/candidates/:id` - Get candidate details
- `PUT /api/candidates/:id` - Update candidate
- `DELETE /api/candidates/:id` - Delete candidate
- `POST /api/candidates/upload-cv` - Upload & parse CV
- `POST /api/candidates/bulk-upload` - Batch upload CVs

#### Jobs
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job (manual or AI-assisted)
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `POST /api/jobs/ai-create` - AI-powered job creation

#### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Apply candidate to job
- `PATCH /api/applications/:id/stage` - Move pipeline stage
- `GET /api/applications/:id/match-analysis` - AI matching score

#### Integrity Evaluation
- `POST /api/integrity/orchestrate` - Run full integrity check
- `GET /api/integrity/checks/:candidateId` - Get check status
- `GET /api/integrity/risk-score/:candidateId` - Get risk assessment
- `POST /api/integrity/social-consent` - Capture consent

#### Interviews
- `POST /api/interviews/hume/token` - Get Hume EVI access token
- `POST /api/interviews/hume/complete` - Save voice interview results
- `POST /api/interviews/tavus/create` - Create video session
- `GET /api/interviews/sessions/:id` - Get interview details

#### Documents
- `GET /api/documents` - List document library
- `POST /api/documents/batch/request` - Bulk document request
- `POST /api/documents/generate-template` - AI template generation
- `GET /api/documents/templates` - List CV templates

#### Onboarding
- `POST /api/onboarding/trigger/:candidateId` - Start onboarding
- `GET /api/onboarding/status/:candidateId` - Get progress
- `PATCH /api/onboarding/tasks/:taskId` - Update task status

#### WhatsApp
- `POST /api/whatsapp/send` - Send message
- `GET /api/whatsapp/conversations/:candidateId` - Get chat history
- `POST /api/whatsapp/webhook` - Webhook receiver (Twilio)

#### KPIs & Performance
- `GET /api/kpi/reviews` - List performance reviews
- `POST /api/kpi/360-feedback` - Submit 360 feedback
- `GET /api/kpi/assignments/:employeeId` - Get KPI assignments

#### Admin
- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/:id` - Get tenant details
- `PATCH /api/tenants/:id/modules` - Enable/disable modules
- `GET /api/admin/users` - List all users

For complete API reference, see: [`BACKEND_FULL_SPECIFICATION.md`](./BACKEND_FULL_SPECIFICATION.md)

---

## 🤖 AI Integration

### Groq LLaMA 3.3 70B

**Used for:**
- CV parsing and skill extraction
- Job description generation
- Candidate research and analysis
- Integrity risk assessment
- Social media profile analysis

**Example:**
```typescript
import { groqService } from './groq-service';

const analysis = await groqService.researchCandidate(
  'John Doe',
  'Senior Software Engineer'
);
```

### Hume AI - Empathic Voice Interface

**Features:**
- Real-time voice conversation
- Emotion detection (joy, sadness, anger, etc.)
- Prosody analysis (tone, pitch, pace)
- Conversational turn-taking

**Integration:**
```typescript
// Get ephemeral access token
const response = await fetch('/api/interviews/hume/token', {
  method: 'POST',
  body: JSON.stringify({ candidateId: '123', jobId: '456' })
});
const { accessToken } = await response.json();

// Use in Hume React SDK
<VoiceProvider auth={{ type: 'accessToken', value: accessToken }}>
  <VoiceInterface />
</VoiceProvider>
```

### Tavus - Video Avatars

**Features:**
- Personalized video avatars
- Real-time conversational AI
- Recording and playback

**Integration:**
```typescript
const session = await fetch('/api/interviews/tavus/create', {
  method: 'POST',
  body: JSON.stringify({ 
    candidateId: '123',
    replicaId: 'r1234567',
    conversationName: 'Tech Interview'
  })
});
```

### RAG (Retrieval Augmented Generation)

**Setup:**
```sql
-- Enable pgvector
CREATE EXTENSION vector;

-- Example: Find similar candidates
SELECT c.*, 
  1 - (c.resume_embedding <=> query_embedding) AS similarity
FROM candidates c
ORDER BY c.resume_embedding <=> query_embedding
LIMIT 10;
```

**Generate embeddings:**
```typescript
import { embeddingService } from './embedding-service';

const embedding = await embeddingService.generateEmbedding(
  'Looking for a React developer with 5 years experience'
);
```

---

## 🚢 Deployment

### DigitalOcean App Platform (Recommended)

1. **Create App**
   - Connect GitHub repository
   - Select `main` branch
   - Detect Node.js buildpack

2. **Configure Build**
   ```yaml
   build_command: npm run build
   run_command: npm start
   ```

3. **Add Database**
   - Create managed PostgreSQL database
   - Enable pgvector extension
   - Copy `DATABASE_URL` to env vars

4. **Set Environment Variables**
   - Add all variables from `.env`
   - Use DO Secrets for sensitive values

5. **Configure Domain**
   - Add custom domain (e.g., app.ahc.ai)
   - Enable HTTPS (automatic)

### Vercel (Frontend Only)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://api.yourdomain.com/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 📖 Additional Documentation

- **[Technical Specification](./TECHNICAL_SPECIFICATION.md)** - Complete system architecture
- **[Backend Full Spec](./BACKEND_FULL_SPECIFICATION.md)** - API endpoints and schemas
- **[AI Agent Workflows](./AI_AGENT_WORKFLOWS.md)** - Agent orchestration details
- **[Tenant Quickstart](./TENANT_QUICKSTART.md)** - Multi-tenant setup guide
- **[DNS Setup Guide](./DNS_SETUP_GUIDE.md)** - Domain configuration

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write descriptive commit messages
- Add tests for new features
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Avatar Human Capital**  
Building the future of HR technology in South Africa

- **Website**: [Coming Soon]
- **Email**: info@avatarhc.ai
- **LinkedIn**: [Coming Soon]

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) - Ultra-fast LLM inference
- [Hume AI](https://hume.ai) - Empathic AI technology
- [Tavus](https://tavus.io) - Conversational video avatars
- [Radix UI](https://radix-ui.com) - Accessible components
- [Drizzle ORM](https://orm.drizzle.team) - Type-safe database queries

---

## 📊 Project Stats

- **Frontend**: 37 pages, 3,200+ lines
- **Backend**: 17,732 lines across 28 modules
- **API Endpoints**: 250 REST endpoints
- **Database Tables**: 50 tables with relationships
- **AI Models**: Groq LLaMA 3.3 70B, Hume EVI, Tavus
- **Integrations**: WhatsApp, Email, LinkedIn (planned)

---

<div align="center">

**Built with ❤️ for the future of work**

[⬆ Back to Top](#-avatar-human-capital-ahc)

</div>
