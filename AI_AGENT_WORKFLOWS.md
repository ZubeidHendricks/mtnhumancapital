# AI Agentic Workflow Specification (LangGraph)

This document details the architecture for the **AI Agentic Workflows** that need to be implemented in your Python/FastAPI backend. These workflows power the "Intelligent" features of the AHC platform.

## Architecture Overview

The backend should use **LangGraph** (built on LangChain) to orchestrate multi-step reasoning.

**Core Concept:** The frontend triggers a "Run," and the backend spins up a graph execution. The frontend then polls (or opens a WebSocket) to visualize the steps.

---

## 1. Recruitment Agent Workflow

**Goal:** Source, screen, and rank candidates for a specific Job ID.

### State Schema (Python)
```python
class RecruitmentState(TypedDict):
    job_id: str
    job_description: str
    candidate_ids: List[str]
    screened_candidates: List[Dict] # {id, score, reasoning}
    final_ranking: List[Dict]
    current_step: str
```

### Graph Nodes (The "Agents")

1.  **`SourceCandidates`**:
    *   **Input:** `job_description`
    *   **Action:** Queries vector DB (candidates) or external APIs (LinkedIn) for matching profiles.
    *   **Output:** Updates `candidate_ids`.

2.  **`ScreeningAgent` (LLM)**:
    *   **Input:** `candidate_profile` + `job_description`
    *   **Action:** Uses LLaMA 3.1 70B to compare resume skills vs. JD requirements.
    *   **Output:** Generates a `match_score` (0-100) and `reasoning` summary.

3.  **`RankingEngine`**:
    *   **Input:** List of screened candidates.
    *   **Action:** Sorts by score and applies diversity/heuristic filters.
    *   **Output:** Updates `final_ranking`.

### Frontend Interaction
*   **Trigger:** `POST /api/v1/agent/recruitment/start { job_id: "123" }`
*   **Visualize:** The "Recruitment Agent" page in the frontend will poll `GET /api/v1/agent/recruitment/{run_id}/status` to show a stepper (Sourcing -> Screening -> Ranking).

---

## 2. Integrity Evaluation Agent Workflow

**Goal:** Assess candidate risk based on background checks.

### State Schema
```python
class IntegrityState(TypedDict):
    candidate_id: str
    checks_required: List[str] # ["criminal", "credit", "id"]
    check_results: Dict[str, str] # {"criminal": "clear", "credit": "pending"}
    risk_score: int
    flags: List[str]
```

### Graph Nodes

1.  **`VendorDispatcher`**:
    *   **Action:** Fires off API requests to third-party background check vendors.
    *   **Logic:** Waits for webhooks/results (Human-in-the-loop pattern may be needed here for long-running checks).

2.  **`RiskAnalyzer` (LLM)**:
    *   **Input:** Raw text reports from vendors.
    *   **Action:** Analyzes reports for keywords ("arrest", "bankruptcy", "fraud").
    *   **Output:** Calculates `risk_score` and generates a "Risk Summary" paragraph.

### Frontend Interaction
*   **Trigger:** User clicks "Start Integrity Check" on dashboard.
*   **Visualize:** The "Integrity" tab updates real-time statuses (Pending -> Clear/Flagged).

---

## 3. Onboarding Orchestrator

**Goal:** Provision resources and manage documents for new hires.

### Graph Nodes

1.  **`DocGenerator`**:
    *   **Action:** Fills PDF templates (Offer Letter, NDA) with candidate data.
    *   **Output:** URLs to signed documents.

2.  **`ProvisioningAgent`**:
    *   **Action:** Calls IT APIs (e.g., Google Workspace, Slack) to create accounts.
    *   **Output:** Credentials (temp passwords) to be emailed.

3.  **`WelcomeBot`**:
    *   **Action:** Composes a personalized welcome email based on the team/role.

---

## 4. Shared "Chat" Agent (RAG)

**Goal:** Answer user questions using platform data.

**Tools required:**
*   `search_candidates(query: str)`
*   `get_job_stats(job_id: str)`
*   `check_policy_docs(query: str)`

**Architecture:**
*   Use a standard ReAct (Reason+Act) loop.
*   The frontend Chat Interface sends messages to `POST /api/v1/agent/chat`.
*   Backend Agent:
    1.  Receives "Find me a PM with Agile exp".
    2.  Calls tool `search_candidates("Project Manager Agile")`.
    3.  Returns natural language summary.

---

## Implementation Guide for DigitalOcean

1.  **LangServe:** Recommended to deploy these graphs using **LangServe** (by LangChain) which automatically creates streaming REST APIs for your graphs.
2.  **Async Workers:** For long-running tasks (like "Sourcing"), use Celery or generic background tasks triggered by the API.
3.  **Persistence:** Use Postgres (via `pgvector` if possible) to store the state of each workflow run so users can refresh the page and see progress.
