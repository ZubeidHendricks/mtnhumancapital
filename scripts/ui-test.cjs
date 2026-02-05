const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5000';

const pages = [
  { path: '/', name: 'home' },
  { path: '/hr-dashboard', name: 'hr-dashboard' },
  { path: '/recruitment-dashboard', name: 'recruitment-dashboard' },
  { path: '/recruitment-agent', name: 'recruitment-agent' },
  { path: '/executive-dashboard-custom', name: 'executive-dashboard' },
  { path: '/workforce-intelligence', name: 'workforce-intelligence' },
  { path: '/pipeline-board', name: 'pipeline-board' },
  { path: '/kpi-management', name: 'kpi-management' },
  { path: '/interview-console', name: 'interview-console' },
];

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  // Set light theme
  await context.addInitScript(() => {
    localStorage.setItem('ahc-theme', 'light');
  });
  
  const page = await context.newPage();
  
  for (const pageInfo of pages) {
    try {
      console.log(`Capturing: ${pageInfo.name}`);
      await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: `screenshots/${pageInfo.name}-light.png`,
        fullPage: false 
      });
      console.log(`  ✓ Captured ${pageInfo.name}`);
    } catch (error) {
      console.log(`  ✗ Failed ${pageInfo.name}: ${error.message}`);
    }
  }
  
  await browser.close();
  console.log('\nDone! Screenshots saved to ./screenshots/');
}

captureScreenshots().catch(console.error);
