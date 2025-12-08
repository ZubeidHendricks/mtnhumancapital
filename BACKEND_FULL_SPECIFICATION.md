# Avatar Human Capital (AHC) - Complete Backend Technical Specification

**Version:** 1.0.0
**Date:** November 20, 2025
**Target Infrastructure:** DigitalOcean App Platform (Python/FastAPI + PostgreSQL + Redis)

This document serves as the single source of truth for backend engineering. It details every API endpoint, database schema, authentication flow, and AI workflow required to power the AHC React frontend in production.

---

## 1. System Architecture

### 1.1 Technology Stack
- **API Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 16 (Managed) with `pgvector` extension
- **Task Queue:** Celery + Redis (for long-running AI agents)
- **Auth:** JWT (RS256)
- **Storage:** AWS S3 Compatible (DigitalOcean Spaces) for resumes/reports

### 1.2 Environment Variables
Required configuration for production:
```env
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

---

## 2. Database Schema (PostgreSQL)

### 2.1 Core Tables

```sql
-- Tenants (White-label support)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL, -- e.g. "acme" -> acme.ahc.ai
    branding_config JSONB, -- { "primaryColor": "#...", "logoUrl": "..." }
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50), -- 'admin', 'recruiter', 'hiring_manager'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(100),
    type VARCHAR(50), -- 'full_time', 'contract'
    status VARCHAR(50), -- 'draft', 'published', 'closed'
    description TEXT,
    requirements_embedding VECTOR(1536), -- For RAG matching
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Candidates
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    resume_url TEXT,
    parsed_skills JSONB, -- extracted from resume
    resume_embedding VECTOR(1536), -- For RAG matching
    created_at TIMESTAMP DEFAULT NOW()
);

-- Applications (Join Table)
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    candidate_id UUID REFERENCES candidates(id),
    stage VARCHAR(50), -- 'new', 'screening', 'interview', 'offer', 'hired', 'rejected'
    match_score INTEGER, -- 0-100
    match_reasoning TEXT, -- AI explanation
    applied_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Module-Specific Tables

```sql
-- Interview Sessions (Voice/Video)
CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id),
    type VARCHAR(20), -- 'voice' (Chit-Chet), 'video' (Cloned)
    provider_session_id VARCHAR(255), -- External ID from Hume/Tavus
    status VARCHAR(50), -- 'scheduled', 'in_progress', 'completed', 'failed'
    transcript TEXT,
    analysis_json JSONB, -- Full AI analysis payload
    recording_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Integrity Checks
CREATE TABLE integrity_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id),
    check_type VARCHAR(50), -- 'criminal', 'credit', 'identity'
    provider VARCHAR(50), -- 'checkr', 'experian'
    status VARCHAR(50), -- 'pending', 'clear', 'flagged'
    risk_score INTEGER, -- 0-100
    report_url TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Onboarding Workflows
CREATE TABLE onboarding_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id),
    status VARCHAR(50), -- 'in_progress', 'completed'
    tasks JSONB, -- Array of task objects with status
    start_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. API Specification (REST)

All endpoints must be prefixed with `/api/v1`.
All endpoints except `/auth/login` require `Authorization: Bearer <token>` header.

### 3.1 Authentication
**POST** `/auth/login`
- **Request:** `{ "email": "...", "password": "..." }`
- **Response:** `{ "access_token": "eyJ...", "token_type": "bearer", "user": { ... } }`
- **Logic:** Validate hash, issue JWT signed with `JWT_SECRET_KEY`.

**GET** `/auth/me`
- **Response:** `{ "id": "...", "role": "recruiter", "tenant_id": "..." }`

### 3.2 Jobs & Recruitment
**GET** `/jobs`
- **Query Params:** `?status=published&page=1`
- **Response:** `[ { "id": "...", "title": "Product Manager", "applicant_count": 12, ... } ]`

**POST** `/jobs`
- **Body:** `{ "title": "...", "description": "..." }`
- **Background Logic:** Generate embedding for `description` using OpenAI `text-embedding-3-small` and store in `requirements_embedding`.

**GET** `/candidates`
- **Query Params:** `?job_id=...&stage=screening`
- **Response:** `[ { "id": "...", "match_score": 95, "stage": "screening", ... } ]`

**POST** `/candidates/upload-resume`
- **Body:** `Multipart/Form-Data (file)`
- **Logic:**
    1. Upload file to S3/Spaces.
    2. Parse text (PDF/Docx).
    3. **AI Action:** Extract skills/experience using LLM.
    4. Generate embedding for parsed text.
    5. Store in DB.
    6. If `job_id` provided, trigger **Screening Agent**.

### 3.3 AI Agents & Workflows

**POST** `/agent/recruitment/start`
- **Body:** `{ "job_id": "..." }`
- **Response:** `{ "run_id": "..." }`
- **Logic:** Triggers Celery task to run LangGraph "Sourcing" workflow.

**GET** `/agent/recruitment/{run_id}/status`
- **Response:** `{ "status": "running", "step": "screening_candidates", "progress": 45 }`
- **Frontend Behavior:** Polls this every 2s to update progress bar.

**POST** `/agent/chat`
- **Body:** `{ "message": "Who is the best candidate for PM?", "context": { "job_id": "..." } }`
- **Response:** `Streamed Response` (SSE or chunked transfer).
- **Logic:** RAG lookup against `candidates` table using `pgvector` cosine similarity.

### 3.4 Interviews (Voice/Video)

**GET** `/interview/voice/config`
- **Response:** `{ "access_token": "..." }`
- **Logic:** Call Hume AI API to generate ephemeral access token for web socket connection.

**POST** `/interview/video/session`
- **Body:** `{ "candidate_id": "...", "job_id": "..." }`
- **Response:** `{ "session_url": "https://tavus.io/..." }`
- **Logic:** Create "Replica" conversation via Tavus API with custom prompt based on Job Description.

---

## 4. Integration Webhooks (Callbacks)

You must expose public endpoints for third-party services to hit.

**POST** `/webhooks/hume`
- **Security:** Verify `X-Hume-Signature`.
- **Logic:** Receive "Expression Measurement" JSON. Parse for top emotions (Anxiety, Confidence). Update `interview_sessions` table.

**POST** `/webhooks/tavus`
- **Security:** Verify signature.
- **Logic:** Receive recording URL. Trigger transcription task (if not provided). Update `interview_sessions` status to `completed`.

**POST** `/webhooks/checkr` (Integrity)
- **Logic:** Receive background check status change. If `status == clear`, auto-advance candidate score.

---

## 5. Detailed Logic Flows

### 5.1 The "Matching Engine" Algorithm
When a candidate applies or is sourced:
1.  **Vector Search:** Compare `candidate.resume_embedding` vs `job.requirements_embedding`. (Base Score)
2.  **Keyword Boost:** Exact match on "Must Have" skills (defined in JSON) adds +10 points.
3.  **Experience Calculation:** Normalize "Years of Experience" from resume. If `candidate_exp < job_req`, penalize score.
4.  **Final Score:** Weighted average -> `(VectorSim * 0.6) + (KeywordMatch * 0.2) + (ExpFit * 0.2)`.

### 5.2 Integrity Risk Scoring
Risk Score (0-100, where 100 is High Risk):
-   Base: 0
-   +50 if `criminal_record` != empty.
-   +20 if `credit_score` < 600 (if applicable).
-   +10 per `verification_failure` (employment dates don't match).
-   **LLM Analysis:** Feed all distinct flags to LLaMA 3.1 with prompt "Assess risk for [Role]. Return severity Low/Med/High".

---

## 6. Security Requirements

1.  **Tenant Isolation:** Every SQL query MUST include `WHERE tenant_id = current_user.tenant_id`.
2.  **PII Protection:** Resumes and Background Checks must be stored in encrypted S3 buckets.
3.  **Rate Limiting:** Implement Redis-backed rate limiting on `/auth` and `/agent` endpoints (prevent LLM bill spikes).
4.  **CORS:** Allow only from the specific frontend domain (e.g., `app.ahc.ai`).
