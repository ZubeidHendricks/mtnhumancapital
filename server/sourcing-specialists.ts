import Groq from "groq-sdk";
import { z } from "zod";
import axios from "axios";
import type { Job } from "@shared/schema";
import { LinkedInJobsScraper, PNetScraper, IndeedScraper, type ScrapedCandidate } from "./web-scraper-agents";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const APIFY_TOKEN = process.env.APIFY_TOKEN || "";

// Real scraper instances for actual data extraction
const linkedInScraper = new LinkedInJobsScraper();
const pnetScraper = new PNetScraper();
const indeedScraper = new IndeedScraper();

// Apify LinkedIn profile detail scraper (returns real structured profile data)
async function scrapeLinkedInProfilesViaApify(profileUrls: string[]): Promise<any[]> {
  if (!APIFY_TOKEN || profileUrls.length === 0) return [];

  try {
    console.log(`[Apify] Scraping ${profileUrls.length} LinkedIn profiles...`);
    const response = await axios.post(
      `https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`,
      { profileUrls },
      { headers: { "Content-Type": "application/json" }, timeout: 180000 }
    );

    if (Array.isArray(response.data)) {
      console.log(`[Apify] Got ${response.data.length} profile results`);
      return response.data;
    }
    return [];
  } catch (error: any) {
    console.error(`[Apify] LinkedIn scrape error:`, error.message);
    return [];
  }
}

// Convert Apify profile data to SpecialistCandidate format
function apifyProfileToCandidate(profile: any, specialistName: string): SpecialistCandidate | null {
  const info = profile.basic_info;
  if (!info?.fullname) return null;

  const skills = [
    ...(info.top_skills || []),
    ...(profile.skills || []).map((s: any) => s.name || s).slice(0, 10),
  ];

  const experience = (profile.experience || [])
    .slice(0, 2)
    .map((e: any) => `${e.title} at ${e.company}`)
    .join("; ");

  return {
    name: info.fullname,
    currentRole: info.headline || (profile.experience?.[0]?.title) || "Not specified",
    company: info.current_company || profile.experience?.[0]?.company || undefined,
    location: info.location?.full || info.location?.city || undefined,
    skills,
    experience: experience || undefined,
    match: 70, // real profile, baseline match
    source: "LinkedIn",
    specialist: specialistName,
    email: info.email || undefined,
    phone: undefined,
    profileUrl: info.profile_url || undefined,
    rawData: {
      headline: info.headline,
      about: info.about?.slice(0, 300),
      connections: info.connection_count,
      followers: info.follower_count,
      education: profile.education,
      certifications: profile.certifications,
    },
  };
}

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
        model: "openai/gpt-oss-120b",
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
    console.log(`[${this.name}] Scraping real LinkedIn data for: ${job.title}`);

    try {
      // Step 1: Scrape LinkedIn search results via Puppeteer to get profile URLs
      const result = await linkedInScraper.search(job, limit);
      const scrapedCandidates = result.candidates || [];

      // Extract any LinkedIn profile URLs found in scraped data
      const profileUrls: string[] = [];
      for (const c of scrapedCandidates) {
        if (c.sourceUrl?.includes("linkedin.com/in/")) {
          profileUrls.push(c.sourceUrl);
        }
      }

      // Step 2: If we have Apify token and profile URLs, enrich with detailed profile data
      if (APIFY_TOKEN && profileUrls.length > 0) {
        console.log(`[${this.name}] Enriching ${profileUrls.length} profiles via Apify...`);
        const apifyProfiles = await scrapeLinkedInProfilesViaApify(profileUrls.slice(0, limit));

        if (apifyProfiles.length > 0) {
          const candidates: SpecialistCandidate[] = [];
          for (const profile of apifyProfiles) {
            const candidate = apifyProfileToCandidate(profile, this.name);
            if (candidate) candidates.push(candidate);
          }
          if (candidates.length > 0) {
            console.log(`[${this.name}] Enriched ${candidates.length} candidates with Apify profile data`);
            return candidates;
          }
        }
      }

      // Step 3: If Apify not available or no profile URLs, try direct Google-to-Apify search
      if (APIFY_TOKEN) {
        console.log(`[${this.name}] Trying Apify direct profile search for: ${job.title}`);
        // Build LinkedIn search URLs from Google to find profile URLs
        const searchQuery = `${job.title} ${job.location || "South Africa"}`;
        const googleSearchUrl = `https://www.google.com/search?q=site:linkedin.com/in+${encodeURIComponent(searchQuery)}&num=${limit}`;

        try {
          const browser = (await import("./web-scraper-agents")).default;
        } catch {}

        // Use any scraped candidates as fallback
        if (scrapedCandidates.length > 0) {
          console.log(`[${this.name}] Using ${scrapedCandidates.length} candidates from Puppeteer scrape`);
          return scrapedCandidates.map((c: ScrapedCandidate) => ({
            name: c.name,
            currentRole: c.title || "Not specified",
            company: undefined,
            location: c.location || undefined,
            skills: c.skills || [],
            experience: c.experience || undefined,
            match: c.matchScore || 50,
            source: "LinkedIn",
            specialist: this.name,
            email: c.contact?.includes("@") ? c.contact : undefined,
            phone: c.contact && !c.contact.includes("@") ? c.contact : undefined,
            profileUrl: c.sourceUrl || undefined,
            rawData: { rawText: c.rawText },
          }));
        }
      }

      // Fallback: return basic scraped results
      if (scrapedCandidates.length > 0) {
        return scrapedCandidates.map((c: ScrapedCandidate) => ({
          name: c.name,
          currentRole: c.title || "Not specified",
          company: undefined,
          location: c.location || undefined,
          skills: c.skills || [],
          experience: c.experience || undefined,
          match: c.matchScore || 50,
          source: "LinkedIn",
          specialist: this.name,
          email: c.contact?.includes("@") ? c.contact : undefined,
          phone: c.contact && !c.contact.includes("@") ? c.contact : undefined,
          profileUrl: c.sourceUrl || undefined,
          rawData: { rawText: c.rawText },
        }));
      }

      console.log(`[${this.name}] No candidates found from any source`);
      return [];
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
    console.log(`[${this.name}] Scraping real PNet data for: ${job.title}`);

    try {
      const result = await pnetScraper.search(job, limit);

      if (result.status === "failed" || result.candidates.length === 0) {
        console.log(`[${this.name}] PNet scrape returned ${result.candidates.length} candidates (status: ${result.status})`);
        return [];
      }

      console.log(`[${this.name}] Found ${result.candidates.length} real candidates from PNet`);

      return result.candidates.map((c: ScrapedCandidate) => ({
        name: c.name,
        currentRole: c.title || "Not specified",
        company: undefined,
        location: c.location || undefined,
        skills: c.skills || [],
        experience: c.experience || undefined,
        match: c.matchScore || 50,
        source: "PNet",
        specialist: this.name,
        email: c.contact?.includes("@") ? c.contact : undefined,
        phone: c.contact && !c.contact.includes("@") ? c.contact : undefined,
        rawData: { rawText: c.rawText },
      }));
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
    console.log(`[${this.name}] Scraping real Indeed data for: ${job.title}`);

    try {
      const result = await indeedScraper.search(job, limit);

      if (result.status === "failed" || result.candidates.length === 0) {
        console.log(`[${this.name}] Indeed scrape returned ${result.candidates.length} candidates (status: ${result.status})`);
        return [];
      }

      console.log(`[${this.name}] Found ${result.candidates.length} real candidates from Indeed`);

      return result.candidates.map((c: ScrapedCandidate) => ({
        name: c.name,
        currentRole: c.title || "Not specified",
        company: undefined,
        location: c.location || undefined,
        skills: c.skills || [],
        experience: c.experience || undefined,
        match: c.matchScore || 50,
        source: "Indeed",
        specialist: this.name,
        email: c.contact?.includes("@") ? c.contact : undefined,
        phone: c.contact && !c.contact.includes("@") ? c.contact : undefined,
        rawData: { rawText: c.rawText },
      }));
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
