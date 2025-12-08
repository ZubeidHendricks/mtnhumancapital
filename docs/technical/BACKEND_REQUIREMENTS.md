# Backend Development Requirements for Avatar Human Capital (AHC)

This document outlines the backend API endpoints, data models, and integrations required to fully support the AHC frontend application.

## 1. Core Platform API

### Authentication (JWT)
Existing endpoints to maintain/refine:
- `POST /auth/login`: Returns `{ access_token, token_type }`
- `GET /auth/me`: Returns current user profile `{ id, name, role, company_id }`

### Jobs Module
Support the Recruitment Dashboard:
- `GET /api/v1/jobs/`: List all open requisitions with stats (applicant count).
- `POST /api/v1/jobs/`: Create new job posting.
- `GET /api/v1/jobs/{id}`: Get details for a specific job.
- `GET /api/v1/jobs/{id}/stats`: Get funnel metrics (screened, interviewed, offered).

### Candidates Module
Support the Candidate Pipeline view:
- `GET /api/v1/candidates/`: List candidates with filters (stage, job_id).
- `GET /api/v1/candidates/{id}`: Get full candidate profile + resume data.
- `POST /api/v1/candidates/upload-resume`: Handle file upload -> Parse with AI -> Create candidate record.
- `PATCH /api/v1/candidates/{id}/stage`: Move candidate pipeline stage (e.g., "Screening" -> "Interviewing").

## 2. New Feature Modules (To Be Built)

### Integrity Evaluation (IE) Module
**Purpose:** Manage background checks and risk scoring.

**Endpoints Required:**
- `POST /api/v1/integrity/request`: Initiate a check for a candidate.
  - Payload: `{ candidate_id, checks: ["criminal", "credit", "id"] }`
- `GET /api/v1/integrity/candidate/{candidate_id}`: Get all check statuses.
- `POST /api/v1/integrity/webhook/{vendor}`: Callback url for 3rd party vendors (e.g., Checkr, Experian) to update status.
- `GET /api/v1/integrity/risk-score/{candidate_id}`: Return calculated AI risk score (0-100) and flags.

### Onboarding Module
**Purpose:** Manage post-offer workflow.

**Endpoints Required:**
- `GET /api/v1/onboarding/status/{candidate_id}`: Get checklist progress (e.g., 75% complete).
- `POST /api/v1/onboarding/trigger/{candidate_id}`: Start onboarding workflow (send welcome email, provision IT).
- `GET /api/v1/onboarding/tasks`: List tasks for HR admin (e.g., "Approve laptop request").

## 3. AI Agent & Interview Integration

### Chat & RAG Agents
Support the "Recruitment Agent" and "HR Assistant" chat interfaces.
- `POST /api/v1/agent/chat`:
  - Payload: `{ message: "Find candidates for PM role", context: { job_id: 12 } }`
  - Response: `{ response: "I found 3 matches...", actions: [...] }` (Streamed response preferred).

### Voice Interview (Chit-Chet / Hume)
- **Config Endpoint:** `GET /api/v1/interview/voice/config`: Return ephemeral token for frontend to connect to Hume EVI.
- **Analysis Webhook:** `POST /api/v1/interview/voice/webhook`: Receive analysis results (transcript, emotion scores) after session ends.

### Video Interview (Cloned / Tavus)
- **Session Create:** `POST /api/v1/interview/video/session`: Create a new conversation session with Tavus Replica.
- **Analysis Webhook:** `POST /api/v1/interview/video/webhook`: Receive video recording link and analysis.

## 4. Third-Party Integrations (Backend-to-Backend)

These should be handled securely on the server, exposing only status to the frontend.

- **LinkedIn:** Oauth handling and profile import.
- **WhatsApp (Twilio/Meta):** Sending template messages for executive alerts.
- **Zoho/Payroll:** Syncing new hire data to payroll system upon "Hired" status.

## 5. Database Schema Updates Needed

Ensure your PostgreSQL schema includes:

```sql
-- Tracking Interview Sessions
CREATE TABLE interview_sessions (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id),
    type VARCHAR(20), -- 'voice' or 'video'
    external_session_id VARCHAR(100), -- Hume/Tavus ID
    status VARCHAR(20), -- 'scheduled', 'completed', 'analyzed'
    transcript TEXT,
    emotion_score JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Integrity Checks
CREATE TABLE integrity_checks (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id),
    check_type VARCHAR(50), -- 'criminal', 'credit'
    provider VARCHAR(50),
    status VARCHAR(20), -- 'pending', 'clear', 'flagged'
    report_url TEXT,
    updated_at TIMESTAMP
);
```
