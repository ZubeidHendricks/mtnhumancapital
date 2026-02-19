import { Resend } from 'resend';
import type { IStorage } from "./storage";

// Resend integration - credentials managed by Replit connector
let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('Resend connector token not available');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected');
  }

  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

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
      const { client, fromEmail } = await getResendClient();

      const result = await client.emails.send({
        from: fromEmail || 'MTN Human Capital <onboarding@resend.dev>',
        to: options.to,
        subject: options.subject,
        html: options.html || options.body.replace(/\n/g, '<br>'),
        text: options.body,
      });

      if (result.error) {
        console.error("Resend error:", result.error);
        return false;
      }

      console.log(`Email sent successfully to ${options.to} (ID: ${result.data?.id})`);
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
- Welcome package sent
- Employee handbook distributed
- Benefits summary provided
- Tax and banking forms pending
- IT provisioning in progress
- Orientation scheduling

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
- Welcome package sent
- Employee handbook distributed
- Benefits summary provided
- Tax and banking forms processed
- IT provisioning completed
- Orientation scheduled for ${orientationDate}

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
