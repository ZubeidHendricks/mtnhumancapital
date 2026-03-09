# Sourcing & Scraper Improvement Plan

## Date: 2026-03-09

## Context

Zubeid recently changed `server/sourcing-specialists.ts` (88 lines) and `server/web-scraper-agents.ts` (595 lines). We had 6 proposed improvements. This reassesses what's left after his changes.

---

## Status of Original 6 Proposals

| # | Proposal | Status After Zubeid's Changes | Still Needed? |
|---|----------|-------------------------------|---------------|
| 1 | Fix `calculateMatchScore()` + skill extraction | **Partially done** — scoring exists but still uses flat baseline (50) + flat +10 per skill. Does NOT pull from `jobSkills` DB table. Not proportional. | **YES — needs rework** |
| 2 | Filter GitHub orgs + fix GitHub scoring | **NOT done** — no org exclusion, scoring still based on repo count/followers, not language relevance | **YES — fully needed** |
| 3 | Build skill taxonomy | **NOT done** — no related-skills grouping exists anywhere | **YES — fully needed** |
| 4 | Replace LinkedIn/Indeed with Apify | **Partially done** — LinkedIn now has Apify enrichment as a second step (Puppeteer scrape → Apify profile detail). Indeed still pure Puppeteer. Initial scraping still hits anti-bot walls. | **YES — needs completing** |
| 5 | Fix PNet cookie persistence | **DONE** — cookie loading from `PNET_SESSION_COOKIES` env var, fallback to fresh login, cookie export for saving | **NO — complete** |
| 6 | Add scraper health endpoint | **Minimal** — `/api/scrapers` returns list of scrapers but NO health checks, last-run times, error rates, or status colors | **YES — needs real implementation** |

---

## Revised Plan: 5 Remaining Changes

### Phase 1: Fix scoring (highest impact)

**File:** `server/web-scraper-agents.ts` — `calculateMatchScore()` (lines 159-178)

Changes:
- Pull required skills from the `jobSkills` DB table instead of `job.skillsRequired` (which is often empty)
- Also parse skills from `job.description` as fallback
- Make scoring **proportional**: score = (matched skills / total required skills) * weight
- Add title relevance bonus (fuzzy match candidate title vs job title)
- Cap irrelevant candidates at ~25% instead of letting everyone start at 50%

**File:** `server/web-scraper-agents.ts` — GitHub `calculateMatchScore()` (lines 913-931)

Changes:
- Filter out `user.type === "Organization"` from GitHub search results
- Replace repo-count/follower scoring with language-match-weighted scoring
- Weight languages by relevance to job requirements

### Phase 2: Build skill taxonomy

**New data structure** in `server/web-scraper-agents.ts` (or separate `server/skill-taxonomy.ts`)

- Create a map of skill families: `{ "Android Development": ["Kotlin", "Java", "Android SDK", "Jetpack Compose", ...] }`
- Cover major categories: web frontend, web backend, mobile, data/ML, DevOps, design, management
- Integrate into `calculateMatchScore()` so "Kotlin" matches "Android Development" requirement
- ~50-80 skill families should cover most jobs

### Phase 3: Complete Apify migration for LinkedIn & Indeed

**File:** `server/sourcing-specialists.ts` — LinkedIn specialist (lines 251-399)

Changes:
- Use Apify as the **primary** search method (not just enrichment)
- Use Apify's LinkedIn Search actor to find profiles, then Apify Profile Detail for enrichment
- Keep Puppeteer as fallback only if Apify token is missing

**File:** `server/web-scraper-agents.ts` — Indeed scraper

Changes:
- Add Apify Indeed scraper actor as primary method
- Fall back to Puppeteer if Apify unavailable

### Phase 4: Real scraper health endpoint

**File:** `server/routes.ts` — enhance `/api/scrapers/status`

Changes:
- Track last successful run time per scraper (in-memory or DB)
- Track error counts and last error message
- Check API key/token configuration status
- Return status: green (working), yellow (config issue), red (failing)
- `GET /api/scrapers/status` returns dashboard-ready JSON

---

## What We DON'T Need to Do

- **PNet cookie persistence (item 5)** — Already implemented by Zubeid with env var persistence + cookie export

---

## Key File Locations

- `server/web-scraper-agents.ts` — Main scraper logic, calculateMatchScore(), GitHub sourcer (2576 lines)
- `server/sourcing-specialists.ts` — LinkedIn/Indeed/PNet specialists (637 lines)
- `server/routes.ts` — Scraper API endpoints (lines ~3945-4094)

---

## Verification Plan

1. Run sourcing for a test job and confirm scores are proportional (qualified candidates >70%, unqualified <30%)
2. Verify no GitHub organizations appear in candidate results
3. Confirm skill taxonomy matches related skills (e.g., "Kotlin" candidate scores well for "Android Dev" job)
4. Verify LinkedIn/Indeed return real candidates via Apify
5. Hit `GET /api/scrapers/status` and confirm health dashboard JSON
