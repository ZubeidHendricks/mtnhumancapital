import { recruitmentAgents, type JobRequirements, type CandidateProfile } from "./recruitment-agents";
import { sourcingOrchestrator, type SpecialistCandidate, type SpecialistResult, type SourcingConfiguration } from "./sourcing-specialists";
import { scraperOrchestrator, type ScrapedCandidate } from "./web-scraper-agents";
import type { IStorage } from "./storage";
import type { Job, RecruitmentSession, InsertCandidate, Candidate } from "@shared/schema";

export interface RecruitmentProgress {
  sessionId: string;
  status: "analyzing" | "checking_internal" | "sourcing_specialists" | "sourcing_scrapers" | "sourcing_ai" | "ranking" | "completed" | "failed";
  currentStep: string;
  candidatesFound: number;
  candidatesAdded: number;
  internalMatches?: number;
  specialistResults?: Record<string, { found: number; status: string }>;
  scraperResults?: Record<string, { found: number; status: string }>;
}

function deduplicateCandidates(candidates: CandidateProfile[]): CandidateProfile[] {
  const seen = new Map<string, CandidateProfile>();

  for (const candidate of candidates) {
    // Deduplicate by email first (strongest key), then by name+company+role
    const emailKey = candidate.email?.toLowerCase().trim();
    const nameKey = `${candidate.name.toLowerCase().trim()}|${(candidate.company || "").toLowerCase().trim()}|${candidate.currentRole?.toLowerCase().trim() || ""}`;
    const key = emailKey || nameKey;

    if (!seen.has(key)) {
      seen.set(key, candidate);
    } else {
      const existing = seen.get(key)!;
      if ((candidate.match || 0) > (existing.match || 0)) {
        seen.set(key, candidate);
      }
    }
  }

  return Array.from(seen.values());
}

export class RecruitmentOrchestrator {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async executeRecruitment(
    tenantId: string,
    sessionId: string,
    jobId: string,
    options: {
      maxCandidates?: number;
      minMatchScore?: number;
    } = {}
  ): Promise<RecruitmentSession> {
    const { maxCandidates = 20, minMatchScore = 60 } = options;

    console.log(`Starting recruitment session ${sessionId} for job ${jobId}`);

    try {
      // Step 1: Get job details
      const job = await this.storage.getJobById(tenantId, jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      await this.updateSession(tenantId, sessionId, {
        status: "Running",
        results: { step: "analyzing_job" },
      });

      // Step 2: Analyze job requirements using AI
      console.log(`Analyzing job requirements...`);
      const requirements = await recruitmentAgents.analyzeJobRequirements(job);

      await this.updateSession(tenantId, sessionId, {
        searchQuery: requirements.searchQuery,
        searchCriteria: requirements as any,
        results: { step: "checking_internal", requirements },
      });

      // Step 3: Check internal database first for existing candidates
      console.log(`[RecruitmentOrchestrator] Checking internal database for existing candidates...`);
      const existingCandidates = await this.storage.getCandidatesForJob(tenantId, jobId);
      const allInternalCandidates = await this.storage.getAllCandidates(tenantId);

      // Build a lookup of existing candidates for deduplication
      const existingLookup = new Map<string, Candidate>();
      for (const c of allInternalCandidates) {
        if (c.email) existingLookup.set(c.email.toLowerCase(), c);
        existingLookup.set(c.fullName.toLowerCase(), c);
      }

      const internalMatches = existingCandidates.filter(c =>
        c.match >= minMatchScore && c.status !== "Rejected" && c.stage !== "Lost" && c.stage !== "Rejected"
      );

      console.log(`[RecruitmentOrchestrator] Found ${existingCandidates.length} existing candidates for this job, ${internalMatches.length} above threshold`);

      await this.updateSession(tenantId, sessionId, {
        results: {
          step: "sourcing_specialists",
          requirements,
          internalMatches: internalMatches.length,
        },
      });

      // Step 4: Run sourcing specialists (LinkedIn, PNet, Indeed)
      console.log(`Running sourcing specialists for job: ${job.title}`);

      const { results: specialistResults, allCandidates: specialistCandidates, configuration } =
        await sourcingOrchestrator.runAllSpecialists(job, Math.ceil(maxCandidates / 3));

      console.log(`Specialists found ${specialistCandidates.length} candidates total`);

      // Step 5: Run all scrapers (all 22 platforms)
      console.log(`[RecruitmentOrchestrator] Running all scrapers for: ${job.title}`);

      await this.updateSession(tenantId, sessionId, {
        results: {
          step: "sourcing_scrapers",
          requirements,
          internalMatches: internalMatches.length,
          specialistResults: specialistResults.map(r => ({
            specialist: r.specialist,
            found: r.candidates.length,
            status: r.status,
          })),
        },
      });

      const { results: scraperResults, allCandidates: scraperCandidates } =
        await scraperOrchestrator.runAllScrapers(job, Math.ceil(maxCandidates / 4));

      console.log(`Scrapers found ${scraperCandidates.length} candidates total`);

      await this.updateSession(tenantId, sessionId, {
        results: {
          step: "sourcing_ai_search",
          requirements,
          internalMatches: internalMatches.length,
          specialistResults: specialistResults.map(r => ({
            specialist: r.specialist,
            found: r.candidates.length,
            status: r.status,
          })),
          scraperResults: scraperResults.map(r => ({
            platform: r.platform,
            found: r.candidates.length,
            status: r.status,
          })),
          configuration,
        },
      });

      // Step 6: Augment with general AI search
      console.log(`Augmenting with AI search...`);
      const aiCandidates = await recruitmentAgents.searchCandidates(requirements, Math.ceil(maxCandidates / 2));

      // Convert specialist candidates to CandidateProfile format
      const convertedSpecialistCandidates: CandidateProfile[] = specialistCandidates.map(sc => ({
        name: sc.name,
        currentRole: sc.currentRole,
        company: sc.company,
        location: sc.location,
        skills: sc.skills,
        experience: sc.experience,
        source: sc.source,
        match: sc.match,
        email: sc.email,
        phone: sc.phone,
        rawData: {
          ...sc.rawData,
          specialist: sc.specialist,
          profileUrl: sc.profileUrl,
        },
      }));

      // Convert scraper candidates to CandidateProfile format
      const convertedScraperCandidates: CandidateProfile[] = scraperCandidates.map(sc => ({
        name: sc.name,
        currentRole: sc.title || job.title,
        company: undefined,
        location: sc.location,
        skills: sc.skills,
        experience: sc.experience,
        source: sc.source,
        match: sc.matchScore || 50,
        email: sc.contact?.includes("@") ? sc.contact : undefined,
        phone: sc.contact && !sc.contact.includes("@") ? sc.contact : undefined,
        rawData: {
          sourceUrl: sc.sourceUrl,
          rawText: sc.rawText?.slice(0, 500),
          scrapedFrom: sc.source,
        },
      }));

      // Merge and deduplicate all candidates
      const allCandidates = deduplicateCandidates([
        ...convertedSpecialistCandidates,
        ...convertedScraperCandidates,
        ...aiCandidates,
      ]);

      console.log(`Total unique candidates after deduplication: ${allCandidates.length}`);

      await this.updateSession(tenantId, sessionId, {
        candidatesFound: allCandidates.length,
        results: {
          step: "ranking_candidates",
          candidatesFound: allCandidates.length,
          internalMatches: internalMatches.length,
          specialistResults: specialistResults.map(r => ({
            specialist: r.specialist,
            found: r.candidates.length,
            status: r.status,
          })),
          scraperResults: scraperResults.map(r => ({
            platform: r.platform,
            found: r.candidates.length,
            status: r.status,
          })),
          aiSearchFound: aiCandidates.length,
          configuration,
        },
      });

      // Step 7: Rank and save candidates (with dedup against internal DB)
      console.log(`Ranking ${allCandidates.length} candidates...`);
      let addedCount = 0;
      let skippedRejected = 0;
      let skippedDuplicate = 0;
      const rankedCandidates: any[] = [];

      for (const profile of allCandidates) {
        try {
          const { match, reasoning } = await recruitmentAgents.rankCandidate(profile, job, requirements);

          const candidateEntry: any = {
            ...profile,
            match,
            reasoning,
          };

          // Only save candidates above minimum match score
          if (match >= minMatchScore) {
            const candidateData: InsertCandidate = {
              fullName: profile.name,
              role: profile.currentRole,
              source: profile.source,
              status: "New",
              stage: "Screening",
              match,
              jobId,
              email: profile.email,
              phone: profile.phone,
              skills: profile.skills,
              location: profile.location,
              metadata: {
                company: profile.company,
                experience: profile.experience,
                aiReasoning: reasoning,
                sourcedBy: "AI Recruitment Agent",
                rawProfile: profile.rawData,
              },
            };

            // Use upsert to avoid duplicates and detect rejected candidates
            const { candidate, isNew, previouslyRejected } = await this.storage.upsertScrapedCandidate(tenantId, candidateData);

            if (previouslyRejected) {
              skippedRejected++;
              candidateEntry.status = "previously_rejected";
              candidateEntry.existingCandidateId = candidate.id;
              console.log(`[RecruitmentOrchestrator] Skipping ${profile.name} — previously rejected (${candidate.status}/${candidate.stage})`);
            } else if (!isNew) {
              skippedDuplicate++;
              candidateEntry.status = "existing";
              candidateEntry.existingCandidateId = candidate.id;
              console.log(`[RecruitmentOrchestrator] Candidate ${profile.name} already exists in DB (id: ${candidate.id})`);
            } else {
              addedCount++;
              candidateEntry.status = "new";
              candidateEntry.candidateId = candidate.id;
            }
          }

          rankedCandidates.push(candidateEntry);
        } catch (error) {
          console.error(`Error processing candidate ${profile.name}:`, error);
        }
      }

      // Step 8: Finalize session
      const finalSession = await this.updateSession(tenantId, sessionId, {
        status: "Completed",
        candidatesFound: allCandidates.length + internalMatches.length,
        candidatesAdded: addedCount,
        results: {
          step: "completed",
          requirements,
          internalMatches: internalMatches.length,
          candidatesFound: allCandidates.length,
          candidatesAdded: addedCount,
          skippedRejected,
          skippedDuplicate,
          specialistResults: specialistResults.map(r => ({
            specialist: r.specialist,
            found: r.candidates.length,
            status: r.status,
          })),
          scraperResults: scraperResults.map(r => ({
            platform: r.platform,
            found: r.candidates.length,
            status: r.status,
          })),
          rankedCandidates: rankedCandidates.map(c => ({
            name: c.name,
            role: c.currentRole,
            match: c.match,
            reasoning: c.reasoning,
            status: c.status,
            existingCandidateId: c.existingCandidateId,
          })),
        },
        completedAt: new Date(),
      });

      console.log(`Recruitment session completed: ${addedCount} new, ${skippedDuplicate} existing, ${skippedRejected} previously rejected`);

      return finalSession!;
    } catch (error) {
      console.error(`Recruitment session ${sessionId} failed:`, error);

      await this.updateSession(tenantId, sessionId, {
        status: "Failed",
        results: {
          step: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  }

  private async updateSession(tenantId: string, sessionId: string, updates: any): Promise<RecruitmentSession | undefined> {
    return await this.storage.updateRecruitmentSession(tenantId, sessionId, updates);
  }
}
