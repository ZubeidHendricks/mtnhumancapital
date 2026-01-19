import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for all requests
  page.on('request', request => {
    if (request.url().includes('/auth/')) {
      console.log('→', request.method(), request.url());
      console.log('   Body:', request.postData());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/auth/')) {
      console.log('←', response.status(), response.url());
    }
  });
  
  await page.goto('http://localhost:5000/login');
  await page.waitForTimeout(2000);
  
  // Change input type
  await page.evaluate(() => {
    const input = document.querySelector('input[type="email"]') as HTMLInputElement;
    if (input) {
      input.type = 'text';
      input.value = 'fleetadmin';
    }
  });
  
  await page.fill('input[type="password"]', 'fleet123');
  await page.waitForTimeout(1000);
  
  console.log('Clicking submit...');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(10000);
  console.log('Final URL:', page.url());
  
  const token = await page.evaluate(() => localStorage.getItem('ahc_auth_token'));
  console.log('Token:', token ? 'FOUND' : 'NOT FOUND');
  
  await browser.close();
})();
