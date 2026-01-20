import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Going to login page...');
  await page.goto('http://localhost:5000/login');
  await page.waitForTimeout(2000);
  
  console.log('Filling form...');
  await page.locator('input#email').fill('admin@fleetlogix.co.za');
  await page.locator('input[type="password"]').fill('fleet123');
  
  console.log('Submitting...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  
  const url = page.url();
  const token = await page.evaluate(() => localStorage.getItem('ahc_auth_token'));
  
  console.log('Final URL:', url);
  console.log('Token:', token ? 'FOUND ✅' : 'NOT FOUND ❌');
  
  if (token) {
    console.log('\nGoing to Fleet Logix...');
    await page.goto('http://localhost:5000/fleetlogix');
    await page.waitForTimeout(3000);
    
    const hasData = await page.locator('text=Drivers, text=Vehicles').count();
    console.log('Fleet Logix loaded:', hasData > 0 ? 'YES ✅' : 'NO ❌');
  }
  
  await browser.close();
})();
