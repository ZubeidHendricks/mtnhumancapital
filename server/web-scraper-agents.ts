import Groq from "groq-sdk";
import puppeteer, { Browser, Page } from "puppeteer";
import type { Job } from "@shared/schema";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ScrapedCandidate {
  name: string;
  title?: string;
  skills: string[];
  experience?: string;
  location?: string;
  contact?: string;
  source: string;
  sourceUrl?: string;
  matchScore?: number;
  rawText?: string;
}

export interface ScraperResult {
  platform: string;
  query: string;
  candidates: ScrapedCandidate[];
  scrapedAt: Date;
  status: "success" | "partial" | "failed";
  error?: string;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
        "--window-size=1920,1080"
      ]
    });
  }
  return browserInstance;
}

async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

function generateSearchQuery(job: Job): string {
  const title = job.title.toLowerCase();
  
  if (title.includes('developer') || title.includes('engineer')) {
    if (title.includes('java')) return 'java developer';
    if (title.includes('python')) return 'python developer';
    if (title.includes('full stack')) return 'full stack developer';
    if (title.includes('frontend') || title.includes('front-end')) return 'frontend developer';
    if (title.includes('backend') || title.includes('back-end')) return 'backend developer';
    return 'software developer';
  }
  if (title.includes('project manager')) return 'project manager';
  if (title.includes('administrator')) return 'administrator';
  if (title.includes('analyst')) return 'analyst';
  if (title.includes('designer')) return 'designer';
  
  const words = job.title.split(/\s+/).slice(0, 3).join(' ');
  return words.replace(/[^\w\s]/g, '').toLowerCase();
}

async function extractCandidatesWithAI(rawText: string, job: Job, source: string): Promise<ScrapedCandidate[]> {
  try {
    if (!rawText || rawText.length < 100) {
      return [];
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting candidate information from job board listings and CV posts. 
Extract ONLY real people/candidates mentioned in the text - people offering their services or posting CVs.
Return ONLY a valid JSON array. If no candidates found, return [].`
        },
        {
          role: "user",
          content: `Extract candidate profiles from this scraped content from ${source}.
Look for: names, job titles, skills, experience, locations, contact info.

Job we're hiring for: ${job.title}
Requirements: ${(job.requirements || []).slice(0, 5).join(", ")}

Scraped content:
${rawText.slice(0, 6000)}

Return JSON array:
[{"name": "Full Name", "title": "Their Job Title", "skills": ["skill1"], "experience": "X years", "location": "City", "contact": "email/phone if found"}]

Return [] if no real candidates found.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const candidates = JSON.parse(jsonMatch[0]);
      return candidates
        .filter((c: any) => c.name && c.name !== "Unknown" && c.name.length > 2)
        .map((c: any) => ({
          name: c.name,
          title: c.title || undefined,
          skills: Array.isArray(c.skills) ? c.skills : [],
          experience: c.experience || undefined,
          location: c.location || undefined,
          contact: c.contact || undefined,
          source: source,
          matchScore: calculateMatchScore(c, job)
        }));
    }
    return [];
  } catch (error) {
    console.error(`[extractCandidatesWithAI] Error:`, error);
    return [];
  }
}

function calculateMatchScore(candidate: any, job: Job): number {
  let score = 50;
  const jobReqs = (job.requirements || []).map(r => r.toLowerCase());
  const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase());
  
  for (const skill of candidateSkills) {
    if (jobReqs.some(req => req.includes(skill) || skill.includes(req))) {
      score += 10;
    }
  }
  
  if (candidate.experience) {
    const years = parseInt(candidate.experience);
    if (years >= 5) score += 15;
    else if (years >= 3) score += 10;
    else if (years >= 1) score += 5;
  }
  
  return Math.min(score, 95);
}

export class GumtreeScraper {
  name = "Gumtree Scraper";
  platform = "Gumtree South Africa";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[GumtreeScraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    let page: Page | null = null;
    
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      await page.setViewport({ width: 1920, height: 1080 });
      
      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `https://www.gumtree.co.za/s-services/${encodedQuery}`;
      
      console.log(`[GumtreeScraper] Navigating to: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded",
        timeout: 30000 
      });
      
      await page.waitForSelector("body", { timeout: 10000 });
      
      const pageContent = await page.evaluate(() => {
        const listings = document.querySelectorAll('[class*="listing"], [class*="result"], article, .ad-listing');
        let text = "";
        listings.forEach(el => {
          text += el.textContent + "\n\n";
        });
        if (!text) {
          text = document.body.innerText;
        }
        return text;
      });
      
      console.log(`[GumtreeScraper] Scraped ${pageContent.length} characters`);
      
      const candidates = await extractCandidatesWithAI(pageContent, job, this.platform);
      
      return {
        platform: this.platform,
        query,
        candidates: candidates.slice(0, limit),
        scrapedAt: new Date(),
        status: candidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[GumtreeScraper] Error:`, error);
      return {
        platform: this.platform,
        query,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (page) await page.close();
    }
  }
}

export class IndeedScraper {
  name = "Indeed Scraper";
  platform = "Indeed South Africa";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[IndeedScraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    let page: Page | null = null;
    
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      
      const searchUrl = `https://za.indeed.com/jobs?q=${encodeURIComponent(query)}&l=South+Africa`;
      
      console.log(`[IndeedScraper] Navigating to: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded",
        timeout: 30000 
      });
      
      await new Promise(r => setTimeout(r, 3000));
      
      const pageContent = await page.evaluate(() => {
        const jobCards = document.querySelectorAll('[class*="job_seen"], [class*="jobsearch"], .job_seen_beacon, .resultContent');
        let text = "";
        jobCards.forEach(el => {
          text += el.textContent + "\n\n";
        });
        if (!text || text.length < 100) {
          text = document.body.innerText;
        }
        return text;
      });
      
      console.log(`[IndeedScraper] Scraped ${pageContent.length} characters`);
      
      const candidates = await extractCandidatesWithAI(pageContent, job, this.platform);
      
      return {
        platform: this.platform,
        query,
        candidates: candidates.slice(0, limit),
        scrapedAt: new Date(),
        status: candidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[IndeedScraper] Error:`, error);
      return {
        platform: this.platform,
        query,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (page) await page.close();
    }
  }
}

export class Careers24Scraper {
  name = "Careers24 Scraper";
  platform = "Careers24";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[Careers24Scraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    let page: Page | null = null;
    
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      
      const searchUrl = `https://www.careers24.com/jobs/kw-${encodeURIComponent(query.replace(/\s+/g, '-'))}`;
      
      console.log(`[Careers24Scraper] Navigating to: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded",
        timeout: 30000 
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      const pageContent = await page.evaluate(() => {
        const listings = document.querySelectorAll('[class*="job"], [class*="listing"], article');
        let text = "";
        listings.forEach(el => {
          text += el.textContent + "\n\n";
        });
        if (!text || text.length < 100) {
          text = document.body.innerText;
        }
        return text;
      });
      
      console.log(`[Careers24Scraper] Scraped ${pageContent.length} characters`);
      
      const candidates = await extractCandidatesWithAI(pageContent, job, this.platform);
      
      return {
        platform: this.platform,
        query,
        candidates: candidates.slice(0, limit),
        scrapedAt: new Date(),
        status: candidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[Careers24Scraper] Error:`, error);
      return {
        platform: this.platform,
        query,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (page) await page.close();
    }
  }
}

export class PNetScraper {
  name = "PNet Scraper";
  platform = "PNet";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[PNetScraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    let page: Page | null = null;
    
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      
      const searchUrl = `https://www.pnet.co.za/jobs/${encodeURIComponent(query.replace(/\s+/g, '-'))}-jobs`;
      
      console.log(`[PNetScraper] Navigating to: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded",
        timeout: 30000 
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      const pageContent = await page.evaluate(() => {
        return document.body.innerText;
      });
      
      console.log(`[PNetScraper] Scraped ${pageContent.length} characters`);
      
      const candidates = await extractCandidatesWithAI(pageContent, job, this.platform);
      
      return {
        platform: this.platform,
        query,
        candidates: candidates.slice(0, limit),
        scrapedAt: new Date(),
        status: candidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[PNetScraper] Error:`, error);
      return {
        platform: this.platform,
        query,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (page) await page.close();
    }
  }
}

export class LinkedInJobsScraper {
  name = "LinkedIn Jobs Scraper";
  platform = "LinkedIn";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[LinkedInJobsScraper] Searching for: ${job.title}`);
    
    const query = generateSearchQuery(job);
    let page: Page | null = null;
    
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      
      const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=South%20Africa`;
      
      console.log(`[LinkedInJobsScraper] Navigating to: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded",
        timeout: 30000 
      });
      
      await new Promise(r => setTimeout(r, 3000));
      
      const pageContent = await page.evaluate(() => {
        const jobCards = document.querySelectorAll('.job-card-container, .jobs-search__results-list li, [class*="job-result"]');
        let text = "";
        jobCards.forEach(el => {
          text += el.textContent + "\n\n";
        });
        if (!text || text.length < 100) {
          text = document.body.innerText;
        }
        return text;
      });
      
      console.log(`[LinkedInJobsScraper] Scraped ${pageContent.length} characters`);
      
      const candidates = await extractCandidatesWithAI(pageContent, job, this.platform);
      
      return {
        platform: this.platform,
        query,
        candidates: candidates.slice(0, limit),
        scrapedAt: new Date(),
        status: candidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[LinkedInJobsScraper] Error:`, error);
      return {
        platform: this.platform,
        query,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (page) await page.close();
    }
  }
}

export class ScraperOrchestrator {
  private scrapers = [
    new GumtreeScraper(),
    new IndeedScraper(),
    new Careers24Scraper(),
    new PNetScraper(),
    new LinkedInJobsScraper()
  ];

  getScrapers() {
    return this.scrapers.map(s => ({
      name: s.name,
      platform: s.platform
    }));
  }

  async runScraper(platform: string, job: Job, limit: number = 10): Promise<ScraperResult> {
    const scraper = this.scrapers.find(
      s => s.platform.toLowerCase() === platform.toLowerCase() ||
           s.name.toLowerCase().includes(platform.toLowerCase())
    );
    
    if (!scraper) {
      return {
        platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: `Scraper not found for platform: ${platform}`
      };
    }

    return scraper.search(job, limit);
  }

  async runAllScrapers(job: Job, limit: number = 5): Promise<{
    results: ScraperResult[];
    allCandidates: ScrapedCandidate[];
    totalFound: number;
  }> {
    console.log(`[ScraperOrchestrator] Running all scrapers for: ${job.title}`);
    
    const results = await Promise.all(
      this.scrapers.map(scraper => scraper.search(job, limit))
    );
    
    const allCandidates = results.flatMap(r => r.candidates);
    
    console.log(`[ScraperOrchestrator] Total candidates found: ${allCandidates.length}`);
    
    await closeBrowser();
    
    return {
      results,
      allCandidates,
      totalFound: allCandidates.length
    };
  }
}

export const scraperOrchestrator = new ScraperOrchestrator();
