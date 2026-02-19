import type { IStorage } from "./storage";
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export class EmailService {
  private storage: IStorage;
  private transporter: nodemailer.Transporter | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (smtpHost && smtpUser && smtpPassword) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587", 10),
        secure: parseInt(smtpPort || "587", 10) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
      console.log(`[EmailService] SMTP configured: ${smtpHost}:${smtpPort || 587}`);
    } else {
      console.log("[EmailService] SMTP not configured - emails will be logged to console only");
    }
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
      // Apply dev override
      const actualTo = process.env.DEV_TEST_EMAIL || options.to;
      if (process.env.DEV_TEST_EMAIL && process.env.DEV_TEST_EMAIL !== options.to) {
        console.log(`[EmailService] DEV_TEST_EMAIL override: ${options.to} -> ${actualTo}`);
      }

      if (this.transporter) {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@avatarhuman.capital",
          to: actualTo,
          subject: options.subject,
          text: options.body,
          html: options.html,
        });
        console.log(`[EmailService] Email sent to ${actualTo}: ${options.subject}`);
      } else {
        console.log("\n=== EMAIL NOTIFICATION (console only - SMTP not configured) ===");
        console.log(`To: ${actualTo}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Body:\n${options.body}`);
        if (options.html) console.log(`HTML: (included)`);
        console.log("========================\n");
      }

      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }

  async sendInterviewInvitation(options: {
    to: string;
    candidateName: string;
    jobTitle: string;
    interviewUrl: string;
  }): Promise<boolean> {
    const { to, candidateName, jobTitle, interviewUrl } = options;

    const subject = `Interview Invitation: ${jobTitle} - AHC Recruiting`;

    const body = `Dear ${candidateName},

We are impressed with your profile and would like to invite you to an initial voice interview for the ${jobTitle} position.

This AI-powered interview allows us to get to know you better at your convenience. Please click the link below to start the session:

${interviewUrl}

This link expires in 7 days. Please ensure you have a quiet environment and allow microphone access in your browser.

Best regards,
AHC Recruiting Team`;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0d9488, #2563eb); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Voice Interview Invitation</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${jobTitle}</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; color: #374151;">Dear ${candidateName},</p>
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
      We are impressed with your profile and would like to invite you to an initial voice interview for the <strong>${jobTitle}</strong> position.
    </p>
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
      This AI-powered interview allows us to get to know you better at your convenience.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${interviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #2563eb); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">
        Start Interview
      </a>
    </div>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px 0;">
        <strong>Before you start:</strong>
      </p>
      <ul style="font-size: 13px; color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>This link expires in 7 days</li>
        <li>Ensure you have a quiet environment</li>
        <li>Allow microphone access in your browser</li>
      </ul>
    </div>
    <p style="font-size: 14px; color: #6b7280;">Best regards,<br><strong>AHC Recruiting Team</strong></p>
  </div>
</div>`;

    return this.sendEmail({ to, subject, body, html });
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
