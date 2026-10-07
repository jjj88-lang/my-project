// Pre-Med Ledger — storage layer.
// Backend 1: the artifact's shared database (claude.use('db')) when the page runs as a
//            claude.ai artifact and the viewer is signed in. Data follows you across devices.
// Backend 2: this browser's localStorage, when opened as a plain file or GitHub Pages site.
// Either way the app talks to one API: Store.all(col), Store.get(col,id), Store.save(col,doc),
// Store.remove(col,id), Store.settings / Store.saveSettings(), Store.subscribe(fn).
(function () {
  'use strict';
  const CFG = window.PMT_CONFIG;
  const COLLECTIONS = ['activities', 'logs', 'courses', 'awards', 'pubs', 'letters', 'journal', 'resume', 'essays', 'certs'];
  const LS_KEY = 'pmt:v' + CFG.dataVersion;
  const SETTINGS_PATH = { col: 'meta', id: 'settings' };

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function defaultSettings() {
    return {
      countFrom: CFG.student.hsGraduation,
      goals: Object.assign({}, CFG.defaultGoals),
      tradition: Object.assign({}, CFG.tradition),
      profile: Object.assign({}, CFG.student, { hsSummary: '', languages: '', certifications: '', interests: '', mcatDate: '', mcatScore: '', gapYear: false }),
      milestonesDone: {},
      seededAt: '',
      updatedAt: '',
    };
  }

  const Store = {
    backend: 'none',        // 'db' | 'local' | 'none'
    ready: false,
    data: {},               // col -> Map(id -> doc)
    settings: defaultSettings(),
    _subs: [],
    _db: null,
    _unsubs: [],
    _pending: 0,
    status: { text: 'Starting…', kind: 'muted' },

    subscribe(fn) { this._subs.push(fn); return () => { this._subs = this._subs.filter(f => f !== fn); }; },
    _emit() { for (const f of this._subs) { try { f(); } catch (e) { console.error(e); } } },

    all(col) { return Array.from((this.data[col] || new Map()).values()); },
    get(col, id) { return (this.data[col] || new Map()).get(id) || null; },
    count(col) { return (this.data[col] || new Map()).size; },
    isEmpty() { return COLLECTIONS.every(c => this.count(c) === 0); },

    newId: uid,

    async init() {
      for (const c of COLLECTIONS) this.data[c] = new Map();
      this.settings = defaultSettings();
      let db = null;
      try {
        if (window.claude && typeof window.claude.use === 'function') db = await window.claude.use('db');
      } catch (e) { db = null; }
      if (db) {
        this._db = db;
        this.backend = 'db';
        this.status = { text: 'Synced to your Claude artifact database', kind: 'good' };
        await this._initDb();
      } else {
        this.backend = 'local';
        this.status = { text: 'Saved in this browser only (export a backup regularly)', kind: 'warn' };
        this._initLocal();
      }
      this.ready = true;
      this._emit();
    },

    // ---------- db backend ----------
    _initDb() {
      const db = this._db;
      const self = this;
      const firstLoads = [];
      for (const col of COLLECTIONS) {
        firstLoads.push(new Promise(resolve => {
          let first = true;
          const unsub = db.collection(col).onSnapshot(snap => {
            const m = new Map();
            for (const d of snap.docs) { const body = d.data(); if (body) m.set(d.id, Object.assign({ id: d.id }, body)); }
            self.data[col] = m;
            if (first) { first = false; resolve(); }
            self._emit();
          }, err => {
            console.error('db subscription error', col, err);
            self.status = { text: 'Database connection lost (' + (err && err.code || 'error') + '). Reload to reconnect.', kind: 'bad' };
            if (first) { first = false; resolve(); }
            self._emit();
          });
          self._unsubs.push(unsub);
        }));
      }
      firstLoads.push(new Promise(resolve => {
        let first = true;
        const unsub = db.doc(SETTINGS_PATH.col + '/' + SETTINGS_PATH.id).onSnapshot(snap => {
          if (snap.exists) self.settings = mergeSettings(defaultSettings(), snap.data());
          if (first) { first = false; resolve(); }
          self._emit();
        }, err => { console.error('settings subscription error', err); if (first) { first = false; resolve(); } });
        self._unsubs.push(unsub);
      }));
      // Wait for first snapshots so the first full render has data, but never hang.
      return Promise.race([Promise.all(firstLoads), new Promise(r => setTimeout(r, 6000))]);
    },

    // ---------- local backend ----------
    _initLocal() {
      let raw = null;
      try { raw = localStorage.getItem(LS_KEY); } catch (e) { raw = null; }
      if (raw) {
        try {
          const obj = JSON.parse(raw);
          this._loadObject(obj);
          return;
        } catch (e) { console.error('Could not parse saved data', e); }
      }
      if (window.PMT_SEED) {
        this._loadObject(window.PMT_SEED);
        this.settings.seededAt = new Date().toISOString();
        this._persistLocal();
      }
    },
    _loadObject(obj) {
      for (const col of COLLECTIONS) {
        const m = new Map();
        for (const doc of (obj[col] || [])) if (doc && doc.id) m.set(doc.id, doc);
        this.data[col] = m;
      }
      this.settings = mergeSettings(defaultSettings(), obj.settings || {});
    },
    _persistLocal() {
      try { localStorage.setItem(LS_KEY, JSON.stringify(this.toObject())); }
      catch (e) { console.error('Could not save', e); this.status = { text: 'Could not save to this browser (storage blocked or full).', kind: 'bad' }; }
    },

    // ---------- writes ----------
    async save(col, doc) {
      if (!doc.id) doc.id = uid();
      doc.updatedAt = new Date().toISOString();
      if (!doc.createdAt) doc.createdAt = doc.updatedAt;
      const clean = JSON.parse(JSON.stringify(doc));
      this.data[col].set(clean.id, clean);
      this._emit();
      if (this.backend === 'db') {
        const body = Object.assign({}, clean); delete body.id;
        await this._dbWrite(() => this._db.collection(col).doc(clean.id).set(body));
      } else {
        this._persistLocal();
      }
      return clean;
    },
    async remove(col, id) {
      this.data[col].delete(id);
      this._emit();
      if (this.backend === 'db') await this._dbWrite(() => this._db.collection(col).doc(id).delete());
      else this._persistLocal();
    },
    async saveSettings(patch) {
      this.settings = mergeSettings(this.settings, patch || {});
      this.settings.updatedAt = new Date().toISOString();
      this._emit();
      if (this.backend === 'db') {
        const body = JSON.parse(JSON.stringify(this.settings));
        await this._dbWrite(() => this._db.doc(SETTINGS_PATH.col + '/' + SETTINGS_PATH.id).set(body));
      } else {
        this._persistLocal();
      }
    },
    async _dbWrite(fn) {
      this._pending += 1;
      try {
        await fn();
        this._writeOk();
      } catch (e) {
        if (e && e.code === 'unavailable') {
          await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
          try { await fn(); this._writeOk(); } catch (e2) { this._writeFailed(e2); }
        } else {
          this._writeFailed(e);
        }
      } finally {
        this._pending -= 1;
      }
    },
    _writeOk() {
      if (this.status.kind === 'bad') { this.status = { text: 'Synced to your Claude artifact database', kind: 'good' }; this._emit(); }
    },
    _writeFailed(e) {
      console.error('write failed', e);
      const code = e && e.code;
      if (code === 'quota_exceeded') this.status = { text: 'Database full: delete old entries or export and trim.', kind: 'bad' };
      else if (code === 'invalid_argument') this.status = { text: 'This account can only read this tracker. Changes are not saved.', kind: 'bad' };
      else this.status = { text: 'A save failed (' + (code || 'error') + '). Check your connection and try again.', kind: 'bad' };
      this._emit();
    },

    // ---------- import / export ----------
    toObject() {
      const o = { app: CFG.appName, version: CFG.dataVersion, exportedAt: new Date().toISOString(), settings: this.settings };
      for (const col of COLLECTIONS) o[col] = this.all(col);
      return o;
    },
    // mode: 'merge' keeps existing docs and adds/overwrites by id; 'replace' clears first.
    async importObject(obj, mode) {
      if (!obj || typeof obj !== 'object') throw new Error('Not a Pre-Med Ledger backup file.');
      const hasAny = COLLECTIONS.some(c => Array.isArray(obj[c]));
      if (!hasAny && !obj.settings) throw new Error('Not a Pre-Med Ledger backup file.');
      if (mode === 'replace') {
        for (const col of COLLECTIONS) for (const id of Array.from(this.data[col].keys())) await this.remove(col, id);
        this.settings = mergeSettings(defaultSettings(), obj.settings || {});
        await this.saveSettings({});
      }
      let n = 0;
      for (const col of COLLECTIONS) {
        for (const doc of (obj[col] || [])) {
          if (!doc || typeof doc !== 'object') continue;
          if (!doc.id) doc.id = uid();
          await this.save(col, doc);
          n += 1;
        }
      }
      if (obj.settings && mode !== 'replace') await this.saveSettings(obj.settings);
      return n;
    },
    async loadSeed() {
      if (!window.PMT_SEED) return 0;
      const n = await this.importObject(window.PMT_SEED, 'merge');
      await this.saveSettings({ seededAt: new Date().toISOString() });
      return n;
    },
    async clearAll() {
      for (const col of COLLECTIONS) for (const id of Array.from(this.data[col].keys())) await this.remove(col, id);
      this.settings = defaultSettings();
      await this.saveSettings({});
    },
  };

  // Fixed-shape settings objects merge one level deep so a partial patch keeps the other keys;
  // map-like objects (milestonesDone) and arrays replace wholesale so keys can be removed.
  const DEEP_MERGE = new Set(['goals', 'tradition', 'profile']);
  function mergeSettings(base, patch) {
    const out = Object.assign({}, base);
    for (const k of Object.keys(patch || {})) {
      const v = patch[k];
      if (DEEP_MERGE.has(k) && v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') out[k] = Object.assign({}, base[k], v);
      else out[k] = v;
    }
    return out;
  }

  Store.COLLECTIONS = COLLECTIONS;
  window.PMT_STORE = Store;
})();
