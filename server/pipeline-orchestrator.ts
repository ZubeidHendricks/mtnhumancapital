import { db } from "./db";
import {
  candidates,
  candidateStageHistory,
  jobWorkflowConfigs,
  pipelineBlockers,
  integrityChecks,
  integrityDocumentRequirements,
  onboardingWorkflows,
  interviewSessions,
  jobs,
  pipelineStages,
  type PipelineStage
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface TransitionResult {
  success: boolean;
  candidateId: string;
  fromStage: string;
  toStage: string;
  triggeredActions: string[];
  blockers: string[];
  error?: string;
}

interface StagePrerequisites {
  [key: string]: {
    allowedFromStages: PipelineStage[];
    requiredConditions?: (candidateId: string, tenantId: string) => Promise<{ met: boolean; reason?: string }>;
  };
}

const stagePrerequisites: StagePrerequisites = {
  screening: {
    allowedFromStages: ["sourcing"],
  },
  shortlisted: {
    allowedFromStages: ["screening"],
    requiredConditions: async (candidateId: string) => {
      const candidate = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
      if (candidate.length === 0) return { met: false, reason: "Candidate not found" };
      if (!candidate[0].jobId) return { met: false, reason: "Candidate has no job assigned" };
      if ((candidate[0].match ?? 0) < 50) return { met: false, reason: "Match score too low (min 50%)" };
      return { met: true };
    },
  },
  interviewing: {
    allowedFromStages: ["shortlisted"],
  },
  offer_pending: {
    allowedFromStages: ["interviewing"],
    requiredConditions: async (candidateId: string, tenantId: string) => {
      const sessions = await db.select().from(interviewSessions)
        .where(and(
          eq(interviewSessions.candidateId, candidateId),
          eq(interviewSessions.tenantId, tenantId)
        ));

      if (sessions.length === 0) return { met: false, reason: "No interview session found" };

      const completed = sessions.some(s => s.status === "completed");
      if (!completed) return { met: false, reason: "Interview not yet completed" };

      return { met: true };
    },
  },
  offer_declined: {
    allowedFromStages: ["offer_pending"],
  },
  integrity_checks: {
    allowedFromStages: ["offer_pending"],
  },
  integrity_passed: {
    allowedFromStages: ["integrity_checks"],
    requiredConditions: async (candidateId: string, tenantId: string) => {
      const checks = await db.select().from(integrityChecks)
        .where(and(
          eq(integrityChecks.candidateId, candidateId),
          eq(integrityChecks.tenantId, tenantId)
        ));
      
      if (checks.length === 0) return { met: false, reason: "No integrity checks found" };
      
      const pendingChecks = checks.filter(c =>
        c.status === "Pending" || c.status === "In Progress" || c.status === "Documents Required"
      );
      if (pendingChecks.length > 0) {
        return { met: false, reason: `${pendingChecks.length} check(s) still pending` };
      }
      
      const failedChecks = checks.filter(c => c.result === "Failed" || c.result === "High Risk");
      if (failedChecks.length > 0) {
        return { met: false, reason: `${failedChecks.length} check(s) failed` };
      }
      
      return { met: true };
    },
  },
  integrity_failed: {
    allowedFromStages: ["integrity_checks"],
  },
  onboarding: {
    allowedFromStages: ["integrity_passed"],
  },
  hired: {
    allowedFromStages: ["onboarding"],
    requiredConditions: async (candidateId: string, tenantId: string) => {
      const workflows = await db.select().from(onboardingWorkflows)
        .where(and(
          eq(onboardingWorkflows.candidateId, candidateId),
          eq(onboardingWorkflows.tenantId, tenantId)
        ));
      
      if (workflows.length === 0) return { met: false, reason: "No onboarding workflow found" };
      
      const incomplete = workflows.filter(w => w.status !== "Completed");
      if (incomplete.length > 0) {
        return { met: false, reason: "Onboarding workflow not complete" };
      }
      
      return { met: true };
    },
  },
  rejected: {
    allowedFromStages: ["sourcing", "screening", "shortlisted", "interviewing", "offer_pending", "integrity_checks", "integrity_failed"],
  },
  withdrawn: {
    allowedFromStages: ["sourcing", "screening", "shortlisted", "interviewing", "offer_pending", "offer_declined", "integrity_checks", "onboarding"],
  },
};

export class PipelineOrchestrator {
  
  async transitionCandidate(
    candidateId: string,
    toStage: PipelineStage,
    tenantId: string,
    options: {
      triggeredBy?: "manual" | "auto" | "ai_agent";
      triggeredByUserId?: string;
      reason?: string;
      skipPrerequisites?: boolean;
    } = {}
  ): Promise<TransitionResult> {
    const { triggeredBy = "manual", triggeredByUserId, reason, skipPrerequisites = false } = options;
    
    const triggeredActions: string[] = [];
    const blockers: string[] = [];
    
    try {
      const [candidate] = await db.select().from(candidates)
        .where(and(eq(candidates.id, candidateId), eq(candidates.tenantId, tenantId)));
      
      if (!candidate) {
        return {
          success: false,
          candidateId,
          fromStage: "",
          toStage,
          triggeredActions: [],
          blockers: [],
          error: "Candidate not found",
        };
      }
      
      const fromStage = (candidate.stage || "sourcing").toLowerCase().replace(/\s+/g, '_') as PipelineStage;
      
      if (!skipPrerequisites) {
        const prereqs = stagePrerequisites[toStage];
        if (prereqs) {
          if (!prereqs.allowedFromStages.includes(fromStage)) {
            return {
              success: false,
              candidateId,
              fromStage,
              toStage,
              triggeredActions: [],
              blockers: [`Cannot transition from "${fromStage}" to "${toStage}"`],
              error: `Invalid stage transition`,
            };
          }
          
          if (prereqs.requiredConditions) {
            const conditionResult = await prereqs.requiredConditions(candidateId, tenantId);
            if (!conditionResult.met) {
              blockers.push(conditionResult.reason || "Prerequisites not met");
              
              await this.createBlocker(candidateId, tenantId, candidate.jobId, toStage, conditionResult.reason || "Prerequisites not met");
              
              return {
                success: false,
                candidateId,
                fromStage,
                toStage,
                triggeredActions: [],
                blockers,
                error: "Prerequisites not met",
              };
            }
          }
        }
      }
      
      await db.update(candidates)
        .set({ 
          stage: toStage, 
          updatedAt: new Date() 
        })
        .where(eq(candidates.id, candidateId));
      
      await db.insert(candidateStageHistory).values({
        tenantId,
        candidateId,
        jobId: candidate.jobId,
        fromStage,
        toStage,
        triggeredBy,
        triggeredByUserId,
        reason,
      });
      
      await db.update(pipelineBlockers)
        .set({ status: "resolved", resolvedAt: new Date() })
        .where(and(
          eq(pipelineBlockers.candidateId, candidateId),
          eq(pipelineBlockers.status, "active")
        ));
      
      const postActions = await this.executePostTransitionActions(candidateId, tenantId, candidate.jobId, toStage);
      triggeredActions.push(...postActions);
      
      return {
        success: true,
        candidateId,
        fromStage,
        toStage,
        triggeredActions,
        blockers: [],
      };
      
    } catch (error) {
      console.error("Pipeline transition error:", error);
      return {
        success: false,
        candidateId,
        fromStage: "",
        toStage,
        triggeredActions: [],
        blockers: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
  
  private async executePostTransitionActions(
    candidateId: string,
    tenantId: string,
    jobId: string | null,
    stage: PipelineStage
  ): Promise<string[]> {
    const actions: string[] = [];
    
    const [config] = await db.select().from(jobWorkflowConfigs)
      .where(and(
        eq(jobWorkflowConfigs.tenantId, tenantId),
        jobId ? eq(jobWorkflowConfigs.jobId, jobId) : sql`${jobWorkflowConfigs.jobId} IS NULL`
      ));
    
    switch (stage) {
      case "integrity_checks":
        if (!config || config.autoLaunchIntegrity) {
          await this.launchIntegrityChecks(candidateId, tenantId, config?.requiredChecks || null);
          actions.push("Launched integrity checks");
        }
        break;

      case "integrity_passed":
        if (!config || config.autoLaunchOnboarding) {
          await this.launchOnboarding(candidateId, tenantId, jobId);
          actions.push("Launched onboarding workflow");

          await this.transitionCandidate(candidateId, "onboarding", tenantId, {
            triggeredBy: "auto",
            reason: "Auto-launched after integrity passed",
          });
          actions.push("Transitioned to onboarding");
        }
        break;
    }
    
    return actions;
  }
  
  private async launchIntegrityChecks(
    candidateId: string, 
    tenantId: string, 
    requiredChecks: string[] | null
  ): Promise<void> {
    const checkTypes = requiredChecks || ["Comprehensive", "Criminal Record", "Reference Check", "ID Verification"];
    
    for (const checkType of checkTypes) {
      const existingCheck = await db.select().from(integrityChecks)
        .where(and(
          eq(integrityChecks.candidateId, candidateId),
          eq(integrityChecks.checkType, checkType)
        ))
        .limit(1);
      
      if (existingCheck.length === 0) {
        await db.insert(integrityChecks).values({
          tenantId,
          candidateId,
          checkType,
          status: "Pending",
        });
      }
    }
  }
  
  private async launchInterviewSession(
    candidateId: string,
    tenantId: string,
    jobId: string | null
  ): Promise<void> {
    // Check if there's already a pending/sent session
    const existing = await db.select().from(interviewSessions)
      .where(and(
        eq(interviewSessions.candidateId, candidateId),
        eq(interviewSessions.tenantId, tenantId)
      ))
      .limit(1);

    if (existing.length > 0) return;

    const [candidate] = await db.select().from(candidates)
      .where(eq(candidates.id, candidateId));
    if (!candidate) return;

    let jobTitle = "Open Position";
    if (jobId) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
      if (job) jobTitle = job.title;
    }

    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(interviewSessions).values({
      tenantId,
      candidateId,
      candidateName: candidate.fullName,
      candidatePhone: candidate.phone || undefined,
      jobTitle,
      token,
      interviewType: "voice",
      status: "pending",
      expiresAt,
    });

    // Send email invite if candidate has an email
    if (candidate.email) {
      try {
        const { EmailService } = await import("./email-service");
        const emailService = new EmailService();
        const interviewUrl = `${process.env.APP_URL || 'http://localhost:5000'}/interview/invite/${token}`;
        await emailService.sendInterviewInvitation({
          to: candidate.email,
          candidateName: candidate.fullName || "Candidate",
          jobTitle,
          interviewUrl,
        });
      } catch (e) {
        console.error("[Pipeline] Failed to send interview invite email:", e);
      }
    }
  }

  private async launchOnboarding(
    candidateId: string, 
    tenantId: string, 
    jobId: string | null
  ): Promise<void> {
    const existingWorkflow = await db.select().from(onboardingWorkflows)
      .where(and(
        eq(onboardingWorkflows.candidateId, candidateId),
        eq(onboardingWorkflows.tenantId, tenantId)
      ))
      .limit(1);
    
    if (existingWorkflow.length === 0) {
      await db.insert(onboardingWorkflows).values({
        tenantId,
        candidateId,
        status: "Not Started",
        currentStep: "welcome",
        tasks: [
          { id: "1", name: "Send Welcome Letter", status: "pending", assignee: "AI Agent" },
          { id: "2", name: "Distribute Employee Handbook", status: "pending", assignee: "AI Agent" },
          { id: "3", name: "Collect Tax Documents", status: "pending", assignee: "AI Agent" },
          { id: "4", name: "IT Equipment Setup", status: "pending", assignee: "IT Dept" },
          { id: "5", name: "Benefits Enrollment", status: "pending", assignee: "HR" },
        ],
      });
    }
  }
  
  private async createBlocker(
    candidateId: string,
    tenantId: string,
    jobId: string | null,
    stage: string,
    description: string
  ): Promise<void> {
    await db.insert(pipelineBlockers).values({
      tenantId,
      candidateId,
      jobId,
      stage,
      blockerType: "prerequisite_not_met",
      blockerDescription: description,
      priority: "medium",
      status: "active",
    });
  }
  
  async getCandidatePipelineStatus(candidateId: string, tenantId: string) {
    const [candidate] = await db.select().from(candidates)
      .where(and(eq(candidates.id, candidateId), eq(candidates.tenantId, tenantId)));
    
    if (!candidate) return null;
    
    const history = await db.select().from(candidateStageHistory)
      .where(eq(candidateStageHistory.candidateId, candidateId))
      .orderBy(candidateStageHistory.createdAt);
    
    const activeBlockers = await db.select().from(pipelineBlockers)
      .where(and(
        eq(pipelineBlockers.candidateId, candidateId),
        eq(pipelineBlockers.status, "active")
      ));
    
    const currentStage = (candidate.stage || "sourcing") as PipelineStage;
    const stageIndex = pipelineStages.indexOf(currentStage);
    const progressPercentage = stageIndex >= 0 
      ? Math.round((stageIndex / (pipelineStages.length - 4)) * 100) 
      : 0;
    
    const availableTransitions = this.getAvailableTransitions(currentStage);
    
    return {
      candidate,
      currentStage,
      stageIndex,
      progressPercentage,
      history,
      blockers: activeBlockers,
      availableTransitions,
    };
  }
  
  private getAvailableTransitions(currentStage: PipelineStage): PipelineStage[] {
    const available: PipelineStage[] = [];
    
    for (const [stage, prereqs] of Object.entries(stagePrerequisites)) {
      if (prereqs.allowedFromStages.includes(currentStage)) {
        available.push(stage as PipelineStage);
      }
    }
    
    return available;
  }
  
  async checkAndAutoAdvanceIntegrity(candidateId: string, tenantId: string): Promise<boolean> {
    const checks = await db.select().from(integrityChecks)
      .where(and(
        eq(integrityChecks.candidateId, candidateId),
        eq(integrityChecks.tenantId, tenantId)
      ));

    if (checks.length === 0) return false;

    const allComplete = checks.every(c =>
      c.status === "Completed" || c.status === "Clear"
    );
    const anyFailed = checks.some(c => c.result === "Failed" || c.result === "High Risk");

    if (!allComplete) return false;

    // Also check that all integrity document requirements are verified
    const docReqs = await db.select().from(integrityDocumentRequirements)
      .where(and(
        eq(integrityDocumentRequirements.candidateId, candidateId),
        eq(integrityDocumentRequirements.tenantId, tenantId)
      ));

    if (docReqs.length > 0) {
      const allDocsVerified = docReqs.every(d => d.status === "verified");
      if (!allDocsVerified) return false;
    }

    const toStage = anyFailed ? "integrity_failed" : "integrity_passed";
    const result = await this.transitionCandidate(candidateId, toStage, tenantId, {
      triggeredBy: "auto",
      reason: anyFailed ? "Integrity check(s) failed" : "All integrity checks passed and documents verified",
    });
    return result.success;
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
