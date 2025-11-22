import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface JobSpecData {
  title?: string;
  department?: string;
  description?: string;
  location?: string;
  employmentType?: string;
  shiftStructure?: string;
  salaryMin?: number;
  salaryMax?: number;
  payRateUnit?: string;
  minYearsExperience?: number;
  licenseRequirements?: string[];
  vehicleTypes?: string[];
  certificationsRequired?: string[];
  physicalRequirements?: string;
  equipmentExperience?: Record<string, string>;
}

/**
 * AI Job Creation Agent
 * Conducts conversational interview with HR to build comprehensive job specifications
 */
export class JobCreationAgent {
  private conversationHistory: ConversationMessage[] = [];
  private collectedData: JobSpecData = {};
  private systemPrompt = `You are an expert HR assistant helping to create job requisitions for blue-collar positions in South Africa (truck drivers, logistics workers, warehouse staff, forklift operators, etc.).

Your role is to:
1. Ask relevant questions ONE AT A TIME to gather job requirements
2. Be conversational and helpful
3. Understand South African context (licenses like Code 10/14/EC, PrDP, locations, currency ZAR)
4. Extract structured data from responses
5. Ask follow-up questions based on the job type

Important job types and their requirements:
- **Truck Drivers**: Licenses (Code 10, Code 14, Code EC), PrDP, vehicle type, experience, routes
- **Forklift Operators**: Forklift license, warehouse experience, shift work
- **Warehouse Workers**: Physical fitness, equipment operation, inventory management
- **Logistics Coordinators**: Planning experience, transport management, scheduling

After gathering all information, you'll provide a structured summary for confirmation.

Start by asking what type of position they're hiring for.`;

  constructor() {
    this.conversationHistory.push({
      role: "system",
      content: this.systemPrompt,
    });
  }

  /**
   * Process user message and generate AI response
   */
  async chat(userMessage: string): Promise<{
    reply: string;
    isComplete: boolean;
    jobSpec?: JobSpecData;
  }> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    try {
      // Get AI response
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: this.conversationHistory,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const assistantReply = completion.choices[0]?.message?.content || "I apologize, I didn't understand that. Could you please rephrase?";

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: assistantReply,
      });

      // Extract data from conversation so far (must await!)
      await this.extractDataFromConversation();

      // Check if we have enough information
      const isComplete = this.hasCompleteJobSpec();

      return {
        reply: assistantReply,
        isComplete,
        jobSpec: isComplete ? this.collectedData : undefined,
      };
    } catch (error) {
      console.error("Error in job creation chat:", error);
      throw new Error("Failed to process your request. Please try again.");
    }
  }

  /**
   * Extract structured data from the conversation using AI
   */
  private async extractDataFromConversation(): Promise<void> {
    const extractionPrompt = `Based on this conversation about creating a job requisition, extract any mentioned job details in JSON format. Only include fields that were explicitly mentioned.

Conversation:
${this.conversationHistory.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.content}`).join('\n')}

Extract to JSON with these possible fields:
{
  "title": "string (job title)",
  "department": "string",
  "description": "string (job description/responsibilities)",
  "location": "string (city, province)",
  "employmentType": "full_time | part_time | contract | temporary",
  "shiftStructure": "day | night | rotating | split",
  "salaryMin": number (in ZAR),
  "salaryMax": number (in ZAR),
  "payRateUnit": "hourly | daily | monthly | annual",
  "minYearsExperience": number,
  "licenseRequirements": ["Code 10", "Code 14", "Code EC", "PrDP", etc],
  "vehicleTypes": ["Rigid Truck", "Articulated Truck", "Forklift", etc],
  "certificationsRequired": ["First Aid", "Hazmat", "OHSA", "Forklift License", etc],
  "physicalRequirements": "string (e.g., 'Heavy lifting', 'Standing for long periods')",
  "equipmentExperience": {"Forklift": "required", "Pallet Jack": "preferred"}
}

Return ONLY the JSON, no other text.`;

    try {
      const extraction = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: extractionPrompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const jsonText = extraction.choices[0]?.message?.content || "{}";
      
      // Try to parse JSON from the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);
        
        // Coerce and validate types
        const sanitizedData: JobSpecData = {
          title: extractedData.title,
          department: extractedData.department,
          description: extractedData.description,
          location: extractedData.location,
          employmentType: extractedData.employmentType,
          shiftStructure: extractedData.shiftStructure,
          
          // Coerce numeric fields
          salaryMin: extractedData.salaryMin ? parseInt(String(extractedData.salaryMin).replace(/[^\d]/g, '')) : undefined,
          salaryMax: extractedData.salaryMax ? parseInt(String(extractedData.salaryMax).replace(/[^\d]/g, '')) : undefined,
          minYearsExperience: extractedData.minYearsExperience ? parseInt(String(extractedData.minYearsExperience)) : undefined,
          
          payRateUnit: extractedData.payRateUnit,
          
          // Ensure arrays
          licenseRequirements: Array.isArray(extractedData.licenseRequirements) 
            ? extractedData.licenseRequirements 
            : (extractedData.licenseRequirements ? [extractedData.licenseRequirements] : undefined),
          vehicleTypes: Array.isArray(extractedData.vehicleTypes) 
            ? extractedData.vehicleTypes 
            : (extractedData.vehicleTypes ? [extractedData.vehicleTypes] : undefined),
          certificationsRequired: Array.isArray(extractedData.certificationsRequired) 
            ? extractedData.certificationsRequired 
            : (extractedData.certificationsRequired ? [extractedData.certificationsRequired] : undefined),
          
          physicalRequirements: extractedData.physicalRequirements,
          equipmentExperience: extractedData.equipmentExperience,
        };
        
        this.collectedData = { ...this.collectedData, ...sanitizedData };
      }
    } catch (error) {
      console.error("Error extracting data:", error);
      // Continue without extraction - not critical
    }
  }

  /**
   * Check if we have complete job specification
   */
  private hasCompleteJobSpec(): boolean {
    // Minimum required fields for a blue-collar job posting
    const hasBasicInfo = !!(
      this.collectedData.title &&
      this.collectedData.department &&
      this.collectedData.location
    );

    const hasCompensation = !!(
      this.collectedData.salaryMin ||
      this.collectedData.salaryMax
    );

    const hasRequirements = !!(
      this.collectedData.minYearsExperience !== undefined ||
      (this.collectedData.licenseRequirements && this.collectedData.licenseRequirements.length > 0) ||
      (this.collectedData.certificationsRequired && this.collectedData.certificationsRequired.length > 0)
    );

    return hasBasicInfo && (hasCompensation || hasRequirements);
  }

  /**
   * Get final job specification
   */
  getJobSpec(): JobSpecData {
    return this.collectedData;
  }

  /**
   * Generate completion confirmation message
   */
  async generateSummary(): Promise<string> {
    const summaryPrompt = `Create a brief, professional summary of this job requisition for HR to review before posting:

${JSON.stringify(this.collectedData, null, 2)}

Format as a concise bullet-point summary highlighting key requirements. Keep it under 200 words.`;

    try {
      const summary = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: summaryPrompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      return summary.choices[0]?.message?.content || "Job specification completed.";
    } catch (error) {
      console.error("Error generating summary:", error);
      return "Job specification completed. Please review the details above.";
    }
  }

  /**
   * Reset conversation
   */
  reset(): void {
    this.conversationHistory = [
      {
        role: "system",
        content: this.systemPrompt,
      },
    ];
    this.collectedData = {};
  }
}

// Store active conversations (in production, use Redis or database)
const activeConversations = new Map<string, JobCreationAgent>();

export function getOrCreateConversation(sessionId: string): JobCreationAgent {
  if (!activeConversations.has(sessionId)) {
    activeConversations.set(sessionId, new JobCreationAgent());
  }
  return activeConversations.get(sessionId)!;
}

export function deleteConversation(sessionId: string): void {
  activeConversations.delete(sessionId);
}
