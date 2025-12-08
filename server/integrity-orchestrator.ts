import { groqResearchService, type ResearchTask } from "./groq-service";
import type { IStorage } from "./storage";
import type { IntegrityCheck, InsertIntegrityDocumentRequirement } from "@shared/schema";

export type AgentType = "criminal" | "credit" | "education" | "employment" | "biometric" | "reference";

const DOC_TYPE_MAPPING: Record<string, { type: string; description: string }> = {
  "id document": { type: "id_document", description: "National ID or Passport" },
  "id copy": { type: "id_document", description: "National ID or Passport Copy" },
  "national id": { type: "id_document", description: "National ID Document" },
  "passport": { type: "passport", description: "Passport Document" },
  "proof of address": { type: "proof_of_address", description: "Utility Bill or Bank Statement (< 3 months)" },
  "utility bill": { type: "proof_of_address", description: "Utility Bill (< 3 months)" },
  "bank statement": { type: "bank_statement", description: "Bank Statement (< 3 months)" },
  "police clearance": { type: "police_clearance", description: "Police Clearance Certificate" },
  "criminal record": { type: "police_clearance", description: "Criminal Record Check Certificate" },
  "clearance certificate": { type: "police_clearance", description: "Police Clearance Certificate" },
  "drivers license": { type: "drivers_license", description: "Valid Driver's License" },
  "driving license": { type: "drivers_license", description: "Valid Driver's License" },
  "qualification": { type: "qualification_certificate", description: "Educational Qualification Certificate" },
  "degree": { type: "qualification_certificate", description: "Degree Certificate" },
  "diploma": { type: "qualification_certificate", description: "Diploma Certificate" },
  "certificate": { type: "qualification_certificate", description: "Professional Certificate" },
  "reference letter": { type: "reference_letter", description: "Reference Letter from Previous Employer" },
  "reference": { type: "reference_letter", description: "Professional Reference" },
  "recommendation": { type: "reference_letter", description: "Letter of Recommendation" },
  "work permit": { type: "work_permit", description: "Valid Work Permit" },
  "cv": { type: "cv_resume", description: "Updated CV/Resume" },
  "resume": { type: "cv_resume", description: "Updated Resume" },
  "payslip": { type: "payslip", description: "Recent Payslip" },
  "salary slip": { type: "payslip", description: "Recent Salary Slip" },
  "tax certificate": { type: "tax_certificate", description: "Tax Clearance Certificate" },
  "sars": { type: "tax_certificate", description: "SARS Tax Certificate" },
  "medical certificate": { type: "medical_certificate", description: "Medical Fitness Certificate" },
  "medical": { type: "medical_certificate", description: "Medical Certificate" },
  "credit report": { type: "bank_statement", description: "Credit Bureau Report" },
  "proof of employment": { type: "reference_letter", description: "Employment Confirmation Letter" },
  "employment letter": { type: "reference_letter", description: "Employment Confirmation Letter" },
};

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
    tenantId: string,
    checkId: string,
    candidateId: string,
    onProgress?: (progress: OrchestrationProgress) => void
  ): Promise<IntegrityCheck> {
    console.log(`Starting integrity check ${checkId} for candidate ${candidateId}`);

    // Get candidate details
    const candidate = await this.storage.getCandidateById(tenantId, candidateId);
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
      
      // Update check status with progress tracking (don't overwrite findings)
      const progressUpdate = {
        currentAgent: agentType,
        completedAgents: progress.completedAgents,
        timestamp: new Date().toISOString(),
      };
      
      await this.storage.updateIntegrityCheck(tenantId, checkId, {
        status: "in_progress",
        result: `Running ${agentType} check...`,
        findings: { 
          ...allFindings, // Preserve existing findings
          _progress: progressUpdate // Track progress separately
        },
      });

      if (onProgress) {
        onProgress(progress);
      }

      try {
        // Perform real AI research
        const researchTask: ResearchTask = {
          candidateName: candidate.fullName,
          candidateRole: candidate.role || "Unknown",
          candidateLocation: (candidate.metadata as any)?.location || candidate.location || "South Africa",
          checkType: agentType,
          context: {
            skills: candidate.skills,
            source: candidate.source,
          },
        };

        const result = await groqResearchService.performResearch(researchTask);

        progress.results[agentType] = result;
        progress.completedAgents.push(agentType);

        // Accumulate findings including missing documents and follow-up info
        allFindings[agentType] = {
          findings: result.findings,
          riskScore: result.riskScore,
          details: result.details,
          sources: result.sources,
          missingDocuments: result.missingDocuments || [],
          requiresFollowUp: result.requiresFollowUp || false,
          followUpReason: result.followUpReason || "",
        };

        // Update overall risk score (weighted average)
        overallRiskScore += result.riskScore / this.agentSequence.length;

        // Update check with intermediate results (deep merge, preserve progress)
        await this.storage.updateIntegrityCheck(tenantId, checkId, {
          findings: {
            ...allFindings,
            _progress: {
              currentAgent: agentType,
              completedAgents: [...progress.completedAgents],
              timestamp: new Date().toISOString(),
            }
          },
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
          missingDocuments: [],
          requiresFollowUp: true,
          followUpReason: "Check failed - manual review required",
        };

        // Update database with error (preserve progress)
        await this.storage.updateIntegrityCheck(tenantId, checkId, {
          findings: {
            ...allFindings,
            _progress: {
              currentAgent: agentType,
              completedAgents: [...progress.completedAgents],
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : "Unknown error"
            }
          },
          riskScore: Math.round(overallRiskScore),
        });
      }
    }

    // Finalize the check
    progress.currentAgent = null;
    progress.status = "completed";

    // Final update - remove progress marker since check is complete
    const finalFindings = { ...allFindings };
    delete (finalFindings as any)._progress;
    
    const finalCheck = await this.storage.updateIntegrityCheck(tenantId, checkId, {
      status: "Completed",
      result: this.generateOverallAssessment(finalFindings, overallRiskScore),
      riskScore: Math.round(overallRiskScore),
      findings: finalFindings,
      completedAt: new Date(),
    });

    if (onProgress) {
      onProgress(progress);
    }

    console.log(`Completed integrity check ${checkId} with risk score ${Math.round(overallRiskScore)}`);

    // Create document requirements for any missing documents identified
    await this.createDocumentRequirementsFromFindings(tenantId, checkId, candidateId, finalFindings);

    return finalCheck!;
  }

  private async createDocumentRequirementsFromFindings(
    tenantId: string,
    checkId: string,
    candidateId: string,
    findings: Record<string, any>
  ): Promise<void> {
    // Collect all missing documents from all check types
    const allMissingDocs: Array<{ doc: string; checkType: string }> = [];
    
    for (const [checkType, data] of Object.entries(findings)) {
      if (data?.missingDocuments && Array.isArray(data.missingDocuments)) {
        for (const doc of data.missingDocuments) {
          allMissingDocs.push({ doc: doc.toLowerCase().trim(), checkType });
        }
      }
    }

    if (allMissingDocs.length === 0) {
      console.log(`No missing documents identified for check ${checkId}`);
      return;
    }

    // Map to standardized document types and remove duplicates
    const uniqueRequirements = new Map<string, { type: string; description: string; checkTypes: string[] }>();
    
    for (const { doc, checkType } of allMissingDocs) {
      const matched = this.matchDocumentType(doc);
      if (matched) {
        if (uniqueRequirements.has(matched.type)) {
          uniqueRequirements.get(matched.type)!.checkTypes.push(checkType);
        } else {
          uniqueRequirements.set(matched.type, {
            type: matched.type,
            description: matched.description,
            checkTypes: [checkType],
          });
        }
      } else {
        // Unrecognized document - create as "other" with original description
        const otherKey = `other_${doc.replace(/\s+/g, '_')}`;
        if (!uniqueRequirements.has(otherKey)) {
          uniqueRequirements.set(otherKey, {
            type: "other",
            description: doc.charAt(0).toUpperCase() + doc.slice(1),
            checkTypes: [checkType],
          });
        }
      }
    }

    // Create document requirements
    const requirementsList = Array.from(uniqueRequirements.values());
    console.log(`Creating ${requirementsList.length} document requirements for check ${checkId}`);
    
    // Fetch existing requirements once before the loop
    const existingReqs = await this.storage.getIntegrityDocumentRequirements(tenantId, candidateId);
    
    for (const reqData of requirementsList) {
      try {
        // Check if similar requirement already exists for this candidate
        // For "other" type, also check description to allow multiple distinct requirements
        const alreadyExists = existingReqs.some(
          r => {
            if (r.status !== 'pending' && r.status !== 'requested' && r.status !== 'received') {
              return false;
            }
            if (reqData.type === 'other') {
              // For "other" type, check both type and description match
              return r.documentType === 'other' && 
                     r.description?.toLowerCase() === reqData.description.toLowerCase();
            }
            return r.documentType === reqData.type;
          }
        );
        
        if (alreadyExists) {
          console.log(`Requirement for ${reqData.type} already exists for candidate ${candidateId}, skipping`);
          continue;
        }

        // Generate reference code
        const refCode = `DOC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        // Set due date to 7 days from now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        await this.storage.createIntegrityDocumentRequirement(tenantId, {
          candidateId,
          integrityCheckId: checkId,
          documentType: reqData.type,
          description: reqData.description,
          referenceCode: refCode,
          status: 'pending',
          priority: reqData.checkTypes.length > 1 ? 'high' : 'medium',
          reminderEnabled: 1,
          remindersSent: 0,
          nextReminderAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // First reminder in 24 hours
        });

        console.log(`Created document requirement: ${reqData.type} (${refCode}) for candidate ${candidateId}`);
      } catch (error) {
        console.error(`Failed to create document requirement ${reqData.type}:`, error);
      }
    }
  }

  private matchDocumentType(docString: string): { type: string; description: string } | null {
    const lowerDoc = docString.toLowerCase().trim();
    
    // Direct match
    if (DOC_TYPE_MAPPING[lowerDoc]) {
      return DOC_TYPE_MAPPING[lowerDoc];
    }
    
    // Partial match - check if any key is contained in the document string
    for (const [key, value] of Object.entries(DOC_TYPE_MAPPING)) {
      if (lowerDoc.includes(key) || key.includes(lowerDoc)) {
        return value;
      }
    }
    
    return null;
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
