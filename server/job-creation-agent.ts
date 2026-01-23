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
  customer?: string;
  industry?: string;
  introduction?: string;
  department?: string;
  description?: string;
  duties?: string[];
  attributes?: string[];
  qualifications?: string[];
  remuneration?: string;
  gender?: string;
  ethics?: string;
  city?: string;
  province?: string;
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
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  skills?: string[];
}

/**
 * AI Job Creation Agent
 * Conducts conversational interview with HR to build comprehensive job specifications
 */
export class JobCreationAgent {
  private conversationHistory: ConversationMessage[] = [];
  private collectedData: JobSpecData = {};
  private systemPrompt = `You are an expert HR assistant helping to create job requisitions in South Africa.

Your goal is to quickly gather the essential job details in a friendly, efficient conversation. Focus on getting:
1. Job title (what position?)
2. Department/team
3. Location (city/province)
4. Key requirements (experience, licenses, skills)
5. Salary range or pay rate (in ZAR)

For blue-collar roles, understand South African context:
- Truck driver licenses: Code 10, Code 14, Code EC, PrDP
- Forklift/warehouse certifications
- Physical requirements

IMPORTANT INSTRUCTIONS:
- Ask 2-3 related questions at once to speed up the process
- When you have enough info (job title + 3 other fields), summarize what you've collected and confirm if the user wants to create the job
- Be concise and friendly
- If the user provides multiple details at once, acknowledge them all

When summarizing, say something like: "I've collected all the essential details. Ready to create this job posting?"

Start by greeting and asking what position they need to fill.`;

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
    // Minimum required: just title and at least one other field
    const hasTitle = !!this.collectedData.title;
    
    const hasAnyOtherField = !!(
      this.collectedData.department ||
      this.collectedData.description ||
      this.collectedData.location ||
      this.collectedData.employmentType ||
      this.collectedData.salaryMin ||
      this.collectedData.salaryMax ||
      this.collectedData.minYearsExperience !== undefined ||
      (this.collectedData.licenseRequirements && this.collectedData.licenseRequirements.length > 0) ||
      (this.collectedData.certificationsRequired && this.collectedData.certificationsRequired.length > 0)
    );

    // Count how many fields are filled
    const filledFields = Object.entries(this.collectedData).filter(([_, v]) => {
      if (v === undefined || v === null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }).length;

    // Complete if we have title + at least 3 other fields
    return hasTitle && filledFields >= 4;
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

  /**
   * Parse a full job specification text and extract structured data
   */
  async parseFullSpec(fullSpecText: string): Promise<{
    jobSpec: JobSpecData;
    isComplete: boolean;
  }> {
    const parsePrompt = `You are an expert HR assistant. Parse this job specification and extract all relevant details into a structured JSON format.

JOB SPECIFICATION TEXT:
${fullSpecText}

Extract all information into this JSON structure. Include as many fields as you can find in the text:
{
  "title": "string (job title - REQUIRED)",
  "department": "string (department/team - REQUIRED, infer from job title if not explicitly stated. Examples: 'Software Engineer' = 'Engineering', 'Sales Manager' = 'Sales', 'HR Coordinator' = 'Human Resources', 'Driver' = 'Operations', 'Accountant' = 'Finance')",
  "description": "string (full job description including about the role)",
  "location": "string (city, province, country)",
  "employmentType": "full_time | part_time | contract | temporary",
  "shiftStructure": "day | night | rotating | split",
  "salaryMin": number (in ZAR, extract from salary range),
  "salaryMax": number (in ZAR, extract from salary range),
  "payRateUnit": "hourly | daily | monthly | annual",
  "minYearsExperience": number,
  "requirements": ["list of requirements/qualifications"],
  "responsibilities": ["list of job responsibilities"],
  "benefits": ["list of benefits offered"],
  "licenseRequirements": ["Code 10", "Code 14", "Code EC", "PrDP", etc if mentioned],
  "vehicleTypes": ["Rigid Truck", "Articulated Truck", "Forklift", etc if mentioned],
  "certificationsRequired": ["First Aid", "Hazmat", "OHSA", etc if mentioned],
  "physicalRequirements": "string if mentioned",
  "skills": ["list of required skills"]
}

IMPORTANT:
- ALWAYS provide both "title" and "department" fields - these are required
- If department is not explicitly stated, infer it from the job title/role
- Extract salary numbers without currency symbols (just the number)
- If salary is given as a range like "R850,000 - R1,200,000", extract salaryMin as 850000 and salaryMax as 1200000
- Convert all requirements, responsibilities, and benefits into clean arrays
- Return ONLY valid JSON, no additional text`;

    try {
      const extraction = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: parsePrompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const jsonText = extraction.choices[0]?.message?.content || "{}";
      
      // Try to parse JSON from the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);
        
        // Coerce and validate types
        const sanitizedData: JobSpecData & { requirements?: string[]; responsibilities?: string[]; benefits?: string[]; skills?: string[] } = {
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

        // Add additional arrays for frontend display
        const extendedData = {
          ...sanitizedData,
          requirements: Array.isArray(extractedData.requirements) ? extractedData.requirements : undefined,
          responsibilities: Array.isArray(extractedData.responsibilities) ? extractedData.responsibilities : undefined,
          benefits: Array.isArray(extractedData.benefits) ? extractedData.benefits : undefined,
          skills: Array.isArray(extractedData.skills) ? extractedData.skills : undefined,
        };
        
        this.collectedData = extendedData;

        return {
          jobSpec: extendedData,
          isComplete: !!extendedData.title,
        };
      }

      return {
        jobSpec: {},
        isComplete: false,
      };
    } catch (error) {
      console.error("Error parsing full spec:", error);
      throw new Error("Failed to parse job specification. Please try again.");
    }
  }

  /**
   * Research job specification from internet and industry standards
   * Auto-populates all fields based on the job title
   */
  async researchJobSpec(jobTitle: string, customer?: string, industry?: string): Promise<{
    jobSpec: JobSpecData;
    isComplete: boolean;
  }> {
    const researchPrompt = `You are an expert HR consultant in South Africa. Research and create a comprehensive job specification for the following position.

JOB TITLE: ${jobTitle}
${customer ? `CUSTOMER/COMPANY: ${customer}` : ''}
${industry ? `INDUSTRY: ${industry}` : ''}

Based on typical industry standards and best practices in South Africa, generate a complete job specification with the following fields. Be specific and professional:

{
  "title": "${jobTitle}",
  "customer": "${customer || 'To be specified'}",
  "industry": "${industry || 'General'}",
  "introduction": "A compelling 2-3 sentence introduction about the role and its importance",
  "duties": ["List 5-8 key duties and responsibilities"],
  "attributes": ["List 5-7 key attributes, skills and competencies required"],
  "qualifications": ["List required qualifications and certifications"],
  "remuneration": "Typical salary range in ZAR for this role in South Africa (e.g., 'R25,000 - R40,000 per month')",
  "gender": "Any / Male / Female (based on role requirements if applicable, otherwise 'Any')",
  "ethics": "Key ethical requirements and values expected (e.g., 'Integrity, honesty, professional conduct')",
  "city": "Suggested city based on industry presence (e.g., 'Johannesburg')",
  "province": "Corresponding province (e.g., 'Gauteng')",
  "department": "Relevant department",
  "employmentType": "full_time | part_time | contract",
  "minYearsExperience": number,
  "requirements": ["Additional requirements"],
  "responsibilities": ["Detailed responsibilities"],
  "benefits": ["Typical benefits offered"]
}

Return ONLY valid JSON, no other text.`;

    try {
      const research = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert HR consultant specializing in South African job markets. Provide detailed, accurate job specifications based on industry standards."
          },
          {
            role: "user",
            content: researchPrompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      const jsonText = research.choices[0]?.message?.content || "{}";
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);
        
        const jobSpec: JobSpecData = {
          title: extractedData.title || jobTitle,
          customer: extractedData.customer || customer,
          industry: extractedData.industry || industry,
          introduction: extractedData.introduction,
          department: extractedData.department,
          duties: Array.isArray(extractedData.duties) ? extractedData.duties : undefined,
          attributes: Array.isArray(extractedData.attributes) ? extractedData.attributes : undefined,
          qualifications: Array.isArray(extractedData.qualifications) ? extractedData.qualifications : undefined,
          remuneration: extractedData.remuneration,
          gender: extractedData.gender,
          ethics: extractedData.ethics,
          city: extractedData.city,
          province: extractedData.province,
          location: extractedData.city && extractedData.province ? `${extractedData.city}, ${extractedData.province}` : undefined,
          employmentType: extractedData.employmentType,
          minYearsExperience: extractedData.minYearsExperience ? parseInt(String(extractedData.minYearsExperience)) : undefined,
          requirements: Array.isArray(extractedData.requirements) ? extractedData.requirements : undefined,
          responsibilities: Array.isArray(extractedData.responsibilities) ? extractedData.responsibilities : undefined,
          benefits: Array.isArray(extractedData.benefits) ? extractedData.benefits : undefined,
        };
        
        this.collectedData = jobSpec;

        return {
          jobSpec,
          isComplete: true,
        };
      }

      return {
        jobSpec: { title: jobTitle },
        isComplete: false,
      };
    } catch (error) {
      console.error("Error researching job spec:", error);
      throw new Error("Failed to research job specification. Please try again.");
    }
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
