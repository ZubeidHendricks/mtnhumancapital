import { recruitmentAgents, type JobRequirements, type CandidateProfile } from "./recruitment-agents";
import type { IStorage } from "./storage";
import type { Job, RecruitmentSession, InsertCandidate } from "@shared/schema";

export interface RecruitmentProgress {
  sessionId: string;
  status: "analyzing" | "searching" | "ranking" | "completed" | "failed";
  currentStep: string;
  candidatesFound: number;
  candidatesAdded: number;
}

export class RecruitmentOrchestrator {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async executeRecruitment(
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
      const job = await this.storage.getJobById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      await this.updateSession(sessionId, {
        status: "Running",
        results: { step: "analyzing_job" },
      });

      // Step 2: Analyze job requirements using AI
      console.log(`Analyzing job requirements...`);
      const requirements = await recruitmentAgents.analyzeJobRequirements(job);

      await this.updateSession(sessionId, {
        searchQuery: requirements.searchQuery,
        searchCriteria: requirements as any,
        results: { step: "searching_candidates", requirements },
      });

      // Step 3: Search for candidates using AI
      console.log(`Searching for candidates...`);
      const candidateProfiles = await recruitmentAgents.searchCandidates(requirements, maxCandidates);

      await this.updateSession(sessionId, {
        candidatesFound: candidateProfiles.length,
        results: { step: "ranking_candidates", candidatesFound: candidateProfiles.length },
      });

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

            await this.storage.createCandidate(candidateData);
            addedCount++;
          }
        } catch (error) {
          console.error(`Error processing candidate ${profile.name}:`, error);
        }
      }

      // Step 5: Finalize session
      const finalSession = await this.updateSession(sessionId, {
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
      
      await this.updateSession(sessionId, {
        status: "Failed",
        results: {
          step: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  }

  private async updateSession(sessionId: string, updates: any): Promise<RecruitmentSession | null> {
    return await this.storage.updateRecruitmentSession(sessionId, updates);
  }
}
