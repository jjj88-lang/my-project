// Pre-Med Ledger — app shell: DOM helpers, navigation, modals, forms, import/export.
(function () {
  'use strict';
  const CFG = window.PMT_CONFIG, S = window.PMT_STORE, C = window.PMT_CALC;

  // ---------- DOM helpers ----------
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k === 'text') el.textContent = v;
        else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'tabIndex' || k === 'readOnly') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { for (const c of child) append(el, c); return; }
    if (child instanceof Node) { el.appendChild(child); return; }
    el.appendChild(document.createTextNode(String(child)));
  }
  function icon(name, cls) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }
  function btn(label, o) {
    o = o || {};
    const cls = ['btn'];
    if (o.kind) cls.push('btn-' + o.kind);
    if (o.size) cls.push('btn-' + o.size);
    if (o.block) cls.push('btn-block');
    if (!label && o.icon) cls.push('btn-icon');
    if (o.class) cls.push(o.class);
    const b = h('button', { class: cls.join(' '), type: 'button', onClick: o.onClick, title: o.title, 'aria-label': o.title && !label ? o.title : undefined, disabled: o.disabled });
    if (o.icon) b.appendChild(icon(o.icon));
    if (label) b.appendChild(h('span', null, label));
    return b;
  }
  function chip(text, kind, o) {
    o = o || {};
    const c = h('span', { class: 'chip' + (kind ? ' ' + kind : '') });
    if (o.color) c.appendChild(h('i', { class: 'dot', style: { background: o.color } }));
    if (o.icon) c.appendChild(icon(o.icon, 'ic-sm'));
    c.appendChild(document.createTextNode(text));
    return c;
  }
  function pageHead(title, sub, actions) {
    return h('div', { class: 'page-head' },
      h('div', null, h('h1', null, title), sub ? h('p', { class: 'sub' }, sub) : null),
      actions && actions.length ? h('div', { class: 'btn-row' }, actions) : null);
  }
  function section(title, actions) {
    const s = h('div', { class: 'section' });
    if (title || (actions && actions.length)) s.appendChild(h('div', { class: 'section-head' }, h('h2', null, title), actions && actions.length ? h('div', { class: 'btn-row' }, actions) : null));
    for (let i = 2; i < arguments.length; i++) append(s, arguments[i]);
    return s;
  }
  function tile(o) {
    const t = h('div', { class: 'tile' + (o.onClick ? ' clickable' : ''), onClick: o.onClick, tabIndex: o.onClick ? 0 : undefined, role: o.onClick ? 'button' : undefined });
    t.appendChild(h('div', { class: 'l' }, o.color ? h('i', { class: 'dot', style: { background: o.color } }) : null, o.label));
    t.appendChild(h('div', { class: 'v' }, o.value, o.unit ? h('small', null, o.unit) : null));
    if (o.meter) t.appendChild(window.PMT_CHARTS.meter(o.meter.value, o.meter.goal, { warn: o.meter.warn }));
    if (o.detail) t.appendChild(h('div', { class: 'd' }, o.detail));
    if (o.onClick) t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onClick(e); } });
    return t;
  }
  function table(o) {
    const wrap = h('div', { class: 'table-wrap' });
    const tbl = h('table', { class: 'tbl' });
    tbl.appendChild(h('thead', null, h('tr', null, o.cols.map(c => h('th', { class: c.num ? 'num' : '' }, c.label)))));
    const tb = h('tbody');
    for (const r of o.rows) {
      const tr = h('tr', { class: o.onRow ? 'clickable' : '', onClick: o.onRow ? () => o.onRow(r) : undefined });
      for (const c of o.cols) tr.appendChild(h('td', { class: (c.num ? 'num ' : '') + (c.class || '') }, c.render ? c.render(r) : r[c.key]));
      tb.appendChild(tr);
    }
    tbl.appendChild(tb);
    if (o.foot) tbl.appendChild(h('tfoot', null, h('tr', null, o.cols.map((c, i) => h('td', { class: c.num ? 'num' : '' }, o.foot[i])))));
    wrap.appendChild(tbl);
    return wrap;
  }
  function listItem(o) {
    const li = h('div', { class: 'list-item' + (o.onClick ? ' clickable' : ''), onClick: o.onClick });
    if (o.lead) li.appendChild(o.lead);
    const body = h('div', { class: 'body' }, h('div', { class: 'title text-wrap' }, o.title));
    if (o.sub) body.appendChild(h('div', { class: 'small ink2 text-wrap' }, o.sub));
    if (o.meta && o.meta.length) body.appendChild(h('div', { class: 'meta' }, o.meta.filter(Boolean).map(m => typeof m === 'string' ? h('span', null, m) : m)));
    li.appendChild(body);
    if (o.aside) li.appendChild(h('div', { class: 'aside' }, h('div', { class: 'v num' }, o.aside.v), h('div', { class: 'l' }, o.aside.l)));
    if (o.actions && o.actions.length) li.appendChild(h('div', { class: 'actions', onClick: e => e.stopPropagation() }, o.actions));
    return li;
  }
  function empty(text, action) { return h('div', { class: 'empty' }, h('div', null, text), action || null); }

  // ---------- toast ----------
  function toast(msg, kind) {
    const root = document.getElementById('toast-root');
    const t = h('div', { class: 'toast' + (kind ? ' ' + kind : '') }, msg);
    root.appendChild(t);
    setTimeout(() => { t.remove(); }, kind === 'bad' ? 5000 : 2600);
  }

  // ---------- modal ----------
  let modalState = null;
  function openModal(o) {
    closeModal();
    const root = document.getElementById('modal-root');
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title });
    box.appendChild(h('div', { class: 'modal-head' }, h('h2', null, o.title), btn('', { icon: 'x', kind: 'ghost', size: 'sm', title: 'Close', onClick: closeModal })));
    const bodyEl = h('div', { class: 'modal-body' });
    append(bodyEl, o.body);
    box.appendChild(bodyEl);
    if (o.actions && o.actions.length) {
      const foot = h('div', { class: 'modal-foot' });
      for (const a of o.actions) {
        const b = btn(a.label, { kind: a.kind, class: a.left ? 'left' : '', icon: a.icon, onClick: async () => {
          if (!a.onClick) { if (modalState && modalState.back === back) closeModal(); return; }
          b.disabled = true;
          try { const r = await a.onClick(); if (r !== false && modalState && modalState.back === back) closeModal(); } finally { b.disabled = false; }
        } });
        foot.appendChild(b);
      }
      box.appendChild(foot);
    }
    back.appendChild(box);
    back.addEventListener('pointerdown', e => { if (e.target === back && !o.sticky) closeModal(); });
    root.appendChild(back);
    const onKey = e => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    modalState = { back, onKey };
    document.body.style.overflow = 'hidden';
    const first = box.querySelector('input:not([type=checkbox]):not([type=hidden]), select, textarea');
    if (first && window.innerWidth > 700) setTimeout(() => first.focus(), 30);
    return { close: closeModal, el: box };
  }
  function closeModal() {
    if (!modalState) return;
    modalState.back.remove();
    document.removeEventListener('keydown', modalState.onKey);
    modalState = null;
    document.body.style.overflow = '';
  }
  function confirm(o) {
    return new Promise(resolve => {
      let decided = false;
      const done = v => { if (!decided) { decided = true; resolve(v); } };
      openModal({
        title: o.title || 'Are you sure?',
        body: h('p', { class: 'ink2' }, o.text || ''),
        actions: [
          { label: 'Cancel', onClick: () => { done(false); } },
          { label: o.okLabel || 'Confirm', kind: o.danger ? 'danger' : 'primary', onClick: () => { done(true); } },
        ],
      });
      const back = modalState.back;
      const obs = new MutationObserver(() => { if (!document.body.contains(back)) { obs.disconnect(); done(false); } });
      obs.observe(document.getElementById('modal-root'), { childList: true });
    });
  }

  // ---------- forms ----------
  // spec: [{key,label,type,options,groups,required,placeholder,help,max,min,step,full,tall,rows,default}]
  let formSeq = 0;
  function form(spec, values) {
    values = values || {};
    const pfx = 'f' + (++formSeq) + '-';
    const el = h('div', { class: 'form' });
    const inputs = {}, fields = {}, counters = {}, errs = {};
    for (const f of spec) {
      const field = h('div', { class: 'field' + (f.full ? ' full' : '') });
      let input;
      const val = values[f.key] !== undefined && values[f.key] !== null ? values[f.key] : (f.default !== undefined ? f.default : '');
      if (f.type === 'checkbox') {
        input = h('input', { type: 'checkbox', id: pfx + f.key, checked: !!val });
        const lab = h('label', { class: 'check', for: pfx + f.key }, input, h('span', null, f.label, f.help ? h('span', { class: 'help' }, f.help) : null));
        field.appendChild(lab);
        el.appendChild(field); inputs[f.key] = input; fields[f.key] = field;
        continue;
      }
      const label = h('label', { for: pfx + f.key }, h('span', null, f.label, f.required ? ' *' : ''));
      if (f.max) { counters[f.key] = h('span', { class: 'count' }); label.appendChild(counters[f.key]); }
      field.appendChild(label);
      if (f.type === 'select') {
        input = h('select', { class: 'select', id: pfx + f.key });
        if (f.placeholder) input.appendChild(h('option', { value: '' }, f.placeholder));
        const addOpts = (parent, opts) => { for (const o of opts) { const ov = typeof o === 'string' ? o : o.value, ol = typeof o === 'string' ? o : o.label; parent.appendChild(h('option', { value: ov }, ol)); } };
        if (f.groups) for (const g of f.groups) { const og = h('optgroup', { label: g.label }); addOpts(og, g.options); input.appendChild(og); }
        else addOpts(input, f.options || []);
        input.value = val;
        if (input.value !== String(val) && val !== '') { input.appendChild(h('option', { value: val }, f.missingLabel ? f.missingLabel(val) : val)); input.value = val; }
      } else if (f.type === 'textarea') {
        input = h('textarea', { class: 'textarea' + (f.tall ? ' tall' : ''), id: pfx + f.key, placeholder: f.placeholder, rows: f.rows });
        input.value = val;
      } else if (f.type === 'radio') {
        input = h('div', { class: 'radio-group', id: pfx + f.key });
        for (const o of f.options) {
          const ov = typeof o === 'string' ? o : o.value, ol = typeof o === 'string' ? o : o.label;
          const r = h('input', { type: 'radio', name: pfx + f.key, value: ov, checked: String(val) === String(ov) });
          input.appendChild(h('label', { class: 'check' }, r, h('span', null, ol, o.help ? h('span', { class: 'help' }, o.help) : null)));
        }
      } else {
        input = h('input', { class: 'input', id: pfx + f.key, type: f.type || 'text', placeholder: f.placeholder, min: f.min, max: f.type === 'number' ? f.max : undefined, step: f.step, inputmode: f.type === 'number' ? 'decimal' : undefined, autocomplete: 'off' });
        input.value = val;
      }
      field.appendChild(input);
      if (f.help) field.appendChild(h('div', { class: 'help' }, f.help));
      errs[f.key] = h('div', { class: 'err' }); errs[f.key].hidden = true; field.appendChild(errs[f.key]);
      el.appendChild(field);
      inputs[f.key] = input; fields[f.key] = field;
      if (f.max && f.type !== 'number') {
        const upd = () => { const n = input.value.length; counters[f.key].textContent = n + '/' + f.max; counters[f.key].classList.toggle('over', n > f.max); };
        input.addEventListener('input', upd); upd();
      }
    }
    const api = {
      el,
      get(key) { return inputs[key]; },
      show(key, on) { if (fields[key]) fields[key].hidden = !on; },
      on(key, evt, fn) { if (inputs[key]) inputs[key].addEventListener(evt, fn); },
      setError(key, msg) { if (!errs[key]) return; errs[key].textContent = msg || ''; errs[key].hidden = !msg; },
      value(key) {
        const f = spec.find(s => s.key === key), input = inputs[key];
        if (!input) return undefined;
        if (f.type === 'checkbox') return !!input.checked;
        if (f.type === 'radio') { const r = input.querySelector('input:checked'); return r ? r.value : ''; }
        if (f.type === 'number') { const v = input.value.trim(); return v === '' ? '' : Number(v); }
        return input.value.trim();
      },
      read() {
        const out = {}; let ok = true;
        for (const f of spec) {
          if (fields[f.key] && fields[f.key].hidden) { out[f.key] = f.type === 'checkbox' ? false : ''; continue; }
          const v = api.value(f.key);
          out[f.key] = v;
          let err = '';
          if (f.required && (v === '' || v === undefined || v === null)) err = 'Required';
          else if (f.type === 'number' && v !== '' && isNaN(v)) err = 'Enter a number';
          else if (f.type === 'number' && v !== '' && f.min !== undefined && v < f.min) err = 'Must be at least ' + f.min;
          else if (f.validate) err = f.validate(v, out) || '';
          api.setError(f.key, err);
          if (err) ok = false;
        }
        return ok ? out : null;
      },
    };
    return api;
  }

  // ---------- clipboard / files ----------
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      try {
        const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy'); ta.remove(); return ok;
      } catch (e2) { return false; }
    }
  }
  function isFramed() { try { return window.self !== window.top; } catch (e) { return true; } }
  async function saveFile(filename, text) {
    let dl = null;
    try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
    if (dl) {
      try { await dl.save({ filename, data: text }); return 'saved'; }
      catch (e) { if (e && e.code === 'declined') return 'declined'; console.error(e); return 'failed'; }
    }
    // A plain download link is inert inside the artifact viewer: say so instead of claiming success.
    if (isFramed()) return 'failed';
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: filename }); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return 'saved';
    } catch (e) { return 'failed'; }
  }
  function exportBackup() {
    const text = JSON.stringify(S.toObject(), null, 2);
    const name = 'premed-ledger-' + C.todayISO() + '.json';
    saveFile(name, text).then(r => {
      if (r === 'saved') toast('Backup saved: ' + name);
      else if (r === 'declined') toast('Download cancelled');
      else {
        openModal({ title: 'Copy your backup', body: [h('p', { class: 'ink2 small' }, 'Downloads are blocked here. Copy this text into a file named ' + name + '.'), h('textarea', { class: 'textarea tall', readOnly: true, value: text })], actions: [{ label: 'Copy', kind: 'primary', onClick: async () => { await copyText(text); toast('Copied'); return false; } }, { label: 'Close' }] });
      }
    });
  }
  function importBackup() {
    const input = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        let obj;
        try { obj = JSON.parse(reader.result); } catch (e) { toast('That file is not valid JSON', 'bad'); return; }
        const counts = S.COLLECTIONS.map(c => (obj[c] || []).length + ' ' + c).join(', ');
        openModal({
          title: 'Import backup',
          body: h('div', { class: 'stack' }, h('p', { class: 'ink2' }, 'Found: ' + counts + '.'), h('p', { class: 'small muted' }, 'Merge keeps your current settings and entries, adds the backup\'s entries (overwriting ones with the same id), and adds its milestone marks. Replace deletes everything first and restores the backup exactly.')),
          actions: [
            { label: 'Cancel' },
            { label: 'Replace everything', kind: 'danger', onClick: async () => { try { const n = await S.importObject(obj, 'replace'); toast('Imported ' + n + ' entries'); } catch (e) { toast(e.message || 'Import failed', 'bad'); return false; } } },
            { label: 'Merge', kind: 'primary', onClick: async () => { try { const n = await S.importObject(obj, 'merge'); toast('Imported ' + n + ' entries'); } catch (e) { toast(e.message || 'Import failed', 'bad'); return false; } } },
          ],
        });
      };
      reader.readAsText(file);
    });
    document.body.appendChild(input); input.click(); setTimeout(() => input.remove(), 60000);
  }

  // ---------- categories ----------
  const CAT_COLORS = { clinical: 'var(--s1)', shadowing: 'var(--s3)', service: 'var(--s2)', research: 'var(--s5)', leadership: 'var(--s4)', teaching: 'var(--s6)', work: 'var(--muted)', club: 'var(--line-2)', hobby: 'var(--line-2)', other: 'var(--line-2)' };
  function catColor(key) { return CAT_COLORS[key] || 'var(--line-2)'; }
  function cat(key) { return CFG.categories.find(c => c.key === key) || CFG.categories[CFG.categories.length - 1]; }
  function catLabel(key) { return cat(key).label; }
  function catShort(key) { return cat(key).short; }

  // ---------- navigation ----------
  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dash', tab: true },
    { key: 'log', label: 'Log hours', icon: 'log', tab: true },
    { key: 'activities', label: 'Activities', icon: 'act', tab: true },
    { key: 'academics', label: 'Academics', icon: 'acad', tab: true },
    { key: 'research', label: 'Research & publications', icon: 'res' },
    { key: 'awards', label: 'Honors & awards', icon: 'award' },
    { key: 'resume', label: 'Resume & AMCAS', icon: 'resume' },
    { key: 'journal', label: 'Reflection journal', icon: 'journal' },
    { key: 'letters', label: 'Letter writers', icon: 'letter' },
    { key: 'timeline', label: 'Timeline', icon: 'time' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ];
  const App = { view: 'dashboard', params: {}, state: {}, renderPending: false };

  function navigate(key, params) {
    App.params = params || {};
    if (App.view !== key) {
      App.view = key;
      if (location.hash !== '#' + key) { try { history.replaceState(null, '', '#' + key); } catch (e) { location.hash = key; } }
    }
    window.scrollTo(0, 0);
    closeSheet();
    render();
  }
  function viewFromHash() {
    const k = (location.hash || '').replace('#', '');
    return NAV.some(n => n.key === k) ? k : 'dashboard';
  }
  function renderNav() {
    const rail = document.getElementById('nav-rail');
    rail.textContent = '';
    for (const n of NAV) {
      if (n.key === 'settings') rail.appendChild(h('div', { class: 'nav-sep' }));
      rail.appendChild(h('button', { class: 'nav-item' + (App.view === n.key ? ' active' : ''), type: 'button', onClick: () => navigate(n.key) }, icon(n.icon), h('span', null, n.label)));
    }
    const tabs = document.getElementById('nav-tabs');
    tabs.textContent = '';
    for (const n of NAV.filter(x => x.tab)) {
      tabs.appendChild(h('button', { class: 'tab-item' + (App.view === n.key ? ' active' : ''), type: 'button', onClick: () => navigate(n.key) }, icon(n.icon), h('span', null, n.key === 'log' ? 'Log' : n.label)));
    }
    const moreActive = !NAV.filter(x => x.tab).some(x => x.key === App.view);
    tabs.appendChild(h('button', { class: 'tab-item' + (moreActive ? ' active' : ''), type: 'button', onClick: openSheet }, icon('more'), h('span', null, 'More')));
  }
  let sheetEl = null;
  function openSheet() {
    closeSheet();
    const back = h('div', { class: 'sheet-back', onClick: e => { if (e.target === back) closeSheet(); } });
    const sheet = h('div', { class: 'sheet' });
    for (const n of NAV.filter(x => !x.tab)) sheet.appendChild(h('button', { class: 'nav-item' + (App.view === n.key ? ' active' : ''), type: 'button', onClick: () => navigate(n.key) }, icon(n.icon), h('span', null, n.label)));
    back.appendChild(sheet);
    document.getElementById('sheet-root').appendChild(back);
    sheetEl = back;
  }
  function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }

  function renderStatus() {
    const s = document.getElementById('sync-rail');
    s.className = 'sync ' + (S.status.kind || '');
    s.textContent = S.status.text;
    const banner = document.getElementById('banner');
    if (S.ready && S.backend === 'local') {
      banner.hidden = false; banner.className = 'banner';
      banner.textContent = '';
      banner.appendChild(icon('warn', 'ic-sm'));
      banner.appendChild(h('span', null, 'Saving to this browser only. Open this page from your Claude artifact link (signed in) to sync across devices, and export a backup from Settings now and then.'));
    } else if (S.status.kind === 'bad') {
      banner.hidden = false; banner.className = 'banner bad'; banner.textContent = S.status.text;
    } else banner.hidden = true;
  }

  function render() {
    const main = document.getElementById('main');
    const views = window.PMT_VIEWS;
    const v = views[App.view] || views.dashboard;
    const y = window.scrollY;
    document.getElementById('topbar-title').textContent = v.title;
    document.title = v.title + ' · ' + CFG.appName;
    main.textContent = '';
    if (!S.ready) { main.appendChild(h('div', { class: 'empty' }, 'Loading your ledger…')); renderNav(); renderStatus(); App.renderPending = false; return; }
    try { v.render(main, App.params); }
    catch (e) { console.error(e); main.appendChild(h('div', { class: 'empty' }, 'Something went wrong rendering this page. ', h('code', null, String(e && e.message || e)))); }
    renderNav();
    renderStatus();
    if (App.view === v.key) window.scrollTo(0, y);
    App.renderPending = false;
  }
  function scheduleRender() {
    if (App.renderPending) return;
    App.renderPending = true;
    requestAnimationFrame(() => {
      const ae = document.activeElement;
      const main = document.getElementById('main');
      if (ae && main.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.type !== 'checkbox' && ae.type !== 'radio' && ae.type !== 'date' && !ae.dataset.rerenderOk) {
        // Don't yank the keyboard away mid-typing: re-render when focus leaves.
        const once = () => { ae.removeEventListener('blur', once); App.renderPending = false; scheduleRender(); };
        ae.addEventListener('blur', once);
        return;
      }
      render();
    });
  }

  // ---------- boot ----------
  async function boot() {
    App.view = viewFromHash();
    const profile = CFG.student;
    document.getElementById('brand-sub').textContent = (profile.name.split(' ')[0] || '') + " · Cornell '" + String(profile.classYear).slice(2);
    const quick = document.getElementById('quick-log');
    quick.disabled = true;
    quick.addEventListener('click', () => { if (S.ready) window.PMT_VIEWS.openLogModal(); });
    window.addEventListener('hashchange', () => { const k = viewFromHash(); if (k !== App.view) { App.view = k; App.params = {}; render(); } });
    renderNav(); renderStatus();
    document.getElementById('main').appendChild(h('div', { class: 'empty' }, 'Loading your ledger…'));
    S.subscribe(scheduleRender);
    await S.init();
    quick.disabled = false;
    render();
  }

  window.PMT_UI = { h, append, icon, btn, chip, pageHead, section, tile, table, listItem, empty, toast, openModal, closeModal, confirm, form, copyText, saveFile, exportBackup, importBackup, catColor, cat, catLabel, catShort, navigate, App, NAV, render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
