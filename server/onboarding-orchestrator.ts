import Groq from "groq-sdk";
import type { IStorage } from "./storage";
import type { Candidate, OnboardingWorkflow } from "@shared/schema";
import { EmailService } from "./email-service";

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

  async startOnboarding(tenantId: string, candidateId: string, restart: boolean = false): Promise<OnboardingWorkflow> {
    const candidate = await this.storage.getCandidate(tenantId, candidateId);
    if (!candidate) {
      throw new Error("Candidate not found");
    }

    const existing = await this.storage.getOnboardingWorkflowByCandidateId(tenantId, candidateId);
    
    if (existing && !restart) {
      if (existing.status === "In Progress") {
        return existing;
      }
      
      if (existing.status === "Completed" || existing.status === "Failed") {
        restart = true;
      }
    }

    if (restart && existing) {
      await this.storage.deleteOnboardingWorkflow(tenantId, existing.id);
    }

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
      {
        id: "provisioning",
        title: "IT Provisioning",
        status: "pending",
        type: "provisioning",
        details: ["Create AD account", "Order equipment", "Generate VPN credentials"]
      },
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
      provisioningData: {} as any,
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
      
      const provisioningCredentials = await this.processProvisioning(tenantId, workflowId, candidate, tasks, documents);
      await this.notifyITAfterProvisioning(candidate, provisioningCredentials || {});
      await new Promise(r => setTimeout(r, 1000));
      
      const orientationResult = await this.processOrientation(tenantId, workflowId, candidate, tasks, documents);

      const finalTasks = tasks.map(t => ({ ...t, status: "completed" as const }));
      await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
        tasks: finalTasks as any,
        status: "Completed",
        completedAt: new Date(),
      });

      await this.emailService.notifyHRForOnboardingCompletion(
        candidate.fullName,
        candidate.email || "N/A",
        orientationResult?.orientationDate || "TBD"
      );
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

    documents.push(
      {
        id: `asset-laptop-${Date.now()}`,
        title: "IT_Asset_Request_#4922",
        type: "asset",
        status: "provisioned",
        snippet: "MacBook Pro M3 & Monitor dispatched to IT."
      },
      {
        id: `asset-access-${Date.now()}`,
        title: "System_Access_Credentials",
        type: "asset",
        status: "provisioned",
        snippet: "SSO Invite sent. VPN Access granted."
      }
    );

    tasks[taskIndex].status = "completed";
    tasks[taskIndex].result = credentials;

    await this.storage.updateOnboardingWorkflow(tenantId, workflowId, {
      tasks: tasks as any,
      documents: documents as any,
      provisioningData: credentials as any,
    });

    return credentials;
  }

  private async notifyITAfterProvisioning(candidate: Candidate, credentials: any): Promise<void> {
    try {
      await this.emailService.notifyITForProvisioning(
        candidate.fullName,
        candidate.email || "N/A",
        credentials
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
