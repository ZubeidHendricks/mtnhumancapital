import { format } from "date-fns";
import type { IStorage } from "./storage";
import type { Candidate, OnboardingWorkflow, OnboardingAgentLog, OnboardingDocumentRequest } from "@shared/schema";
import { EmailService } from "./email-service";

interface DocumentRequirement {
  documentType: string;
  documentName: string;
  description: string;
  isRequired: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDays: number;
}

const STANDARD_ONBOARDING_DOCUMENTS: DocumentRequirement[] = [
  { documentType: 'id_document', documentName: 'ID Document', description: 'Valid South African ID or Passport', isRequired: true, priority: 'urgent', dueDays: 3 },
  { documentType: 'proof_of_address', documentName: 'Proof of Address', description: 'Recent utility bill or bank statement (not older than 3 months)', isRequired: true, priority: 'high', dueDays: 5 },
  { documentType: 'tax_form', documentName: 'Tax Number (ITR5)', description: 'SARS tax registration number', isRequired: true, priority: 'high', dueDays: 5 },
  { documentType: 'bank_details', documentName: 'Bank Account Details', description: 'Bank account for salary payments', isRequired: true, priority: 'high', dueDays: 5 },
  { documentType: 'qualification', documentName: 'Qualification Certificates', description: 'Highest qualification certificates', isRequired: false, priority: 'normal', dueDays: 7 },
  { documentType: 'contract', documentName: 'Signed Employment Contract', description: 'Signed copy of the employment contract', isRequired: true, priority: 'urgent', dueDays: 3 },
  { documentType: 'nda', documentName: 'Non-Disclosure Agreement', description: 'Signed NDA document', isRequired: true, priority: 'high', dueDays: 5 },
];

export class OnboardingAgent {
  private storage: IStorage;
  private emailService: EmailService;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.emailService = new EmailService(storage);
  }

  async logStep(
    tenantId: string,
    workflowId: string,
    candidateId: string,
    agentType: string,
    action: string,
    options: {
      stepName?: string;
      status?: 'success' | 'failed' | 'pending' | 'requires_intervention';
      details?: Record<string, any>;
      targetEntity?: string;
      targetEntityId?: string;
      communicationChannel?: 'whatsapp' | 'email' | 'system' | 'manual';
      messageContent?: string;
      responseReceived?: string;
      errorMessage?: string;
      requiresHumanReview?: boolean;
    } = {}
  ): Promise<OnboardingAgentLog> {
    const log = await this.storage.createOnboardingAgentLog(tenantId, {
      workflowId,
      candidateId,
      agentType,
      action,
      stepName: options.stepName,
      status: options.status || 'success',
      details: options.details as any,
      targetEntity: options.targetEntity,
      targetEntityId: options.targetEntityId,
      communicationChannel: options.communicationChannel,
      messageContent: options.messageContent,
      responseReceived: options.responseReceived,
      errorMessage: options.errorMessage,
      requiresHumanReview: options.requiresHumanReview ? 1 : 0,
    });

    console.log(`[ONBOARDING AGENT] ${agentType}: ${action} - ${options.status || 'success'}`);
    return log;
  }

  async initializeDocumentRequests(
    tenantId: string,
    workflowId: string,
    candidateId: string,
    customDocuments?: DocumentRequirement[]
  ): Promise<OnboardingDocumentRequest[]> {
    const documents = customDocuments || STANDARD_ONBOARDING_DOCUMENTS;
    const requests: OnboardingDocumentRequest[] = [];
    const now = new Date();

    for (const doc of documents) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + doc.dueDays);
      
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - 1);

      const request = await this.storage.createOnboardingDocumentRequest(tenantId, {
        workflowId,
        candidateId,
        documentType: doc.documentType,
        documentName: doc.documentName,
        description: doc.description,
        isRequired: doc.isRequired ? 1 : 0,
        status: 'pending',
        priority: doc.priority,
        dueDate,
        nextReminderAt: reminderDate,
        maxReminders: 3,
      });
      requests.push(request);

      await this.logStep(tenantId, workflowId, candidateId, 'document_collector', 'document_request_created', {
        stepName: 'documentation',
        details: { documentType: doc.documentType, documentName: doc.documentName, dueDate: dueDate.toISOString() },
        targetEntity: 'candidate',
        targetEntityId: candidateId,
      });
    }

    return requests;
  }

  async requestDocuments(
    tenantId: string,
    workflowId: string,
    candidateId: string,
    channel: 'whatsapp' | 'email'
  ): Promise<void> {
    const requests = await this.storage.getOnboardingDocumentRequests(tenantId, workflowId);
    const pendingRequests = requests.filter(r => r.status === 'pending');

    if (pendingRequests.length === 0) {
      return;
    }

    const documentList = pendingRequests.map(r => `- ${r.documentName}: ${r.description}`).join('\n');
    const message = `Hello! As part of your onboarding process, we need the following documents:\n\n${documentList}\n\nPlease submit these at your earliest convenience. Thank you!`;

    for (const request of pendingRequests) {
      await this.storage.updateOnboardingDocumentRequest(tenantId, request.id, {
        status: 'requested',
        requestedAt: new Date(),
        requestedVia: channel,
      });
    }

    await this.logStep(tenantId, workflowId, candidateId, 'document_collector', 'documents_requested', {
      stepName: 'documentation',
      details: { documentCount: pendingRequests.length, documents: pendingRequests.map(r => r.documentType) },
      targetEntity: 'candidate',
      targetEntityId: candidateId,
      communicationChannel: channel,
      messageContent: message,
    });
  }

  async markDocumentReceived(
    tenantId: string,
    requestId: string,
    receivedDocumentId?: string
  ): Promise<OnboardingDocumentRequest | undefined> {
    const request = await this.storage.getOnboardingDocumentRequest(tenantId, requestId);
    if (!request) return undefined;

    const updated = await this.storage.updateOnboardingDocumentRequest(tenantId, requestId, {
      status: 'received',
      receivedAt: new Date(),
      receivedDocumentId,
    });

    if (updated) {
      await this.logStep(tenantId, request.workflowId, request.candidateId, 'document_collector', 'document_received', {
        stepName: 'documentation',
        details: { documentType: request.documentType, documentName: request.documentName },
        targetEntity: 'candidate',
        targetEntityId: request.candidateId,
        communicationChannel: 'system',
      });

      await this.checkDocumentCompletion(tenantId, request.workflowId, request.candidateId);
    }

    return updated;
  }

  async markDocumentVerified(
    tenantId: string,
    requestId: string,
    verifiedBy: string
  ): Promise<OnboardingDocumentRequest | undefined> {
    const request = await this.storage.getOnboardingDocumentRequest(tenantId, requestId);
    if (!request) return undefined;

    const updated = await this.storage.updateOnboardingDocumentRequest(tenantId, requestId, {
      status: 'verified',
      verifiedAt: new Date(),
      metadata: { ...(request.metadata as any || {}), verifiedByName: verifiedBy },
    });

    if (updated) {
      await this.logStep(tenantId, request.workflowId, request.candidateId, 'document_collector', 'document_verified', {
        stepName: 'documentation',
        details: { documentType: request.documentType, documentName: request.documentName, verifiedBy },
        targetEntity: 'hr_staff',
        targetEntityId: verifiedBy,
        communicationChannel: 'system',
      });

      await this.checkDocumentCompletion(tenantId, request.workflowId, request.candidateId);
    }

    return updated;
  }

  async sendReminder(
    tenantId: string,
    requestId: string,
    channel: 'whatsapp' | 'email'
  ): Promise<{ sent: boolean; escalated: boolean }> {
    const request = await this.storage.getOnboardingDocumentRequest(tenantId, requestId);
    if (!request) return { sent: false, escalated: false };

    // Skip reminders for documents already received or verified
    if (request.status === 'received' || request.status === 'verified') {
      return { sent: false, escalated: false };
    }

    const reminderCount = (request.reminderCount || 0) + 1;
    const maxReminders = request.maxReminders || 3;

    if (reminderCount > maxReminders) {
      return await this.escalateToHuman(tenantId, requestId, 'Maximum reminders reached without response');
    }

    const nextReminderAt = new Date();
    nextReminderAt.setDate(nextReminderAt.getDate() + 2);

    const message = `Reminder: We still need your ${request.documentName} for your onboarding. Please submit it as soon as possible. This is reminder ${reminderCount} of ${maxReminders}.`;

    await this.storage.updateOnboardingDocumentRequest(tenantId, requestId, {
      reminderCount,
      lastReminderAt: new Date(),
      nextReminderAt,
    });

    // Actually send the reminder via email
    try {
      const candidate = await this.storage.getCandidateById(tenantId, request.candidateId);
      if (candidate?.email) {
        const dueInfo = request.dueDate
          ? `Due date: ${format(new Date(request.dueDate), 'dd MMM yyyy')}`
          : '';

        // Look up workflow for upload portal link
        const workflow = await this.storage.getOnboardingWorkflow(tenantId, request.workflowId);
        const uploadPortalUrl = workflow?.uploadToken && workflow?.uploadTokenExpiresAt && new Date(workflow.uploadTokenExpiresAt) > new Date()
          ? `${process.env.BASE_URL || 'http://localhost:5000'}/onboarding-upload/${workflow.uploadToken}`
          : null;
        const uploadButtonHtml = uploadPortalUrl
          ? `<div style="text-align:center;margin:16px 0;">
      <a href="${uploadPortalUrl}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#2563eb);color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;">Upload Your Document</a>
    </div>`
          : '';
        const uploadTextInfo = uploadPortalUrl
          ? `\n\nYou can upload your document here: ${uploadPortalUrl}`
          : '';

        await this.emailService.sendEmail({
          to: candidate.email,
          subject: `Document Reminder: ${request.documentName} - Onboarding`,
          body: message + uploadTextInfo,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:20px;">
    <h2 style="color:#92400e;margin:0 0 10px 0;">Document Reminder</h2>
    <p style="color:#374151;">Hi ${candidate.fullName},</p>
    <p style="color:#374151;">${message}</p>
    ${dueInfo ? `<p style="color:#dc2626;font-weight:bold;">${dueInfo}</p>` : ''}
    ${uploadButtonHtml}
    <p style="color:#6b7280;font-size:13px;margin-top:16px;">If you have any questions, please contact HR.</p>
  </div>
</div>`,
        });
      }
    } catch (error) {
      console.error(`[ONBOARDING AGENT] Failed to send reminder email for ${request.documentName}:`, error);
    }

    await this.logStep(tenantId, request.workflowId, request.candidateId, 'reminder', 'reminder_sent', {
      stepName: 'documentation',
      status: 'success',
      details: { documentType: request.documentType, documentName: request.documentName, reminderCount, maxReminders },
      targetEntity: 'candidate',
      targetEntityId: request.candidateId,
      communicationChannel: channel,
      messageContent: message,
    });

    return { sent: true, escalated: false };
  }

  async sendBulkReminder(
    tenantId: string,
    workflowId: string
  ): Promise<{ sent: number; escalated: number }> {
    const requests = await this.storage.getOnboardingDocumentRequests(tenantId, workflowId);
    const outstanding = requests.filter(r => r.status === 'pending' || r.status === 'requested' || r.status === 'overdue');

    if (outstanding.length === 0) {
      return { sent: 0, escalated: 0 };
    }

    // Check if any have exceeded max reminders
    let escalatedCount = 0;
    const toRemind: typeof outstanding = [];
    for (const req of outstanding) {
      const reminderCount = (req.reminderCount || 0) + 1;
      const maxReminders = req.maxReminders || 3;
      if (reminderCount > maxReminders) {
        await this.escalateToHuman(tenantId, req.id, 'Maximum reminders reached without response');
        escalatedCount++;
      } else {
        toRemind.push(req);
      }
    }

    if (toRemind.length === 0) {
      return { sent: 0, escalated: escalatedCount };
    }

    const candidateId = toRemind[0].candidateId;
    const candidate = await this.storage.getCandidateById(tenantId, candidateId);

    // Build consolidated message
    const docListText = toRemind.map(r => {
      const dueDate = r.dueDate ? format(new Date(r.dueDate), 'dd MMM yyyy') : 'ASAP';
      return `- ${r.documentName} (Due: ${dueDate})`;
    }).join('\n');

    const message = `Reminder: We still need the following documents for your onboarding:\n\n${docListText}\n\nPlease submit them as soon as possible.`;

    // Update DB for each request
    const now = new Date();
    const nextReminderAt = new Date();
    nextReminderAt.setDate(nextReminderAt.getDate() + 2);

    for (const req of toRemind) {
      await this.storage.updateOnboardingDocumentRequest(tenantId, req.id, {
        reminderCount: (req.reminderCount || 0) + 1,
        lastReminderAt: now,
        nextReminderAt,
      });
    }

    // Send one consolidated email
    if (candidate?.email) {
      const docListHtml = toRemind.map(r => {
        const dueDate = r.dueDate ? format(new Date(r.dueDate), 'dd MMM yyyy') : 'ASAP';
        const priorityBadge = r.priority === 'urgent' ? ' <span style="color:#dc2626;">(Urgent)</span>' :
                             r.priority === 'high' ? ' <span style="color:#ea580c;">(High Priority)</span>' : '';
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.documentName}${priorityBadge}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${r.description || ''}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${dueDate}</td>
        </tr>`;
      }).join('');

      try {
        await this.emailService.sendEmail({
          to: candidate.email,
          subject: `Document Reminder: ${toRemind.length} Outstanding Document${toRemind.length > 1 ? 's' : ''} - Onboarding`,
          body: `Hi ${candidate.fullName},\n\n${message}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:20px;">
    <h2 style="color:#92400e;margin:0 0 10px 0;">Document Reminder</h2>
    <p style="color:#374151;">Hi ${candidate.fullName},</p>
    <p style="color:#374151;">We still need the following documents for your onboarding:</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
      <thead><tr style="background:#fef3c7;">
        <th style="padding:8px 12px;text-align:left;">Document</th>
        <th style="padding:8px 12px;text-align:left;">Details</th>
        <th style="padding:8px 12px;text-align:left;">Due Date</th>
      </tr></thead>
      <tbody>${docListHtml}</tbody>
    </table>
    <p style="color:#6b7280;font-size:13px;">Please reply to this email or contact HR to submit your documents.</p>
  </div>
</div>`,
        });
      } catch (error) {
        console.error(`[ONBOARDING AGENT] Failed to send bulk reminder email:`, error);
      }
    }

    // Log one consolidated action
    await this.logStep(tenantId, workflowId, candidateId, 'reminder', 'bulk_reminder_sent', {
      stepName: 'documentation',
      status: 'success',
      details: { documentCount: toRemind.length, documents: toRemind.map(r => r.documentType) },
      targetEntity: 'candidate',
      targetEntityId: candidateId,
      communicationChannel: 'email',
      messageContent: message,
    });

    return { sent: toRemind.length, escalated: escalatedCount };
  }

  async escalateToHuman(
    tenantId: string,
    requestId: string,
    reason: string
  ): Promise<{ sent: boolean; escalated: boolean }> {
    const request = await this.storage.getOnboardingDocumentRequest(tenantId, requestId);
    if (!request) return { sent: false, escalated: false };

    await this.storage.updateOnboardingDocumentRequest(tenantId, requestId, {
      status: 'overdue',
      escalatedAt: new Date(),
      escalationReason: reason,
    });

    await this.logStep(tenantId, request.workflowId, request.candidateId, 'escalation', 'escalated_to_human', {
      stepName: 'documentation',
      status: 'requires_intervention',
      details: { 
        documentType: request.documentType, 
        documentName: request.documentName,
        reason,
        remindersSent: request.reminderCount,
      },
      targetEntity: 'hr_manager',
      communicationChannel: 'system',
      requiresHumanReview: true,
    });

    console.log(`[ESCALATION] Document ${request.documentName} for candidate ${request.candidateId} escalated: ${reason}`);
    
    return { sent: false, escalated: true };
  }

  async checkDocumentCompletion(
    tenantId: string,
    workflowId: string,
    candidateId: string
  ): Promise<{ complete: boolean; pending: number; received: number; verified: number }> {
    const requests = await this.storage.getOnboardingDocumentRequests(tenantId, workflowId);
    const requiredDocs = requests.filter(r => r.isRequired === 1);
    
    const pending = requiredDocs.filter(r => r.status === 'pending' || r.status === 'requested').length;
    const received = requiredDocs.filter(r => r.status === 'received').length;
    const verified = requiredDocs.filter(r => r.status === 'verified').length;
    const complete = pending === 0 && requiredDocs.length > 0;

    if (complete) {
      await this.logStep(tenantId, workflowId, candidateId, 'document_collector', 'all_documents_received', {
        stepName: 'documentation',
        status: 'success',
        details: { totalRequired: requiredDocs.length, verified },
        communicationChannel: 'system',
      });

      // Auto-complete workflow when all required documents are verified
      const allVerified = requiredDocs.every(r => r.status === 'verified');
      if (allVerified) {
        const workflow = await this.storage.getOnboardingWorkflow(tenantId, workflowId);
        if (workflow && workflow.status !== 'Completed') {
          await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
            status: 'Completed',
            completedAt: new Date(),
          });
          await this.logStep(tenantId, workflowId, candidateId, 'workflow_manager', 'workflow_completed', {
            stepName: 'completion',
            status: 'success',
            details: { reason: 'All required documents verified' },
            communicationChannel: 'system',
          });

          // Notify HR of onboarding completion
          try {
            const candidate = await this.storage.getCandidateById(tenantId, candidateId);
            if (candidate) {
              await this.emailService.notifyHRForOnboardingCompletion(
                candidate.fullName,
                candidate.email || 'N/A',
                'All documents verified'
              );
            }
          } catch (e) {
            console.error("Failed to send HR completion notification:", e);
          }
        }
      }
    }

    return { complete, pending, received, verified };
  }

  async processOverdueDocuments(tenantId: string): Promise<{ processed: number; escalated: number }> {
    const overdue = await this.storage.getOverdueDocumentRequests(tenantId);
    let escalated = 0;

    for (const request of overdue) {
      const result = await this.sendReminder(tenantId, request.id, 'email');
      if (result.escalated) {
        escalated++;
      }
    }

    return { processed: overdue.length, escalated };
  }

  async processScheduledReminders(tenantId: string): Promise<number> {
    const pending = await this.storage.getPendingDocumentRequests(tenantId);
    const now = new Date();
    let remindersSent = 0;

    for (const request of pending) {
      if (request.nextReminderAt && new Date(request.nextReminderAt) <= now) {
        await this.sendReminder(tenantId, request.id, 'email');
        remindersSent++;
      }
    }

    return remindersSent;
  }

  async getAgentActivitySummary(tenantId: string, workflowId: string): Promise<{
    totalSteps: number;
    byAgent: Record<string, number>;
    byStatus: Record<string, number>;
    requiresReview: number;
  }> {
    const logs = await this.storage.getOnboardingAgentLogs(tenantId, workflowId);
    
    const byAgent: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let requiresReview = 0;

    for (const log of logs) {
      byAgent[log.agentType] = (byAgent[log.agentType] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
      if (log.requiresHumanReview === 1) {
        requiresReview++;
      }
    }

    return {
      totalSteps: logs.length,
      byAgent,
      byStatus,
      requiresReview,
    };
  }

  async getHumanInterventionQueue(tenantId: string): Promise<OnboardingAgentLog[]> {
    return await this.storage.getOnboardingAgentLogsRequiringReview(tenantId);
  }

  async resolveHumanIntervention(
    tenantId: string,
    logId: string,
    reviewedBy: string,
    notes: string
  ): Promise<OnboardingAgentLog | undefined> {
    return await this.storage.updateOnboardingAgentLog(tenantId, logId, {
      requiresHumanReview: 0,
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: notes,
    });
  }
}

export const createOnboardingAgent = (storage: IStorage) => new OnboardingAgent(storage);
