import { db } from "./db";
import { 
  candidates, 
  jobs, 
  onboardingWorkflows, 
  onboardingAgentLogs, 
  onboardingDocumentRequests,
  tenantConfig
} from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_TENANT_ID = "default";

async function seedOnboardingData() {
  console.log("Starting onboarding data seed...");

  const existingTenant = await db.select().from(tenantConfig).where(eq(tenantConfig.id, DEFAULT_TENANT_ID)).limit(1);
  if (existingTenant.length === 0) {
    console.log("Default tenant not found, creating...");
    await db.insert(tenantConfig).values({
      id: DEFAULT_TENANT_ID,
      companyName: "Avatar Human Capital",
      subdomain: "ahc",
      primaryColor: "#2563eb",
    });
  }

  const existingJobs = await db.select().from(jobs).where(eq(jobs.tenantId, DEFAULT_TENANT_ID)).limit(1);
  let jobId: string;
  
  if (existingJobs.length === 0) {
    const [job] = await db.insert(jobs).values({
      tenantId: DEFAULT_TENANT_ID,
      title: "Senior Software Engineer",
      department: "Engineering",
      location: "Johannesburg, South Africa",
      status: "Active",
      description: "We are looking for an experienced software engineer to join our growing team.",
    }).returning();
    jobId = job.id;
  } else {
    jobId = existingJobs[0].id;
  }

  const candidatesData = [
    {
      fullName: "Thabo Mokoena",
      email: "thabo.mokoena@email.co.za",
      phone: "+27 82 123 4567",
      status: "Hired",
      stage: "Onboarding",
    },
    {
      fullName: "Naledi Dlamini",
      email: "naledi.dlamini@email.co.za",
      phone: "+27 83 234 5678",
      status: "Hired",
      stage: "Onboarding",
    },
    {
      fullName: "Sipho Ndlovu",
      email: "sipho.ndlovu@email.co.za",
      phone: "+27 84 345 6789",
      status: "Hired",
      stage: "Onboarding",
    },
  ];

  for (const candidateData of candidatesData) {
    const existing = await db.select().from(candidates)
      .where(eq(candidates.email, candidateData.email))
      .limit(1);
    
    if (existing.length > 0) {
      console.log(`Candidate ${candidateData.fullName} already exists, skipping...`);
      continue;
    }

    const [candidate] = await db.insert(candidates).values({
      tenantId: DEFAULT_TENANT_ID,
      jobId,
      ...candidateData,
    }).returning();

    console.log(`Created candidate: ${candidate.fullName}`);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 3);

    const completedSteps = candidate.fullName === "Thabo Mokoena" 
      ? ["welcome", "contract_sent", "contract_signed"] 
      : candidate.fullName === "Naledi Dlamini"
      ? ["welcome", "contract_sent"]
      : ["welcome"];

    const [workflow] = await db.insert(onboardingWorkflows).values({
      tenantId: DEFAULT_TENANT_ID,
      candidateId: candidate.id,
      status: candidate.fullName === "Thabo Mokoena" ? "documentation" : 
              candidate.fullName === "Naledi Dlamini" ? "awaiting_documents" : "initiated",
      startDate,
      currentStep: candidate.fullName === "Thabo Mokoena" ? "documentation" : 
                   candidate.fullName === "Naledi Dlamini" ? "documentation" : "welcome",
      tasks: { completedSteps },
    }).returning();

    console.log(`Created workflow: ${workflow.id}`);

    const agentLogs: Array<{
      agentType: string;
      action: string;
      stepName: string;
      status: string;
      details: Record<string, any>;
      communicationChannel: string;
      messageContent?: string;
      requiresHumanReview?: number;
      createdAt: Date;
    }> = [
      {
        agentType: "onboarding_coordinator",
        action: "workflow_initiated",
        stepName: "welcome",
        status: "success",
        details: { candidateName: candidate.fullName, jobTitle: "Senior Software Engineer" },
        communicationChannel: "system",
        createdAt: startDate,
      },
      {
        agentType: "welcome_agent",
        action: "welcome_message_sent",
        stepName: "welcome",
        status: "success",
        details: { channel: "whatsapp", messageId: `msg_${Date.now()}` },
        communicationChannel: "whatsapp",
        messageContent: `Welcome to Avatar Human Capital, ${candidate.fullName}! We're excited to have you join our team.`,
        createdAt: new Date(startDate.getTime() + 1000 * 60 * 5),
      },
      {
        agentType: "contract_agent",
        action: "contract_generated",
        stepName: "contract",
        status: "success",
        details: { contractType: "permanent", salary: "R950,000" },
        communicationChannel: "system",
        createdAt: new Date(startDate.getTime() + 1000 * 60 * 30),
      },
      {
        agentType: "contract_agent",
        action: "contract_sent",
        stepName: "contract",
        status: "success",
        details: { method: "email", recipient: candidate.email },
        communicationChannel: "email",
        messageContent: "Your employment contract is attached. Please review and sign electronically.",
        createdAt: new Date(startDate.getTime() + 1000 * 60 * 35),
      },
    ];

    if (candidate.fullName === "Thabo Mokoena") {
      agentLogs.push({
        agentType: "contract_agent",
        action: "contract_signed",
        stepName: "contract",
        status: "success",
        details: { signedAt: new Date(startDate.getTime() + 1000 * 60 * 60 * 24).toISOString() },
        communicationChannel: "system",
        createdAt: new Date(startDate.getTime() + 1000 * 60 * 60 * 24),
      });
      agentLogs.push({
        agentType: "document_collector",
        action: "documents_requested",
        stepName: "documentation",
        status: "success",
        details: { documentCount: 7, documents: ["ID", "Proof of Address", "Tax Number", "Bank Details", "Qualifications", "Contract", "NDA"] },
        communicationChannel: "whatsapp",
        messageContent: "Please submit the required onboarding documents.",
        createdAt: new Date(startDate.getTime() + 1000 * 60 * 60 * 25),
      });
    }

    if (candidate.fullName === "Naledi Dlamini") {
      agentLogs.push({
        agentType: "reminder",
        action: "reminder_sent",
        stepName: "contract",
        status: "success",
        details: { reminderCount: 1, reason: "Contract not signed" },
        communicationChannel: "whatsapp",
        messageContent: "Reminder: Please sign your employment contract at your earliest convenience.",
        createdAt: new Date(startDate.getTime() + 1000 * 60 * 60 * 48),
      });
      agentLogs.push({
        agentType: "reminder",
        action: "reminder_sent",
        stepName: "contract",
        status: "success",
        details: { reminderCount: 2, reason: "Contract still not signed" },
        communicationChannel: "whatsapp",
        messageContent: "Second reminder: Your employment contract is still awaiting signature.",
        createdAt: new Date(startDate.getTime() + 1000 * 60 * 60 * 72),
      });
    }

    if (candidate.fullName === "Sipho Ndlovu") {
      agentLogs.push({
        agentType: "escalation",
        action: "escalated_to_human",
        stepName: "contract",
        status: "requires_intervention",
        details: { reason: "Maximum reminders reached", remindersSent: 3 },
        communicationChannel: "system",
        requiresHumanReview: 1,
        createdAt: new Date(startDate.getTime() + 1000 * 60 * 60 * 96),
      });
    }

    for (const log of agentLogs) {
      await db.insert(onboardingAgentLogs).values({
        tenantId: DEFAULT_TENANT_ID,
        workflowId: workflow.id,
        candidateId: candidate.id,
        agentType: log.agentType,
        action: log.action,
        stepName: log.stepName,
        status: log.status,
        details: log.details,
        communicationChannel: log.communicationChannel,
        messageContent: log.messageContent,
        requiresHumanReview: log.requiresHumanReview || 0,
        createdAt: log.createdAt,
      });
    }

    console.log(`Created ${agentLogs.length} agent logs for ${candidate.fullName}`);

    const documentRequests = [
      { documentType: "id_document", documentName: "ID Document", description: "Valid South African ID or Passport", isRequired: 1, priority: "urgent", dueDays: 3 },
      { documentType: "proof_of_address", documentName: "Proof of Address", description: "Recent utility bill or bank statement", isRequired: 1, priority: "high", dueDays: 5 },
      { documentType: "tax_form", documentName: "Tax Number (ITR5)", description: "SARS tax registration number", isRequired: 1, priority: "high", dueDays: 5 },
      { documentType: "bank_details", documentName: "Bank Account Details", description: "Bank account for salary payments", isRequired: 1, priority: "high", dueDays: 5 },
      { documentType: "qualification", documentName: "Qualification Certificates", description: "Highest qualification certificates", isRequired: 0, priority: "normal", dueDays: 7 },
      { documentType: "contract", documentName: "Signed Employment Contract", description: "Signed copy of the employment contract", isRequired: 1, priority: "urgent", dueDays: 3 },
      { documentType: "nda", documentName: "Non-Disclosure Agreement", description: "Signed NDA document", isRequired: 1, priority: "high", dueDays: 5 },
    ];

    for (let i = 0; i < documentRequests.length; i++) {
      const doc = documentRequests[i];
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + doc.dueDays);
      
      const nextReminderAt = new Date(dueDate);
      nextReminderAt.setDate(nextReminderAt.getDate() - 1);

      let status = "requested";
      let receivedAt: Date | undefined;
      let verifiedAt: Date | undefined;
      let reminderCount = 0;

      if (candidate.fullName === "Thabo Mokoena") {
        if (i < 3) {
          status = "verified";
          receivedAt = new Date(startDate.getTime() + 1000 * 60 * 60 * 30);
          verifiedAt = new Date(startDate.getTime() + 1000 * 60 * 60 * 32);
        } else if (i < 5) {
          status = "received";
          receivedAt = new Date(startDate.getTime() + 1000 * 60 * 60 * 48);
        }
      } else if (candidate.fullName === "Naledi Dlamini") {
        if (i === 0) {
          status = "received";
          receivedAt = new Date(startDate.getTime() + 1000 * 60 * 60 * 24);
        } else {
          reminderCount = 1;
        }
      } else if (candidate.fullName === "Sipho Ndlovu") {
        if (i < 2) {
          status = "overdue";
          reminderCount = 3;
        } else {
          status = "pending";
        }
      }

      await db.insert(onboardingDocumentRequests).values({
        tenantId: DEFAULT_TENANT_ID,
        workflowId: workflow.id,
        candidateId: candidate.id,
        documentType: doc.documentType,
        documentName: doc.documentName,
        description: doc.description,
        isRequired: doc.isRequired,
        status,
        priority: doc.priority,
        dueDate,
        nextReminderAt,
        maxReminders: 3,
        reminderCount,
        requestedAt: startDate,
        requestedVia: "whatsapp",
        receivedAt,
        verifiedAt,
      });
    }

    console.log(`Created ${documentRequests.length} document requests for ${candidate.fullName}`);
  }

  console.log("Onboarding data seed completed!");
}

seedOnboardingData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
