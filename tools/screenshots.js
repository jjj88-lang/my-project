// Usage: PLAYWRIGHT_MODULE=/path/to/playwright node tools/screenshots.js [projectDir] [outDir]  (needs Chromium; set CHROME_PATH if not at the default)
// Load the app from a local static server in headless Chromium, capture console errors and screenshots.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || path.join(__dirname, '..');
const OUT = process.argv[3] || path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errors = [];
  const views = (process.env.VIEWS || 'dashboard,log,activities,academics,research,awards,resume,journal,letters,timeline,settings').split(',');
  const configs = [
    { name: 'desktop-light', viewport: { width: 1280, height: 900 }, colorScheme: 'light' },
    { name: 'phone-dark', viewport: { width: 390, height: 844 }, colorScheme: 'dark' },
  ];
  for (const cfg of configs) {
    const ctx = await browser.newContext({ viewport: cfg.viewport, colorScheme: cfg.colorScheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(cfg.name + ' console.' + m.type() + ': ' + m.text()); });
    page.on('pageerror', e => errors.push(cfg.name + ' pageerror: ' + e.message));
    page.on('requestfailed', r => errors.push(cfg.name + ' requestfailed: ' + r.url()));
    await page.goto(`http://127.0.0.1:${port}/#dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    for (const v of views) {
      await page.evaluate(k => window.PMT_UI.navigate(k), v);
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 ? (document.documentElement.scrollWidth + '>' + document.documentElement.clientWidth) : '');
      if (overflow) errors.push(cfg.name + ' horizontal overflow on ' + v + ': ' + overflow);
      await page.screenshot({ path: path.join(OUT, `${cfg.name}-${v}.png`), fullPage: true });
    }
    // open the log modal + activity detail for a look
    await page.evaluate(() => window.PMT_UI.navigate('dashboard'));
    await page.evaluate(() => window.PMT_VIEWS.openLogModal());
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `${cfg.name}-modal-log.png`), fullPage: false });
    await page.evaluate(() => window.PMT_UI.closeModal());
    const firstAct = await page.evaluate(() => (window.PMT_STORE.all('activities')[0] || {}).id);
    if (firstAct) {
      await page.evaluate(id => window.PMT_UI.navigate('activities', { id }), firstAct);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(OUT, `${cfg.name}-activity-detail.png`), fullPage: true });
    }
    await page.evaluate(() => window.PMT_VIEWS.openActivityModal());
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `${cfg.name}-modal-activity.png`), fullPage: false });
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(errors.length ? 'ISSUES:\n' + errors.join('\n') : 'No console errors, page errors, failed requests or horizontal overflow.');
})().catch(e => { console.error(e); process.exit(1); });
