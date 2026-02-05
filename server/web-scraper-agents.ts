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
Requirements: ${(job.skillsRequired || []).slice(0, 5).join(", ")}

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
  const jobReqs = (job.skillsRequired || []).map((r: string) => r.toLowerCase());
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
    console.log(`[GumtreeScraper] Searching for job seekers: ${job.title}`);
    
    const query = generateSearchQuery(job);
    let page: Page | null = null;
    const allCandidates: ScrapedCandidate[] = [];
    
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Search in CVs/Services section where job seekers post
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
          
          await new Promise(r => setTimeout(r, 2000));
          
          // Extract listing details
          const listingData = await page.evaluate(() => {
            const listings: any[] = [];
            
            // Gumtree listing selectors
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
          
          // Process each listing as a potential candidate
          for (const listing of listingData.listings) {
            // Check if this looks like someone offering their services/CV
            const text = `${listing.title} ${listing.description} ${listing.fullText}`.toLowerCase();
            if (text.includes('cv') || text.includes('resume') || text.includes('seeking') || 
                text.includes('available') || text.includes('experience') || text.includes('developer') ||
                text.includes('looking for') || text.includes('qualified')) {
              
              // Use AI to extract candidate info from this listing
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
          
          // Also try to extract from full page content
          if (allCandidates.length < limit && listingData.pageContent.length > 500) {
            const pageCandidates = await extractCandidatesWithAI(listingData.pageContent, job, this.platform);
            allCandidates.push(...pageCandidates);
          }
          
          if (allCandidates.length >= limit) break;
          
        } catch (urlError) {
          console.log(`[GumtreeScraper] URL failed: ${searchUrl}`, urlError);
        }
      }
      
      // Deduplicate
      const uniqueCandidates = allCandidates.filter((c, i, arr) => 
        arr.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) === i
      );
      
      console.log(`[GumtreeScraper] Total candidates: ${uniqueCandidates.length}`);
      
      return {
        platform: this.platform,
        query,
        candidates: uniqueCandidates.slice(0, limit),
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
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
  
  private username = process.env.PNET_USERNAME;
  private password = process.env.PNET_PASSWORD;

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[PNetScraper] Searching for candidates: ${job.title}`);
    
    const query = generateSearchQuery(job);
    let page: Page | null = null;
    const allCandidates: ScrapedCandidate[] = [];
    
    if (!this.username || !this.password) {
      console.error("[PNetScraper] Missing PNET_USERNAME or PNET_PASSWORD credentials");
      return {
        platform: this.platform,
        query,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: "PNet credentials not configured"
      };
    }
    
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Step 1: Login to PNet Recruiter Space
      console.log("[PNetScraper] Logging into PNet Recruiter Space...");
      
      await page.goto("https://www.pnet.co.za/5/recruiterspace/login", { 
        waitUntil: "networkidle2",
        timeout: 30000 
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      // Fill login form - PNet uses React with specific class names
      // Username input: input[name="username"]
      // Password input: input[type="password"][name="password"]
      // Submit button: button.at-data-login-button
      
      await page.waitForSelector('input[name="username"]', { timeout: 10000 });
      
      // Clear and type username
      await page.click('input[name="username"]');
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.type('input[name="username"]', this.username);
      
      // Clear and type password
      await page.click('input[name="password"]');
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.type('input[name="password"]', this.password);
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Click sign in button using the PNet specific class
      const signInButton = await page.$('button.at-data-login-button') || 
                           await page.$('button[type="submit"]');
      
      if (signInButton) {
        console.log("[PNetScraper] Clicking sign in button...");
        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 }).catch(() => {}),
          signInButton.click()
        ]);
      }
      
      await new Promise(r => setTimeout(r, 4000));
      
      // Check if login was successful
      const currentUrl = page.url();
      console.log(`[PNetScraper] After login, URL: ${currentUrl}`);
      
      // Check for login errors
      const pageContent = await page.evaluate(() => document.body.innerText.slice(0, 2000));
      const isLoggedIn = !currentUrl.includes('login');
      console.log(`[PNetScraper] Login successful: ${isLoggedIn}`);
      
      if (!isLoggedIn) {
        // Check if there's an error message
        if (pageContent.includes('Invalid') || pageContent.includes('incorrect') || pageContent.includes('error')) {
          console.log(`[PNetScraper] Login error detected in page content`);
        }
        // Continue anyway and try to access public candidate sections
      }
      
      // Step 2: Navigate to candidate search
      console.log("[PNetScraper] Navigating to candidate search...");
      
      // Navigate to recruiter space - check actual dashboard to find CV/candidate search
      const searchUrls = [
        `https://www.pnet.co.za/5/recruiterspace/dashboard`,
        `https://www.pnet.co.za/5/recruiterspace/candidate-database`,
        `https://www.pnet.co.za/5/recruiterspace/cv-search?keywords=${encodeURIComponent(query)}`,
        `https://www.pnet.co.za/5/recruiterspace/candidates?q=${encodeURIComponent(query)}`
      ];
      
      for (const searchUrl of searchUrls) {
        try {
          console.log(`[PNetScraper] Trying: ${searchUrl}`);
          
          await page.goto(searchUrl, { 
            waitUntil: "networkidle2",
            timeout: 30000 
          });
          
          await new Promise(r => setTimeout(r, 3000));
          
          // Look for search input and enter query if needed
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
            
            await new Promise(r => setTimeout(r, 3000));
          }
          
          // Extract candidate data
          const candidateData = await page.evaluate(() => {
            const candidates: any[] = [];
            
            // PNet specific selectors for candidate cards
            const profileSelectors = [
              '.candidate-result',
              '.cv-card',
              '.talent-card',
              '.search-result',
              '[class*="candidate"]',
              '[class*="profile-card"]',
              '.result-item',
              'article',
              '.card'
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
          
          // Process structured candidates
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
          
          // Use AI to extract additional candidates from page content
          if (allCandidates.length < limit && candidateData.pageContent.length > 500) {
            const aiCandidates = await extractCandidatesWithAI(candidateData.pageContent, job, this.platform);
            allCandidates.push(...aiCandidates);
          }
          
          if (allCandidates.length >= limit) break;
          
        } catch (urlError) {
          console.log(`[PNetScraper] URL failed: ${searchUrl}`, urlError);
        }
      }
      
      // Deduplicate by name
      const uniqueCandidates = allCandidates.filter((c, i, arr) => 
        arr.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) === i
      );
      
      console.log(`[PNetScraper] Total unique candidates: ${uniqueCandidates.length}`);
      
      return {
        platform: this.platform,
        query,
        candidates: uniqueCandidates.slice(0, limit),
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
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
