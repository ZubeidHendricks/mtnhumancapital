# MTN Human Capital - Demo Readiness Audit & Action Plan

**Date:** 2026-02-20
**Purpose:** Assess readiness of key features for client demo and identify work remaining

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Feature 1: HR Command Center Tabs (Jobs, Recruitment, Integrity, Offer, Onboarding)](#feature-1-hr-command-center-tabs)
3. [Feature 2: Job Description & Specifications](#feature-2-job-description--specifications)
4. [Feature 3: Candidate Sourcing / Head Hunting](#feature-3-candidate-sourcing--head-hunting)
5. [Feature 4: Shortlisting Candidates](#feature-4-shortlisting-candidates)
6. [Feature 5: Interviewing Candidates (AI Bot as Charles)](#feature-5-interviewing-candidates-ai-bot-as-charles)
7. [Feature 6: Candidate Ranking & Rating](#feature-6-candidate-ranking--rating)
8. [Action Plan](#action-plan)

---

## Executive Summary

| Feature | Demo Readiness | Key Blockers |
|---------|---------------|--------------|
| HR Command Center - Jobs Tab | **95% Ready** | Minor polish only |
| HR Command Center - Recruitment Tab | **90% Ready** | Minor polish only |
| HR Command Center - Integrity Tab | **90% Ready** | Real API data wired, minor cleanup only |
| HR Command Center - Offer Tab | **20% Ready** | No DB table, no API routes, entirely mock/hardcoded data |
| HR Command Center - Onboarding Tab | **90% Ready** | Real API data wired, minor UX polish remaining |
| Job Description Drafting | **95% Ready** | Minor polish only |
| Candidate Sourcing | **85% Ready** | Simulated data (acceptable for demo) |
| Shortlisting | **90% Ready** | Minor UX improvements needed |
| AI Interview (Charles) | **40% Ready** | Public invite endpoints missing, Charles avatar not created |
| Ranking & Rating | **70% Ready** | Comparison view limited, no dedicated ranking page |

---

## Feature 1: HR Command Center Tabs

### Overview

The HR Dashboard (`client/src/pages/hr-dashboard.tsx`) is the main command center with 5 tabs: **Jobs**, **Recruitment**, **Integrity**, **Offer**, and **Onboarding**. The first two are functional; the last three have significant issues.

---

### Jobs Tab - DEMO READY

**Status:** Fully functional with real API data.
- Job list display with grid/list views
- "Create New Job" button opens job creation dialog
- Job details cards with status, location, salary, department
- Full CRUD operations working

### Recruitment Tab - DEMO READY

**Status:** Fully functional with real API data.
- Candidate pipeline management
- Stage transitions (Screening -> Shortlisted -> Interview -> Offer -> Hired)
- Real candidate data from database
- Integration with recruitment workflow

---

### Integrity Tab - MOSTLY COMPLETE (updated 2026-02-20)

**Status: Real API data wired, UI polished, minor cleanup remaining**

**What's Been Fixed:**
- [x] Removed hardcoded `integrityChecks` mock constant ("Sarah Jenkins", "Marcus Johnson") from `hr-dashboard.tsx`
- [x] Removed unused `onboardingTasks` mock constant
- [x] "Pending Verifications" card now uses real `allIntegrityChecks` from `useQuery` fetching `/api/integrity-checks`
- [x] Candidate names looked up from real candidates array via `check.candidateId`
- [x] Proper empty state: "No integrity checks pending. Start a check from the button above."
- [x] Pending Verifications card UI polished to match Risk Assessment Overview (avatars, spacing, CardDescription, ScrollArea)
- [x] Both cards now same height (`h-[300px]`) with consistent scrollbar styling
- [x] Risk Assessment "No Data" → "Start Integrity Check" now navigates to `/integrity-agent?candidateId=X&autoStart=true`
- [x] Integrity Agent auto-selects candidate from URL and auto-starts evaluation
- [x] Back button on Integrity Agent returns to `/hr-dashboard?tab=integrity`
- [x] URL tab state: `/hr-dashboard?tab=integrity` opens directly to Integrity tab
- [x] Tab changes update URL via `replaceState` for proper browser history

**What Still Works (unchanged):**
- Risk Assessment Overview card with real data via `getCandidateRiskData()`
- Social screening integration with culture fit scores and sentiment
- Social Intelligence Screening banner linking to `/social-screening`
- AI Integrity Banner linking to `/integrity-agent`

**Remaining Minor Issues:**
- [ ] `mockCheckResults` constant in `integrity-agent.tsx` (lines 60-133) is dead code - should be removed for cleanup
- [ ] Social Screening Dashboard Stats CardTitle has redundant CSS classes (cosmetic, not breaking)
- [ ] Integrity checks are not auto-created when candidates reach `integrity_checks` pipeline stage (requires pipeline orchestrator change)

#### Key Files
| File | Purpose |
|------|---------|
| `client/src/pages/hr-dashboard.tsx` (lines 1749-1870) | Integrity tab UI (Pending Verifications + Risk Assessment) |
| `client/src/pages/integrity-agent.tsx` | Integrity Evaluation Agent with auto-start |
| `server/routes.ts` (line 2416+) | Integrity checks API endpoints |
| `shared/schema.ts` (line 101) | integrityChecks table |

---

### Offer Tab - NOT FUNCTIONAL

**Status: Entirely mock data, no backend implementation**

**What Exists:**
- `offer-management.tsx` (429 lines) - UI component with candidate selection, salary input, start date, benefits
- Document generation dialog supporting: offer_letter, employment_contract, welcome_letter, employee_handbook, NDA
- Document generation endpoint: `POST /api/documents/generate/{docType}`

**What's Wrong:**
- **Hardcoded mock candidates** at `offer-management.tsx` lines 59-64:
  ```
  "John Smith" - Senior Developer - pending
  "Sarah Johnson" - Project Manager - sent
  "Mike Wilson" - Data Analyst - accepted
  "Emily Brown" - HR Coordinator - declined
  ```
- **No database table for offers** - `shared/schema.ts` has NO offers table
- **No API routes** - `server/routes.ts` has NO `/api/offers` endpoints
- **"Send Offer" button** just shows a toast notification, doesn't call any API
- **No connection to recruitment pipeline** - doesn't pull candidates from `offer_pending` stage
- Pipeline stages `offer_pending` and `offer_accepted` exist in schema but nothing creates offer records

**What Needs to Be Done:**
- [ ] Create `offers` table in schema (candidateId, jobId, salary, benefits, startDate, status, sentAt, respondedAt, etc.)
- [ ] Create API routes: `GET/POST/PATCH /api/offers`
- [ ] Connect `offer-management.tsx` to fetch real candidates at `offer_pending` stage
- [ ] Wire "Send Offer" button to create offer record and send email/notification
- [ ] Track offer status (draft, sent, viewed, accepted, declined, expired)
- [ ] Integrate with pipeline - auto-create offer when candidate transitions to `offer_pending`

#### Key Files
| File | Purpose |
|------|---------|
| `client/src/pages/offer-management.tsx` (lines 59-64) | Mock data that needs replacing |
| `client/src/pages/hr-dashboard.tsx` (lines 2146-2148) | Offer tab embed |
| `shared/schema.ts` | **MISSING** offers table |
| `server/routes.ts` | **MISSING** offer API routes |

---

### Onboarding Tab - MOSTLY COMPLETE (updated 2026-02-20)

**Status: Real API data wired, buttons call real endpoints, minor polish remaining**

**What's Been Fixed:**
- [x] Removed hardcoded mock employees ("John Smith", "Sarah Johnson", "Mike Wilson")
- [x] Added `onboardingService` to `client/src/lib/api.ts` with 6 methods matching server routes
- [x] Workflows fetched via `useQuery` from `GET /api/onboarding/workflows`
- [x] Candidates fetched via `useQuery` from `GET /api/candidates`
- [x] Employee selector shows real candidates (filtered by onboarding stage, falls back to all candidates)
- [x] "Send Onboarding Pack" button calls `POST /api/onboarding/trigger/:candidateId` via `useMutation`
- [x] "Request IT Setup" button calls same trigger endpoint (orchestrator handles IT provisioning)
- [x] "New Employees" card shows real workflow data with loading spinner and empty state
- [x] Status badges display real workflow status (Pending / In Progress / Completed)
- [x] Current step shown for active workflows
- [x] Document generation dialog pre-fills from selected candidate data (name, role, department, email)
- [x] Mutation success invalidates workflows query to refresh list
- [x] Error handling with toast notifications for all API calls

**Backend (unchanged - already working):**
- Database tables: `onboardingWorkflows`, `onboardingAgentLogs`, `onboardingDocumentRequests`
- API endpoints: trigger, status, workflows, agent-logs, document-requests, reminders, activity summary
- Document generation: `POST /api/documents/generate/:type` (welcome_letter, employee_handbook, etc.)

**Remaining Minor Issues:**
- [ ] Requirement checkboxes (IT Setup, Building Access, Equipment) are collected in state but **not sent to the API** when triggering onboarding - either pass them in the request body or remove from UI
- [ ] `startDate` field is validated as required but **not sent to the API** - the backend defaults to `new Date()` instead
- [ ] No display of document requirements/collection status per workflow (API exists: `GET /api/onboarding/document-requests/:workflowId`)
- [ ] No display of AI agent activity logs per workflow (API exists: `GET /api/onboarding/agent-logs/:workflowId`)
- [ ] Not auto-triggered when candidates reach onboarding pipeline stage (requires pipeline orchestrator change)

#### Key Files
| File | Purpose |
|------|---------|
| `client/src/pages/employee-onboarding.tsx` | Onboarding UI with real API data |
| `client/src/lib/api.ts` (onboardingService) | API client for onboarding endpoints |
| `client/src/pages/hr-dashboard.tsx` | Onboarding tab embed |
| `server/routes.ts` (lines 3623-3818) | Onboarding API routes (working) |
| `shared/schema.ts` (lines 277-293, 1221-1287) | Onboarding tables (working) |

### HR Command Center Demo Risk: **HIGH** for Offer tab only | **LOW** for Integrity and Onboarding tabs (fixed)

---

## Feature 2: Job Description & Specifications

### Status: DEMO READY

### What Works
- **3 AI-powered creation modes** fully functional:
  1. **AI Research Mode** - Enter job title, auto-generates full spec using Groq LLaMA 3.3 70B
  2. **Chat Mode** - Conversational AI collects job details step-by-step
  3. **Paste Spec Mode** - Paste free-form text, AI extracts structured data
- Full editing interface with live preview (right panel)
- Draft saving capability
- Agent assignment to jobs
- Job lifecycle management (create, edit, close, archive, restore)
- SA-context aware (truck licenses, ZAR salaries, local industry knowledge)
- PNET auto-posting in background

### Key Files
| File | Purpose |
|------|---------|
| `client/src/components/job-creation-chat.tsx` | Main job creation UI (1081 lines, 3 modes) |
| `client/src/pages/hr-dashboard.tsx` | Job list display, "Create New Job" button |
| `server/job-creation-agent.ts` | AI job spec generation (536 lines) |
| `server/routes.ts` (lines 1701-1850) | Job creation API endpoints |
| `shared/schema.ts` (lines 17-68) | Jobs table schema |

### What Needs Work for Demo
- [ ] **None critical** - This feature is demo-ready
- [ ] *Nice-to-have:* Confirm PNET posting works end-to-end (currently may have placeholder API)

### Demo Risk: **LOW**

---

## Feature 3: Candidate Sourcing / Head Hunting

### Status: DEMO READY (with simulated candidates)

### What Works
- **Multi-platform sourcing** via 3 AI specialists:
  - LinkedIn Specialist - generates realistic SA profiles
  - PNet Specialist - targets active job seekers
  - Indeed Specialist - broad candidate pools
- **6-step recruitment workflow** visible in UI:
  1. Analyzing Job
  2. Specialist Sourcing (LinkedIn, PNet, Indeed)
  3. AI Search augmentation
  4. AI Screening (LLM evaluation)
  5. Smart Ranking (match scoring)
  6. Complete
- Real-time "AI Agents Working" modal with activity feed
- Top Matches display with candidate cards
- Contact enrichment ("AI Find Contact" button)
- Recruitment session history
- Platform enable/disable configuration
- External candidate import (WeFindjobs.co.za)

### Key Files
| File | Purpose |
|------|---------|
| `client/src/pages/recruitment-agent.tsx` | Main recruitment command center (1114 lines) |
| `client/src/pages/recruitment-setup.tsx` | Platform configuration |
| `server/sourcing-specialists.ts` | LinkedIn/PNet/Indeed specialists (628 lines) |
| `server/recruitment-orchestrator.ts` | Full workflow orchestration |
| `server/recruitment-agents.ts` | Job analysis & candidate ranking |
| `server/routes.ts` (lines 3230-3460) | Sourcing API endpoints |

### What Needs Work for Demo
- [ ] **Candidates are AI-generated simulations** - not pulling from real APIs. This is acceptable for demo but should be disclosed or presented as "AI-powered candidate discovery"
- [ ] Ensure sourcing specialists generate convincing, role-appropriate SA profiles
- [ ] Verify recruitment session completes all 6 stages without errors

### Demo Risk: **LOW** - Simulated data looks realistic and demonstrates the full workflow

---

## Feature 4: Shortlisting Candidates

### Status: DEMO READY

### What Works
- **Dedicated shortlist page** (`/shortlisted-candidates`) with search and filtering
- **One-click shortlisting** from candidates list and recruitment agent
- **Remove from shortlist** (moves back to Screening)
- **AI Interview invite** button with customizable email template
- Pipeline prerequisite validation (minimum 50% match score required)
- Stage history audit trail
- Color-coded match badges (green >= 80%, yellow >= 60%, red < 60%)
- WhatsApp communication integration
- Source badges (Recruited, Uploaded, LinkedIn, etc.)

### Key Files
| File | Purpose |
|------|---------|
| `client/src/pages/shortlisted-candidates.tsx` | Dedicated shortlist page (362 lines) |
| `client/src/pages/candidates-list.tsx` | Candidates list with shortlist tab |
| `client/src/pages/recruitment-agent.tsx` | Shortlist from top matches |
| `client/src/pages/candidate-pipeline.tsx` | Pipeline board with Shortlisted stage |
| `server/pipeline-orchestrator.ts` | Stage transition logic with prerequisites |
| `shared/schema.ts` (lines 2381-2452) | Stage history & blockers tables |

### What Needs Work for Demo
- [ ] Shortlisted candidates page doesn't sort by match score by default - add sorting
- [ ] No bulk shortlisting - only one-at-a-time (minor for demo)
- [ ] Auto-advance from screening not implemented (config flag exists but unused)

### Demo Risk: **LOW**

---

## Feature 5: Interviewing Candidates (AI Bot as Charles)

### Status: SIGNIFICANT WORK NEEDED

### What Works
- **Voice interview** (Hume AI EVI v2) - real-time audio streaming, emotion detection, transcript
- **Video interview** (Tavus AI) - avatar-based video interview with iframe embedding
- **Interview console** - HR review with AI scoring, transcripts, decisions
- **AI analysis** - Groq LLaMA scores: overall, technical, communication, culture fit, problem-solving
- **Decision management** - accepted/rejected/pipeline with HR override
- Session creation and management (authenticated users)
- Emotion tracking from Hume prosody scores

### CRITICAL GAPS

#### 1. "Charles" Avatar - NOT IMPLEMENTED
- **No Charles persona exists** anywhere in the codebase
- **No voice cloning** implemented
- **ElevenLabs** - API key configured but ZERO implementation code
- **Tavus** - Only "Jane Smith" persona exists (hardcoded)
- **Hume** - Uses generic "ITO" voice, no custom voice

**What needs to be done:**
- [ ] **Create Charles voice clone** using ElevenLabs Voice Cloning API (needs voice samples)
- [ ] **Create Charles avatar** in Tavus (needs video of Charles for replica creation)
- [ ] **Create Charles persona** in Tavus with appropriate interview context
- [ ] **Integrate ElevenLabs voice** with Hume EVI for voice interviews (or use Hume custom voice)
- [ ] **Add avatar/persona selection** UI for choosing interview persona
- [ ] **Replace hardcoded "Jane Smith"** with dynamic persona selection

#### 2. Public Interview Invitation Endpoints - NOT IMPLEMENTED
The candidate-facing interview flow is **broken**. Three server endpoints are called by `interview-invite.tsx` but don't exist:

- [ ] `GET /api/public/interview-session/:token` - Load session by public token
- [ ] `GET /api/public/interview-session/:token/config` - Get Hume config without auth
- [ ] `POST /api/public/interview-session/:token/complete` - Save completed interview

**Impact:** Candidates cannot access interviews via email/WhatsApp invite links.

#### 3. Interview Questions - HARDCODED
- [ ] No question bank or question management UI
- [ ] Voice interview uses generic roleplay prompt
- [ ] Video interview uses hardcoded "SodaPop Light Bolt" case study
- [ ] Need dynamic, job-specific interview questions

#### 4. Other Gaps
- [ ] Face-to-face scheduling page is a stub (mock data only)
- [ ] Recording playback not implemented (metadata stored, no player)
- [ ] Duplicate API routes need consolidation (lines 2203-2309 vs 6596-6829)

### Key Files
| File | Purpose |
|------|---------|
| `client/src/pages/interview-voice.tsx` | Voice interview UI (365 lines) |
| `client/src/pages/interview-video.tsx` | Video interview UI (261 lines) |
| `client/src/pages/interview-console.tsx` | HR review console (633 lines) |
| `client/src/pages/interview-invite.tsx` | Public candidate invite page (567 lines, BROKEN) |
| `server/interview-orchestrator.ts` | AI analysis engine (475 lines) |
| `server/routes.ts` (lines 1886-2200, 6593-6828) | Interview API routes |
| `shared/schema.ts` (lines 1140-1454) | Interview tables |

### Demo Risk: **HIGH** - Core demo feature (Charles AI interviewer) doesn't exist yet

---

## Feature 6: Candidate Ranking & Rating

### Status: MOSTLY READY, NEEDS POLISH

### What Works
- **AI-powered scoring** via Groq LLaMA (5 dimensions):
  - Overall Score (0-100)
  - Technical Score (0-100)
  - Communication Score (0-100)
  - Culture Fit Score (0-100)
  - Problem Solving Score (0-100)
- **Dynamic competency scores** stored as JSONB (e.g., `{leadership: 85, teamwork: 90}`)
- **Match scoring** during sourcing (0-100 per candidate)
- **Candidate comparison view** in workflow showcase (up to 4 candidates side-by-side)
- **Decision system** - accepted/rejected/pipeline with confidence score
- **Strengths/weaknesses/insights** identified by AI
- **Flagged concerns** detection
- **Social screening** - culture fit scoring with risk levels
- **Recommendation engine** - suggests alternative roles for pipeline candidates
- **Color-coded match badges** in all candidate lists

### What Needs Work for Demo
- [ ] **Comparison view limited to 4 candidates** - expand or ensure demo uses <= 4
- [ ] **No dedicated ranking/leaderboard page** - candidates ranked inline only
- [ ] **No radar/spider charts** for competency visualization
- [ ] **No sorting by individual scores** (technical, communication, etc.) in candidate lists
- [ ] **No scorecard PDF export** for demo handouts
- [ ] **Interview scoring display in console** could be more visual (progress bars, gauges)

### Key Files
| File | Purpose |
|------|---------|
| `client/src/pages/recruitment-agent.tsx` | Ranked candidate display |
| `client/src/pages/workflow-showcase.tsx` (lines 872-952) | Comparison view |
| `client/src/pages/interview-console.tsx` | Score display in review |
| `server/interview-orchestrator.ts` (lines 180-252) | AI scoring engine |
| `server/recruitment-agents.ts` (lines 178-233) | Match ranking logic |
| `shared/schema.ts` (lines 1364-1397) | Interview feedback scores schema |

### Demo Risk: **MEDIUM** - Works but visual polish needed for impressive demo

---

## Action Plan

### Phase 1: CRITICAL (Must Complete Before Demo)

#### 1.1 Implement Public Interview Invitation Endpoints
**Priority:** CRITICAL | **Effort:** 4-6 hours

Without these, candidates cannot join interviews via invite links.

- Implement `GET /api/public/interview-session/:token` in `server/routes.ts`
  - Look up session by token, return session details (no auth required)
  - Validate token hasn't expired
- Implement `GET /api/public/interview-session/:token/config` in `server/routes.ts`
  - Return Hume EVI access token and config for the session
  - Generate OAuth2 token same as existing voice config endpoint
- Implement `POST /api/public/interview-session/:token/complete` in `server/routes.ts`
  - Save transcripts, emotion data, and recordings
  - Trigger AI analysis via interview orchestrator
  - Update session status to 'completed'

#### 1.2 Create Charles Avatar & Voice
**Priority:** CRITICAL | **Effort:** 8-12 hours

This is the centerpiece of the demo.

**Voice (for voice interviews):**
- Collect voice samples from Charles (minimum 30 seconds, ideally 1-3 minutes)
- Implement ElevenLabs voice cloning API integration:
  - `POST https://api.elevenlabs.io/v1/voices/add` to create cloned voice
  - Store voice_id in configuration
- Option A (Hume route): Configure Hume EVI to use ElevenLabs custom voice
- Option B (ElevenLabs route): Use ElevenLabs for TTS output, Hume for emotion detection only

**Avatar (for video interviews):**
- Record/collect video of Charles (Tavus requires training video)
- Create Tavus replica via API: `POST https://tavusapi.com/v2/replicas`
- Create Tavus persona with Charles' interview style and context
- Update `server/routes.ts` video session creation to use Charles persona/replica

**UI Changes:**
- Add persona/avatar selection dropdown in interview creation
- Replace hardcoded "Jane Smith" with dynamic persona lookup
- Store persona preferences per tenant

#### 1.3 Make Interview Questions Dynamic
**Priority:** HIGH | **Effort:** 3-4 hours

- Create interview prompt builder that pulls from job spec
- Replace hardcoded roleplay prompt in `interview-voice.tsx` with job-specific questions
- Replace hardcoded "SodaPop" case study in video interview with role-appropriate content
- Allow HR to customize/approve questions before interview starts

#### 1.4 Fix HR Command Center - Integrity Tab
**Priority:** ~~CRITICAL~~ DONE | **Effort:** ~~4-6 hours~~ Completed

- [x] Remove mock data fallback in `hr-dashboard.tsx`
- [x] Wire Pending Verifications to use real `allIntegrityChecks` API data
- [x] Show proper empty state instead of fake data
- [x] Polish UI to match Risk Assessment Overview card structure
- [x] Auto-navigate to Integrity Agent with candidate pre-selected and auto-start
- [x] URL tab state and back navigation to integrity tab
- [ ] *Remaining:* Ensure integrity checks auto-created when candidates reach pipeline stage (pipeline orchestrator)
- [ ] *Remaining:* Remove dead `mockCheckResults` code from integrity-agent.tsx

#### 1.5 Fix HR Command Center - Offer Tab
**Priority:** CRITICAL | **Effort:** 6-8 hours

- Create `offers` table in `shared/schema.ts`
- Create `GET/POST/PATCH /api/offers` routes in `server/routes.ts`
- Rewrite `offer-management.tsx` to fetch real candidates at `offer_pending` stage
- Wire "Send Offer" button to create offer record and trigger email notification
- Add offer status tracking (draft, sent, accepted, declined)
- Connect to pipeline stage transitions

#### 1.6 Fix HR Command Center - Onboarding Tab
**Priority:** ~~CRITICAL~~ DONE | **Effort:** ~~3-4 hours~~ Completed

- [x] Replace mock data with `useQuery` fetch from `GET /api/onboarding/workflows`
- [x] Add `onboardingService` to `api.ts` matching all server routes
- [x] Wire "Send Onboarding Pack" to call `POST /api/onboarding/trigger/:candidateId`
- [x] Wire "Request IT Setup" to call trigger endpoint
- [x] Show real workflow status with loading and empty states
- [x] Document generation pre-fills from selected candidate
- [x] Employee selector shows real candidates filtered by onboarding stage
- [ ] *Remaining:* Pass requirement checkboxes (IT/Access/Equipment) and startDate to API
- [ ] *Remaining:* Display document requests and agent activity logs per workflow
- [ ] *Remaining:* Auto-trigger onboarding when candidates reach pipeline stage

### Phase 2: HIGH PRIORITY (Should Complete Before Demo)

#### 2.1 Enhance Ranking & Rating Visualization
**Priority:** HIGH | **Effort:** 4-6 hours

- Add radar/spider chart for candidate competency scores (use recharts, already in project)
- Add progress bar visualization for individual scores in interview console
- Improve comparison view to show score breakdowns (not just match %)
- Add sorting options in candidate lists (by technical, communication, etc.)
- Consider a dedicated "Candidate Rankings" page or tab

#### 2.2 Shortlist Sorting & Polish
**Priority:** HIGH | **Effort:** 2-3 hours

- Add default sort by match score (descending) on shortlisted candidates page
- Add filter by job/department on shortlist page
- Ensure smooth flow: Source -> Shortlist -> Interview -> Rank

#### 2.3 End-to-End Demo Flow Testing
**Priority:** HIGH | **Effort:** 3-4 hours

Test the complete recruitment lifecycle:
1. Create job spec (AI Research mode - most impressive for demo)
2. Deploy AI agents to source candidates
3. Review and shortlist top candidates
4. Send interview invitation to shortlisted candidate
5. Candidate completes AI interview (as Charles)
6. HR reviews scores and rankings in console
7. Make hiring decision

Fix any issues discovered during this walkthrough.

### Phase 3: NICE TO HAVE (Polish for Demo)

#### 3.1 UI Polish
**Priority:** MEDIUM | **Effort:** 2-3 hours

- Ensure consistent styling across all demo pages
- Add loading states and transitions
- Verify mobile responsiveness for key pages
- Test with realistic demo data (SA job titles, companies, locations)

#### 3.2 Pre-seed Demo Data
**Priority:** MEDIUM | **Effort:** 2-3 hours

- Create seed script with realistic demo scenario:
  - 2-3 job specs already created
  - 15-20 sourced candidates at various stages
  - 5-8 shortlisted candidates
  - 2-3 completed interviews with scores
  - Mix of accepted/rejected/pipeline decisions
- Ensures demo starts with populated data

#### 3.3 Scorecard/Report Export
**Priority:** LOW | **Effort:** 4-6 hours

- PDF export of candidate scorecard
- Summary report of interview outcomes
- Would be impressive for demo but not essential

---

## Estimated Total Effort

| Phase | Items | Effort |
|-------|-------|--------|
| Phase 1 - Critical | ~~Integrity tab~~ DONE, ~~Onboarding tab~~ DONE, Public endpoints, Charles avatar, dynamic questions, Offer tab | ~~28-40 hours~~ **21-32 hours remaining** |
| Phase 2 - High Priority | Ranking viz, shortlist sort, E2E testing | 9-13 hours |
| Phase 3 - Nice to Have | UI polish, seed data, exports | 8-12 hours |
| **Total** | | ~~45-65 hours~~ **38-57 hours remaining** |

## Key Dependencies / Blockers

1. **Voice samples from Charles** - Needed for ElevenLabs voice cloning. Without these, cannot create Charles voice.
2. **Video of Charles** - Needed for Tavus replica creation. Without this, cannot create Charles avatar.
3. **Hume AI credentials** - Must be valid and have sufficient quota for demo
4. **Tavus API access** - Must have active subscription with replica creation capability
5. **ElevenLabs API access** - Must have Professional plan or above for voice cloning
6. **Groq API key** - Must be valid for AI analysis (already working)

## Demo Script Suggestion

**Recommended demo flow (40-50 minutes):**

1. **Job Creation** (5 min) - Use AI Research mode, enter "Senior Software Engineer" -> watch AI generate full spec
2. **Candidate Sourcing** (5 min) - Deploy AI agents, show real-time sourcing from LinkedIn/PNet/Indeed
3. **Review & Shortlist** (5 min) - Review top matches, shortlist 3-4 best candidates
4. **Send Interview Invite** (2 min) - Send email/WhatsApp invite to top candidate
5. **AI Interview with Charles** (10 min) - Show candidate conducting interview with Charles avatar
6. **Review & Rank** (5 min) - Show interview console with AI scores, comparison view
7. **Decision** (3 min) - Make hiring decision, show recommendation engine
8. **Integrity Checks** (3 min) - Show integrity tab with risk assessment, criminal/credit/reference checks
9. **Offer Management** (3 min) - Send offer to accepted candidate, show offer tracking
10. **Onboarding** (3 min) - Trigger onboarding workflow, show IT setup and document collection
