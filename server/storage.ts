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
  
  getAllJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;
  
  getAllCandidates(): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: string, candidate: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  deleteCandidate(id: string): Promise<boolean>;
  
  getAllIntegrityChecks(): Promise<IntegrityCheck[]>;
  getIntegrityCheck(id: string): Promise<IntegrityCheck | undefined>;
  getIntegrityChecksByCandidateId(candidateId: string): Promise<IntegrityCheck[]>;
  getChecksNeedingReminders(now: Date): Promise<IntegrityCheck[]>;
  createIntegrityCheck(check: InsertIntegrityCheck): Promise<IntegrityCheck>;
  updateIntegrityCheck(id: string, check: Partial<InsertIntegrityCheck>): Promise<IntegrityCheck | undefined>;
  deleteIntegrityCheck(id: string): Promise<boolean>;
  
  getAllRecruitmentSessions(): Promise<RecruitmentSession[]>;
  getRecruitmentSession(id: string): Promise<RecruitmentSession | undefined>;
  getRecruitmentSessionsByJobId(jobId: string): Promise<RecruitmentSession[]>;
  createRecruitmentSession(session: InsertRecruitmentSession): Promise<RecruitmentSession>;
  updateRecruitmentSession(id: string, session: Partial<InsertRecruitmentSession>): Promise<RecruitmentSession | undefined>;
  deleteRecruitmentSession(id: string): Promise<boolean>;
  getJobById(id: string): Promise<Job | undefined>;
  getCandidateById(id: string): Promise<Candidate | undefined>;
  
  getAllSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  upsertSystemSetting(key: string, value: string, category?: string, description?: string): Promise<SystemSetting>;
  deleteSystemSetting(key: string): Promise<boolean>;
  
  getAllOnboardingWorkflows(): Promise<OnboardingWorkflow[]>;
  getOnboardingWorkflow(id: string): Promise<OnboardingWorkflow | undefined>;
  getOnboardingWorkflowByCandidateId(candidateId: string): Promise<OnboardingWorkflow | undefined>;
  createOnboardingWorkflow(workflow: InsertOnboardingWorkflow): Promise<OnboardingWorkflow>;
  updateOnboardingWorkflow(id: string, workflow: Partial<InsertOnboardingWorkflow>): Promise<OnboardingWorkflow | undefined>;
  deleteOnboardingWorkflow(id: string): Promise<boolean>;
  
  getTenantConfig(): Promise<TenantConfig | undefined>;
  createTenantConfig(config: InsertTenantConfig): Promise<TenantConfig>;
  updateTenantConfig(id: string, config: Partial<InsertTenantConfig>): Promise<TenantConfig | undefined>;
  
  getAllInterviews(): Promise<Interview[]>;
  getInterview(id: string): Promise<Interview | undefined>;
  getInterviewsByCandidateId(candidateId: string): Promise<Interview[]>;
  getInterviewsByJobId(jobId: string): Promise<Interview[]>;
  createInterview(interview: InsertInterview): Promise<Interview>;
  updateInterview(id: string, interview: Partial<InsertInterview>): Promise<Interview | undefined>;
  deleteInterview(id: string): Promise<boolean>;
  
  getInterviewAssessment(interviewId: string): Promise<InterviewAssessment | undefined>;
  createInterviewAssessment(assessment: InsertInterviewAssessment): Promise<InterviewAssessment>;
  updateInterviewAssessment(id: string, assessment: Partial<InsertInterviewAssessment>): Promise<InterviewAssessment | undefined>;
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

  async getAllJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values(insertJob)
      .returning();
    return job;
  }

  async updateJob(id: string, updates: Partial<InsertJob> & { requirementsEmbedding?: any }): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job || undefined;
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db
      .insert(candidates)
      .values(insertCandidate)
      .returning();
    return candidate;
  }

  async updateCandidate(id: string, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [candidate] = await db
      .update(candidates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
    return candidate || undefined;
  }

  async deleteCandidate(id: string): Promise<boolean> {
    const result = await db.delete(candidates).where(eq(candidates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllIntegrityChecks(): Promise<IntegrityCheck[]> {
    return await db.select().from(integrityChecks).orderBy(desc(integrityChecks.createdAt));
  }

  async getIntegrityCheck(id: string): Promise<IntegrityCheck | undefined> {
    const [check] = await db.select().from(integrityChecks).where(eq(integrityChecks.id, id));
    return check || undefined;
  }

  async getIntegrityChecksByCandidateId(candidateId: string): Promise<IntegrityCheck[]> {
    return await db.select().from(integrityChecks).where(eq(integrityChecks.candidateId, candidateId)).orderBy(desc(integrityChecks.createdAt));
  }

  async getChecksNeedingReminders(now: Date): Promise<IntegrityCheck[]> {
    return await db.select().from(integrityChecks).where(
      and(
        eq(integrityChecks.reminderEnabled, 1),
        lte(integrityChecks.nextReminderAt, now)
      )
    );
  }

  async createIntegrityCheck(insertCheck: InsertIntegrityCheck): Promise<IntegrityCheck> {
    const [check] = await db
      .insert(integrityChecks)
      .values(insertCheck)
      .returning();
    return check;
  }

  async updateIntegrityCheck(id: string, updates: Partial<InsertIntegrityCheck>): Promise<IntegrityCheck | undefined> {
    const [check] = await db
      .update(integrityChecks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(integrityChecks.id, id))
      .returning();
    return check || undefined;
  }

  async deleteIntegrityCheck(id: string): Promise<boolean> {
    const result = await db.delete(integrityChecks).where(eq(integrityChecks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllRecruitmentSessions(): Promise<RecruitmentSession[]> {
    return await db.select().from(recruitmentSessions).orderBy(desc(recruitmentSessions.createdAt));
  }

  async getRecruitmentSession(id: string): Promise<RecruitmentSession | undefined> {
    const [session] = await db.select().from(recruitmentSessions).where(eq(recruitmentSessions.id, id));
    return session || undefined;
  }

  async getRecruitmentSessionsByJobId(jobId: string): Promise<RecruitmentSession[]> {
    return await db.select().from(recruitmentSessions).where(eq(recruitmentSessions.jobId, jobId)).orderBy(desc(recruitmentSessions.createdAt));
  }

  async createRecruitmentSession(insertSession: InsertRecruitmentSession): Promise<RecruitmentSession> {
    const [session] = await db
      .insert(recruitmentSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateRecruitmentSession(id: string, updates: Partial<InsertRecruitmentSession>): Promise<RecruitmentSession | undefined> {
    const [session] = await db
      .update(recruitmentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(recruitmentSessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteRecruitmentSession(id: string): Promise<boolean> {
    const result = await db.delete(recruitmentSessions).where(eq(recruitmentSessions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getJobById(id: string): Promise<Job | undefined> {
    return this.getJob(id);
  }

  async getCandidateById(id: string): Promise<Candidate | undefined> {
    return this.getCandidate(id);
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

  async getAllOnboardingWorkflows(): Promise<OnboardingWorkflow[]> {
    return await db.select().from(onboardingWorkflows).orderBy(desc(onboardingWorkflows.createdAt));
  }

  async getOnboardingWorkflow(id: string): Promise<OnboardingWorkflow | undefined> {
    const [workflow] = await db.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.id, id));
    return workflow || undefined;
  }

  async getOnboardingWorkflowByCandidateId(candidateId: string): Promise<OnboardingWorkflow | undefined> {
    const [workflow] = await db.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.candidateId, candidateId)).orderBy(desc(onboardingWorkflows.createdAt));
    return workflow || undefined;
  }

  async createOnboardingWorkflow(insertWorkflow: InsertOnboardingWorkflow): Promise<OnboardingWorkflow> {
    const cleanedWorkflow = Object.fromEntries(
      Object.entries(insertWorkflow).filter(([_, v]) => v !== null && v !== undefined)
    ) as any;
    
    const [workflow] = await db
      .insert(onboardingWorkflows)
      .values(cleanedWorkflow)
      .returning();
    return workflow;
  }

  async updateOnboardingWorkflow(id: string, updates: Partial<InsertOnboardingWorkflow>): Promise<OnboardingWorkflow | undefined> {
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== null && v !== undefined)
    ) as any;
    
    const [workflow] = await db
      .update(onboardingWorkflows)
      .set({ ...cleanedUpdates, updatedAt: new Date() })
      .where(eq(onboardingWorkflows.id, id))
      .returning();
    return workflow || undefined;
  }

  async deleteOnboardingWorkflow(id: string): Promise<boolean> {
    const result = await db.delete(onboardingWorkflows).where(eq(onboardingWorkflows.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getTenantConfig(): Promise<TenantConfig | undefined> {
    const [config] = await db.select().from(tenantConfig).orderBy(desc(tenantConfig.createdAt)).limit(1);
    return config || undefined;
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

  async getAllInterviews(): Promise<Interview[]> {
    return await db.select().from(interviews).orderBy(desc(interviews.createdAt));
  }

  async getInterview(id: string): Promise<Interview | undefined> {
    const [interview] = await db.select().from(interviews).where(eq(interviews.id, id));
    return interview || undefined;
  }

  async getInterviewsByCandidateId(candidateId: string): Promise<Interview[]> {
    return await db.select().from(interviews).where(eq(interviews.candidateId, candidateId)).orderBy(desc(interviews.createdAt));
  }

  async getInterviewsByJobId(jobId: string): Promise<Interview[]> {
    return await db.select().from(interviews).where(eq(interviews.jobId, jobId)).orderBy(desc(interviews.createdAt));
  }

  async createInterview(insertInterview: InsertInterview): Promise<Interview> {
    const [interview] = await db
      .insert(interviews)
      .values(insertInterview)
      .returning();
    return interview;
  }

  async updateInterview(id: string, updates: Partial<InsertInterview>): Promise<Interview | undefined> {
    const [interview] = await db
      .update(interviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviews.id, id))
      .returning();
    return interview || undefined;
  }

  async deleteInterview(id: string): Promise<boolean> {
    const result = await db.delete(interviews).where(eq(interviews.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getInterviewAssessment(interviewId: string): Promise<InterviewAssessment | undefined> {
    const [assessment] = await db.select().from(interviewAssessments).where(eq(interviewAssessments.interviewId, interviewId));
    return assessment || undefined;
  }

  async createInterviewAssessment(insertAssessment: InsertInterviewAssessment): Promise<InterviewAssessment> {
    const [assessment] = await db
      .insert(interviewAssessments)
      .values(insertAssessment)
      .returning();
    return assessment;
  }

  async updateInterviewAssessment(id: string, updates: Partial<InsertInterviewAssessment>): Promise<InterviewAssessment | undefined> {
    const [assessment] = await db
      .update(interviewAssessments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewAssessments.id, id))
      .returning();
    return assessment || undefined;
  }
}

export const storage = new DatabaseStorage();
