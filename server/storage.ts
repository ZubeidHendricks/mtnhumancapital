import { 
  type User, 
  type InsertUser, 
  type Job, 
  type InsertJob,
  type Candidate,
  type InsertCandidate,
  type IntegrityCheck,
  type InsertIntegrityCheck,
  type RecruitmentSession,
  type InsertRecruitmentSession,
  type SystemSetting,
  type InsertSystemSetting,
  type OnboardingWorkflow,
  type InsertOnboardingWorkflow,
  type TenantConfig,
  type InsertTenantConfig,
  type Interview,
  type InsertInterview,
  type InterviewAssessment,
  type InsertInterviewAssessment,
  users,
  jobs,
  candidates,
  integrityChecks,
  recruitmentSessions,
  systemSettings,
  onboardingWorkflows,
  tenantConfig,
  interviews,
  interviewAssessments
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllJobs(tenantId: string): Promise<Job[]>;
  getJob(tenantId: string, id: string): Promise<Job | undefined>;
  createJob(tenantId: string, job: InsertJob): Promise<Job>;
  updateJob(tenantId: string, id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(tenantId: string, id: string): Promise<boolean>;
  
  getAllCandidates(tenantId: string): Promise<Candidate[]>;
  getCandidate(tenantId: string, id: string): Promise<Candidate | undefined>;
  createCandidate(tenantId: string, candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(tenantId: string, id: string, candidate: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  deleteCandidate(tenantId: string, id: string): Promise<boolean>;
  
  getAllIntegrityChecks(tenantId: string): Promise<IntegrityCheck[]>;
  getIntegrityCheck(tenantId: string, id: string): Promise<IntegrityCheck | undefined>;
  getIntegrityChecksByCandidateId(tenantId: string, candidateId: string): Promise<IntegrityCheck[]>;
  getChecksNeedingReminders(tenantId: string, now: Date): Promise<IntegrityCheck[]>;
  createIntegrityCheck(tenantId: string, check: InsertIntegrityCheck): Promise<IntegrityCheck>;
  updateIntegrityCheck(tenantId: string, id: string, check: Partial<InsertIntegrityCheck>): Promise<IntegrityCheck | undefined>;
  deleteIntegrityCheck(tenantId: string, id: string): Promise<boolean>;
  
  getAllRecruitmentSessions(tenantId: string): Promise<RecruitmentSession[]>;
  getRecruitmentSession(tenantId: string, id: string): Promise<RecruitmentSession | undefined>;
  getRecruitmentSessionsByJobId(tenantId: string, jobId: string): Promise<RecruitmentSession[]>;
  createRecruitmentSession(tenantId: string, session: InsertRecruitmentSession): Promise<RecruitmentSession>;
  updateRecruitmentSession(tenantId: string, id: string, session: Partial<InsertRecruitmentSession>): Promise<RecruitmentSession | undefined>;
  deleteRecruitmentSession(tenantId: string, id: string): Promise<boolean>;
  getJobById(tenantId: string, id: string): Promise<Job | undefined>;
  getCandidateById(tenantId: string, id: string): Promise<Candidate | undefined>;
  
  getAllSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  upsertSystemSetting(key: string, value: string, category?: string, description?: string): Promise<SystemSetting>;
  deleteSystemSetting(key: string): Promise<boolean>;
  
  getAllOnboardingWorkflows(tenantId: string): Promise<OnboardingWorkflow[]>;
  getOnboardingWorkflow(tenantId: string, id: string): Promise<OnboardingWorkflow | undefined>;
  getOnboardingWorkflowByCandidateId(tenantId: string, candidateId: string): Promise<OnboardingWorkflow | undefined>;
  createOnboardingWorkflow(tenantId: string, workflow: InsertOnboardingWorkflow): Promise<OnboardingWorkflow>;
  updateOnboardingWorkflow(tenantId: string, id: string, workflow: Partial<InsertOnboardingWorkflow>): Promise<OnboardingWorkflow | undefined>;
  deleteOnboardingWorkflow(tenantId: string, id: string): Promise<boolean>;
  
  getTenantConfig(): Promise<TenantConfig | undefined>;
  getAllTenantConfigs(): Promise<TenantConfig[]>;
  createTenantConfig(config: InsertTenantConfig): Promise<TenantConfig>;
  updateTenantConfig(id: string, config: Partial<InsertTenantConfig>): Promise<TenantConfig | undefined>;
  
  getAllInterviews(tenantId: string): Promise<Interview[]>;
  getInterview(tenantId: string, id: string): Promise<Interview | undefined>;
  getInterviewsByCandidateId(tenantId: string, candidateId: string): Promise<Interview[]>;
  getInterviewsByJobId(tenantId: string, jobId: string): Promise<Interview[]>;
  createInterview(tenantId: string, interview: InsertInterview): Promise<Interview>;
  updateInterview(tenantId: string, id: string, interview: Partial<InsertInterview>): Promise<Interview | undefined>;
  deleteInterview(tenantId: string, id: string): Promise<boolean>;
  
  getInterviewAssessment(tenantId: string, interviewId: string): Promise<InterviewAssessment | undefined>;
  createInterviewAssessment(tenantId: string, assessment: InsertInterviewAssessment): Promise<InterviewAssessment>;
  updateInterviewAssessment(tenantId: string, id: string, assessment: Partial<InsertInterviewAssessment>): Promise<InterviewAssessment | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllJobs(tenantId: string): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.tenantId, tenantId)).orderBy(desc(jobs.createdAt));
  }

  async getJob(tenantId: string, id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)));
    return job || undefined;
  }

  async createJob(tenantId: string, insertJob: InsertJob): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values({ ...insertJob, tenantId })
      .returning();
    return job;
  }

  async updateJob(tenantId: string, id: string, updates: Partial<InsertJob> & { requirementsEmbedding?: any }): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
      .returning();
    return job || undefined;
  }

  async deleteJob(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllCandidates(tenantId: string): Promise<Candidate[]> {
    return await db.select().from(candidates).where(eq(candidates.tenantId, tenantId)).orderBy(desc(candidates.createdAt));
  }

  async getCandidate(tenantId: string, id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(and(eq(candidates.id, id), eq(candidates.tenantId, tenantId)));
    return candidate || undefined;
  }

  async createCandidate(tenantId: string, insertCandidate: InsertCandidate): Promise<Candidate> {
    // Cross-tenant FK validation: if jobId provided, verify it belongs to same tenant
    if (insertCandidate.jobId) {
      const job = await this.getJob(tenantId, insertCandidate.jobId);
      if (!job) {
        throw new Error(`Job ${insertCandidate.jobId} not found in tenant ${tenantId}`);
      }
    }
    
    const [candidate] = await db
      .insert(candidates)
      .values({ ...insertCandidate, tenantId })
      .returning();
    return candidate;
  }

  async updateCandidate(tenantId: string, id: string, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    // Cross-tenant FK validation: if jobId being updated, verify it belongs to same tenant
    if (updates.jobId) {
      const job = await this.getJob(tenantId, updates.jobId);
      if (!job) {
        throw new Error(`Job ${updates.jobId} not found in tenant ${tenantId}`);
      }
    }
    
    const [candidate] = await db
      .update(candidates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(candidates.id, id), eq(candidates.tenantId, tenantId)))
      .returning();
    return candidate || undefined;
  }

  async deleteCandidate(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(candidates).where(and(eq(candidates.id, id), eq(candidates.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllIntegrityChecks(tenantId: string): Promise<IntegrityCheck[]> {
    return await db.select().from(integrityChecks).where(eq(integrityChecks.tenantId, tenantId)).orderBy(desc(integrityChecks.createdAt));
  }

  async getIntegrityCheck(tenantId: string, id: string): Promise<IntegrityCheck | undefined> {
    const [check] = await db.select().from(integrityChecks).where(and(eq(integrityChecks.id, id), eq(integrityChecks.tenantId, tenantId)));
    return check || undefined;
  }

  async getIntegrityChecksByCandidateId(tenantId: string, candidateId: string): Promise<IntegrityCheck[]> {
    return await db.select().from(integrityChecks).where(and(eq(integrityChecks.candidateId, candidateId), eq(integrityChecks.tenantId, tenantId))).orderBy(desc(integrityChecks.createdAt));
  }

  async getChecksNeedingReminders(tenantId: string, now: Date): Promise<IntegrityCheck[]> {
    return await db.select().from(integrityChecks).where(
      and(
        eq(integrityChecks.tenantId, tenantId),
        eq(integrityChecks.reminderEnabled, 1),
        lte(integrityChecks.nextReminderAt, now)
      )
    );
  }

  async createIntegrityCheck(tenantId: string, insertCheck: InsertIntegrityCheck): Promise<IntegrityCheck> {
    // Cross-tenant FK validation: verify candidateId belongs to same tenant
    const candidate = await this.getCandidate(tenantId, insertCheck.candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${insertCheck.candidateId} not found in tenant ${tenantId}`);
    }
    
    const [check] = await db
      .insert(integrityChecks)
      .values({ ...insertCheck, tenantId })
      .returning();
    return check;
  }

  async updateIntegrityCheck(tenantId: string, id: string, updates: Partial<InsertIntegrityCheck>): Promise<IntegrityCheck | undefined> {
    // Cross-tenant FK validation: if candidateId being changed, verify it belongs to same tenant
    if (updates.candidateId) {
      const candidate = await this.getCandidate(tenantId, updates.candidateId);
      if (!candidate) {
        throw new Error(`Candidate ${updates.candidateId} not found in tenant ${tenantId}`);
      }
    }
    
    const [check] = await db
      .update(integrityChecks)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(integrityChecks.id, id), eq(integrityChecks.tenantId, tenantId)))
      .returning();
    return check || undefined;
  }

  async deleteIntegrityCheck(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(integrityChecks).where(and(eq(integrityChecks.id, id), eq(integrityChecks.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllRecruitmentSessions(tenantId: string): Promise<RecruitmentSession[]> {
    return await db.select().from(recruitmentSessions).where(eq(recruitmentSessions.tenantId, tenantId)).orderBy(desc(recruitmentSessions.createdAt));
  }

  async getRecruitmentSession(tenantId: string, id: string): Promise<RecruitmentSession | undefined> {
    const [session] = await db.select().from(recruitmentSessions).where(and(eq(recruitmentSessions.id, id), eq(recruitmentSessions.tenantId, tenantId)));
    return session || undefined;
  }

  async getRecruitmentSessionsByJobId(tenantId: string, jobId: string): Promise<RecruitmentSession[]> {
    return await db.select().from(recruitmentSessions).where(and(eq(recruitmentSessions.jobId, jobId), eq(recruitmentSessions.tenantId, tenantId))).orderBy(desc(recruitmentSessions.createdAt));
  }

  async createRecruitmentSession(tenantId: string, insertSession: InsertRecruitmentSession): Promise<RecruitmentSession> {
    // Cross-tenant FK validation: verify jobId belongs to same tenant
    const job = await this.getJob(tenantId, insertSession.jobId);
    if (!job) {
      throw new Error(`Job ${insertSession.jobId} not found in tenant ${tenantId}`);
    }
    
    const [session] = await db
      .insert(recruitmentSessions)
      .values({ ...insertSession, tenantId })
      .returning();
    return session;
  }

  async updateRecruitmentSession(tenantId: string, id: string, updates: Partial<InsertRecruitmentSession>): Promise<RecruitmentSession | undefined> {
    // Cross-tenant FK validation: if jobId being changed, verify it belongs to same tenant
    if (updates.jobId) {
      const job = await this.getJob(tenantId, updates.jobId);
      if (!job) {
        throw new Error(`Job ${updates.jobId} not found in tenant ${tenantId}`);
      }
    }
    
    const [session] = await db
      .update(recruitmentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(recruitmentSessions.id, id), eq(recruitmentSessions.tenantId, tenantId)))
      .returning();
    return session || undefined;
  }

  async deleteRecruitmentSession(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(recruitmentSessions).where(and(eq(recruitmentSessions.id, id), eq(recruitmentSessions.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getJobById(tenantId: string, id: string): Promise<Job | undefined> {
    return this.getJob(tenantId, id);
  }

  async getCandidateById(tenantId: string, id: string): Promise<Candidate | undefined> {
    return this.getCandidate(tenantId, id);
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).orderBy(systemSettings.category, systemSettings.key);
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || undefined;
  }

  async upsertSystemSetting(key: string, value: string, category: string = "general", description?: string): Promise<SystemSetting> {
    const existing = await this.getSystemSetting(key);
    
    if (existing) {
      const [updated] = await db
        .update(systemSettings)
        .set({ value, category, description, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(systemSettings)
        .values({ key, value, category, description })
        .returning();
      return created;
    }
  }

  async deleteSystemSetting(key: string): Promise<boolean> {
    const result = await db.delete(systemSettings).where(eq(systemSettings.key, key));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllOnboardingWorkflows(tenantId: string): Promise<OnboardingWorkflow[]> {
    return await db.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.tenantId, tenantId)).orderBy(desc(onboardingWorkflows.createdAt));
  }

  async getOnboardingWorkflow(tenantId: string, id: string): Promise<OnboardingWorkflow | undefined> {
    const [workflow] = await db.select().from(onboardingWorkflows).where(and(eq(onboardingWorkflows.id, id), eq(onboardingWorkflows.tenantId, tenantId)));
    return workflow || undefined;
  }

  async getOnboardingWorkflowByCandidateId(tenantId: string, candidateId: string): Promise<OnboardingWorkflow | undefined> {
    const [workflow] = await db.select().from(onboardingWorkflows).where(and(eq(onboardingWorkflows.candidateId, candidateId), eq(onboardingWorkflows.tenantId, tenantId))).orderBy(desc(onboardingWorkflows.createdAt));
    return workflow || undefined;
  }

  async createOnboardingWorkflow(tenantId: string, insertWorkflow: InsertOnboardingWorkflow): Promise<OnboardingWorkflow> {
    // Cross-tenant FK validation: verify candidateId belongs to same tenant
    const candidate = await this.getCandidate(tenantId, insertWorkflow.candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${insertWorkflow.candidateId} not found in tenant ${tenantId}`);
    }
    
    const cleanedWorkflow = Object.fromEntries(
      Object.entries(insertWorkflow).filter(([_, v]) => v !== null && v !== undefined)
    ) as any;
    
    const [workflow] = await db
      .insert(onboardingWorkflows)
      .values({ ...cleanedWorkflow, tenantId })
      .returning();
    return workflow;
  }

  async updateOnboardingWorkflow(tenantId: string, id: string, updates: Partial<InsertOnboardingWorkflow>): Promise<OnboardingWorkflow | undefined> {
    // Cross-tenant FK validation: if candidateId being changed, verify it belongs to same tenant
    if (updates.candidateId) {
      const candidate = await this.getCandidate(tenantId, updates.candidateId);
      if (!candidate) {
        throw new Error(`Candidate ${updates.candidateId} not found in tenant ${tenantId}`);
      }
    }
    
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== null && v !== undefined)
    ) as any;
    
    const [workflow] = await db
      .update(onboardingWorkflows)
      .set({ ...cleanedUpdates, updatedAt: new Date() })
      .where(and(eq(onboardingWorkflows.id, id), eq(onboardingWorkflows.tenantId, tenantId)))
      .returning();
    return workflow || undefined;
  }

  async deleteOnboardingWorkflow(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(onboardingWorkflows).where(and(eq(onboardingWorkflows.id, id), eq(onboardingWorkflows.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getTenantConfig(): Promise<TenantConfig | undefined> {
    const [config] = await db.select().from(tenantConfig).orderBy(desc(tenantConfig.createdAt)).limit(1);
    return config || undefined;
  }

  async getAllTenantConfigs(): Promise<TenantConfig[]> {
    return await db.select().from(tenantConfig).orderBy(desc(tenantConfig.createdAt));
  }

  async createTenantConfig(insertConfig: InsertTenantConfig): Promise<TenantConfig> {
    const [config] = await db
      .insert(tenantConfig)
      .values(insertConfig)
      .returning();
    return config;
  }

  async updateTenantConfig(id: string, updates: Partial<InsertTenantConfig>): Promise<TenantConfig | undefined> {
    const [config] = await db
      .update(tenantConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenantConfig.id, id))
      .returning();
    return config || undefined;
  }

  async getAllInterviews(tenantId: string): Promise<Interview[]> {
    return await db.select().from(interviews).where(eq(interviews.tenantId, tenantId)).orderBy(desc(interviews.createdAt));
  }

  async getInterview(tenantId: string, id: string): Promise<Interview | undefined> {
    const [interview] = await db.select().from(interviews).where(and(eq(interviews.id, id), eq(interviews.tenantId, tenantId)));
    return interview || undefined;
  }

  async getInterviewsByCandidateId(tenantId: string, candidateId: string): Promise<Interview[]> {
    return await db.select().from(interviews).where(and(eq(interviews.candidateId, candidateId), eq(interviews.tenantId, tenantId))).orderBy(desc(interviews.createdAt));
  }

  async getInterviewsByJobId(tenantId: string, jobId: string): Promise<Interview[]> {
    return await db.select().from(interviews).where(and(eq(interviews.jobId, jobId), eq(interviews.tenantId, tenantId))).orderBy(desc(interviews.createdAt));
  }

  async createInterview(tenantId: string, insertInterview: InsertInterview): Promise<Interview> {
    // Cross-tenant FK validation: verify candidateId and jobId belong to same tenant
    if (insertInterview.candidateId) {
      const candidate = await this.getCandidate(tenantId, insertInterview.candidateId);
      if (!candidate) {
        throw new Error(`Candidate ${insertInterview.candidateId} not found in tenant ${tenantId}`);
      }
    }
    
    if (insertInterview.jobId) {
      const job = await this.getJob(tenantId, insertInterview.jobId);
      if (!job) {
        throw new Error(`Job ${insertInterview.jobId} not found in tenant ${tenantId}`);
      }
    }
    
    const [interview] = await db
      .insert(interviews)
      .values({ ...insertInterview, tenantId })
      .returning();
    return interview;
  }

  async updateInterview(tenantId: string, id: string, updates: Partial<InsertInterview>): Promise<Interview | undefined> {
    // Cross-tenant FK validation: if candidateId or jobId being changed, verify they belong to same tenant
    if (updates.candidateId) {
      const candidate = await this.getCandidate(tenantId, updates.candidateId);
      if (!candidate) {
        throw new Error(`Candidate ${updates.candidateId} not found in tenant ${tenantId}`);
      }
    }
    
    if (updates.jobId) {
      const job = await this.getJob(tenantId, updates.jobId);
      if (!job) {
        throw new Error(`Job ${updates.jobId} not found in tenant ${tenantId}`);
      }
    }
    
    const [interview] = await db
      .update(interviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(interviews.id, id), eq(interviews.tenantId, tenantId)))
      .returning();
    return interview || undefined;
  }

  async deleteInterview(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(interviews).where(and(eq(interviews.id, id), eq(interviews.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getInterviewAssessment(tenantId: string, interviewId: string): Promise<InterviewAssessment | undefined> {
    // Cross-tenant validation: verify interview belongs to tenant before accessing assessment
    const interview = await this.getInterview(tenantId, interviewId);
    if (!interview) {
      throw new Error(`Interview ${interviewId} not found in tenant ${tenantId}`);
    }
    
    const [assessment] = await db.select().from(interviewAssessments).where(eq(interviewAssessments.interviewId, interviewId));
    return assessment || undefined;
  }

  async createInterviewAssessment(tenantId: string, insertAssessment: InsertInterviewAssessment): Promise<InterviewAssessment> {
    // Cross-tenant validation: verify interview belongs to tenant before creating assessment
    const interview = await this.getInterview(tenantId, insertAssessment.interviewId);
    if (!interview) {
      throw new Error(`Interview ${insertAssessment.interviewId} not found in tenant ${tenantId}`);
    }
    
    const [assessment] = await db
      .insert(interviewAssessments)
      .values(insertAssessment)
      .returning();
    return assessment;
  }

  async updateInterviewAssessment(tenantId: string, id: string, updates: Partial<InsertInterviewAssessment>): Promise<InterviewAssessment | undefined> {
    // Cross-tenant validation: get existing assessment and verify its interview belongs to tenant
    const existing = await db.select().from(interviewAssessments).where(eq(interviewAssessments.id, id));
    if (!existing || existing.length === 0) {
      return undefined;
    }
    
    const interview = await this.getInterview(tenantId, existing[0].interviewId);
    if (!interview) {
      throw new Error(`Interview ${existing[0].interviewId} not found in tenant ${tenantId}`);
    }
    
    const [assessment] = await db
      .update(interviewAssessments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewAssessments.id, id))
      .returning();
    return assessment || undefined;
  }
}

export const storage = new DatabaseStorage();
