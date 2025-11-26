import type { IStorage } from "./storage";

export interface ReminderConfig {
  intervalHours: number;
  enabled: boolean;
}

export interface NotificationChannel {
  type: "email" | "sms" | "whatsapp" | "in-app";
  recipient: string;
  message: string;
}

export class ReminderService {
  constructor(private storage: IStorage) {}

  async checkAndSendReminders(): Promise<void> {
    const now = new Date();
    
    // Get ALL tenants to process reminders for each
    const allTenants = await this.storage.getAllTenantConfigs();
    if (allTenants.length === 0) {
      console.warn('No tenant configs found');
      return;
    }
    
    // Iterate through each tenant and check reminders
    for (const tenant of allTenants) {
      try {
        // Get active integrity checks that need reminders for this tenant
        const checksNeedingReminders = await this.storage.getChecksNeedingReminders(tenant.id, now);
        
        for (const check of checksNeedingReminders) {
          try {
            await this.sendReminder(tenant.id, check.id);
          } catch (error) {
            console.error(`[Tenant ${tenant.companyName}] Failed to send reminder for check ${check.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`[Tenant ${tenant.companyName}] Failed to process reminders:`, error);
      }
    }
  }

  async sendReminder(tenantId: string, checkId: string): Promise<void> {
    const check = await this.storage.getIntegrityCheck(tenantId, checkId);
    if (!check) {
      throw new Error(`Check ${checkId} not found`);
    }

    const candidate = await this.storage.getCandidateById(tenantId, check.candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${check.candidateId} not found`);
    }

    // Parse findings to extract missing documents
    let missingDocuments: string[] = [];
    if (check.findings) {
      const findings = typeof check.findings === 'string' 
        ? JSON.parse(check.findings) 
        : check.findings;

      // Extract all missing documents from all agent checks
      Object.values(findings).forEach((agentData: any) => {
        if (agentData?.missingDocuments && Array.isArray(agentData.missingDocuments)) {
          missingDocuments.push(...agentData.missingDocuments);
        }
      });
    }

    // Remove duplicates
    missingDocuments = Array.from(new Set(missingDocuments));

    if (missingDocuments.length === 0) {
      // No missing documents, disable reminders
      await this.storage.updateIntegrityCheck(tenantId, checkId, {
        reminderEnabled: 0,
      });
      return;
    }

    // Send reminder to candidate
    if (candidate.email || candidate.phone) {
      await this.sendCandidateReminder(candidate, missingDocuments);
    }

    // Send reminder to HR (could be logged or sent to admin dashboard)
    await this.sendHRReminder(candidate, missingDocuments, check);

    // Update reminder tracking with defensive fallback for interval
    const now = new Date();
    const intervalHours = check.reminderIntervalHours && check.reminderIntervalHours > 0 
      ? check.reminderIntervalHours 
      : 24; // Safe default
    const nextReminderAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);

    await this.storage.updateIntegrityCheck(tenantId, checkId, {
      remindersSent: (check.remindersSent || 0) + 1,
      lastReminderAt: now,
      nextReminderAt: nextReminderAt,
    });
  }

  private async sendCandidateReminder(candidate: any, missingDocuments: string[]): Promise<void> {
    const message = this.buildCandidateMessage(candidate.fullName, missingDocuments);
    
    // Try different notification channels
    if (candidate.phone && process.env.WHATSAPP_API_TOKEN) {
      await this.sendWhatsAppMessage(candidate.phone, message);
    } else if (candidate.email) {
      await this.sendEmailNotification(candidate.email, "Missing Documents Reminder", message);
    }
  }

  private async sendHRReminder(candidate: any, missingDocuments: string[], check: any): Promise<void> {
    const message = this.buildHRMessage(candidate, missingDocuments, check);
    
    // Log to console for now (could be sent to admin email or dashboard)
    console.log(`[HR REMINDER] ${message}`);
    
    // Store in database for HR dashboard
    // This could be enhanced to send email to HR team
  }

  private buildCandidateMessage(candidateName: string, missingDocuments: string[]): string {
    return `Hi ${candidateName},

This is a reminder that we are still waiting for the following documents for your background check:

${missingDocuments.map((doc, idx) => `${idx + 1}. ${doc}`).join('\n')}

Please submit these documents as soon as possible to continue with your application process.

Thank you,
Avatar Human Capital Team`;
  }

  private buildHRMessage(candidate: any, missingDocuments: string[], check: any): string {
    return `Candidate ${candidate.fullName} (${candidate.email || candidate.phone}) still has ${missingDocuments.length} missing documents for integrity check ${check.id}. 
Documents needed: ${missingDocuments.join(', ')}. 
Reminders sent: ${(check.remindersSent || 0) + 1}`;
  }

  private async sendWhatsAppMessage(phone: string, message: string): Promise<void> {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      console.warn('WhatsApp API not configured');
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`WhatsApp API error: ${error}`);
      }

      console.log(`WhatsApp reminder sent to ${phone}`);
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  private async sendEmailNotification(email: string, subject: string, message: string): Promise<void> {
    // Placeholder for email integration (SendGrid, Resend, etc.)
    // This would be implemented using one of the Replit connectors
    console.log(`Email reminder would be sent to ${email}: ${subject}`);
    console.log(message);
  }

  async configureReminder(tenantId: string, checkId: string, config: Partial<ReminderConfig>): Promise<void> {
    const check = await this.storage.getIntegrityCheck(tenantId, checkId);
    if (!check) {
      throw new Error(`Check ${checkId} not found`);
    }

    const updates: any = {};
    
    // Only update provided values
    if (config.intervalHours !== undefined) {
      updates.reminderIntervalHours = config.intervalHours;
    }
    if (config.enabled !== undefined) {
      updates.reminderEnabled = config.enabled ? 1 : 0;
      
      // If disabling reminders, clear the schedule to prevent stale triggers
      if (!config.enabled) {
        updates.nextReminderAt = null;
        updates.lastReminderAt = null;
      }
    }

    await this.storage.updateIntegrityCheck(tenantId, checkId, updates);

    // Recalculate next reminder time if enabled or interval changed
    const shouldReschedule = config.enabled === true || 
                            (config.enabled !== false && config.intervalHours !== undefined && check.reminderEnabled === 1);
    
    if (shouldReschedule) {
      const currentInterval = config.intervalHours || check.reminderIntervalHours || 24;
      const now = new Date();
      const nextReminderAt = new Date(now.getTime() + currentInterval * 60 * 60 * 1000);
      
      await this.storage.updateIntegrityCheck(tenantId, checkId, {
        nextReminderAt: nextReminderAt,
      });
    }
  }
}
