// Usage: PLAYWRIGHT_MODULE=/path/to/playwright node tools/db-flow-test.js  (exercises the artifact-database code path with a fake window.claude)
// Exercises the artifact-database code path with a fake window.claude.use('db') in headless Chromium.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  fs.readFile(path.join(ROOT, p), (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'text/plain' }); res.end(data); });
});

const FAKE = `
(function () {
  const docs = new Map();            // path -> body
  const colListeners = new Map();    // collection path -> Set(fn)
  const docListeners = new Map();    // doc path -> Set(fn)
  const writes = [];
  window.__fake = { docs, writes, seeded: false };
  function snapOf(path) { const body = docs.get(path); return { id: path.split('/').pop(), exists: !!body, data: () => body ? Object.freeze(JSON.parse(JSON.stringify(body))) : undefined, metadata: { fromCache: false, hasPendingWrites: false } }; }
  function colSnap(col) { const list = []; for (const [p, b] of docs) { const segs = p.split('/'); if (segs.slice(0, -1).join('/') === col) list.push(snapOf(p)); } list.sort((a, b) => a.id.localeCompare(b.id)); return { docs: list, size: list.length, empty: !list.length, docChanges: () => list.map(d => ({ type: 'added', doc: d, oldIndex: -1, newIndex: 0 })), metadata: { fromCache: false, hasPendingWrites: false } }; }
  function notify(path) { const col = path.split('/').slice(0, -1).join('/'); setTimeout(() => { (colListeners.get(col) || []).forEach(fn => fn(colSnap(col))); (docListeners.get(path) || []).forEach(fn => fn(snapOf(path))); }, 0); }
  function docRef(path) {
    if (path.split('/').length % 2 !== 0) throw new TypeError('doc path must have an even number of segments: ' + path);
    return {
      id: path.split('/').pop(), path,
      get: async () => snapOf(path),
      set: async (data) => { if (data === null || typeof data !== 'object' || Array.isArray(data)) throw { code: 'invalid_argument', message: 'body' }; if (JSON.stringify(data).includes('undefined')) {} docs.set(path, JSON.parse(JSON.stringify(data))); writes.push(['set', path]); notify(path); },
      update: async (data) => { if (!docs.has(path)) throw { code: 'invalid_argument', message: 'missing' }; docs.set(path, Object.assign({}, docs.get(path), data)); writes.push(['update', path]); notify(path); },
      delete: async () => { docs.delete(path); writes.push(['delete', path]); notify(path); },
      onSnapshot: (next, err) => { if (!docListeners.has(path)) docListeners.set(path, new Set()); docListeners.get(path).add(next); setTimeout(() => next(snapOf(path)), 0); return () => docListeners.get(path).delete(next); },
      collection: (sub) => colRef(path + '/' + sub),
    };
  }
  function colRef(col) {
    if (col.split('/').length % 2 !== 1) throw new TypeError('collection path must have an odd number of segments: ' + col);
    const q = {
      path: col,
      doc: (id) => docRef(col + '/' + (id || ('gen' + Math.random().toString(36).slice(2, 10)))),
      add: async (data) => { const r = docRef(col + '/gen' + Math.random().toString(36).slice(2, 10)); await r.set(data); return r; },
      where: () => q, orderBy: () => q, limit: () => q,
      get: async () => colSnap(col),
      onSnapshot: (next, err) => { if (!colListeners.has(col)) colListeners.set(col, new Set()); colListeners.get(col).add(next); setTimeout(() => next(colSnap(col)), 0); return () => colListeners.get(col).delete(next); },
    };
    return q;
  }
  const db = Object.freeze({ doc: docRef, collection: colRef });
  const user = Object.freeze({ id: async () => 'u_test', isOwner: async () => true, canEdit: async () => true, can: async () => true, me: async () => ({ id: 'u_test', name: 'Justin', avatarUrl: '', color: '#000', email: null, isOwner: true, canEdit: true }), profiles: async () => ({}) });
  const downloads = Object.freeze({ save: async ({ filename, data }) => { window.__fake.lastDownload = { filename, size: data.length }; return { status: 'saved' }; } });
  window.claude = Object.freeze({ use: (name) => new Promise(resolve => setTimeout(() => {
    if (name === 'db') {
      if (!window.__fake.seeded && window.PMT_SEED) { const s = window.PMT_SEED; for (const col of ['activities','logs','courses','awards','pubs','letters','journal','resume']) for (const d of (s[col]||[])) { const b = Object.assign({}, d); delete b.id; docs.set(col + '/' + d.id, b); } docs.set('meta/settings', JSON.parse(JSON.stringify(s.settings))); window.__fake.seeded = true; }
      resolve(db);
    } else if (name === 'user') resolve(user); else if (name === 'downloads') resolve(downloads); else resolve(null);
  }, 250)) });
})();
`;

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(FAKE);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const results = [];
  const check = (name, ok, extra) => results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''));

  await page.goto(`http://127.0.0.1:${port}/#dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const backend = await page.evaluate(() => window.PMT_STORE.backend);
  check('backend is db', backend === 'db', backend);
  const counts = await page.evaluate(() => ({ a: window.PMT_STORE.count('activities'), l: window.PMT_STORE.count('logs'), c: window.PMT_STORE.count('courses') }));
  check('seeded data loaded from db', counts.a === 9 && counts.l === 17 && counts.c === 16, JSON.stringify(counts));
  const hero = await page.textContent('.hero-num');
  check('hero renders', /\d/.test(hero || ''), hero);
  const settingsOk = await page.evaluate(() => window.PMT_STORE.settings.countFrom === '2026-05-23' && window.PMT_STORE.settings.profile.name === 'Justin Jeon');
  check('settings loaded from meta/settings', settingsOk);
  const banner = await page.evaluate(() => document.getElementById('banner').hidden);
  check('no local-only banner in db mode', banner === true);

  // Log hours through the real modal UI
  await page.click('#quick-log');
  await page.waitForSelector('.modal');
  await page.selectOption("[id$='-activityId']", 'act-patch');
  await page.fill("[id$='-hours']", '1.5');
  await page.fill("[id$='-note']", 'db test entry');
  await page.click('.modal-foot .btn-primary');
  await page.waitForTimeout(400);
  const logWrite = await page.evaluate(() => window.__fake.writes.filter(w => w[0] === 'set' && w[1].startsWith('logs/')).length);
  check('log entry written to db via set', logWrite === 1, 'writes=' + logWrite);
  const newLog = await page.evaluate(() => { const l = window.PMT_STORE.all('logs').find(x => x.note === 'db test entry'); return l ? { hours: l.hours, hasId: !!l.id, idInBody: 'id' in (window.__fake.docs.get('logs/' + l.id) || {}) } : null; });
  check('new log present in store with numeric hours and id stripped from body', newLog && newLog.hours === 1.5 && newLog.hasId && newLog.idInBody === false, JSON.stringify(newLog));
  const modalGone = await page.evaluate(() => !document.querySelector('.modal'));
  check('modal closed after save', modalGone);

  // 'Save & add another' must leave a fresh modal open
  await page.click('#quick-log');
  await page.waitForSelector('.modal');
  await page.selectOption("[id$='-activityId']", 'act-kasa');
  await page.fill("[id$='-hours']", '0.5');
  await page.click('text=Save & add another');
  await page.waitForTimeout(400);
  const again = await page.evaluate(() => ({ modal: !!document.querySelector('.modal'), sel: (document.querySelector(".modal [id$='-activityId']") || {}).value }));
  check('save & add another keeps a new modal open with the activity preselected', again.modal && again.sel === 'act-kasa', JSON.stringify(again));
  await page.evaluate(() => window.PMT_UI.closeModal());

  // Detail page of an activity excluded from AMCAS renders
  await page.evaluate(async () => { const a = window.PMT_STORE.get('activities', 'act-kasa'); await window.PMT_STORE.save('activities', Object.assign({}, a, { includeAmcas: false })); });
  await page.evaluate(() => window.PMT_UI.navigate('activities', { id: 'act-kasa' }));
  await page.waitForTimeout(300);
  const detailOk = await page.evaluate(() => !document.querySelector('#main .empty code') && !!document.querySelector('#main h1'));
  check('activity detail renders when excluded from AMCAS', detailOk);

  // Settings: typing in one section survives saving another
  await page.evaluate(() => window.PMT_UI.navigate('settings'));
  await page.waitForTimeout(300);
  await page.fill("[id$='-phone']", '607-555-0199');
  await page.fill("[id$='-shadowing']", '90');
  await page.click('text=Save goals');
  await page.waitForTimeout(500);
  const phoneKept = await page.evaluate(() => document.querySelector("[id$='-phone']").value);
  check('unsaved profile edit survives saving goals', phoneKept === '607-555-0199', phoneKept);

  // Settings save → meta/settings set
  await page.evaluate(() => window.PMT_UI.navigate('settings'));
  await page.waitForTimeout(300);
  await page.fill("[id$='-clinical']", '350');
  await page.click('text=Save goals');
  await page.waitForTimeout(400);
  const goalsWrite = await page.evaluate(() => ({ w: window.__fake.writes.filter(x => x[1] === 'meta/settings').length, v: window.__fake.docs.get('meta/settings').goals.clinical, keptCount: window.__fake.docs.get('meta/settings').countFrom }));
  check('goals saved to meta/settings and other settings kept', goalsWrite.w >= 1 && goalsWrite.v === 350 && goalsWrite.keptCount === '2026-05-23', JSON.stringify(goalsWrite));

  // Delete an entry via in-page confirm
  await page.evaluate(() => window.PMT_UI.navigate('log'));
  await page.waitForTimeout(300);
  await page.fill('input[type=search]', 'db test entry');
  await page.waitForTimeout(200);
  await page.click('.list-item button[title=Delete]');
  await page.waitForSelector('.modal');
  await page.click('.modal-foot .btn-danger');
  await page.waitForTimeout(400);
  const del = await page.evaluate(() => ({ deletes: window.__fake.writes.filter(x => x[0] === 'delete').length, still: !!window.PMT_STORE.all('logs').find(x => x.note === 'db test entry') }));
  check('delete removed the doc', del.deletes === 1 && !del.still, JSON.stringify(del));

  // External write (another device) arrives via snapshot
  await page.evaluate(() => { window.__fake.docs.set('awards/ext-1', { name: 'External award', org: 'Test', level: 'Local', date: '2026-10-01', amount: 0, selectivity: '', description: '' }); const col = 'awards'; });
  await page.evaluate(() => window.PMT_STORE._db.collection('awards').doc('ext-1').update({ name: 'External award' }).catch(() => {}));
  await page.waitForTimeout(300);
  const ext = await page.evaluate(() => !!window.PMT_STORE.get('awards', 'ext-1'));
  check('snapshot from another writer appears in store', ext);

  // Export uses downloads capability
  await page.evaluate(() => window.PMT_UI.exportBackup());
  await page.waitForTimeout(500);
  const dl = await page.evaluate(() => window.__fake.lastDownload);
  check('export used downloads.save', dl && /premed-ledger-\d{4}-\d{2}-\d{2}\.json/.test(dl.filename) && dl.size > 1000, JSON.stringify(dl));

  // Every view renders in db mode
  for (const v of ['dashboard', 'activities', 'academics', 'research', 'awards', 'resume', 'journal', 'letters', 'timeline', 'settings']) {
    await page.evaluate(k => window.PMT_UI.navigate(k), v); await page.waitForTimeout(150);
    const broken = await page.evaluate(() => !!document.querySelector('#main .empty code'));
    check('view ' + v + ' renders', !broken);
  }
  // Path grammar: ensure no odd/even mistakes were thrown
  check('no console/page errors', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exit(1);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
