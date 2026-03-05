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
  private sessionCookies = process.env.PNET_SESSION_COOKIES; // JSON array of cookies from manual login

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[PNetScraper] Searching for candidates: ${job.title}`);
    
    const query = generateSearchQuery(job);
    let page: Page | null = null;
    const allCandidates: ScrapedCandidate[] = [];
    
    // Check if we have session cookies (preferred) or login credentials
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
      const browser = await getBrowser();
      page = await browser.newPage();
      
      // Advanced stealth settings to avoid bot detection
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Override navigator properties to appear as real browser
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'af'] });
        (window as any).chrome = { runtime: {} };
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
      });
      
      // Set extra headers to look more legitimate
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
      
      // METHOD 1: Use session cookies if available (bypasses bot detection)
      if (hasSessionCookies) {
        console.log("[PNetScraper] Using session cookies for authentication...");
        try {
          const cookies = JSON.parse(this.sessionCookies);
          await page.setCookie(...cookies);
          
          // Navigate to dashboard to verify cookies work (WITH dash - from user's network trace)
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
            // Log page title to see what we got
            const title = await page.title();
            console.log(`[PNetScraper] Page title: ${title}`);
          }
        } catch (e) {
          console.error("[PNetScraper] Failed to parse session cookies:", e);
        }
      }
      
      // METHOD 2: Try username/password login (may be blocked by bot detection)
      if (!isLoggedIn && hasLoginCreds) {
        console.log("[PNetScraper] Attempting username/password login...");
        
        await page.goto("https://www.pnet.co.za/5/recruiterspace/login", { 
          waitUntil: "networkidle2",
          timeout: 30000 
        });
        
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
        
        const initialUrl = page.url();
        console.log(`[PNetScraper] Initial page URL: ${initialUrl}`);
        
        if (initialUrl.includes('notFound') || initialUrl.includes('error')) {
          console.log("[PNetScraper] URL issue detected, trying to continue anyway...");
          await page.goto("https://www.pnet.co.za/5/recruiterspace/login", { 
            waitUntil: "networkidle2",
            timeout: 30000 
          });
          await new Promise(r => setTimeout(r, 2000));
        }
        
        try {
          await page.waitForSelector('input[name="username"]', { timeout: 10000 });
          
          await page.click('input[name="username"]');
          await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
          await page.keyboard.down('Control');
          await page.keyboard.press('a');
          await page.keyboard.up('Control');
          
          for (const char of this.username!) {
            await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
          }
          
          await new Promise(r => setTimeout(r, 300 + Math.random() * 300));
          
          await page.click('input[name="password"]');
          await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
          await page.keyboard.down('Control');
          await page.keyboard.press('a');
          await page.keyboard.up('Control');
          
          for (const char of this.password!) {
            await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
          }
          
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
          
          const signInButton = await page.$('button.at-data-login-button') || 
                               await page.$('button[type="submit"]');
          
          if (signInButton) {
            console.log("[PNetScraper] Clicking sign in button...");
            await Promise.all([
              page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 }).catch(() => {}),
              signInButton.click()
            ]);
          }
          
          await new Promise(r => setTimeout(r, 4000 + Math.random() * 2000));
          
          const currentUrl = page.url();
          console.log(`[PNetScraper] After login, URL: ${currentUrl}`);
          
          isLoggedIn = !currentUrl.includes('login') && !currentUrl.includes('notFound');
          console.log(`[PNetScraper] Login successful: ${isLoggedIn}`);
          
          if (isLoggedIn) {
            // Export cookies for future use
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

// ============ API-BASED SOURCERS (No Scraping Required) ============

export class GitHubDeveloperSourcer {
  name = "GitHub Developer Sourcer";
  platform = "GitHub";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[GitHubSourcer] Searching developers for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    
    try {
      // Extract programming languages from job requirements
      const languages = this.extractLanguages(job);
      const locations = ["South Africa", "Johannesburg", "Cape Town", "Pretoria", "Durban"];
      
      for (const location of locations.slice(0, 2)) {
        for (const lang of languages.slice(0, 3)) {
          // Build query without double-encoding - GitHub expects unencoded + as space
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
          
          for (const user of (data.items || []).slice(0, 5)) {
            // Get detailed user info
            const userResponse = await fetch(`https://api.github.com/users/${user.login}`, {
              headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'MTN-Recruiter-Bot'
              }
            });
            
            if (userResponse.ok) {
              const userDetails = await userResponse.json();
              
              // Get user's top repos for skills
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
            
            // Rate limiting - wait 100ms between requests
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }
      
      // Remove duplicates and sort by match score
      const uniqueCandidates = this.deduplicateCandidates(candidates)
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, limit);
      
      console.log(`[GitHubSourcer] Total unique candidates: ${uniqueCandidates.length}`);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[GitHubSourcer] Error:`, error);
      return {
        platform: this.platform,
        query: job.title,
        candidates,
        scrapedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  
  private extractLanguages(job: Job): string[] {
    // Map common terms to GitHub language names
    const languageMap: Record<string, string> = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript', 
      'python': 'Python',
      'java': 'Java',
      'go': 'Go',
      'golang': 'Go',
      'rust': 'Rust',
      'c++': 'C++',
      'cpp': 'C++',
      'c#': 'C#',
      'csharp': 'C#',
      'ruby': 'Ruby',
      'php': 'PHP',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'scala': 'Scala',
      'react': 'JavaScript',
      'vue': 'JavaScript',
      'angular': 'TypeScript',
      'node': 'JavaScript',
      'nodejs': 'JavaScript',
      'django': 'Python',
      'flask': 'Python',
      'spring': 'Java',
      'fullstack': 'JavaScript',
      'full stack': 'JavaScript',
      'full-stack': 'JavaScript',
      'developer': 'JavaScript',
      'software': 'JavaScript',
      'backend': 'Python',
      'frontend': 'JavaScript'
    };
    
    const text = `${job.title} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();
    const found: string[] = [];
    
    for (const [keyword, lang] of Object.entries(languageMap)) {
      if (text.includes(keyword) && !found.includes(lang)) {
        found.push(lang);
      }
    }
    
    // Default to common languages if nothing found
    return found.length > 0 ? found : ['JavaScript', 'Python', 'TypeScript'];
  }
  
  private calculateMatchScore(user: any, languages: string[], job: Job): number {
    let score = 50;
    
    if (user.public_repos > 20) score += 10;
    if (user.public_repos > 50) score += 10;
    if (user.followers > 10) score += 5;
    if (user.followers > 100) score += 10;
    if (user.bio) score += 5;
    if (user.email) score += 10;
    
    const jobText = `${job.title} ${job.description || ''}`.toLowerCase();
    for (const lang of languages) {
      if (jobText.includes(lang.toLowerCase())) {
        score += 5;
      }
    }
    
    return Math.min(100, score);
  }
  
  private deduplicateCandidates(candidates: ScrapedCandidate[]): ScrapedCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = c.sourceUrl || c.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export class DevToSourcer {
  name = "Dev.to Community Sourcer";
  platform = "Dev.to";

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[DevToSourcer] Searching for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    
    try {
      // Search for articles by developers with relevant skills
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
          
          // Get user profile
          const userUrl = `https://dev.to/api/users/by_username?url=${article.user.username}`;
          const userResponse = await fetch(userUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'MTN-Recruiter-Bot'
            }
          });
          
          if (userResponse.ok) {
            const user = await userResponse.json();
            
            candidates.push({
              name: user.name || user.username,
              title: user.summary || `Developer & Technical Writer`,
              skills: article.tag_list || [term],
              experience: `${article.positive_reactions_count || 0} reactions on articles`,
              location: user.location || 'Remote',
              contact: user.twitter_username ? `@${user.twitter_username}` : undefined,
              source: this.platform,
              sourceUrl: `https://dev.to/${user.username}`,
              matchScore: Math.min(90, 50 + (article.positive_reactions_count || 0) / 10)
            });
          }
          
          await new Promise(r => setTimeout(r, 100));
        }
      }
      
      // Deduplicate
      const seen = new Set<string>();
      const uniqueCandidates = candidates.filter(c => {
        if (seen.has(c.sourceUrl || c.name)) return false;
        seen.add(c.sourceUrl || c.name);
        return true;
      }).slice(0, limit);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[DevToSourcer] Error:`, error);
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
  
  private extractSearchTerms(job: Job): string[] {
    const terms = ['javascript', 'react', 'python', 'node', 'typescript', 'java', 'webdev', 'devops'];
    const text = `${job.title} ${job.description || ''}`.toLowerCase();
    const found = terms.filter(t => text.includes(t));
    return found.length > 0 ? found : ['javascript', 'react', 'webdev'];
  }
}

// ========== TECH ROLE SOURCING AGENTS ==========

export class StackOverflowSourcer {
  name = "Stack Overflow Developer Sourcer";
  platform = "StackOverflow";
  
  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[StackOverflowSourcer] Searching developers for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    
    try {
      // Stack Overflow public API - search top users
      const tags = this.extractTags(job);
      
      for (const tag of tags.slice(0, 3)) {
        // Use top-answerers endpoint which is more reliable
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
          
          candidates.push({
            name: user.display_name,
            title: `${tag} Developer`,
            skills: [tag, ...this.extractTags(job).slice(0, 3)],
            experience: `${user.reputation?.toLocaleString() || 0} reputation, ${item.post_count || 0} answers in ${tag}`,
            location: user.location || "Remote",
            contact: user.website_url || undefined,
            source: this.platform,
            sourceUrl: user.link || `https://stackoverflow.com/users/${user.user_id}`,
            matchScore: Math.min(95, 50 + Math.floor((user.reputation || 0) / 1000))
          });
        }
        
        await new Promise(r => setTimeout(r, 200));
      }
      
      const uniqueCandidates = this.deduplicateCandidates(candidates).slice(0, limit);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[StackOverflowSourcer] Error:`, error);
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
  
  private deduplicateCandidates(candidates: ScrapedCandidate[]): ScrapedCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = c.sourceUrl || c.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export class HackerNewsSourcer {
  name = "HackerNews Who's Hiring Sourcer";
  platform = "HackerNews";
  
  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[HackerNewsSourcer] Searching Who's Hiring threads for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    
    try {
      // Search HackerNews Algolia API for "Who is hiring" and "Who wants to be hired" posts
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
          
          // Extract candidate info from comment
          const extracted = this.extractFromComment(hit.comment_text, hit.author);
          if (extracted) {
            candidates.push({
              ...extracted,
              source: this.platform,
              sourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
              matchScore: 70
            });
          }
        }
        
        await new Promise(r => setTimeout(r, 200));
      }
      
      const uniqueCandidates = this.deduplicateCandidates(candidates).slice(0, limit);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[HackerNewsSourcer] Error:`, error);
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
  
  private extractFromComment(text: string, author: string): Partial<ScrapedCandidate> | null {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;
    
    // Look for common patterns in "Who wants to be hired" posts
    const locationMatch = text.match(/Location:\s*([^\n]+)/i) || text.match(/Based in\s*([^\n,]+)/i);
    const techMatch = text.match(/Technologies?:\s*([^\n]+)/i) || text.match(/Skills?:\s*([^\n]+)/i);
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    
    return {
      name: author,
      title: "Developer (HN)",
      skills: techMatch ? techMatch[1].split(/[,|\/]/).map(s => s.trim()).slice(0, 5) : ["Software Development"],
      experience: lines[0].substring(0, 200),
      location: locationMatch ? locationMatch[1].trim() : "Remote",
      contact: emailMatch ? emailMatch[1] : undefined
    };
  }
  
  private deduplicateCandidates(candidates: ScrapedCandidate[]): ScrapedCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = c.sourceUrl || c.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export class KaggleSourcer {
  name = "Kaggle Data Science Sourcer";
  platform = "Kaggle";
  
  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[KaggleSourcer] Searching data scientists for: ${job.title}`);
    
    // Check if this is a data science related role
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
      // Kaggle doesn't have a public user search API, but we can scrape competition leaderboards
      // For now, use DuckDuckGo to find Kaggle profiles
      const searchUrl = `https://html.duckduckgo.com/html/?q=site:kaggle.com+"data+scientist"+South+Africa`;
      
      console.log(`[KaggleSourcer] Searching Kaggle profiles...`);
      
      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      if (response.ok) {
        const html = await response.text();
        const extracted = await this.extractFromSearch(html);
        candidates.push(...extracted);
      }
      
      const uniqueCandidates = this.deduplicateCandidates(candidates).slice(0, limit);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[KaggleSourcer] Error:`, error);
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
  
  private async extractFromSearch(html: string): Promise<ScrapedCandidate[]> {
    try {
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 8000);
      
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
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
  
  private deduplicateCandidates(candidates: ScrapedCandidate[]): ScrapedCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// ========== BLUE COLLAR SOURCING AGENTS ==========

export class OLXSourcer {
  name = "OLX South Africa Sourcer";
  platform = "OLX";
  
  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[OLXSourcer] Searching blue collar candidates for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    let page: Page | null = null;
    
    try {
      const searchTerm = this.buildSearchTerm(job);
      const browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
      
      // OLX South Africa job seekers section
      const searchUrl = `https://www.olx.co.za/jobs/q-${encodeURIComponent(searchTerm)}`;
      
      console.log(`[OLXSourcer] Navigating to: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded",
        timeout: 15000 
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
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
      
      const uniqueCandidates = this.deduplicateCandidates(candidates).slice(0, limit);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[OLXSourcer] Error:`, error);
      return {
        platform: this.platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (page) await page.close();
    }
  }
  
  private buildSearchTerm(job: Job): string {
    const title = job.title.toLowerCase();
    
    // Blue collar job mappings
    const mappings: Record<string, string> = {
      'driver': 'driver cv',
      'welder': 'welder seeking work',
      'electrician': 'electrician available',
      'plumber': 'plumber cv',
      'mechanic': 'mechanic looking for work',
      'cleaner': 'cleaner available',
      'security': 'security guard cv',
      'construction': 'construction worker',
      'factory': 'factory worker cv',
      'warehouse': 'warehouse worker',
      'forklift': 'forklift operator',
      'truck': 'truck driver cv',
      'artisan': 'artisan cv',
      'technician': 'technician cv',
      'handyman': 'handyman services'
    };
    
    for (const [keyword, query] of Object.entries(mappings)) {
      if (title.includes(keyword)) {
        return query;
      }
    }
    
    return job.title.split(/\s+/).slice(0, 3).join(' ') + ' cv';
  }
  
  private deduplicateCandidates(candidates: ScrapedCandidate[]): ScrapedCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export class TradeForumSourcer {
  name = "Trade & Skills Forum Sourcer";
  platform = "TradeForums";
  
  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[TradeForumSourcer] Searching trade workers for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    
    try {
      // Search for trade workers on public forums and classifieds
      const searchTerms = this.buildSearchTerms(job);
      
      for (const term of searchTerms.slice(0, 2)) {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(term)}`;
        
        console.log(`[TradeForumSourcer] Searching: ${term}`);
        
        const response = await fetch(searchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        if (response.ok) {
          const html = await response.text();
          const extracted = await this.extractFromSearch(html, term);
          candidates.push(...extracted);
        }
        
        await new Promise(r => setTimeout(r, 500));
      }
      
      const uniqueCandidates = this.deduplicateCandidates(candidates).slice(0, limit);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[TradeForumSourcer] Error:`, error);
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
        model: "llama-3.3-70b-versatile",
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
  
  private deduplicateCandidates(candidates: ScrapedCandidate[]): ScrapedCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export class ExecutiveSourcer {
  name = "Executive Network Sourcer";
  platform = "Executive";
  
  // This would integrate with APIs like TheOfficialBoard, Interzoid, or BoardEx
  // For now, structured to accept API keys via environment variables
  
  private apiKey = process.env.EXECUTIVE_API_KEY;

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[ExecutiveSourcer] Searching C-suite candidates for: ${job.title}`);
    
    // Check if this is an executive-level position
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
    
    // Structure for API integration - would call TheOfficialBoard, Interzoid, etc.
    // Example integration point:
    try {
      // Placeholder for actual API call
      // const response = await fetch(`https://api.theofficialboard.com/search?title=${encodeURIComponent(job.title)}&country=ZA`, {
      //   headers: { 'Authorization': `Bearer ${this.apiKey}` }
      // });
      
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

export class CandidateAPISourcer {
  name = "Candidate API Sourcer";
  platform = "CandidateAPI";
  
  // Integrates with Pearch AI, DataVertex, or similar candidate databases
  private pearchApiKey = process.env.PEARCH_API_KEY;
  private datavertexApiKey = process.env.DATAVERTEX_API_KEY;

  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[CandidateAPISourcer] Searching candidates for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    
    // Try Pearch AI first (natural language candidate search)
    if (this.pearchApiKey) {
      try {
        const searchQuery = `${job.title} in South Africa with ${job.requirements || 'relevant experience'}`;
        console.log(`[CandidateAPISourcer] Pearch AI query: ${searchQuery}`);
        
        // Pearch AI integration point
        // const response = await fetch('https://api.pearch.io/search', {
        //   method: 'POST',
        //   headers: { 'Authorization': `Bearer ${this.pearchApiKey}`, 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ query: searchQuery, limit })
        // });
      } catch (error) {
        console.error(`[CandidateAPISourcer] Pearch AI error:`, error);
      }
    }
    
    // Try DataVertex as fallback
    if (this.datavertexApiKey && candidates.length === 0) {
      try {
        console.log(`[CandidateAPISourcer] Trying DataVertex API...`);
        
        // DataVertex integration point
        // const response = await fetch(`https://api.datavertex.com/candidates?title=${encodeURIComponent(job.title)}&location=ZA`, {
        //   headers: { 'Authorization': `Bearer ${this.datavertexApiKey}` }
        // });
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

// ========== EXECUTIVE & C-SUITE SOURCING AGENTS ==========

export class CompanyLeadershipSourcer {
  name = "Company Leadership Sourcer";
  platform = "CompanyLeadership";
  
  // Scrapes public company websites for executive bios from About/Leadership pages
  
  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[CompanyLeadershipSourcer] Searching executive bios for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    
    // Target companies with public leadership pages
    const targetCompanies = this.getTargetCompanies(job);
    
    let page: Page | null = null;
    
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
      
      for (const company of targetCompanies.slice(0, 5)) {
        try {
          // Common leadership page patterns
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
              
              await new Promise(r => setTimeout(r, 1000));
              
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
          
          await new Promise(r => setTimeout(r, 500));
        } catch (companyError) {
          console.log(`[CompanyLeadershipSourcer] Error with ${company.name}:`, companyError);
        }
      }
      
      const uniqueCandidates = this.deduplicateCandidates(candidates).slice(0, limit);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[CompanyLeadershipSourcer] Error:`, error);
      return {
        platform: this.platform,
        query: job.title,
        candidates: [],
        scrapedAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (page) await page.close();
    }
  }
  
  private getTargetCompanies(job: Job): { name: string; domain: string }[] {
    // South African companies with public leadership pages
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
        model: "llama-3.3-70b-versatile",
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
  
  private deduplicateCandidates(candidates: ScrapedCandidate[]): ScrapedCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export class NewsExecutiveSourcer {
  name = "News & Press Release Sourcer";
  platform = "ExecutiveNews";
  
  // Finds executive appointments from news and press releases
  
  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[NewsExecutiveSourcer] Searching executive news for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    
    try {
      // Use multiple free news sources
      const searchTerms = this.buildSearchTerms(job);
      
      for (const term of searchTerms.slice(0, 3)) {
        // DuckDuckGo HTML search (doesn't require API key)
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(term)}`;
        
        console.log(`[NewsExecutiveSourcer] Searching: ${term}`);
        
        try {
          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            const extractedCandidates = await this.extractFromNews(html, term);
            candidates.push(...extractedCandidates);
          }
        } catch (searchError) {
          console.log(`[NewsExecutiveSourcer] Search error for ${term}:`, searchError);
        }
        
        await new Promise(r => setTimeout(r, 500));
      }
      
      const uniqueCandidates = this.deduplicateCandidates(candidates).slice(0, limit);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial"
      };
    } catch (error) {
      console.error(`[NewsExecutiveSourcer] Error:`, error);
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
      // Extract text content from HTML
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 10000);
      
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
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
  
  private deduplicateCandidates(candidates: ScrapedCandidate[]): ScrapedCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export class CIPCDirectorSourcer {
  name = "CIPC Director Sourcer";
  platform = "CIPC";
  
  // Sources South African company directors from public records
  // CIPC (Companies and Intellectual Property Commission) maintains public director records
  
  async search(job: Job, limit: number = 10): Promise<ScraperResult> {
    console.log(`[CIPCDirectorSourcer] Searching CIPC director records for: ${job.title}`);
    
    const candidates: ScrapedCandidate[] = [];
    
    try {
      // CIPC doesn't have a public API, but we can search via their web interface
      // For now, we'll use alternative public data sources
      
      // Check if this is a director/executive level position
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
      
      // Use JSE listed company data (public information)
      const jseCompanies = await this.searchJSEDirectors(job);
      candidates.push(...jseCompanies);
      
      const uniqueCandidates = this.deduplicateCandidates(candidates).slice(0, limit);
      
      return {
        platform: this.platform,
        query: job.title,
        candidates: uniqueCandidates,
        scrapedAt: new Date(),
        status: uniqueCandidates.length > 0 ? "success" : "partial",
        error: uniqueCandidates.length === 0 ? "Limited public director data available" : undefined
      };
    } catch (error) {
      console.error(`[CIPCDirectorSourcer] Error:`, error);
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
  
  private async searchJSEDirectors(job: Job): Promise<ScrapedCandidate[]> {
    // JSE listed companies publish director information publicly
    // This is a simplified implementation - real version would scrape SENS announcements
    
    try {
      // Search for director announcements
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent("site:jse.co.za director appointed")}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) return [];
      
      const html = await response.text();
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 8000);
      
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
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
  
  private deduplicateCandidates(candidates: ScrapedCandidate[]): ScrapedCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export class ScraperOrchestrator {
  private scrapers = [
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
