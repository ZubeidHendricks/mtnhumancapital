import Groq from "groq-sdk";
import OpenAI from "openai";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Initialize OpenAI client if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Embedding Service for Job Requirements and Candidate Resumes
 * Generates vector embeddings for RAG-based semantic matching
 */
export class EmbeddingService {
  /**
   * Generate embedding vector using OpenAI or fallback to placeholder
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!openai) {
      console.warn("⚠️  OpenAI API key not configured. Using placeholder embedding.");
      console.warn("   Set OPENAI_API_KEY environment variable for real embeddings.");
      return new Array(1536).fill(0);
    }

    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 1536,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error("OpenAI embedding error:", error.message);
      // Fall back to placeholder on error
      return new Array(1536).fill(0);
    }
  }
  /**
   * Generate embedding for job requirements
   * Combines all job details into a comprehensive text representation for embedding
   */
  async generateJobEmbedding(jobData: {
    title: string;
    department: string;
    description?: string | null;
    location?: string | null;
    employmentType?: string | null;
    shiftStructure?: string | null;
    minYearsExperience?: number | null;
    licenseRequirements?: string[] | null;
    vehicleTypes?: string[] | null;
    certificationsRequired?: string[] | null;
    physicalRequirements?: string | null;
    equipmentExperience?: any;
    salaryMin?: number | null;
    salaryMax?: number | null;
    payRateUnit?: string | null;
  }): Promise<number[]> {
    try {
      // Construct comprehensive job requirements text
      const requirementsText = this.buildRequirementsText(jobData);

      console.log(`Generating embedding for job: ${jobData.title}`);
      console.log(`Requirements text (${requirementsText.length} chars)`);

      // Use OpenAI to generate real embeddings
      return await this.generateEmbedding(requirementsText);
    } catch (error) {
      console.error("Error generating job embedding:", error);
      throw new Error(`Failed to generate job embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embedding for candidate resume
   */
  async generateCandidateEmbedding(candidateData: {
    fullName: string;
    role?: string | null;
    summary?: string | null;
    skills?: string[] | null;
    experience?: any[] | null;
    education?: any[] | null;
    yearsOfExperience?: number | null;
  }): Promise<number[]> {
    try {
      const resumeText = this.buildCandidateText(candidateData);

      console.log(`Generating embedding for candidate: ${candidateData.fullName}`);
      
      return await this.generateEmbedding(resumeText);
    } catch (error) {
      console.error("Error generating candidate embedding:", error);
      throw new Error(`Failed to generate candidate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build comprehensive candidate text for embedding
   */
  private buildCandidateText(candidateData: {
    fullName: string;
    role?: string | null;
    summary?: string | null;
    skills?: string[] | null;
    experience?: any[] | null;
    education?: any[] | null;
    yearsOfExperience?: number | null;
  }): string {
    const parts: string[] = [];

    parts.push(`Candidate: ${candidateData.fullName}`);

    if (candidateData.role) {
      parts.push(`Role: ${candidateData.role}`);
    }

    if (candidateData.yearsOfExperience) {
      parts.push(`Experience: ${candidateData.yearsOfExperience} years`);
    }

    if (candidateData.summary) {
      parts.push(`Summary: ${candidateData.summary}`);
    }

    if (candidateData.skills && candidateData.skills.length > 0) {
      parts.push(`Skills: ${candidateData.skills.join(", ")}`);
    }

    if (candidateData.experience && candidateData.experience.length > 0) {
      const expText = candidateData.experience.map((exp: any) => 
        `${exp.title} at ${exp.company} (${exp.duration})`
      ).join("; ");
      parts.push(`Experience: ${expText}`);
    }

    if (candidateData.education && candidateData.education.length > 0) {
      const eduText = candidateData.education.map((edu: any) =>
        `${edu.degree} from ${edu.institution}`
      ).join("; ");
      parts.push(`Education: ${eduText}`);
    }

    return parts.join(" | ");
  }

  /**
   * Build comprehensive text representation of job requirements
   */
  private buildRequirementsText(jobData: {
    title: string;
    department: string;
    description?: string | null;
    location?: string | null;
    employmentType?: string | null;
    shiftStructure?: string | null;
    minYearsExperience?: number | null;
    licenseRequirements?: string[] | null;
    vehicleTypes?: string[] | null;
    certificationsRequired?: string[] | null;
    physicalRequirements?: string | null;
    equipmentExperience?: any;
    salaryMin?: number | null;
    salaryMax?: number | null;
    payRateUnit?: string | null;
  }): string {
    const parts: string[] = [];

    // Job Title and Department
    parts.push(`Job Title: ${jobData.title}`);
    parts.push(`Department: ${jobData.department}`);

    // Description
    if (jobData.description) {
      parts.push(`\nJob Description:\n${jobData.description}`);
    }

    // Location and Type
    if (jobData.location) parts.push(`\nLocation: ${jobData.location}`);
    if (jobData.employmentType) parts.push(`Employment Type: ${jobData.employmentType}`);
    if (jobData.shiftStructure) parts.push(`Shift: ${jobData.shiftStructure}`);

    // Experience
    if (jobData.minYearsExperience) {
      parts.push(`\nMinimum Experience: ${jobData.minYearsExperience} years`);
    }

    // Licenses and Certifications
    if (jobData.licenseRequirements && jobData.licenseRequirements.length > 0) {
      parts.push(`\nRequired Licenses: ${jobData.licenseRequirements.join(', ')}`);
    }

    if (jobData.vehicleTypes && jobData.vehicleTypes.length > 0) {
      parts.push(`Vehicle Types: ${jobData.vehicleTypes.join(', ')}`);
    }

    if (jobData.certificationsRequired && jobData.certificationsRequired.length > 0) {
      parts.push(`Required Certifications: ${jobData.certificationsRequired.join(', ')}`);
    }

    // Physical Requirements
    if (jobData.physicalRequirements) {
      parts.push(`\nPhysical Requirements: ${jobData.physicalRequirements}`);
    }

    // Equipment Experience
    if (jobData.equipmentExperience) {
      const equipment = Object.entries(jobData.equipmentExperience)
        .map(([name, level]) => `${name} (${level})`)
        .join(', ');
      if (equipment) {
        parts.push(`Equipment Experience: ${equipment}`);
      }
    }

    // Compensation
    if (jobData.salaryMin || jobData.salaryMax) {
      const salaryRange = `R${jobData.salaryMin || 0} - R${jobData.salaryMax || 0}`;
      const unit = jobData.payRateUnit || 'monthly';
      parts.push(`\nCompensation: ${salaryRange} ${unit}`);
    }

    return parts.join('\n');
  }

  /**
   * Calculate similarity score between job embedding and candidate resume embedding
   * @returns Similarity score from 0-100
   */
  calculateSimilarity(jobEmbedding: number[], candidateEmbedding: number[]): number {
    if (!jobEmbedding || !candidateEmbedding || jobEmbedding.length !== candidateEmbedding.length) {
      return 0;
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let jobMagnitude = 0;
    let candidateMagnitude = 0;

    for (let i = 0; i < jobEmbedding.length; i++) {
      dotProduct += jobEmbedding[i] * candidateEmbedding[i];
      jobMagnitude += jobEmbedding[i] * jobEmbedding[i];
      candidateMagnitude += candidateEmbedding[i] * candidateEmbedding[i];
    }

    jobMagnitude = Math.sqrt(jobMagnitude);
    candidateMagnitude = Math.sqrt(candidateMagnitude);

    if (jobMagnitude === 0 || candidateMagnitude === 0) {
      return 0;
    }

    const similarity = dotProduct / (jobMagnitude * candidateMagnitude);
    
    // Convert from -1 to 1 range to 0-100 percentage
    return Math.round(((similarity + 1) / 2) * 100);
  }
}

export const embeddingService = new EmbeddingService();
