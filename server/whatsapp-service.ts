import { storage } from "./storage";
import type { 
  WhatsappConversation, 
  WhatsappMessage, 
  InsertWhatsappMessage,
  InsertWhatsappConversation,
  InsertWhatsappDocumentRequest,
  InsertWhatsappAppointment,
  IntegrityDocumentRequirement,
  CandidateDocument
} from "@shared/schema";

const DOC_TYPE_KEYWORDS: Record<string, string[]> = {
  id_document: ["id", "id document", "identity", "national id", "id card"],
  proof_of_address: ["proof of address", "utility bill", "address", "bank statement address"],
  police_clearance: ["police clearance", "criminal record", "police", "clearance"],
  drivers_license: ["driver", "drivers license", "driving license", "licence"],
  passport: ["passport"],
  bank_statement: ["bank statement", "bank", "statement"],
  qualification_certificate: ["qualification", "certificate", "degree", "diploma"],
  reference_letter: ["reference", "reference letter", "recommendation"],
  work_permit: ["work permit", "permit"],
  cv_resume: ["cv", "resume", "curriculum vitae"],
  payslip: ["payslip", "pay slip", "salary slip"],
  tax_certificate: ["tax", "tax certificate", "sars"],
  medical_certificate: ["medical", "medical certificate", "health"],
};

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

interface WhatsappApiResponse {
  messaging_product: string;
  contacts?: { input: string; wa_id: string }[];
  messages?: { id: string }[];
  error?: { message: string; code: number };
}

export class WhatsAppService {
  private token: string | undefined;
  private phoneNumberId: string | undefined;

  constructor() {
    this.token = process.env.WHATSAPP_API_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  isConfigured(): boolean {
    return !!(this.token && this.phoneNumberId);
  }

  async sendTextMessage(
    tenantId: string,
    conversationId: string,
    phone: string,
    body: string,
    senderType: "ai" | "human" = "human",
    senderId?: string
  ): Promise<WhatsappMessage | null> {
    let whatsappMessageId: string | undefined;
    let status: "sent" | "pending" | "failed" = "pending";
    let apiError: string | undefined;

    // Try to send via WhatsApp API if configured
    if (this.isConfigured()) {
      try {
        const response = await fetch(
          `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: { body },
            }),
          }
        );

        const data: WhatsappApiResponse = await response.json();

        if (response.ok && !data.error) {
          whatsappMessageId = data.messages?.[0]?.id;
          status = "sent";
        } else {
          apiError = data.error?.message || "Failed to send message";
          status = "failed";
          console.warn("WhatsApp API error:", apiError);
        }
      } catch (error: any) {
        apiError = error.message;
        status = "failed";
        console.warn("WhatsApp API request failed:", error.message);
      }
    } else {
      console.warn("WhatsApp API not configured - storing message locally");
    }

    // Always store the message locally
    const message = await storage.createWhatsappMessage(tenantId, {
      conversationId,
      whatsappMessageId,
      direction: "outbound",
      senderType,
      senderId,
      messageType: "text",
      body,
      status,
      sentAt: new Date(),
      payload: apiError ? { error: apiError } : undefined,
    });

    await storage.updateWhatsappConversation(tenantId, conversationId, {
      lastMessageAt: new Date(),
      lastMessagePreview: body.substring(0, 100),
    });

    return message;
  }

  async sendDocumentRequest(
    tenantId: string,
    conversationId: string,
    phone: string,
    documentType: string,
    documentName: string,
    description?: string,
    dueDate?: Date
  ): Promise<{ message: WhatsappMessage | null; request: any }> {
    // Generate a unique reference code for tracking
    const referenceCode = `DOC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const requestBody = `Hello! We need you to submit the following document:\n\n📄 *${documentName}*\n${description ? `\n${description}` : ""}\n${dueDate ? `\n⏰ Please submit by: ${dueDate.toLocaleDateString()}` : ""}\n\n🔖 *Reference Code:* \`${referenceCode}\`\n\nPlease reply with your reference code or document type, then send your photo or document file.\n\nThank you!`;

    const message = await this.sendTextMessage(
      tenantId,
      conversationId,
      phone,
      requestBody,
      "ai"
    );

    const request = await storage.createWhatsappDocumentRequest(tenantId, {
      conversationId,
      documentType,
      documentName,
      description,
      status: "requested",
      dueDate,
      messageId: message?.id,
      referenceCode,
    });

    return { message, request };
  }

  async sendAppointmentRequest(
    tenantId: string,
    conversationId: string,
    phone: string,
    appointmentType: string,
    title: string,
    scheduledAt: Date,
    duration: number,
    location?: string,
    description?: string
  ): Promise<{ message: WhatsappMessage | null; appointment: any }> {
    const timeStr = scheduledAt.toLocaleString("en-ZA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const requestBody = `Hello! You have been scheduled for:\n\n📅 *${title}*\n\n🕐 *Date & Time:* ${timeStr}\n⏱️ *Duration:* ${duration} minutes\n${location ? `📍 *Location:* ${location}` : ""}\n${description ? `\n${description}` : ""}\n\nPlease reply with:\n✅ CONFIRM - to confirm your attendance\n🔄 RESCHEDULE - to request a different time\n❌ CANCEL - to cancel\n\nThank you!`;

    const message = await this.sendTextMessage(
      tenantId,
      conversationId,
      phone,
      requestBody,
      "ai"
    );

    const appointment = await storage.createWhatsappAppointment(tenantId, {
      conversationId,
      appointmentType,
      title,
      description,
      scheduledAt,
      duration,
      location,
      status: "proposed",
      messageId: message?.id,
    });

    return { message, appointment };
  }

  async getOrCreateConversation(
    tenantId: string,
    phone: string,
    waId: string,
    profileName?: string,
    candidateId?: string,
    type: string = "general"
  ): Promise<WhatsappConversation> {
    let conversation = await storage.getWhatsappConversationByWaId(tenantId, waId);

    if (!conversation) {
      conversation = await storage.createWhatsappConversation(tenantId, {
        waId,
        phone,
        profileName,
        candidateId,
        type,
        status: "active",
      });
    }

    return conversation;
  }

  detectDocumentType(text: string): string | null {
    const lowerText = text.toLowerCase().trim();
    
    for (const [docType, keywords] of Object.entries(DOC_TYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return docType;
        }
      }
    }
    
    return null;
  }

  getDocTypeLabel(docType: string): string {
    const labels: Record<string, string> = {
      id_document: "ID Document",
      proof_of_address: "Proof of Address",
      police_clearance: "Police Clearance",
      drivers_license: "Driver's License",
      passport: "Passport",
      bank_statement: "Bank Statement",
      qualification_certificate: "Qualification Certificate",
      reference_letter: "Reference Letter",
      work_permit: "Work Permit",
      cv_resume: "CV/Resume",
      payslip: "Payslip",
      tax_certificate: "Tax Certificate",
      medical_certificate: "Medical Certificate",
      other: "Other Document"
    };
    return labels[docType] || docType;
  }

  async processIncomingMessage(
    tenantId: string,
    waId: string,
    phone: string,
    profileName: string | undefined,
    messageData: any
  ): Promise<WhatsappMessage> {
    const conversation = await this.getOrCreateConversation(
      tenantId,
      phone,
      waId,
      profileName
    );

    const messageType = messageData.type || "text";
    let body = "";
    let mediaUrl = "";
    let mediaType = "";
    let fileName = "";

    switch (messageType) {
      case "text":
        body = messageData.text?.body || "";
        break;
      case "image":
        mediaUrl = messageData.image?.id || messageData.image?.link || "";
        mediaType = messageData.image?.mime_type || "image/jpeg";
        body = messageData.image?.caption || "[Image]";
        break;
      case "document":
        mediaUrl = messageData.document?.id || messageData.document?.link || "";
        mediaType = messageData.document?.mime_type || "";
        fileName = messageData.document?.filename || "";
        body = fileName || "[Document]";
        break;
      case "audio":
        mediaUrl = messageData.audio?.id || messageData.audio?.link || "";
        mediaType = messageData.audio?.mime_type || "audio/ogg";
        body = "[Voice Message]";
        break;
      case "video":
        mediaUrl = messageData.video?.id || messageData.video?.link || "";
        mediaType = messageData.video?.mime_type || "video/mp4";
        body = messageData.video?.caption || "[Video]";
        break;
      default:
        body = `[${messageType}]`;
    }

    const message = await storage.createWhatsappMessage(tenantId, {
      conversationId: conversation.id,
      whatsappMessageId: messageData.id,
      direction: "inbound",
      senderType: "candidate",
      messageType,
      body,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || undefined,
      status: "delivered",
      payload: messageData,
    });

    await storage.updateWhatsappConversation(tenantId, conversation.id, {
      lastMessageAt: new Date(),
      lastMessagePreview: body.substring(0, 100),
      unreadCount: (conversation.unreadCount || 0) + 1,
    });

    // Handle document collection tracking - only if AI is in control
    // Check handoff mode before AI auto-responds
    const handoffMode = (conversation as any).handoffMode || 'ai';
    
    if (conversation.candidateId && handoffMode === 'ai') {
      await this.handleDocumentCollection(
        tenantId,
        conversation,
        message,
        messageType,
        body,
        mediaUrl,
        mediaType,
        fileName
      );
    }

    return message;
  }

  async handleDocumentCollection(
    tenantId: string,
    conversation: WhatsappConversation,
    message: WhatsappMessage,
    messageType: string,
    body: string,
    mediaUrl: string,
    mediaType: string,
    fileName: string
  ): Promise<void> {
    if (!conversation.candidateId) return;

    const candidateId = conversation.candidateId;
    
    // Get pending document requirements for this candidate
    const pendingRequirements = await storage.getIntegrityDocumentRequirements(tenantId, candidateId);
    const pending = pendingRequirements.filter(r => r.status === 'pending' || r.status === 'requested');
    
    if (pending.length === 0) return;

    // Get or create WhatsApp document session for this candidate
    let session = await storage.getWhatsappDocumentSessionByPhone(tenantId, conversation.phone);
    
    if (!session) {
      session = await storage.createWhatsappDocumentSession(tenantId, {
        candidateId,
        phoneNumber: conversation.phone,
        currentState: 'idle',
        lastMessageAt: new Date(),
      });
    }

    // Handle text messages - look for document type selection
    if (messageType === 'text') {
      const textLower = body.toLowerCase().trim();
      
      // Check if user specified a reference code
      const refCodeMatch = textLower.match(/doc-[a-z0-9-]+/i);
      if (refCodeMatch) {
        const refCode = refCodeMatch[0].toUpperCase();
        const matchedReq = pending.find(r => r.referenceCode === refCode);
        if (matchedReq) {
          await storage.updateWhatsappDocumentSession(tenantId, session.id, {
            currentState: 'awaiting_document',
            pendingRequirementId: matchedReq.id,
            selectedDocType: matchedReq.documentType,
            lastMessageAt: new Date(),
          });
          
          await this.sendTextMessage(
            tenantId,
            conversation.id,
            conversation.phone,
            `Great! Please send your ${this.getDocTypeLabel(matchedReq.documentType)} now. You can send a photo or document file.`,
            'ai'
          );
          return;
        }
      }
      
      // Check if user specified a document type
      const detectedType = this.detectDocumentType(body);
      if (detectedType) {
        const matchedReq = pending.find(r => r.documentType === detectedType);
        if (matchedReq) {
          await storage.updateWhatsappDocumentSession(tenantId, session.id, {
            currentState: 'awaiting_document',
            pendingRequirementId: matchedReq.id,
            selectedDocType: detectedType,
            lastMessageAt: new Date(),
          });
          
          await this.sendTextMessage(
            tenantId,
            conversation.id,
            conversation.phone,
            `Great! Please send your ${this.getDocTypeLabel(detectedType)} now. You can send a photo or document file.\n\nReference: ${matchedReq.referenceCode}`,
            'ai'
          );
          return;
        }
      }
      
      // If we're in awaiting_document state and got a text, prompt for the document
      if (session.currentState === 'awaiting_document') {
        await this.sendTextMessage(
          tenantId,
          conversation.id,
          conversation.phone,
          `Please send the document as a photo or file attachment. I'm waiting for your ${session.selectedDocType ? this.getDocTypeLabel(session.selectedDocType) : 'document'}.`,
          'ai'
        );
        return;
      }
      
      // If idle and received text, show pending requirements
      if (session.currentState === 'idle' && pending.length > 0) {
        const docList = pending.map((r, i) => 
          `${i + 1}. ${r.description || this.getDocTypeLabel(r.documentType)} (Ref: ${r.referenceCode})`
        ).join('\n');
        
        await this.sendTextMessage(
          tenantId,
          conversation.id,
          conversation.phone,
          `Hi! I can help you submit documents. You have ${pending.length} pending document(s):\n\n${docList}\n\nPlease reply with the document type (e.g., "ID Document") or reference code before sending each document.`,
          'ai'
        );
      }
    }
    
    // Handle document/image uploads
    if (['document', 'image'].includes(messageType) && mediaUrl) {
      let matchedRequirement: IntegrityDocumentRequirement | undefined;
      let docType = session.selectedDocType || 'other';
      
      // If we have a pending requirement in session, use that
      if (session.pendingRequirementId) {
        matchedRequirement = pending.find(r => r.id === session.pendingRequirementId);
        if (matchedRequirement) {
          docType = matchedRequirement.documentType;
        }
      }
      
      // If no session match, try to infer from caption or filename
      if (!matchedRequirement && body && body !== '[Image]' && body !== '[Document]') {
        const detectedType = this.detectDocumentType(body);
        if (detectedType) {
          matchedRequirement = pending.find(r => r.documentType === detectedType);
          if (matchedRequirement) {
            docType = detectedType;
          }
        }
      }
      
      // If still no match and only one pending requirement, use that
      if (!matchedRequirement && pending.length === 1) {
        matchedRequirement = pending[0];
        docType = matchedRequirement.documentType;
      }
      
      // Create the candidate document record
      const refCode = matchedRequirement?.referenceCode || `DOC-${Date.now().toString(36).toUpperCase()}`;
      
      const candidateDoc = await storage.createCandidateDocument(tenantId, {
        candidateId,
        requirementId: matchedRequirement?.id,
        documentType: docType,
        fileName: fileName || `${docType}_${Date.now()}`,
        fileUrl: mediaUrl,
        fileSize: undefined,
        mimeType: mediaType,
        referenceCode: refCode,
        collectedVia: 'whatsapp',
        sourceMessageId: message.whatsappMessageId || message.id,
        candidateNote: body !== '[Image]' && body !== '[Document]' ? body : undefined,
        status: 'received',
      });
      
      // Update the requirement if we have a match
      if (matchedRequirement) {
        await storage.updateIntegrityDocumentRequirement(tenantId, matchedRequirement.id, {
          status: 'received',
          documentId: candidateDoc.id,
          receivedAt: new Date(),
          reminderEnabled: 0, // Stop reminders
        });
      }
      
      // Reset session state
      await storage.updateWhatsappDocumentSession(tenantId, session.id, {
        currentState: 'idle',
        pendingRequirementId: null,
        selectedDocType: null,
        lastMessageAt: new Date(),
      });
      
      // Send confirmation
      const remainingPending = pending.filter(r => r.id !== matchedRequirement?.id && r.status !== 'received');
      
      let confirmationMsg = `✅ Thank you! I've received your ${this.getDocTypeLabel(docType)}.\n\nReference: ${refCode}\n\nOur team will review it shortly.`;
      
      if (remainingPending.length > 0) {
        confirmationMsg += `\n\nYou still have ${remainingPending.length} document(s) pending:\n`;
        confirmationMsg += remainingPending.map((r, i) => 
          `${i + 1}. ${r.description || this.getDocTypeLabel(r.documentType)} (Ref: ${r.referenceCode})`
        ).join('\n');
        confirmationMsg += `\n\nReply with the document type when you're ready to send the next one.`;
      } else {
        confirmationMsg += `\n\nAll your required documents have been received! Thank you for your cooperation.`;
      }
      
      await this.sendTextMessage(
        tenantId,
        conversation.id,
        conversation.phone,
        confirmationMsg,
        'ai'
      );
    }
  }

  async updateMessageStatus(
    tenantId: string,
    whatsappMessageId: string,
    status: string,
    timestamp?: Date
  ): Promise<void> {
    const message = await storage.getWhatsappMessageByWhatsappId(tenantId, whatsappMessageId);
    if (!message) return;

    const updates: Partial<InsertWhatsappMessage> = { status };
    
    switch (status) {
      case "delivered":
        updates.deliveredAt = timestamp || new Date();
        break;
      case "read":
        updates.readAt = timestamp || new Date();
        break;
      case "failed":
        break;
    }

    await storage.updateWhatsappMessage(tenantId, message.id, updates);
  }

  generateCallLink(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}`;
  }

  async sendKpiReviewRequest(
    tenantId: string,
    conversationId: string,
    phone: string,
    employeeName: string,
    cycleName: string,
    kpiCount: number,
    dueDate?: Date,
    reviewLink?: string
  ): Promise<WhatsappMessage | null> {
    const dueDateStr = dueDate 
      ? dueDate.toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : null;

    let messageBody = `Hello ${employeeName}! 🎯\n\nIt's time for your KPI self-assessment for *${cycleName}*.\n\nYou have *${kpiCount} KPI(s)* to review and score.\n\n`;
    
    if (dueDateStr) {
      messageBody += `⏰ *Due Date:* ${dueDateStr}\n\n`;
    }

    messageBody += `📊 *How to complete your review:*\n`;
    messageBody += `1️⃣ Rate each KPI from 1-5 stars\n`;
    messageBody += `2️⃣ Add comments about your achievements\n`;
    messageBody += `3️⃣ Submit your review for manager approval\n\n`;

    if (reviewLink) {
      messageBody += `🔗 *Complete your review here:*\n${reviewLink}\n\n`;
    } else {
      messageBody += `You can reply with your scores in this format:\n`;
      messageBody += `*KPI1: 4, KPI2: 5, KPI3: 3*\n\n`;
      messageBody += `Or log in to the HR portal to complete your review.\n\n`;
    }

    messageBody += `Thank you for your dedication! 💪`;

    return await this.sendTextMessage(tenantId, conversationId, phone, messageBody, "ai");
  }

  async sendKpiManagerNotification(
    tenantId: string,
    conversationId: string,
    phone: string,
    managerName: string,
    employeeName: string,
    cycleName: string,
    reviewLink?: string
  ): Promise<WhatsappMessage | null> {
    let messageBody = `Hello ${managerName}! 📋\n\n*${employeeName}* has completed their KPI self-assessment for *${cycleName}* and is awaiting your review.\n\n`;
    
    messageBody += `📊 *Action Required:*\n`;
    messageBody += `• Review their self-scores\n`;
    messageBody += `• Provide your manager scores (1-5)\n`;
    messageBody += `• Add feedback comments\n`;
    messageBody += `• Submit the final review\n\n`;

    if (reviewLink) {
      messageBody += `🔗 *Review employee here:*\n${reviewLink}\n\n`;
    }

    messageBody += `Please complete your review at your earliest convenience. Thank you!`;

    return await this.sendTextMessage(tenantId, conversationId, phone, messageBody, "ai");
  }

  async sendKpiScoreReminder(
    tenantId: string,
    conversationId: string,
    phone: string,
    employeeName: string,
    cycleName: string,
    daysRemaining: number,
    reviewLink?: string
  ): Promise<WhatsappMessage | null> {
    let messageBody = `Hi ${employeeName}! ⏰\n\n*Reminder:* Your KPI self-assessment for *${cycleName}* is due in *${daysRemaining} day(s)*.\n\n`;
    
    if (daysRemaining <= 1) {
      messageBody += `⚠️ This is your final reminder! Please complete your review today.\n\n`;
    }

    if (reviewLink) {
      messageBody += `🔗 *Complete now:* ${reviewLink}\n\n`;
    }

    messageBody += `Your input is valuable for your performance evaluation. Don't miss out! 📊`;

    return await this.sendTextMessage(tenantId, conversationId, phone, messageBody, "ai");
  }

  async sendKpiReviewComplete(
    tenantId: string,
    conversationId: string,
    phone: string,
    employeeName: string,
    cycleName: string,
    finalScore?: string,
    managerComments?: string
  ): Promise<WhatsappMessage | null> {
    let messageBody = `Hello ${employeeName}! ✅\n\nYour KPI review for *${cycleName}* has been completed by your manager.\n\n`;
    
    if (finalScore) {
      messageBody += `📊 *Final Score:* ${finalScore}%\n\n`;
    }

    if (managerComments) {
      messageBody += `💬 *Manager Feedback:*\n"${managerComments}"\n\n`;
    }

    messageBody += `You can log in to the HR portal to view your detailed review and development plan.\n\n`;
    messageBody += `Keep up the great work! 🌟`;

    return await this.sendTextMessage(tenantId, conversationId, phone, messageBody, "ai");
  }

  async processKpiWhatsAppResponse(
    tenantId: string,
    conversationId: string,
    conversation: WhatsappConversation,
    body: string
  ): Promise<boolean> {
    const scorePattern = /kpi\s*(\d+)\s*[:\s]+(\d)/gi;
    const matches: RegExpExecArray[] = [];
    let match: RegExpExecArray | null;
    while ((match = scorePattern.exec(body)) !== null) {
      matches.push(match);
    }
    
    if (matches.length === 0) {
      const simplePattern = /^[1-5](?:\s*,\s*[1-5])*$/;
      if (simplePattern.test(body.trim())) {
        const scores = body.trim().split(/\s*,\s*/).map(s => parseInt(s));
        
        await this.sendTextMessage(
          tenantId,
          conversationId,
          conversation.phone,
          `Thank you! I received your scores: ${scores.join(", ")}\n\nFor accurate assignment, please log in to the HR portal to confirm which KPIs these scores apply to.`,
          "ai"
        );
        return true;
      }
      return false;
    }

    const parsedScores: { kpiIndex: number; score: number }[] = [];
    for (const match of matches) {
      const kpiIndex = parseInt(match[1]);
      const score = parseInt(match[2]);
      if (score >= 1 && score <= 5) {
        parsedScores.push({ kpiIndex, score });
      }
    }

    if (parsedScores.length > 0) {
      const scoresStr = parsedScores.map(s => `KPI${s.kpiIndex}: ${s.score}⭐`).join(", ");
      
      await this.sendTextMessage(
        tenantId,
        conversationId,
        conversation.phone,
        `Thank you! I've recorded your scores:\n${scoresStr}\n\nTo finalize, please log in to the HR portal to confirm and submit your review.`,
        "ai"
      );
      return true;
    }

    return false;
  }
}

export const whatsappService = new WhatsAppService();
