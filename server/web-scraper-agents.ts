import Groq from "groq-sdk";
import puppeteer, { Browser, Page } from "puppeteer";
import type { Job } from "@shared/schema";
import { skillsMatch, extractSkillsFromText } from "./skill-taxonomy";
import { scraperHealth } from "./scraper-health";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ========== Shared Constants & Utilities ==========

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

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

// ========== Scraper Interface ==========

export interface Scraper {
  name: string;
  platform: string;
  search(job: Job, limit?: number): Promise<ScraperResult>;
}

// ========== Browser Management ==========

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
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

// ========== Shared Logic ==========

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
      model: "openai/gpt-oss-120b",
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
Requirements: ${((job as any).skillsRequired || []).slice(0, 5).join(", ")}

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
  // Gather required skills from job.skillsRequired + extracted from description
  const jobReqs = ((job as any).skillsRequired || []).map((r: string) => r.toLowerCase());
  const descriptionSkills = extractSkillsFromText(
    `${job.description || ''} ${(job as any).requirements || ''}`
  ).map(s => s.toLowerCase());
  const allRequired = Array.from(new Set([...jobReqs, ...descriptionSkills]));

  const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase());

  if (allRequired.length === 0) {
    // No skills to compare — use a basic baseline
    let score = 40;
    if (candidate.experience) {
      const years = parseInt(candidate.experience);
      if (years >= 5) score += 25;
      else if (years >= 3) score += 15;
      else if (years >= 1) score += 10;
    }
    if (candidate.title && job.title) {
      const titleWords = job.title.toLowerCase().split(/\s+/);
      const candTitle = (candidate.title || '').toLowerCase();
      const titleMatches = titleWords.filter(w => w.length > 2 && candTitle.includes(w)).length;
      if (titleMatches > 0) score += Math.min(titleMatches * 10, 25);
    }
    return Math.min(score, 95);
  }

  // Proportional skill matching using taxonomy
  let matchedSkills = 0;
  for (const required of allRequired) {
    const matched = candidateSkills.some((cs: string) => skillsMatch(cs, required));
    if (matched) matchedSkills++;
  }

  const skillRatio = matchedSkills / allRequired.length;
  // Skill score: 0-55 points proportional to match ratio
  let score = Math.round(skillRatio * 55);

  // Title relevance bonus: 0-20 points
  if (candidate.title && job.title) {
    const titleWords = job.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    const candTitle = (candidate.title || '').toLowerCase();
    const titleMatches = titleWords.filter((w: string) => candTitle.includes(w)).length;
    if (titleWords.length > 0) {
      score += Math.round((titleMatches / titleWords.length) * 20);
    }
  }

  // Experience bonus: 0-15 points
  if (candidate.experience) {
    const years = parseInt(candidate.experience);
    if (years >= 5) score += 15;
    else if (years >= 3) score += 10;
    else if (years >= 1) score += 5;
  }

  // Location bonus: 5 points
  if (candidate.location && job.location) {
    if (candidate.location.toLowerCase().includes(job.location.toLowerCase()) ||
        job.location.toLowerCase().includes(candidate.location.toLowerCase())) {
      score += 5;
    }
  }

  return Math.min(Math.max(score, 5), 95);
}

function deduplicateCandidates(candidates: ScrapedCandidate[], key: "name" | "sourceUrl" = "name"): ScrapedCandidate[] {
  const seen = new Set<string>();
  return candidates.filter(c => {
    const k = (key === "sourceUrl" ? (c.sourceUrl || c.name) : c.name).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ========== Base Classes ==========

abstract class BaseBrowserScraper implements Scraper {
  abstract name: string;
  abstract platform: string;

  protected async setupPage(): Promise<Page> {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    return page;
  }

  protected buildSuccessResult(platform: string, query: string, candidates: ScrapedCandidate[], limit: number): ScraperResult {
    const unique = deduplicateCandidates(candidates).slice(0, limit);
    return {
      platform,
      query,
      candidates: unique,
      scrapedAt: new Date(),
      status: unique.length > 0 ? "success" : "partial"
    };
  }

  protected buildFailedResult(platform: string, query: string, error: unknown): ScraperResult {
    return {
      platform,
      query,
      candidates: [],
      scrapedAt: new Date(),
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }

  abstract search(job: Job, limit?: number): Promise<ScraperResult>;
}

abstract class BaseAPIScraper implements Scraper {
  abstract name: string;
  abstract platform: string;

  protected buildSuccessResult(platform: string, query: string, candidates: ScrapedCandidate[], limit: number): ScraperResult {
    const unique = deduplicateCandidates(candidates, "sourceUrl").slice(0, limit);
    return {
      platform,
      query,
      candidates: unique,
      scrapedAt: new Date(),
      status: unique.length > 0 ? "success" : "partial"
    };
  }

  protected buildFailedResult(platform: string, query: string, error: unknown): ScraperResult {
    return {
      platform,
      query,
      candidates: [],
      scrapedAt: new Date(),
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }

  abstract search(job: Job, limit?: number): Promise<ScraperResult>;
}

// ========== Simple Career Site Scraper (for sites with similar patterns) ==========

interface CareerSiteConfig {
  name: string;
  platform: string;
  buildSearchUrl: (query: string) => string;
  selectors: string;
}

class SimpleCareerSiteScraper extends BaseBrowserScraper {
  name: string;
  platform: string;
  private config: CareerSiteConfig;

  constructor(config: CareerSiteConfig) {
    super();
    this.name = config.name;
    this.platform = config.platform;
    this.config = config;
  }

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[${this.name}] Searching for: ${job.title}`);
    const query = generateSearchQuery(job);
    let page: Page | null = null;

    try {
      page = await this.setupPage();

      const searchUrl = this.config.buildSearchUrl(query);
      console.log(`[${this.name}] Navigating to: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await delay(3000);

      const pageContent = await page.evaluate((selectors: string) => {
        const cards = document.querySelectorAll(selectors);
        let text = "";
        cards.forEach(el => { text += el.textContent + "\n\n"; });
        if (!text || text.length < 100) text = document.body.innerText;
        return text;
      }, this.config.selectors);

      console.log(`[${this.name}] Scraped ${pageContent.length} characters`);
      const candidates = await extractCandidatesWithAI(pageContent, job, this.platform);

      return this.buildSuccessResult(this.platform, query, candidates, limit);
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      return this.buildFailedResult(this.platform, query, error);
    } finally {
      if (page) await page.close();
    }
  }
}

// ========== Career Site Configurations ==========

const careerSiteConfigs: CareerSiteConfig[] = [
  {
    name: "Indeed Scraper",
    platform: "Indeed South Africa",
    buildSearchUrl: (query) => `https://za.indeed.com/jobs?q=${encodeURIComponent(query)}&l=South+Africa`,
    selectors: '[class*="job_seen"], [class*="jobsearch"], .job_seen_beacon, .resultContent'
  },
  {
    name: "Careers24 Scraper",
    platform: "Careers24",
    buildSearchUrl: (query) => `https://www.careers24.com/jobs/kw-${encodeURIComponent(query.replace(/\s+/g, '-'))}`,
    selectors: '[class*="job"], [class*="listing"], article'
  },
  {
    name: "LinkedIn Jobs Scraper",
    platform: "LinkedIn",
    buildSearchUrl: (query) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=South%20Africa`,
    selectors: '.job-card-container, .jobs-search__results-list li, [class*="job-result"]'
  },
  {
    name: "CareerJunction Scraper",
    platform: "CareerJunction",
    buildSearchUrl: (query) => `https://www.careerjunction.co.za/jobs/results?keywords=${encodeURIComponent(query)}&location=South+Africa`,
    selectors: '.job-result, .module-content, [class*="job-card"], [class*="result-item"], article'
  },
  {
    name: "JobMail Scraper",
    platform: "JobMail",
    buildSearchUrl: (query) => `https://www.jobmail.co.za/search?q=${encodeURIComponent(query)}&location=South+Africa`,
    selectors: '.job-listing, .job-card, [class*="job-item"], [class*="listing"], article'
  },
  {
    name: "MyJobMag Scraper",
    platform: "MyJobMag",
    buildSearchUrl: (query) => `https://www.myjobmag.co.za/search/jobs?q=${encodeURIComponent(query)}`,
    selectors: '.job-info, .mag-b, [class*="job-list"], [class*="search-result"], article, .job-desc'
  },
  {
    name: "OfferZen Scraper",
    platform: "OfferZen",
    buildSearchUrl: () => `https://www.offerzen.com/companies/public_profiles`,
    selectors: '[class*="profile"], [class*="candidate"], [class*="card"], article'
  },
  {
    name: "RecruitMySelf Scraper",
    platform: "RecruitMySelf",
    buildSearchUrl: (query) => `https://www.recruitmyself.co.za/jobs?search=${encodeURIComponent(query)}`,
    selectors: '.job-listing, .job-card, [class*="job"], [class*="listing"], article'
  },
  {
    name: "BestJobs Scraper",
    platform: "BestJobs SA",
    buildSearchUrl: (query) => `https://www.bestjobs.co.za/jobs?q=${encodeURIComponent(query)}`,
    selectors: '.job-item, .job-card, [class*="job"], [class*="listing"], [class*="result"], article'
  }
];

// Create instances for all simple career site scrapers
export const IndeedScraper = class extends SimpleCareerSiteScraper {
  constructor() { super(careerSiteConfigs.find(c => c.platform === "Indeed South Africa")!); }
};
export const Careers24Scraper = class extends SimpleCareerSiteScraper {
  constructor() { super(careerSiteConfigs.find(c => c.platform === "Careers24")!); }
};
export const LinkedInJobsScraper = class extends SimpleCareerSiteScraper {
  constructor() { super(careerSiteConfigs.find(c => c.platform === "LinkedIn")!); }
};
export const CareerJunctionScraper = class extends SimpleCareerSiteScraper {
  constructor() { super(careerSiteConfigs.find(c => c.platform === "CareerJunction")!); }
};
export const JobMailScraper = class extends SimpleCareerSiteScraper {
  constructor() { super(careerSiteConfigs.find(c => c.platform === "JobMail")!); }
};
export const MyJobMagScraper = class extends SimpleCareerSiteScraper {
  constructor() { super(careerSiteConfigs.find(c => c.platform === "MyJobMag")!); }
};
export const OfferZenScraper = class extends SimpleCareerSiteScraper {
  constructor() { super(careerSiteConfigs.find(c => c.platform === "OfferZen")!); }
};
export const RecruitMySelfScraper = class extends SimpleCareerSiteScraper {
  constructor() { super(careerSiteConfigs.find(c => c.platform === "RecruitMySelf")!); }
};
export const BestJobsScraper = class extends SimpleCareerSiteScraper {
  constructor() { super(careerSiteConfigs.find(c => c.platform === "BestJobs SA")!); }
};

// ========== Complex Browser Scrapers (custom logic) ==========

export class GumtreeScraper extends BaseBrowserScraper {
  name = "Gumtree Scraper";
  platform = "Gumtree South Africa";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[GumtreeScraper] Searching for job seekers: ${job.title}`);

    const query = generateSearchQuery(job);
    let page: Page | null = null;
    const allCandidates: ScrapedCandidate[] = [];

    try {
      page = await this.setupPage();
      await page.setViewport({ width: 1920, height: 1080 });

      const searchUrls = [
        `https://www.gumtree.co.za/s-cvs-resumes/${encodeURIComponent(query)}`,
        `https://www.gumtree.co.za/s-services/it-services/${encodeURIComponent(query)}`,
        `https://www.gumtree.co.za/s-jobs-offered/${encodeURIComponent(query)}`
      ];

      for (const searchUrl of searchUrls) {
        try {
          console.log(`[GumtreeScraper] Trying: ${searchUrl}`);

          await page.goto(searchUrl, {
            waitUntil: "networkidle2",
            timeout: 30000
          });

          await delay(2000);

          const listingData = await page.evaluate(() => {
            const listings: any[] = [];

            const listingElements = document.querySelectorAll('.tileV1, .result, article, [class*="listing"], [class*="tile"]');

            listingElements.forEach((el) => {
              const titleEl = el.querySelector('.tile-title, h2, h3, .title, [class*="title"]');
              const descEl = el.querySelector('.tile-desc, .description, p');
              const locationEl = el.querySelector('.tile-location, .location, [class*="location"]');
              const priceEl = el.querySelector('.tile-price, .price, [class*="price"]');
              const linkEl = el.querySelector('a[href]');

              if (titleEl) {
                listings.push({
                  title: titleEl.textContent?.trim() || '',
                  description: descEl?.textContent?.trim() || '',
                  location: locationEl?.textContent?.trim() || '',
                  price: priceEl?.textContent?.trim() || '',
                  url: linkEl?.getAttribute('href') || '',
                  fullText: el.textContent?.slice(0, 500) || ''
                });
              }
            });

            return {
              listings,
              pageContent: document.body.innerText.slice(0, 12000)
            };
          });

          console.log(`[GumtreeScraper] Found ${listingData.listings.length} listings`);

          for (const listing of listingData.listings) {
            const text = `${listing.title} ${listing.description} ${listing.fullText}`.toLowerCase();
            if (text.includes('cv') || text.includes('resume') || text.includes('seeking') ||
                text.includes('available') || text.includes('experience') || text.includes('developer') ||
                text.includes('looking for') || text.includes('qualified')) {

              const candidates = await extractCandidatesWithAI(
                `Title: ${listing.title}\nDescription: ${listing.description}\nLocation: ${listing.location}\nDetails: ${listing.fullText}`,
                job,
                this.platform
              );

              candidates.forEach(c => {
                c.sourceUrl = listing.url.startsWith('http') ? listing.url : `https://www.gumtree.co.za${listing.url}`;
              });

              allCandidates.push(...candidates);
            }
          }

          if (allCandidates.length < limit && listingData.pageContent.length > 500) {
            const pageCandidates = await extractCandidatesWithAI(listingData.pageContent, job, this.platform);
            allCandidates.push(...pageCandidates);
          }

          if (allCandidates.length >= limit) break;

        } catch (urlError) {
          console.log(`[GumtreeScraper] URL failed: ${searchUrl}`, urlError);
        }
      }

      return this.buildSuccessResult(this.platform, query, allCandidates, limit);
    } catch (error) {
      console.error(`[GumtreeScraper] Error:`, error);
      return this.buildFailedResult(this.platform, query, error);
    } finally {
      if (page) await page.close();
    }
  }
}

export class PNetScraper extends BaseBrowserScraper {
  name = "PNet Scraper";
  platform = "PNet";

  private username = process.env.PNET_USERNAME;
  private password = process.env.PNET_PASSWORD;
  private sessionCookies = process.env.PNET_SESSION_COOKIES;

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[PNetScraper] Searching for candidates: ${job.title}`);

    const query = generateSearchQuery(job);
    let page: Page | null = null;
    const allCandidates: ScrapedCandidate[] = [];

    const hasSessionCookies = !!this.sessionCookies;
    const hasLoginCreds = this.username && this.password;

    if (!hasSessionCookies && !hasLoginCreds) {
      console.error("[PNetScraper] Missing PNET_SESSION_COOKIES or PNET_USERNAME/PNET_PASSWORD credentials");
      return {
        platform: this.platform,
        query,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: "PNet credentials not configured. Set PNET_SESSION_COOKIES (from manual login) or PNET_USERNAME/PNET_PASSWORD"
      };
    }

    try {
      page = await this.setupPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Override navigator properties to appear as real browser
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'af'] });
        (window as any).chrome = { runtime: {} };
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
      });

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      });

      let isLoggedIn = false;

      // METHOD 1: Use session cookies if available
      if (hasSessionCookies) {
        console.log("[PNetScraper] Using session cookies for authentication...");
        try {
          const cookies = JSON.parse(this.sessionCookies);
          await page.setCookie(...cookies);

          await page.goto("https://www.pnet.co.za/5/recruiter-space/dashboard", {
            waitUntil: "networkidle2",
            timeout: 30000
          });

          const currentUrl = page.url();
          console.log(`[PNetScraper] After cookie auth, URL: ${currentUrl}`);
          isLoggedIn = !currentUrl.includes('login') && !currentUrl.includes('notFound');
          console.log(`[PNetScraper] Session cookie authentication: ${isLoggedIn ? 'SUCCESS' : 'FAILED'}`);

          if (!isLoggedIn) {
            console.log("[PNetScraper] Session cookies expired or invalid, falling back to login...");
            const title = await page.title();
            console.log(`[PNetScraper] Page title: ${title}`);
          }
        } catch (e) {
          console.error("[PNetScraper] Failed to parse session cookies:", e);
        }
      }

      // METHOD 2: Try username/password login
      if (!isLoggedIn && hasLoginCreds) {
        console.log("[PNetScraper] Attempting username/password login...");

        await page.goto("https://www.pnet.co.za/5/recruiterspace/login", {
          waitUntil: "networkidle2",
          timeout: 30000
        });

        await delay(2000 + Math.random() * 2000);

        const initialUrl = page.url();
        console.log(`[PNetScraper] Initial page URL: ${initialUrl}`);

        if (initialUrl.includes('notFound') || initialUrl.includes('error')) {
          console.log("[PNetScraper] URL issue detected, trying to continue anyway...");
          await page.goto("https://www.pnet.co.za/5/recruiterspace/login", {
            waitUntil: "networkidle2",
            timeout: 30000
          });
          await delay(2000);
        }

        try {
          await page.waitForSelector('input[name="username"]', { timeout: 10000 });

          await page.click('input[name="username"]');
          await delay(100 + Math.random() * 200);
          await page.keyboard.down('Control');
          await page.keyboard.press('a');
          await page.keyboard.up('Control');

          for (const char of this.username!) {
            await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
          }

          await delay(300 + Math.random() * 300);

          await page.click('input[name="password"]');
          await delay(100 + Math.random() * 200);
          await page.keyboard.down('Control');
          await page.keyboard.press('a');
          await page.keyboard.up('Control');

          for (const char of this.password!) {
            await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
          }

          await delay(1000 + Math.random() * 1000);

          const signInButton = await page.$('button.at-data-login-button') ||
                               await page.$('button[type="submit"]');

          if (signInButton) {
            console.log("[PNetScraper] Clicking sign in button...");
            await Promise.all([
              page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 }).catch(() => {}),
              signInButton.click()
            ]);
          }

          await delay(4000 + Math.random() * 2000);

          const currentUrl = page.url();
          console.log(`[PNetScraper] After login, URL: ${currentUrl}`);

          isLoggedIn = !currentUrl.includes('login') && !currentUrl.includes('notFound');
          console.log(`[PNetScraper] Login successful: ${isLoggedIn}`);

          if (isLoggedIn) {
            const cookies = await page.cookies();
            console.log("[PNetScraper] TIP: Save these cookies as PNET_SESSION_COOKIES to bypass login next time:");
            console.log(JSON.stringify(cookies.filter(c => c.domain.includes('pnet'))));
          }
        } catch (e) {
          console.error("[PNetScraper] Login form interaction failed:", e);
        }
      }

      // Step 2: Navigate to candidate search
      console.log("[PNetScraper] Navigating to candidate search...");

      const searchUrls = [
        `https://www.pnet.co.za/5/recruiter-space/dashboard`,
        `https://www.pnet.co.za/5/recruiter-space/candidate-database`,
        `https://www.pnet.co.za/5/recruiter-space/cv-search?keywords=${encodeURIComponent(query)}`,
        `https://www.pnet.co.za/5/recruiter-space/candidates?q=${encodeURIComponent(query)}`
      ];

      for (const searchUrl of searchUrls) {
        try {
          console.log(`[PNetScraper] Trying: ${searchUrl}`);

          await page.goto(searchUrl, {
            waitUntil: "networkidle2",
            timeout: 30000
          });

          await delay(3000);

          const searchInput = await page.$('input[name="keywords"], input[name="q"], input[type="search"], .search-input');
          if (searchInput) {
            await searchInput.click({ clickCount: 3 });
            await searchInput.type(query);

            const searchBtn = await page.$('button[type="submit"], .search-btn, .btn-search');
            if (searchBtn) {
              await Promise.all([
                page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }).catch(() => {}),
                searchBtn.click()
              ]);
            }

            await delay(3000);
          }

          const candidateData = await page.evaluate(() => {
            const candidates: any[] = [];

            const profileSelectors = [
              '.candidate-result', '.cv-card', '.talent-card', '.search-result',
              '[class*="candidate"]', '[class*="profile-card"]', '.result-item',
              'article', '.card'
            ];

            for (const selector of profileSelectors) {
              const elements = document.querySelectorAll(selector);
              elements.forEach((el) => {
                const text = el.textContent || '';
                if (text.length > 50) {
                  const nameEl = el.querySelector('h2, h3, h4, .name, [class*="name"], .candidate-name, .title a');
                  const jobTitleEl = el.querySelector('.job-title, .current-role, [class*="title"]:not(.name)');
                  const locationEl = el.querySelector('.location, [class*="location"], .city, .area');
                  const skillsEl = el.querySelector('.skills, [class*="skill"], .tags');
                  const experienceEl = el.querySelector('.experience, [class*="experience"], .years');
                  const linkEl = el.querySelector('a[href*="candidate"], a[href*="profile"], a[href*="cv"]');

                  const name = nameEl?.textContent?.trim() || '';
                  if (name && name.length > 2 && !name.includes('Search') && !name.includes('Filter')) {
                    candidates.push({
                      name: name,
                      jobTitle: jobTitleEl?.textContent?.trim() || '',
                      location: locationEl?.textContent?.trim() || '',
                      skills: skillsEl?.textContent?.trim() || '',
                      experience: experienceEl?.textContent?.trim() || '',
                      profileUrl: linkEl?.getAttribute('href') || '',
                      rawText: text.slice(0, 800)
                    });
                  }
                }
              });
            }

            return {
              candidates: candidates.slice(0, 20),
              pageContent: document.body.innerText.slice(0, 15000),
              pageUrl: window.location.href
            };
          });

          console.log(`[PNetScraper] Found ${candidateData.candidates.length} candidate cards on ${candidateData.pageUrl}`);

          for (const c of candidateData.candidates) {
            if (c.name && c.name.length > 2) {
              allCandidates.push({
                name: c.name,
                title: c.jobTitle || undefined,
                location: c.location || undefined,
                skills: c.skills ? c.skills.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 10) : [],
                experience: c.experience || undefined,
                source: this.platform,
                sourceUrl: c.profileUrl ? (c.profileUrl.startsWith('http') ? c.profileUrl : `https://www.pnet.co.za${c.profileUrl}`) : undefined,
                matchScore: calculateMatchScore({ skills: c.skills?.split(/[,;|]/) || [], experience: c.experience }, job),
                rawText: c.rawText
              });
            }
          }

          if (allCandidates.length < limit && candidateData.pageContent.length > 500) {
            const aiCandidates = await extractCandidatesWithAI(candidateData.pageContent, job, this.platform);
            allCandidates.push(...aiCandidates);
          }

          if (allCandidates.length >= limit) break;

        } catch (urlError) {
          console.log(`[PNetScraper] URL failed: ${searchUrl}`, urlError);
        }
      }

      return this.buildSuccessResult(this.platform, query, allCandidates, limit);
    } catch (error) {
      console.error(`[PNetScraper] Error:`, error);
      return this.buildFailedResult(this.platform, query, error);
    } finally {
      if (page) await page.close();
    }
  }
}

// ============ API-BASED SOURCERS (No Scraping Required) ============

export class GitHubDeveloperSourcer extends BaseAPIScraper {
  name = "GitHub Developer Sourcer";
  platform = "GitHub";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[GitHubSourcer] Searching developers for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];

    try {
      const languages = this.extractLanguages(job);
      const locations = ["South Africa", "Johannesburg", "Cape Town", "Pretoria", "Durban"];

      for (const location of locations.slice(0, 2)) {
        for (const lang of languages.slice(0, 3)) {
          const queryParts = [
            `location:"${location}"`,
            `language:${lang}`,
            `repos:>5`
          ];
          const query = queryParts.join(' ');
          const url = `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=10`;

          console.log(`[GitHubSourcer] Querying: ${query}`);

          const response = await fetch(url, {
            headers: {
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'MTN-Recruiter-Bot'
            }
          });

          if (!response.ok) {
            console.log(`[GitHubSourcer] API error: ${response.status}`);
            continue;
          }

          const data = await response.json();
          console.log(`[GitHubSourcer] Found ${data.items?.length || 0} users for ${lang} in ${location}`);

          // Filter out organizations — only keep individual users
          const users = (data.items || []).filter((u: any) => u.type !== "Organization").slice(0, 5);

          for (const user of users) {
            const userResponse = await fetch(`https://api.github.com/users/${user.login}`, {
              headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'MTN-Recruiter-Bot'
              }
            });

            if (userResponse.ok) {
              const userDetails = await userResponse.json();

              const reposResponse = await fetch(`https://api.github.com/users/${user.login}/repos?sort=stars&per_page=5`, {
                headers: {
                  'Accept': 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                  'User-Agent': 'MTN-Recruiter-Bot'
                }
              });

              let repoLanguages: string[] = [];
              if (reposResponse.ok) {
                const repos = await reposResponse.json();
                repoLanguages = [...new Set(repos.map((r: any) => r.language).filter(Boolean))] as string[];
              }

              candidates.push({
                name: userDetails.name || userDetails.login,
                title: userDetails.bio || `Developer with ${userDetails.public_repos} repos`,
                skills: repoLanguages.length > 0 ? repoLanguages : [lang],
                experience: `${userDetails.public_repos} public repositories, ${userDetails.followers} followers`,
                location: userDetails.location || location,
                contact: userDetails.email || undefined,
                source: this.platform,
                sourceUrl: userDetails.html_url,
                matchScore: this.calculateMatchScore(userDetails, repoLanguages, job)
              });
            }

            await delay(100);
          }
        }
      }

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[GitHubSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    }
  }

  private extractLanguages(job: Job): string[] {
    const languageMap: Record<string, string> = {
      'javascript': 'JavaScript', 'typescript': 'TypeScript', 'python': 'Python',
      'java': 'Java', 'go': 'Go', 'golang': 'Go', 'rust': 'Rust',
      'c++': 'C++', 'cpp': 'C++', 'c#': 'C#', 'csharp': 'C#',
      'ruby': 'Ruby', 'php': 'PHP', 'swift': 'Swift', 'kotlin': 'Kotlin',
      'scala': 'Scala', 'react': 'JavaScript', 'vue': 'JavaScript',
      'angular': 'TypeScript', 'node': 'JavaScript', 'nodejs': 'JavaScript',
      'django': 'Python', 'flask': 'Python', 'spring': 'Java',
      'fullstack': 'JavaScript', 'full stack': 'JavaScript', 'full-stack': 'JavaScript',
      'developer': 'JavaScript', 'software': 'JavaScript',
      'backend': 'Python', 'frontend': 'JavaScript'
    };

    const text = `${job.title} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();
    const found: string[] = [];

    for (const [keyword, lang] of Object.entries(languageMap)) {
      if (text.includes(keyword) && !found.includes(lang)) {
        found.push(lang);
      }
    }

    return found.length > 0 ? found : ['JavaScript', 'Python', 'TypeScript'];
  }

  private calculateMatchScore(user: any, languages: string[], job: Job): number {
    // Extract required skills/languages from job
    const jobSkills = extractSkillsFromText(
      `${job.title} ${job.description || ''} ${(job as any).requirements || ''}`
    ).map(s => s.toLowerCase());

    // Language-match-weighted scoring: how many of the user's repo languages match job requirements?
    let langMatchCount = 0;
    for (const lang of languages) {
      if (jobSkills.some(js => skillsMatch(lang.toLowerCase(), js))) {
        langMatchCount++;
      }
    }

    const langRatio = languages.length > 0 ? langMatchCount / Math.max(jobSkills.length, 1) : 0;
    // Language relevance: 0-40 points
    let score = Math.round(Math.min(langRatio, 1) * 40);

    // Activity signals: 0-15 points
    if (user.public_repos > 20) score += 5;
    if (user.public_repos > 50) score += 5;
    if (user.followers > 50) score += 5;

    // Profile completeness: 0-15 points
    if (user.bio) score += 5;
    if (user.email) score += 5;
    if (user.name) score += 5;

    // Bio relevance: 0-15 points
    if (user.bio) {
      const bioLower = user.bio.toLowerCase();
      const titleWords = job.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const bioMatches = titleWords.filter((w: string) => bioLower.includes(w)).length;
      score += Math.min(bioMatches * 5, 15);
    }

    return Math.min(Math.max(score, 5), 95);
  }
}

export class DevToSourcer extends BaseAPIScraper {
  name = "Dev.to Community Sourcer";
  platform = "Dev.to";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[DevToSourcer] Searching for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];

    try {
      const searchTerms = this.extractSearchTerms(job);

      for (const term of searchTerms.slice(0, 3)) {
        const url = `https://dev.to/api/articles?tag=${term.toLowerCase()}&per_page=20`;

        console.log(`[DevToSourcer] Searching articles for tag: ${term}`);

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MTN-Recruiter-Bot'
          }
        });

        if (!response.ok) continue;

        const articles = await response.json();

        for (const article of articles.slice(0, 10)) {
          if (!article.user) continue;

          const userUrl = `https://dev.to/api/users/by_username?url=${article.user.username}`;
          const userResponse = await fetch(userUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'MTN-Recruiter-Bot'
            }
          });

          if (userResponse.ok) {
            const user = await userResponse.json();
            const userLocation = (user.location || '').toLowerCase();
            const jobLocation = (job.location || '').toLowerCase();

            // Location relevance scoring
            const saKeywords = ['south africa', 'johannesburg', 'cape town', 'pretoria', 'durban', 'gauteng', 'western cape'];
            const isJobInSA = saKeywords.some(kw => jobLocation.includes(kw));
            const isCandidateInSA = saKeywords.some(kw => userLocation.includes(kw));
            const locationBonus = (isJobInSA && isCandidateInSA) ? 20 : 0;

            // Skill matching bonus
            const jobText = `${job.title} ${job.description || ''}`.toLowerCase();
            const skillMatches = (article.tag_list || []).filter((t: string) => jobText.includes(t.toLowerCase())).length;
            const skillBonus = skillMatches * 5;

            const baseScore = 40 + (article.positive_reactions_count || 0) / 10;
            const matchScore = Math.min(90, baseScore + locationBonus + skillBonus);

            candidates.push({
              name: user.name || user.username,
              title: user.summary || `Developer & Technical Writer`,
              skills: article.tag_list || [term],
              experience: `${article.positive_reactions_count || 0} reactions on articles`,
              location: user.location || 'Remote',
              contact: user.twitter_username ? `@${user.twitter_username}` : undefined,
              source: this.platform,
              sourceUrl: `https://dev.to/${user.username}`,
              matchScore
            });
          }

          await delay(100);
        }
      }

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[DevToSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    }
  }

  private extractSearchTerms(job: Job): string[] {
    const terms = ['javascript', 'react', 'python', 'node', 'typescript', 'java', 'webdev', 'devops'];
    const text = `${job.title} ${job.description || ''}`.toLowerCase();
    const found = terms.filter(t => text.includes(t));
    return found.length > 0 ? found : ['javascript', 'react', 'webdev'];
  }
}

// ========== TECH ROLE SOURCING AGENTS ==========

export class StackOverflowSourcer extends BaseAPIScraper {
  name = "Stack Overflow Developer Sourcer";
  platform = "StackOverflow";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[StackOverflowSourcer] Searching developers for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];

    try {
      const tags = this.extractTags(job);

      for (const tag of tags.slice(0, 3)) {
        const url = `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/top-answerers/all_time?site=stackoverflow&pagesize=10`;

        console.log(`[StackOverflowSourcer] Fetching users for tag: ${tag}`);

        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) continue;

        const data = await response.json();

        for (const item of (data.items || []).slice(0, 5)) {
          const user = item.user;
          if (!user || !user.display_name) continue;

          const allTags = this.extractTags(job);
          const candidateSkills = [tag, ...allTags.filter(t => t !== tag).slice(0, 3)];

          // Score based on reputation (capped contribution) + location relevance
          const repScore = Math.min(20, Math.floor((user.reputation || 0) / 10000));
          const locationStr = (user.location || '').toLowerCase();
          const locationBonus = (locationStr.includes('south africa') || locationStr.includes('johannesburg') ||
            locationStr.includes('cape town') || locationStr.includes('pretoria') || locationStr.includes('durban')) ? 15 : 0;
          const matchScore = Math.min(85, 45 + repScore + locationBonus + (item.post_count > 50 ? 5 : 0));

          candidates.push({
            name: user.display_name,
            title: `${tag} Developer`,
            skills: candidateSkills,
            experience: `${user.reputation?.toLocaleString() || 0} reputation, ${item.post_count || 0} answers in ${tag}`,
            location: user.location || "Remote",
            contact: user.website_url || undefined,
            source: this.platform,
            sourceUrl: user.link || `https://stackoverflow.com/users/${user.user_id}`,
            matchScore
          });
        }

        await delay(200);
      }

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[StackOverflowSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    }
  }

  private extractTags(job: Job): string[] {
    const tagMap: Record<string, string> = {
      'javascript': 'javascript', 'typescript': 'typescript', 'python': 'python',
      'java': 'java', 'react': 'reactjs', 'angular': 'angular', 'vue': 'vue.js',
      'node': 'node.js', 'django': 'django', 'flask': 'flask', 'spring': 'spring',
      'docker': 'docker', 'kubernetes': 'kubernetes', 'aws': 'amazon-web-services',
      'azure': 'azure', 'sql': 'sql', 'mongodb': 'mongodb', 'postgresql': 'postgresql',
      'c#': 'c#', 'c++': 'c++', 'go': 'go', 'rust': 'rust', 'php': 'php',
      'ruby': 'ruby', 'swift': 'swift', 'kotlin': 'kotlin', 'flutter': 'flutter'
    };

    const text = `${job.title} ${job.description || ''}`.toLowerCase();
    const found: string[] = [];

    for (const [keyword, tag] of Object.entries(tagMap)) {
      if (text.includes(keyword) && !found.includes(tag)) {
        found.push(tag);
      }
    }

    return found.length > 0 ? found : ['javascript', 'python', 'java'];
  }
}

export class HackerNewsSourcer extends BaseAPIScraper {
  name = "HackerNews Who's Hiring Sourcer";
  platform = "HackerNews";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[HackerNewsSourcer] Searching Who's Hiring threads for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];

    try {
      const searchTerms = this.buildSearchTerms(job);

      for (const term of searchTerms.slice(0, 2)) {
        const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(term)}&tags=comment&hitsPerPage=20`;

        console.log(`[HackerNewsSourcer] Searching: ${term}`);

        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) continue;

        const data = await response.json();

        for (const hit of (data.hits || []).slice(0, 10)) {
          if (!hit.comment_text || hit.comment_text.length < 50) continue;

          const extracted = this.extractFromComment(hit.comment_text, hit.author);
          if (extracted) {
            candidates.push({
              ...extracted as ScrapedCandidate,
              source: this.platform,
              sourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
              matchScore: 70
            });
          }
        }

        await delay(200);
      }

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[HackerNewsSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    }
  }

  private buildSearchTerms(job: Job): string[] {
    const baseTerms = ["looking for work", "available for hire", "seeking opportunities"];
    const skills = this.extractSkills(job);

    if (skills.length > 0) {
      return [`${skills[0]} developer looking`, `${skills[0]} engineer available`, ...baseTerms.slice(0, 1)];
    }

    return baseTerms;
  }

  private extractSkills(job: Job): string[] {
    const skills = ['javascript', 'python', 'java', 'react', 'node', 'typescript', 'go', 'rust'];
    const text = `${job.title} ${job.description || ''}`.toLowerCase();
    return skills.filter(s => text.includes(s));
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#x2F;/g, '/')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractFromComment(text: string, author: string): Partial<ScrapedCandidate> | null {
    const cleanText = this.stripHtml(text);
    if (cleanText.length < 20) return null;

    // Use field labels as delimiters to stop greedy matching
    const fieldDelimiter = /(?=\s*(?:Remote|Willing|Technologies|Skills|Email|Résumé|Resume|Languages|Interested|Website):)/i;

    const locationMatch = cleanText.match(/Location:\s*(.+)/i) || cleanText.match(/Based in\s*([^,]+)/i);
    let location = "Remote";
    if (locationMatch) {
      // Take only the part before the next field label
      location = locationMatch[1].split(fieldDelimiter)[0].trim().substring(0, 80);
    }

    const techMatch = cleanText.match(/Technologies?:\s*(.+)/i) || cleanText.match(/Skills?:\s*(.+)/i);
    let skills: string[] = ["Software Development"];
    if (techMatch) {
      const techStr = techMatch[1].split(fieldDelimiter)[0];
      skills = techStr.split(/[,|\/]/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.length < 40 && !s.includes('http'))
        .slice(0, 5);
      if (skills.length === 0) skills = ["Software Development"];
    }

    const emailMatch = cleanText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

    return {
      name: author,
      title: "Developer (HN)",
      skills,
      experience: cleanText.substring(0, 200),
      location,
      contact: emailMatch ? emailMatch[1] : undefined
    };
  }
}

export class KaggleSourcer extends BaseAPIScraper {
  name = "Kaggle Data Science Sourcer";
  platform = "Kaggle";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[KaggleSourcer] Searching data scientists for: ${job.title}`);

    const dataKeywords = ['data', 'scientist', 'machine learning', 'ml', 'ai', 'artificial intelligence',
                          'analytics', 'analyst', 'deep learning', 'nlp', 'computer vision'];
    const isDataRole = dataKeywords.some(kw =>
      job.title.toLowerCase().includes(kw) || (job.description || '').toLowerCase().includes(kw)
    );

    if (!isDataRole) {
      return {
        platform: this.platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "partial",
        error: "Kaggle sourcing is optimized for data science roles"
      };
    }

    const candidates: ScrapedCandidate[] = [];

    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=site:kaggle.com+"data+scientist"+South+Africa`;

      console.log(`[KaggleSourcer] Searching Kaggle profiles...`);

      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': USER_AGENT }
      });

      if (response.ok) {
        const html = await response.text();
        const extracted = await this.extractFromSearch(html);
        candidates.push(...extracted);
      }

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[KaggleSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    }
  }

  private async extractFromSearch(html: string): Promise<ScrapedCandidate[]> {
    try {
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 8000);

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `Extract Kaggle user profiles from search results.
Return a JSON array: [{"name": "...", "username": "...", "bio": "...", "location": "..."}]
Only include data scientists/ML engineers. Return [] if none found.`
          },
          {
            role: "user",
            content: `Search results:\n${textContent}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const content = completion.choices[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const profiles = JSON.parse(jsonMatch[0]);

      return profiles.map((p: any) => ({
        name: p.name || p.username,
        title: "Data Scientist / ML Engineer",
        skills: ["Machine Learning", "Python", "Data Science", "Deep Learning"],
        experience: p.bio || "Kaggle Contributor",
        location: p.location || "Remote",
        source: this.platform,
        sourceUrl: p.username ? `https://kaggle.com/${p.username}` : "Kaggle",
        matchScore: 75
      }));
    } catch (error) {
      console.error(`[KaggleSourcer] Extraction error:`, error);
      return [];
    }
  }
}

// ========== BLUE COLLAR SOURCING AGENTS ==========

export class OLXSourcer extends BaseBrowserScraper {
  name = "OLX South Africa Sourcer";
  platform = "OLX";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[OLXSourcer] Searching blue collar candidates for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];
    let page: Page | null = null;

    try {
      const searchTerm = this.buildSearchTerm(job);
      page = await this.setupPage();

      const searchUrl = `https://www.olx.co.za/jobs/q-${encodeURIComponent(searchTerm)}`;

      console.log(`[OLXSourcer] Navigating to: ${searchUrl}`);

      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15000
      });

      await delay(2000);

      const pageContent = await page.evaluate(() => {
        const listings = document.querySelectorAll('[data-aut-id="itemBox"], .EIR5N, [class*="listing"]');
        let text = "";
        listings.forEach(el => {
          text += el.textContent + "\n\n";
        });
        if (text.length < 100) {
          text = document.body.innerText;
        }
        return text.substring(0, 15000);
      });

      if (pageContent.length > 200) {
        const extracted = await extractCandidatesWithAI(pageContent, job, this.platform);
        candidates.push(...extracted);
      }

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[OLXSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    } finally {
      if (page) await page.close();
    }
  }

  private buildSearchTerm(job: Job): string {
    const title = job.title.toLowerCase();

    const mappings: Record<string, string> = {
      'driver': 'driver cv', 'welder': 'welder seeking work',
      'electrician': 'electrician available', 'plumber': 'plumber cv',
      'mechanic': 'mechanic looking for work', 'cleaner': 'cleaner available',
      'security': 'security guard cv', 'construction': 'construction worker',
      'factory': 'factory worker cv', 'warehouse': 'warehouse worker',
      'forklift': 'forklift operator', 'truck': 'truck driver cv',
      'artisan': 'artisan cv', 'technician': 'technician cv',
      'handyman': 'handyman services'
    };

    for (const [keyword, query] of Object.entries(mappings)) {
      if (title.includes(keyword)) {
        return query;
      }
    }

    return job.title.split(/\s+/).slice(0, 3).join(' ') + ' cv';
  }
}

export class TradeForumSourcer extends BaseAPIScraper {
  name = "Trade & Skills Forum Sourcer";
  platform = "TradeForums";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[TradeForumSourcer] Searching trade workers for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];

    try {
      const searchTerms = this.buildSearchTerms(job);

      for (const term of searchTerms.slice(0, 2)) {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(term)}`;

        console.log(`[TradeForumSourcer] Searching: ${term}`);

        const response = await fetch(searchUrl, {
          headers: { 'User-Agent': USER_AGENT }
        });

        if (response.ok) {
          const html = await response.text();
          const extracted = await this.extractFromSearch(html, term);
          candidates.push(...extracted);
        }

        await delay(500);
      }

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[TradeForumSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    }
  }

  private buildSearchTerms(job: Job): string[] {
    const title = job.title.toLowerCase();

    const tradeTerms = [
      'electrician', 'plumber', 'welder', 'mechanic', 'carpenter',
      'driver', 'security', 'cleaner', 'construction', 'artisan'
    ];

    const matchedTrade = tradeTerms.find(t => title.includes(t));

    if (matchedTrade) {
      return [
        `${matchedTrade} available South Africa`,
        `${matchedTrade} looking for work Johannesburg`,
        `qualified ${matchedTrade} CV South Africa`
      ];
    }

    return [
      `${job.title} available South Africa`,
      `${job.title} CV Johannesburg`
    ];
  }

  private async extractFromSearch(html: string, term: string): Promise<ScrapedCandidate[]> {
    try {
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 8000);

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `Extract people offering trade/blue collar services from search results.
Return a JSON array: [{"name": "...", "trade": "...", "location": "...", "contact": "...", "experience": "..."}]
Only include people offering their services. Return [] if none found.`
          },
          {
            role: "user",
            content: `Search term: ${term}\n\nResults:\n${textContent}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const content = completion.choices[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const workers = JSON.parse(jsonMatch[0]);

      return workers.map((w: any) => ({
        name: w.name || "Trade Worker",
        title: w.trade || "Skilled Worker",
        skills: [w.trade || "Trade Skills"],
        experience: w.experience || "Experienced tradesperson",
        location: w.location || "South Africa",
        contact: w.contact,
        source: this.platform,
        sourceUrl: "Trade Forums/Classifieds",
        matchScore: 70
      }));
    } catch (error) {
      console.error(`[TradeForumSourcer] Extraction error:`, error);
      return [];
    }
  }
}

// ========== EXECUTIVE & C-SUITE SOURCING AGENTS ==========

export class ExecutiveSourcer implements Scraper {
  name = "Executive Network Sourcer";
  platform = "Executive";

  private apiKey = process.env.EXECUTIVE_API_KEY;

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[ExecutiveSourcer] Searching C-suite candidates for: ${job.title}`);

    const executiveKeywords = ['CEO', 'CFO', 'CTO', 'COO', 'CIO', 'CHRO', 'VP', 'Director', 'Head of', 'Chief', 'President', 'Managing Director'];
    const isExecutiveRole = executiveKeywords.some(kw =>
      job.title.toLowerCase().includes(kw.toLowerCase())
    );

    if (!isExecutiveRole) {
      return {
        platform: this.platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "partial",
        error: "Not an executive-level position"
      };
    }

    if (!this.apiKey) {
      console.log(`[ExecutiveSourcer] No API key configured. Set EXECUTIVE_API_KEY for TheOfficialBoard or similar API.`);
      return {
        platform: this.platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "partial",
        error: "Executive API not configured. Set EXECUTIVE_API_KEY in secrets."
      };
    }

    try {
      return {
        platform: this.platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "partial",
        error: "Executive API integration pending - requires API subscription"
      };
    } catch (error) {
      return {
        platform: this.platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

export class CandidateAPISourcer implements Scraper {
  name = "Candidate API Sourcer";
  platform = "CandidateAPI";

  private pearchApiKey = process.env.PEARCH_API_KEY;
  private datavertexApiKey = process.env.DATAVERTEX_API_KEY;

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[CandidateAPISourcer] Searching candidates for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];

    if (this.pearchApiKey) {
      try {
        const searchQuery = `${job.title} in South Africa with ${job.requirements || 'relevant experience'}`;
        console.log(`[CandidateAPISourcer] Pearch AI query: ${searchQuery}`);
        // Pearch AI integration point - awaiting API subscription
      } catch (error) {
        console.error(`[CandidateAPISourcer] Pearch AI error:`, error);
      }
    }

    if (this.datavertexApiKey && candidates.length === 0) {
      try {
        console.log(`[CandidateAPISourcer] Trying DataVertex API...`);
        // DataVertex integration point - awaiting API subscription
      } catch (error) {
        console.error(`[CandidateAPISourcer] DataVertex error:`, error);
      }
    }

    if (!this.pearchApiKey && !this.datavertexApiKey) {
      return {
        platform: this.platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "partial",
        error: "No candidate API configured. Set PEARCH_API_KEY or DATAVERTEX_API_KEY in secrets."
      };
    }

    return {
      platform: this.platform,
      query: job.title,
      candidates,
      scrapedAt: new Date(),
      status: candidates.length > 0 ? "success" : "partial"
    };
  }
}

export class CompanyLeadershipSourcer extends BaseBrowserScraper {
  name = "Company Leadership Sourcer";
  platform = "CompanyLeadership";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[CompanyLeadershipSourcer] Searching executive bios for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];
    const targetCompanies = this.getTargetCompanies(job);

    let page: Page | null = null;

    try {
      page = await this.setupPage();

      for (const company of targetCompanies.slice(0, 5)) {
        try {
          const leadershipUrls = [
            `https://${company.domain}/about/leadership`,
            `https://${company.domain}/about-us/team`,
            `https://${company.domain}/about/our-team`,
            `https://${company.domain}/leadership`,
            `https://${company.domain}/team`,
            `https://${company.domain}/about`
          ];

          for (const url of leadershipUrls) {
            try {
              console.log(`[CompanyLeadershipSourcer] Trying: ${url}`);

              await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 10000
              });

              await delay(1000);

              const pageContent = await page.evaluate(() => {
                const selectors = [
                  '.leadership', '.team', '.executive', '.management',
                  '[class*="leader"]', '[class*="team"]', '[class*="exec"]',
                  '.about-team', '.our-team', '.board'
                ];

                let text = '';
                for (const selector of selectors) {
                  document.querySelectorAll(selector).forEach(el => {
                    text += el.textContent + '\n';
                  });
                }

                if (text.length < 100) {
                  text = document.body.innerText;
                }

                return text.substring(0, 15000);
              });

              if (pageContent.length > 200) {
                const extractedCandidates = await this.extractExecutives(pageContent, company.name, url);
                candidates.push(...extractedCandidates);
                break;
              }
            } catch (urlError) {
              continue;
            }
          }

          await delay(500);
        } catch (companyError) {
          console.log(`[CompanyLeadershipSourcer] Error with ${company.name}:`, companyError);
        }
      }

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[CompanyLeadershipSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    } finally {
      if (page) await page.close();
    }
  }

  private getTargetCompanies(job: Job): { name: string; domain: string }[] {
    return [
      { name: "Standard Bank", domain: "www.standardbank.com" },
      { name: "Naspers", domain: "www.naspers.com" },
      { name: "MTN Group", domain: "www.mtn.com" },
      { name: "Sasol", domain: "www.sasol.com" },
      { name: "Discovery", domain: "www.discovery.co.za" },
      { name: "Shoprite", domain: "www.shopriteholdings.co.za" },
      { name: "FirstRand", domain: "www.firstrand.co.za" },
      { name: "Vodacom", domain: "www.vodacom.com" },
      { name: "Capitec", domain: "www.capitecbank.co.za" },
      { name: "Anglo American", domain: "www.angloamerican.com" }
    ];
  }

  private async extractExecutives(text: string, companyName: string, sourceUrl: string): Promise<ScrapedCandidate[]> {
    try {
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `Extract executive/leadership information from company website content.
Return a JSON array of executives with: name, title, bio_summary.
Only include C-suite and senior leadership (CEO, CFO, CTO, COO, VP, Director, Head of, etc).
Return [] if no executives found.`
          },
          {
            role: "user",
            content: `Company: ${companyName}\n\nWebsite content:\n${text.substring(0, 8000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const content = completion.choices[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const executives = JSON.parse(jsonMatch[0]);

      return executives.map((exec: any) => ({
        name: exec.name,
        title: exec.title || "Executive",
        skills: ["Leadership", "Executive Management"],
        experience: exec.bio_summary || `Executive at ${companyName}`,
        location: "South Africa",
        contact: undefined,
        source: this.platform,
        sourceUrl,
        matchScore: 85
      }));
    } catch (error) {
      console.error(`[CompanyLeadershipSourcer] AI extraction error:`, error);
      return [];
    }
  }
}

export class NewsExecutiveSourcer extends BaseAPIScraper {
  name = "News & Press Release Sourcer";
  platform = "ExecutiveNews";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[NewsExecutiveSourcer] Searching executive news for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];

    try {
      const searchTerms = this.buildSearchTerms(job);

      for (const term of searchTerms.slice(0, 3)) {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(term)}`;

        console.log(`[NewsExecutiveSourcer] Searching: ${term}`);

        try {
          const response = await fetch(searchUrl, {
            headers: { 'User-Agent': USER_AGENT }
          });

          if (response.ok) {
            const html = await response.text();
            const extractedCandidates = await this.extractFromNews(html, term);
            candidates.push(...extractedCandidates);
          }
        } catch (searchError) {
          console.log(`[NewsExecutiveSourcer] Search error for ${term}:`, searchError);
        }

        await delay(500);
      }

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[NewsExecutiveSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    }
  }

  private buildSearchTerms(job: Job): string[] {
    const baseTerms = [
      "CEO appointed South Africa 2024",
      "CFO joins South Africa company",
      "executive appointment South Africa",
      "new CTO South Africa tech",
      "managing director appointed Johannesburg"
    ];

    const jobTitle = job.title.toLowerCase();
    if (jobTitle.includes('ceo')) {
      return ["CEO appointed South Africa", "chief executive officer South Africa new", ...baseTerms.slice(0, 2)];
    }
    if (jobTitle.includes('cfo') || jobTitle.includes('finance')) {
      return ["CFO appointed South Africa", "chief financial officer South Africa new", ...baseTerms.slice(0, 2)];
    }
    if (jobTitle.includes('cto') || jobTitle.includes('technology')) {
      return ["CTO appointed South Africa", "chief technology officer South Africa new", ...baseTerms.slice(0, 2)];
    }

    return baseTerms;
  }

  private async extractFromNews(html: string, searchTerm: string): Promise<ScrapedCandidate[]> {
    try {
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 10000);

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `Extract executive appointment information from news search results.
Return a JSON array of people mentioned with new executive roles.
Format: [{"name": "...", "title": "...", "company": "...", "context": "..."}]
Only include real executive appointments. Return [] if none found.`
          },
          {
            role: "user",
            content: `Search term: ${searchTerm}\n\nNews content:\n${textContent}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const content = completion.choices[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const appointments = JSON.parse(jsonMatch[0]);

      return appointments.map((appt: any) => ({
        name: appt.name,
        title: appt.title || "Executive",
        skills: ["Executive Leadership", "C-Suite"],
        experience: appt.context || `${appt.title} at ${appt.company}`,
        location: "South Africa",
        contact: undefined,
        source: this.platform,
        sourceUrl: "News/Press Release",
        matchScore: 80
      }));
    } catch (error) {
      console.error(`[NewsExecutiveSourcer] Extraction error:`, error);
      return [];
    }
  }
}

export class CIPCDirectorSourcer extends BaseAPIScraper {
  name = "CIPC Director Sourcer";
  platform = "CIPC";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[CIPCDirectorSourcer] Searching CIPC director records for: ${job.title}`);

    const candidates: ScrapedCandidate[] = [];

    try {
      const executiveKeywords = ['CEO', 'CFO', 'CTO', 'COO', 'Director', 'Managing Director', 'Chief', 'Head of', 'VP', 'President'];
      const isExecutiveRole = executiveKeywords.some(kw =>
        job.title.toLowerCase().includes(kw.toLowerCase())
      );

      if (!isExecutiveRole) {
        return {
          platform: this.platform,
          query: job.title,
          candidates: [],
          scrapedAt: new Date(),
          status: "partial",
          error: "CIPC sourcing is best for director-level positions"
        };
      }

      const jseCompanies = await this.searchJSEDirectors(job);
      candidates.push(...jseCompanies);

      return this.buildSuccessResult(this.platform, job.title, candidates, limit);
    } catch (error) {
      console.error(`[CIPCDirectorSourcer] Error:`, error);
      return this.buildFailedResult(this.platform, job.title, error);
    }
  }

  private async searchJSEDirectors(job: Job): Promise<ScrapedCandidate[]> {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent("site:jse.co.za director appointed")}`;

      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': USER_AGENT }
      });

      if (!response.ok) return [];

      const html = await response.text();
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 8000);

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `Extract director appointment information from JSE/South African company announcements.
Return a JSON array: [{"name": "...", "title": "...", "company": "..."}]
Only include board directors and executives. Return [] if none found.`
          },
          {
            role: "user",
            content: `Search results:\n${textContent}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const content = completion.choices[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const directors = JSON.parse(jsonMatch[0]);

      return directors.map((dir: any) => ({
        name: dir.name,
        title: dir.title || "Director",
        skills: ["Board Director", "Corporate Governance"],
        experience: `Director at ${dir.company}`,
        location: "South Africa",
        contact: undefined,
        source: this.platform,
        sourceUrl: "CIPC/JSE Public Records",
        matchScore: 75
      }));
    } catch (error) {
      console.error(`[CIPCDirectorSourcer] JSE search error:`, error);
      return [];
    }
  }
}

// ========== Executive Placements CV Search Scraper ==========

export class ExecutivePlacementsScraper extends BaseBrowserScraper {
  name = "Executive Placements CV Search";
  platform = "ExecutivePlacements";

  private username = process.env.EP_USERNAME;
  private password = process.env.EP_PASSWORD;
  private searchUrl = process.env.EP_SEARCH_URL || "https://www.executiveplacements.com/cv_search_get_dataNS11.asp";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    const query = generateSearchQuery(job);
    console.log(`[ExecutivePlacements] Searching for: "${query}" (job: ${job.title})`);

    if (!this.username || !this.password) {
      console.error("[ExecutivePlacements] Missing EP_USERNAME or EP_PASSWORD");
      return this.buildFailedResult(this.platform, query, new Error("Executive Placements credentials not configured. Set EP_USERNAME and EP_PASSWORD."));
    }

    let page: Page | null = null;

    try {
      page = await this.setupPage();
      await page.setViewport({ width: 1920, height: 1080 });

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'af'] });
      });

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      console.log("[ExecutivePlacements] Navigating to login page...");
      await page.goto("https://www.executiveplacements.com/login2.asp", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await delay(1500 + Math.random() * 1000);

      const currentUrl = page.url();
      const alreadyLoggedIn = !currentUrl.includes('login');

      if (alreadyLoggedIn) {
        console.log(`[ExecutivePlacements] Already logged in (redirected to ${currentUrl})`);
      } else {
        // Find the uid field (login2.asp uses input[name="uid"])
        const uidField = await page.$('input[name="uid"]');
        if (!uidField) {
          const allInputs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input')).map(i => ({
              name: i.name, type: i.type, id: i.id
            }));
          });
          console.log(`[ExecutivePlacements] All inputs on login page:`, JSON.stringify(allInputs));
          console.error("[ExecutivePlacements] Could not find uid field on login page");
          return this.buildFailedResult(this.platform, query, new Error("Could not find login form on Executive Placements"));
        }

        await uidField.click();
        await delay(200);
        await page.keyboard.type(this.username, { delay: 50 + Math.random() * 50 });
        await delay(300);

        const passwordField = await page.$('input[type="password"]');
        if (!passwordField) {
          return this.buildFailedResult(this.platform, query, new Error("Could not find password field on login form"));
        }

        await passwordField.click();
        await delay(200);
        await page.keyboard.type(this.password, { delay: 50 + Math.random() * 50 });
        await delay(500);

        const submitBtn = await page.$('input[type="submit"]');
        if (submitBtn) {
          console.log("[ExecutivePlacements] Clicking login button...");
          await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
            submitBtn.click()
          ]);
        } else {
          await page.keyboard.press('Enter');
          await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
        }

        await delay(2000 + Math.random() * 1000);

        const postLoginUrl = page.url();
        console.log(`[ExecutivePlacements] Post-login URL: ${postLoginUrl}`);

        if (postLoginUrl.includes('login')) {
          return this.buildFailedResult(this.platform, query, new Error("Login failed — check EP_USERNAME and EP_PASSWORD credentials"));
        }

        console.log(`[ExecutivePlacements] Login successful.`);
      }

      console.log(`[ExecutivePlacements] Navigating to CV search page...`);

      // Navigate to the CV Search page (advanced search form)
      await page.goto(this.searchUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await delay(2000);

      const searchPageUrl = page.url();
      console.log(`[ExecutivePlacements] CV search page URL: ${searchPageUrl}`);

      // Log forms and inputs for debugging
      const pageInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action, method: f.method, name: (f as any).name, id: f.id
        }));
        const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName, name: (el as any).name, type: (el as any).type,
          id: el.id, placeholder: (el as any).placeholder
        }));
        return { forms, inputs };
      });
      console.log(`[ExecutivePlacements] Search page forms:`, JSON.stringify(pageInfo.forms));
      console.log(`[ExecutivePlacements] Search page inputs (first 20):`, JSON.stringify(pageInfo.inputs.slice(0, 20)));

      // Instead of fighting with the form, make a direct XHR from the browser context
      // Build the POST body with correct params and fetch directly
      console.log(`[ExecutivePlacements] Making direct AJAX search request...`);

      // Set up request interception - modify POST data to include keywords
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('cv_search_show_cvs')) {
          let postData = request.postData() || '';
          console.log(`[ExecutivePlacements] Intercepted POST body: ${postData.slice(0, 1000)}`);

          // For searchType=4 (New Search), the site uses selectKeywordsN parameter
          // Format keywords as Boolean: "WORD1" AND "WORD2"
          const words = query.split(/\s+/).filter((w: string) => w.length > 0);
          const booleanKeywords = words.map((w: string) => `"${w.toUpperCase()}"`).join(' AND ');
          const encodedKeywords = encodeURIComponent(booleanKeywords);

          // Inject selectKeywordsN with our formatted keywords
          if (postData.includes('selectKeywordsN=&')) {
            postData = postData.replace('selectKeywordsN=&', 'selectKeywordsN=' + encodedKeywords + '&');
            console.log(`[ExecutivePlacements] Injected selectKeywordsN: ${booleanKeywords}`);
          } else if (postData.includes('selectKeywordsN=')) {
            // Already has a value, replace it
            postData = postData.replace(/selectKeywordsN=[^&]*/, 'selectKeywordsN=' + encodedKeywords);
            console.log(`[ExecutivePlacements] Replaced selectKeywordsN: ${booleanKeywords}`);
          } else {
            // Not present at all, append it
            postData += '&selectKeywordsN=' + encodedKeywords;
            console.log(`[ExecutivePlacements] Appended selectKeywordsN: ${booleanKeywords}`);
          }

          // Also ensure keywords param has value for fallback
          if (postData.includes('keywords=&') || postData.match(/keywords=$/)) {
            postData = postData.replace(/keywords=(&|$)/, 'keywords=' + encodeURIComponent(query) + '$1');
          }
          request.continue({ postData });
        } else {
          request.continue();
        }
      });

      // Set up response interception to capture the AJAX result
      const ajaxResponsePromise = new Promise<string>((resolve) => {
        const timeout = setTimeout(() => resolve(''), 30000);
        page.on('response', async (response) => {
          if (response.url().includes('cv_search_show_cvs')) {
            try {
              const body = await response.text();
              clearTimeout(timeout);
              resolve(body);
            } catch {
              resolve('');
            }
          }
        });
      });

      // Trigger the search via the page's own xmlhttpPost by setting values and calling it
      await page.evaluate((searchQuery) => {
        const form = document.forms.namedItem('CandidateQuery');
        if (!form) return;

        // Set start=1
        const startInput = form.elements.namedItem('start') as HTMLInputElement;
        if (startInput) startInput.value = '1';

        // Set the keywordsOrig value
        const keywordsOrig = form.elements.namedItem('keywordsOrig') as HTMLInputElement;
        if (keywordsOrig) keywordsOrig.value = searchQuery;

        // Also set keywordsAll in case advanced tab is active
        const keywordsAll = form.elements.namedItem('keywordsAll') as HTMLInputElement;
        if (keywordsAll) keywordsAll.value = searchQuery;

        // Populate the selectize.js keywordsN input - this is what searchType=4 actually reads
        const keywordsNInput = document.getElementById('keywordsN') as HTMLInputElement;
        if (keywordsNInput) {
          // Try to use selectize API if available
          const $sel = (window as any).$ || (window as any).jQuery;
          if ($sel) {
            try {
              const selectize = $sel('#keywordsN')[0]?.selectize;
              if (selectize) {
                const words = searchQuery.split(/\s+/).filter((w: string) => w.length > 0);
                words.forEach((word: string) => {
                  selectize.addOption({ value: word, text: word });
                  selectize.addItem(word, true);
                });
                console.log('[EP] Added keywords via selectize API:', words);
              } else {
                // Fallback: set value directly
                keywordsNInput.value = searchQuery;
              }
            } catch (e) {
              keywordsNInput.value = searchQuery;
            }
          } else {
            keywordsNInput.value = searchQuery;
          }
        }

        // Call the site's own xmlhttpPost function
        if (typeof (window as any).xmlhttpPost === 'function') {
          (window as any).xmlhttpPost('cv_search_show_cvs41N.asp', true);
        }
      }, query);

      // Wait for the AJAX response
      const ajaxHtml = await ajaxResponsePromise;
      console.log(`[ExecutivePlacements] AJAX response length: ${ajaxHtml.length}`);
      // Write raw AJAX to file for debugging
      try {
        const fs = await import('fs');
        fs.writeFileSync('/tmp/ep_ajax_response.html', ajaxHtml);
        console.log(`[ExecutivePlacements] Wrote AJAX response to /tmp/ep_ajax_response.html`);
      } catch (e) {
        console.log(`[ExecutivePlacements] Could not write AJAX response file`);
      }

      // Extract text from HTML
      let cvSearchText = '';
      if (ajaxHtml.length > 50) {
        cvSearchText = await page.evaluate((html) => {
          const div = document.createElement('div');
          div.innerHTML = html;
          div.querySelectorAll('script, style').forEach(function(el) { el.remove(); });
          return (div.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 15000);
        }, ajaxHtml);
      }
      console.log(`[ExecutivePlacements] AJAX text length: ${cvSearchText.length}`);
      console.log(`[ExecutivePlacements] AJAX text preview: ${cvSearchText.slice(0, 1000)}`);

      // Use the AJAX response text directly for candidate extraction
      if (cvSearchText.length > 200 && !cvSearchText.includes('Internal Server Error')) {
        // Extract candidate IDs and recruiter ID from the HTML for contact detail fetching
        const candidateIdMatches = ajaxHtml.match(/candidateID=(\d+)/g) || [];
        const uniqueIds = [...new Set(candidateIdMatches.map((m: string) => m.replace('candidateID=', '')))];
        const recruiterMatch = ajaxHtml.match(/recruiterID=(\d+)/);
        const recruiterId = recruiterMatch ? recruiterMatch[1] : '';
        console.log(`[ExecutivePlacements] Found ${uniqueIds.length} candidate IDs, recruiterID: ${recruiterId}`);

        // Fetch contact details (phone + email) for each candidate
        const contactMap: Record<string, { phone?: string; email?: string; candidateId?: string }> = {};
        const baseUrl = 'https://www.executiveplacements.com/';

        // Extract candidate names mapped to IDs using <!-- ENTRY START --> boundaries
        const nameIdPairs: { id: string; name: string }[] = [];
        const entries = ajaxHtml.split('<!-- ENTRY START -->').slice(1); // skip first chunk (header)
        for (const entry of entries) {
          // Get candidateID from the download/preview link within this entry
          const idMatch = entry.match(/candidate=(\d+)/);
          const nameMatch = entry.match(/<STRONG>([^<]+)<\/STRONG>/);
          if (idMatch && nameMatch) {
            const id = idMatch[1];
            const name = nameMatch[1].replace(/\s+/g, ' ').trim();
            if (name.length > 2) {
              nameIdPairs.push({ id, name });
            }
          }
        }
        console.log(`[ExecutivePlacements] Mapped ${nameIdPairs.length} candidate name-ID pairs`);

        // Fetch phone and email for top candidates (limit to avoid too many requests)
        const topCandidateIds = uniqueIds.slice(0, Math.min(limit || 10, 15));
        for (const candidateId of topCandidateIds) {
          try {
            // Fetch phone number
            const phoneResponse = await page.evaluate(async (url: string) => {
              try {
                const res = await fetch(url, { credentials: 'include' });
                return await res.text();
              } catch { return ''; }
            }, `${baseUrl}Show_PhoneN.asp?candidateID=${candidateId}`);

            // Fetch email page
            const emailResponse = await page.evaluate(async (url: string) => {
              try {
                const res = await fetch(url, { credentials: 'include' });
                return await res.text();
              } catch { return ''; }
            }, `${baseUrl}Candidate_Cv_Search_EmailN10.asp?candidateID=${candidateId}&recruiterID=${recruiterId}`);

            const contact: { phone?: string; email?: string; candidateId?: string } = { candidateId };

            // Extract phone from response
            const phoneMatch = phoneResponse.match(/(?:0\d{9}|\+27\d{9}|\d{3}[\s-]\d{3}[\s-]\d{4})/);
            if (phoneMatch) contact.phone = phoneMatch[0];
            // Also try broader phone pattern
            if (!contact.phone) {
              const phoneMatch2 = phoneResponse.match(/(\d[\d\s\-()]{8,15}\d)/);
              if (phoneMatch2) contact.phone = phoneMatch2[1].trim();
            }

            // Extract email from response
            const emailMatch = emailResponse.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (emailMatch) contact.email = emailMatch[0];

            if (contact.phone || contact.email) {
              contactMap[candidateId] = contact;
              console.log(`[ExecutivePlacements] Contact for ${candidateId}: phone=${contact.phone || 'N/A'}, email=${contact.email || 'N/A'}`);
            }

            // Small delay between requests to be respectful
            await delay(300);
          } catch (err) {
            console.log(`[ExecutivePlacements] Error fetching contact for ${candidateId}:`, err);
          }
        }

        // Extract candidates with AI first, then attach contact details by name matching
        console.log(`[ExecutivePlacements] Using AJAX response for candidate extraction (${cvSearchText.length} chars)`);
        const candidates = await extractCandidatesWithAI(cvSearchText, job, "Executive Placements");
        console.log(`[ExecutivePlacements] AI extracted ${candidates.length} candidates from AJAX response`);

        // Build a name-to-contact lookup from nameIdPairs + contactMap
        const nameContactLookup: Record<string, string> = {};
        for (const pair of nameIdPairs) {
          const contact = contactMap[pair.id];
          if (contact) {
            const parts: string[] = [];
            if (contact.phone) parts.push(contact.phone);
            if (contact.email) parts.push(contact.email);
            if (parts.length > 0) {
              // Store with lowercase name for fuzzy matching
              nameContactLookup[pair.name.toLowerCase()] = parts.join(', ');
            }
          }
        }

        // Attach contact info to candidates by matching names
        for (const candidate of candidates) {
          if (!candidate.contact || candidate.contact === 'N/A') {
            const candidateName = (candidate.name || '').toLowerCase();
            // Try exact match first
            let contactInfo = nameContactLookup[candidateName];
            // Try partial match (candidate name contains or is contained by a nameIdPair name)
            if (!contactInfo) {
              for (const [name, info] of Object.entries(nameContactLookup)) {
                if (candidateName.includes(name) || name.includes(candidateName)) {
                  contactInfo = info;
                  break;
                }
                // Try matching on last name
                const candidateLastName = candidateName.split(' ').pop() || '';
                const pairLastName = name.split(' ').pop() || '';
                if (candidateLastName.length > 2 && candidateLastName === pairLastName) {
                  contactInfo = info;
                  break;
                }
              }
            }
            if (contactInfo) {
              candidate.contact = contactInfo;
              console.log(`[ExecutivePlacements] Attached contact to ${candidate.name}: ${contactInfo}`);
            }
          }
        }

        return this.buildSuccessResult(this.platform, query, candidates, limit);
      }

      await delay(3000 + Math.random() * 2000);

      const resultsUrl = page.url();
      console.log(`[ExecutivePlacements] Results page URL: ${resultsUrl}`);

      const resultsText = await page.evaluate(() => {
        // First try to get content from the job-results container (AJAX loaded)
        const resultsDiv = document.querySelector('.job-results') || document.querySelector('.boxed-layout');
        if (resultsDiv) {
          const clone = resultsDiv.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('script, style, select, option').forEach(el => el.remove());
          const text = clone.textContent?.replace(/\s+/g, ' ')?.trim() || '';
          if (text.length > 200) return text.slice(0, 50000);
        }
        // Fallback to full body
        const body = document.body;
        if (!body) return '';
        const clone = body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, style, nav, header, footer, select, option').forEach(el => el.remove());
        return clone.textContent?.replace(/\s+/g, ' ')?.trim()?.slice(0, 50000) || '';
      });

      console.log(`[ExecutivePlacements] Results text length: ${resultsText.length}`);
      console.log(`[ExecutivePlacements] Results text preview (start): ${resultsText.replace(/\s+/g, ' ').slice(0, 500)}`);
      console.log(`[ExecutivePlacements] Results text preview (middle): ${resultsText.replace(/\s+/g, ' ').slice(resultsText.length / 2, resultsText.length / 2 + 1000)}`);
      console.log(`[ExecutivePlacements] Results text preview (end): ${resultsText.replace(/\s+/g, ' ').slice(-1000)}`);

      if (resultsText.length < 100) {
        console.log(`[ExecutivePlacements] Very short result, may have failed. Text: ${resultsText}`);
        return this.buildSuccessResult(this.platform, query, [], limit);
      }

      const tableData = await page.evaluate(() => {
        const candidates: Array<{
          name: string; title: string; location: string; experience: string;
          education: string; skills: string; availability: string; link: string;
        }> = [];

        // Try table rows first
        const rows = document.querySelectorAll('table tr, .cv-result, .candidate-row, .search-result, .candidateRow, .candidate');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, .cell, .field');
          const links = row.querySelectorAll('a');
          const text = row.textContent || '';

          if (cells.length >= 2 || text.length > 50) {
            const cellTexts = Array.from(cells).map(c => (c.textContent || '').trim());
            const link = links.length > 0 ? links[0].href : '';

            if (cellTexts.some(t => t.length > 3)) {
              candidates.push({
                name: cellTexts[0] || '',
                title: cellTexts[1] || '',
                location: cellTexts[2] || '',
                experience: cellTexts[3] || '',
                education: cellTexts[4] || '',
                skills: cellTexts.slice(5).join(', '),
                availability: '',
                link
              });
            }
          }
        });

        // If no table results, try to find candidate-like anchor tags with info
        if (candidates.length === 0) {
          const allLinks = document.querySelectorAll('a[href*="cv"], a[href*="candidate"], a[href*="CV"], a[href*="profile"]');
          allLinks.forEach(link => {
            const text = (link.textContent || '').trim();
            const href = (link as HTMLAnchorElement).href;
            if (text.length > 3 && !text.toLowerCase().includes('upload') && !text.toLowerCase().includes('add')) {
              const parent = link.closest('tr, div, li');
              const parentText = parent?.textContent?.trim() || text;
              candidates.push({
                name: text,
                title: '',
                location: '',
                experience: parentText.slice(0, 200),
                education: '',
                skills: '',
                availability: '',
                link: href
              });
            }
          });
        }

        // Also capture raw HTML structure for debugging
        const mainContent = document.querySelector('.content, .main, #content, main, .candidates, .results');
        if (candidates.length === 0 && mainContent) {
          console.log('[EP-debug] Main content HTML:', mainContent.innerHTML.slice(0, 2000));
        }

        return candidates;
      });

      console.log(`[ExecutivePlacements] Parsed ${tableData.length} table rows`);

      let candidates: ScrapedCandidate[] = [];

      if (tableData.length > 0) {
        candidates = tableData
          .filter(row => row.name && row.name.length > 2 && !row.name.toLowerCase().includes('name') && !row.name.toLowerCase().includes('keyword'))
          .map(row => ({
            name: row.name,
            title: row.title || undefined,
            skills: row.skills ? row.skills.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 1) : [],
            experience: row.experience || undefined,
            location: row.location || undefined,
            contact: undefined,
            source: "Executive Placements",
            sourceUrl: row.link || `https://www.executiveplacements.com`,
            matchScore: calculateMatchScore({ name: row.name, title: row.title, skills: row.skills?.split(/[,;]/) || [], experience: row.experience }, job)
          }));
      }

      if (candidates.length === 0 && resultsText.length > 200) {
        console.log("[ExecutivePlacements] No table data parsed, using AI extraction...");
        candidates = await extractCandidatesWithAI(resultsText, job, "Executive Placements");
      }

      console.log(`[ExecutivePlacements] Final candidates found: ${candidates.length}`);
      return this.buildSuccessResult(this.platform, query, candidates, limit);

    } catch (error) {
      console.error(`[ExecutivePlacements] Error:`, error);
      return this.buildFailedResult(this.platform, query, error);
    } finally {
      if (page) {
        try { await page.close(); } catch {}
      }
    }
  }
}

// ========== Orchestrator ==========

export class ScraperOrchestrator {
  private scrapers: Scraper[] = [
    // API-based tech sourcers (reliable, no scraping blocks)
    new GitHubDeveloperSourcer(),
    new DevToSourcer(),
    new StackOverflowSourcer(),
    new HackerNewsSourcer(),
    new KaggleSourcer(),
    // Executive/C-Suite sourcing agents
    new ExecutiveSourcer(),
    new CandidateAPISourcer(),
    new CompanyLeadershipSourcer(),
    new NewsExecutiveSourcer(),
    new CIPCDirectorSourcer(),
    // Blue collar sourcing agents
    new OLXSourcer(),
    new TradeForumSourcer(),
    // Web scrapers (may have anti-bot issues)
    new GumtreeScraper(),
    new IndeedScraper(),
    new Careers24Scraper(),
    new PNetScraper(),
    new LinkedInJobsScraper(),
    // Additional South African career sites
    new CareerJunctionScraper(),
    new JobMailScraper(),
    new MyJobMagScraper(),
    new OfferZenScraper(),
    new RecruitMySelfScraper(),
    new BestJobsScraper(),
    // CV database search (authenticated)
    new ExecutivePlacementsScraper()
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

    const result = await scraper.search(job, limit);
    scraperHealth.recordRun(
      result.platform,
      result.status as "success" | "partial" | "failed",
      result.candidates.length,
      result.error
    );
    return result;
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

    // Record health for each scraper run
    for (const result of results) {
      scraperHealth.recordRun(
        result.platform,
        result.status as "success" | "partial" | "failed",
        result.candidates.length,
        result.error
      );
    }

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
