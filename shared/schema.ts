import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, vector, index, real, date, decimal, boolean } from "drizzle-orm/pg-core";
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
  
  // Recruitment Agent Assignment
  assignedAgentId: varchar("assigned_agent_id"),
  assignedAgentName: text("assigned_agent_name"),
  
  // Job Closure
  isClosed: integer("is_closed").default(0),
  closedAt: timestamp("closed_at"),
  closedReason: text("closed_reason"),
  
  // RAG Embeddings
  requirementsEmbedding: vector("requirements_embedding", { dimensions: 1536 }),
  
  // Archival (soft delete for historical data preservation)
  archivedAt: timestamp("archived_at"),
  archivedReason: text("archived_reason"),
  
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
  uploadToken: varchar("upload_token").unique(),
  uploadTokenExpiresAt: timestamp("upload_token_expires_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("integrity_checks_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("integrity_checks_candidate_id_idx").on(table.candidateId),
}));

// Document types for integrity verification
export const documentTypes = [
  "id_document",
  "proof_of_address",
  "police_clearance",
  "drivers_license",
  "passport",
  "bank_statement",
  "qualification_certificate",
  "reference_letter",
  "work_permit",
  "cv_resume",
  "payslip",
  "tax_certificate",
  "medical_certificate",
  "other",
] as const;

export type DocumentType = (typeof documentTypes)[number];

// Document requirements for integrity checks - tracks what documents are needed
export const integrityDocumentRequirements = pgTable("integrity_document_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  integrityCheckId: varchar("integrity_check_id").references(() => integrityChecks.id),
  documentType: text("document_type").notNull(), // From documentTypes enum
  description: text("description"), // Human-readable description of what's needed
  referenceCode: text("reference_code").notNull(), // Unique code for tracking (e.g., "DOC-2024-001")
  priority: text("priority").notNull().default("required"), // 'required' | 'optional'
  status: text("status").notNull().default("pending"), // 'pending' | 'requested' | 'received' | 'verified' | 'rejected'
  documentId: varchar("document_id"), // Link to received document
  whatsappMessageId: text("whatsapp_message_id"), // WhatsApp message ID when requested
  requestedAt: timestamp("requested_at"),
  receivedAt: timestamp("received_at"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by"), // User or 'ai'
  rejectionReason: text("rejection_reason"),
  reminderEnabled: integer("reminder_enabled").default(1),
  remindersSent: integer("reminders_sent").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  nextReminderAt: timestamp("next_reminder_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("integrity_doc_req_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("integrity_doc_req_candidate_id_idx").on(table.candidateId),
  integrityCheckIdIdx: index("integrity_doc_req_check_id_idx").on(table.integrityCheckId),
  referenceCodeIdx: index("integrity_doc_req_ref_code_idx").on(table.referenceCode),
}));

// Candidate documents - stores uploaded integrity/verification documents
export const candidateDocuments = pgTable("candidate_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  requirementId: varchar("requirement_id").references(() => integrityDocumentRequirements.id),
  documentType: text("document_type").notNull(), // From documentTypes enum
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  referenceCode: text("reference_code"), // Linked to requirement reference
  collectedVia: text("collected_via").notNull().default("portal"), // 'whatsapp' | 'portal' | 'manual' | 'email'
  sourceMessageId: text("source_message_id"), // WhatsApp message ID if collected via WhatsApp
  candidateNote: text("candidate_note"), // What the candidate said this document is
  status: text("status").notNull().default("received"), // 'received' | 'verified' | 'rejected' | 'expired'
  aiVerification: jsonb("ai_verification"), // AI verification results { verified: boolean, confidence: number, issues: [] }
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by"), // User ID or 'ai'
  expiresAt: timestamp("expires_at"), // For documents with expiry dates
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("candidate_docs_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("candidate_docs_candidate_id_idx").on(table.candidateId),
  requirementIdIdx: index("candidate_docs_requirement_id_idx").on(table.requirementId),
  referenceCodeIdx: index("candidate_docs_ref_code_idx").on(table.referenceCode),
}));

// WhatsApp conversation state for document collection
export const whatsappDocumentSessions = pgTable("whatsapp_document_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  phoneNumber: text("phone_number").notNull(),
  currentState: text("current_state").notNull().default("idle"), // 'idle' | 'awaiting_doc_type' | 'awaiting_document' | 'confirming'
  pendingRequirementId: varchar("pending_requirement_id"), // Which requirement we're collecting for
  selectedDocType: text("selected_doc_type"), // What doc type candidate selected
  lastMessageAt: timestamp("last_message_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("whatsapp_doc_sessions_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("whatsapp_doc_sessions_candidate_id_idx").on(table.candidateId),
  phoneNumberIdx: index("whatsapp_doc_sessions_phone_idx").on(table.phoneNumber),
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
  uploadToken: varchar("upload_token").unique(),
  uploadTokenExpiresAt: timestamp("upload_token_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("onboarding_workflows_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("onboarding_workflows_candidate_id_idx").on(table.candidateId),
  uploadTokenIdx: index("onboarding_workflows_upload_token_idx").on(table.uploadToken),
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

// Subscription Plans for multi-tenant billing
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 'starter', 'professional', 'enterprise'
  displayName: text("display_name").notNull(),
  description: text("description"),
  priceMonthly: integer("price_monthly").notNull(), // in cents (ZAR)
  priceYearly: integer("price_yearly"), // in cents (ZAR), optional yearly discount
  currency: text("currency").notNull().default("ZAR"),
  features: jsonb("features").notNull().default(sql`'[]'::jsonb`), // Array of feature strings
  limits: jsonb("limits").notNull().default(sql`'{}'::jsonb`), // { maxEmployees: 50, maxJobs: 10, ... }
  isActive: integer("is_active").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tenant Payments for tracking billing/subscription status
export const tenantPayments = pgTable("tenant_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenantConfig.id),
  planId: varchar("plan_id").references(() => subscriptionPlans.id),
  status: text("status").notNull().default("pending"), // 'pending', 'active', 'cancelled', 'past_due', 'trialing'
  billingCycle: text("billing_cycle").notNull().default("monthly"), // 'monthly', 'yearly'
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").notNull().default("ZAR"),
  paymentMethod: text("payment_method"), // 'card', 'eft', 'debit_order'
  paymentReference: text("payment_reference"), // External payment gateway reference
  invoiceNumber: text("invoice_number"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelledAt: timestamp("cancelled_at"),
  metadata: jsonb("metadata"), // Additional payment info
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("tenant_payments_tenant_id_idx").on(table.tenantId),
  planIdIdx: index("tenant_payments_plan_id_idx").on(table.planId),
  statusIdx: index("tenant_payments_status_idx").on(table.status),
}));

// Tenant Subscription History for audit trail
export const tenantSubscriptionHistory = pgTable("tenant_subscription_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenantConfig.id),
  planId: varchar("plan_id").references(() => subscriptionPlans.id),
  action: text("action").notNull(), // 'subscribed', 'upgraded', 'downgraded', 'cancelled', 'renewed'
  previousPlanId: varchar("previous_plan_id"),
  amount: integer("amount"),
  currency: text("currency").default("ZAR"),
  notes: text("notes"),
  performedBy: varchar("performed_by"), // User ID who made the change
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("tenant_subscription_history_tenant_id_idx").on(table.tenantId),
}));

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

// Integrity document requirements insert/update schemas
export const insertIntegrityDocumentRequirementSchema = createInsertSchema(integrityDocumentRequirements, {
  requestedAt: z.coerce.date().optional().nullable(),
  receivedAt: z.coerce.date().optional().nullable(),
  verifiedAt: z.coerce.date().optional().nullable(),
  lastReminderAt: z.coerce.date().optional().nullable(),
  nextReminderAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateIntegrityDocumentRequirementSchema = z.object({
  status: z.enum(['pending', 'requested', 'received', 'verified', 'rejected']).optional(),
  documentId: z.string().nullable().optional(),
  whatsappMessageId: z.string().nullable().optional(),
  requestedAt: z.coerce.date().nullable().optional(),
  receivedAt: z.coerce.date().nullable().optional(),
  verifiedAt: z.coerce.date().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  reminderEnabled: z.number().optional(),
  remindersSent: z.number().optional(),
  lastReminderAt: z.coerce.date().nullable().optional(),
  nextReminderAt: z.coerce.date().nullable().optional(),
  metadata: z.any().optional(),
});

export type InsertIntegrityDocumentRequirement = z.infer<typeof insertIntegrityDocumentRequirementSchema>;
export type UpdateIntegrityDocumentRequirement = z.infer<typeof updateIntegrityDocumentRequirementSchema>;
export type IntegrityDocumentRequirement = typeof integrityDocumentRequirements.$inferSelect;

// Candidate documents insert/update schemas
export const insertCandidateDocumentSchema = createInsertSchema(candidateDocuments, {
  verifiedAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCandidateDocumentSchema = z.object({
  status: z.enum(['received', 'verified', 'rejected', 'expired']).optional(),
  aiVerification: z.any().optional(),
  verifiedAt: z.coerce.date().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  metadata: z.any().optional(),
});

export type InsertCandidateDocument = z.infer<typeof insertCandidateDocumentSchema>;
export type UpdateCandidateDocument = z.infer<typeof updateCandidateDocumentSchema>;
export type CandidateDocument = typeof candidateDocuments.$inferSelect;

// WhatsApp document sessions insert/update schemas
export const insertWhatsappDocumentSessionSchema = createInsertSchema(whatsappDocumentSessions, {
  lastMessageAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWhatsappDocumentSessionSchema = z.object({
  currentState: z.enum(['idle', 'awaiting_doc_type', 'awaiting_document', 'confirming']).optional(),
  pendingRequirementId: z.string().nullable().optional(),
  selectedDocType: z.string().nullable().optional(),
  lastMessageAt: z.coerce.date().nullable().optional(),
  metadata: z.any().optional(),
});

export type InsertWhatsappDocumentSession = z.infer<typeof insertWhatsappDocumentSessionSchema>;
export type UpdateWhatsappDocumentSession = z.infer<typeof updateWhatsappDocumentSessionSchema>;
export type WhatsappDocumentSession = typeof whatsappDocumentSessions.$inferSelect;

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
  handoffMode: text("handoff_mode").notNull().default("ai"), // 'ai' | 'human' - who controls responses
  handoffAt: timestamp("handoff_at"), // When handoff occurred
  handoffBy: varchar("handoff_by"), // User ID who took over
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  unreadCount: integer("unread_count").default(0),
  lastReadAt: timestamp("last_read_at"), // When HR last read messages
  lastReadBy: varchar("last_read_by"), // Which HR user last read
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("whatsapp_conversations_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("whatsapp_conversations_candidate_id_idx").on(table.candidateId),
  waIdIdx: index("whatsapp_conversations_wa_id_idx").on(table.waId),
  statusIdx: index("whatsapp_conversations_status_idx").on(table.status),
  typeIdx: index("whatsapp_conversations_type_idx").on(table.type),
  handoffModeIdx: index("whatsapp_conversations_handoff_mode_idx").on(table.handoffMode),
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
  referenceCode: text("reference_code"), // Unique tracking code (e.g., "DOC-M8XYZ-1ABC")
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
  referenceCodeIdx: index("whatsapp_document_requests_ref_code_idx").on(table.referenceCode),
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
  candidateName: text("candidate_name"), // For invites without linked candidate
  candidatePhone: varchar("candidate_phone"), // Phone number for identification
  jobTitle: text("job_title"), // Position being interviewed for
  token: varchar("token").notNull().unique(), // Secure unique token for the link
  interviewType: text("interview_type").notNull().default("voice"), // 'voice', 'video', 'face_to_face', 'zoom', 'skype', 'teams', 'phone'
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
  // Video stage fields
  videoToken: varchar("video_token").unique(), // Separate invite token for video stage
  voiceStatus: text("voice_status").default("pending"), // Voice stage status
  videoStatus: text("video_status"), // Video stage status; null = not invited yet
  videoPrompt: text("video_prompt"), // Custom prompt for video interview
  videoStartedAt: timestamp("video_started_at"),
  videoCompletedAt: timestamp("video_completed_at"),
  videoDuration: integer("video_duration"),
  videoScore: integer("video_score"), // AI score for video stage (0-100)
  videoSentAt: timestamp("video_sent_at"),
  videoExpiresAt: timestamp("video_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("interview_sessions_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("interview_sessions_candidate_id_idx").on(table.candidateId),
  conversationIdIdx: index("interview_sessions_conversation_id_idx").on(table.conversationId),
  tokenIdx: index("interview_sessions_token_idx").on(table.token),
  statusIdx: index("interview_sessions_status_idx").on(table.status),
  videoTokenIdx: index("interview_sessions_video_token_idx").on(table.videoToken),
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

// Onboarding Agent Step Logs - Records all actions taken by onboarding agents
export const onboardingAgentLogs = pgTable("onboarding_agent_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  workflowId: varchar("workflow_id").notNull().references(() => onboardingWorkflows.id),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  agentType: text("agent_type").notNull(), // 'document_collector', 'provisioning', 'welcome', 'orientation', 'reminder', 'escalation'
  action: text("action").notNull(), // 'document_requested', 'document_received', 'reminder_sent', 'escalated', 'task_completed', etc.
  stepName: text("step_name"), // Current workflow step
  status: text("status").notNull().default("success"), // 'success', 'failed', 'pending', 'requires_intervention'
  details: jsonb("details"), // Action-specific details
  targetEntity: text("target_entity"), // 'candidate', 'hr_manager', 'it_admin', etc.
  targetEntityId: varchar("target_entity_id"),
  communicationChannel: text("communication_channel"), // 'whatsapp', 'email', 'system', 'manual'
  messageContent: text("message_content"), // Content of message sent if applicable
  responseReceived: text("response_received"), // Response from candidate/entity
  errorMessage: text("error_message"),
  requiresHumanReview: integer("requires_human_review").default(0), // 0 = no, 1 = yes
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("onboarding_agent_logs_tenant_id_idx").on(table.tenantId),
  workflowIdIdx: index("onboarding_agent_logs_workflow_id_idx").on(table.workflowId),
  candidateIdIdx: index("onboarding_agent_logs_candidate_id_idx").on(table.candidateId),
  agentTypeIdx: index("onboarding_agent_logs_agent_type_idx").on(table.agentType),
  statusIdx: index("onboarding_agent_logs_status_idx").on(table.status),
  requiresHumanReviewIdx: index("onboarding_agent_logs_requires_human_review_idx").on(table.requiresHumanReview),
}));

// Onboarding Document Requests - Tracks required documents for onboarding
export const onboardingDocumentRequests = pgTable("onboarding_document_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  workflowId: varchar("workflow_id").notNull().references(() => onboardingWorkflows.id),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  documentType: text("document_type").notNull(), // 'id_document', 'proof_of_address', 'tax_form', 'bank_details', 'qualification', 'contract', 'nda', etc.
  documentName: text("document_name").notNull(), // Human-readable name
  description: text("description"),
  isRequired: integer("is_required").notNull().default(1), // 0 = optional, 1 = required
  status: text("status").notNull().default("pending"), // 'pending', 'requested', 'received', 'verified', 'rejected', 'overdue'
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  dueDate: timestamp("due_date"),
  requestedAt: timestamp("requested_at"),
  requestedVia: text("requested_via"), // 'whatsapp', 'email', 'manual'
  reminderCount: integer("reminder_count").default(0),
  maxReminders: integer("max_reminders").default(3),
  lastReminderAt: timestamp("last_reminder_at"),
  nextReminderAt: timestamp("next_reminder_at"),
  receivedAt: timestamp("received_at"),
  receivedDocumentId: varchar("received_document_id").references(() => documents.id),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  escalatedAt: timestamp("escalated_at"),
  escalatedTo: varchar("escalated_to").references(() => users.id),
  escalationReason: text("escalation_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("onboarding_doc_requests_tenant_id_idx").on(table.tenantId),
  workflowIdIdx: index("onboarding_doc_requests_workflow_id_idx").on(table.workflowId),
  candidateIdIdx: index("onboarding_doc_requests_candidate_id_idx").on(table.candidateId),
  statusIdx: index("onboarding_doc_requests_status_idx").on(table.status),
  dueDateIdx: index("onboarding_doc_requests_due_date_idx").on(table.dueDate),
}));

// Insert schemas for onboarding agent logs
export const insertOnboardingAgentLogSchema = createInsertSchema(onboardingAgentLogs).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertOnboardingDocumentRequestSchema = createInsertSchema(onboardingDocumentRequests).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingAgentLog = z.infer<typeof insertOnboardingAgentLogSchema>;
export type OnboardingAgentLog = typeof onboardingAgentLogs.$inferSelect;

export type InsertOnboardingDocumentRequest = z.infer<typeof insertOnboardingDocumentRequestSchema>;
export type OnboardingDocumentRequest = typeof onboardingDocumentRequests.$inferSelect;

// ==================== AI INTERVIEW SYSTEM ====================

// Interview Recordings - Video/audio files from interviews
export const interviewRecordings = pgTable("interview_recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  recordingType: text("recording_type").notNull(), // 'video', 'audio', 'screen'
  mediaUrl: text("media_url"), // URL to stored recording
  thumbnailUrl: text("thumbnail_url"), // Preview image
  storageProvider: text("storage_provider").default("local"), // 'local', 's3', 'tavus', 'hume'
  externalId: text("external_id"), // ID from external service (Tavus/Hume)
  duration: integer("duration"), // Duration in seconds
  fileSize: integer("file_size"), // Size in bytes
  mimeType: text("mime_type"), // 'video/mp4', 'audio/webm', etc.
  transcriptionJobId: text("transcription_job_id"), // For async transcription
  transcriptionStatus: text("transcription_status").default("pending"), // 'pending', 'processing', 'completed', 'failed'
  interviewStage: text("interview_stage").notNull().default("voice"), // 'voice' or 'video'
  metadata: jsonb("metadata"), // Additional recording metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("interview_recordings_tenant_id_idx").on(table.tenantId),
  sessionIdIdx: index("interview_recordings_session_id_idx").on(table.sessionId),
  candidateIdIdx: index("interview_recordings_candidate_id_idx").on(table.candidateId),
  recordingTypeIdx: index("interview_recordings_type_idx").on(table.recordingType),
}));

// Interview Transcripts - Detailed text segments from interviews
export const interviewTranscripts = pgTable("interview_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id),
  recordingId: varchar("recording_id").references(() => interviewRecordings.id),
  segmentIndex: integer("segment_index").notNull(), // Order of segment
  speakerRole: text("speaker_role").notNull(), // 'candidate', 'ai', 'interviewer'
  speakerName: text("speaker_name"),
  text: text("text").notNull(),
  startTime: integer("start_time"), // Start time in milliseconds
  endTime: integer("end_time"), // End time in milliseconds
  confidence: integer("confidence"), // Transcription confidence 0-100
  language: text("language").default("en"),
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  emotionScores: jsonb("emotion_scores"), // { joy: 0.8, sadness: 0.1, anger: 0.05, ... }
  keywords: text("keywords").array(), // Extracted key terms
  interviewStage: text("interview_stage").notNull().default("voice"), // 'voice' or 'video'
  embedding: vector("embedding", { dimensions: 1536 }), // For semantic search
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("interview_transcripts_tenant_id_idx").on(table.tenantId),
  sessionIdIdx: index("interview_transcripts_session_id_idx").on(table.sessionId),
  recordingIdIdx: index("interview_transcripts_recording_id_idx").on(table.recordingId),
  speakerRoleIdx: index("interview_transcripts_speaker_role_idx").on(table.speakerRole),
  embeddingIdx: index("interview_transcripts_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
}));

// Interview Feedback - Human/AI evaluations and decisions
export const interviewFeedback = pgTable("interview_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  evaluatorType: text("evaluator_type").notNull(), // 'ai', 'human'
  evaluatorId: varchar("evaluator_id").references(() => users.id), // If human evaluator
  decision: text("decision"), // 'accepted', 'rejected', 'pipeline', 'needs_review'
  decisionConfidence: integer("decision_confidence"), // AI confidence 0-100
  overallScore: integer("overall_score"), // 0-100
  technicalScore: integer("technical_score"), // 0-100
  communicationScore: integer("communication_score"), // 0-100
  cultureFitScore: integer("culture_fit_score"), // 0-100
  problemSolvingScore: integer("problem_solving_score"), // 0-100
  strengths: text("strengths").array(),
  weaknesses: text("weaknesses").array(),
  keyInsights: text("key_insights").array(),
  rationale: text("rationale"), // Detailed reasoning for decision
  recommendations: text("recommendations"), // Next steps
  flaggedConcerns: text("flagged_concerns").array(), // Red flags
  competencyScores: jsonb("competency_scores"), // { 'leadership': 85, 'teamwork': 90, ... }
  isFinalized: integer("is_finalized").default(0), // 0 = draft, 1 = finalized
  finalizedAt: timestamp("finalized_at"),
  finalizedBy: varchar("finalized_by").references(() => users.id),
  interviewStage: text("interview_stage").notNull().default("voice"), // 'voice' or 'video'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("interview_feedback_tenant_id_idx").on(table.tenantId),
  sessionIdIdx: index("interview_feedback_session_id_idx").on(table.sessionId),
  candidateIdIdx: index("interview_feedback_candidate_id_idx").on(table.candidateId),
  decisionIdx: index("interview_feedback_decision_idx").on(table.decision),
  evaluatorTypeIdx: index("interview_feedback_evaluator_type_idx").on(table.evaluatorType),
}));

// Candidate Recommendations - AI-generated suggestions based on interviews
export const candidateRecommendations = pgTable("candidate_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  sessionId: varchar("session_id").references(() => interviewSessions.id),
  recommendationType: text("recommendation_type").notNull(), // 'hire', 'pipeline', 'better_fit', 'similar_candidate', 'role_suggestion'
  score: integer("score"), // Relevance score 0-100
  reasoning: text("reasoning"),
  suggestedJobId: varchar("suggested_job_id").references(() => jobs.id), // Alternative job suggestion
  suggestedCandidateId: varchar("suggested_candidate_id").references(() => candidates.id), // Similar candidate
  featureVector: vector("feature_vector", { dimensions: 1536 }), // For similarity search
  metadata: jsonb("metadata"), // Additional context
  isActive: integer("is_active").default(1), // 0 = dismissed, 1 = active
  viewedAt: timestamp("viewed_at"),
  actedUponAt: timestamp("acted_upon_at"),
  actedUponAction: text("acted_upon_action"), // 'scheduled', 'hired', 'rejected', 'dismissed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // When recommendation becomes stale
}, (table) => ({
  tenantIdIdx: index("candidate_recommendations_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("candidate_recommendations_candidate_id_idx").on(table.candidateId),
  jobIdIdx: index("candidate_recommendations_job_id_idx").on(table.jobId),
  sessionIdIdx: index("candidate_recommendations_session_id_idx").on(table.sessionId),
  typeIdx: index("candidate_recommendations_type_idx").on(table.recommendationType),
  featureVectorIdx: index("candidate_recommendations_vector_idx").using("hnsw", table.featureVector.op("vector_cosine_ops")),
}));

// Model Training Events - For reinforcement learning
export const modelTrainingEvents = pgTable("model_training_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  sessionId: varchar("session_id").references(() => interviewSessions.id),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  eventType: text("event_type").notNull(), // 'interview_completed', 'decision_made', 'outcome_confirmed', 'feedback_received'
  modelVersion: text("model_version"), // Which model version was used
  policyVersion: text("policy_version"), // RL policy version
  features: jsonb("features"), // Feature snapshot for training
  labels: jsonb("labels"), // Outcome labels { hired: true, performance_90d: 85 }
  reward: integer("reward"), // Computed reward signal
  predictionConfidence: integer("prediction_confidence"), // Model's confidence at time of prediction
  actualOutcome: text("actual_outcome"), // 'hired', 'rejected', 'quit_30d', 'top_performer', etc.
  outcomeConfirmedAt: timestamp("outcome_confirmed_at"),
  isUsedForTraining: integer("is_used_for_training").default(0),
  trainedAt: timestamp("trained_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("model_training_events_tenant_id_idx").on(table.tenantId),
  sessionIdIdx: index("model_training_events_session_id_idx").on(table.sessionId),
  candidateIdIdx: index("model_training_events_candidate_id_idx").on(table.candidateId),
  eventTypeIdx: index("model_training_events_type_idx").on(table.eventType),
  modelVersionIdx: index("model_training_events_model_version_idx").on(table.modelVersion),
  isUsedForTrainingIdx: index("model_training_events_training_idx").on(table.isUsedForTraining),
}));

// Insert schemas for interview system
export const insertInterviewRecordingSchema = createInsertSchema(interviewRecordings).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInterviewTranscriptSchema = createInsertSchema(interviewTranscripts).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertInterviewFeedbackSchema = createInsertSchema(interviewFeedback).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInterviewFeedbackSchema = insertInterviewFeedbackSchema.partial();

export const insertCandidateRecommendationSchema = createInsertSchema(candidateRecommendations).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertModelTrainingEventSchema = createInsertSchema(modelTrainingEvents).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export type InsertInterviewRecording = z.infer<typeof insertInterviewRecordingSchema>;
export type InterviewRecording = typeof interviewRecordings.$inferSelect;

export type InsertInterviewTranscript = z.infer<typeof insertInterviewTranscriptSchema>;
export type InterviewTranscript = typeof interviewTranscripts.$inferSelect;

export type InsertInterviewFeedback = z.infer<typeof insertInterviewFeedbackSchema>;
export type InterviewFeedback = typeof interviewFeedback.$inferSelect;

export type InsertCandidateRecommendation = z.infer<typeof insertCandidateRecommendationSchema>;
export type CandidateRecommendation = typeof candidateRecommendations.$inferSelect;

export type InsertModelTrainingEvent = z.infer<typeof insertModelTrainingEventSchema>;
export type ModelTrainingEvent = typeof modelTrainingEvents.$inferSelect;

// ============================================================================
// ViTT - VIDEO/INTERVIEW TIMESERIES TAG DATABASE
// TimescaleDB-style hypertable for timeline tagging across all interview types
// ============================================================================

// Timeline Tags - ViTT-style timestamped markers on interview recordings
// Designed as a timeseries-friendly table (time-partitioned by tagTime)
export const interviewTimelineTags = pgTable("interview_timeline_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id),
  recordingId: varchar("recording_id").references(() => interviewRecordings.id),
  transcriptId: varchar("transcript_id").references(() => interviewTranscripts.id),

  // ViTT core fields
  tagTime: timestamp("tag_time").notNull(), // Absolute wall-clock time of the tag
  offsetMs: integer("offset_ms").notNull(), // Millisecond offset from recording start
  endOffsetMs: integer("end_offset_ms"), // End of tagged range (null = point tag)
  duration: integer("duration"), // Duration of tagged segment in ms

  // Tag classification
  tagType: text("tag_type").notNull(), // 'auto_emotion', 'auto_topic', 'auto_keyword', 'auto_sentiment', 'auto_silence', 'auto_crosstalk', 'manual', 'bookmark', 'flag', 'question', 'answer', 'highlight', 'concern'
  tagSource: text("tag_source").notNull().default("auto"), // 'auto', 'manual', 'ai_reanalysis', 'assemblyai', 'deepgram', 'whisper', 'hume'
  category: text("category"), // 'technical', 'behavioral', 'communication', 'emotion', 'topic_shift', 'red_flag', 'positive_signal'

  // Tag content
  label: text("label").notNull(), // Short display label
  description: text("description"), // Detailed description
  snippet: text("snippet"), // Transcript snippet at this timestamp
  confidence: real("confidence"), // 0.0-1.0 confidence score

  // Emotion data (from Hume or other providers)
  emotionScores: jsonb("emotion_scores"), // { joy: 0.8, anger: 0.1, ... }
  dominantEmotion: text("dominant_emotion"), // Top emotion at this point
  sentimentScore: real("sentiment_score"), // -1.0 to 1.0

  // Topic/keyword data
  topics: text("topics").array(), // Detected topics at this point
  keywords: text("keywords").array(), // Key terms

  // Speaker info
  speakerRole: text("speaker_role"), // 'candidate', 'interviewer', 'ai'
  speakerName: text("speaker_name"),

  // Importance & scoring
  importance: integer("importance").default(5), // 1-10 importance ranking
  aiScore: real("ai_score"), // AI-assigned relevance score 0-1

  // Manual annotation
  createdBy: varchar("created_by").references(() => users.id), // null = auto-generated
  notes: text("notes"), // Human notes
  isBookmarked: integer("is_bookmarked").default(0),
  isFlagged: integer("is_flagged").default(0),

  // Metadata
  providerData: jsonb("provider_data"), // Raw data from the transcript provider
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("timeline_tags_tenant_id_idx").on(table.tenantId),
  sessionIdIdx: index("timeline_tags_session_id_idx").on(table.sessionId),
  recordingIdIdx: index("timeline_tags_recording_id_idx").on(table.recordingId),
  tagTimeIdx: index("timeline_tags_tag_time_idx").on(table.tagTime),
  offsetMsIdx: index("timeline_tags_offset_ms_idx").on(table.offsetMs),
  tagTypeIdx: index("timeline_tags_tag_type_idx").on(table.tagType),
  tagSourceIdx: index("timeline_tags_tag_source_idx").on(table.tagSource),
  categoryIdx: index("timeline_tags_category_idx").on(table.category),
  importanceIdx: index("timeline_tags_importance_idx").on(table.importance),
}));

// Transcript Jobs - Track multi-provider transcription runs
export const transcriptJobs = pgTable("transcript_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id),
  recordingId: varchar("recording_id").references(() => interviewRecordings.id),

  // Provider info
  provider: text("provider").notNull(), // 'assemblyai', 'deepgram', 'whisper', 'hume'
  providerJobId: text("provider_job_id"), // External job ID from the provider
  providerModel: text("provider_model"), // e.g., 'nova-2', 'whisper-large-v3', 'best'

  // Job state
  status: text("status").notNull().default("pending"), // 'pending', 'uploading', 'processing', 'completed', 'failed', 'cancelled'
  progress: integer("progress").default(0), // 0-100 percent
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),

  // Configuration
  language: text("language").default("en"),
  enableSpeakerDiarization: integer("enable_speaker_diarization").default(1),
  enableSentimentAnalysis: integer("enable_sentiment_analysis").default(1),
  enableEntityDetection: integer("enable_entity_detection").default(0),
  enableTopicDetection: integer("enable_topic_detection").default(1),
  enableAutoHighlights: integer("enable_auto_highlights").default(1),
  customVocabulary: text("custom_vocabulary").array(),

  // Results summary
  wordCount: integer("word_count"),
  segmentCount: integer("segment_count"),
  speakerCount: integer("speaker_count"),
  totalDurationMs: integer("total_duration_ms"),
  averageConfidence: real("average_confidence"),

  // Cost tracking
  costCents: integer("cost_cents"), // Cost in cents for billing
  audioDurationSeconds: integer("audio_duration_seconds"),

  // Timestamps
  submittedAt: timestamp("submitted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("transcript_jobs_tenant_id_idx").on(table.tenantId),
  sessionIdIdx: index("transcript_jobs_session_id_idx").on(table.sessionId),
  recordingIdIdx: index("transcript_jobs_recording_id_idx").on(table.recordingId),
  providerIdx: index("transcript_jobs_provider_idx").on(table.provider),
  statusIdx: index("transcript_jobs_status_idx").on(table.status),
}));

// Recording Sources - Track where recordings come from (browser, Zoom, Skype, upload)
export const recordingSources = pgTable("recording_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id),
  recordingId: varchar("recording_id").references(() => interviewRecordings.id),

  // Source info
  sourceType: text("source_type").notNull(), // 'browser_mediarecorder', 'zoom', 'skype', 'teams', 'upload', 'hume', 'tavus', 'phone'
  sourceId: text("source_id"), // External meeting ID (Zoom meeting ID, etc.)
  sourceUrl: text("source_url"), // Download URL from the source

  // Meeting platform details
  meetingId: text("meeting_id"), // Zoom/Skype/Teams meeting ID
  meetingPassword: text("meeting_password"), // Encrypted
  meetingUrl: text("meeting_url"), // Join URL
  hostEmail: text("host_email"),

  // Capture settings
  captureConfig: jsonb("capture_config"), // { audioCodec, videCodec, resolution, bitrate, sampleRate }
  isAudioOnly: integer("is_audio_only").default(0),
  hasVideo: integer("has_video").default(1),
  hasScreenShare: integer("has_screen_share").default(0),

  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'recording', 'uploading', 'completed', 'failed'
  errorMessage: text("error_message"),

  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("recording_sources_tenant_id_idx").on(table.tenantId),
  sessionIdIdx: index("recording_sources_session_id_idx").on(table.sessionId),
  recordingIdIdx: index("recording_sources_recording_id_idx").on(table.recordingId),
  sourceTypeIdx: index("recording_sources_source_type_idx").on(table.sourceType),
}));

// LeMUR Analysis Results - Stored Q&A results from transcript analysis
export const lemurAnalysisResults = pgTable("lemur_analysis_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id),

  // Analysis type
  analysisType: text("analysis_type").notNull(), // 'qa', 'summary', 'action_items', 'sentiment_timeline', 'topic_extraction', 'custom'
  question: text("question"), // The question asked (for Q&A type)
  prompt: text("prompt"), // Full prompt used

  // Results
  answer: text("answer"), // AI response
  structuredResult: jsonb("structured_result"), // Parsed structured data
  confidence: real("confidence"), // 0-1

  // Source tracking
  provider: text("provider").notNull().default("groq"), // 'groq', 'openai', 'assemblyai_lemur'
  model: text("model"), // Model used for analysis
  tokenCount: integer("token_count"),

  // User info
  requestedBy: varchar("requested_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("lemur_analysis_tenant_id_idx").on(table.tenantId),
  sessionIdIdx: index("lemur_analysis_session_id_idx").on(table.sessionId),
  analysisTypeIdx: index("lemur_analysis_type_idx").on(table.analysisType),
}));

// Insert schemas for ViTT system
export const insertInterviewTimelineTagSchema = createInsertSchema(interviewTimelineTags).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTranscriptJobSchema = createInsertSchema(transcriptJobs).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecordingSourceSchema = createInsertSchema(recordingSources).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLemurAnalysisResultSchema = createInsertSchema(lemurAnalysisResults).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export type InsertInterviewTimelineTag = z.infer<typeof insertInterviewTimelineTagSchema>;
export type InterviewTimelineTag = typeof interviewTimelineTags.$inferSelect;

export type InsertTranscriptJob = z.infer<typeof insertTranscriptJobSchema>;
export type TranscriptJob = typeof transcriptJobs.$inferSelect;

export type InsertRecordingSource = z.infer<typeof insertRecordingSourceSchema>;
export type RecordingSource = typeof recordingSources.$inferSelect;

export type InsertLemurAnalysisResult = z.infer<typeof insertLemurAnalysisResultSchema>;
export type LemurAnalysisResult = typeof lemurAnalysisResults.$inferSelect;

// ============================================================================
// DATA SOURCES - External systems for KPI data collection
// ============================================================================

export const dataSources = pgTable("data_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'api', 'database', 'spreadsheet', 'crm', 'erp', 'hr_system', 'custom', 'manual'
  category: text("category"), // 'Sales', 'Finance', 'HR', 'Operations', 'Customer Service', 'IT', 'Marketing'
  
  // Connection configuration
  connectionType: text("connection_type"), // 'rest_api', 'graphql', 'postgresql', 'mysql', 'mssql', 'google_sheets', 'excel', 'webhook'
  connectionUrl: text("connection_url"), // Base URL or connection string (encrypted in production)
  authType: text("auth_type"), // 'none', 'api_key', 'oauth2', 'basic', 'bearer_token'
  authConfig: jsonb("auth_config"), // { apiKeyHeader, apiKey, clientId, clientSecret, etc. } - encrypted in production
  
  // Data extraction settings
  dataEndpoint: text("data_endpoint"), // Specific endpoint or table/view name
  dataMapping: jsonb("data_mapping"), // Field mapping: { sourceField: 'target_kpi_field' }
  refreshSchedule: text("refresh_schedule"), // 'realtime', 'hourly', 'daily', 'weekly', 'monthly', 'manual'
  
  // Status & health
  status: text("status").notNull().default("pending"), // 'pending', 'active', 'error', 'disabled'
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"), // 'success', 'partial', 'failed'
  lastSyncMessage: text("last_sync_message"),
  healthScore: integer("health_score").default(100), // 0-100 health score based on recent syncs
  
  // Metadata
  iconUrl: text("icon_url"),
  color: text("color"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("data_sources_tenant_id_idx").on(table.tenantId),
  typeIdx: index("data_sources_type_idx").on(table.type),
  statusIdx: index("data_sources_status_idx").on(table.status),
}));

// Data Source Sync History - Log of all sync attempts
export const dataSourceSyncHistory = pgTable("data_source_sync_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  dataSourceId: varchar("data_source_id").notNull().references(() => dataSources.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull().default("running"), // 'running', 'success', 'partial', 'failed'
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsFailed: integer("records_failed").default(0),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
}, (table) => ({
  tenantIdIdx: index("data_source_sync_history_tenant_id_idx").on(table.tenantId),
  dataSourceIdIdx: index("data_source_sync_history_data_source_id_idx").on(table.dataSourceId),
  startedAtIdx: index("data_source_sync_history_started_at_idx").on(table.startedAt),
}));

// Data Source Field Definitions - Available fields from each data source
export const dataSourceFields = pgTable("data_source_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  dataSourceId: varchar("data_source_id").notNull().references(() => dataSources.id),
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type").notNull(), // 'string', 'number', 'date', 'boolean', 'array', 'object'
  displayName: text("display_name"),
  description: text("description"),
  sampleValue: text("sample_value"),
  isRequired: integer("is_required").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("data_source_fields_tenant_id_idx").on(table.tenantId),
  dataSourceIdIdx: index("data_source_fields_data_source_id_idx").on(table.dataSourceId),
}));

// ============================================================================
// KPI & PERFORMANCE REVIEW SYSTEM
// ============================================================================

// KPI Templates - Master list of KPIs available in the organization
export const kpiTemplates = pgTable("kpi_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  name: text("name").notNull(), // e.g., "Customer Satisfaction Score"
  description: text("description"),
  category: text("category"), // 'performance', 'growth', 'teamwork', 'leadership', 'innovation'
  measurementType: text("measurement_type").notNull().default("scale"), // 'scale', 'percentage', 'number', 'boolean'
  currentValue: real("current_value"), // Current measured value (updated by manual entry or data sync)
  targetValue: integer("target_value"), // Target to achieve
  targetTimePeriod: text("target_time_period"), // 'monthly', 'quarterly', 'annually' - time period for target
  lastMeasuredAt: timestamp("last_measured_at"), // When the value was last updated
  weight: integer("weight").default(1), // Weight in overall score calculation
  dataSource: text("data_source"), // Legacy: text description of data source
  dataSourceId: varchar("data_source_id").references(() => dataSources.id), // Link to actual data source
  sourceFieldMapping: text("source_field_mapping"), // Field name or query to extract from data source
  aggregationMethod: text("aggregation_method"), // 'sum', 'average', 'count', 'latest', 'min', 'max'
  frequency: text("frequency").default("quarterly"), // 'monthly', 'quarterly', 'annually' - how often KPI is measured
  ownerId: varchar("owner_id").references(() => users.id), // Person responsible for this KPI
  ownerType: text("owner_type"), // 'person', 'department', 'division' - type of owner
  ownerDepartment: text("owner_department"), // Department responsible if ownerType is 'department'
  ownerDivision: text("owner_division"), // Division responsible if ownerType is 'division'
  department: text("department"), // Optional department filter for who this KPI applies to
  role: text("role"), // Optional role filter
  isActive: integer("is_active").default(1),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("kpi_templates_tenant_id_idx").on(table.tenantId),
  categoryIdx: index("kpi_templates_category_idx").on(table.category),
  departmentIdx: index("kpi_templates_department_idx").on(table.department),
  ownerIdIdx: index("kpi_templates_owner_id_idx").on(table.ownerId),
}));

// Review Cycles - Periods for performance reviews (quarterly, annual, etc.)
export const reviewCycles = pgTable("review_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  name: text("name").notNull(), // e.g., "Q4 2024 Performance Review"
  description: text("description"),
  cycleType: text("cycle_type").notNull().default("quarterly"), // 'monthly', 'quarterly', 'semi_annual', 'annual'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  selfAssessmentDueDate: timestamp("self_assessment_due_date"),
  managerReviewDueDate: timestamp("manager_review_due_date"),
  status: text("status").notNull().default("draft"), // 'draft', 'active', 'self_assessment', 'manager_review', 'completed', 'archived'
  is360Review: integer("is_360_review").default(0), // Enable 360 feedback
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("review_cycles_tenant_id_idx").on(table.tenantId),
  statusIdx: index("review_cycles_status_idx").on(table.status),
  cycleTypeIdx: index("review_cycles_cycle_type_idx").on(table.cycleType),
}));

// Employee KPI Assignments - Assign KPIs to specific employees for a review cycle
export const kpiAssignments = pgTable("kpi_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  reviewCycleId: varchar("review_cycle_id").notNull().references(() => reviewCycles.id),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  kpiTemplateId: varchar("kpi_template_id").notNull().references(() => kpiTemplates.id),
  customTarget: integer("custom_target"), // Override template target
  customWeight: integer("custom_weight"), // Override template weight
  managerId: varchar("manager_id").references(() => employees.id), // Direct manager for approval
  status: text("status").notNull().default("pending"), // 'pending', 'self_scored', 'manager_reviewed', 'finalized'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("kpi_assignments_tenant_id_idx").on(table.tenantId),
  reviewCycleIdIdx: index("kpi_assignments_review_cycle_idx").on(table.reviewCycleId),
  employeeIdIdx: index("kpi_assignments_employee_id_idx").on(table.employeeId),
  managerIdIdx: index("kpi_assignments_manager_id_idx").on(table.managerId),
  statusIdx: index("kpi_assignments_status_idx").on(table.status),
}));

// KPI Scores - Self-assessment and manager scores
export const kpiScores = pgTable("kpi_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  assignmentId: varchar("assignment_id").notNull().references(() => kpiAssignments.id),
  scorerType: text("scorer_type").notNull(), // 'self', 'manager', 'peer', 'direct_report'
  scorerId: varchar("scorer_id").references(() => users.id),
  score: integer("score").notNull(), // 1-5 scale
  comments: text("comments"),
  evidence: text("evidence"), // Supporting evidence/achievements
  submittedAt: timestamp("submitted_at"),
  submittedVia: text("submitted_via").default("platform"), // 'platform', 'whatsapp', 'teams'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("kpi_scores_tenant_id_idx").on(table.tenantId),
  assignmentIdIdx: index("kpi_scores_assignment_id_idx").on(table.assignmentId),
  scorerTypeIdx: index("kpi_scores_scorer_type_idx").on(table.scorerType),
  scorerIdIdx: index("kpi_scores_scorer_id_idx").on(table.scorerId),
}));

// 360 Feedback Requests - For gathering peer/team feedback
export const feedback360Requests = pgTable("feedback_360_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  reviewCycleId: varchar("review_cycle_id").notNull().references(() => reviewCycles.id),
  subjectId: varchar("subject_id").notNull().references(() => users.id), // Employee being reviewed
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id), // Person giving feedback
  reviewerType: text("reviewer_type").notNull(), // 'peer', 'direct_report', 'cross_functional', 'external'
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'completed', 'declined'
  token: varchar("token").unique(), // Secure token for WhatsApp/email links
  requestedAt: timestamp("requested_at"),
  completedAt: timestamp("completed_at"),
  sentVia: text("sent_via"), // 'whatsapp', 'email', 'teams'
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("feedback_360_requests_tenant_id_idx").on(table.tenantId),
  reviewCycleIdIdx: index("feedback_360_requests_review_cycle_idx").on(table.reviewCycleId),
  subjectIdIdx: index("feedback_360_requests_subject_id_idx").on(table.subjectId),
  reviewerIdIdx: index("feedback_360_requests_reviewer_id_idx").on(table.reviewerId),
  tokenIdx: index("feedback_360_requests_token_idx").on(table.token),
  statusIdx: index("feedback_360_requests_status_idx").on(table.status),
}));

// 360 Feedback Responses - Actual feedback given
export const feedback360Responses = pgTable("feedback_360_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  requestId: varchar("request_id").notNull().references(() => feedback360Requests.id),
  overallScore: integer("overall_score"), // 1-5
  strengths: text("strengths"),
  areasForImprovement: text("areas_for_improvement"),
  additionalComments: text("additional_comments"),
  competencyScores: jsonb("competency_scores"), // { 'leadership': 4, 'communication': 5, ... }
  isAnonymous: integer("is_anonymous").default(1),
  submittedVia: text("submitted_via").default("platform"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("feedback_360_responses_tenant_id_idx").on(table.tenantId),
  requestIdIdx: index("feedback_360_responses_request_id_idx").on(table.requestId),
}));

// Review Submissions - Final review submission tracking
export const reviewSubmissions = pgTable("review_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  reviewCycleId: varchar("review_cycle_id").notNull().references(() => reviewCycles.id),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  managerId: varchar("manager_id").references(() => employees.id),
  selfAssessmentStatus: text("self_assessment_status").notNull().default("pending"), // 'pending', 'in_progress', 'completed'
  managerReviewStatus: text("manager_review_status").notNull().default("pending"),
  overallSelfScore: integer("overall_self_score"), // Weighted average of self-scores
  overallManagerScore: integer("overall_manager_score"), // Weighted average of manager scores
  overall360Score: integer("overall_360_score"), // Average of 360 feedback
  finalScore: integer("final_score"), // Final combined score
  managerComments: text("manager_comments"),
  employeeComments: text("employee_comments"),
  developmentPlan: text("development_plan"),
  selfSubmittedAt: timestamp("self_submitted_at"),
  managerSubmittedAt: timestamp("manager_submitted_at"),
  finalizedAt: timestamp("finalized_at"),
  whatsappNotificationSent: integer("whatsapp_notification_sent").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("review_submissions_tenant_id_idx").on(table.tenantId),
  reviewCycleIdIdx: index("review_submissions_review_cycle_idx").on(table.reviewCycleId),
  employeeIdIdx: index("review_submissions_employee_id_idx").on(table.employeeId),
  managerIdIdx: index("review_submissions_manager_id_idx").on(table.managerId),
}));

// Self-Assessment Tokens - For employee self-assessment via WhatsApp links
export const selfAssessmentTokens = pgTable("self_assessment_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  token: varchar("token").notNull().unique(),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  reviewCycleId: varchar("review_cycle_id").notNull().references(() => reviewCycles.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accessed', 'completed', 'expired'
  expiresAt: timestamp("expires_at").notNull(),
  accessedAt: timestamp("accessed_at"),
  completedAt: timestamp("completed_at"),
  sentVia: text("sent_via").default("whatsapp"), // 'whatsapp', 'email', 'manual'
  sentBy: varchar("sent_by").references(() => users.id),
  sentAt: timestamp("sent_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("self_assessment_tokens_tenant_id_idx").on(table.tenantId),
  tokenIdx: index("self_assessment_tokens_token_idx").on(table.token),
  employeeIdIdx: index("self_assessment_tokens_employee_id_idx").on(table.employeeId),
  reviewCycleIdIdx: index("self_assessment_tokens_review_cycle_idx").on(table.reviewCycleId),
}));

export type SelfAssessmentToken = typeof selfAssessmentTokens.$inferSelect;
export type InsertSelfAssessmentToken = typeof selfAssessmentTokens.$inferInsert;

// ============================================
// SOCIAL INTELLIGENCE SCREENING SYSTEM
// ============================================

// Social platforms supported for screening
export const socialPlatforms = ["facebook", "twitter", "linkedin", "reddit", "instagram", "tiktok", "other"] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];

// Social screening consent status
export const consentStatuses = ["pending", "granted", "denied", "expired", "revoked"] as const;
export type ConsentStatus = (typeof consentStatuses)[number];

// Candidate social screening consent - POPIA/GDPR compliant consent tracking
export const candidateSocialConsent = pgTable("candidate_social_consent", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  consentStatus: text("consent_status").notNull().default("pending"), // pending, granted, denied, expired, revoked
  consentMethod: text("consent_method"), // 'whatsapp', 'email', 'web_form', 'verbal'
  consentText: text("consent_text"), // The actual consent text shown to candidate
  ipAddress: text("ip_address"), // For audit trail
  userAgent: text("user_agent"), // Browser/device info
  consentToken: varchar("consent_token"), // Unique token for consent verification
  grantedAt: timestamp("granted_at"),
  expiresAt: timestamp("expires_at"), // Consent expiration (e.g., 90 days)
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  whatsappMessageId: text("whatsapp_message_id"), // If requested via WhatsApp
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("candidate_social_consent_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("candidate_social_consent_candidate_id_idx").on(table.candidateId),
  consentTokenIdx: index("candidate_social_consent_token_idx").on(table.consentToken),
}));

// Candidate social profiles - linked social media accounts for screening
export const candidateSocialProfiles = pgTable("candidate_social_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  consentId: varchar("consent_id").references(() => candidateSocialConsent.id),
  platform: text("platform").notNull(), // facebook, twitter, linkedin, reddit, instagram
  profileUrl: text("profile_url"), // URL to the profile
  profileUsername: text("profile_username"), // Username/handle
  profileName: text("profile_name"), // Display name
  profileData: jsonb("profile_data"), // Raw profile data (encrypted at rest)
  lastScrapedAt: timestamp("last_scraped_at"),
  scrapeStatus: text("scrape_status").notNull().default("pending"), // pending, in_progress, completed, failed
  scrapeError: text("scrape_error"),
  dataRetentionExpiresAt: timestamp("data_retention_expires_at"), // When raw data should be deleted (90 days)
  isVerified: integer("is_verified").default(0), // If profile ownership was verified
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("candidate_social_profiles_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("candidate_social_profiles_candidate_id_idx").on(table.candidateId),
  platformIdx: index("candidate_social_profiles_platform_idx").on(table.platform),
}));

// Social screening findings - AI analysis results
export const socialScreeningFindings = pgTable("social_screening_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  integrityCheckId: varchar("integrity_check_id").references(() => integrityChecks.id),
  profileId: varchar("profile_id").references(() => candidateSocialProfiles.id),
  
  // Scoring
  overallScore: integer("overall_score"), // 0-100 culture fit score
  riskLevel: text("risk_level"), // 'low', 'medium', 'high', 'critical'
  cultureFitScore: integer("culture_fit_score"), // 0-100
  professionalismScore: integer("professionalism_score"), // 0-100
  communicationScore: integer("communication_score"), // 0-100
  
  // AI Analysis
  sentimentAnalysis: jsonb("sentiment_analysis"), // { positive: %, negative: %, neutral: % }
  topicsIdentified: text("topics_identified").array(), // ['politics', 'sports', 'tech', etc.]
  redFlags: jsonb("red_flags"), // [{ type: '', description: '', severity: '', evidence: '' }]
  positiveIndicators: jsonb("positive_indicators"), // [{ type: '', description: '', evidence: '' }]
  culturalAlignmentFactors: jsonb("cultural_alignment_factors"), // { values: [], interests: [], behavior: [] }
  
  // Summary
  aiSummary: text("ai_summary"), // Executive summary of findings
  aiRecommendation: text("ai_recommendation"), // 'proceed', 'review', 'caution', 'reject'
  aiConfidence: integer("ai_confidence"), // 0-100 confidence in the assessment
  
  // Human Review
  humanReviewStatus: text("human_review_status").notNull().default("pending"), // pending, approved, modified, rejected
  humanReviewedBy: varchar("human_reviewed_by").references(() => users.id),
  humanReviewedAt: timestamp("human_reviewed_at"),
  humanReviewNotes: text("human_review_notes"),
  humanOverrideScore: integer("human_override_score"), // If HR overrides the AI score
  humanOverrideReason: text("human_override_reason"),
  
  // Audit
  analysisVersion: text("analysis_version"), // Model version used for analysis
  processingTimeMs: integer("processing_time_ms"),
  tokensUsed: integer("tokens_used"), // LLM tokens consumed
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("social_screening_findings_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("social_screening_findings_candidate_id_idx").on(table.candidateId),
  integrityCheckIdIdx: index("social_screening_findings_integrity_check_idx").on(table.integrityCheckId),
  riskLevelIdx: index("social_screening_findings_risk_level_idx").on(table.riskLevel),
}));

// Social screening posts - individual posts/content analyzed (ephemeral, deleted after 90 days)
export const socialScreeningPosts = pgTable("social_screening_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  findingId: varchar("finding_id").notNull().references(() => socialScreeningFindings.id),
  profileId: varchar("profile_id").references(() => candidateSocialProfiles.id),
  platform: text("platform").notNull(),
  postId: text("post_id"), // Original post ID from platform
  postUrl: text("post_url"),
  postDate: timestamp("post_date"),
  contentType: text("content_type"), // 'text', 'image', 'video', 'link', 'repost'
  contentSummary: text("content_summary"), // AI-summarized content (not raw text for privacy)
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  relevanceScore: integer("relevance_score"), // 0-100 how relevant to screening
  flagged: integer("flagged").default(0), // If this post triggered a red flag
  flagReason: text("flag_reason"),
  expiresAt: timestamp("expires_at"), // When to delete (90-day retention)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  findingIdIdx: index("social_screening_posts_finding_id_idx").on(table.findingId),
  expiresAtIdx: index("social_screening_posts_expires_at_idx").on(table.expiresAt),
}));

// Insert schemas for Social Screening
export const insertCandidateSocialConsentSchema = createInsertSchema(candidateSocialConsent).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCandidateSocialConsentSchema = insertCandidateSocialConsentSchema.partial();

export const insertCandidateSocialProfileSchema = createInsertSchema(candidateSocialProfiles).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCandidateSocialProfileSchema = insertCandidateSocialProfileSchema.partial();

export const insertSocialScreeningFindingSchema = createInsertSchema(socialScreeningFindings).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSocialScreeningFindingSchema = insertSocialScreeningFindingSchema.partial();

export const insertSocialScreeningPostSchema = createInsertSchema(socialScreeningPosts).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

// Types for Social Screening
export type InsertCandidateSocialConsent = z.infer<typeof insertCandidateSocialConsentSchema>;
export type UpdateCandidateSocialConsent = z.infer<typeof updateCandidateSocialConsentSchema>;
export type CandidateSocialConsent = typeof candidateSocialConsent.$inferSelect;

export type InsertCandidateSocialProfile = z.infer<typeof insertCandidateSocialProfileSchema>;
export type UpdateCandidateSocialProfile = z.infer<typeof updateCandidateSocialProfileSchema>;
export type CandidateSocialProfile = typeof candidateSocialProfiles.$inferSelect;

export type InsertSocialScreeningFinding = z.infer<typeof insertSocialScreeningFindingSchema>;
export type UpdateSocialScreeningFinding = z.infer<typeof updateSocialScreeningFindingSchema>;
export type SocialScreeningFinding = typeof socialScreeningFindings.$inferSelect;

export type InsertSocialScreeningPost = z.infer<typeof insertSocialScreeningPostSchema>;
export type SocialScreeningPost = typeof socialScreeningPosts.$inferSelect;

// Insert schemas for Data Sources
export const insertDataSourceSchema = createInsertSchema(dataSources).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDataSourceSchema = insertDataSourceSchema.partial();

export const insertDataSourceSyncHistorySchema = createInsertSchema(dataSourceSyncHistory).omit({
  id: true,
  tenantId: true,
});

export const insertDataSourceFieldSchema = createInsertSchema(dataSourceFields).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

// Types for Data Sources
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type UpdateDataSource = z.infer<typeof updateDataSourceSchema>;
export type DataSource = typeof dataSources.$inferSelect;

export type InsertDataSourceSyncHistory = z.infer<typeof insertDataSourceSyncHistorySchema>;
export type DataSourceSyncHistory = typeof dataSourceSyncHistory.$inferSelect;

export type InsertDataSourceField = z.infer<typeof insertDataSourceFieldSchema>;
export type DataSourceField = typeof dataSourceFields.$inferSelect;

// Insert schemas for KPI system
export const insertKpiTemplateSchema = createInsertSchema(kpiTemplates).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateKpiTemplateSchema = insertKpiTemplateSchema.partial();

export const insertReviewCycleSchema = createInsertSchema(reviewCycles).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateReviewCycleSchema = insertReviewCycleSchema.partial();

export const insertKpiAssignmentSchema = createInsertSchema(kpiAssignments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateKpiAssignmentSchema = insertKpiAssignmentSchema.partial();

export const insertKpiScoreSchema = createInsertSchema(kpiScores).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateKpiScoreSchema = insertKpiScoreSchema.partial();

export const insertFeedback360RequestSchema = createInsertSchema(feedback360Requests).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertFeedback360ResponseSchema = createInsertSchema(feedback360Responses).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertReviewSubmissionSchema = createInsertSchema(reviewSubmissions).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateReviewSubmissionSchema = insertReviewSubmissionSchema.partial();

// Types for KPI system
export type InsertKpiTemplate = z.infer<typeof insertKpiTemplateSchema>;
export type UpdateKpiTemplate = z.infer<typeof updateKpiTemplateSchema>;
export type KpiTemplate = typeof kpiTemplates.$inferSelect;

export type InsertReviewCycle = z.infer<typeof insertReviewCycleSchema>;
export type UpdateReviewCycle = z.infer<typeof updateReviewCycleSchema>;
export type ReviewCycle = typeof reviewCycles.$inferSelect;

export type InsertKpiAssignment = z.infer<typeof insertKpiAssignmentSchema>;
export type UpdateKpiAssignment = z.infer<typeof updateKpiAssignmentSchema>;
export type KpiAssignment = typeof kpiAssignments.$inferSelect;

export type InsertKpiScore = z.infer<typeof insertKpiScoreSchema>;
export type UpdateKpiScore = z.infer<typeof updateKpiScoreSchema>;
export type KpiScore = typeof kpiScores.$inferSelect;

export type InsertFeedback360Request = z.infer<typeof insertFeedback360RequestSchema>;
export type Feedback360Request = typeof feedback360Requests.$inferSelect;

export type InsertFeedback360Response = z.infer<typeof insertFeedback360ResponseSchema>;
export type Feedback360Response = typeof feedback360Responses.$inferSelect;

export type InsertReviewSubmission = z.infer<typeof insertReviewSubmissionSchema>;
export type UpdateReviewSubmission = z.infer<typeof updateReviewSubmissionSchema>;
export type ReviewSubmission = typeof reviewSubmissions.$inferSelect;

// Subscription Plan schemas and types
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSubscriptionPlanSchema = insertSubscriptionPlanSchema.partial();

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UpdateSubscriptionPlan = z.infer<typeof updateSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// Tenant Payment schemas and types
export const insertTenantPaymentSchema = createInsertSchema(tenantPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTenantPaymentSchema = insertTenantPaymentSchema.partial();

export type InsertTenantPayment = z.infer<typeof insertTenantPaymentSchema>;
export type UpdateTenantPayment = z.infer<typeof updateTenantPaymentSchema>;
export type TenantPayment = typeof tenantPayments.$inferSelect;

// Tenant Subscription History schemas and types
export const insertTenantSubscriptionHistorySchema = createInsertSchema(tenantSubscriptionHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertTenantSubscriptionHistory = z.infer<typeof insertTenantSubscriptionHistorySchema>;
export type TenantSubscriptionHistory = typeof tenantSubscriptionHistory.$inferSelect;

// ================================
// LMS (Learning Management System)
// ================================

export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // compliance, technical, soft_skills, leadership
  difficulty: text("difficulty").default("beginner"), // beginner, intermediate, advanced
  duration: integer("duration"), // in minutes
  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  aiLecturerId: varchar("ai_lecturer_id"),
  modules: jsonb("modules"), // [{id, title, lessons: [{id, title, content, videoUrl}]}]
  learningObjectives: text("learning_objectives").array(),
  prerequisites: text("prerequisites").array(),
  tags: text("tags").array(),
  status: text("status").default("draft"), // draft, published, archived
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("courses_tenant_id_idx").on(table.tenantId),
  statusIdx: index("courses_status_idx").on(table.status),
}));

export const assessments = pgTable("assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // quiz, exam, assignment, practical
  questions: jsonb("questions").notNull(), // [{id, question, type, options, correctAnswer, points}]
  passingScore: integer("passing_score").default(70),
  timeLimit: integer("time_limit"), // in minutes
  attempts: integer("attempts").default(3),
  deliveryMethod: text("delivery_method").array(), // ['email', 'whatsapp', 'platform']
  scheduleType: text("schedule_type").default("manual"), // manual, scheduled, on_completion
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").default("draft"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("assessments_tenant_id_idx").on(table.tenantId),
  courseIdIdx: index("assessments_course_id_idx").on(table.courseId),
}));

export const learnerProgress = pgTable("learner_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  status: text("status").default("not_started"), // not_started, in_progress, completed
  progress: integer("progress").default(0), // percentage 0-100
  currentModule: integer("current_module").default(0),
  currentLesson: integer("current_lesson").default(0),
  completedLessons: text("completed_lessons").array().default(sql`ARRAY[]::text[]`),
  timeSpent: integer("time_spent").default(0), // in minutes
  lastAccessedAt: timestamp("last_accessed_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("learner_progress_tenant_id_idx").on(table.tenantId),
  userIdIdx: index("learner_progress_user_id_idx").on(table.userId),
  courseIdIdx: index("learner_progress_course_id_idx").on(table.courseId),
}));

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  assessmentId: varchar("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  answers: jsonb("answers"), // {questionId: answer}
  score: integer("score"),
  passed: integer("passed").default(0), // 0 or 1
  timeSpent: integer("time_spent"), // in seconds
  attemptNumber: integer("attempt_number").default(1),
  feedback: text("feedback"),
  startedAt: timestamp("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("assessment_attempts_tenant_id_idx").on(table.tenantId),
  userIdIdx: index("assessment_attempts_user_id_idx").on(table.userId),
  assessmentIdIdx: index("assessment_attempts_assessment_id_idx").on(table.assessmentId),
}));

export const gamificationBadges = pgTable("gamification_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  criteria: jsonb("criteria").notNull(), // {type: 'course_completion', value: 5}
  points: integer("points").default(0),
  rarity: text("rarity").default("common"), // common, rare, epic, legendary
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("gamification_badges_tenant_id_idx").on(table.tenantId),
}));

export const learnerBadges = pgTable("learner_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: varchar("badge_id").notNull().references(() => gamificationBadges.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("learner_badges_tenant_id_idx").on(table.tenantId),
  userIdIdx: index("learner_badges_user_id_idx").on(table.userId),
}));

export const learnerPoints = pgTable("learner_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull().default(0),
  level: integer("level").default(1),
  rank: integer("rank"),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("learner_points_tenant_id_idx").on(table.tenantId),
  userIdIdx: index("learner_points_user_id_idx").on(table.userId),
}));

export const aiLecturers = pgTable("ai_lecturers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  voiceId: text("voice_id"), // for text-to-speech
  personality: text("personality"), // professional, friendly, authoritative
  specialization: text("specialization"), // compliance, technical, soft_skills
  tavusPersonaId: text("tavus_persona_id"), // Tavus API persona ID
  active: integer("active").default(1),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("ai_lecturers_tenant_id_idx").on(table.tenantId),
}));

export const learnerCourseReminders = pgTable("learner_course_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  learnerProgressId: varchar("learner_progress_id").notNull().references(() => learnerProgress.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  channel: text("channel").notNull().default("whatsapp"),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  sentBy: varchar("sent_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("learner_course_reminders_tenant_id_idx").on(table.tenantId),
  userIdIdx: index("learner_course_reminders_user_id_idx").on(table.userId),
  learnerProgressIdIdx: index("learner_course_reminders_progress_id_idx").on(table.learnerProgressId),
}));

// LMS Schemas
export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateCourseSchema = insertCourseSchema.partial();
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type UpdateCourse = z.infer<typeof updateCourseSchema>;
export type Course = typeof courses.$inferSelect;

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateAssessmentSchema = insertAssessmentSchema.partial();
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type UpdateAssessment = z.infer<typeof updateAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;

export const insertLearnerProgressSchema = createInsertSchema(learnerProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateLearnerProgressSchema = insertLearnerProgressSchema.partial();
export type InsertLearnerProgress = z.infer<typeof insertLearnerProgressSchema>;
export type UpdateLearnerProgress = z.infer<typeof updateLearnerProgressSchema>;
export type LearnerProgress = typeof learnerProgress.$inferSelect;

export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type GamificationBadge = typeof gamificationBadges.$inferSelect;
export type LearnerBadge = typeof learnerBadges.$inferSelect;
export type LearnerPoints = typeof learnerPoints.$inferSelect;
export type AILecturer = typeof aiLecturers.$inferSelect;
export type LearnerCourseReminder = typeof learnerCourseReminders.$inferSelect;

// Certificate Templates
export const certificateTemplates = pgTable("certificate_templates", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  tenantId: text("tenant_id").notNull().references(() => tenantConfig.id),
  name: text("name").notNull(),
  description: text("description"),
  templateUrl: text("template_url").notNull(),
  templateType: text("template_type").default("image"),
  placeholderFields: jsonb("placeholder_fields").default([]),
  defaultFields: jsonb("default_fields").default({}),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const issuedCertificates = pgTable("issued_certificates", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  tenantId: text("tenant_id").notNull().references(() => tenantConfig.id),
  templateId: text("template_id").notNull().references(() => certificateTemplates.id),
  userId: text("user_id").notNull().references(() => users.id),
  courseId: text("course_id").references(() => courses.id),
  certificateData: jsonb("certificate_data").notNull(),
  certificateUrl: text("certificate_url").notNull(),
  certificateNumber: text("certificate_number"),
  issuedAt: timestamp("issued_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CertificateTemplate = typeof certificateTemplates.$inferSelect;
export type InsertCertificateTemplate = typeof certificateTemplates.$inferInsert;
export type IssuedCertificate = typeof issuedCertificates.$inferSelect;
export type InsertIssuedCertificate = typeof issuedCertificates.$inferInsert;

// ============================================
// PIPELINE WORKFLOW SYSTEM
// ============================================

// Canonical pipeline stages for the Job → Recruitment → Integrity → Onboarding flow
export const pipelineStages = [
  "sourcing",        // Initial candidate discovery
  "screening",       // AI screening and ranking
  "shortlisted",     // Passed screening, ready for interview
  "interviewing",    // In interview process
  "offer_pending",   // Offer extended, awaiting response
  "offer_declined",  // Candidate declined the offer
  "integrity_checks", // Background verification in progress
  "integrity_passed", // All checks cleared
  "integrity_failed", // Check(s) failed
  "onboarding",      // Onboarding workflow active
  "hired",           // Successfully onboarded and hired
  "rejected",        // Candidate rejected at any stage
  "withdrawn",       // Candidate withdrew
] as const;

export type PipelineStage = (typeof pipelineStages)[number];

// Candidate Stage History - Tracks all stage transitions for audit and analytics
export const candidateStageHistory = pgTable("candidate_stage_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  triggeredBy: text("triggered_by").notNull().default("manual"), // 'manual', 'auto', 'ai_agent'
  triggeredByUserId: varchar("triggered_by_user_id"),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("candidate_stage_history_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("candidate_stage_history_candidate_id_idx").on(table.candidateId),
  jobIdIdx: index("candidate_stage_history_job_id_idx").on(table.jobId),
  toStageIdx: index("candidate_stage_history_to_stage_idx").on(table.toStage),
}));

// Job Workflow Configs - Tenant-level automation rules for the pipeline
export const jobWorkflowConfigs = pgTable("job_workflow_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  jobId: varchar("job_id").references(() => jobs.id), // null = tenant-wide default
  
  // Automation rules
  autoLaunchRecruitment: integer("auto_launch_recruitment").default(1), // When job activated
  autoLaunchIntegrity: integer("auto_launch_integrity").default(1), // When offer accepted
  autoLaunchOnboarding: integer("auto_launch_onboarding").default(1), // When integrity passed
  
  // Required integrity check types
  requiredChecks: text("required_checks").array(), // ['criminal_record', 'credit_check', 'reference_check']
  
  // Stage-specific settings
  screeningThreshold: integer("screening_threshold").default(70), // Min match score to pass screening
  autoAdvanceFromScreening: integer("auto_advance_from_screening").default(0), // Auto-shortlist high scorers
  
  // Notification settings
  notifyOnStageChange: integer("notify_on_stage_change").default(1),
  notifyOnBlocker: integer("notify_on_blocker").default(1),
  
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("job_workflow_configs_tenant_id_idx").on(table.tenantId),
  jobIdIdx: index("job_workflow_configs_job_id_idx").on(table.jobId),
}));

// Pipeline Blockers - What's preventing a candidate from advancing
export const pipelineBlockers = pgTable("pipeline_blockers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  stage: text("stage").notNull(),
  blockerType: text("blocker_type").notNull(), // 'missing_document', 'pending_check', 'awaiting_interview', 'pending_approval'
  blockerDescription: text("blocker_description").notNull(),
  relatedEntityType: text("related_entity_type"), // 'integrity_check', 'document_requirement', 'interview'
  relatedEntityId: varchar("related_entity_id"),
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
  status: text("status").notNull().default("active"), // 'active', 'resolved', 'ignored'
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("pipeline_blockers_tenant_id_idx").on(table.tenantId),
  candidateIdIdx: index("pipeline_blockers_candidate_id_idx").on(table.candidateId),
  statusIdx: index("pipeline_blockers_status_idx").on(table.status),
}));

// Pipeline Schemas
export const insertCandidateStageHistorySchema = createInsertSchema(candidateStageHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertCandidateStageHistory = z.infer<typeof insertCandidateStageHistorySchema>;
export type CandidateStageHistory = typeof candidateStageHistory.$inferSelect;

export const insertJobWorkflowConfigSchema = createInsertSchema(jobWorkflowConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertJobWorkflowConfig = z.infer<typeof insertJobWorkflowConfigSchema>;
export type JobWorkflowConfig = typeof jobWorkflowConfigs.$inferSelect;

export const insertPipelineBlockerSchema = createInsertSchema(pipelineBlockers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPipelineBlocker = z.infer<typeof insertPipelineBlockerSchema>;
export type PipelineBlocker = typeof pipelineBlockers.$inferSelect;

// ============================================
// CV TEMPLATES
// ============================================

export const cvTemplates = pgTable("cv_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  isActive: integer("is_active").notNull().default(0),
  rawText: text("raw_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("cv_templates_tenant_id_idx").on(table.tenantId),
  isActiveIdx: index("cv_templates_is_active_idx").on(table.isActive),
}));

export const insertCvTemplateSchema = createInsertSchema(cvTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCvTemplate = z.infer<typeof insertCvTemplateSchema>;
export type CvTemplate = typeof cvTemplates.$inferSelect;

// ============================================
// DOCUMENT TEMPLATES (Offer Letters, Welcome Letters, Handbooks, etc.)
// ============================================

export const documentTemplates = pgTable("document_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  templateType: text("template_type").notNull(), // 'offer_letter', 'welcome_letter', 'employee_handbook', 'nda', 'employment_contract'
  name: text("name").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  isActive: integer("is_active").notNull().default(0),
  rawText: text("raw_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("document_templates_tenant_id_idx").on(table.tenantId),
  templateTypeIdx: index("document_templates_type_idx").on(table.templateType),
  isActiveIdx: index("document_templates_is_active_idx").on(table.isActive),
}));

export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;

// ============================================
// FLEETLOGIX (matches actual database structure)
// ============================================

export const fleetlogixDrivers = pgTable("fleetlogix_drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  idNumber: text("id_number"),
  licenseNumber: text("license_number"),
  licenseType: text("license_type"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  hireDate: date("hire_date"),
  status: text("status").default("active"),
  // Salary fields
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }),
  salaryPeriod: text("salary_period").default("monthly"), // 'monthly', 'weekly', 'daily'
  bonusPerLoad: decimal("bonus_per_load", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFleetlogixDriverSchema = createInsertSchema(fleetlogixDrivers);
export type FleetlogixDriver = typeof fleetlogixDrivers.$inferSelect;
export type InsertFleetlogixDriver = typeof fleetlogixDrivers.$inferInsert;

export const fleetlogixVehicles = pgTable("fleetlogix_vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  registration: text("registration").notNull(),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  vin: text("vin"),
  fleetNumber: text("fleet_number"),
  type: text("type"),
  capacity: decimal("capacity", { precision: 10, scale: 2 }),
  fuelType: text("fuel_type"),
  status: text("status").default("active"),
  purchaseDate: date("purchase_date"),
  lastServiceDate: date("last_service_date"),
  nextServiceDate: date("next_service_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFleetlogixVehicleSchema = createInsertSchema(fleetlogixVehicles);
export type FleetlogixVehicle = typeof fleetlogixVehicles.$inferSelect;
export type InsertFleetlogixVehicle = typeof fleetlogixVehicles.$inferInsert;

export const fleetlogixRoutes = pgTable("fleetlogix_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distance: decimal("distance", { precision: 10, scale: 2 }).notNull(),
  estimatedDuration: integer("estimated_duration"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFleetlogixRouteSchema = createInsertSchema(fleetlogixRoutes);
export type FleetlogixRoute = typeof fleetlogixRoutes.$inferSelect;
export type InsertFleetlogixRoute = typeof fleetlogixRoutes.$inferInsert;

export const fleetlogixLoads = pgTable("fleetlogix_loads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  loadNumber: text("load_number").notNull(),
  driverId: varchar("driver_id").references(() => fleetlogixDrivers.id),
  vehicleId: varchar("vehicle_id").references(() => fleetlogixVehicles.id),
  routeId: varchar("route_id").references(() => fleetlogixRoutes.id),
  loadDate: date("load_date").notNull(),
  deliveryDate: date("delivery_date"),
  cargoDescription: text("cargo_description"),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  expenses: decimal("expenses", { precision: 10, scale: 2 }),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFleetlogixLoadSchema = createInsertSchema(fleetlogixLoads);
export type FleetlogixLoad = typeof fleetlogixLoads.$inferSelect;
export type InsertFleetlogixLoad = typeof fleetlogixLoads.$inferInsert;

export const weighbridgeSlips = pgTable("weighbridge_slips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  ticketNumber: text("ticket_number"),
  vehicleRegistration: text("vehicle_registration"),
  grossWeight: integer("gross_weight"),
  tareWeight: integer("tare_weight"),
  netWeight: integer("net_weight"),
  weighDateTime: timestamp("weigh_date_time"),
  operator: text("operator"),
  product: text("product"),
  customer: text("customer"),
  weighbridgeLocation: text("weighbridge_location"),
  imageUrl: text("image_url"),
  extractedData: jsonb("extracted_data"),
  status: text("status").default("pending"),
  verifiedBy: varchar("verified_by"),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWeighbridgeSlipSchema = createInsertSchema(weighbridgeSlips);
export type WeighbridgeSlip = typeof weighbridgeSlips.$inferSelect;
export type InsertWeighbridgeSlip = typeof weighbridgeSlips.$inferInsert;

// ============================================
// OFFERS MANAGEMENT
// ============================================

export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  salary: text("salary").notNull(),
  currency: text("currency").notNull().default("ZAR"),
  startDate: timestamp("start_date"),
  benefits: jsonb("benefits"),
  status: text("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
  contractType: text("contract_type"),
  documentPath: text("document_path"),
  notes: text("notes"),
  responseToken: varchar("response_token").unique(),
  responseTokenExpiresAt: timestamp("response_token_expires_at"),
  declineReason: text("decline_reason"),
  signedDocumentPath: text("signed_document_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOfferSchema = createInsertSchema(offers, {
  startDate: z.coerce.date().optional().nullable(),
  sentAt: z.coerce.date().optional().nullable(),
  respondedAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  responseTokenExpiresAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;

// ============================================
// CANDIDATE INTEREST CHECKS
// ============================================

export const candidateInterestChecks = pgTable("candidate_interest_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  interestToken: varchar("interest_token").unique(),
  status: text("status").notNull().default("pending"),
  sentVia: text("sent_via"),
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
  cvFilePath: text("cv_file_path"),
  consentGiven: boolean("consent_given").default(false),
  consentText: text("consent_text"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInterestCheckSchema = createInsertSchema(candidateInterestChecks, {
  sentAt: z.coerce.date().optional().nullable(),
  respondedAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterestCheck = z.infer<typeof insertInterestCheckSchema>;
export type InterestCheck = typeof candidateInterestChecks.$inferSelect;
