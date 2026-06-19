const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://kryork-neptsgwmx-yedos-projects.vercel.app', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'site-screenshot.png' });
  await browser.close();
})();
