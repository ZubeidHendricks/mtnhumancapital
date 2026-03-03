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
  type IntegrityDocumentRequirement,
  type InsertIntegrityDocumentRequirement,
  type UpdateIntegrityDocumentRequirement,
  type CandidateDocument,
  type InsertCandidateDocument,
  type UpdateCandidateDocument,
  type WhatsappDocumentSession,
  type InsertWhatsappDocumentSession,
  type UpdateWhatsappDocumentSession,
  type InterviewRecording,
  type InsertInterviewRecording,
  type InterviewTranscript,
  type InsertInterviewTranscript,
  type InterviewFeedback,
  type InsertInterviewFeedback,
  type CandidateRecommendation,
  type InsertCandidateRecommendation,
  type ModelTrainingEvent,
  type InsertModelTrainingEvent,
  type Offer,
  type InsertOffer,
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
  onboardingDocumentRequests,
  integrityDocumentRequirements,
  candidateDocuments,
  whatsappDocumentSessions,
  interviewRecordings,
  interviewTranscripts,
  interviewFeedback,
  candidateRecommendations,
  modelTrainingEvents,
  offers,
  dataSources,
  dataSourceSyncHistory,
  dataSourceFields,
  type DataSource,
  type InsertDataSource,
  type UpdateDataSource,
  type DataSourceSyncHistory,
  type InsertDataSourceSyncHistory,
  type DataSourceField,
  type InsertDataSourceField,
  kpiTemplates,
  reviewCycles,
  kpiAssignments,
  kpiScores,
  feedback360Requests,
  feedback360Responses,
  reviewSubmissions,
  type KpiTemplate,
  type InsertKpiTemplate,
  type UpdateKpiTemplate,
  type ReviewCycle,
  type InsertReviewCycle,
  type UpdateReviewCycle,
  type KpiAssignment,
  type InsertKpiAssignment,
  type UpdateKpiAssignment,
  type KpiScore,
  type InsertKpiScore,
  type UpdateKpiScore,
  type Feedback360Request,
  type InsertFeedback360Request,
  type Feedback360Response,
  type InsertFeedback360Response,
  type ReviewSubmission,
  type InsertReviewSubmission,
  type UpdateReviewSubmission,
  candidateSocialConsent,
  candidateSocialProfiles,
  socialScreeningFindings,
  socialScreeningPosts,
  type CandidateSocialConsent,
  type InsertCandidateSocialConsent,
  type UpdateCandidateSocialConsent,
  type CandidateSocialProfile,
  type InsertCandidateSocialProfile,
  type UpdateCandidateSocialProfile,
  type SocialScreeningFinding,
  type InsertSocialScreeningFinding,
  type UpdateSocialScreeningFinding,
  type SocialScreeningPost,
  type InsertSocialScreeningPost,
  tenantPayments,
  subscriptionPlans,
  type TenantPayment,
  type InsertTenantPayment,
  type SubscriptionPlan,
  courses,
  assessments,
  learnerProgress,
  assessmentAttempts,
  gamificationBadges,
  learnerBadges,
  learnerPoints,
  aiLecturers,
  certificateTemplates,
  issuedCertificates,
  type CertificateTemplate,
  type InsertCertificateTemplate,
  type IssuedCertificate,
  type InsertIssuedCertificate,
  learnerCourseReminders,
  type LearnerCourseReminder,
  selfAssessmentTokens,
  type SelfAssessmentToken,
  type InsertSelfAssessmentToken,
  cvTemplates,
  type CvTemplate,
  type InsertCvTemplate,
  documentTemplates,
  type DocumentTemplate,
  type InsertDocumentTemplate,
  weighbridgeSlips,
  type WeighbridgeSlip,
  type InsertWeighbridgeSlip,
  interviewTimelineTags,
  transcriptJobs,
  recordingSources,
  lemurAnalysisResults,
  type InterviewTimelineTag,
  type InsertInterviewTimelineTag,
  type TranscriptJob,
  type InsertTranscriptJob,
  type RecordingSource,
  type InsertRecordingSource,
  type LemurAnalysisResult,
  type InsertLemurAnalysisResult,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte, sql, isNull, isNotNull, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllJobs(tenantId: string, includeArchived?: boolean): Promise<Job[]>;
  getJobsPaginated(tenantId: string, page: number, limit: number): Promise<{ data: Job[]; total: number }>;
  getClosedJobs(tenantId: string): Promise<Job[]>;
  getArchivedJobs(tenantId: string): Promise<Job[]>;
  getJob(tenantId: string, id: string): Promise<Job | undefined>;
  createJob(tenantId: string, job: InsertJob): Promise<Job>;
  updateJob(tenantId: string, id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(tenantId: string, id: string): Promise<boolean>;
  archiveJob(tenantId: string, id: string, reason?: string): Promise<Job | undefined>;
  restoreJob(tenantId: string, id: string): Promise<Job | undefined>;
  
  getAllCandidates(tenantId: string): Promise<Candidate[]>;
  getCandidatesPaginated(tenantId: string, page: number, limit: number): Promise<{ data: Candidate[]; total: number }>;
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
  getOnboardingWorkflowByUploadToken(token: string): Promise<OnboardingWorkflow | undefined>;
  getIntegrityCheckByUploadToken(token: string): Promise<IntegrityCheck | undefined>;

  getTenantConfig(tenantId?: string): Promise<TenantConfig | undefined>;
  getAllTenantConfigs(): Promise<TenantConfig[]>;
  getTenantById(id: string): Promise<TenantConfig | undefined>;
  createTenantConfig(config: InsertTenantConfig): Promise<TenantConfig>;
  updateTenantConfig(id: string, config: Partial<InsertTenantConfig>): Promise<TenantConfig | undefined>;
  
  getAllInterviews(tenantId: string): Promise<Interview[]>;
  getInterviewsPaginated(tenantId: string, page: number, limit: number): Promise<{ data: Interview[]; total: number }>;
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
  getDocumentsPaginated(tenantId: string, page: number, limit: number): Promise<{ data: Document[]; total: number }>;
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
  getWhatsappConversationsPaginated(tenantId: string, page: number, limit: number): Promise<{ data: WhatsappConversation[]; total: number }>;
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
  getInterviewSessionByVideoToken(token: string): Promise<InterviewSession | undefined>;
  getInterviewSessionsByCandidateId(tenantId: string, candidateId: string): Promise<InterviewSession[]>;
  getInterviewSessionsByConversationId(tenantId: string, conversationId: string): Promise<InterviewSession[]>;
  getAllInterviewSessions(tenantId: string): Promise<InterviewSession[]>;
  createInterviewSession(tenantId: string, session: InsertInterviewSession): Promise<InterviewSession>;
  updateInterviewSession(tenantId: string, id: string, updates: Partial<InsertInterviewSession>): Promise<InterviewSession | undefined>;
  updateInterviewSessionByToken(token: string, updates: Partial<InsertInterviewSession>): Promise<InterviewSession | undefined>;

  // Interview Recordings
  getInterviewRecordings(tenantId: string, sessionId: string, stage?: string): Promise<InterviewRecording[]>;
  getInterviewRecording(tenantId: string, id: string): Promise<InterviewRecording | undefined>;
  createInterviewRecording(tenantId: string, recording: InsertInterviewRecording): Promise<InterviewRecording>;
  updateInterviewRecording(tenantId: string, id: string, updates: Partial<InsertInterviewRecording>): Promise<InterviewRecording | undefined>;

  // Interview Transcripts
  getInterviewTranscripts(tenantId: string, sessionId: string, stage?: string): Promise<InterviewTranscript[]>;
  getInterviewTranscript(tenantId: string, id: string): Promise<InterviewTranscript | undefined>;
  createInterviewTranscript(tenantId: string, transcript: InsertInterviewTranscript): Promise<InterviewTranscript>;
  createInterviewTranscriptsBatch(tenantId: string, transcripts: InsertInterviewTranscript[]): Promise<InterviewTranscript[]>;

  // Interview Feedback
  getInterviewFeedback(tenantId: string, sessionId: string, stage?: string): Promise<InterviewFeedback[]>;
  getInterviewFeedbackById(tenantId: string, id: string): Promise<InterviewFeedback | undefined>;
  getInterviewFeedbackByCandidate(tenantId: string, candidateId: string): Promise<InterviewFeedback[]>;
  createInterviewFeedback(tenantId: string, feedback: InsertInterviewFeedback): Promise<InterviewFeedback>;
  updateInterviewFeedback(tenantId: string, id: string, updates: Partial<InsertInterviewFeedback>): Promise<InterviewFeedback | undefined>;
  
  // Candidate Recommendations
  getCandidateRecommendations(tenantId: string, candidateId?: string): Promise<CandidateRecommendation[]>;
  getCandidateRecommendation(tenantId: string, id: string): Promise<CandidateRecommendation | undefined>;
  getCandidateRecommendationsByJob(tenantId: string, jobId: string): Promise<CandidateRecommendation[]>;
  createCandidateRecommendation(tenantId: string, recommendation: InsertCandidateRecommendation): Promise<CandidateRecommendation>;
  updateCandidateRecommendation(tenantId: string, id: string, updates: Partial<InsertCandidateRecommendation>): Promise<CandidateRecommendation | undefined>;
  
  // Model Training Events
  getModelTrainingEvents(tenantId: string, sessionId?: string): Promise<ModelTrainingEvent[]>;
  createModelTrainingEvent(tenantId: string, event: InsertModelTrainingEvent): Promise<ModelTrainingEvent>;
  updateModelTrainingEvent(tenantId: string, id: string, updates: Partial<InsertModelTrainingEvent>): Promise<ModelTrainingEvent | undefined>;

  // ViTT Timeline Tags
  getTimelineTags(tenantId: string, sessionId: string): Promise<InterviewTimelineTag[]>;
  getTimelineTag(tenantId: string, id: string): Promise<InterviewTimelineTag | undefined>;
  getTimelineTagsByType(tenantId: string, sessionId: string, tagType: string): Promise<InterviewTimelineTag[]>;
  createTimelineTag(tenantId: string, tag: InsertInterviewTimelineTag): Promise<InterviewTimelineTag>;
  updateTimelineTag(tenantId: string, id: string, updates: Partial<InsertInterviewTimelineTag>): Promise<InterviewTimelineTag | undefined>;
  deleteTimelineTag(tenantId: string, id: string): Promise<void>;

  // Transcript Jobs
  getTranscriptJobs(tenantId: string, sessionId: string): Promise<TranscriptJob[]>;
  getTranscriptJob(tenantId: string, id: string): Promise<TranscriptJob | undefined>;
  createTranscriptJob(tenantId: string, job: InsertTranscriptJob): Promise<TranscriptJob>;
  updateTranscriptJob(tenantId: string, id: string, updates: Partial<InsertTranscriptJob>): Promise<TranscriptJob | undefined>;

  // Recording Sources
  getRecordingSources(tenantId: string, sessionId: string): Promise<RecordingSource[]>;
  getRecordingSource(tenantId: string, id: string): Promise<RecordingSource | undefined>;
  createRecordingSource(tenantId: string, source: InsertRecordingSource): Promise<RecordingSource>;
  updateRecordingSource(tenantId: string, id: string, updates: Partial<InsertRecordingSource>): Promise<RecordingSource | undefined>;

  // LeMUR Analysis Results
  getLemurAnalysisResults(tenantId: string, sessionId: string): Promise<LemurAnalysisResult[]>;
  createLemurAnalysisResult(tenantId: string, result: InsertLemurAnalysisResult): Promise<LemurAnalysisResult>;

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
  
  // Integrity Document Requirements
  getIntegrityDocumentRequirements(tenantId: string, candidateId?: string): Promise<IntegrityDocumentRequirement[]>;
  getIntegrityDocumentRequirementsByCheckId(tenantId: string, checkId: string): Promise<IntegrityDocumentRequirement[]>;
  getIntegrityDocumentRequirement(tenantId: string, id: string): Promise<IntegrityDocumentRequirement | undefined>;
  getIntegrityDocumentRequirementByRefCode(tenantId: string, referenceCode: string): Promise<IntegrityDocumentRequirement | undefined>;
  getPendingIntegrityDocumentRequirements(tenantId: string): Promise<IntegrityDocumentRequirement[]>;
  getIntegrityDocRequirementsNeedingReminders(tenantId: string, now: Date): Promise<IntegrityDocumentRequirement[]>;
  createIntegrityDocumentRequirement(tenantId: string, requirement: InsertIntegrityDocumentRequirement): Promise<IntegrityDocumentRequirement>;
  updateIntegrityDocumentRequirement(tenantId: string, id: string, updates: UpdateIntegrityDocumentRequirement): Promise<IntegrityDocumentRequirement | undefined>;
  deleteIntegrityDocumentRequirement(tenantId: string, id: string): Promise<boolean>;
  
  // Candidate Documents (for integrity verification)
  getCandidateDocuments(tenantId: string, candidateId?: string): Promise<CandidateDocument[]>;
  getCandidateDocumentsByRequirementId(tenantId: string, requirementId: string): Promise<CandidateDocument[]>;
  getCandidateDocument(tenantId: string, id: string): Promise<CandidateDocument | undefined>;
  getCandidateDocumentByRefCode(tenantId: string, referenceCode: string): Promise<CandidateDocument | undefined>;
  createCandidateDocument(tenantId: string, document: InsertCandidateDocument): Promise<CandidateDocument>;
  updateCandidateDocument(tenantId: string, id: string, updates: UpdateCandidateDocument): Promise<CandidateDocument | undefined>;
  deleteCandidateDocument(tenantId: string, id: string): Promise<boolean>;
  
  // WhatsApp Document Sessions
  getWhatsappDocumentSession(tenantId: string, id: string): Promise<WhatsappDocumentSession | undefined>;
  getWhatsappDocumentSessionByPhone(tenantId: string, phoneNumber: string): Promise<WhatsappDocumentSession | undefined>;
  getWhatsappDocumentSessionByCandidate(tenantId: string, candidateId: string): Promise<WhatsappDocumentSession | undefined>;
  createWhatsappDocumentSession(tenantId: string, session: InsertWhatsappDocumentSession): Promise<WhatsappDocumentSession>;
  updateWhatsappDocumentSession(tenantId: string, id: string, updates: UpdateWhatsappDocumentSession): Promise<WhatsappDocumentSession | undefined>;
  deleteWhatsappDocumentSession(tenantId: string, id: string): Promise<boolean>;
  
  // Data Sources
  getAllDataSources(tenantId: string): Promise<DataSource[]>;
  getDataSource(tenantId: string, id: string): Promise<DataSource | undefined>;
  getDataSourcesByType(tenantId: string, type: string): Promise<DataSource[]>;
  getActiveDataSources(tenantId: string): Promise<DataSource[]>;
  createDataSource(tenantId: string, source: InsertDataSource): Promise<DataSource>;
  updateDataSource(tenantId: string, id: string, updates: UpdateDataSource): Promise<DataSource | undefined>;
  deleteDataSource(tenantId: string, id: string): Promise<boolean>;
  
  // Data Source Sync History
  getDataSourceSyncHistory(tenantId: string, dataSourceId: string): Promise<DataSourceSyncHistory[]>;
  createDataSourceSyncHistory(tenantId: string, history: InsertDataSourceSyncHistory): Promise<DataSourceSyncHistory>;
  updateDataSourceSyncHistory(id: string, updates: Partial<InsertDataSourceSyncHistory>): Promise<DataSourceSyncHistory | undefined>;
  
  // Data Source Fields
  getDataSourceFields(tenantId: string, dataSourceId: string): Promise<DataSourceField[]>;
  createDataSourceField(tenantId: string, field: InsertDataSourceField): Promise<DataSourceField>;
  deleteDataSourceFields(tenantId: string, dataSourceId: string): Promise<boolean>;

  // Data Sources - additional sync helpers
  getDataSourcesNeedingSync(): Promise<DataSource[]>;
  getKpiTemplatesByDataSource(tenantId: string, dataSourceId: string): Promise<KpiTemplate[]>;
  
  // KPI Templates
  getAllKpiTemplates(tenantId: string): Promise<KpiTemplate[]>;
  getKpiTemplate(tenantId: string, id: string): Promise<KpiTemplate | undefined>;
  getKpiTemplatesByCategory(tenantId: string, category: string): Promise<KpiTemplate[]>;
  createKpiTemplate(tenantId: string, template: InsertKpiTemplate): Promise<KpiTemplate>;
  updateKpiTemplate(tenantId: string, id: string, updates: UpdateKpiTemplate): Promise<KpiTemplate | undefined>;
  deleteKpiTemplate(tenantId: string, id: string): Promise<boolean>;
  updateKpiTemplateCurrentValue(tenantId: string, id: string, currentValue: number): Promise<KpiTemplate | undefined>;
  
  // Review Cycles
  getAllReviewCycles(tenantId: string): Promise<ReviewCycle[]>;
  getReviewCycle(tenantId: string, id: string): Promise<ReviewCycle | undefined>;
  getActiveReviewCycles(tenantId: string): Promise<ReviewCycle[]>;
  createReviewCycle(tenantId: string, cycle: InsertReviewCycle): Promise<ReviewCycle>;
  updateReviewCycle(tenantId: string, id: string, updates: UpdateReviewCycle): Promise<ReviewCycle | undefined>;
  deleteReviewCycle(tenantId: string, id: string): Promise<boolean>;
  
  // KPI Assignments
  getKpiAssignments(tenantId: string, reviewCycleId?: string): Promise<KpiAssignment[]>;
  getKpiAssignment(tenantId: string, id: string): Promise<KpiAssignment | undefined>;
  getKpiAssignmentsByEmployee(tenantId: string, employeeId: string, reviewCycleId?: string): Promise<KpiAssignment[]>;
  getKpiAssignmentsByManager(tenantId: string, managerId: string, reviewCycleId?: string): Promise<KpiAssignment[]>;
  createKpiAssignment(tenantId: string, assignment: InsertKpiAssignment): Promise<KpiAssignment>;
  createKpiAssignmentsBatch(tenantId: string, assignments: InsertKpiAssignment[]): Promise<KpiAssignment[]>;
  updateKpiAssignment(tenantId: string, id: string, updates: UpdateKpiAssignment): Promise<KpiAssignment | undefined>;
  deleteKpiAssignment(tenantId: string, id: string): Promise<boolean>;
  
  // KPI Scores
  getKpiScores(tenantId: string, assignmentId: string): Promise<KpiScore[]>;
  getKpiScore(tenantId: string, id: string): Promise<KpiScore | undefined>;
  getKpiScoresByScorer(tenantId: string, scorerId: string): Promise<KpiScore[]>;
  createKpiScore(tenantId: string, score: InsertKpiScore): Promise<KpiScore>;
  updateKpiScore(tenantId: string, id: string, updates: UpdateKpiScore): Promise<KpiScore | undefined>;
  deleteKpiScore(tenantId: string, id: string): Promise<boolean>;
  
  // 360 Feedback Requests
  getFeedback360Requests(tenantId: string, reviewCycleId?: string): Promise<Feedback360Request[]>;
  getFeedback360Request(tenantId: string, id: string): Promise<Feedback360Request | undefined>;
  getFeedback360RequestByToken(token: string): Promise<Feedback360Request | undefined>;
  getFeedback360RequestsBySubject(tenantId: string, subjectId: string): Promise<Feedback360Request[]>;
  getFeedback360RequestsByReviewer(tenantId: string, reviewerId: string): Promise<Feedback360Request[]>;
  createFeedback360Request(tenantId: string, request: InsertFeedback360Request): Promise<Feedback360Request>;
  updateFeedback360Request(tenantId: string, id: string, updates: Partial<InsertFeedback360Request>): Promise<Feedback360Request | undefined>;
  
  // 360 Feedback Responses
  getFeedback360Responses(tenantId: string, requestId: string): Promise<Feedback360Response[]>;
  getFeedback360Response(tenantId: string, id: string): Promise<Feedback360Response | undefined>;
  createFeedback360Response(tenantId: string, response: InsertFeedback360Response): Promise<Feedback360Response>;
  
  // Review Submissions
  getReviewSubmissions(tenantId: string, reviewCycleId?: string): Promise<ReviewSubmission[]>;
  getReviewSubmission(tenantId: string, id: string): Promise<ReviewSubmission | undefined>;
  getReviewSubmissionByEmployee(tenantId: string, employeeId: string, reviewCycleId: string): Promise<ReviewSubmission | undefined>;
  getReviewSubmissionsByManager(tenantId: string, managerId: string, reviewCycleId?: string): Promise<ReviewSubmission[]>;
  getPendingReviewSubmissions(tenantId: string): Promise<ReviewSubmission[]>;
  createReviewSubmission(tenantId: string, submission: InsertReviewSubmission): Promise<ReviewSubmission>;
  updateReviewSubmission(tenantId: string, id: string, updates: UpdateReviewSubmission): Promise<ReviewSubmission | undefined>;
  
  // Social Screening - Consent
  getAllSocialConsents(tenantId: string): Promise<CandidateSocialConsent[]>;
  getSocialConsent(tenantId: string, id: string): Promise<CandidateSocialConsent | undefined>;
  getSocialConsentByCandidate(tenantId: string, candidateId: string): Promise<CandidateSocialConsent | undefined>;
  getSocialConsentByToken(token: string): Promise<CandidateSocialConsent | undefined>;
  createSocialConsent(tenantId: string, consent: InsertCandidateSocialConsent): Promise<CandidateSocialConsent>;
  updateSocialConsent(tenantId: string, id: string, updates: UpdateCandidateSocialConsent): Promise<CandidateSocialConsent | undefined>;
  
  // Social Screening - Profiles
  getSocialProfiles(tenantId: string, candidateId?: string): Promise<CandidateSocialProfile[]>;
  getSocialProfile(tenantId: string, id: string): Promise<CandidateSocialProfile | undefined>;
  getSocialProfilesByCandidate(tenantId: string, candidateId: string): Promise<CandidateSocialProfile[]>;
  createSocialProfile(tenantId: string, profile: InsertCandidateSocialProfile): Promise<CandidateSocialProfile>;
  updateSocialProfile(tenantId: string, id: string, updates: UpdateCandidateSocialProfile): Promise<CandidateSocialProfile | undefined>;
  deleteSocialProfile(tenantId: string, id: string): Promise<boolean>;
  
  // Social Screening - Findings
  getSocialScreeningFindings(tenantId: string, candidateId?: string): Promise<SocialScreeningFinding[]>;
  getSocialScreeningFinding(tenantId: string, id: string): Promise<SocialScreeningFinding | undefined>;
  getSocialScreeningFindingsByCandidate(tenantId: string, candidateId: string): Promise<SocialScreeningFinding[]>;
  getSocialScreeningFindingByIntegrityCheck(tenantId: string, integrityCheckId: string): Promise<SocialScreeningFinding | undefined>;
  getPendingHumanReviewFindings(tenantId: string): Promise<SocialScreeningFinding[]>;
  createSocialScreeningFinding(tenantId: string, finding: InsertSocialScreeningFinding): Promise<SocialScreeningFinding>;
  updateSocialScreeningFinding(tenantId: string, id: string, updates: UpdateSocialScreeningFinding): Promise<SocialScreeningFinding | undefined>;
  
  // Social Screening - Posts
  getSocialScreeningPosts(tenantId: string, findingId: string): Promise<SocialScreeningPost[]>;
  createSocialScreeningPost(tenantId: string, post: InsertSocialScreeningPost): Promise<SocialScreeningPost>;
  deleteExpiredSocialScreeningPosts(): Promise<number>;
  
  // Self-Assessment Tokens
  createSelfAssessmentToken(token: InsertSelfAssessmentToken): Promise<SelfAssessmentToken>;
  getSelfAssessmentToken(token: string): Promise<SelfAssessmentToken | undefined>;
  getSelfAssessmentTokensByEmployee(tenantId: string, employeeId: string): Promise<SelfAssessmentToken[]>;
  getSelfAssessmentTokensByReviewCycle(tenantId: string, reviewCycleId: string): Promise<SelfAssessmentToken[]>;
  updateSelfAssessmentToken(id: string, updates: Partial<InsertSelfAssessmentToken>): Promise<SelfAssessmentToken | undefined>;
  
  // CV Templates
  getCvTemplates(tenantId: string): Promise<CvTemplate[]>;
  getCvTemplateById(tenantId: string, id: string): Promise<CvTemplate | undefined>;
  getActiveCvTemplate(tenantId: string): Promise<CvTemplate | undefined>;
  createCvTemplate(tenantId: string, template: InsertCvTemplate): Promise<CvTemplate>;
  activateCvTemplate(tenantId: string, id: string): Promise<CvTemplate | undefined>;
  deleteCvTemplate(tenantId: string, id: string): Promise<boolean>;
  
  // Document Templates (Offer Letters, Welcome Letters, etc.)
  getDocumentTemplates(tenantId: string, templateType?: string): Promise<DocumentTemplate[]>;
  getDocumentTemplateById(tenantId: string, id: string): Promise<DocumentTemplate | undefined>;
  getActiveDocumentTemplate(tenantId: string, templateType: string): Promise<DocumentTemplate | undefined>;
  createDocumentTemplate(tenantId: string, template: InsertDocumentTemplate): Promise<DocumentTemplate>;
  activateDocumentTemplate(tenantId: string, id: string): Promise<DocumentTemplate | undefined>;
  deactivateDocumentTemplate(tenantId: string, id: string): Promise<DocumentTemplate | undefined>;
  deleteDocumentTemplate(tenantId: string, id: string): Promise<boolean>;

  // Offers Management
  getAllOffers(tenantId: string): Promise<Offer[]>;
  getOffer(tenantId: string, id: string): Promise<Offer | undefined>;
  getOfferByCandidateId(tenantId: string, candidateId: string): Promise<Offer | undefined>;
  getOfferByResponseToken(token: string): Promise<Offer | undefined>;
  createOffer(tenantId: string, offer: InsertOffer): Promise<Offer>;
  updateOffer(tenantId: string, id: string, offer: Partial<InsertOffer>): Promise<Offer | undefined>;
  deleteOffer(tenantId: string, id: string): Promise<boolean>;
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

  async getUserByUsernameOnly(username: string): Promise<User | undefined> {
    // Find user by username across all tenants
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
    // Exclude archived and closed jobs from active list
    return await db.select().from(jobs).where(
      and(
        eq(jobs.tenantId, tenantId), 
        sql`${jobs.archivedAt} IS NULL`,
        sql`(${jobs.isClosed} IS NULL OR ${jobs.isClosed} = 0)`
      )
    ).orderBy(desc(jobs.createdAt));
  }

  async getJobsPaginated(tenantId: string, page: number, limit: number): Promise<{ data: Job[]; total: number }> {
    const offset = (page - 1) * limit;
    const condition = and(
      eq(jobs.tenantId, tenantId),
      sql`${jobs.archivedAt} IS NULL`,
      sql`(${jobs.isClosed} IS NULL OR ${jobs.isClosed} = 0)`
    );
    const [data, countResult] = await Promise.all([
      db.select().from(jobs).where(condition).orderBy(desc(jobs.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(jobs).where(condition),
    ]);
    return { data, total: Number(countResult[0].count) };
  }

  async getClosedJobs(tenantId: string): Promise<Job[]> {
    return await db.select().from(jobs).where(
      and(
        eq(jobs.tenantId, tenantId), 
        sql`${jobs.archivedAt} IS NULL`,
        sql`${jobs.isClosed} = 1`
      )
    ).orderBy(desc(jobs.closedAt));
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

  async getCandidatesPaginated(tenantId: string, page: number, limit: number): Promise<{ data: Candidate[]; total: number }> {
    const offset = (page - 1) * limit;
    const [data, countResult] = await Promise.all([
      db.select().from(candidates).where(eq(candidates.tenantId, tenantId)).orderBy(desc(candidates.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(candidates).where(eq(candidates.tenantId, tenantId)),
    ]);
    return { data, total: Number(countResult[0].count) };
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
    const all = await db.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.tenantId, tenantId)).orderBy(desc(onboardingWorkflows.createdAt));
    // Deduplicate by candidateId — keep only the earliest workflow per candidate
    const seen = new Set<string>();
    return all.filter(w => {
      if (seen.has(w.candidateId)) return false;
      seen.add(w.candidateId);
      return true;
    });
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

  async getOnboardingWorkflowByUploadToken(token: string): Promise<OnboardingWorkflow | undefined> {
    const [workflow] = await db.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.uploadToken, token));
    return workflow || undefined;
  }

  async getIntegrityCheckByUploadToken(token: string): Promise<IntegrityCheck | undefined> {
    const [check] = await db.select().from(integrityChecks).where(eq(integrityChecks.uploadToken, token));
    return check || undefined;
  }

  async getTenantConfig(tenantId?: string): Promise<TenantConfig | undefined> {
    if (tenantId) {
      const [config] = await db.select().from(tenantConfig).where(eq(tenantConfig.id, tenantId));
      return config || undefined;
    }
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

  async getInterviewsPaginated(tenantId: string, page: number, limit: number): Promise<{ data: Interview[]; total: number }> {
    const offset = (page - 1) * limit;
    const [data, countResult] = await Promise.all([
      db.select().from(interviews).where(eq(interviews.tenantId, tenantId)).orderBy(desc(interviews.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(interviews).where(eq(interviews.tenantId, tenantId)),
    ]);
    return { data, total: Number(countResult[0].count) };
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
    // Single query with LEFT JOIN instead of N+1 loop
    const rows = await db
      .select()
      .from(employees)
      .leftJoin(employeeSkills, and(eq(employeeSkills.employeeId, employees.id), eq(employeeSkills.tenantId, tenantId)))
      .leftJoin(skills, eq(employeeSkills.skillId, skills.id))
      .where(eq(employees.tenantId, tenantId))
      .orderBy(desc(employees.createdAt));

    // Group rows by employee to reconstruct nested structure
    const employeeMap = new Map<string, Employee & { skills: (EmployeeSkill & { skill: Skill })[] }>();

    for (const row of rows) {
      const empId = row.employees.id;
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, { ...row.employees, skills: [] });
      }
      if (row.employee_skills && row.skills) {
        employeeMap.get(empId)!.skills.push({
          ...row.employee_skills,
          skill: row.skills,
        });
      }
    }

    return Array.from(employeeMap.values());
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

  async getDocumentsPaginated(tenantId: string, page: number, limit: number): Promise<{ data: Document[]; total: number }> {
    const offset = (page - 1) * limit;
    const [data, countResult] = await Promise.all([
      db.select().from(documents).where(eq(documents.tenantId, tenantId)).orderBy(desc(documents.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(documents).where(eq(documents.tenantId, tenantId)),
    ]);
    return { data, total: Number(countResult[0].count) };
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

  async getWhatsappConversationsPaginated(tenantId: string, page: number, limit: number): Promise<{ data: WhatsappConversation[]; total: number }> {
    const offset = (page - 1) * limit;
    const [data, countResult] = await Promise.all([
      db.select().from(whatsappConversations).where(eq(whatsappConversations.tenantId, tenantId)).orderBy(desc(whatsappConversations.lastMessageAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(whatsappConversations).where(eq(whatsappConversations.tenantId, tenantId)),
    ]);
    return { data, total: Number(countResult[0].count) };
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

  async getInterviewSessionByVideoToken(token: string): Promise<InterviewSession | undefined> {
    const [session] = await db.select().from(interviewSessions)
      .where(eq(interviewSessions.videoToken, token));
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

  async getAllInterviewSessions(tenantId: string): Promise<InterviewSession[]> {
    return await db.select().from(interviewSessions)
      .where(eq(interviewSessions.tenantId, tenantId))
      .orderBy(desc(interviewSessions.createdAt));
  }

  // Interview Recordings Implementation
  async getInterviewRecordings(tenantId: string, sessionId: string, stage?: string): Promise<InterviewRecording[]> {
    const conditions = [eq(interviewRecordings.tenantId, tenantId), eq(interviewRecordings.sessionId, sessionId)];
    if (stage) conditions.push(eq(interviewRecordings.interviewStage, stage));
    return await db.select().from(interviewRecordings)
      .where(and(...conditions))
      .orderBy(desc(interviewRecordings.createdAt));
  }

  async getInterviewRecording(tenantId: string, id: string): Promise<InterviewRecording | undefined> {
    const [recording] = await db.select().from(interviewRecordings)
      .where(and(eq(interviewRecordings.id, id), eq(interviewRecordings.tenantId, tenantId)));
    return recording || undefined;
  }

  async createInterviewRecording(tenantId: string, recording: InsertInterviewRecording): Promise<InterviewRecording> {
    const [newRecording] = await db.insert(interviewRecordings).values({ ...recording, tenantId }).returning();
    return newRecording;
  }

  async updateInterviewRecording(tenantId: string, id: string, updates: Partial<InsertInterviewRecording>): Promise<InterviewRecording | undefined> {
    const [recording] = await db.update(interviewRecordings)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(interviewRecordings.id, id), eq(interviewRecordings.tenantId, tenantId)))
      .returning();
    return recording || undefined;
  }

  // Interview Transcripts Implementation
  async getInterviewTranscripts(tenantId: string, sessionId: string, stage?: string): Promise<InterviewTranscript[]> {
    const conditions = [eq(interviewTranscripts.tenantId, tenantId), eq(interviewTranscripts.sessionId, sessionId)];
    if (stage) conditions.push(eq(interviewTranscripts.interviewStage, stage));
    return await db.select().from(interviewTranscripts)
      .where(and(...conditions))
      .orderBy(interviewTranscripts.segmentIndex);
  }

  async getInterviewTranscript(tenantId: string, id: string): Promise<InterviewTranscript | undefined> {
    const [transcript] = await db.select().from(interviewTranscripts)
      .where(and(eq(interviewTranscripts.id, id), eq(interviewTranscripts.tenantId, tenantId)));
    return transcript || undefined;
  }

  async createInterviewTranscript(tenantId: string, transcript: InsertInterviewTranscript): Promise<InterviewTranscript> {
    const [newTranscript] = await db.insert(interviewTranscripts).values({ ...transcript, tenantId }).returning();
    return newTranscript;
  }

  async createInterviewTranscriptsBatch(tenantId: string, transcripts: InsertInterviewTranscript[]): Promise<InterviewTranscript[]> {
    if (transcripts.length === 0) return [];
    const transcriptsWithTenant = transcripts.map(t => ({ ...t, tenantId }));
    return await db.insert(interviewTranscripts).values(transcriptsWithTenant).returning();
  }

  // Interview Feedback Implementation
  async getInterviewFeedback(tenantId: string, sessionId: string, stage?: string): Promise<InterviewFeedback[]> {
    const conditions = [eq(interviewFeedback.tenantId, tenantId), eq(interviewFeedback.sessionId, sessionId)];
    if (stage) conditions.push(eq(interviewFeedback.interviewStage, stage));
    return await db.select().from(interviewFeedback)
      .where(and(...conditions))
      .orderBy(desc(interviewFeedback.createdAt));
  }

  async getInterviewFeedbackById(tenantId: string, id: string): Promise<InterviewFeedback | undefined> {
    const [feedback] = await db.select().from(interviewFeedback)
      .where(and(eq(interviewFeedback.id, id), eq(interviewFeedback.tenantId, tenantId)));
    return feedback || undefined;
  }

  async getInterviewFeedbackByCandidate(tenantId: string, candidateId: string): Promise<InterviewFeedback[]> {
    return await db.select().from(interviewFeedback)
      .where(and(eq(interviewFeedback.tenantId, tenantId), eq(interviewFeedback.candidateId, candidateId)))
      .orderBy(desc(interviewFeedback.createdAt));
  }

  async createInterviewFeedback(tenantId: string, feedback: InsertInterviewFeedback): Promise<InterviewFeedback> {
    const [newFeedback] = await db.insert(interviewFeedback).values({ ...feedback, tenantId }).returning();
    return newFeedback;
  }

  async updateInterviewFeedback(tenantId: string, id: string, updates: Partial<InsertInterviewFeedback>): Promise<InterviewFeedback | undefined> {
    const [feedback] = await db.update(interviewFeedback)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(interviewFeedback.id, id), eq(interviewFeedback.tenantId, tenantId)))
      .returning();
    return feedback || undefined;
  }

  // Candidate Recommendations Implementation
  async getCandidateRecommendations(tenantId: string, candidateId?: string): Promise<CandidateRecommendation[]> {
    if (candidateId) {
      return await db.select().from(candidateRecommendations)
        .where(and(eq(candidateRecommendations.tenantId, tenantId), eq(candidateRecommendations.candidateId, candidateId), eq(candidateRecommendations.isActive, 1)))
        .orderBy(desc(candidateRecommendations.score));
    }
    return await db.select().from(candidateRecommendations)
      .where(and(eq(candidateRecommendations.tenantId, tenantId), eq(candidateRecommendations.isActive, 1)))
      .orderBy(desc(candidateRecommendations.score));
  }

  async getCandidateRecommendation(tenantId: string, id: string): Promise<CandidateRecommendation | undefined> {
    const [rec] = await db.select().from(candidateRecommendations)
      .where(and(eq(candidateRecommendations.id, id), eq(candidateRecommendations.tenantId, tenantId)));
    return rec || undefined;
  }

  async getCandidateRecommendationsByJob(tenantId: string, jobId: string): Promise<CandidateRecommendation[]> {
    return await db.select().from(candidateRecommendations)
      .where(and(eq(candidateRecommendations.tenantId, tenantId), eq(candidateRecommendations.jobId, jobId), eq(candidateRecommendations.isActive, 1)))
      .orderBy(desc(candidateRecommendations.score));
  }

  async createCandidateRecommendation(tenantId: string, recommendation: InsertCandidateRecommendation): Promise<CandidateRecommendation> {
    const [rec] = await db.insert(candidateRecommendations).values({ ...recommendation, tenantId }).returning();
    return rec;
  }

  async updateCandidateRecommendation(tenantId: string, id: string, updates: Partial<InsertCandidateRecommendation>): Promise<CandidateRecommendation | undefined> {
    const [rec] = await db.update(candidateRecommendations)
      .set(updates)
      .where(and(eq(candidateRecommendations.id, id), eq(candidateRecommendations.tenantId, tenantId)))
      .returning();
    return rec || undefined;
  }

  // Model Training Events Implementation
  async getModelTrainingEvents(tenantId: string, sessionId?: string): Promise<ModelTrainingEvent[]> {
    if (sessionId) {
      return await db.select().from(modelTrainingEvents)
        .where(and(eq(modelTrainingEvents.tenantId, tenantId), eq(modelTrainingEvents.sessionId, sessionId)))
        .orderBy(desc(modelTrainingEvents.createdAt));
    }
    return await db.select().from(modelTrainingEvents)
      .where(eq(modelTrainingEvents.tenantId, tenantId))
      .orderBy(desc(modelTrainingEvents.createdAt));
  }

  async createModelTrainingEvent(tenantId: string, event: InsertModelTrainingEvent): Promise<ModelTrainingEvent> {
    const [newEvent] = await db.insert(modelTrainingEvents).values({ ...event, tenantId }).returning();
    return newEvent;
  }

  async updateModelTrainingEvent(tenantId: string, id: string, updates: Partial<InsertModelTrainingEvent>): Promise<ModelTrainingEvent | undefined> {
    const [event] = await db.update(modelTrainingEvents)
      .set(updates)
      .where(and(eq(modelTrainingEvents.id, id), eq(modelTrainingEvents.tenantId, tenantId)))
      .returning();
    return event || undefined;
  }

  // ViTT Timeline Tags Implementation
  async getTimelineTags(tenantId: string, sessionId: string): Promise<InterviewTimelineTag[]> {
    return await db.select().from(interviewTimelineTags)
      .where(and(eq(interviewTimelineTags.tenantId, tenantId), eq(interviewTimelineTags.sessionId, sessionId)))
      .orderBy(interviewTimelineTags.offsetMs);
  }

  async getTimelineTag(tenantId: string, id: string): Promise<InterviewTimelineTag | undefined> {
    const [tag] = await db.select().from(interviewTimelineTags)
      .where(and(eq(interviewTimelineTags.id, id), eq(interviewTimelineTags.tenantId, tenantId)));
    return tag || undefined;
  }

  async getTimelineTagsByType(tenantId: string, sessionId: string, tagType: string): Promise<InterviewTimelineTag[]> {
    return await db.select().from(interviewTimelineTags)
      .where(and(
        eq(interviewTimelineTags.tenantId, tenantId),
        eq(interviewTimelineTags.sessionId, sessionId),
        eq(interviewTimelineTags.tagType, tagType)
      ))
      .orderBy(interviewTimelineTags.offsetMs);
  }

  async createTimelineTag(tenantId: string, tag: InsertInterviewTimelineTag): Promise<InterviewTimelineTag> {
    const [newTag] = await db.insert(interviewTimelineTags).values({ ...tag, tenantId }).returning();
    return newTag;
  }

  async updateTimelineTag(tenantId: string, id: string, updates: Partial<InsertInterviewTimelineTag>): Promise<InterviewTimelineTag | undefined> {
    const [tag] = await db.update(interviewTimelineTags)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(interviewTimelineTags.id, id), eq(interviewTimelineTags.tenantId, tenantId)))
      .returning();
    return tag || undefined;
  }

  async deleteTimelineTag(tenantId: string, id: string): Promise<void> {
    await db.delete(interviewTimelineTags)
      .where(and(eq(interviewTimelineTags.id, id), eq(interviewTimelineTags.tenantId, tenantId)));
  }

  // Transcript Jobs Implementation
  async getTranscriptJobs(tenantId: string, sessionId: string): Promise<TranscriptJob[]> {
    return await db.select().from(transcriptJobs)
      .where(and(eq(transcriptJobs.tenantId, tenantId), eq(transcriptJobs.sessionId, sessionId)))
      .orderBy(desc(transcriptJobs.createdAt));
  }

  async getTranscriptJob(tenantId: string, id: string): Promise<TranscriptJob | undefined> {
    const [job] = await db.select().from(transcriptJobs)
      .where(and(eq(transcriptJobs.id, id), eq(transcriptJobs.tenantId, tenantId)));
    return job || undefined;
  }

  async createTranscriptJob(tenantId: string, job: InsertTranscriptJob): Promise<TranscriptJob> {
    const [newJob] = await db.insert(transcriptJobs).values({ ...job, tenantId }).returning();
    return newJob;
  }

  async updateTranscriptJob(tenantId: string, id: string, updates: Partial<InsertTranscriptJob>): Promise<TranscriptJob | undefined> {
    const [job] = await db.update(transcriptJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(transcriptJobs.id, id), eq(transcriptJobs.tenantId, tenantId)))
      .returning();
    return job || undefined;
  }

  // Recording Sources Implementation
  async getRecordingSources(tenantId: string, sessionId: string): Promise<RecordingSource[]> {
    return await db.select().from(recordingSources)
      .where(and(eq(recordingSources.tenantId, tenantId), eq(recordingSources.sessionId, sessionId)))
      .orderBy(desc(recordingSources.createdAt));
  }

  async getRecordingSource(tenantId: string, id: string): Promise<RecordingSource | undefined> {
    const [source] = await db.select().from(recordingSources)
      .where(and(eq(recordingSources.id, id), eq(recordingSources.tenantId, tenantId)));
    return source || undefined;
  }

  async createRecordingSource(tenantId: string, source: InsertRecordingSource): Promise<RecordingSource> {
    const [newSource] = await db.insert(recordingSources).values({ ...source, tenantId }).returning();
    return newSource;
  }

  async updateRecordingSource(tenantId: string, id: string, updates: Partial<InsertRecordingSource>): Promise<RecordingSource | undefined> {
    const [source] = await db.update(recordingSources)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(recordingSources.id, id), eq(recordingSources.tenantId, tenantId)))
      .returning();
    return source || undefined;
  }

  // LeMUR Analysis Results Implementation
  async getLemurAnalysisResults(tenantId: string, sessionId: string): Promise<LemurAnalysisResult[]> {
    return await db.select().from(lemurAnalysisResults)
      .where(and(eq(lemurAnalysisResults.tenantId, tenantId), eq(lemurAnalysisResults.sessionId, sessionId)))
      .orderBy(desc(lemurAnalysisResults.createdAt));
  }

  async createLemurAnalysisResult(tenantId: string, result: InsertLemurAnalysisResult): Promise<LemurAnalysisResult> {
    const [newResult] = await db.insert(lemurAnalysisResults).values({ ...result, tenantId }).returning();
    return newResult;
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
        or(
          eq(onboardingDocumentRequests.status, 'pending'),
          eq(onboardingDocumentRequests.status, 'requested')
        )
      ))
      .orderBy(desc(onboardingDocumentRequests.createdAt));
  }

  async getOverdueDocumentRequests(tenantId: string): Promise<OnboardingDocumentRequest[]> {
    const now = new Date();
    return await db.select().from(onboardingDocumentRequests)
      .where(and(
        eq(onboardingDocumentRequests.tenantId, tenantId),
        or(
          eq(onboardingDocumentRequests.status, 'pending'),
          eq(onboardingDocumentRequests.status, 'requested')
        ),
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

  // Integrity Document Requirements Implementation
  async getIntegrityDocumentRequirements(tenantId: string, candidateId?: string): Promise<IntegrityDocumentRequirement[]> {
    if (candidateId) {
      return await db.select().from(integrityDocumentRequirements)
        .where(and(eq(integrityDocumentRequirements.tenantId, tenantId), eq(integrityDocumentRequirements.candidateId, candidateId)))
        .orderBy(desc(integrityDocumentRequirements.createdAt));
    }
    return await db.select().from(integrityDocumentRequirements)
      .where(eq(integrityDocumentRequirements.tenantId, tenantId))
      .orderBy(desc(integrityDocumentRequirements.createdAt));
  }

  async getIntegrityDocumentRequirementsByCheckId(tenantId: string, checkId: string): Promise<IntegrityDocumentRequirement[]> {
    return await db.select().from(integrityDocumentRequirements)
      .where(and(
        eq(integrityDocumentRequirements.tenantId, tenantId),
        eq(integrityDocumentRequirements.integrityCheckId, checkId)
      ))
      .orderBy(desc(integrityDocumentRequirements.createdAt));
  }

  async getIntegrityDocumentRequirement(tenantId: string, id: string): Promise<IntegrityDocumentRequirement | undefined> {
    const [req] = await db.select().from(integrityDocumentRequirements)
      .where(and(eq(integrityDocumentRequirements.id, id), eq(integrityDocumentRequirements.tenantId, tenantId)));
    return req || undefined;
  }

  async getIntegrityDocumentRequirementByRefCode(tenantId: string, referenceCode: string): Promise<IntegrityDocumentRequirement | undefined> {
    const [req] = await db.select().from(integrityDocumentRequirements)
      .where(and(
        eq(integrityDocumentRequirements.tenantId, tenantId),
        eq(integrityDocumentRequirements.referenceCode, referenceCode)
      ));
    return req || undefined;
  }

  async getPendingIntegrityDocumentRequirements(tenantId: string): Promise<IntegrityDocumentRequirement[]> {
    return await db.select().from(integrityDocumentRequirements)
      .where(and(
        eq(integrityDocumentRequirements.tenantId, tenantId),
        eq(integrityDocumentRequirements.status, 'pending')
      ))
      .orderBy(desc(integrityDocumentRequirements.createdAt));
  }

  async getIntegrityDocRequirementsNeedingReminders(tenantId: string, now: Date): Promise<IntegrityDocumentRequirement[]> {
    return await db.select().from(integrityDocumentRequirements)
      .where(and(
        eq(integrityDocumentRequirements.tenantId, tenantId),
        eq(integrityDocumentRequirements.reminderEnabled, 1),
        eq(integrityDocumentRequirements.status, 'pending'),
        lte(integrityDocumentRequirements.nextReminderAt, now)
      ))
      .orderBy(integrityDocumentRequirements.nextReminderAt);
  }

  async createIntegrityDocumentRequirement(tenantId: string, requirement: InsertIntegrityDocumentRequirement): Promise<IntegrityDocumentRequirement> {
    const [newReq] = await db.insert(integrityDocumentRequirements).values({ ...requirement, tenantId }).returning();
    return newReq;
  }

  async updateIntegrityDocumentRequirement(tenantId: string, id: string, updates: UpdateIntegrityDocumentRequirement): Promise<IntegrityDocumentRequirement | undefined> {
    const [req] = await db.update(integrityDocumentRequirements)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(integrityDocumentRequirements.id, id), eq(integrityDocumentRequirements.tenantId, tenantId)))
      .returning();
    return req || undefined;
  }

  async deleteIntegrityDocumentRequirement(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(integrityDocumentRequirements)
      .where(and(eq(integrityDocumentRequirements.id, id), eq(integrityDocumentRequirements.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Candidate Documents Implementation
  async getCandidateDocuments(tenantId: string, candidateId?: string): Promise<CandidateDocument[]> {
    if (candidateId) {
      return await db.select().from(candidateDocuments)
        .where(and(eq(candidateDocuments.tenantId, tenantId), eq(candidateDocuments.candidateId, candidateId)))
        .orderBy(desc(candidateDocuments.createdAt));
    }
    return await db.select().from(candidateDocuments)
      .where(eq(candidateDocuments.tenantId, tenantId))
      .orderBy(desc(candidateDocuments.createdAt));
  }

  async getCandidateDocumentsByRequirementId(tenantId: string, requirementId: string): Promise<CandidateDocument[]> {
    return await db.select().from(candidateDocuments)
      .where(and(
        eq(candidateDocuments.tenantId, tenantId),
        eq(candidateDocuments.requirementId, requirementId)
      ))
      .orderBy(desc(candidateDocuments.createdAt));
  }

  async getCandidateDocument(tenantId: string, id: string): Promise<CandidateDocument | undefined> {
    const [doc] = await db.select().from(candidateDocuments)
      .where(and(eq(candidateDocuments.id, id), eq(candidateDocuments.tenantId, tenantId)));
    return doc || undefined;
  }

  async getCandidateDocumentByRefCode(tenantId: string, referenceCode: string): Promise<CandidateDocument | undefined> {
    const [doc] = await db.select().from(candidateDocuments)
      .where(and(
        eq(candidateDocuments.tenantId, tenantId),
        eq(candidateDocuments.referenceCode, referenceCode)
      ));
    return doc || undefined;
  }

  async createCandidateDocument(tenantId: string, document: InsertCandidateDocument): Promise<CandidateDocument> {
    const [newDoc] = await db.insert(candidateDocuments).values({ ...document, tenantId }).returning();
    return newDoc;
  }

  async updateCandidateDocument(tenantId: string, id: string, updates: UpdateCandidateDocument): Promise<CandidateDocument | undefined> {
    const [doc] = await db.update(candidateDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(candidateDocuments.id, id), eq(candidateDocuments.tenantId, tenantId)))
      .returning();
    return doc || undefined;
  }

  async deleteCandidateDocument(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(candidateDocuments)
      .where(and(eq(candidateDocuments.id, id), eq(candidateDocuments.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // WhatsApp Document Sessions Implementation
  async getWhatsappDocumentSession(tenantId: string, id: string): Promise<WhatsappDocumentSession | undefined> {
    const [session] = await db.select().from(whatsappDocumentSessions)
      .where(and(eq(whatsappDocumentSessions.id, id), eq(whatsappDocumentSessions.tenantId, tenantId)));
    return session || undefined;
  }

  async getWhatsappDocumentSessionByPhone(tenantId: string, phoneNumber: string): Promise<WhatsappDocumentSession | undefined> {
    const [session] = await db.select().from(whatsappDocumentSessions)
      .where(and(
        eq(whatsappDocumentSessions.tenantId, tenantId),
        eq(whatsappDocumentSessions.phoneNumber, phoneNumber)
      ));
    return session || undefined;
  }

  async getWhatsappDocumentSessionByCandidate(tenantId: string, candidateId: string): Promise<WhatsappDocumentSession | undefined> {
    const [session] = await db.select().from(whatsappDocumentSessions)
      .where(and(
        eq(whatsappDocumentSessions.tenantId, tenantId),
        eq(whatsappDocumentSessions.candidateId, candidateId)
      ));
    return session || undefined;
  }

  async createWhatsappDocumentSession(tenantId: string, session: InsertWhatsappDocumentSession): Promise<WhatsappDocumentSession> {
    const [newSession] = await db.insert(whatsappDocumentSessions).values({ ...session, tenantId }).returning();
    return newSession;
  }

  async updateWhatsappDocumentSession(tenantId: string, id: string, updates: UpdateWhatsappDocumentSession): Promise<WhatsappDocumentSession | undefined> {
    const [session] = await db.update(whatsappDocumentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(whatsappDocumentSessions.id, id), eq(whatsappDocumentSessions.tenantId, tenantId)))
      .returning();
    return session || undefined;
  }

  async deleteWhatsappDocumentSession(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(whatsappDocumentSessions)
      .where(and(eq(whatsappDocumentSessions.id, id), eq(whatsappDocumentSessions.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Data Sources Implementation
  async getAllDataSources(tenantId: string): Promise<DataSource[]> {
    return await db.select().from(dataSources)
      .where(eq(dataSources.tenantId, tenantId))
      .orderBy(desc(dataSources.createdAt));
  }

  async getDataSource(tenantId: string, id: string): Promise<DataSource | undefined> {
    const [source] = await db.select().from(dataSources)
      .where(and(eq(dataSources.id, id), eq(dataSources.tenantId, tenantId)));
    return source || undefined;
  }

  async getDataSourcesByType(tenantId: string, type: string): Promise<DataSource[]> {
    return await db.select().from(dataSources)
      .where(and(eq(dataSources.tenantId, tenantId), eq(dataSources.type, type)))
      .orderBy(dataSources.name);
  }

  async getActiveDataSources(tenantId: string): Promise<DataSource[]> {
    return await db.select().from(dataSources)
      .where(and(eq(dataSources.tenantId, tenantId), eq(dataSources.status, "active")))
      .orderBy(dataSources.name);
  }

  async createDataSource(tenantId: string, source: InsertDataSource): Promise<DataSource> {
    const [newSource] = await db.insert(dataSources).values({ ...source, tenantId }).returning();
    return newSource;
  }

  async updateDataSource(tenantId: string, id: string, updates: UpdateDataSource): Promise<DataSource | undefined> {
    const [source] = await db.update(dataSources)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(dataSources.id, id), eq(dataSources.tenantId, tenantId)))
      .returning();
    return source || undefined;
  }

  async deleteDataSource(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(dataSources)
      .where(and(eq(dataSources.id, id), eq(dataSources.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Data Source Sync History Implementation
  async getDataSourceSyncHistory(tenantId: string, dataSourceId: string): Promise<DataSourceSyncHistory[]> {
    return await db.select().from(dataSourceSyncHistory)
      .where(and(
        eq(dataSourceSyncHistory.tenantId, tenantId),
        eq(dataSourceSyncHistory.dataSourceId, dataSourceId)
      ))
      .orderBy(desc(dataSourceSyncHistory.startedAt));
  }

  async createDataSourceSyncHistory(tenantId: string, history: InsertDataSourceSyncHistory): Promise<DataSourceSyncHistory> {
    const [newHistory] = await db.insert(dataSourceSyncHistory).values({ ...history, tenantId }).returning();
    return newHistory;
  }

  async updateDataSourceSyncHistory(id: string, updates: Partial<InsertDataSourceSyncHistory>): Promise<DataSourceSyncHistory | undefined> {
    const [history] = await db.update(dataSourceSyncHistory)
      .set(updates)
      .where(eq(dataSourceSyncHistory.id, id))
      .returning();
    return history || undefined;
  }

  // Data Source Fields Implementation
  async getDataSourceFields(tenantId: string, dataSourceId: string): Promise<DataSourceField[]> {
    return await db.select().from(dataSourceFields)
      .where(and(
        eq(dataSourceFields.tenantId, tenantId),
        eq(dataSourceFields.dataSourceId, dataSourceId)
      ))
      .orderBy(dataSourceFields.fieldName);
  }

  async createDataSourceField(tenantId: string, field: InsertDataSourceField): Promise<DataSourceField> {
    const [newField] = await db.insert(dataSourceFields).values({ ...field, tenantId }).returning();
    return newField;
  }

  async deleteDataSourceFields(tenantId: string, dataSourceId: string): Promise<boolean> {
    const result = await db.delete(dataSourceFields)
      .where(and(
        eq(dataSourceFields.tenantId, tenantId),
        eq(dataSourceFields.dataSourceId, dataSourceId)
      ));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // KPI Templates Implementation
  async getAllKpiTemplates(tenantId: string): Promise<KpiTemplate[]> {
    return await db.select().from(kpiTemplates)
      .where(eq(kpiTemplates.tenantId, tenantId))
      .orderBy(kpiTemplates.category, kpiTemplates.name);
  }

  async getKpiTemplate(tenantId: string, id: string): Promise<KpiTemplate | undefined> {
    const [template] = await db.select().from(kpiTemplates)
      .where(and(eq(kpiTemplates.id, id), eq(kpiTemplates.tenantId, tenantId)));
    return template || undefined;
  }

  async getKpiTemplatesByCategory(tenantId: string, category: string): Promise<KpiTemplate[]> {
    return await db.select().from(kpiTemplates)
      .where(and(eq(kpiTemplates.tenantId, tenantId), eq(kpiTemplates.category, category)))
      .orderBy(kpiTemplates.name);
  }

  async createKpiTemplate(tenantId: string, template: InsertKpiTemplate): Promise<KpiTemplate> {
    const [newTemplate] = await db.insert(kpiTemplates).values({ ...template, tenantId }).returning();
    return newTemplate;
  }

  async updateKpiTemplate(tenantId: string, id: string, updates: UpdateKpiTemplate): Promise<KpiTemplate | undefined> {
    const [template] = await db.update(kpiTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(kpiTemplates.id, id), eq(kpiTemplates.tenantId, tenantId)))
      .returning();
    return template || undefined;
  }

  async deleteKpiTemplate(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(kpiTemplates)
      .where(and(eq(kpiTemplates.id, id), eq(kpiTemplates.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async updateKpiTemplateCurrentValue(tenantId: string, id: string, currentValue: number): Promise<KpiTemplate | undefined> {
    const [template] = await db.update(kpiTemplates)
      .set({ currentValue, lastMeasuredAt: new Date(), updatedAt: new Date() })
      .where(and(eq(kpiTemplates.id, id), eq(kpiTemplates.tenantId, tenantId)))
      .returning();
    return template || undefined;
  }

  async getDataSourcesNeedingSync(): Promise<DataSource[]> {
    const now = new Date();
    const sources = await db.select().from(dataSources)
      .where(and(
        eq(dataSources.status, "active"),
        sql`${dataSources.refreshSchedule} IS NOT NULL`
      ));
    
    return sources.filter(source => {
      if (!source.refreshSchedule || !source.lastSyncAt || source.refreshSchedule === 'manual') {
        return source.refreshSchedule !== 'manual' && !source.lastSyncAt;
      }
      
      const lastSync = new Date(source.lastSyncAt);
      const frequencyMinutes = this.refreshScheduleToMinutes(source.refreshSchedule);
      const nextSyncTime = new Date(lastSync.getTime() + frequencyMinutes * 60 * 1000);
      
      return now >= nextSyncTime;
    });
  }

  private refreshScheduleToMinutes(schedule: string): number {
    switch (schedule) {
      case "realtime": return 1;
      case "hourly": return 60;
      case "daily": return 60 * 24;
      case "weekly": return 60 * 24 * 7;
      case "monthly": return 60 * 24 * 30;
      default: return 60 * 24;
    }
  }

  async getKpiTemplatesByDataSource(tenantId: string, dataSourceId: string): Promise<KpiTemplate[]> {
    return await db.select().from(kpiTemplates)
      .where(and(
        eq(kpiTemplates.tenantId, tenantId),
        eq(kpiTemplates.dataSourceId, dataSourceId)
      ))
      .orderBy(kpiTemplates.name);
  }

  // Review Cycles Implementation
  async getAllReviewCycles(tenantId: string): Promise<ReviewCycle[]> {
    return await db.select().from(reviewCycles)
      .where(eq(reviewCycles.tenantId, tenantId))
      .orderBy(desc(reviewCycles.startDate));
  }

  async getReviewCycle(tenantId: string, id: string): Promise<ReviewCycle | undefined> {
    const [cycle] = await db.select().from(reviewCycles)
      .where(and(eq(reviewCycles.id, id), eq(reviewCycles.tenantId, tenantId)));
    return cycle || undefined;
  }

  async getActiveReviewCycles(tenantId: string): Promise<ReviewCycle[]> {
    return await db.select().from(reviewCycles)
      .where(and(
        eq(reviewCycles.tenantId, tenantId),
        sql`${reviewCycles.status} IN ('active', 'self_assessment', 'manager_review')`
      ))
      .orderBy(desc(reviewCycles.startDate));
  }

  async createReviewCycle(tenantId: string, cycle: InsertReviewCycle): Promise<ReviewCycle> {
    const [newCycle] = await db.insert(reviewCycles).values({ ...cycle, tenantId }).returning();
    return newCycle;
  }

  async updateReviewCycle(tenantId: string, id: string, updates: UpdateReviewCycle): Promise<ReviewCycle | undefined> {
    const [cycle] = await db.update(reviewCycles)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(reviewCycles.id, id), eq(reviewCycles.tenantId, tenantId)))
      .returning();
    return cycle || undefined;
  }

  async deleteReviewCycle(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(reviewCycles)
      .where(and(eq(reviewCycles.id, id), eq(reviewCycles.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // KPI Assignments Implementation
  async getKpiAssignments(tenantId: string, reviewCycleId?: string): Promise<KpiAssignment[]> {
    if (reviewCycleId) {
      return await db.select().from(kpiAssignments)
        .where(and(eq(kpiAssignments.tenantId, tenantId), eq(kpiAssignments.reviewCycleId, reviewCycleId)))
        .orderBy(kpiAssignments.createdAt);
    }
    return await db.select().from(kpiAssignments)
      .where(eq(kpiAssignments.tenantId, tenantId))
      .orderBy(kpiAssignments.createdAt);
  }

  async getKpiAssignment(tenantId: string, id: string): Promise<KpiAssignment | undefined> {
    const [assignment] = await db.select().from(kpiAssignments)
      .where(and(eq(kpiAssignments.id, id), eq(kpiAssignments.tenantId, tenantId)));
    return assignment || undefined;
  }

  async getKpiAssignmentsByEmployee(tenantId: string, employeeId: string, reviewCycleId?: string): Promise<KpiAssignment[]> {
    if (reviewCycleId) {
      return await db.select().from(kpiAssignments)
        .where(and(
          eq(kpiAssignments.tenantId, tenantId),
          eq(kpiAssignments.employeeId, employeeId),
          eq(kpiAssignments.reviewCycleId, reviewCycleId)
        ))
        .orderBy(kpiAssignments.createdAt);
    }
    return await db.select().from(kpiAssignments)
      .where(and(eq(kpiAssignments.tenantId, tenantId), eq(kpiAssignments.employeeId, employeeId)))
      .orderBy(kpiAssignments.createdAt);
  }

  async getKpiAssignmentsByManager(tenantId: string, managerId: string, reviewCycleId?: string): Promise<KpiAssignment[]> {
    if (reviewCycleId) {
      return await db.select().from(kpiAssignments)
        .where(and(
          eq(kpiAssignments.tenantId, tenantId),
          eq(kpiAssignments.managerId, managerId),
          eq(kpiAssignments.reviewCycleId, reviewCycleId)
        ))
        .orderBy(kpiAssignments.createdAt);
    }
    return await db.select().from(kpiAssignments)
      .where(and(eq(kpiAssignments.tenantId, tenantId), eq(kpiAssignments.managerId, managerId)))
      .orderBy(kpiAssignments.createdAt);
  }

  async createKpiAssignment(tenantId: string, assignment: InsertKpiAssignment): Promise<KpiAssignment> {
    const [newAssignment] = await db.insert(kpiAssignments).values({ ...assignment, tenantId }).returning();
    return newAssignment;
  }

  async createKpiAssignmentsBatch(tenantId: string, assignments: InsertKpiAssignment[]): Promise<KpiAssignment[]> {
    const assignmentsWithTenant = assignments.map(a => ({ ...a, tenantId }));
    return await db.insert(kpiAssignments).values(assignmentsWithTenant).returning();
  }

  async updateKpiAssignment(tenantId: string, id: string, updates: UpdateKpiAssignment): Promise<KpiAssignment | undefined> {
    const [assignment] = await db.update(kpiAssignments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(kpiAssignments.id, id), eq(kpiAssignments.tenantId, tenantId)))
      .returning();
    return assignment || undefined;
  }

  async deleteKpiAssignment(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(kpiAssignments)
      .where(and(eq(kpiAssignments.id, id), eq(kpiAssignments.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // KPI Scores Implementation
  async getKpiScores(tenantId: string, assignmentId: string): Promise<KpiScore[]> {
    return await db.select().from(kpiScores)
      .where(and(eq(kpiScores.tenantId, tenantId), eq(kpiScores.assignmentId, assignmentId)))
      .orderBy(kpiScores.createdAt);
  }

  async getKpiScore(tenantId: string, id: string): Promise<KpiScore | undefined> {
    const [score] = await db.select().from(kpiScores)
      .where(and(eq(kpiScores.id, id), eq(kpiScores.tenantId, tenantId)));
    return score || undefined;
  }

  async getKpiScoresByScorer(tenantId: string, scorerId: string): Promise<KpiScore[]> {
    return await db.select().from(kpiScores)
      .where(and(eq(kpiScores.tenantId, tenantId), eq(kpiScores.scorerId, scorerId)))
      .orderBy(desc(kpiScores.createdAt));
  }

  async createKpiScore(tenantId: string, score: InsertKpiScore): Promise<KpiScore> {
    const [newScore] = await db.insert(kpiScores).values({ ...score, tenantId }).returning();
    return newScore;
  }

  async updateKpiScore(tenantId: string, id: string, updates: UpdateKpiScore): Promise<KpiScore | undefined> {
    const [score] = await db.update(kpiScores)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(kpiScores.id, id), eq(kpiScores.tenantId, tenantId)))
      .returning();
    return score || undefined;
  }

  async deleteKpiScore(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(kpiScores)
      .where(and(eq(kpiScores.id, id), eq(kpiScores.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // 360 Feedback Requests Implementation
  async getFeedback360Requests(tenantId: string, reviewCycleId?: string): Promise<Feedback360Request[]> {
    if (reviewCycleId) {
      return await db.select().from(feedback360Requests)
        .where(and(eq(feedback360Requests.tenantId, tenantId), eq(feedback360Requests.reviewCycleId, reviewCycleId)))
        .orderBy(desc(feedback360Requests.createdAt));
    }
    return await db.select().from(feedback360Requests)
      .where(eq(feedback360Requests.tenantId, tenantId))
      .orderBy(desc(feedback360Requests.createdAt));
  }

  async getFeedback360Request(tenantId: string, id: string): Promise<Feedback360Request | undefined> {
    const [request] = await db.select().from(feedback360Requests)
      .where(and(eq(feedback360Requests.id, id), eq(feedback360Requests.tenantId, tenantId)));
    return request || undefined;
  }

  async getFeedback360RequestByToken(token: string): Promise<Feedback360Request | undefined> {
    const [request] = await db.select().from(feedback360Requests)
      .where(eq(feedback360Requests.token, token));
    return request || undefined;
  }

  async getFeedback360RequestsBySubject(tenantId: string, subjectId: string): Promise<Feedback360Request[]> {
    return await db.select().from(feedback360Requests)
      .where(and(eq(feedback360Requests.tenantId, tenantId), eq(feedback360Requests.subjectId, subjectId)))
      .orderBy(desc(feedback360Requests.createdAt));
  }

  async getFeedback360RequestsByReviewer(tenantId: string, reviewerId: string): Promise<Feedback360Request[]> {
    return await db.select().from(feedback360Requests)
      .where(and(eq(feedback360Requests.tenantId, tenantId), eq(feedback360Requests.reviewerId, reviewerId)))
      .orderBy(desc(feedback360Requests.createdAt));
  }

  async createFeedback360Request(tenantId: string, request: InsertFeedback360Request): Promise<Feedback360Request> {
    const [newRequest] = await db.insert(feedback360Requests).values({ ...request, tenantId }).returning();
    return newRequest;
  }

  async updateFeedback360Request(tenantId: string, id: string, updates: Partial<InsertFeedback360Request>): Promise<Feedback360Request | undefined> {
    const [request] = await db.update(feedback360Requests)
      .set(updates)
      .where(and(eq(feedback360Requests.id, id), eq(feedback360Requests.tenantId, tenantId)))
      .returning();
    return request || undefined;
  }

  // 360 Feedback Responses Implementation
  async getFeedback360Responses(tenantId: string, requestId: string): Promise<Feedback360Response[]> {
    return await db.select().from(feedback360Responses)
      .where(and(eq(feedback360Responses.tenantId, tenantId), eq(feedback360Responses.requestId, requestId)))
      .orderBy(desc(feedback360Responses.createdAt));
  }

  async getFeedback360Response(tenantId: string, id: string): Promise<Feedback360Response | undefined> {
    const [response] = await db.select().from(feedback360Responses)
      .where(and(eq(feedback360Responses.id, id), eq(feedback360Responses.tenantId, tenantId)));
    return response || undefined;
  }

  async createFeedback360Response(tenantId: string, response: InsertFeedback360Response): Promise<Feedback360Response> {
    const [newResponse] = await db.insert(feedback360Responses).values({ ...response, tenantId }).returning();
    return newResponse;
  }

  // Review Submissions Implementation
  async getReviewSubmissions(tenantId: string, reviewCycleId?: string): Promise<ReviewSubmission[]> {
    if (reviewCycleId) {
      return await db.select().from(reviewSubmissions)
        .where(and(eq(reviewSubmissions.tenantId, tenantId), eq(reviewSubmissions.reviewCycleId, reviewCycleId)))
        .orderBy(desc(reviewSubmissions.createdAt));
    }
    return await db.select().from(reviewSubmissions)
      .where(eq(reviewSubmissions.tenantId, tenantId))
      .orderBy(desc(reviewSubmissions.createdAt));
  }

  async getReviewSubmission(tenantId: string, id: string): Promise<ReviewSubmission | undefined> {
    const [submission] = await db.select().from(reviewSubmissions)
      .where(and(eq(reviewSubmissions.id, id), eq(reviewSubmissions.tenantId, tenantId)));
    return submission || undefined;
  }

  async getReviewSubmissionByEmployee(tenantId: string, employeeId: string, reviewCycleId: string): Promise<ReviewSubmission | undefined> {
    const [submission] = await db.select().from(reviewSubmissions)
      .where(and(
        eq(reviewSubmissions.tenantId, tenantId),
        eq(reviewSubmissions.employeeId, employeeId),
        eq(reviewSubmissions.reviewCycleId, reviewCycleId)
      ));
    return submission || undefined;
  }

  async getReviewSubmissionsByManager(tenantId: string, managerId: string, reviewCycleId?: string): Promise<ReviewSubmission[]> {
    if (reviewCycleId) {
      return await db.select().from(reviewSubmissions)
        .where(and(
          eq(reviewSubmissions.tenantId, tenantId),
          eq(reviewSubmissions.managerId, managerId),
          eq(reviewSubmissions.reviewCycleId, reviewCycleId)
        ))
        .orderBy(desc(reviewSubmissions.createdAt));
    }
    return await db.select().from(reviewSubmissions)
      .where(and(eq(reviewSubmissions.tenantId, tenantId), eq(reviewSubmissions.managerId, managerId)))
      .orderBy(desc(reviewSubmissions.createdAt));
  }

  async getPendingReviewSubmissions(tenantId: string): Promise<ReviewSubmission[]> {
    return await db.select().from(reviewSubmissions)
      .where(and(
        eq(reviewSubmissions.tenantId, tenantId),
        sql`${reviewSubmissions.selfAssessmentStatus} = 'pending' OR ${reviewSubmissions.managerReviewStatus} = 'pending'`
      ))
      .orderBy(desc(reviewSubmissions.createdAt));
  }

  async createReviewSubmission(tenantId: string, submission: InsertReviewSubmission): Promise<ReviewSubmission> {
    const [newSubmission] = await db.insert(reviewSubmissions).values({ ...submission, tenantId }).returning();
    return newSubmission;
  }

  async updateReviewSubmission(tenantId: string, id: string, updates: UpdateReviewSubmission): Promise<ReviewSubmission | undefined> {
    const [submission] = await db.update(reviewSubmissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(reviewSubmissions.id, id), eq(reviewSubmissions.tenantId, tenantId)))
      .returning();
    return submission || undefined;
  }

  // ============================================
  // SOCIAL SCREENING IMPLEMENTATION
  // ============================================

  // Social Screening - Consent
  async getAllSocialConsents(tenantId: string): Promise<CandidateSocialConsent[]> {
    return await db.select().from(candidateSocialConsent)
      .where(eq(candidateSocialConsent.tenantId, tenantId))
      .orderBy(desc(candidateSocialConsent.createdAt));
  }

  async getSocialConsent(tenantId: string, id: string): Promise<CandidateSocialConsent | undefined> {
    const [consent] = await db.select().from(candidateSocialConsent)
      .where(and(eq(candidateSocialConsent.id, id), eq(candidateSocialConsent.tenantId, tenantId)));
    return consent || undefined;
  }

  async getSocialConsentByCandidate(tenantId: string, candidateId: string): Promise<CandidateSocialConsent | undefined> {
    const [consent] = await db.select().from(candidateSocialConsent)
      .where(and(
        eq(candidateSocialConsent.tenantId, tenantId),
        eq(candidateSocialConsent.candidateId, candidateId)
      ))
      .orderBy(desc(candidateSocialConsent.createdAt));
    return consent || undefined;
  }

  async getSocialConsentByToken(token: string): Promise<CandidateSocialConsent | undefined> {
    const [consent] = await db.select().from(candidateSocialConsent)
      .where(eq(candidateSocialConsent.consentToken, token));
    return consent || undefined;
  }

  async createSocialConsent(tenantId: string, consent: InsertCandidateSocialConsent): Promise<CandidateSocialConsent> {
    const [newConsent] = await db.insert(candidateSocialConsent).values({ ...consent, tenantId }).returning();
    return newConsent;
  }

  async updateSocialConsent(tenantId: string, id: string, updates: UpdateCandidateSocialConsent): Promise<CandidateSocialConsent | undefined> {
    const [consent] = await db.update(candidateSocialConsent)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(candidateSocialConsent.id, id), eq(candidateSocialConsent.tenantId, tenantId)))
      .returning();
    return consent || undefined;
  }

  // Social Screening - Profiles
  async getSocialProfiles(tenantId: string, candidateId?: string): Promise<CandidateSocialProfile[]> {
    if (candidateId) {
      return await db.select().from(candidateSocialProfiles)
        .where(and(eq(candidateSocialProfiles.tenantId, tenantId), eq(candidateSocialProfiles.candidateId, candidateId)))
        .orderBy(desc(candidateSocialProfiles.createdAt));
    }
    return await db.select().from(candidateSocialProfiles)
      .where(eq(candidateSocialProfiles.tenantId, tenantId))
      .orderBy(desc(candidateSocialProfiles.createdAt));
  }

  async getSocialProfile(tenantId: string, id: string): Promise<CandidateSocialProfile | undefined> {
    const [profile] = await db.select().from(candidateSocialProfiles)
      .where(and(eq(candidateSocialProfiles.id, id), eq(candidateSocialProfiles.tenantId, tenantId)));
    return profile || undefined;
  }

  async getSocialProfilesByCandidate(tenantId: string, candidateId: string): Promise<CandidateSocialProfile[]> {
    return await db.select().from(candidateSocialProfiles)
      .where(and(eq(candidateSocialProfiles.tenantId, tenantId), eq(candidateSocialProfiles.candidateId, candidateId)))
      .orderBy(desc(candidateSocialProfiles.createdAt));
  }

  async createSocialProfile(tenantId: string, profile: InsertCandidateSocialProfile): Promise<CandidateSocialProfile> {
    const [newProfile] = await db.insert(candidateSocialProfiles).values({ ...profile, tenantId }).returning();
    return newProfile;
  }

  async updateSocialProfile(tenantId: string, id: string, updates: UpdateCandidateSocialProfile): Promise<CandidateSocialProfile | undefined> {
    const [profile] = await db.update(candidateSocialProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(candidateSocialProfiles.id, id), eq(candidateSocialProfiles.tenantId, tenantId)))
      .returning();
    return profile || undefined;
  }

  async deleteSocialProfile(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(candidateSocialProfiles)
      .where(and(eq(candidateSocialProfiles.id, id), eq(candidateSocialProfiles.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Social Screening - Findings
  async getSocialScreeningFindings(tenantId: string, candidateId?: string): Promise<SocialScreeningFinding[]> {
    if (candidateId) {
      return await db.select().from(socialScreeningFindings)
        .where(and(eq(socialScreeningFindings.tenantId, tenantId), eq(socialScreeningFindings.candidateId, candidateId)))
        .orderBy(desc(socialScreeningFindings.createdAt));
    }
    return await db.select().from(socialScreeningFindings)
      .where(eq(socialScreeningFindings.tenantId, tenantId))
      .orderBy(desc(socialScreeningFindings.createdAt));
  }

  async getSocialScreeningFinding(tenantId: string, id: string): Promise<SocialScreeningFinding | undefined> {
    const [finding] = await db.select().from(socialScreeningFindings)
      .where(and(eq(socialScreeningFindings.id, id), eq(socialScreeningFindings.tenantId, tenantId)));
    return finding || undefined;
  }

  async getSocialScreeningFindingsByCandidate(tenantId: string, candidateId: string): Promise<SocialScreeningFinding[]> {
    return await db.select().from(socialScreeningFindings)
      .where(and(eq(socialScreeningFindings.tenantId, tenantId), eq(socialScreeningFindings.candidateId, candidateId)))
      .orderBy(desc(socialScreeningFindings.createdAt));
  }

  async getSocialScreeningFindingByIntegrityCheck(tenantId: string, integrityCheckId: string): Promise<SocialScreeningFinding | undefined> {
    const [finding] = await db.select().from(socialScreeningFindings)
      .where(and(
        eq(socialScreeningFindings.tenantId, tenantId),
        eq(socialScreeningFindings.integrityCheckId, integrityCheckId)
      ));
    return finding || undefined;
  }

  async getPendingHumanReviewFindings(tenantId: string): Promise<SocialScreeningFinding[]> {
    return await db.select().from(socialScreeningFindings)
      .where(and(
        eq(socialScreeningFindings.tenantId, tenantId),
        eq(socialScreeningFindings.humanReviewStatus, 'pending')
      ))
      .orderBy(desc(socialScreeningFindings.createdAt));
  }

  async createSocialScreeningFinding(tenantId: string, finding: InsertSocialScreeningFinding): Promise<SocialScreeningFinding> {
    const [newFinding] = await db.insert(socialScreeningFindings).values({ ...finding, tenantId }).returning();
    return newFinding;
  }

  async updateSocialScreeningFinding(tenantId: string, id: string, updates: UpdateSocialScreeningFinding): Promise<SocialScreeningFinding | undefined> {
    const [finding] = await db.update(socialScreeningFindings)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(socialScreeningFindings.id, id), eq(socialScreeningFindings.tenantId, tenantId)))
      .returning();
    return finding || undefined;
  }

  // Social Screening - Posts
  async getSocialScreeningPosts(tenantId: string, findingId: string): Promise<SocialScreeningPost[]> {
    return await db.select().from(socialScreeningPosts)
      .where(and(eq(socialScreeningPosts.tenantId, tenantId), eq(socialScreeningPosts.findingId, findingId)))
      .orderBy(desc(socialScreeningPosts.createdAt));
  }

  async createSocialScreeningPost(tenantId: string, post: InsertSocialScreeningPost): Promise<SocialScreeningPost> {
    const [newPost] = await db.insert(socialScreeningPosts).values({ ...post, tenantId }).returning();
    return newPost;
  }

  async deleteExpiredSocialScreeningPosts(): Promise<number> {
    const result = await db.delete(socialScreeningPosts)
      .where(lte(socialScreeningPosts.expiresAt, new Date()));
    return result.rowCount ?? 0;
  }

  // ==================== ADMIN TENANT MANAGEMENT ====================

  async getAllTenants(): Promise<TenantConfig[]> {
    return await db.select().from(tenantConfig).orderBy(tenantConfig.companyName);
  }

  async getTenantById(id: string): Promise<TenantConfig | undefined> {
    const [tenant] = await db.select().from(tenantConfig).where(eq(tenantConfig.id, id));
    return tenant || undefined;
  }

  async updateTenantApiKeys(tenantId: string, apiKeysConfigured: Record<string, any>): Promise<void> {
    await db.update(tenantConfig)
      .set({ 
        apiKeysConfigured,
        updatedAt: new Date()
      })
      .where(eq(tenantConfig.id, tenantId));
  }

  async getTenantPayments(tenantId: string): Promise<TenantPayment[]> {
    return await db.select().from(tenantPayments)
      .where(eq(tenantPayments.tenantId, tenantId))
      .orderBy(desc(tenantPayments.createdAt));
  }

  async createTenantPayment(payment: InsertTenantPayment): Promise<TenantPayment> {
    const [newPayment] = await db.insert(tenantPayments).values(payment).returning();
    return newPayment;
  }

  async updateTenantSubscription(tenantId: string, updates: Partial<TenantConfig>): Promise<TenantConfig | undefined> {
    const [tenant] = await db.update(tenantConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenantConfig.id, tenantId))
      .returning();
    return tenant || undefined;
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, 1))
      .orderBy(subscriptionPlans.sortOrder);
  }

  // ================================
  // LMS Methods
  // ================================

  async getCourses(tenantId: string) {
    return await db.select().from(courses)
      .where(and(eq(courses.tenantId, tenantId), eq(courses.status, "published")))
      .orderBy(desc(courses.createdAt));
  }

  async getCourse(courseId: string, tenantId: string) {
    const [course] = await db.select().from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.tenantId, tenantId)))
      .limit(1);
    return course;
  }

  async createCourse(data: any) {
    const [course] = await db.insert(courses).values(data).returning();
    return course;
  }

  async updateCourse(courseId: string, tenantId: string, updates: any) {
    const [course] = await db.update(courses)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(courses.id, courseId), eq(courses.tenantId, tenantId)))
      .returning();
    return course;
  }

  async deleteCourse(courseId: string, tenantId: string) {
    await db.delete(courses)
      .where(and(eq(courses.id, courseId), eq(courses.tenantId, tenantId)));
  }

  async getLearnerProgress(userId: string, tenantId: string) {
    return await db.select({
      progress: learnerProgress,
      course: courses,
    })
      .from(learnerProgress)
      .leftJoin(courses, eq(learnerProgress.courseId, courses.id))
      .where(and(eq(learnerProgress.userId, userId), eq(learnerProgress.tenantId, tenantId)))
      .orderBy(desc(learnerProgress.lastAccessedAt));
  }

  async getAllLearnersProgress(tenantId: string) {
    return await db.select({
      progress: learnerProgress,
      course: courses,
      user: users,
    })
      .from(learnerProgress)
      .leftJoin(courses, eq(learnerProgress.courseId, courses.id))
      .leftJoin(users, eq(learnerProgress.userId, users.id))
      .where(eq(learnerProgress.tenantId, tenantId))
      .orderBy(desc(learnerProgress.lastAccessedAt));
  }

  async getAllBadgesEarned(tenantId: string) {
    return await db.select({
      badge: gamificationBadges,
      user: users,
      earnedAt: learnerBadges.earnedAt,
    })
      .from(learnerBadges)
      .leftJoin(gamificationBadges, eq(learnerBadges.badgeId, gamificationBadges.id))
      .leftJoin(users, eq(learnerBadges.userId, users.id))
      .where(eq(learnerBadges.tenantId, tenantId))
      .orderBy(desc(learnerBadges.earnedAt));
  }

  async assignCourseToEmployee(tenantId: string, courseId: string, userId: string) {
    const existing = await this.getCourseProgress(userId, courseId, tenantId);
    if (existing) return existing;
    
    const [progress] = await db.insert(learnerProgress).values({
      userId,
      courseId,
      tenantId,
      status: "not_started",
      progress: 0,
    }).returning();
    return progress;
  }

  async getCourseProgress(userId: string, courseId: string, tenantId: string) {
    const [progress] = await db.select().from(learnerProgress)
      .where(and(
        eq(learnerProgress.userId, userId),
        eq(learnerProgress.courseId, courseId),
        eq(learnerProgress.tenantId, tenantId)
      ))
      .limit(1);
    return progress;
  }

  async updateLearnerProgress(userId: string, courseId: string, tenantId: string, updates: any) {
    const existing = await this.getCourseProgress(userId, courseId, tenantId);
    
    if (existing) {
      const [updated] = await db.update(learnerProgress)
        .set({ ...updates, lastAccessedAt: new Date(), updatedAt: new Date() })
        .where(eq(learnerProgress.id, existing.id))
        .returning();
      
      if (updates.progress === 100 || updates.status === "completed") {
        await this.awardPoints(userId, tenantId, 100, "course_completion");
      }
      
      return updated;
    } else {
      const [created] = await db.insert(learnerProgress).values({
        userId,
        courseId,
        tenantId,
        ...updates,
        startedAt: new Date(),
        lastAccessedAt: new Date(),
      }).returning();
      return created;
    }
  }

  async getCourseAssessments(courseId: string, tenantId: string) {
    return await db.select().from(assessments)
      .where(and(
        eq(assessments.courseId, courseId),
        eq(assessments.tenantId, tenantId)
      ));
  }

  async submitAssessmentAttempt(assessmentId: string, userId: string, tenantId: string, answers: any) {
    const [assessment] = await db.select().from(assessments)
      .where(eq(assessments.id, assessmentId))
      .limit(1);
    
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    const questions = assessment.questions as any[];
    let score = 0;
    let totalPoints = 0;
    
    questions.forEach((q: any) => {
      totalPoints += q.points || 1;
      if (answers[q.id] === q.correctAnswer) {
        score += q.points || 1;
      }
    });
    
    const percentage = Math.round((score / totalPoints) * 100);
    const passed = percentage >= (assessment.passingScore || 70);
    
    const previousAttempts = await db.select().from(assessmentAttempts)
      .where(and(
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.userId, userId)
      ));
    
    const [attempt] = await db.insert(assessmentAttempts).values({
      tenantId,
      assessmentId,
      userId,
      answers,
      score: percentage,
      passed: passed ? 1 : 0,
      attemptNumber: previousAttempts.length + 1,
      completedAt: new Date(),
    }).returning();
    
    if (passed) {
      await this.awardPoints(userId, tenantId, 50, "assessment_completion");
      if (percentage === 100) {
        await this.checkAndAwardBadge(userId, tenantId, "assessment_score", 100);
      }
    }
    
    return { ...attempt, percentage, passed };
  }

  async getAssessmentAttempts(assessmentId: string, userId: string, tenantId: string) {
    return await db.select().from(assessmentAttempts)
      .where(and(
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.userId, userId),
        eq(assessmentAttempts.tenantId, tenantId)
      ))
      .orderBy(desc(assessmentAttempts.createdAt));
  }

  async getLearnerPoints(userId: string, tenantId: string) {
    const [points] = await db.select().from(learnerPoints)
      .where(and(
        eq(learnerPoints.userId, userId),
        eq(learnerPoints.tenantId, tenantId)
      ))
      .limit(1);
    return points;
  }

  async getLearnerBadges(userId: string, tenantId: string) {
    return await db.select({
      badge: gamificationBadges,
      earnedAt: learnerBadges.earnedAt,
    })
      .from(learnerBadges)
      .leftJoin(gamificationBadges, eq(learnerBadges.badgeId, gamificationBadges.id))
      .where(and(
        eq(learnerBadges.userId, userId),
        eq(learnerBadges.tenantId, tenantId)
      ))
      .orderBy(desc(learnerBadges.earnedAt));
  }

  async getLeaderboard(tenantId: string, limit: number = 50) {
    return await db.select({
      userId: learnerPoints.userId,
      userName: users.username,
      points: learnerPoints.points,
      level: learnerPoints.level,
      rank: learnerPoints.rank,
    })
      .from(learnerPoints)
      .leftJoin(users, eq(learnerPoints.userId, users.id))
      .where(eq(learnerPoints.tenantId, tenantId))
      .orderBy(desc(learnerPoints.points))
      .limit(limit);
  }

  async getAllBadges(tenantId: string) {
    return await db.select().from(gamificationBadges)
      .where(eq(gamificationBadges.tenantId, tenantId));
  }

  async getAILecturers(tenantId: string) {
    return await db.select().from(aiLecturers)
      .where(and(
        eq(aiLecturers.tenantId, tenantId),
        eq(aiLecturers.active, 1)
      ));
  }

  async awardPoints(userId: string, tenantId: string, points: number, reason: string) {
    const existing = await this.getLearnerPoints(userId, tenantId);
    
    if (existing) {
      const newPoints = existing.points + points;
      const newLevel = Math.floor(newPoints / 500) + 1;
      
      await db.update(learnerPoints)
        .set({
          points: newPoints,
          level: newLevel,
          updatedAt: new Date(),
        })
        .where(eq(learnerPoints.id, existing.id));
    } else {
      await db.insert(learnerPoints).values({
        userId,
        tenantId,
        points,
        level: 1,
      });
    }
  }

  async checkAndAwardBadge(userId: string, tenantId: string, criteriaType: string, criteriaValue: number) {
    const badges = await this.getAllBadges(tenantId);
    
    for (const badge of badges) {
      const criteria = badge.criteria as any;
      if (criteria.type === criteriaType && criteria.value === criteriaValue) {
        const [existing] = await db.select().from(learnerBadges)
          .where(and(
            eq(learnerBadges.userId, userId),
            eq(learnerBadges.badgeId, badge.id)
          ))
          .limit(1);
        
        if (!existing) {
          await db.insert(learnerBadges).values({
            userId,
            tenantId,
            badgeId: badge.id,
          });
          await this.awardPoints(userId, tenantId, badge.points, "badge_earned");
        }
      }
    }
  }

  // ================================
  // Certificate Methods
  // ================================

  async getCertificateTemplates(tenantId: string) {
    return await db.select().from(certificateTemplates)
      .where(and(eq(certificateTemplates.tenantId, tenantId), eq(certificateTemplates.isActive, 1)))
      .orderBy(desc(certificateTemplates.createdAt));
  }

  async getCertificateTemplate(templateId: string, tenantId: string) {
    const [template] = await db.select().from(certificateTemplates)
      .where(and(eq(certificateTemplates.id, templateId), eq(certificateTemplates.tenantId, tenantId)))
      .limit(1);
    return template;
  }

  async createCertificateTemplate(data: InsertCertificateTemplate) {
    const [template] = await db.insert(certificateTemplates).values(data).returning();
    return template;
  }

  async updateCertificateTemplate(templateId: string, tenantId: string, updates: Partial<CertificateTemplate>) {
    const [template] = await db.update(certificateTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(certificateTemplates.id, templateId), eq(certificateTemplates.tenantId, tenantId)))
      .returning();
    return template;
  }

  async issueCertificate(data: InsertIssuedCertificate) {
    const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const [certificate] = await db.insert(issuedCertificates).values({
      ...data,
      certificateNumber: certNumber,
    }).returning();
    return certificate;
  }

  async getUserCertificates(userId: string, tenantId: string) {
    return await db.select({
      certificate: issuedCertificates,
      template: certificateTemplates,
      course: courses,
    })
      .from(issuedCertificates)
      .leftJoin(certificateTemplates, eq(issuedCertificates.templateId, certificateTemplates.id))
      .leftJoin(courses, eq(issuedCertificates.courseId, courses.id))
      .where(and(eq(issuedCertificates.userId, userId), eq(issuedCertificates.tenantId, tenantId)))
      .orderBy(desc(issuedCertificates.issuedAt));
  }

  async verifyCertificate(certificateNumber: string) {
    const [certificate] = await db.select({
      certificate: issuedCertificates,
      template: certificateTemplates,
      user: users,
      course: courses,
    })
      .from(issuedCertificates)
      .leftJoin(certificateTemplates, eq(issuedCertificates.templateId, certificateTemplates.id))
      .leftJoin(users, eq(issuedCertificates.userId, users.id))
      .leftJoin(courses, eq(issuedCertificates.courseId, courses.id))
      .where(eq(issuedCertificates.certificateNumber, certificateNumber))
      .limit(1);
    return certificate;
  }

  // ================================
  // Admin: Tenant Management
  // ================================

  async getAllTenants() {
    return await db.select().from(tenantConfig).orderBy(desc(tenantConfig.createdAt));
  }

  async getTenant(tenantId: number) {
    const [tenant] = await db.select().from(tenantConfig)
      .where(eq(tenantConfig.id, tenantId))
      .limit(1);
    return tenant;
  }

  async updateTenantModules(tenantId: number, modules: any) {
    const [tenant] = await db.update(tenantConfig)
      .set({ ...modules, updatedAt: new Date() })
      .where(eq(tenantConfig.id, tenantId))
      .returning();
    return tenant;
  }

  // ================================
  // LMS: Courses (Placeholder - needs schema)
  // ================================

  async getAllCourses(tenantId: string) {
    return await db.select().from(courses)
      .where(eq(courses.tenantId, tenantId))
      .orderBy(desc(courses.createdAt));
  }

  async createCourse(tenantId: string, data: any) {
    const [course] = await db.insert(courses).values({
      ...data,
      tenantId,
    }).returning();
    return course;
  }

  async updateCourse(tenantId: number, courseId: number, data: any) {
    // Placeholder - needs courses table implementation
    return data;
  }

  async enrollInCourse(tenantId: number, courseId: number, userId: number) {
    // Placeholder - needs enrollments table implementation
    return { courseId, userId };
  }

  // ================================
  // LMS: Assessments (Placeholder)
  // ================================

  async getAllAssessments(tenantId: number) {
    // Placeholder - needs assessments table implementation
    return [];
  }

  async createAssessment(tenantId: number, data: any) {
    // Placeholder - needs assessments table implementation
    return data;
  }

  async submitAssessment(tenantId: number, assessmentId: number, userId: number, answers: any) {
    // Placeholder - needs assessment_attempts table implementation
    return { passed: true, score: 85 };
  }

  // ================================
  // Gamification (Uses real implementations above)
  // ================================

  async getUserAchievements(tenantId: string, userId: string) {
    return await this.getLearnerBadges(userId, tenantId);
  }

  async awardBadge(tenantId: string, userId: string, badgeId: string) {
    const [badge] = await db.insert(learnerBadges).values({
      tenantId,
      userId,
      badgeId,
      earnedAt: new Date(),
    }).returning();
    return badge;
  }

  // ================================
  // AI Lecturers (Placeholder)
  // ================================

  async getAILecturers(tenantId: number) {
    // Placeholder - needs ai_lecturers table implementation
    return [];
  }

  async createAILecturer(tenantId: number, data: any) {
    // Placeholder - needs ai_lecturers table implementation
    return data;
  }

  async generateLessonVideo(tenantId: number, data: any) {
    // Placeholder - needs lesson_videos table implementation
    return data;
  }

  // ================================
  // LMS: Course Reminders (WhatsApp)
  // ================================

  async createCourseReminder(data: {
    tenantId: string;
    learnerProgressId: string;
    userId: string;
    courseId: string;
    message: string;
    channel?: string;
    sentBy?: string;
    metadata?: any;
  }): Promise<LearnerCourseReminder> {
    const [reminder] = await db.insert(learnerCourseReminders).values({
      ...data,
      channel: data.channel || "whatsapp",
      status: "pending",
    }).returning();
    return reminder;
  }

  async getCourseReminders(tenantId: string, filters?: { userId?: string; courseId?: string; status?: string }) {
    let query = db.select({
      reminder: learnerCourseReminders,
      user: users,
      course: courses,
    })
      .from(learnerCourseReminders)
      .leftJoin(users, eq(learnerCourseReminders.userId, users.id))
      .leftJoin(courses, eq(learnerCourseReminders.courseId, courses.id))
      .where(eq(learnerCourseReminders.tenantId, tenantId));

    return await query.orderBy(desc(learnerCourseReminders.createdAt));
  }

  async updateCourseReminderStatus(reminderId: string, status: string, sentAt?: Date, deliveredAt?: Date) {
    const updates: any = { status };
    if (sentAt) updates.sentAt = sentAt;
    if (deliveredAt) updates.deliveredAt = deliveredAt;
    
    const [reminder] = await db.update(learnerCourseReminders)
      .set(updates)
      .where(eq(learnerCourseReminders.id, reminderId))
      .returning();
    return reminder;
  }

  async getRecentRemindersForUser(userId: string, courseId: string, tenantId: string, hoursAgo: number = 24) {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return await db.select().from(learnerCourseReminders)
      .where(and(
        eq(learnerCourseReminders.userId, userId),
        eq(learnerCourseReminders.courseId, courseId),
        eq(learnerCourseReminders.tenantId, tenantId),
        sql`${learnerCourseReminders.createdAt} >= ${cutoffTime}`
      ))
      .orderBy(desc(learnerCourseReminders.createdAt));
  }

  // ================================
  // Self-Assessment Tokens
  // ================================

  async createSelfAssessmentToken(token: InsertSelfAssessmentToken): Promise<SelfAssessmentToken> {
    const [newToken] = await db.insert(selfAssessmentTokens).values(token).returning();
    return newToken;
  }

  async getSelfAssessmentToken(token: string): Promise<SelfAssessmentToken | undefined> {
    const [result] = await db.select().from(selfAssessmentTokens)
      .where(eq(selfAssessmentTokens.token, token));
    return result || undefined;
  }

  async getSelfAssessmentTokensByEmployee(tenantId: string, employeeId: string): Promise<SelfAssessmentToken[]> {
    return await db.select().from(selfAssessmentTokens)
      .where(and(
        eq(selfAssessmentTokens.tenantId, tenantId),
        eq(selfAssessmentTokens.employeeId, employeeId)
      ))
      .orderBy(desc(selfAssessmentTokens.createdAt));
  }

  async getSelfAssessmentTokensByReviewCycle(tenantId: string, reviewCycleId: string): Promise<SelfAssessmentToken[]> {
    return await db.select().from(selfAssessmentTokens)
      .where(and(
        eq(selfAssessmentTokens.tenantId, tenantId),
        eq(selfAssessmentTokens.reviewCycleId, reviewCycleId)
      ))
      .orderBy(desc(selfAssessmentTokens.createdAt));
  }

  async updateSelfAssessmentToken(id: string, updates: Partial<InsertSelfAssessmentToken>): Promise<SelfAssessmentToken | undefined> {
    const [updated] = await db.update(selfAssessmentTokens)
      .set(updates)
      .where(eq(selfAssessmentTokens.id, id))
      .returning();
    return updated || undefined;
  }

  // ================================
  // CV Templates
  // ================================

  async getCvTemplates(tenantId: string): Promise<CvTemplate[]> {
    return await db.select().from(cvTemplates)
      .where(eq(cvTemplates.tenantId, tenantId))
      .orderBy(desc(cvTemplates.createdAt));
  }

  async getCvTemplateById(tenantId: string, id: string): Promise<CvTemplate | undefined> {
    const [template] = await db.select().from(cvTemplates)
      .where(and(eq(cvTemplates.id, id), eq(cvTemplates.tenantId, tenantId)));
    return template || undefined;
  }

  async getActiveCvTemplate(tenantId: string): Promise<CvTemplate | undefined> {
    const [template] = await db.select().from(cvTemplates)
      .where(and(eq(cvTemplates.tenantId, tenantId), eq(cvTemplates.isActive, 1)));
    return template || undefined;
  }

  async createCvTemplate(tenantId: string, template: InsertCvTemplate): Promise<CvTemplate> {
    const [newTemplate] = await db.insert(cvTemplates).values({
      ...template,
      tenantId,
    }).returning();
    return newTemplate;
  }

  async activateCvTemplate(tenantId: string, id: string): Promise<CvTemplate | undefined> {
    await db.update(cvTemplates)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(eq(cvTemplates.tenantId, tenantId));
    
    const [template] = await db.update(cvTemplates)
      .set({ isActive: 1, updatedAt: new Date() })
      .where(and(eq(cvTemplates.id, id), eq(cvTemplates.tenantId, tenantId)))
      .returning();
    return template || undefined;
  }

  async deleteCvTemplate(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(cvTemplates)
      .where(and(eq(cvTemplates.id, id), eq(cvTemplates.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ================================
  // DOCUMENT TEMPLATES
  // ================================

  async getDocumentTemplates(tenantId: string, templateType?: string): Promise<DocumentTemplate[]> {
    if (templateType) {
      return await db.select().from(documentTemplates)
        .where(and(eq(documentTemplates.tenantId, tenantId), eq(documentTemplates.templateType, templateType)))
        .orderBy(desc(documentTemplates.createdAt));
    }
    return await db.select().from(documentTemplates)
      .where(eq(documentTemplates.tenantId, tenantId))
      .orderBy(desc(documentTemplates.createdAt));
  }

  async getDocumentTemplateById(tenantId: string, id: string): Promise<DocumentTemplate | undefined> {
    const [template] = await db.select().from(documentTemplates)
      .where(and(eq(documentTemplates.id, id), eq(documentTemplates.tenantId, tenantId)));
    return template || undefined;
  }

  async getActiveDocumentTemplate(tenantId: string, templateType: string): Promise<DocumentTemplate | undefined> {
    const [template] = await db.select().from(documentTemplates)
      .where(and(
        eq(documentTemplates.tenantId, tenantId),
        eq(documentTemplates.templateType, templateType),
        eq(documentTemplates.isActive, 1)
      ));
    return template || undefined;
  }

  async createDocumentTemplate(tenantId: string, template: InsertDocumentTemplate): Promise<DocumentTemplate> {
    const [newTemplate] = await db.insert(documentTemplates).values({
      ...template,
      tenantId,
    }).returning();
    return newTemplate;
  }

  async activateDocumentTemplate(tenantId: string, id: string): Promise<DocumentTemplate | undefined> {
    const template = await this.getDocumentTemplateById(tenantId, id);
    if (!template) return undefined;

    await db.update(documentTemplates)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(and(
        eq(documentTemplates.tenantId, tenantId),
        eq(documentTemplates.templateType, template.templateType)
      ));
    
    const [updated] = await db.update(documentTemplates)
      .set({ isActive: 1, updatedAt: new Date() })
      .where(and(eq(documentTemplates.id, id), eq(documentTemplates.tenantId, tenantId)))
      .returning();
    return updated || undefined;
  }

  async deactivateDocumentTemplate(tenantId: string, id: string): Promise<DocumentTemplate | undefined> {
    const [updated] = await db.update(documentTemplates)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(and(eq(documentTemplates.id, id), eq(documentTemplates.tenantId, tenantId)))
      .returning();
    return updated || undefined;
  }

  async deleteDocumentTemplate(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(documentTemplates)
      .where(and(eq(documentTemplates.id, id), eq(documentTemplates.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Weighbridge Slips
  async createWeighbridgeSlip(slip: InsertWeighbridgeSlip): Promise<WeighbridgeSlip> {
    const [created] = await db.insert(weighbridgeSlips).values(slip).returning();
    return created;
  }

  async getWeighbridgeSlips(tenantId: string): Promise<WeighbridgeSlip[]> {
    return db.select()
      .from(weighbridgeSlips)
      .where(eq(weighbridgeSlips.tenantId, tenantId))
      .orderBy(desc(weighbridgeSlips.weighDateTime));
  }

  async getWeighbridgeSlipById(tenantId: string, id: string): Promise<WeighbridgeSlip | undefined> {
    const [slip] = await db.select()
      .from(weighbridgeSlips)
      .where(
        and(
          eq(weighbridgeSlips.id, id),
          eq(weighbridgeSlips.tenantId, tenantId)
        )
      );
    return slip;
  }

  async updateWeighbridgeSlip(
    tenantId: string,
    id: string,
    data: Partial<InsertWeighbridgeSlip>
  ): Promise<WeighbridgeSlip | undefined> {
    const [updated] = await db.update(weighbridgeSlips)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(weighbridgeSlips.id, id),
          eq(weighbridgeSlips.tenantId, tenantId)
        )
      )
      .returning();
    return updated;
  }

  async deleteWeighbridgeSlip(tenantId: string, id: string): Promise<boolean> {
    await db.delete(weighbridgeSlips)
      .where(
        and(
          eq(weighbridgeSlips.id, id),
          eq(weighbridgeSlips.tenantId, tenantId)
        )
      );
    return true;
  }

  // ========== OFFERS MANAGEMENT ==========

  async getAllOffers(tenantId: string): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.tenantId, tenantId)).orderBy(desc(offers.createdAt));
  }

  async getOffer(tenantId: string, id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(and(eq(offers.id, id), eq(offers.tenantId, tenantId)));
    return offer || undefined;
  }

  async getOfferByCandidateId(tenantId: string, candidateId: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(and(eq(offers.candidateId, candidateId), eq(offers.tenantId, tenantId))).orderBy(desc(offers.createdAt));
    return offer || undefined;
  }

  async getOfferByResponseToken(token: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.responseToken, token));
    return offer || undefined;
  }

  async createOffer(tenantId: string, insertOffer: InsertOffer): Promise<Offer> {
    const candidate = await this.getCandidate(tenantId, insertOffer.candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${insertOffer.candidateId} not found in tenant ${tenantId}`);
    }

    const cleanedOffer = Object.fromEntries(
      Object.entries(insertOffer).filter(([_, v]) => v !== null && v !== undefined)
    ) as any;

    const [offer] = await db
      .insert(offers)
      .values({ ...cleanedOffer, tenantId })
      .returning();
    return offer;
  }

  async updateOffer(tenantId: string, id: string, updates: Partial<InsertOffer>): Promise<Offer | undefined> {
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== null && v !== undefined)
    ) as any;

    const [offer] = await db
      .update(offers)
      .set({ ...cleanedUpdates, updatedAt: new Date() })
      .where(and(eq(offers.id, id), eq(offers.tenantId, tenantId)))
      .returning();
    return offer || undefined;
  }

  async deleteOffer(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(offers).where(and(eq(offers.id, id), eq(offers.tenantId, tenantId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
