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
  type TenantRequest,
  type InsertTenantRequest,
  type Skill,
  type InsertSkill,
  type Employee,
  type InsertEmployee,
  type Department,
  type InsertDepartment,
  type SkillActivity,
  type InsertSkillActivity,
  type EmployeeSkill,
  type InsertEmployeeSkill,
  type JobSkill,
  type InsertJobSkill,
  type EmployeeAmbition,
  type InsertEmployeeAmbition,
  type Mentorship,
  type InsertMentorship,
  type GrowthArea,
  type InsertGrowthArea,
  type Document,
  type InsertDocument,
  type UpdateDocument,
  type DocumentBatch,
  type InsertDocumentBatch,
  type WhatsappConversation,
  type InsertWhatsappConversation,
  type WhatsappMessage,
  type InsertWhatsappMessage,
  type WhatsappDocumentRequest,
  type InsertWhatsappDocumentRequest,
  type WhatsappAppointment,
  type InsertWhatsappAppointment,
  type InterviewSession,
  type InsertInterviewSession,
  type OnboardingAgentLog,
  type InsertOnboardingAgentLog,
  type OnboardingDocumentRequest,
  type InsertOnboardingDocumentRequest,
  users,
  jobs,
  candidates,
  integrityChecks,
  recruitmentSessions,
  systemSettings,
  onboardingWorkflows,
  tenantConfig,
  interviews,
  interviewAssessments,
  tenantRequests,
  skills,
  employees,
  departments,
  skillActivities,
  employeeSkills,
  jobSkills,
  employeeAmbitions,
  mentorships,
  growthAreas,
  documents,
  documentBatches,
  whatsappConversations,
  whatsappMessages,
  whatsappDocumentRequests,
  whatsappAppointments,
  interviewSessions,
  onboardingAgentLogs,
  onboardingDocumentRequests
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte, sql, isNull, isNotNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllJobs(tenantId: string, includeArchived?: boolean): Promise<Job[]>;
  getArchivedJobs(tenantId: string): Promise<Job[]>;
  getJob(tenantId: string, id: string): Promise<Job | undefined>;
  createJob(tenantId: string, job: InsertJob): Promise<Job>;
  updateJob(tenantId: string, id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(tenantId: string, id: string): Promise<boolean>;
  archiveJob(tenantId: string, id: string, reason?: string): Promise<Job | undefined>;
  restoreJob(tenantId: string, id: string): Promise<Job | undefined>;
  
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
  
  // Tenant Requests (NOT tenant-scoped - global requests for new tenants)
  getAllTenantRequests(): Promise<TenantRequest[]>;
  getTenantRequestById(id: string): Promise<TenantRequest | undefined>;
  getTenantRequestsByStatus(status: string): Promise<TenantRequest[]>;
  createTenantRequest(request: InsertTenantRequest): Promise<TenantRequest>;
  updateTenantRequest(id: string, updates: Partial<InsertTenantRequest>): Promise<TenantRequest | undefined>;
  deleteTenantRequest(id: string): Promise<boolean>;
  
  // Workforce Intelligence - Skills
  getAllSkills(tenantId: string): Promise<Skill[]>;
  getSkill(tenantId: string, id: string): Promise<Skill | undefined>;
  createSkill(tenantId: string, skill: InsertSkill): Promise<Skill>;
  
  // Workforce Intelligence - Employees
  getAllEmployees(tenantId: string): Promise<Employee[]>;
  getEmployee(tenantId: string, id: string): Promise<Employee | undefined>;
  createEmployee(tenantId: string, employee: InsertEmployee): Promise<Employee>;
  
  // Workforce Intelligence - Departments
  getAllDepartments(tenantId: string): Promise<Department[]>;
  getDepartment(tenantId: string, id: string): Promise<Department | undefined>;
  createDepartment(tenantId: string, department: InsertDepartment): Promise<Department>;
  
  // Workforce Intelligence - Skill Activities
  getSkillActivities(tenantId: string): Promise<SkillActivity[]>;
  createSkillActivity(tenantId: string, activity: InsertSkillActivity): Promise<SkillActivity>;
  
  // Workforce Intelligence - Employee Skills (Join queries)
  getEmployeesWithSkills(tenantId: string): Promise<(Employee & { skills: (EmployeeSkill & { skill: Skill })[] })[]>;
  getEmployeeWithSkills(tenantId: string, employeeId: string): Promise<(Employee & { skills: (EmployeeSkill & { skill: Skill })[] }) | undefined>;
  getEmployeeSkills(tenantId: string, employeeId: string): Promise<(EmployeeSkill & { skill: Skill })[]>;
  getAllEmployeeSkills(tenantId: string): Promise<(EmployeeSkill & { skill: Skill, employee: Employee })[]>;
  createEmployeeSkill(tenantId: string, employeeSkill: InsertEmployeeSkill): Promise<EmployeeSkill>;
  updateEmployeeSkill(tenantId: string, id: string, updates: Partial<InsertEmployeeSkill>): Promise<EmployeeSkill | undefined>;
  
  // Workforce Intelligence - Job Skills
  getJobSkills(tenantId: string, jobId: string): Promise<(JobSkill & { skill: Skill })[]>;
  createJobSkill(tenantId: string, jobSkill: InsertJobSkill): Promise<JobSkill>;
  
  // Workforce Intelligence - Skill Gap Analysis
  getDepartmentSkillGaps(tenantId: string): Promise<{ department: string; headCount: number; skillGaps: string[]; gapScore: number }[]>;
  
  // Workforce Intelligence - Employee Ambitions
  getEmployeeAmbitions(tenantId: string): Promise<EmployeeAmbition[]>;
  getEmployeeAmbition(tenantId: string, id: string): Promise<EmployeeAmbition | undefined>;
  getAmbitionsByEmployeeId(tenantId: string, employeeId: string): Promise<EmployeeAmbition[]>;
  createEmployeeAmbition(tenantId: string, ambition: InsertEmployeeAmbition): Promise<EmployeeAmbition>;
  updateEmployeeAmbition(tenantId: string, id: string, updates: Partial<InsertEmployeeAmbition>): Promise<EmployeeAmbition | undefined>;
  deleteEmployeeAmbition(tenantId: string, id: string): Promise<boolean>;
  
  // Workforce Intelligence - Mentorships
  getMentorships(tenantId: string): Promise<(Mentorship & { mentor: Employee; mentee: Employee; skill?: Skill })[]>;
  getMentorship(tenantId: string, id: string): Promise<Mentorship | undefined>;
  getMentorshipsByMentorId(tenantId: string, mentorId: string): Promise<Mentorship[]>;
  getMentorshipsByMenteeId(tenantId: string, menteeId: string): Promise<Mentorship[]>;
  createMentorship(tenantId: string, mentorship: InsertMentorship): Promise<Mentorship>;
  updateMentorship(tenantId: string, id: string, updates: Partial<InsertMentorship>): Promise<Mentorship | undefined>;
  deleteMentorship(tenantId: string, id: string): Promise<boolean>;
  findPotentialMentors(tenantId: string, skillId: string, minProficiency: number): Promise<(Employee & { proficiency: number })[]>;
  
  // Workforce Intelligence - Growth Areas
  getGrowthAreas(tenantId: string): Promise<GrowthArea[]>;
  getGrowthArea(tenantId: string, id: string): Promise<GrowthArea | undefined>;
  getGrowthAreasByEmployeeId(tenantId: string, employeeId: string): Promise<GrowthArea[]>;
  createGrowthArea(tenantId: string, growthArea: InsertGrowthArea): Promise<GrowthArea>;
  updateGrowthArea(tenantId: string, id: string, updates: Partial<InsertGrowthArea>): Promise<GrowthArea | undefined>;
  deleteGrowthArea(tenantId: string, id: string): Promise<boolean>;
  generateGrowthAreasForEmployee(tenantId: string, employeeId: string): Promise<GrowthArea[]>;
  
  // Document Automation
  getAllDocuments(tenantId: string): Promise<Document[]>;
  getDocumentsByType(tenantId: string, type: string): Promise<Document[]>;
  getDocumentsByBatchId(tenantId: string, batchId: string): Promise<Document[]>;
  getDocument(tenantId: string, id: string): Promise<Document | undefined>;
  createDocument(tenantId: string, document: InsertDocument): Promise<Document>;
  updateDocument(tenantId: string, id: string, updates: UpdateDocument): Promise<Document | undefined>;
  deleteDocument(tenantId: string, id: string): Promise<boolean>;
  
  // Document Batches
  getAllDocumentBatches(tenantId: string): Promise<DocumentBatch[]>;
  getDocumentBatch(tenantId: string, id: string): Promise<DocumentBatch | undefined>;
  createDocumentBatch(tenantId: string, batch: InsertDocumentBatch): Promise<DocumentBatch>;
  updateDocumentBatch(tenantId: string, id: string, updates: Partial<InsertDocumentBatch>): Promise<DocumentBatch | undefined>;
  
  // WhatsApp Conversations
  getAllWhatsappConversations(tenantId: string): Promise<WhatsappConversation[]>;
  getWhatsappConversation(tenantId: string, id: string): Promise<WhatsappConversation | undefined>;
  getWhatsappConversationByWaId(tenantId: string, waId: string): Promise<WhatsappConversation | undefined>;
  getWhatsappConversationsByCandidateId(tenantId: string, candidateId: string): Promise<WhatsappConversation[]>;
  createWhatsappConversation(tenantId: string, conversation: InsertWhatsappConversation): Promise<WhatsappConversation>;
  updateWhatsappConversation(tenantId: string, id: string, updates: Partial<InsertWhatsappConversation>): Promise<WhatsappConversation | undefined>;
  
  // WhatsApp Messages
  getWhatsappMessages(tenantId: string, conversationId: string): Promise<WhatsappMessage[]>;
  getWhatsappMessage(tenantId: string, id: string): Promise<WhatsappMessage | undefined>;
  getWhatsappMessageByWhatsappId(tenantId: string, whatsappMessageId: string): Promise<WhatsappMessage | undefined>;
  createWhatsappMessage(tenantId: string, message: InsertWhatsappMessage): Promise<WhatsappMessage>;
  updateWhatsappMessage(tenantId: string, id: string, updates: Partial<InsertWhatsappMessage>): Promise<WhatsappMessage | undefined>;
  
  // WhatsApp Document Requests
  getWhatsappDocumentRequests(tenantId: string, conversationId?: string): Promise<WhatsappDocumentRequest[]>;
  getWhatsappDocumentRequest(tenantId: string, id: string): Promise<WhatsappDocumentRequest | undefined>;
  createWhatsappDocumentRequest(tenantId: string, request: InsertWhatsappDocumentRequest): Promise<WhatsappDocumentRequest>;
  updateWhatsappDocumentRequest(tenantId: string, id: string, updates: Partial<InsertWhatsappDocumentRequest>): Promise<WhatsappDocumentRequest | undefined>;
  
  // WhatsApp Appointments
  getWhatsappAppointments(tenantId: string, conversationId?: string): Promise<WhatsappAppointment[]>;
  getWhatsappAppointment(tenantId: string, id: string): Promise<WhatsappAppointment | undefined>;
  createWhatsappAppointment(tenantId: string, appointment: InsertWhatsappAppointment): Promise<WhatsappAppointment>;
  updateWhatsappAppointment(tenantId: string, id: string, updates: Partial<InsertWhatsappAppointment>): Promise<WhatsappAppointment | undefined>;
  
  // Interview Sessions
  getInterviewSession(tenantId: string, id: string): Promise<InterviewSession | undefined>;
  getInterviewSessionByToken(token: string): Promise<InterviewSession | undefined>;
  getInterviewSessionsByCandidateId(tenantId: string, candidateId: string): Promise<InterviewSession[]>;
  getInterviewSessionsByConversationId(tenantId: string, conversationId: string): Promise<InterviewSession[]>;
  createInterviewSession(tenantId: string, session: InsertInterviewSession): Promise<InterviewSession>;
  updateInterviewSession(tenantId: string, id: string, updates: Partial<InsertInterviewSession>): Promise<InterviewSession | undefined>;
  updateInterviewSessionByToken(token: string, updates: Partial<InsertInterviewSession>): Promise<InterviewSession | undefined>;
  
  // Onboarding Agent Logs
  getOnboardingAgentLogs(tenantId: string, workflowId?: string): Promise<OnboardingAgentLog[]>;
  getOnboardingAgentLogsByCandidate(tenantId: string, candidateId: string): Promise<OnboardingAgentLog[]>;
  getOnboardingAgentLogsRequiringReview(tenantId: string): Promise<OnboardingAgentLog[]>;
  createOnboardingAgentLog(tenantId: string, log: InsertOnboardingAgentLog): Promise<OnboardingAgentLog>;
  updateOnboardingAgentLog(tenantId: string, id: string, updates: Partial<InsertOnboardingAgentLog>): Promise<OnboardingAgentLog | undefined>;
  
  // Onboarding Document Requests
  getOnboardingDocumentRequests(tenantId: string, workflowId?: string): Promise<OnboardingDocumentRequest[]>;
  getOnboardingDocumentRequestsByCandidate(tenantId: string, candidateId: string): Promise<OnboardingDocumentRequest[]>;
  getOnboardingDocumentRequest(tenantId: string, id: string): Promise<OnboardingDocumentRequest | undefined>;
  getPendingDocumentRequests(tenantId: string): Promise<OnboardingDocumentRequest[]>;
  getOverdueDocumentRequests(tenantId: string): Promise<OnboardingDocumentRequest[]>;
  createOnboardingDocumentRequest(tenantId: string, request: InsertOnboardingDocumentRequest): Promise<OnboardingDocumentRequest>;
  updateOnboardingDocumentRequest(tenantId: string, id: string, updates: Partial<InsertOnboardingDocumentRequest>): Promise<OnboardingDocumentRequest | undefined>;
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

  async getAllJobs(tenantId: string, includeArchived: boolean = false): Promise<Job[]> {
    if (includeArchived) {
      return await db.select().from(jobs).where(eq(jobs.tenantId, tenantId)).orderBy(desc(jobs.createdAt));
    }
    return await db.select().from(jobs).where(
      and(eq(jobs.tenantId, tenantId), sql`${jobs.archivedAt} IS NULL`)
    ).orderBy(desc(jobs.createdAt));
  }

  async getArchivedJobs(tenantId: string): Promise<Job[]> {
    return await db.select().from(jobs).where(
      and(eq(jobs.tenantId, tenantId), sql`${jobs.archivedAt} IS NOT NULL`)
    ).orderBy(desc(jobs.archivedAt));
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

  async archiveJob(tenantId: string, id: string, reason?: string): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ 
        archivedAt: new Date(), 
        archivedReason: reason || null,
        updatedAt: new Date() 
      })
      .where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
      .returning();
    return job || undefined;
  }

  async restoreJob(tenantId: string, id: string): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ 
        archivedAt: null, 
        archivedReason: null,
        updatedAt: new Date() 
      })
      .where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
      .returning();
    return job || undefined;
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

  // Tenant Requests (NOT tenant-scoped - global requests for new tenants)
  async getAllTenantRequests(): Promise<TenantRequest[]> {
    return await db.select().from(tenantRequests).orderBy(desc(tenantRequests.createdAt));
  }

  async getTenantRequestById(id: string): Promise<TenantRequest | undefined> {
    const [request] = await db.select().from(tenantRequests).where(eq(tenantRequests.id, id));
    return request || undefined;
  }

  async getTenantRequestsByStatus(status: string): Promise<TenantRequest[]> {
    return await db.select().from(tenantRequests).where(eq(tenantRequests.status, status)).orderBy(desc(tenantRequests.createdAt));
  }

  async createTenantRequest(insertRequest: InsertTenantRequest): Promise<TenantRequest> {
    const [request] = await db
      .insert(tenantRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async updateTenantRequest(id: string, updates: Partial<InsertTenantRequest>): Promise<TenantRequest | undefined> {
    const [request] = await db
      .update(tenantRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenantRequests.id, id))
      .returning();
    return request || undefined;
  }

  async deleteTenantRequest(id: string): Promise<boolean> {
    const result = await db.delete(tenantRequests).where(eq(tenantRequests.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Workforce Intelligence - Skills
  async getAllSkills(tenantId: string): Promise<Skill[]> {
    return await db.select().from(skills).where(eq(skills.tenantId, tenantId)).orderBy(desc(skills.createdAt));
  }

  async getSkill(tenantId: string, id: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(and(eq(skills.id, id), eq(skills.tenantId, tenantId)));
    return skill || undefined;
  }

  async createSkill(tenantId: string, insertSkill: InsertSkill): Promise<Skill> {
    const [skill] = await db
      .insert(skills)
      .values({ ...insertSkill, tenantId })
      .returning();
    return skill;
  }

  // Workforce Intelligence - Employees
  async getAllEmployees(tenantId: string): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.tenantId, tenantId)).orderBy(desc(employees.createdAt));
  }

  async getEmployee(tenantId: string, id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
    return employee || undefined;
  }

  async createEmployee(tenantId: string, insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values({ ...insertEmployee, tenantId })
      .returning();
    return employee;
  }

  // Workforce Intelligence - Departments
  async getAllDepartments(tenantId: string): Promise<Department[]> {
    return await db.select().from(departments).where(eq(departments.tenantId, tenantId)).orderBy(departments.name);
  }

  async getDepartment(tenantId: string, id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(and(eq(departments.id, id), eq(departments.tenantId, tenantId)));
    return department || undefined;
  }

  async createDepartment(tenantId: string, insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values({ ...insertDepartment, tenantId })
      .returning();
    return department;
  }

  // Workforce Intelligence - Skill Activities
  async getSkillActivities(tenantId: string): Promise<SkillActivity[]> {
    return await db.select().from(skillActivities).where(eq(skillActivities.tenantId, tenantId)).orderBy(desc(skillActivities.createdAt));
  }

  async createSkillActivity(tenantId: string, insertActivity: InsertSkillActivity): Promise<SkillActivity> {
    const [activity] = await db
      .insert(skillActivities)
      .values({ ...insertActivity, tenantId })
      .returning();
    return activity;
  }

  // Workforce Intelligence - Employee Skills (Join queries)
  async getEmployeesWithSkills(tenantId: string): Promise<(Employee & { skills: (EmployeeSkill & { skill: Skill })[] })[]> {
    const allEmployees = await db.select().from(employees).where(eq(employees.tenantId, tenantId)).orderBy(desc(employees.createdAt));
    
    const result: (Employee & { skills: (EmployeeSkill & { skill: Skill })[] })[] = [];
    
    for (const employee of allEmployees) {
      const empSkills = await db
        .select()
        .from(employeeSkills)
        .innerJoin(skills, eq(employeeSkills.skillId, skills.id))
        .where(and(eq(employeeSkills.employeeId, employee.id), eq(employeeSkills.tenantId, tenantId)));
      
      result.push({
        ...employee,
        skills: empSkills.map(row => ({
          ...row.employee_skills,
          skill: row.skills
        }))
      });
    }
    
    return result;
  }

  async getEmployeeWithSkills(tenantId: string, employeeId: string): Promise<(Employee & { skills: (EmployeeSkill & { skill: Skill })[] }) | undefined> {
    const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)));
    if (!employee) return undefined;

    const empSkills = await db
      .select()
      .from(employeeSkills)
      .innerJoin(skills, eq(employeeSkills.skillId, skills.id))
      .where(and(eq(employeeSkills.employeeId, employeeId), eq(employeeSkills.tenantId, tenantId)));

    return {
      ...employee,
      skills: empSkills.map(row => ({
        ...row.employee_skills,
        skill: row.skills
      }))
    };
  }

  async getEmployeeSkills(tenantId: string, employeeId: string): Promise<(EmployeeSkill & { skill: Skill })[]> {
    const empSkills = await db
      .select()
      .from(employeeSkills)
      .innerJoin(skills, eq(employeeSkills.skillId, skills.id))
      .where(and(eq(employeeSkills.employeeId, employeeId), eq(employeeSkills.tenantId, tenantId)));

    return empSkills.map(row => ({
      ...row.employee_skills,
      skill: row.skills
    }));
  }

  async getAllEmployeeSkills(tenantId: string): Promise<(EmployeeSkill & { skill: Skill, employee: Employee })[]> {
    const allSkills = await db
      .select()
      .from(employeeSkills)
      .innerJoin(skills, eq(employeeSkills.skillId, skills.id))
      .innerJoin(employees, eq(employeeSkills.employeeId, employees.id))
      .where(eq(employeeSkills.tenantId, tenantId));

    return allSkills.map(row => ({
      ...row.employee_skills,
      skill: row.skills,
      employee: row.employees
    }));
  }

  async createEmployeeSkill(tenantId: string, insertEmployeeSkill: InsertEmployeeSkill): Promise<EmployeeSkill> {
    const [employeeSkill] = await db
      .insert(employeeSkills)
      .values({ ...insertEmployeeSkill, tenantId })
      .returning();
    return employeeSkill;
  }

  async updateEmployeeSkill(tenantId: string, id: string, updates: Partial<InsertEmployeeSkill>): Promise<EmployeeSkill | undefined> {
    const [employeeSkill] = await db
      .update(employeeSkills)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(employeeSkills.id, id), eq(employeeSkills.tenantId, tenantId)))
      .returning();
    return employeeSkill || undefined;
  }

  // Workforce Intelligence - Job Skills
  async getJobSkills(tenantId: string, jobId: string): Promise<(JobSkill & { skill: Skill })[]> {
    const jSkills = await db
      .select()
      .from(jobSkills)
      .innerJoin(skills, eq(jobSkills.skillId, skills.id))
      .where(and(eq(jobSkills.jobId, jobId), eq(jobSkills.tenantId, tenantId)));

    return jSkills.map(row => ({
      ...row.job_skills,
      skill: row.skills
    }));
  }

  async createJobSkill(tenantId: string, insertJobSkill: InsertJobSkill): Promise<JobSkill> {
    const [jobSkill] = await db
      .insert(jobSkills)
      .values({ ...insertJobSkill, tenantId })
      .returning();
    return jobSkill;
  }

  // Workforce Intelligence - Skill Gap Analysis
  async getDepartmentSkillGaps(tenantId: string): Promise<{ department: string; headCount: number; skillGaps: string[]; gapScore: number }[]> {
    const allEmployees = await db.select().from(employees).where(eq(employees.tenantId, tenantId));
    const allSkills = await this.getAllEmployeeSkills(tenantId);
    
    // Group employees by department
    const deptMap = new Map<string, { employees: Employee[], skillGaps: Set<string>, gapScore: number }>();
    
    for (const emp of allEmployees) {
      const dept = emp.department || "Unassigned";
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { employees: [], skillGaps: new Set(), gapScore: 0 });
      }
      deptMap.get(dept)!.employees.push(emp);
    }
    
    // Find skill gaps per department (skills with status 'critical_gap' or 'training_needed')
    for (const empSkill of allSkills) {
      const dept = empSkill.employee.department || "Unassigned";
      if (deptMap.has(dept)) {
        if (empSkill.status === 'critical_gap' || empSkill.status === 'training_needed') {
          deptMap.get(dept)!.skillGaps.add(empSkill.skill.name);
          deptMap.get(dept)!.gapScore += empSkill.status === 'critical_gap' ? 3 : 1;
        }
      }
    }
    
    return Array.from(deptMap.entries())
      .map(([department, data]) => ({
        department,
        headCount: data.employees.length,
        skillGaps: Array.from(data.skillGaps),
        gapScore: data.gapScore
      }))
      .sort((a, b) => b.gapScore - a.gapScore);
  }

  // Workforce Intelligence - Employee Ambitions
  async getEmployeeAmbitions(tenantId: string): Promise<EmployeeAmbition[]> {
    return await db.select().from(employeeAmbitions).where(eq(employeeAmbitions.tenantId, tenantId)).orderBy(desc(employeeAmbitions.createdAt));
  }

  async getEmployeeAmbition(tenantId: string, id: string): Promise<EmployeeAmbition | undefined> {
    const [ambition] = await db.select().from(employeeAmbitions).where(and(eq(employeeAmbitions.id, id), eq(employeeAmbitions.tenantId, tenantId)));
    return ambition || undefined;
  }

  async getAmbitionsByEmployeeId(tenantId: string, employeeId: string): Promise<EmployeeAmbition[]> {
    return await db.select().from(employeeAmbitions).where(and(eq(employeeAmbitions.employeeId, employeeId), eq(employeeAmbitions.tenantId, tenantId))).orderBy(desc(employeeAmbitions.createdAt));
  }

  async createEmployeeAmbition(tenantId: string, insertAmbition: InsertEmployeeAmbition): Promise<EmployeeAmbition> {
    const [ambition] = await db.insert(employeeAmbitions).values({ ...insertAmbition, tenantId }).returning();
    return ambition;
  }

  async updateEmployeeAmbition(tenantId: string, id: string, updates: Partial<InsertEmployeeAmbition>): Promise<EmployeeAmbition | undefined> {
    const [ambition] = await db.update(employeeAmbitions).set({ ...updates, updatedAt: new Date() }).where(and(eq(employeeAmbitions.id, id), eq(employeeAmbitions.tenantId, tenantId))).returning();
    return ambition || undefined;
  }

  async deleteEmployeeAmbition(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(employeeAmbitions).where(and(eq(employeeAmbitions.id, id), eq(employeeAmbitions.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Workforce Intelligence - Mentorships
  async getMentorships(tenantId: string): Promise<(Mentorship & { mentor: Employee; mentee: Employee; skill?: Skill })[]> {
    const allMentorships = await db.select().from(mentorships).where(eq(mentorships.tenantId, tenantId)).orderBy(desc(mentorships.createdAt));
    const result: (Mentorship & { mentor: Employee; mentee: Employee; skill?: Skill })[] = [];
    
    for (const m of allMentorships) {
      const [mentor] = await db.select().from(employees).where(eq(employees.id, m.mentorId));
      const [mentee] = await db.select().from(employees).where(eq(employees.id, m.menteeId));
      let skill: Skill | undefined;
      if (m.skillId) {
        const [s] = await db.select().from(skills).where(eq(skills.id, m.skillId));
        skill = s;
      }
      if (mentor && mentee) {
        result.push({ ...m, mentor, mentee, skill });
      }
    }
    return result;
  }

  async getMentorship(tenantId: string, id: string): Promise<Mentorship | undefined> {
    const [mentorship] = await db.select().from(mentorships).where(and(eq(mentorships.id, id), eq(mentorships.tenantId, tenantId)));
    return mentorship || undefined;
  }

  async getMentorshipsByMentorId(tenantId: string, mentorId: string): Promise<Mentorship[]> {
    return await db.select().from(mentorships).where(and(eq(mentorships.mentorId, mentorId), eq(mentorships.tenantId, tenantId)));
  }

  async getMentorshipsByMenteeId(tenantId: string, menteeId: string): Promise<Mentorship[]> {
    return await db.select().from(mentorships).where(and(eq(mentorships.menteeId, menteeId), eq(mentorships.tenantId, tenantId)));
  }

  async createMentorship(tenantId: string, insertMentorship: InsertMentorship): Promise<Mentorship> {
    const [mentorship] = await db.insert(mentorships).values({ ...insertMentorship, tenantId }).returning();
    return mentorship;
  }

  async updateMentorship(tenantId: string, id: string, updates: Partial<InsertMentorship>): Promise<Mentorship | undefined> {
    const [mentorship] = await db.update(mentorships).set({ ...updates, updatedAt: new Date() }).where(and(eq(mentorships.id, id), eq(mentorships.tenantId, tenantId))).returning();
    return mentorship || undefined;
  }

  async deleteMentorship(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(mentorships).where(and(eq(mentorships.id, id), eq(mentorships.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async findPotentialMentors(tenantId: string, skillId: string, minProficiency: number = 6): Promise<(Employee & { proficiency: number })[]> {
    const empSkillsWithHighProficiency = await db
      .select()
      .from(employeeSkills)
      .innerJoin(employees, eq(employeeSkills.employeeId, employees.id))
      .where(and(
        eq(employeeSkills.tenantId, tenantId),
        eq(employeeSkills.skillId, skillId)
      ));
    
    return empSkillsWithHighProficiency
      .filter(row => row.employee_skills.proficiencyLevel >= minProficiency)
      .map(row => ({
        ...row.employees,
        proficiency: row.employee_skills.proficiencyLevel
      }))
      .sort((a, b) => b.proficiency - a.proficiency);
  }

  // Workforce Intelligence - Growth Areas
  async getGrowthAreas(tenantId: string): Promise<GrowthArea[]> {
    return await db.select().from(growthAreas).where(eq(growthAreas.tenantId, tenantId)).orderBy(desc(growthAreas.createdAt));
  }

  async getGrowthArea(tenantId: string, id: string): Promise<GrowthArea | undefined> {
    const [area] = await db.select().from(growthAreas).where(and(eq(growthAreas.id, id), eq(growthAreas.tenantId, tenantId)));
    return area || undefined;
  }

  async getGrowthAreasByEmployeeId(tenantId: string, employeeId: string): Promise<GrowthArea[]> {
    return await db.select().from(growthAreas).where(and(eq(growthAreas.employeeId, employeeId), eq(growthAreas.tenantId, tenantId))).orderBy(desc(growthAreas.priority));
  }

  async createGrowthArea(tenantId: string, insertGrowthArea: InsertGrowthArea): Promise<GrowthArea> {
    const [area] = await db.insert(growthAreas).values({ ...insertGrowthArea, tenantId }).returning();
    return area;
  }

  async updateGrowthArea(tenantId: string, id: string, updates: Partial<InsertGrowthArea>): Promise<GrowthArea | undefined> {
    const [area] = await db.update(growthAreas).set({ ...updates, updatedAt: new Date() }).where(and(eq(growthAreas.id, id), eq(growthAreas.tenantId, tenantId))).returning();
    return area || undefined;
  }

  async deleteGrowthArea(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(growthAreas).where(and(eq(growthAreas.id, id), eq(growthAreas.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async generateGrowthAreasForEmployee(tenantId: string, employeeId: string): Promise<GrowthArea[]> {
    const empSkills = await this.getEmployeeSkills(tenantId, employeeId);
    const createdAreas: GrowthArea[] = [];
    
    // Group skills by category and identify those needing improvement
    const categoryGaps = new Map<string, { skills: typeof empSkills, avgScore: number }>();
    
    for (const es of empSkills) {
      const category = es.skill.category || 'General';
      if (!categoryGaps.has(category)) {
        categoryGaps.set(category, { skills: [], avgScore: 0 });
      }
      // Only include skills below proficiency level 5 (62.5% of max)
      if (es.proficiencyLevel < 5) {
        categoryGaps.get(category)!.skills.push(es);
      }
    }
    
    // Calculate average score and create growth areas for categories with gaps
    for (const [category, data] of categoryGaps.entries()) {
      if (data.skills.length === 0) continue;
      
      const avgProficiency = data.skills.reduce((sum, s) => sum + s.proficiencyLevel, 0) / data.skills.length;
      const currentScore = Math.round((avgProficiency / 8) * 100);
      const targetScore = 75; // Target at least 75% proficiency
      
      // Determine priority based on how far below target
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if (currentScore < 25) priority = 'critical';
      else if (currentScore < 40) priority = 'high';
      else if (currentScore >= 50) priority = 'low';
      
      const suggestedActions = data.skills.slice(0, 3).map(s => ({
        type: 'training',
        description: `Improve ${s.skill.name} proficiency`,
        skillId: s.skillId,
        currentLevel: s.proficiencyLevel,
        targetLevel: 6
      }));
      
      const area = await this.createGrowthArea(tenantId, {
        employeeId,
        name: `${category} Development`,
        description: `Improve skills in the ${category} category`,
        priority,
        skillIds: data.skills.map(s => s.skillId),
        currentScore,
        targetScore,
        progress: 0,
        suggestedActions,
        status: 'active'
      });
      
      createdAreas.push(area);
    }
    
    return createdAreas;
  }

  // Document Automation Implementation
  async getAllDocuments(tenantId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.tenantId, tenantId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByType(tenantId: string, type: string): Promise<Document[]> {
    return await db.select().from(documents).where(and(eq(documents.tenantId, tenantId), eq(documents.type, type))).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByBatchId(tenantId: string, batchId: string): Promise<Document[]> {
    return await db.select().from(documents).where(and(eq(documents.tenantId, tenantId), eq(documents.batchId, batchId))).orderBy(desc(documents.createdAt));
  }

  async getDocument(tenantId: string, id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)));
    return doc || undefined;
  }

  async createDocument(tenantId: string, insertDocument: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values({ ...insertDocument, tenantId }).returning();
    return doc;
  }

  async updateDocument(tenantId: string, id: string, updates: UpdateDocument): Promise<Document | undefined> {
    const updateData: Record<string, unknown> = { ...updates, updatedAt: new Date() };
    if (updates.status === 'processed') {
      updateData.processedAt = new Date();
    }
    const [doc] = await db.update(documents).set(updateData).where(and(eq(documents.id, id), eq(documents.tenantId, tenantId))).returning();
    return doc || undefined;
  }

  async deleteDocument(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(documents).where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Document Batches Implementation
  async getAllDocumentBatches(tenantId: string): Promise<DocumentBatch[]> {
    return await db.select().from(documentBatches).where(eq(documentBatches.tenantId, tenantId)).orderBy(desc(documentBatches.createdAt));
  }

  async getDocumentBatch(tenantId: string, id: string): Promise<DocumentBatch | undefined> {
    const [batch] = await db.select().from(documentBatches).where(and(eq(documentBatches.id, id), eq(documentBatches.tenantId, tenantId)));
    return batch || undefined;
  }

  async createDocumentBatch(tenantId: string, insertBatch: InsertDocumentBatch): Promise<DocumentBatch> {
    const [batch] = await db.insert(documentBatches).values({ ...insertBatch, tenantId }).returning();
    return batch;
  }

  async updateDocumentBatch(tenantId: string, id: string, updates: Partial<InsertDocumentBatch>): Promise<DocumentBatch | undefined> {
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completedAt = new Date();
    }
    const [batch] = await db.update(documentBatches).set(updateData).where(and(eq(documentBatches.id, id), eq(documentBatches.tenantId, tenantId))).returning();
    return batch || undefined;
  }

  // WhatsApp Conversations Implementation
  async getAllWhatsappConversations(tenantId: string): Promise<WhatsappConversation[]> {
    return await db.select().from(whatsappConversations)
      .where(eq(whatsappConversations.tenantId, tenantId))
      .orderBy(desc(whatsappConversations.lastMessageAt));
  }

  async getWhatsappConversation(tenantId: string, id: string): Promise<WhatsappConversation | undefined> {
    const [conv] = await db.select().from(whatsappConversations)
      .where(and(eq(whatsappConversations.id, id), eq(whatsappConversations.tenantId, tenantId)));
    return conv || undefined;
  }

  async getWhatsappConversationByWaId(tenantId: string, waId: string): Promise<WhatsappConversation | undefined> {
    const [conv] = await db.select().from(whatsappConversations)
      .where(and(eq(whatsappConversations.waId, waId), eq(whatsappConversations.tenantId, tenantId)));
    return conv || undefined;
  }

  async getWhatsappConversationsByCandidateId(tenantId: string, candidateId: string): Promise<WhatsappConversation[]> {
    return await db.select().from(whatsappConversations)
      .where(and(eq(whatsappConversations.candidateId, candidateId), eq(whatsappConversations.tenantId, tenantId)))
      .orderBy(desc(whatsappConversations.updatedAt), desc(whatsappConversations.lastMessageAt));
  }

  async createWhatsappConversation(tenantId: string, conversation: InsertWhatsappConversation): Promise<WhatsappConversation> {
    const [conv] = await db.insert(whatsappConversations).values({ ...conversation, tenantId }).returning();
    return conv;
  }

  async updateWhatsappConversation(tenantId: string, id: string, updates: Partial<InsertWhatsappConversation>): Promise<WhatsappConversation | undefined> {
    const [conv] = await db.update(whatsappConversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(whatsappConversations.id, id), eq(whatsappConversations.tenantId, tenantId)))
      .returning();
    return conv || undefined;
  }

  // WhatsApp Messages Implementation
  async getWhatsappMessages(tenantId: string, conversationId: string): Promise<WhatsappMessage[]> {
    return await db.select().from(whatsappMessages)
      .where(and(eq(whatsappMessages.conversationId, conversationId), eq(whatsappMessages.tenantId, tenantId)))
      .orderBy(whatsappMessages.createdAt);
  }

  async getWhatsappMessage(tenantId: string, id: string): Promise<WhatsappMessage | undefined> {
    const [msg] = await db.select().from(whatsappMessages)
      .where(and(eq(whatsappMessages.id, id), eq(whatsappMessages.tenantId, tenantId)));
    return msg || undefined;
  }

  async getWhatsappMessageByWhatsappId(tenantId: string, whatsappMessageId: string): Promise<WhatsappMessage | undefined> {
    const [msg] = await db.select().from(whatsappMessages)
      .where(and(eq(whatsappMessages.whatsappMessageId, whatsappMessageId), eq(whatsappMessages.tenantId, tenantId)));
    return msg || undefined;
  }

  async createWhatsappMessage(tenantId: string, message: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const [msg] = await db.insert(whatsappMessages).values({ ...message, tenantId }).returning();
    return msg;
  }

  async updateWhatsappMessage(tenantId: string, id: string, updates: Partial<InsertWhatsappMessage>): Promise<WhatsappMessage | undefined> {
    const [msg] = await db.update(whatsappMessages)
      .set(updates)
      .where(and(eq(whatsappMessages.id, id), eq(whatsappMessages.tenantId, tenantId)))
      .returning();
    return msg || undefined;
  }

  // WhatsApp Document Requests Implementation
  async getWhatsappDocumentRequests(tenantId: string, conversationId?: string): Promise<WhatsappDocumentRequest[]> {
    if (conversationId) {
      return await db.select().from(whatsappDocumentRequests)
        .where(and(eq(whatsappDocumentRequests.conversationId, conversationId), eq(whatsappDocumentRequests.tenantId, tenantId)))
        .orderBy(desc(whatsappDocumentRequests.createdAt));
    }
    return await db.select().from(whatsappDocumentRequests)
      .where(eq(whatsappDocumentRequests.tenantId, tenantId))
      .orderBy(desc(whatsappDocumentRequests.createdAt));
  }

  async getWhatsappDocumentRequest(tenantId: string, id: string): Promise<WhatsappDocumentRequest | undefined> {
    const [req] = await db.select().from(whatsappDocumentRequests)
      .where(and(eq(whatsappDocumentRequests.id, id), eq(whatsappDocumentRequests.tenantId, tenantId)));
    return req || undefined;
  }

  async createWhatsappDocumentRequest(tenantId: string, request: InsertWhatsappDocumentRequest): Promise<WhatsappDocumentRequest> {
    const [req] = await db.insert(whatsappDocumentRequests).values({ ...request, tenantId }).returning();
    return req;
  }

  async updateWhatsappDocumentRequest(tenantId: string, id: string, updates: Partial<InsertWhatsappDocumentRequest>): Promise<WhatsappDocumentRequest | undefined> {
    const [req] = await db.update(whatsappDocumentRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(whatsappDocumentRequests.id, id), eq(whatsappDocumentRequests.tenantId, tenantId)))
      .returning();
    return req || undefined;
  }

  // WhatsApp Appointments Implementation
  async getWhatsappAppointments(tenantId: string, conversationId?: string): Promise<WhatsappAppointment[]> {
    if (conversationId) {
      return await db.select().from(whatsappAppointments)
        .where(and(eq(whatsappAppointments.conversationId, conversationId), eq(whatsappAppointments.tenantId, tenantId)))
        .orderBy(desc(whatsappAppointments.scheduledAt));
    }
    return await db.select().from(whatsappAppointments)
      .where(eq(whatsappAppointments.tenantId, tenantId))
      .orderBy(desc(whatsappAppointments.scheduledAt));
  }

  async getWhatsappAppointment(tenantId: string, id: string): Promise<WhatsappAppointment | undefined> {
    const [apt] = await db.select().from(whatsappAppointments)
      .where(and(eq(whatsappAppointments.id, id), eq(whatsappAppointments.tenantId, tenantId)));
    return apt || undefined;
  }

  async createWhatsappAppointment(tenantId: string, appointment: InsertWhatsappAppointment): Promise<WhatsappAppointment> {
    const [apt] = await db.insert(whatsappAppointments).values({ ...appointment, tenantId }).returning();
    return apt;
  }

  async updateWhatsappAppointment(tenantId: string, id: string, updates: Partial<InsertWhatsappAppointment>): Promise<WhatsappAppointment | undefined> {
    const [apt] = await db.update(whatsappAppointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(whatsappAppointments.id, id), eq(whatsappAppointments.tenantId, tenantId)))
      .returning();
    return apt || undefined;
  }

  // Interview Sessions Implementation
  async getInterviewSession(tenantId: string, id: string): Promise<InterviewSession | undefined> {
    const [session] = await db.select().from(interviewSessions)
      .where(and(eq(interviewSessions.id, id), eq(interviewSessions.tenantId, tenantId)));
    return session || undefined;
  }

  async getInterviewSessionByToken(token: string): Promise<InterviewSession | undefined> {
    const [session] = await db.select().from(interviewSessions)
      .where(eq(interviewSessions.token, token));
    return session || undefined;
  }

  async getInterviewSessionsByCandidateId(tenantId: string, candidateId: string): Promise<InterviewSession[]> {
    return await db.select().from(interviewSessions)
      .where(and(eq(interviewSessions.candidateId, candidateId), eq(interviewSessions.tenantId, tenantId)))
      .orderBy(desc(interviewSessions.createdAt));
  }

  async getInterviewSessionsByConversationId(tenantId: string, conversationId: string): Promise<InterviewSession[]> {
    return await db.select().from(interviewSessions)
      .where(and(eq(interviewSessions.conversationId, conversationId), eq(interviewSessions.tenantId, tenantId)))
      .orderBy(desc(interviewSessions.createdAt));
  }

  async createInterviewSession(tenantId: string, session: InsertInterviewSession): Promise<InterviewSession> {
    const [newSession] = await db.insert(interviewSessions).values({ ...session, tenantId }).returning();
    return newSession;
  }

  async updateInterviewSession(tenantId: string, id: string, updates: Partial<InsertInterviewSession>): Promise<InterviewSession | undefined> {
    const [session] = await db.update(interviewSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(interviewSessions.id, id), eq(interviewSessions.tenantId, tenantId)))
      .returning();
    return session || undefined;
  }

  async updateInterviewSessionByToken(token: string, updates: Partial<InsertInterviewSession>): Promise<InterviewSession | undefined> {
    const [session] = await db.update(interviewSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewSessions.token, token))
      .returning();
    return session || undefined;
  }

  // Onboarding Agent Logs Implementation
  async getOnboardingAgentLogs(tenantId: string, workflowId?: string): Promise<OnboardingAgentLog[]> {
    if (workflowId) {
      return await db.select().from(onboardingAgentLogs)
        .where(and(eq(onboardingAgentLogs.tenantId, tenantId), eq(onboardingAgentLogs.workflowId, workflowId)))
        .orderBy(desc(onboardingAgentLogs.createdAt));
    }
    return await db.select().from(onboardingAgentLogs)
      .where(eq(onboardingAgentLogs.tenantId, tenantId))
      .orderBy(desc(onboardingAgentLogs.createdAt));
  }

  async getOnboardingAgentLogsByCandidate(tenantId: string, candidateId: string): Promise<OnboardingAgentLog[]> {
    return await db.select().from(onboardingAgentLogs)
      .where(and(eq(onboardingAgentLogs.tenantId, tenantId), eq(onboardingAgentLogs.candidateId, candidateId)))
      .orderBy(desc(onboardingAgentLogs.createdAt));
  }

  async getOnboardingAgentLogsRequiringReview(tenantId: string): Promise<OnboardingAgentLog[]> {
    return await db.select().from(onboardingAgentLogs)
      .where(and(eq(onboardingAgentLogs.tenantId, tenantId), eq(onboardingAgentLogs.requiresHumanReview, 1)))
      .orderBy(desc(onboardingAgentLogs.createdAt));
  }

  async createOnboardingAgentLog(tenantId: string, log: InsertOnboardingAgentLog): Promise<OnboardingAgentLog> {
    const [newLog] = await db.insert(onboardingAgentLogs).values({ ...log, tenantId }).returning();
    return newLog;
  }

  async updateOnboardingAgentLog(tenantId: string, id: string, updates: Partial<InsertOnboardingAgentLog>): Promise<OnboardingAgentLog | undefined> {
    const [log] = await db.update(onboardingAgentLogs)
      .set(updates)
      .where(and(eq(onboardingAgentLogs.id, id), eq(onboardingAgentLogs.tenantId, tenantId)))
      .returning();
    return log || undefined;
  }

  // Onboarding Document Requests Implementation
  async getOnboardingDocumentRequests(tenantId: string, workflowId?: string): Promise<OnboardingDocumentRequest[]> {
    if (workflowId) {
      return await db.select().from(onboardingDocumentRequests)
        .where(and(eq(onboardingDocumentRequests.tenantId, tenantId), eq(onboardingDocumentRequests.workflowId, workflowId)))
        .orderBy(desc(onboardingDocumentRequests.createdAt));
    }
    return await db.select().from(onboardingDocumentRequests)
      .where(eq(onboardingDocumentRequests.tenantId, tenantId))
      .orderBy(desc(onboardingDocumentRequests.createdAt));
  }

  async getOnboardingDocumentRequestsByCandidate(tenantId: string, candidateId: string): Promise<OnboardingDocumentRequest[]> {
    return await db.select().from(onboardingDocumentRequests)
      .where(and(eq(onboardingDocumentRequests.tenantId, tenantId), eq(onboardingDocumentRequests.candidateId, candidateId)))
      .orderBy(desc(onboardingDocumentRequests.createdAt));
  }

  async getOnboardingDocumentRequest(tenantId: string, id: string): Promise<OnboardingDocumentRequest | undefined> {
    const [request] = await db.select().from(onboardingDocumentRequests)
      .where(and(eq(onboardingDocumentRequests.id, id), eq(onboardingDocumentRequests.tenantId, tenantId)));
    return request || undefined;
  }

  async getPendingDocumentRequests(tenantId: string): Promise<OnboardingDocumentRequest[]> {
    return await db.select().from(onboardingDocumentRequests)
      .where(and(
        eq(onboardingDocumentRequests.tenantId, tenantId),
        eq(onboardingDocumentRequests.status, 'pending')
      ))
      .orderBy(desc(onboardingDocumentRequests.createdAt));
  }

  async getOverdueDocumentRequests(tenantId: string): Promise<OnboardingDocumentRequest[]> {
    const now = new Date();
    return await db.select().from(onboardingDocumentRequests)
      .where(and(
        eq(onboardingDocumentRequests.tenantId, tenantId),
        eq(onboardingDocumentRequests.status, 'pending'),
        lte(onboardingDocumentRequests.dueDate, now)
      ))
      .orderBy(desc(onboardingDocumentRequests.dueDate));
  }

  async createOnboardingDocumentRequest(tenantId: string, request: InsertOnboardingDocumentRequest): Promise<OnboardingDocumentRequest> {
    const [newRequest] = await db.insert(onboardingDocumentRequests).values({ ...request, tenantId }).returning();
    return newRequest;
  }

  async updateOnboardingDocumentRequest(tenantId: string, id: string, updates: Partial<InsertOnboardingDocumentRequest>): Promise<OnboardingDocumentRequest | undefined> {
    const [request] = await db.update(onboardingDocumentRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(onboardingDocumentRequests.id, id), eq(onboardingDocumentRequests.tenantId, tenantId)))
      .returning();
    return request || undefined;
  }
}

export const storage = new DatabaseStorage();
