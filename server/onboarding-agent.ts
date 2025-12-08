import type { IStorage } from "./storage";
import type { Candidate, OnboardingWorkflow, OnboardingAgentLog, OnboardingDocumentRequest } from "@shared/schema";

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

  constructor(storage: IStorage) {
    this.storage = storage;
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
      verifiedBy,
    });

    if (updated) {
      await this.logStep(tenantId, request.workflowId, request.candidateId, 'document_collector', 'document_verified', {
        stepName: 'documentation',
        details: { documentType: request.documentType, verifiedBy },
        targetEntity: 'hr_staff',
        targetEntityId: verifiedBy,
        communicationChannel: 'system',
      });
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

    await this.logStep(tenantId, request.workflowId, request.candidateId, 'reminder', 'reminder_sent', {
      stepName: 'documentation',
      status: 'success',
      details: { documentType: request.documentType, reminderCount, maxReminders },
      targetEntity: 'candidate',
      targetEntityId: request.candidateId,
      communicationChannel: channel,
      messageContent: message,
    });

    return { sent: true, escalated: false };
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
    }

    return { complete, pending, received, verified };
  }

  async processOverdueDocuments(tenantId: string): Promise<{ processed: number; escalated: number }> {
    const overdue = await this.storage.getOverdueDocumentRequests(tenantId);
    let escalated = 0;

    for (const request of overdue) {
      const result = await this.sendReminder(tenantId, request.id, 'whatsapp');
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
        await this.sendReminder(tenantId, request.id, 'whatsapp');
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
