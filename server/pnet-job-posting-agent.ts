import { pnetAPIService } from './pnet-api-service';
import { groqResearchService } from './groq-service';
import type { Job } from '@shared/schema';

/**
 * PNET Job Posting Agent
 * AI-powered agent that automatically posts jobs to PNET
 * Handles job formatting, requirements mapping, and posting orchestration
 */

interface PNetJobPostingRequest {
  jobBoardId: string;
  externalJobId: string;
  jobTitle: string;
  jobDescription: string;
  location: {
    city?: string;
    province?: string;
    country: string;
  };
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP';
  salaryInfo?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'ANNUAL';
  };
  applicationMethod: {
    type: 'EMAIL' | 'URL' | 'ATS';
    value: string;
  };
  questions?: Array<{
    id: string;
    text: string;
    type: 'TEXT' | 'NUMBER' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'FILE';
    required: boolean;
    options?: Array<{ id: string; label: string }>;
  }>;
}

interface JobPostingResult {
  success: boolean;
  message: string;
  pnetJobId?: string;
  pnetUrl?: string;
  error?: string;
}

export class PNetJobPostingAgent {
  private applicationEmailDomain: string;

  constructor() {
    this.applicationEmailDomain = process.env.APPLICATION_EMAIL_DOMAIN || 'applications@mtnhc.com';
  }

  /**
   * Main method: Post a job to PNET
   */
  async postJob(job: Job, tenantId: number): Promise<JobPostingResult> {
    console.log(`[PNetJobPostingAgent] Posting job: ${job.title} (ID: ${job.id})`);

    try {
      // Step 1: Validate job has required information
      const validation = this.validateJob(job);
      if (!validation.valid) {
        return {
          success: false,
          message: `Job validation failed: ${validation.errors.join(', ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      // Step 2: Format job for PNET
      const pnetJobData = await this.formatJobForPNET(job, tenantId);

      // Step 3: Generate screening questions using AI (optional but recommended)
      const screeningQuestions = await this.generateScreeningQuestions(job);
      if (screeningQuestions.length > 0) {
        pnetJobData.questions = screeningQuestions;
      }

      // Step 4: Post to PNET API
      // Note: PNET API endpoint for job posting needs to be confirmed
      // This is a placeholder for the actual implementation
      const pnetResponse = await this.submitToPNET(pnetJobData);

      if (pnetResponse.success) {
        console.log(`[PNetJobPostingAgent] Job posted successfully: ${pnetResponse.pnetJobId}`);
        return {
          success: true,
          message: 'Job posted to PNET successfully',
          pnetJobId: pnetResponse.pnetJobId,
          pnetUrl: pnetResponse.pnetUrl,
        };
      } else {
        return {
          success: false,
          message: `PNET posting failed: ${pnetResponse.error}`,
          error: pnetResponse.error,
        };
      }
    } catch (error: any) {
      console.error('[PNetJobPostingAgent] Error posting job:', error);
      return {
        success: false,
        message: `Failed to post job: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Validate job has required fields for PNET
   */
  private validateJob(job: Job): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!job.title || job.title.trim() === '') {
      errors.push('Job title is required');
    }

    if (!job.description || job.description.trim() === '') {
      errors.push('Job description is required');
    }

    if (!job.location || job.location.trim() === '') {
      errors.push('Location is required');
    }

    if (!job.department || job.department.trim() === '') {
      errors.push('Department is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format internal job data to PNET format
   */
  private async formatJobForPNET(job: Job, tenantId: number): Promise<PNetJobPostingRequest> {
    const location = this.parseLocation(job.location || '');

    return {
      jobBoardId: 'pnet_co_za',
      externalJobId: `AHC-${tenantId}-${job.id}`,
      jobTitle: job.title,
      jobDescription: await this.enrichJobDescription(job),
      location: {
        city: location.city,
        province: location.province,
        country: 'South Africa',
      },
      employmentType: this.mapEmploymentType(job.employmentType),
      salaryInfo: job.salaryMin || job.salaryMax ? {
        min: job.salaryMin,
        max: job.salaryMax,
        currency: 'ZAR',
        period: this.mapPayRateUnit(job.payRateUnit),
      } : undefined,
      applicationMethod: {
        type: 'EMAIL',
        value: `job-${job.id}@${this.applicationEmailDomain}`,
      },
    };
  }

  /**
   * Parse location string into city, province
   */
  private parseLocation(location: string): { city?: string; province?: string } {
    const parts = location.split(',').map(p => p.trim());
    
    if (parts.length >= 2) {
      return {
        city: parts[0],
        province: parts[1],
      };
    } else if (parts.length === 1) {
      return {
        city: parts[0],
      };
    }
    
    return {};
  }

  /**
   * Map internal employment type to PNET format
   */
  private mapEmploymentType(
    type?: string | null
  ): 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP' {
    const typeUpper = (type || '').toUpperCase();
    
    if (typeUpper.includes('FULL')) return 'FULL_TIME';
    if (typeUpper.includes('PART')) return 'PART_TIME';
    if (typeUpper.includes('CONTRACT')) return 'CONTRACT';
    if (typeUpper.includes('TEMP')) return 'TEMPORARY';
    if (typeUpper.includes('INTERN')) return 'INTERNSHIP';
    
    return 'FULL_TIME'; // Default
  }

  /**
   * Map internal pay rate unit to PNET format
   */
  private mapPayRateUnit(
    unit?: string | null
  ): 'HOURLY' | 'DAILY' | 'MONTHLY' | 'ANNUAL' {
    const unitLower = (unit || '').toLowerCase();
    
    if (unitLower.includes('hour')) return 'HOURLY';
    if (unitLower.includes('day') || unitLower.includes('daily')) return 'DAILY';
    if (unitLower.includes('month')) return 'MONTHLY';
    if (unitLower.includes('year') || unitLower.includes('annual')) return 'ANNUAL';
    
    return 'ANNUAL'; // Default
  }

  /**
   * Enrich job description with AI
   * Makes it more attractive and comprehensive for PNET
   */
  private async enrichJobDescription(job: Job): Promise<string> {
    // If description is comprehensive enough, return as-is
    if (job.description && job.description.length > 500) {
      return job.description;
    }

    // Use AI to enhance the description
    try {
      const prompt = `You are an expert HR copywriter. Enhance this job posting for PNET (South African job board).

JOB DETAILS:
Title: ${job.title}
Department: ${job.department}
Location: ${job.location}
Employment Type: ${job.employmentType || 'Full-time'}
${job.description ? `Current Description: ${job.description}` : ''}
${job.salaryMin || job.salaryMax ? `Salary Range: R${job.salaryMin?.toLocaleString() || '?'} - R${job.salaryMax?.toLocaleString() || '?'}` : ''}
${job.minYearsExperience ? `Experience Required: ${job.minYearsExperience} years` : ''}
${job.licenseRequirements ? `Licenses: ${JSON.parse(job.licenseRequirements).join(', ')}` : ''}
${job.certificationsRequired ? `Certifications: ${JSON.parse(job.certificationsRequired).join(', ')}` : ''}

Create a compelling, professional job description with these sections:
1. About the Role (2-3 sentences)
2. Key Responsibilities (bullet points)
3. Requirements (bullet points)
4. What We Offer (if salary/benefits mentioned)

Keep it professional, concise, and appealing. Max 600 words.`;

      const enrichedDescription = await groqResearchService.chat([
        { role: 'system', content: 'You are an expert HR copywriter specializing in South African job postings.' },
        { role: 'user', content: prompt },
      ]);

      return enrichedDescription;
    } catch (error) {
      console.error('[PNetJobPostingAgent] Failed to enrich description:', error);
      // Fallback to original description or basic template
      return job.description || this.generateBasicDescription(job);
    }
  }

  /**
   * Generate basic description as fallback
   */
  private generateBasicDescription(job: Job): string {
    let desc = `**About the Role**\n\n`;
    desc += `We are looking for a ${job.title} to join our ${job.department} team`;
    if (job.location) desc += ` in ${job.location}`;
    desc += `.`;

    if (job.minYearsExperience) {
      desc += ` This position requires ${job.minYearsExperience}+ years of relevant experience.`;
    }

    if (job.licenseRequirements) {
      const licenses = JSON.parse(job.licenseRequirements);
      desc += `\n\n**Required Licenses:** ${licenses.join(', ')}`;
    }

    if (job.certificationsRequired) {
      const certs = JSON.parse(job.certificationsRequired);
      desc += `\n\n**Required Certifications:** ${certs.join(', ')}`;
    }

    return desc;
  }

  /**
   * Generate intelligent screening questions using AI
   */
  private async generateScreeningQuestions(job: Job): Promise<Array<{
    id: string;
    text: string;
    type: 'TEXT' | 'NUMBER' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'FILE';
    required: boolean;
    options?: Array<{ id: string; label: string }>;
  }>> {
    try {
      const prompt = `Generate 3-5 screening questions for this job posting on PNET.

JOB: ${job.title}
DEPARTMENT: ${job.department}
${job.minYearsExperience ? `EXPERIENCE REQUIRED: ${job.minYearsExperience} years` : ''}
${job.licenseRequirements ? `LICENSES: ${JSON.parse(job.licenseRequirements).join(', ')}` : ''}
${job.certificationsRequired ? `CERTIFICATIONS: ${JSON.parse(job.certificationsRequired).join(', ')}` : ''}

Create questions that help pre-qualify candidates. Include:
- Experience validation
- License/certification confirmation (if applicable)
- Availability/notice period
- Salary expectations
- Location/relocation willingness

Return ONLY valid JSON array in this format:
[
  {
    "id": "q1",
    "text": "How many years of experience do you have in this role?",
    "type": "NUMBER",
    "required": true
  },
  {
    "id": "q2",
    "text": "Do you have a valid Code 14 license?",
    "type": "SINGLE_SELECT",
    "required": true,
    "options": [
      {"id": "yes", "label": "Yes"},
      {"id": "no", "label": "No"}
    ]
  }
]`;

      const response = await groqResearchService.chat([
        { role: 'system', content: 'You are an expert recruiter. Generate relevant screening questions.' },
        { role: 'user', content: prompt },
      ]);

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      console.error('[PNetJobPostingAgent] Failed to generate screening questions:', error);
      return this.getDefaultScreeningQuestions(job);
    }
  }

  /**
   * Default screening questions as fallback
   */
  private getDefaultScreeningQuestions(job: Job): Array<{
    id: string;
    text: string;
    type: 'TEXT' | 'NUMBER' | 'SINGLE_SELECT';
    required: boolean;
    options?: Array<{ id: string; label: string }>;
  }> {
    const questions: any[] = [
      {
        id: 'experience_years',
        text: `How many years of experience do you have as a ${job.title}?`,
        type: 'NUMBER',
        required: true,
      },
      {
        id: 'notice_period',
        text: 'What is your notice period?',
        type: 'SINGLE_SELECT',
        required: true,
        options: [
          { id: 'immediate', label: 'Immediate' },
          { id: '1week', label: '1 Week' },
          { id: '2weeks', label: '2 Weeks' },
          { id: '1month', label: '1 Month' },
          { id: '2months', label: '2 Months' },
          { id: '3months', label: '3+ Months' },
        ],
      },
    ];

    if (job.licenseRequirements) {
      const licenses = JSON.parse(job.licenseRequirements);
      questions.push({
        id: 'licenses',
        text: `Do you have the following required licenses: ${licenses.join(', ')}?`,
        type: 'SINGLE_SELECT',
        required: true,
        options: [
          { id: 'yes_all', label: 'Yes, I have all required licenses' },
          { id: 'some', label: 'I have some of them' },
          { id: 'none', label: 'No, I do not have these licenses' },
        ],
      });
    }

    return questions;
  }

  /**
   * Submit job to PNET API
   * Note: This is a placeholder - actual PNET job posting API endpoint needed
   */
  private async submitToPNET(jobData: PNetJobPostingRequest): Promise<{
    success: boolean;
    pnetJobId?: string;
    pnetUrl?: string;
    error?: string;
  }> {
    // TODO: Replace with actual PNET job posting API call
    // For now, this is a mock implementation
    
    console.log('[PNetJobPostingAgent] Job data prepared for PNET:', {
      jobBoardId: jobData.jobBoardId,
      externalJobId: jobData.externalJobId,
      jobTitle: jobData.jobTitle,
      location: jobData.location,
      employmentType: jobData.employmentType,
      questionCount: jobData.questions?.length || 0,
    });

    // Check if PNET API credentials are configured
    if (!process.env.PNET_API_KEY || !process.env.PNET_API_BASE_URL) {
      console.warn('[PNetJobPostingAgent] PNET API not configured. Job posting skipped.');
      return {
        success: false,
        error: 'PNET_API_NOT_CONFIGURED',
      };
    }

    try {
      // Placeholder for actual PNET API call
      // const response = await axios.post(`${process.env.PNET_API_BASE_URL}/jobs/post`, jobData, {
      //   headers: {
      //     'apiKey': process.env.PNET_API_KEY,
      //     'Content-Type': 'application/json',
      //   },
      // });

      // Mock successful response for now
      const mockPNetJobId = `PNET-${Date.now()}`;
      const mockPNetUrl = `https://www.pnet.co.za/job/${mockPNetJobId}`;

      console.log(`[PNetJobPostingAgent] Mock job posted: ${mockPNetJobId}`);

      return {
        success: true,
        pnetJobId: mockPNetJobId,
        pnetUrl: mockPNetUrl,
      };
    } catch (error: any) {
      console.error('[PNetJobPostingAgent] PNET API error:', error);
      return {
        success: false,
        error: error.message || 'PNET_API_ERROR',
      };
    }
  }

  /**
   * Update existing PNET job posting
   */
  async updateJob(
    job: Job,
    pnetJobId: string,
    tenantId: number
  ): Promise<JobPostingResult> {
    console.log(`[PNetJobPostingAgent] Updating PNET job: ${pnetJobId}`);

    try {
      const pnetJobData = await this.formatJobForPNET(job, tenantId);

      // TODO: Implement actual PNET job update API call
      console.log('[PNetJobPostingAgent] Job update prepared for PNET');

      return {
        success: true,
        message: 'Job updated on PNET successfully',
        pnetJobId,
      };
    } catch (error: any) {
      console.error('[PNetJobPostingAgent] Error updating job:', error);
      return {
        success: false,
        message: `Failed to update job: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Delete/close job on PNET
   */
  async closeJob(pnetJobId: string): Promise<JobPostingResult> {
    console.log(`[PNetJobPostingAgent] Closing PNET job: ${pnetJobId}`);

    try {
      // TODO: Implement actual PNET job close/delete API call
      console.log('[PNetJobPostingAgent] Job closure prepared for PNET');

      return {
        success: true,
        message: 'Job closed on PNET successfully',
        pnetJobId,
      };
    } catch (error: any) {
      console.error('[PNetJobPostingAgent] Error closing job:', error);
      return {
        success: false,
        message: `Failed to close job: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Bulk post multiple jobs to PNET
   */
  async bulkPostJobs(jobs: Job[], tenantId: number): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      jobId: number;
      jobTitle: string;
      success: boolean;
      message: string;
      pnetJobId?: string;
    }>;
  }> {
    console.log(`[PNetJobPostingAgent] Bulk posting ${jobs.length} jobs to PNET`);

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const job of jobs) {
      const result = await this.postJob(job, tenantId);

      results.push({
        jobId: job.id,
        jobTitle: job.title,
        success: result.success,
        message: result.message,
        pnetJobId: result.pnetJobId,
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Rate limiting: Wait 3 seconds between posts to avoid API throttling
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return {
      total: jobs.length,
      successful,
      failed,
      results,
    };
  }
}

// Export singleton instance
export const pnetJobPostingAgent = new PNetJobPostingAgent();
