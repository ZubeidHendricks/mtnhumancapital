import { groqResearchService, type ResearchTask } from "./groq-service";
import type { IStorage } from "./storage";
import type { IntegrityCheck } from "@shared/schema";

export type AgentType = "criminal" | "credit" | "education" | "employment" | "biometric" | "reference";

export interface OrchestrationProgress {
  checkId: string;
  currentAgent: AgentType | null;
  completedAgents: AgentType[];
  totalAgents: number;
  status: "running" | "completed" | "failed";
  results: Record<AgentType, any>;
}

export class IntegrityOrchestrator {
  private storage: IStorage;
  private agentSequence: AgentType[] = [
    "criminal",
    "credit",
    "education",
    "employment",
    "biometric",
    "reference",
  ];

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async executeIntegrityCheck(
    checkId: string,
    candidateId: string,
    onProgress?: (progress: OrchestrationProgress) => void
  ): Promise<IntegrityCheck> {
    console.log(`Starting integrity check ${checkId} for candidate ${candidateId}`);

    // Get candidate details
    const candidate = await this.storage.getCandidateById(candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${candidateId} not found`);
    }

    const progress: OrchestrationProgress = {
      checkId,
      currentAgent: null,
      completedAgents: [],
      totalAgents: this.agentSequence.length,
      status: "running",
      results: {} as Record<AgentType, any>,
    };

    let overallRiskScore = 0;
    let allFindings: Record<string, any> = {};

    // Execute each agent sequentially
    for (const agentType of this.agentSequence) {
      progress.currentAgent = agentType;
      
      // Update check status
      await this.storage.updateIntegrityCheck(checkId, {
        status: "in_progress",
        result: `Running ${agentType} check...`,
        findings: { currentAgent: agentType, completed: progress.completedAgents },
      });

      if (onProgress) {
        onProgress(progress);
      }

      try {
        // Perform real AI research
        const researchTask: ResearchTask = {
          candidateName: candidate.fullName,
          candidateRole: candidate.role,
          candidateLocation: candidate.metadata?.location as string,
          checkType: agentType,
          context: {
            skills: candidate.skills,
            source: candidate.source,
          },
        };

        const result = await groqResearchService.performResearch(researchTask);

        progress.results[agentType] = result;
        progress.completedAgents.push(agentType);

        // Accumulate findings
        allFindings[agentType] = {
          findings: result.findings,
          riskScore: result.riskScore,
          details: result.details,
          sources: result.sources,
        };

        // Update overall risk score (weighted average)
        overallRiskScore += result.riskScore / this.agentSequence.length;

        // Update check with intermediate results
        await this.storage.updateIntegrityCheck(checkId, {
          findings: allFindings,
          riskScore: Math.round(overallRiskScore),
        });

        if (onProgress) {
          onProgress(progress);
        }
      } catch (error) {
        console.error(`Error in ${agentType} check:`, error);
        
        // Record the error but continue with other checks
        allFindings[agentType] = {
          findings: `Error performing ${agentType} check: ${error instanceof Error ? error.message : 'Unknown error'}`,
          riskScore: 50, // Default medium risk on error
          details: { error: error instanceof Error ? error.message : "Unknown error" },
          sources: [],
        };

        // Update database with error
        await this.storage.updateIntegrityCheck(checkId, {
          findings: allFindings,
          riskScore: Math.round(overallRiskScore),
        });
      }
    }

    // Finalize the check
    progress.currentAgent = null;
    progress.status = "completed";

    const finalCheck = await this.storage.updateIntegrityCheck(checkId, {
      status: "Completed",
      result: this.generateOverallAssessment(allFindings, overallRiskScore),
      riskScore: Math.round(overallRiskScore),
      findings: allFindings,
      completedAt: new Date(),
    });

    if (onProgress) {
      onProgress(progress);
    }

    console.log(`Completed integrity check ${checkId} with risk score ${Math.round(overallRiskScore)}`);

    return finalCheck!;
  }

  private generateOverallAssessment(findings: Record<string, any>, riskScore: number): string {
    const riskLevel = riskScore < 30 ? "Low" : riskScore < 60 ? "Medium" : "High";
    const checksCount = Object.keys(findings).length;

    let assessment = `Overall Risk Assessment: ${riskLevel} (Score: ${Math.round(riskScore)}/100)\n\n`;
    assessment += `Completed ${checksCount} background checks:\n`;

    for (const [checkType, data] of Object.entries(findings)) {
      const checkRisk = data.riskScore < 30 ? "✓ Low" : data.riskScore < 60 ? "⚠ Medium" : "✗ High";
      assessment += `\n${checkType.toUpperCase()}: ${checkRisk} (${data.riskScore}/100)\n`;
      assessment += `  ${data.findings.substring(0, 150)}...\n`;
    }

    return assessment;
  }
}
