import { recruitmentAgents, type JobRequirements, type CandidateProfile } from "./recruitment-agents";
import { sourcingOrchestrator, type SpecialistCandidate, type SpecialistResult, type SourcingConfiguration } from "./sourcing-specialists";
import type { IStorage } from "./storage";
import type { Job, RecruitmentSession, InsertCandidate } from "@shared/schema";

export interface RecruitmentProgress {
  sessionId: string;
  status: "analyzing" | "sourcing_linkedin" | "sourcing_pnet" | "sourcing_indeed" | "searching" | "ranking" | "completed" | "failed";
  currentStep: string;
  candidatesFound: number;
  candidatesAdded: number;
  specialistResults?: {
    linkedin?: { found: number; status: string };
    pnet?: { found: number; status: string };
    indeed?: { found: number; status: string };
  };
}

function deduplicateCandidates(candidates: CandidateProfile[]): CandidateProfile[] {
  const seen = new Map<string, CandidateProfile>();
  
  for (const candidate of candidates) {
    const normalizedName = candidate.name.toLowerCase().trim();
    const normalizedCompany = (candidate.company || "").toLowerCase().trim();
    const key = `${normalizedName}|${normalizedCompany}|${candidate.currentRole?.toLowerCase().trim() || ""}`;
    
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
        results: { step: "sourcing_specialists", requirements },
      });

      // Step 3: Run sourcing specialists (LinkedIn, PNet, Indeed)
      console.log(`Running sourcing specialists for job: ${job.title}`);
      
      await this.updateSession(tenantId, sessionId, {
        results: { 
          step: "sourcing_specialists", 
          requirements,
          specialists: { linkedin: "running", pnet: "pending", indeed: "pending" }
        },
      });

      const { results: specialistResults, allCandidates: specialistCandidates, configuration } = 
        await sourcingOrchestrator.runAllSpecialists(job, Math.ceil(maxCandidates / 3));

      const specialistSummary = {
        linkedin: specialistResults.find(r => r.specialist === "LinkedIn Specialist"),
        pnet: specialistResults.find(r => r.specialist === "PNet Specialist"),
        indeed: specialistResults.find(r => r.specialist === "Indeed Specialist"),
      };

      console.log(`Specialists found ${specialistCandidates.length} candidates total`);

      await this.updateSession(tenantId, sessionId, {
        results: { 
          step: "sourcing_ai_search", 
          requirements,
          specialistResults: specialistResults.map(r => ({
            specialist: r.specialist,
            found: r.candidates.length,
            status: r.status,
          })),
          configuration,
        },
      });

      // Step 4: Augment with general AI search
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

      // Merge and deduplicate all candidates
      const allCandidates = deduplicateCandidates([
        ...convertedSpecialistCandidates,
        ...aiCandidates,
      ]);

      console.log(`Total unique candidates after deduplication: ${allCandidates.length}`);

      await this.updateSession(tenantId, sessionId, {
        candidatesFound: allCandidates.length,
        results: { 
          step: "ranking_candidates", 
          candidatesFound: allCandidates.length,
          specialistResults: specialistResults.map(r => ({
            specialist: r.specialist,
            found: r.candidates.length,
            status: r.status,
          })),
          aiSearchFound: aiCandidates.length,
          configuration,
        },
      });

      const candidateProfiles = allCandidates;

      // Step 4: Rank and add candidates
      console.log(`Ranking ${candidateProfiles.length} candidates...`);
      let addedCount = 0;
      const rankedCandidates: any[] = [];

      for (const profile of candidateProfiles) {
        try {
          // Score the candidate
          const { match, reasoning } = await recruitmentAgents.rankCandidate(profile, job, requirements);

          rankedCandidates.push({
            ...profile,
            match,
            reasoning,
          });

          // Only add candidates above minimum match score
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
              metadata: {
                company: profile.company,
                location: profile.location,
                experience: profile.experience,
                aiReasoning: reasoning,
                sourcedBy: "AI Recruitment Agent",
                rawProfile: profile.rawData,
              },
            };

            await this.storage.createCandidate(tenantId, candidateData);
            addedCount++;
          }
        } catch (error) {
          console.error(`Error processing candidate ${profile.name}:`, error);
        }
      }

      // Step 5: Finalize session
      const finalSession = await this.updateSession(tenantId, sessionId, {
        status: "Completed",
        candidatesAdded: addedCount,
        results: {
          step: "completed",
          requirements,
          candidatesFound: candidateProfiles.length,
          candidatesAdded: addedCount,
          rankedCandidates: rankedCandidates.map(c => ({
            name: c.name,
            role: c.currentRole,
            match: c.match,
            reasoning: c.reasoning,
          })),
        },
        completedAt: new Date(),
      });

      console.log(`Recruitment session completed: ${addedCount} candidates added`);

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
