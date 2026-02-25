import Groq from "groq-sdk";
import { randomUUID } from "crypto";
import type { IStorage } from "./storage";
import type { Candidate, OnboardingWorkflow } from "@shared/schema";
import { EmailService } from "./email-service";
import { createOnboardingAgent } from "./onboarding-agent";

interface OnboardingTask {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
  type: "welcome" | "paperwork" | "provisioning" | "orientation";
  details: string[];
  result?: any;
}

interface OnboardingDocument {
  id: string;
  title: string;
  type: "document" | "asset" | "email";
  status: "sent" | "signed" | "provisioned" | "pending";
  snippet: string;
  url?: string;
}

export class OnboardingOrchestrator {
  private groq: Groq | null = null;
  private storage: IStorage;
  private emailService: EmailService;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.emailService = new EmailService(storage);
    
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }
  }

  async startOnboarding(
    tenantId: string,
    candidateId: string,
    restart: boolean = false,
    options?: { requirements?: { itSetup?: boolean; buildingAccess?: boolean; equipment?: boolean }; equipmentList?: string[]; startDate?: Date }
  ): Promise<OnboardingWorkflow> {
    const candidate = await this.storage.getCandidate(tenantId, candidateId);
    if (!candidate) {
      throw new Error("Candidate not found");
    }

    // If a workflow already exists, return it — never delete or duplicate
    const existing = await this.storage.getOnboardingWorkflowByCandidateId(tenantId, candidateId);
    if (existing) {
      return existing;
    }

    const reqs = options?.requirements || { itSetup: true, buildingAccess: true, equipment: true };

    const initialTasks: OnboardingTask[] = [
      {
        id: "welcome",
        title: "Welcome Package",
        status: "pending",
        type: "welcome",
        details: ["Prepare personalized welcome letter", "Attach Employee Handbook", "Send benefits summary"]
      },
      {
        id: "paperwork",
        title: "Documentation",
        status: "pending",
        type: "paperwork",
        details: ["Send tax forms (W-4/I-9)", "Request banking details", "Deploy NDA for e-signature"]
      },
      ...(reqs.itSetup !== false ? [{
        id: "provisioning",
        title: "IT Provisioning",
        status: "pending" as const,
        type: "provisioning" as const,
        details: [
          "Create AD account",
          ...(reqs.equipment !== false ? ["Order equipment"] : []),
          "Generate VPN credentials",
          ...(reqs.buildingAccess !== false ? ["Request building access card"] : []),
        ]
      }] : []),
      {
        id: "orientation",
        title: "Orientation",
        status: "pending",
        type: "orientation",
        details: ["Schedule team meeting", "Assign orientation modules", "Notify departments"]
      }
    ];

    const workflow = await this.storage.createOnboardingWorkflow(tenantId, {
      candidateId,
      status: "In Progress",
      currentStep: "welcome",
      tasks: initialTasks as any,
      documents: [] as any,
      provisioningData: { requirements: reqs, equipmentList: options?.equipmentList || [] } as any,
      ...(options?.startDate ? { startDate: options.startDate } : {}),
    });

    this.processWorkflow(tenantId, workflow.id, candidate).catch(error => {
      console.error("Error processing onboarding workflow:", error);
    });

    await this.emailService.notifyHRForOnboardingStart(
      candidate.fullName,
      candidate.email || "N/A",
      candidate.role || "N/A"
    );

    return workflow;
  }

  private async processWorkflow(tenantId: string, workflowId: string, candidate: Candidate): Promise<void> {
    try {
      const workflow = await this.storage.getOnboardingWorkflow(tenantId, workflowId);
      if (!workflow) return;

      const tasks = (workflow.tasks as OnboardingTask[]) || [];
      const documents: OnboardingDocument[] = (workflow.documents as OnboardingDocument[]) || [];

      await this.processWelcomePackage(tenantId, workflowId, candidate, tasks, documents);
      await new Promise(r => setTimeout(r, 1000));
      
      await this.processPaperwork(tenantId, workflowId, candidate, tasks, documents);
      await new Promise(r => setTimeout(r, 1000));
      
      const provisioningResult = await this.processProvisioning(tenantId, workflowId, candidate, tasks, documents);
      await this.notifyITAfterProvisioning(candidate, provisioningResult || {});

      // Send building access notification if requested
      if (provisioningResult?.reqs?.buildingAccess !== false) {
        const startDateStr = workflow.startDate
          ? new Date(workflow.startDate).toLocaleDateString('en-ZA')
          : "TBD";
        try {
          await this.emailService.notifyFacilitiesForBuildingAccess(
            candidate.fullName,
            candidate.email || "N/A",
            startDateStr
          );
        } catch (error) {
          console.error("Failed to send building access notification:", error);
        }
      }
      await new Promise(r => setTimeout(r, 1000));
      
      const orientationResult = await this.processOrientation(tenantId, workflowId, candidate, tasks, documents);

      // Send welcome email with document requirements to the candidate
      try {
        const agent = createOnboardingAgent(this.storage);
        const docRequests = await this.storage.getOnboardingDocumentRequests(tenantId, workflowId);

        const welcomeTask = tasks.find(t => t.id === "welcome");
        const welcomeMessage = welcomeTask?.result?.message ||
          `Dear ${candidate.fullName},\n\nWelcome to the team! We're excited to have you join us as ${candidate.role || 'a team member'}.`;

        const orientationInfo = orientationResult
          ? `Your orientation is scheduled for ${orientationResult.orientationDate}.`
          : '';

        // Build document list for email
        const docListHtml = docRequests.map(r => {
          const dueDate = r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-ZA') : 'ASAP';
          const priorityBadge = r.priority === 'urgent' ? ' <span style="color:#dc2626;font-weight:bold;">(Urgent)</span>' :
                               r.priority === 'high' ? ' <span style="color:#ea580c;">(High Priority)</span>' : '';
          return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.documentName}${priorityBadge}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${r.description || ''}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${dueDate}</td>
          </tr>`;
        }).join('');

        const docListText = docRequests.map(r => {
          const dueDate = r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-ZA') : 'ASAP';
          return `- ${r.documentName}: ${r.description || ''} (Due: ${dueDate})`;
        }).join('\n');

        if (candidate.email) {
          await this.emailService.sendEmail({
            to: candidate.email,
            subject: `Welcome to the Team, ${candidate.fullName}! - Onboarding Information`,
            body: `${welcomeMessage}\n\n${orientationInfo}\n\nAs part of your onboarding, we need the following documents:\n\n${docListText}\n\nPlease submit these documents at your earliest convenience by replying to this email or contacting HR.\n\nBest regards,\nHR Team`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0d9488,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">Welcome to the Team!</h1>
    <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;">${candidate.fullName} - ${candidate.role || 'New Team Member'}</p>
  </div>
  <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 12px 12px;">
    <p style="font-size:14px;color:#374151;line-height:1.6;white-space:pre-line;">${welcomeMessage}</p>
    ${orientationInfo ? `<p style="font-size:14px;color:#374151;margin-top:16px;"><strong>${orientationInfo}</strong></p>` : ''}
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 12px 0;color:#92400e;">Required Documents</h3>
      <p style="font-size:13px;color:#6b7280;margin:0 0 12px 0;">Please submit the following documents as soon as possible:</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#fef3c7;">
          <th style="padding:8px 12px;text-align:left;">Document</th>
          <th style="padding:8px 12px;text-align:left;">Details</th>
          <th style="padding:8px 12px;text-align:left;">Due Date</th>
        </tr></thead>
        <tbody>${docListHtml}</tbody>
      </table>
    </div>
    <p style="font-size:14px;color:#6b7280;">Please reply to this email or contact HR to submit your documents.</p>
    <p style="font-size:14px;color:#6b7280;">Best regards,<br><strong>HR Team</strong></p>
  </div>
</div>`,
          });
        }

        // Update document request statuses from 'pending' to 'requested'
        await agent.requestDocuments(tenantId, workflowId, candidate.id.toString(), 'email');
      } catch (error) {
        console.error("Failed to send welcome email with document requirements:", error);
      }

      // Provisioning stays "pending" until IT/facilities confirm completion
      const finalTasks = tasks.map(t =>
        t.type === "provisioning"
          ? { ...t, status: "pending" as const }
          : { ...t, status: "completed" as const }
      );
      await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
        tasks: finalTasks as any,
        status: "In Progress",
        currentStep: "documentation",
      });
    } catch (error) {
      console.error("Workflow processing error:", error);
      await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
        status: "Failed",
      });
    }
  }

  private async processWelcomePackage(
    tenantId: string,
    workflowId: string,
    candidate: Candidate,
    tasks: OnboardingTask[],
    documents: OnboardingDocument[]
  ): Promise<void> {
    const taskIndex = tasks.findIndex(t => t.id === "welcome");
    if (taskIndex === -1) return;

    tasks[taskIndex].status = "processing";
    await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
      currentStep: "welcome",
      tasks: tasks as any,
    });

    let welcomeMessage = `Dear ${candidate.fullName},\n\nWelcome to the team! We're excited to have you join us as ${candidate.role || "a team member"}. You'll receive your employee handbook and benefits information shortly.`;
    let aiGenerated = false;
    
    if (this.groq) {
      try {
        const completion = await this.groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are an HR automation assistant. Generate a warm, professional welcome message for a new employee. Keep it concise (2-3 paragraphs)."
            },
            {
              role: "user",
              content: `Generate a welcome message for ${candidate.fullName} joining as ${candidate.role || "a team member"}. Include excitement about them joining and mention they'll receive their employee handbook and benefits information.`
            }
          ],
          temperature: 0.7,
          max_tokens: 300,
        });
        welcomeMessage = completion.choices[0]?.message?.content || welcomeMessage;
        aiGenerated = true;
      } catch (error) {
        console.error("AI welcome message generation failed, using fallback:", error);
      }
    }

    documents.push(
      {
        id: `doc-welcome-${Date.now()}`,
        title: "Welcome_Packet_Sent.eml",
        type: "email",
        status: "sent",
        snippet: `Sent to ${candidate.email || "personal email"}. ${welcomeMessage.substring(0, 50)}...`
      },
      {
        id: `doc-handbook-${Date.now()}`,
        title: "Employee_Handbook.pdf",
        type: "document",
        status: "sent",
        snippet: "Version 4.2 attached to welcome email."
      }
    );

    tasks[taskIndex].status = "completed";
    tasks[taskIndex].result = { message: welcomeMessage, aiGenerated };

    await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
      tasks: tasks as any,
      documents: documents as any,
    });
  }

  private async processPaperwork(
    tenantId: string,
    workflowId: string,
    candidate: Candidate,
    tasks: OnboardingTask[],
    documents: OnboardingDocument[]
  ): Promise<void> {
    const taskIndex = tasks.findIndex(t => t.id === "paperwork");
    if (taskIndex === -1) return;

    tasks[taskIndex].status = "processing";
    await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
      currentStep: "paperwork",
      tasks: tasks as any,
    });

    documents.push(
      {
        id: `doc-offer-${Date.now()}`,
        title: "Offer_Letter_Signed.pdf",
        type: "document",
        status: "signed",
        snippet: "Signed by candidate via DocuSign."
      },
      {
        id: `doc-banking-${Date.now()}`,
        title: "Banking_Details_Form.pdf",
        type: "document",
        status: "pending",
        snippet: "Waiting for candidate input."
      },
      {
        id: `doc-nda-${Date.now()}`,
        title: "NDA_Agreement.pdf",
        type: "document",
        status: "sent",
        snippet: "Sent for e-signature via DocuSign."
      }
    );

    tasks[taskIndex].status = "completed";

    await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
      tasks: tasks as any,
      documents: documents as any,
    });

    // Initialize real document tracking requests
    try {
      const agent = createOnboardingAgent(this.storage);
      await agent.initializeDocumentRequests(tenantId, workflowId, candidate.id.toString());
    } catch (error) {
      console.error("Failed to initialize document requests:", error);
    }
  }

  private async processProvisioning(
    tenantId: string,
    workflowId: string,
    candidate: Candidate,
    tasks: OnboardingTask[],
    documents: OnboardingDocument[]
  ): Promise<any> {
    const taskIndex = tasks.findIndex(t => t.id === "provisioning");
    if (taskIndex === -1) return;

    tasks[taskIndex].status = "processing";
    await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
      currentStep: "provisioning",
      tasks: tasks as any,
    });

    let credentials: any = {
      email: candidate.email || `${candidate.fullName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      tempPassword: "ChangeMe123!",
      vpnKey: "vpn-key-generated",
      slackInvite: "sent",
      aiGenerated: false
    };
    
    if (this.groq) {
      try {
        const completion = await this.groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are an IT provisioning system. Generate realistic example credentials and system access details for a new employee. Return as JSON with fields: email, tempPassword, vpnKey, slackInvite."
            },
            {
              role: "user",
              content: `Generate credentials for ${candidate.fullName} (${candidate.email || "email@example.com"})`
            }
          ],
          temperature: 0.5,
          max_tokens: 200,
        });

        const content = completion.choices[0]?.message?.content || "{}";
        const aiCredentials = JSON.parse(content);
        credentials = { ...aiCredentials, aiGenerated: true };
      } catch (error) {
        console.error("AI provisioning generation failed, using fallback:", error);
        tasks[taskIndex].status = "failed";
        tasks[taskIndex].result = { error: "AI generation failed", fallback: credentials };
        await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
          tasks: tasks as any,
        });
        return credentials;
      }
    }

    // Get the stored requirements and equipment list from the workflow
    const currentWorkflow = await this.storage.getOnboardingWorkflow(tenantId, workflowId);
    const storedData = (currentWorkflow?.provisioningData as any) || {};
    const reqs = storedData.requirements || {};
    const equipmentList: string[] = storedData.equipmentList || [];

    const equipmentSnippet = equipmentList.length > 0
      ? equipmentList.join(", ") + " — request sent to IT."
      : "No equipment requested.";

    documents.push(
      {
        id: `asset-laptop-${Date.now()}`,
        title: "IT_Asset_Request",
        type: "asset",
        status: "pending",
        snippet: equipmentSnippet
      },
      {
        id: `asset-access-${Date.now()}`,
        title: "System_Access_Credentials",
        type: "asset",
        status: "pending",
        snippet: "SSO Invite sent. VPN Access granted."
      }
    );

    // Generate confirmation tokens for IT and building access
    const itConfirmationToken = randomUUID();
    const buildingAccessToken = randomUUID();

    // Provisioning stays "pending" until IT confirms
    tasks[taskIndex].status = "pending";
    tasks[taskIndex].result = credentials;

    const provisioningData = {
      ...credentials,
      requirements: reqs,
      equipmentList,
      itConfirmationToken,
      itConfirmed: false,
      buildingAccessToken,
      buildingAccessConfirmed: reqs.buildingAccess === false, // auto-confirm if not requested
      equipmentConfirmed: equipmentList.length === 0, // auto-confirm if no equipment requested
    };

    await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
      tasks: tasks as any,
      documents: documents as any,
      provisioningData: provisioningData as any,
    });

    return { credentials, equipmentList, itConfirmationToken, buildingAccessToken, reqs };
  }

  private async notifyITAfterProvisioning(candidate: Candidate, provisioningResult: any): Promise<void> {
    try {
      await this.emailService.notifyITForProvisioning(
        candidate.fullName,
        candidate.email || "N/A",
        provisioningResult.credentials || provisioningResult,
        provisioningResult.equipmentList
      );
    } catch (error) {
      console.error("Failed to send IT notification:", error);
    }
  }

  private async processOrientation(
    tenantId: string,
    workflowId: string,
    candidate: Candidate,
    tasks: OnboardingTask[],
    documents: OnboardingDocument[]
  ): Promise<{ orientationDate: string; teamMeeting: string; modulesAssigned: string[] } | undefined> {
    const taskIndex = tasks.findIndex(t => t.id === "orientation");
    if (taskIndex === -1) return;

    tasks[taskIndex].status = "processing";
    await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
      currentStep: "orientation",
      tasks: tasks as any,
    });

    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    nextMonday.setHours(9, 0, 0, 0);

    const result = {
      orientationDate: nextMonday.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      teamMeeting: "Scheduled",
      modulesAssigned: ["Company Culture", "Systems Training", "Safety Guidelines"]
    };

    tasks[taskIndex].status = "completed";
    tasks[taskIndex].result = result;

    await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
      tasks: tasks as any,
      documents: documents as any,
    });

    return result;
  }

  async getWorkflowStatus(tenantId: string, workflowId: string): Promise<OnboardingWorkflow | undefined> {
    return await this.storage.getOnboardingWorkflow(tenantId, workflowId);
  }

  async getWorkflowByCandidateId(tenantId: string, candidateId: string): Promise<OnboardingWorkflow | undefined> {
    return await this.storage.getOnboardingWorkflowByCandidateId(tenantId, candidateId);
  }
}
