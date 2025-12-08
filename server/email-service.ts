import type { IStorage } from "./storage";

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export class EmailService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async getITEmail(): Promise<string | null> {
    const setting = await this.storage.getSystemSetting("it_email");
    return setting?.value || null;
  }

  async getHRAdminEmail(): Promise<string | null> {
    const setting = await this.storage.getSystemSetting("hr_admin_email");
    return setting?.value || null;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log("\n=== EMAIL NOTIFICATION ===");
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body:\n${options.body}`);
      console.log("========================\n");

      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }

  async notifyITForProvisioning(candidateName: string, candidateEmail: string, credentials: any): Promise<void> {
    const itEmail = await this.getITEmail();
    if (!itEmail) {
      console.log("IT email not configured, skipping notification");
      return;
    }

    const subject = `New Employee IT Provisioning Required: ${candidateName}`;
    const body = `A new employee onboarding has been initiated and requires IT provisioning.

Employee Details:
- Name: ${candidateName}
- Email: ${candidateEmail}

System Access Required:
- Corporate Email: ${credentials.email || "Pending"}
- VPN Access: ${credentials.vpnKey || "Pending"}
- Slack Workspace: ${credentials.slackInvite || "Pending"}

Equipment:
- MacBook Pro M3
- External Monitor
- Keyboard & Mouse

Please process these requests and confirm when ready.

This is an automated notification from the AHC Onboarding System.`;

    await this.sendEmail({
      to: itEmail,
      subject,
      body,
    });
  }

  async notifyHRForOnboardingStart(candidateName: string, candidateEmail: string, role: string): Promise<void> {
    const hrEmail = await this.getHRAdminEmail();
    if (!hrEmail) {
      console.log("HR admin email not configured, skipping notification");
      return;
    }

    const subject = `Onboarding Initiated: ${candidateName}`;
    const body = `A new employee onboarding workflow has been started.

Employee Details:
- Name: ${candidateName}
- Email: ${candidateEmail}
- Role: ${role || "Not specified"}

Workflow Status: In Progress

Tasks Initiated:
✓ Welcome package sent
✓ Employee handbook distributed
✓ Benefits summary provided
⏳ Tax and banking forms pending
⏳ IT provisioning in progress
⏳ Orientation scheduling

You can monitor the onboarding progress in the AHC dashboard.

This is an automated notification from the AHC Onboarding System.`;

    await this.sendEmail({
      to: hrEmail,
      subject,
      body,
    });
  }

  async notifyHRForOnboardingCompletion(candidateName: string, candidateEmail: string, orientationDate: string): Promise<void> {
    const hrEmail = await this.getHRAdminEmail();
    if (!hrEmail) {
      console.log("HR admin email not configured, skipping notification");
      return;
    }

    const subject = `Onboarding Complete: ${candidateName}`;
    const body = `Employee onboarding has been successfully completed.

Employee Details:
- Name: ${candidateName}
- Email: ${candidateEmail}

Completed Tasks:
✅ Welcome package sent
✅ Employee handbook distributed
✅ Benefits summary provided
✅ Tax and banking forms processed
✅ IT provisioning completed
✅ Orientation scheduled for ${orientationDate}

The employee is ready for their first day. Please ensure all final preparations are in place.

This is an automated notification from the AHC Onboarding System.`;

    await this.sendEmail({
      to: hrEmail,
      subject,
      body,
    });
  }

  async notifyITForDocumentRequest(candidateName: string, documentType: string): Promise<void> {
    const itEmail = await this.getITEmail();
    if (!itEmail) {
      return;
    }

    const subject = `Document Request: ${documentType} for ${candidateName}`;
    const body = `A document is required for new employee onboarding.

Employee: ${candidateName}
Document Type: ${documentType}

Please prepare and send the requested document.

This is an automated notification from the AHC Onboarding System.`;

    await this.sendEmail({
      to: itEmail,
      subject,
      body,
    });
  }
}
