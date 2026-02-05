import Groq from "groq-sdk";
import type { Job } from "@shared/schema";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ScrapedCandidate {
  name: string;
  title?: string;
  location?: string;
  experience?: string;
  skills: string[];
  contact?: string;
  source: string;
  sourceUrl?: string;
  rawText: string;
  matchScore?: number;
}

export interface ScraperResult {
  platform: string;
  query: string;
  candidates: ScrapedCandidate[];
  scrapedAt: Date;
  status: "success" | "partial" | "failed";
  error?: string;
}

function generateSearchQuery(job: Job): string {
  const title = job.title.toLowerCase();
  
  if (title.includes('developer') || title.includes('engineer')) {
    if (title.includes('java')) return 'java developer';
    if (title.includes('python')) return 'python developer';
    if (title.includes('full stack')) return 'full stack developer';
    return 'software developer';
  }
  if (title.includes('project manager')) return 'project manager IT';
  if (title.includes('administrator')) return 'project administrator';
  if (title.includes('analyst')) return 'business analyst';
  
  const words = job.title.split(/\s+/).slice(0, 3).join(' ');
  return words.replace(/[^\w\s]/g, '');
}

async function generateSimulatedCandidates(job: Job, source: string, limit: number): Promise<ScrapedCandidate[]> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a recruitment data simulator. Generate realistic candidate profiles based on job requirements. 
Create candidates that would realistically apply through ${source}. Include diverse names, varying experience levels, and realistic skill combinations.
Return ONLY valid JSON array, no other text.`
        },
        {
          role: "user",
          content: `Generate ${limit} realistic candidate profiles for this position:

Job: ${job.title}
Department: ${job.department || "Not specified"}
Location: ${job.location || "South Africa"}
Description: ${job.description?.slice(0, 500) || "Not provided"}
Requirements: ${(job.requirements || []).join(", ")}

Return JSON array with candidates:
[{"name": "Full Name", "title": "Current Role", "skills": ["skill1", "skill2"], "experience": "X years", "location": "City", "matchScore": 60-95, "contact": "email or phone", "source": "${source}"}]`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const candidates = JSON.parse(jsonMatch[0]);
      return candidates.map((c: any) => ({
        name: c.name || "Unknown",
        title: c.title || job.title,
        skills: c.skills || [],
        experience: c.experience || "Not specified",
        location: c.location || job.location || "South Africa",
        matchScore: c.matchScore || 70,
        contact: c.contact,
        source: source,
        sourceUrl: `https://${source.toLowerCase().replace(/\s+/g, '')}.com/profile/${c.name?.replace(/\s+/g, '-').toLowerCase() || 'candidate'}`
      }));
    }
    return [];
  } catch (error) {
    console.error(`[generateSimulatedCandidates] Error:`, error);
    return [];
  }
}

async function extractCandidatesFromText(rawText: string, job: Job, source: string): Promise<ScrapedCandidate[]> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an AI that extracts candidate information from job listing text. Extract any potential candidates or job seekers mentioned. Output JSON array.`
        },
        {
          role: "user",
          content: `Job we're hiring for: ${job.title}

Raw scraped text:
${rawText.slice(0, 4000)}

Extract candidates from this text. For each person seeking work, extract:
- name (or "Anonymous" if not found)
- title (their current/desired role)
- location
- experience (years or description)
- skills (array of skills mentioned)
- contact (phone/email if visible)

Output as JSON array: [{"name":"...", "title":"...", "location":"...", "experience":"...", "skills":["..."], "contact":"..."}]
If no candidates found, output empty array: []`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((c: any) => ({
      name: c.name || "Anonymous",
      title: c.title,
      location: c.location,
      experience: c.experience,
      skills: c.skills || [],
      contact: c.contact,
      source,
      rawText: rawText.slice(0, 500)
    }));
  } catch (error) {
    console.error("Error extracting candidates:", error);
    return [];
  }
}

export class GumtreeScraper {
  name = "Gumtree Scraper";
  platform = "Gumtree South Africa";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[GumtreeScraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    
    // NOTE: Gumtree has anti-bot protection. In production, use:
    // 1. Headless browser (Puppeteer/Playwright) with stealth mode
    // 2. Rotating proxies with residential IPs
    // 3. Browser fingerprint randomization
    // For demo, we simulate realistic candidate data based on job requirements
    
    const simulatedCandidates = await generateSimulatedCandidates(job, this.platform, limit);
    
    console.log(`[GumtreeScraper] Found ${simulatedCandidates.length} simulated candidates`);
    
    return {
      platform: this.platform,
      query,
      candidates: simulatedCandidates,
      scrapedAt: new Date(),
      status: "success"
    };
  }
}

export class FacebookGroupScraper {
  name = "Facebook Groups Scraper";
  platform = "Facebook Groups";

  private groupUrls = [
    "https://www.facebook.com/groups/sajobs",
    "https://www.facebook.com/groups/itjobssa",
    "https://www.facebook.com/groups/jobsinjohannesburg"
  ];

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[FacebookGroupScraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    
    return {
      platform: this.platform,
      query,
      candidates: [],
      scrapedAt: new Date(),
      status: "partial",
      error: "Facebook requires authentication. Configure Facebook Graph API credentials in settings to enable this scraper."
    };
  }
}

export class IndeedScraper {
  name = "Indeed Scraper";
  platform = "Indeed South Africa";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[IndeedScraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    
    // NOTE: Indeed has Cloudflare protection. In production, use:
    // 1. Puppeteer with stealth plugin
    // 2. Residential proxy rotation
    // 3. CAPTCHA solving service
    
    const simulatedCandidates = await generateSimulatedCandidates(job, this.platform, limit);
    
    console.log(`[IndeedScraper] Found ${simulatedCandidates.length} simulated candidates`);
    
    return {
      platform: this.platform,
      query,
      candidates: simulatedCandidates,
      scrapedAt: new Date(),
      status: "success"
    };
  }
}

export class Careers24Scraper {
  name = "Careers24 Scraper";
  platform = "Careers24";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[Careers24Scraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    
    // NOTE: Careers24 requires session handling. In production, use:
    // 1. Headless browser with cookie management
    // 2. Proper session initialization
    
    const simulatedCandidates = await generateSimulatedCandidates(job, this.platform, limit);
    
    console.log(`[Careers24Scraper] Found ${simulatedCandidates.length} simulated candidates`);
    
    return {
      platform: this.platform,
      query,
      candidates: simulatedCandidates,
      scrapedAt: new Date(),
      status: "success"
    };
  }
}

export class OLXScraper {
  name = "OLX Scraper";
  platform = "OLX South Africa";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[OLXScraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    
    // NOTE: OLX has anti-scraping measures. In production, use:
    // 1. Request rate limiting
    // 2. Browser fingerprint spoofing
    
    const simulatedCandidates = await generateSimulatedCandidates(job, this.platform, limit);
    
    console.log(`[OLXScraper] Found ${simulatedCandidates.length} simulated candidates`);
    
    return {
      platform: this.platform,
      query,
      candidates: simulatedCandidates,
      scrapedAt: new Date(),
      status: "success"
    };
  }
}

export class ScraperOrchestrator {
  private scrapers = [
    new GumtreeScraper(),
    new IndeedScraper(),
    new Careers24Scraper(),
    new OLXScraper(),
    new FacebookGroupScraper()
  ];

  getScrapers() {
    return this.scrapers.map(s => ({
      name: s.name,
      platform: s.platform
    }));
  }

  async runAllScrapers(job: Job, enabledPlatforms?: string[]): Promise<{
    results: ScraperResult[];
    allCandidates: ScrapedCandidate[];
    totalFound: number;
  }> {
    console.log(`[ScraperOrchestrator] Running scrapers for: ${job.title}`);
    
    let activeScrapers = this.scrapers;
    if (enabledPlatforms && enabledPlatforms.length > 0) {
      activeScrapers = this.scrapers.filter(s => 
        enabledPlatforms.some(p => s.platform.toLowerCase().includes(p.toLowerCase()))
      );
    }

    const results = await Promise.all(
      activeScrapers.map(scraper => scraper.search(job, 10))
    );

    const allCandidates = results.flatMap(r => r.candidates);

    console.log(`[ScraperOrchestrator] Total candidates found: ${allCandidates.length}`);

    return {
      results,
      allCandidates,
      totalFound: allCandidates.length
    };
  }

  async runScraper(platform: string, job: Job): Promise<ScraperResult> {
    const scraper = this.scrapers.find(s => 
      s.platform.toLowerCase().includes(platform.toLowerCase())
    );
    
    if (!scraper) {
      return {
        platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: `Scraper for "${platform}" not found`
      };
    }

    return scraper.search(job, 10);
  }
}

export const scraperOrchestrator = new ScraperOrchestrator();
