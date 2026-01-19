import { chromium } from 'playwright';

(async () => {
  console.log('🎨 Testing Theme Toggle Functionality...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to FLEET LOGIX
    console.log('1. Loading page...');
    await page.goto('http://localhost:5000?tenant=fleetlogix', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Check initial theme (should be dark by default)
    const htmlClass = await page.locator('html').getAttribute('class');
    console.log(`   Initial theme class: "${htmlClass}"`);
    
    // Take screenshot of dark mode
    await page.screenshot({ path: 'screenshot-dark-mode.png', fullPage: false });
    console.log('   ✅ Screenshot saved: screenshot-dark-mode.png');
    
    // Find and click theme toggle button
    console.log('\n2. Looking for theme toggle button...');
    
    // Try to find the button with sun/moon icon
    const themeButtons = await page.$$('button');
    console.log(`   Found ${themeButtons.length} buttons total`);
    
    // Look for a button that might be the theme toggle
    let toggleButton = null;
    for (const button of themeButtons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const innerText = await button.innerText().catch(() => '');
      
      // Check if it's the theme toggle (usually has aria-label or contains sun/moon)
      if (ariaLabel?.toLowerCase().includes('theme') || 
          innerText.toLowerCase().includes('theme') ||
          innerText.toLowerCase().includes('light') ||
          innerText.toLowerCase().includes('dark')) {
        console.log(`   Found potential toggle: aria-label="${ariaLabel}", text="${innerText}"`);
        toggleButton = button;
        break;
      }
    }
    
    // Also try finding by SVG (sun/moon icons)
    if (!toggleButton) {
      console.log('   Trying to find by SVG icons...');
      // Look for button containing SVG
      const svgButtons = await page.$$('button:has(svg)');
      console.log(`   Found ${svgButtons.length} buttons with SVG`);
      
      // The theme toggle should be near the top right, try the ones that are visible
      for (const btn of svgButtons) {
        const isVisible = await btn.isVisible().catch(() => false);
        if (isVisible) {
          const box = await btn.boundingBox();
          if (box && box.x > 1000) { // Top right area
            toggleButton = btn;
            console.log(`   Found SVG button in top-right area (x: ${box.x})`);
            break;
          }
        }
      }
    }
    
    if (toggleButton) {
      console.log('\n3. Clicking theme toggle...');
      await toggleButton.click();
      await page.waitForTimeout(1000);
      
      // Check if theme changed
      const newHtmlClass = await page.locator('html').getAttribute('class');
      console.log(`   New theme class: "${newHtmlClass}"`);
      
      if (newHtmlClass !== htmlClass) {
        console.log('   ✅ Theme class CHANGED!');
      } else {
        console.log('   ⚠️  Theme class did NOT change');
      }
      
      // Take screenshot after toggle
      await page.screenshot({ path: 'screenshot-after-toggle.png', fullPage: false });
      console.log('   ✅ Screenshot saved: screenshot-after-toggle.png');
      
      // Check if dropdown appeared (theme selector)
      await page.waitForTimeout(500);
      const dropdownVisible = await page.locator('[role="menu"]').isVisible().catch(() => false);
      
      if (dropdownVisible) {
        console.log('\n4. Theme dropdown menu appeared!');
        await page.screenshot({ path: 'screenshot-theme-menu.png', fullPage: false });
        console.log('   ✅ Screenshot saved: screenshot-theme-menu.png');
        
        // Try clicking "Light" option
        const lightOption = page.locator('text=Light').first();
        if (await lightOption.isVisible().catch(() => false)) {
          console.log('   Clicking "Light" option...');
          await lightOption.click();
          await page.waitForTimeout(1000);
          
          const finalClass = await page.locator('html').getAttribute('class');
          console.log(`   Final theme class: "${finalClass}"`);
          
          if (finalClass?.includes('light')) {
            console.log('   ✅ SUCCESS: Changed to light mode!');
          } else {
            console.log('   ⚠️  Theme class does not include "light"');
          }
          
          await page.screenshot({ path: 'screenshot-light-mode.png', fullPage: false });
          console.log('   ✅ Screenshot saved: screenshot-light-mode.png');
        }
      }
      
    } else {
      console.log('   ❌ Could not find theme toggle button');
    }
    
    console.log('\n📊 Summary:');
    console.log('   - screenshot-dark-mode.png: Initial state');
    console.log('   - screenshot-after-toggle.png: After clicking toggle');
    console.log('   - screenshot-theme-menu.png: Theme selector menu (if appeared)');
    console.log('   - screenshot-light-mode.png: After selecting light mode (if successful)');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'screenshot-error.png' });
  } finally {
    await browser.close();
  }
})();
