import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, vector } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  department: text("department").notNull(),
  description: text("description"),
  status: text("status").notNull().default("Active"),
  
  // Compensation
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  payRateUnit: text("pay_rate_unit"), // 'hourly', 'daily', 'monthly', 'annual'
  
  // Location & Schedule
  location: text("location"),
  employmentType: text("employment_type"), // 'full_time', 'part_time', 'contract', 'temporary'
  shiftStructure: text("shift_structure"), // 'day', 'night', 'rotating', 'split'
  
  // Experience & Requirements
  minYearsExperience: integer("min_years_experience"),
  licenseRequirements: text("license_requirements").array(), // ['Code 10', 'Code 14', 'PrDP']
  vehicleTypes: text("vehicle_types").array(), // ['Rigid Truck', 'Articulated Truck', 'Forklift']
  certificationsRequired: text("certifications_required").array(), // ['First Aid', 'Hazmat', 'OHSA']
  
  // Physical & Equipment
  physicalRequirements: text("physical_requirements"), // 'Heavy lifting', 'Standing for long periods'
  equipmentExperience: jsonb("equipment_experience"), // { 'Forklift': 'required', 'Pallet Jack': 'preferred' }
  
  // Other
  unionAffiliation: text("union_affiliation"),
  
  // RAG Embeddings
  requirementsEmbedding: vector("requirements_embedding", { dimensions: 1536 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  source: text("source").notNull().default("Uploaded"),
  status: text("status").notNull().default("New"),
  stage: text("stage").notNull().default("Screening"),
  match: integer("match").notNull().default(0),
  jobId: varchar("job_id").references(() => jobs.id),
  cvUrl: text("cv_url"),
  skills: text("skills").array(),
  education: jsonb("education"),
  experience: jsonb("experience"),
  summary: text("summary"),
  linkedinUrl: text("linkedin_url"),
  location: text("location"),
  yearsOfExperience: integer("years_of_experience"),
  languages: text("languages").array(),
  certifications: text("certifications").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const integrityChecks = pgTable("integrity_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  checkType: text("check_type").notNull(),
  status: text("status").notNull().default("Pending"),
  result: text("result"),
  riskScore: integer("risk_score"),
  findings: jsonb("findings"),
  reminderIntervalHours: integer("reminder_interval_hours").default(24),
  remindersSent: integer("reminders_sent").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  nextReminderAt: timestamp("next_reminder_at"),
  reminderEnabled: integer("reminder_enabled").default(1),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const recruitmentSessions = pgTable("recruitment_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  status: text("status").notNull().default("Running"),
  searchQuery: text("search_query"),
  candidatesFound: integer("candidates_found").notNull().default(0),
  candidatesAdded: integer("candidates_added").notNull().default(0),
  searchCriteria: jsonb("search_criteria"),
  results: jsonb("results"),
  embedding: vector("embedding", { dimensions: 1536 }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  category: text("category").notNull().default("general"),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const onboardingWorkflows = pgTable("onboarding_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  status: text("status").notNull().default("In Progress"),
  currentStep: text("current_step"),
  tasks: jsonb("tasks"),
  documents: jsonb("documents"),
  provisioningData: jsonb("provisioning_data"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tenantConfig = pgTable("tenant_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  subdomain: text("subdomain"),
  primaryColor: text("primary_color").default("#0ea5e9"),
  logoUrl: text("logo_url"),
  industry: text("industry"),
  modulesEnabled: jsonb("modules_enabled").notNull().default(sql`'{}'::jsonb`),
  apiKeysConfigured: jsonb("api_keys_configured").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const interviews = pgTable("interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  type: text("type").notNull(), // 'voice' | 'video'
  provider: text("provider").notNull(), // 'tavus' | 'hume'
  status: text("status").notNull().default("scheduled"), // 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed'
  sessionId: text("session_id"),
  conversationUrl: text("conversation_url"),
  transcriptUrl: text("transcript_url"),
  recordingUrl: text("recording_url"),
  durationMinutes: integer("duration_minutes"),
  metadata: jsonb("metadata"), // Provider-specific data
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const interviewAssessments = pgTable("interview_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interviewId: varchar("interview_id").notNull().references(() => interviews.id),
  summary: text("summary"),
  rubricScores: jsonb("rubric_scores"), // { communication: 4, problemSolving: 5, ... }
  strengths: text("strengths").array(),
  improvements: text("improvements").array(),
  recommendation: text("recommendation"), // 'hire' | 'reject' | 'maybe' | 'advance'
  reviewerType: text("reviewer_type").notNull(), // 'ai' | 'human'
  reviewerId: varchar("reviewer_id"), // User ID if human reviewer
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  requirementsEmbedding: true, // Generated automatically by the system
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrityCheckSchema = createInsertSchema(integrityChecks, {
  completedAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecruitmentSessionSchema = createInsertSchema(recruitmentSessions, {
  completedAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  embedding: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

export type InsertIntegrityCheck = z.infer<typeof insertIntegrityCheckSchema>;
export type IntegrityCheck = typeof integrityChecks.$inferSelect;

export type InsertRecruitmentSession = z.infer<typeof insertRecruitmentSessionSchema>;
export type RecruitmentSession = typeof recruitmentSessions.$inferSelect;

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

export const insertOnboardingWorkflowSchema = createInsertSchema(onboardingWorkflows, {
  completedAt: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingWorkflow = z.infer<typeof insertOnboardingWorkflowSchema>;
export type OnboardingWorkflow = typeof onboardingWorkflows.$inferSelect;

export const insertTenantConfigSchema = createInsertSchema(tenantConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTenantConfig = z.infer<typeof insertTenantConfigSchema>;
export type TenantConfig = typeof tenantConfig.$inferSelect;

export const insertInterviewSchema = createInsertSchema(interviews, {
  candidateId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
  startedAt: z.coerce.date().optional().nullable(),
  endedAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInterviewSchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "failed"]).optional(),
  sessionId: z.string().nullable().optional(),
  conversationUrl: z.string().nullable().optional(),
  transcriptUrl: z.string().nullable().optional(),
  recordingUrl: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  metadata: z.any().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  startedAt: z.coerce.date().nullable().optional(),
  endedAt: z.coerce.date().nullable().optional(),
});

export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type UpdateInterview = z.infer<typeof updateInterviewSchema>;
export type Interview = typeof interviews.$inferSelect;

export const insertInterviewAssessmentSchema = createInsertSchema(interviewAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterviewAssessment = z.infer<typeof insertInterviewAssessmentSchema>;
export type InterviewAssessment = typeof interviewAssessments.$inferSelect;
