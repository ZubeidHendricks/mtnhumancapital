import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, vector, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // 'user', 'tenant_admin', 'super_admin'
  isSuperAdmin: integer("is_super_admin").notNull().default(0), // 1 = can access multiple tenants
}, (table) => ({
  tenantIdIdx: index("users_tenant_id_idx").on(table.tenantId),
}));

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
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
}, (table) => ({
  tenantIdIdx: index("jobs_tenant_id_idx").on(table.tenantId),
}));

export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
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
  photoUrl: text("photo_url"),
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
}, (table) => ({
  tenantIdIdx: index("candidates_tenant_id_idx").on(table.tenantId),
  jobIdIdx: index("candidates_job_id_idx").on(table.jobId),
}));

export const integrityChecks = pgTable("integrity_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
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
}, (table) => ({
  tenantIdIdx: index("integrity_checks_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("integrity_checks_candidate_id_idx").on(table.candidateId),
}));

export const recruitmentSessions = pgTable("recruitment_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
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
}, (table) => ({
  tenantIdIdx: index("recruitment_sessions_tenant_id_idx").on(table.tenantId),
  jobIdIdx: index("recruitment_sessions_job_id_idx").on(table.jobId),
}));

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  category: text("category").notNull().default("general"),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recruitmentMetrics = pgTable("recruitment_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  month: timestamp("month").notNull(),
  placements: integer("placements").notNull().default(0),
  revenue: integer("revenue").notNull().default(0),
  avgRevenue: integer("avg_revenue").notNull().default(0),
  jobsOnTrack: integer("jobs_on_track").notNull().default(0),
  jobsAtRisk: integer("jobs_at_risk").notNull().default(0),
  jobsLost: integer("jobs_lost").notNull().default(0),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  pipelineMatching: integer("pipeline_matching").notNull().default(0),
  pipelineScreening: integer("pipeline_screening").notNull().default(0),
  pipelineShortlisted: integer("pipeline_shortlisted").notNull().default(0),
  pipelineInterview: integer("pipeline_interview").notNull().default(0),
  pipelineOffer: integer("pipeline_offer").notNull().default(0),
  pipelineHired: integer("pipeline_hired").notNull().default(0),
  pipelineLost: integer("pipeline_lost").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("recruitment_metrics_tenant_id_idx").on(table.tenantId),
}));

export const onboardingWorkflows = pgTable("onboarding_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
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
}, (table) => ({
  tenantIdIdx: index("onboarding_workflows_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("onboarding_workflows_candidate_id_idx").on(table.candidateId),
}));

export const tenantConfig = pgTable("tenant_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  primaryColor: text("primary_color").default("#0ea5e9"),
  logoUrl: text("logo_url"),
  tagline: text("tagline"), // Custom welcome message for landing page
  industry: text("industry"),
  modulesEnabled: jsonb("modules_enabled").notNull().default(sql`'{}'::jsonb`),
  apiKeysConfigured: jsonb("api_keys_configured").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tenantRequests = pgTable("tenant_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  requestedSubdomain: text("requested_subdomain").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  industry: text("industry"),
  companySize: text("company_size"), // 'small', 'medium', 'large', 'enterprise'
  message: text("message"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'cancelled'
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by"), // User ID of admin who reviewed
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const interviews = pgTable("interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
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
}, (table) => ({
  tenantIdIdx: index("interviews_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("interviews_candidate_id_idx").on(table.candidateId),
  jobIdIdx: index("interviews_job_id_idx").on(table.jobId),
}));

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
  tenantId: true, // Injected server-side from req.tenant.id to prevent spoofing
  createdAt: true,
  updatedAt: true,
  requirementsEmbedding: true, // Generated automatically by the system
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  tenantId: true, // Injected server-side from req.tenant.id to prevent spoofing
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrityCheckSchema = createInsertSchema(integrityChecks, {
  completedAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true, // Injected server-side from req.tenant.id to prevent spoofing
  createdAt: true,
  updatedAt: true,
});

export const insertRecruitmentSessionSchema = createInsertSchema(recruitmentSessions, {
  completedAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true, // Injected server-side from req.tenant.id to prevent spoofing
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
  tenantId: true, // Injected server-side from req.tenant.id to prevent spoofing
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

export const insertTenantRequestSchema = createInsertSchema(tenantRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedBy: true,
  reviewedAt: true,
});

// Schema for admin updating/reviewing tenant requests (with validation)
export const updateTenantRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  adminNotes: z.string().optional(),
  reviewedAt: z.string().optional(), // ISO timestamp
});

export type InsertTenantRequest = z.infer<typeof insertTenantRequestSchema>;
export type UpdateTenantRequest = z.infer<typeof updateTenantRequestSchema>;
export type TenantRequest = typeof tenantRequests.$inferSelect;

export const insertInterviewSchema = createInsertSchema(interviews, {
  candidateId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
  startedAt: z.coerce.date().optional().nullable(),
  endedAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true, // Injected server-side from req.tenant.id to prevent spoofing
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

export const insertRecruitmentMetricSchema = createInsertSchema(recruitmentMetrics, {
  month: z.coerce.date(),
}).omit({
  id: true,
  tenantId: true, // Injected server-side from req.tenant.id to prevent spoofing
  createdAt: true,
  updatedAt: true,
});

export type InsertRecruitmentMetric = z.infer<typeof insertRecruitmentMetricSchema>;
export type RecruitmentMetric = typeof recruitmentMetrics.$inferSelect;

// ==================== WORKFORCE INTELLIGENCE ====================

// Skills Taxonomy - Master list of skills
export const skills = pgTable("skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'Technical', 'Soft Skills', 'Leadership', 'Domain'
  description: text("description"),
  parentSkillId: varchar("parent_skill_id"), // For hierarchical skills
  isEssential: integer("is_essential").default(0), // 1 = marked as essential
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("skills_tenant_id_idx").on(table.tenantId),
  categoryIdx: index("skills_category_idx").on(table.category),
}));

// Employees (People Profiles) - Internal workforce
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  department: text("department"),
  team: text("team"),
  jobTitle: text("job_title"),
  manager: text("manager"),
  location: text("location"),
  employmentType: text("employment_type"), // 'full_time', 'part_time', 'contract'
  startDate: timestamp("start_date"),
  avatarUrl: text("avatar_url"),
  linkedinUrl: text("linkedin_url"),
  cvUrl: text("cv_url"),
  bio: text("bio"),
  tags: text("tags").array(), // For grouping/filtering
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("employees_tenant_id_idx").on(table.tenantId),
  departmentIdx: index("employees_department_idx").on(table.department),
  teamIdx: index("employees_team_idx").on(table.team),
}));

// Employee Skill Assessments - Links employees to skills with proficiency levels
export const employeeSkills = pgTable("employee_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  skillId: varchar("skill_id").notNull().references(() => skills.id),
  proficiencyLevel: integer("proficiency_level").notNull().default(1), // 1-8 scale
  status: text("status").notNull().default("assessed"), // 'critical_gap', 'training_needed', 'good_match', 'beyond_expectations'
  source: text("source").notNull().default("self"), // 'self', 'manager', 'cv_parsed', 'assessment'
  notes: text("notes"),
  assessedAt: timestamp("assessed_at").notNull().defaultNow(),
  assessedBy: varchar("assessed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("employee_skills_tenant_id_idx").on(table.tenantId),
  employeeIdIdx: index("employee_skills_employee_id_idx").on(table.employeeId),
  skillIdIdx: index("employee_skills_skill_id_idx").on(table.skillId),
}));

// Job Skill Requirements - Skills required for each job
export const jobSkills = pgTable("job_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  skillId: varchar("skill_id").notNull().references(() => skills.id),
  requiredLevel: integer("required_level").notNull().default(3), // Minimum proficiency required (1-8)
  importance: text("importance").notNull().default("required"), // 'essential', 'required', 'preferred', 'nice_to_have'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("job_skills_tenant_id_idx").on(table.tenantId),
  jobIdIdx: index("job_skills_job_id_idx").on(table.jobId),
}));

// Skill Activity Log - Track skill updates for learning path feed
export const skillActivities = pgTable("skill_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  employeeId: varchar("employee_id").references(() => employees.id),
  skillId: varchar("skill_id").references(() => skills.id),
  activityType: text("activity_type").notNull(), // 'skill_added', 'skill_improved', 'gap_closed', 'assessment_completed'
  description: text("description"),
  previousLevel: integer("previous_level"),
  newLevel: integer("new_level"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("skill_activities_tenant_id_idx").on(table.tenantId),
  employeeIdIdx: index("skill_activities_employee_id_idx").on(table.employeeId),
}));

// Departments - For skill analysis grouping
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  name: text("name").notNull(),
  headCount: integer("head_count").default(0),
  skillGapScore: integer("skill_gap_score").default(0), // Higher = more gaps
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("departments_tenant_id_idx").on(table.tenantId),
}));

// Employee Ambitions - Career goals and target roles
export const employeeAmbitions = pgTable("employee_ambitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  targetJobId: varchar("target_job_id").references(() => jobs.id), // Target role they're aiming for
  targetJobTitle: text("target_job_title"), // Free-form if no job exists
  targetDepartment: text("target_department"),
  targetTimeframe: text("target_timeframe"), // '6_months', '1_year', '2_years', '3_plus_years'
  motivation: text("motivation"), // Why they want this role
  status: text("status").notNull().default("active"), // 'active', 'achieved', 'paused', 'cancelled'
  matchScore: integer("match_score"), // 0-100 how close they are to the target
  skillGaps: jsonb("skill_gaps"), // Array of {skillId, required, current, gap}
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("employee_ambitions_tenant_id_idx").on(table.tenantId),
  employeeIdIdx: index("employee_ambitions_employee_id_idx").on(table.employeeId),
}));

// Mentorship Relationships - Connecting experts with learners
export const mentorships = pgTable("mentorships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  mentorId: varchar("mentor_id").notNull().references(() => employees.id),
  menteeId: varchar("mentee_id").notNull().references(() => employees.id),
  skillId: varchar("skill_id").references(() => skills.id), // Primary skill focus
  status: text("status").notNull().default("active"), // 'pending', 'active', 'completed', 'cancelled'
  matchScore: integer("match_score"), // How well matched are they
  matchReason: text("match_reason"), // Why they were matched
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("mentorships_tenant_id_idx").on(table.tenantId),
  mentorIdIdx: index("mentorships_mentor_id_idx").on(table.mentorId),
  menteeIdIdx: index("mentorships_mentee_id_idx").on(table.menteeId),
}));

// Growth Areas - Clusters of skills needing improvement
export const growthAreas = pgTable("growth_areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  name: text("name").notNull(), // e.g., "Technical Leadership", "Data Skills"
  description: text("description"),
  priority: text("priority").notNull().default("medium"), // 'critical', 'high', 'medium', 'low'
  skillIds: text("skill_ids").array(), // Skills in this growth area
  currentScore: integer("current_score"), // Average proficiency 0-100
  targetScore: integer("target_score"), // Where they need to be
  progress: integer("progress").default(0), // 0-100 progress toward target
  suggestedActions: jsonb("suggested_actions"), // Array of {type, description, resource}
  status: text("status").notNull().default("active"), // 'active', 'in_progress', 'completed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("growth_areas_tenant_id_idx").on(table.tenantId),
  employeeIdIdx: index("growth_areas_employee_id_idx").on(table.employeeId),
}));

// Insert schemas for new tables
export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees, {
  startDate: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeSkillSchema = createInsertSchema(employeeSkills, {
  assessedAt: z.coerce.date().optional(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSkillSchema = createInsertSchema(jobSkills).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertSkillActivitySchema = createInsertSchema(skillActivities).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

// Types for new tables
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skills.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertEmployeeSkill = z.infer<typeof insertEmployeeSkillSchema>;
export type EmployeeSkill = typeof employeeSkills.$inferSelect;

export type InsertJobSkill = z.infer<typeof insertJobSkillSchema>;
export type JobSkill = typeof jobSkills.$inferSelect;

export type InsertSkillActivity = z.infer<typeof insertSkillActivitySchema>;
export type SkillActivity = typeof skillActivities.$inferSelect;

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// Ambitions insert schema and types
export const insertEmployeeAmbitionSchema = createInsertSchema(employeeAmbitions, {
  skillGaps: z.any().optional(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeAmbition = z.infer<typeof insertEmployeeAmbitionSchema>;
export type EmployeeAmbition = typeof employeeAmbitions.$inferSelect;

// Mentorship insert schema and types
export const insertMentorshipSchema = createInsertSchema(mentorships, {
  metadata: z.any().optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMentorship = z.infer<typeof insertMentorshipSchema>;
export type Mentorship = typeof mentorships.$inferSelect;

// Growth Areas insert schema and types
export const insertGrowthAreaSchema = createInsertSchema(growthAreas, {
  suggestedActions: z.any().optional(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGrowthArea = z.infer<typeof insertGrowthAreaSchema>;
export type GrowthArea = typeof growthAreas.$inferSelect;

// ==================== DOCUMENT AUTOMATION ====================

// Document Batches - Groups of documents uploaded together
export const documentBatches = pgTable("document_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  name: text("name"),
  type: text("type").notNull(), // 'job_specs', 'cvs'
  status: text("status").notNull().default("processing"), // 'processing', 'completed', 'partially_completed', 'failed'
  totalDocuments: integer("total_documents").notNull().default(0),
  processedDocuments: integer("processed_documents").notNull().default(0),
  failedDocuments: integer("failed_documents").notNull().default(0),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  tenantIdIdx: index("document_batches_tenant_id_idx").on(table.tenantId),
  typeIdx: index("document_batches_type_idx").on(table.type),
}));

// Documents - Individual uploaded files
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  batchId: varchar("batch_id").references(() => documentBatches.id),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(), // Local storage path
  type: text("type").notNull(), // 'job_spec', 'cv'
  status: text("status").notNull().default("uploaded"), // 'uploaded', 'processing', 'processed', 'failed'
  errorMessage: text("error_message"),
  rawText: text("raw_text"), // Extracted text from PDF
  extractedData: jsonb("extracted_data"), // Structured data from AI
  linkedJobId: varchar("linked_job_id").references(() => jobs.id), // If this doc created a job
  linkedCandidateId: varchar("linked_candidate_id").references(() => candidates.id), // If this doc created a candidate
  processedAt: timestamp("processed_at"),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("documents_tenant_id_idx").on(table.tenantId),
  batchIdIdx: index("documents_batch_id_idx").on(table.batchId),
  typeIdx: index("documents_type_idx").on(table.type),
  statusIdx: index("documents_status_idx").on(table.status),
}));

// Insert schemas for documents
export const insertDocumentBatchSchema = createInsertSchema(documentBatches).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  completedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});

export const updateDocumentSchema = z.object({
  status: z.enum(["uploaded", "processing", "processed", "failed"]).optional(),
  rawText: z.string().optional(),
  extractedData: z.any().optional(),
  errorMessage: z.string().nullable().optional(),
  linkedJobId: z.string().nullable().optional(),
  linkedCandidateId: z.string().nullable().optional(),
});

export type InsertDocumentBatch = z.infer<typeof insertDocumentBatchSchema>;
export type DocumentBatch = typeof documentBatches.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// ==================== WHATSAPP CONVERSATIONS ====================

export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  waId: text("wa_id").notNull(), // WhatsApp ID (phone number)
  profileName: text("profile_name"), // WhatsApp profile name
  phone: text("phone").notNull(),
  type: text("type").notNull().default("general"), // 'general', 'document_request', 'appointment', 'onboarding', 'screening'
  subject: text("subject"), // Brief description of conversation purpose
  status: text("status").notNull().default("active"), // 'active', 'resolved', 'pending', 'escalated'
  assignedTo: varchar("assigned_to").references(() => users.id), // HR staff assigned
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  unreadCount: integer("unread_count").default(0),
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("whatsapp_conversations_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("whatsapp_conversations_candidate_id_idx").on(table.candidateId),
  waIdIdx: index("whatsapp_conversations_wa_id_idx").on(table.waId),
  statusIdx: index("whatsapp_conversations_status_idx").on(table.status),
  typeIdx: index("whatsapp_conversations_type_idx").on(table.type),
}));

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  conversationId: varchar("conversation_id").notNull().references(() => whatsappConversations.id),
  whatsappMessageId: text("whatsapp_message_id"), // WhatsApp's message ID
  direction: text("direction").notNull(), // 'inbound', 'outbound'
  senderType: text("sender_type").notNull(), // 'candidate', 'ai', 'human'
  senderId: varchar("sender_id"), // User ID if human sender
  messageType: text("message_type").notNull().default("text"), // 'text', 'image', 'document', 'audio', 'video', 'template', 'interactive'
  body: text("body"), // Text content
  mediaUrl: text("media_url"), // URL for media messages
  mediaType: text("media_type"), // MIME type of media
  templateName: text("template_name"), // If template message
  templateParams: jsonb("template_params"), // Template parameters
  interactiveType: text("interactive_type"), // 'button', 'list', 'product'
  interactiveData: jsonb("interactive_data"), // Interactive message data
  status: text("status").notNull().default("sent"), // 'pending', 'sent', 'delivered', 'read', 'failed'
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  payload: jsonb("payload"), // Full WhatsApp API payload
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("whatsapp_messages_tenant_id_idx").on(table.tenantId),
  conversationIdIdx: index("whatsapp_messages_conversation_id_idx").on(table.conversationId),
  whatsappMessageIdIdx: index("whatsapp_messages_whatsapp_message_id_idx").on(table.whatsappMessageId),
  statusIdx: index("whatsapp_messages_status_idx").on(table.status),
  createdAtIdx: index("whatsapp_messages_created_at_idx").on(table.createdAt),
}));

export const whatsappDocumentRequests = pgTable("whatsapp_document_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  conversationId: varchar("conversation_id").notNull().references(() => whatsappConversations.id),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  messageId: varchar("message_id").references(() => whatsappMessages.id),
  documentType: text("document_type").notNull(), // 'id_document', 'proof_of_address', 'qualification', 'reference', 'cv', 'other'
  documentName: text("document_name").notNull(), // Human-readable name
  description: text("description"), // Additional context
  status: text("status").notNull().default("requested"), // 'requested', 'received', 'verified', 'rejected', 'expired'
  dueDate: timestamp("due_date"),
  receivedAt: timestamp("received_at"),
  receivedDocumentId: varchar("received_document_id").references(() => documents.id),
  reminderCount: integer("reminder_count").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("whatsapp_document_requests_tenant_id_idx").on(table.tenantId),
  conversationIdIdx: index("whatsapp_document_requests_conversation_id_idx").on(table.conversationId),
  candidateIdIdx: index("whatsapp_document_requests_candidate_id_idx").on(table.candidateId),
  statusIdx: index("whatsapp_document_requests_status_idx").on(table.status),
}));

export const whatsappAppointments = pgTable("whatsapp_appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  conversationId: varchar("conversation_id").notNull().references(() => whatsappConversations.id),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  messageId: varchar("message_id").references(() => whatsappMessages.id),
  appointmentType: text("appointment_type").notNull(), // 'interview', 'onboarding', 'assessment', 'document_collection', 'other'
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at"),
  duration: integer("duration"), // Duration in minutes
  location: text("location"), // Physical location or 'virtual'
  meetingLink: text("meeting_link"), // For virtual meetings
  status: text("status").notNull().default("proposed"), // 'proposed', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show'
  confirmedAt: timestamp("confirmed_at"),
  reminderSent: integer("reminder_sent").default(0),
  candidateResponse: text("candidate_response"), // 'accepted', 'declined', 'reschedule_requested'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("whatsapp_appointments_tenant_id_idx").on(table.tenantId),
  conversationIdIdx: index("whatsapp_appointments_conversation_id_idx").on(table.conversationId),
  candidateIdIdx: index("whatsapp_appointments_candidate_id_idx").on(table.candidateId),
  statusIdx: index("whatsapp_appointments_status_idx").on(table.status),
  scheduledAtIdx: index("whatsapp_appointments_scheduled_at_idx").on(table.scheduledAt),
}));

// Interview Sessions - for sending interview links via WhatsApp
export const interviewSessions = pgTable("interview_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  conversationId: varchar("conversation_id").references(() => whatsappConversations.id),
  token: varchar("token").notNull().unique(), // Short unique token for the link
  interviewType: text("interview_type").notNull().default("voice"), // 'voice', 'video'
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'started', 'completed', 'expired'
  prompt: text("prompt"), // Custom interview prompt/questions
  transcripts: jsonb("transcripts"), // Array of { role: 'user'|'ai', text: string, emotion?: string }
  emotionAnalysis: jsonb("emotion_analysis"), // Summary of detected emotions
  overallScore: integer("overall_score"), // AI-generated score 0-100
  feedback: text("feedback"), // AI-generated feedback summary
  duration: integer("duration"), // Duration in seconds
  sentAt: timestamp("sent_at"), // When the invite was sent
  startedAt: timestamp("started_at"), // When candidate started the interview
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // Link expiration time
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("interview_sessions_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("interview_sessions_candidate_id_idx").on(table.candidateId),
  conversationIdIdx: index("interview_sessions_conversation_id_idx").on(table.conversationId),
  tokenIdx: index("interview_sessions_token_idx").on(table.token),
  statusIdx: index("interview_sessions_status_idx").on(table.status),
}));

export const insertInterviewSessionSchema = createInsertSchema(interviewSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessions.$inferSelect;

// Insert schemas for WhatsApp
export const insertWhatsappConversationSchema = createInsertSchema(whatsappConversations).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertWhatsappDocumentRequestSchema = createInsertSchema(whatsappDocumentRequests).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappAppointmentSchema = createInsertSchema(whatsappAppointments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWhatsappConversation = z.infer<typeof insertWhatsappConversationSchema>;
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;

export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

export type InsertWhatsappDocumentRequest = z.infer<typeof insertWhatsappDocumentRequestSchema>;
export type WhatsappDocumentRequest = typeof whatsappDocumentRequests.$inferSelect;

export type InsertWhatsappAppointment = z.infer<typeof insertWhatsappAppointmentSchema>;
export type WhatsappAppointment = typeof whatsappAppointments.$inferSelect;
