import Groq from "groq-sdk";
import { z } from "zod";
import type { Job } from "@shared/schema";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const CandidateSchema = z.object({
  name: z.string().min(1),
  currentRole: z.string().min(1),
  company: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).default([]),
  experience: z.string().optional(),
  match: z.number().min(0).max(100).default(50),
});

const SourcingConfigSchema = z.object({
  targetCandidateProfiles: z.array(z.string()).default([]),
  booleanSearchStrings: z.array(z.string()).default([]),
  targetEmployers: z.array(z.string()).default([]),
  filterKeywords: z.array(z.string()).default([]),
  screeningCriteria: z.array(z.string()).default([]),
  salaryRange: z.object({
    min: z.number().default(12000),
    max: z.number().default(17000),
    currency: z.string().default("ZAR"),
  }).default({ min: 12000, max: 17000, currency: "ZAR" }),
  outreachScript: z.string().default(""),
});

function safeParseJSON(text: string, type: "array" | "object"): any {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    if (type === "array") {
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }
    } else {
      const objMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objMatch) {
        return JSON.parse(objMatch[0]);
      }
    }
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("JSON parse error:", error);
    return type === "array" ? [] : {};
  }
}

export interface SourcingConfiguration {
  targetCandidateProfiles: string[];
  booleanSearchStrings: string[];
  targetEmployers: string[];
  jobBoards: string[];
  facebookGroups: string[];
  filterKeywords: string[];
  screeningCriteria: string[];
  salaryRange: { min: number; max: number; currency: string };
  outreachScript: string;
}

export interface SpecialistCandidate {
  name: string;
  currentRole: string;
  company?: string;
  location?: string;
  skills: string[];
  experience?: string;
  match: number;
  source: string;
  specialist: string;
  profileUrl?: string;
  email?: string;
  phone?: string;
  rawData: Record<string, any>;
}

export interface SpecialistResult {
  specialist: string;
  candidates: SpecialistCandidate[];
  searchQuery: string;
  timestamp: Date;
  status: "success" | "error" | "no_results";
  errorMessage?: string;
}

abstract class BaseSourcingSpecialist {
  abstract name: string;
  abstract platform: string;
  abstract description: string;

  async generateSearchConfiguration(job: Job): Promise<SourcingConfiguration> {
    console.log(`[${this.name}] Generating search configuration for: ${job.title}`);

    const prompt = `You are an expert ${this.platform} recruiter in South Africa. Generate a comprehensive search configuration for sourcing candidates.

Job Details:
- Title: ${job.title}
- Department: ${job.department || 'Not specified'}
- Location: ${job.location || 'South Africa'}
- Description: ${job.description || 'Not provided'}

Generate a detailed sourcing configuration in JSON format:
{
  "targetCandidateProfiles": ["<profile 1>", "<profile 2>", ...],
  "booleanSearchStrings": ["<boolean search 1>", "<boolean search 2>", ...],
  "targetEmployers": ["<company 1>", "<company 2>", ...],
  "filterKeywords": ["<keyword 1>", "<keyword 2>", ...],
  "screeningCriteria": ["<criteria 1>", "<criteria 2>", ...],
  "salaryRange": { "min": <number>, "max": <number>, "currency": "ZAR" },
  "outreachScript": "<personalized outreach message>"
}

For Boolean Search Strings, use proper ${this.platform} syntax with OR, AND, NOT operators.
For Target Employers, include major South African companies in relevant industries.
For Screening Criteria, include must-have qualifications and nice-to-haves.
Make the outreach script professional and personalized for South African candidates.`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a ${this.platform} sourcing specialist for the South African market. Generate precise search configurations for talent acquisition. IMPORTANT: Return ONLY valid JSON, no explanatory text.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content || "";
      const parsed = safeParseJSON(response, "object");
      
      const validated = SourcingConfigSchema.safeParse(parsed);
      if (validated.success) {
        return {
          ...validated.data,
          jobBoards: this.getDefaultJobBoards(),
          facebookGroups: this.getDefaultFacebookGroups(job),
          outreachScript: validated.data.outreachScript || this.getDefaultOutreachScript(job),
        };
      }
      
      console.warn(`[${this.name}] Config validation failed, using defaults`);
    } catch (error) {
      console.error(`[${this.name}] Error generating config:`, error);
    }

    return this.getDefaultConfiguration(job);
  }

  abstract getDefaultJobBoards(): string[];
  abstract getDefaultFacebookGroups(job: Job): string[];
  abstract getDefaultOutreachScript(job: Job): string;
  abstract searchCandidates(job: Job, config: SourcingConfiguration, limit: number): Promise<SpecialistCandidate[]>;

  getDefaultConfiguration(job: Job): SourcingConfiguration {
    return {
      targetCandidateProfiles: [job.title],
      booleanSearchStrings: [`"${job.title}" OR "${job.department}"`],
      targetEmployers: [],
      jobBoards: this.getDefaultJobBoards(),
      facebookGroups: this.getDefaultFacebookGroups(job),
      filterKeywords: [job.title, job.department].filter(Boolean) as string[],
      screeningCriteria: [],
      salaryRange: { min: 12000, max: 17000, currency: "ZAR" },
      outreachScript: this.getDefaultOutreachScript(job),
    };
  }
}

export class LinkedInSpecialist extends BaseSourcingSpecialist {
  name = "LinkedIn Specialist";
  platform = "LinkedIn";
  description = "Specializes in sourcing professional candidates through LinkedIn's network, focusing on passive candidates and industry connections.";

  getDefaultJobBoards(): string[] {
    return ["LinkedIn", "LinkedIn Recruiter", "LinkedIn Sales Navigator"];
  }

  getDefaultFacebookGroups(job: Job): string[] {
    return [
      "SA Professional Network",
      "Jobs in South Africa",
      `${job.department || 'Professional'} Jobs SA`,
    ];
  }

  getDefaultOutreachScript(job: Job): string {
    return `Hello, We are recruiting for a ${job.title} role in ${job.location || 'South Africa'}. Your experience in ${job.department || 'this field'} looks like a strong match. Would you be open to discussing this opportunity?`;
  }

  async searchCandidates(job: Job, config: SourcingConfiguration, limit: number = 10): Promise<SpecialistCandidate[]> {
    console.log(`[${this.name}] Searching LinkedIn for: ${job.title}`);

    const prompt = `You are a LinkedIn Recruiter AI specialist sourcing candidates in South Africa.

Search Configuration:
- Target Profiles: ${config.targetCandidateProfiles.join(', ')}
- Boolean Search: ${config.booleanSearchStrings[0] || job.title}
- Target Employers: ${config.targetEmployers.join(', ') || 'Major SA companies'}
- Filter Keywords: ${config.filterKeywords.join(', ')}
- Screening Criteria: ${config.screeningCriteria.join(', ')}
- Salary Range: R${config.salaryRange.min} - R${config.salaryRange.max}

Job Details:
- Title: ${job.title}
- Department: ${job.department}
- Location: ${job.location || 'South Africa'}

Generate ${limit} realistic LinkedIn candidate profiles. For each candidate provide:
{
  "name": "<realistic South African name>",
  "currentRole": "<current job title>",
  "company": "<realistic SA company from target employers or similar>",
  "location": "<SA city>",
  "skills": ["<skill matching screening criteria>", ...],
  "experience": "<years and summary>",
  "match": <0-100>,
  "email": "<realistic professional email based on name and company>",
  "phone": "<realistic South African mobile number starting with +27 or 0>",
  "headline": "<LinkedIn headline>",
  "connections": <number>,
  "profileSummary": "<brief professional summary>"
}

Focus on passive candidates who are currently employed at target employers. Every candidate MUST have a phone number and email. Return as JSON array.`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a LinkedIn Recruiter specialist for the South African market. Generate realistic professional candidate profiles. IMPORTANT: Return ONLY a valid JSON array, no explanatory text."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content || "";
      const parsed = safeParseJSON(response, "array");

      if (Array.isArray(parsed) && parsed.length > 0) {
        const candidates: SpecialistCandidate[] = [];
        for (const c of parsed) {
          const validated = CandidateSchema.safeParse(c);
          if (!validated.success) continue;
          
          candidates.push({
            name: validated.data.name,
            currentRole: validated.data.currentRole,
            company: validated.data.company || c.company,
            location: validated.data.location || c.location,
            skills: validated.data.skills,
            experience: validated.data.experience || c.experience,
            match: validated.data.match,
            source: "LinkedIn",
            specialist: this.name,
            email: c.email || undefined,
            phone: c.phone || undefined,
            profileUrl: `https://linkedin.com/in/${validated.data.name.toLowerCase().replace(/\s+/g, '-')}`,
            rawData: { headline: c.headline, connections: c.connections, profileSummary: c.profileSummary },
          });
        }
        return candidates;
      }
    } catch (error) {
      console.error(`[${this.name}] Search error:`, error);
    }

    return [];
  }
}

export class PNetSpecialist extends BaseSourcingSpecialist {
  name = "PNet Specialist";
  platform = "PNet";
  description = "Specializes in sourcing candidates through PNet, South Africa's largest job portal, focusing on active job seekers and CV database searches.";

  getDefaultJobBoards(): string[] {
    return ["PNet", "CareerJunction", "Careers24"];
  }

  getDefaultFacebookGroups(job: Job): string[] {
    return [
      "PNet Job Alerts SA",
      "Jobs in Gauteng",
      "Jobs in Cape Town",
      `${job.location || 'South Africa'} Jobs`,
    ];
  }

  getDefaultOutreachScript(job: Job): string {
    return `Hi, I noticed your profile on PNet and wanted to reach out about an exciting ${job.title} opportunity in ${job.location || 'South Africa'}. The role offers competitive salary and growth opportunities. Would you like to learn more?`;
  }

  async searchCandidates(job: Job, config: SourcingConfiguration, limit: number = 10): Promise<SpecialistCandidate[]> {
    console.log(`[${this.name}] Searching PNet for: ${job.title}`);

    const prompt = `You are a PNet CV Database Search specialist for South African recruitment.

Search Configuration:
- Target Profiles: ${config.targetCandidateProfiles.join(', ')}
- Boolean Search: ${config.booleanSearchStrings[0] || job.title}
- Target Employers: ${config.targetEmployers.join(', ') || 'SA companies'}
- Filter Keywords: ${config.filterKeywords.join(', ')}
- Screening Criteria: ${config.screeningCriteria.join(', ')}
- Salary Range: R${config.salaryRange.min} - R${config.salaryRange.max} per month

Job Details:
- Title: ${job.title}
- Department: ${job.department}
- Location: ${job.location || 'South Africa'}

Generate ${limit} realistic PNet candidate profiles. These are ACTIVE job seekers. For each:
{
  "name": "<realistic South African name>",
  "currentRole": "<current or most recent job title>",
  "company": "<current or previous SA company>",
  "location": "<SA city - focus on Gauteng, Cape Town, Durban>",
  "skills": ["<relevant skill>", ...],
  "experience": "<years and details>",
  "match": <0-100>,
  "email": "<realistic email address based on name>",
  "phone": "<realistic South African mobile number starting with +27 or 0>",
  "availability": "<immediate/1 month notice/2 months notice>",
  "expectedSalary": "<salary expectation in ZAR>",
  "lastActive": "<days ago on PNet>"
}

PNet candidates are typically actively looking for work. Include a mix of availability statuses. Every candidate MUST have a phone number and email. Return as JSON array.`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a PNet recruitment specialist for South Africa. Generate realistic job seeker profiles. IMPORTANT: Return ONLY a valid JSON array, no explanatory text."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content || "";
      const parsed = safeParseJSON(response, "array");

      if (Array.isArray(parsed) && parsed.length > 0) {
        const candidates: SpecialistCandidate[] = [];
        for (const c of parsed) {
          const validated = CandidateSchema.safeParse(c);
          if (!validated.success) continue;
          
          candidates.push({
            name: validated.data.name,
            currentRole: validated.data.currentRole,
            company: validated.data.company || c.company,
            location: validated.data.location || c.location,
            skills: validated.data.skills,
            experience: validated.data.experience || c.experience,
            match: validated.data.match,
            source: "PNet",
            specialist: this.name,
            email: c.email || undefined,
            phone: c.phone || undefined,
            rawData: {
              availability: c.availability,
              expectedSalary: c.expectedSalary,
              lastActive: c.lastActive,
            },
          });
        }
        return candidates;
      }
    } catch (error) {
      console.error(`[${this.name}] Search error:`, error);
    }

    return [];
  }
}

export class IndeedSpecialist extends BaseSourcingSpecialist {
  name = "Indeed Specialist";
  platform = "Indeed";
  description = "Specializes in sourcing candidates through Indeed's resume database and job applications, focusing on volume hiring and diverse candidate pools.";

  getDefaultJobBoards(): string[] {
    return ["Indeed", "Indeed Resume Search", "Facebook Jobs"];
  }

  getDefaultFacebookGroups(job: Job): string[] {
    return [
      "Indeed Jobs South Africa",
      "Job Seekers SA",
      "Employment Opportunities SA",
      `${job.department || 'General'} Jobs South Africa`,
    ];
  }

  getDefaultOutreachScript(job: Job): string {
    return `Good day, I came across your resume on Indeed and believe you could be an excellent fit for our ${job.title} position in ${job.location || 'South Africa'}. This role offers R12,000-R17,000 depending on experience. Interested in learning more?`;
  }

  async searchCandidates(job: Job, config: SourcingConfiguration, limit: number = 10): Promise<SpecialistCandidate[]> {
    console.log(`[${this.name}] Searching Indeed for: ${job.title}`);

    const prompt = `You are an Indeed Resume Database specialist for South African recruitment.

Search Configuration:
- Target Profiles: ${config.targetCandidateProfiles.join(', ')}
- Boolean Search: ${config.booleanSearchStrings[0] || job.title}
- Target Employers: ${config.targetEmployers.join(', ') || 'Various SA employers'}
- Filter Keywords: ${config.filterKeywords.join(', ')}
- Screening Criteria: ${config.screeningCriteria.join(', ')}
- Salary Range: R${config.salaryRange.min} - R${config.salaryRange.max}

Job Details:
- Title: ${job.title}
- Department: ${job.department}
- Location: ${job.location || 'South Africa'}

Generate ${limit} realistic Indeed candidate profiles. Mix of employed and unemployed job seekers. For each:
{
  "name": "<realistic South African name>",
  "currentRole": "<current or desired job title>",
  "company": "<current employer or 'Seeking Employment'>",
  "location": "<SA city>",
  "skills": ["<skill>", ...],
  "experience": "<years and summary>",
  "match": <0-100>,
  "email": "<realistic email address based on name>",
  "phone": "<realistic South African mobile number starting with +27 or 0>",
  "resumeUpdated": "<when resume was last updated>",
  "willingToRelocate": <true/false>,
  "education": "<highest qualification>"
}

Indeed has more entry-level and blue-collar candidates. Include diverse backgrounds. Every candidate MUST have a phone number and email. Return as JSON array.`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an Indeed recruitment specialist for South Africa. Generate diverse, realistic job seeker profiles. IMPORTANT: Return ONLY a valid JSON array, no explanatory text."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content || "";
      const parsed = safeParseJSON(response, "array");

      if (Array.isArray(parsed) && parsed.length > 0) {
        const candidates: SpecialistCandidate[] = [];
        for (const c of parsed) {
          const validated = CandidateSchema.safeParse(c);
          if (!validated.success) continue;
          
          candidates.push({
            name: validated.data.name,
            currentRole: validated.data.currentRole,
            company: validated.data.company || c.company,
            location: validated.data.location || c.location,
            skills: validated.data.skills,
            experience: validated.data.experience || c.experience,
            match: validated.data.match,
            source: "Indeed",
            specialist: this.name,
            email: c.email || undefined,
            phone: c.phone || undefined,
            rawData: {
              resumeUpdated: c.resumeUpdated,
              willingToRelocate: c.willingToRelocate,
              education: c.education,
            },
          });
        }
        return candidates;
      }
    } catch (error) {
      console.error(`[${this.name}] Search error:`, error);
    }

    return [];
  }
}

export class SourcingOrchestrator {
  private specialists: BaseSourcingSpecialist[];

  constructor() {
    this.specialists = [
      new LinkedInSpecialist(),
      new PNetSpecialist(),
      new IndeedSpecialist(),
    ];
  }

  getSpecialists() {
    return this.specialists.map(s => ({
      name: s.name,
      platform: s.platform,
      description: s.description,
    }));
  }

  async runAllSpecialists(
    job: Job,
    candidatesPerSpecialist: number = 7,
    enabledPlatforms?: string[]
  ): Promise<{ results: SpecialistResult[]; allCandidates: SpecialistCandidate[]; configuration: SourcingConfiguration }> {
    console.log(`[SourcingOrchestrator] Running all specialists for: ${job.title}`);
    
    // Filter specialists based on enabled platforms from tenant config
    let activeSpecialists = this.specialists;
    if (enabledPlatforms && enabledPlatforms.length > 0) {
      const platformMap: Record<string, string> = {
        'pnet': 'PNet',
        'linkedin': 'LinkedIn', 
        'indeed': 'Indeed'
      };
      const enabledNames = enabledPlatforms.map(p => platformMap[p.toLowerCase()]).filter(Boolean);
      activeSpecialists = this.specialists.filter(s => 
        enabledNames.some(name => s.platform.toLowerCase().includes(name.toLowerCase()))
      );
      console.log(`[SourcingOrchestrator] Enabled platforms: ${enabledPlatforms.join(', ')}`);
      console.log(`[SourcingOrchestrator] Active specialists: ${activeSpecialists.map(s => s.name).join(', ')}`);
    }
    
    if (activeSpecialists.length === 0) {
      console.log(`[SourcingOrchestrator] No active specialists configured, using all available`);
      activeSpecialists = this.specialists;
    }

    const linkedInSpecialist = this.specialists[0] as LinkedInSpecialist;
    const configuration = await linkedInSpecialist.generateSearchConfiguration(job);

    const results: SpecialistResult[] = await Promise.all(
      activeSpecialists.map(async (specialist) => {
        try {
          const candidates = await specialist.searchCandidates(job, configuration, candidatesPerSpecialist);
          return {
            specialist: specialist.name,
            candidates,
            searchQuery: configuration.booleanSearchStrings[0] || job.title,
            timestamp: new Date(),
            status: candidates.length > 0 ? "success" : "no_results",
          } as SpecialistResult;
        } catch (error) {
          console.error(`[${specialist.name}] Failed:`, error);
          return {
            specialist: specialist.name,
            candidates: [],
            searchQuery: job.title,
            timestamp: new Date(),
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          } as SpecialistResult;
        }
      })
    );

    const allCandidates = results.flatMap(r => r.candidates);

    return { results, allCandidates, configuration };
  }

  async runSpecialist(
    specialistName: string,
    job: Job,
    limit: number = 10
  ): Promise<SpecialistResult> {
    const specialist = this.specialists.find(s => s.name === specialistName);
    if (!specialist) {
      return {
        specialist: specialistName,
        candidates: [],
        searchQuery: job.title,
        timestamp: new Date(),
        status: "error",
        errorMessage: `Specialist "${specialistName}" not found`,
      };
    }

    const configuration = await specialist.generateSearchConfiguration(job);
    
    try {
      const candidates = await specialist.searchCandidates(job, configuration, limit);
      return {
        specialist: specialist.name,
        candidates,
        searchQuery: configuration.booleanSearchStrings[0] || job.title,
        timestamp: new Date(),
        status: candidates.length > 0 ? "success" : "no_results",
      };
    } catch (error) {
      return {
        specialist: specialist.name,
        candidates: [],
        searchQuery: job.title,
        timestamp: new Date(),
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const sourcingOrchestrator = new SourcingOrchestrator();
