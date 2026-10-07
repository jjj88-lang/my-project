// Pre-Med Ledger — views. Each view renders into <main> from the store; forms open in modals.
(function () {
  'use strict';
  const CFG = window.PMT_CONFIG, S = window.PMT_STORE, C = window.PMT_CALC, CH = window.PMT_CHARTS, U = window.PMT_UI;
  const h = U.h, btn = U.btn, chip = U.chip, icon = U.icon;

  // ---------- shared data helpers ----------
  const STATUS_ORDER = { Active: 0, Planned: 1, Paused: 2, Completed: 3 };
  function acts() { return S.all('activities').sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || (a.name || '').localeCompare(b.name || '')); }
  function logs() { return S.all('logs').sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')); }
  function actById(id) { return S.get('activities', id); }
  function actName(id) { const a = actById(id); return a ? a.name : 'Deleted activity'; }
  function catChip(key) { return chip(U.catShort(key), '', { color: U.catColor(key) }); }
  function statusChip(st) { return chip(st || 'Active', st === 'Active' ? 'good' : st === 'Completed' ? '' : st === 'Paused' ? 'warn' : 'outline'); }
  function hrs(n) { return C.fmtHours(n); }
  function countFrom() { return S.settings.countFrom || ''; }
  function countFromLabel() { return countFrom() ? 'since ' + C.fmtDate(countFrom(), { month: 'short', year: 'numeric' }) : 'all time'; }

  function activityGroups(includeAll) {
    const list = acts().filter(a => includeAll || a.status !== 'Completed');
    const groups = [];
    for (const c of CFG.categories) {
      const opts = list.filter(a => a.category === c.key).map(a => ({ value: a.id, label: a.name + (a.status === 'Completed' ? ' (completed)' : '') }));
      if (opts.length) groups.push({ label: c.label, options: opts });
    }
    return groups;
  }
  function amcasTypeFor(category) { const c = U.cat(category); return c.amcas[0]; }
  function hsOnly(a) { return !!(a.end && a.end <= CFG.student.hsGraduation); }
  function hsEra(dateStr) { return !!(dateStr && dateStr < CFG.student.hsGraduation); }
  function tradLabel(kind) { const k = CFG.traditionKinds.find(x => x.value === kind); return k ? k.label.split(' (')[0] : kind; }

  // ---------- log form (shared by the Log page, the top bar and activity pages) ----------
  function logSpec(existing, defaults) {
    existing = existing || {}; defaults = defaults || {};
    return [
      { key: 'activityId', label: 'Activity', type: 'select', groups: activityGroups(!!existing.id), placeholder: 'Choose an activity…', required: true, default: defaults.activityId, full: true },
      { key: 'date', label: 'Date', type: 'date', required: true, default: C.todayISO() },
      { key: 'hours', label: 'Hours', type: 'number', step: 0.25, min: 0, required: true, placeholder: '2.5', validate: v => v === 0 ? 'Enter more than 0' : '' },
      { key: 'endDate', label: 'End date (optional, for a whole week or month)', type: 'date', help: 'Leave blank for a single day. For a block of hours logged at once, the hours are spread evenly across the days, so a block that crosses a semester or summer boundary is split correctly.' },
      { key: 'physician', label: 'Physician', type: 'text', placeholder: 'Dr. Jane Smith' },
      { key: 'specialty', label: 'Specialty', type: 'text', placeholder: 'Anesthesiology' },
      { key: 'setting', label: 'Setting', type: 'text', placeholder: 'Operating room, outpatient clinic, ED…' },
      { key: 'note', label: 'What did you do or notice?', type: 'textarea', full: true, rows: 3, placeholder: 'One or two lines. Patient stories (no names) become essay material later.' },
      { key: 'verifiedBy', label: 'Verified by (optional)', type: 'text', placeholder: 'Supervisor who can confirm these hours', full: true },
    ];
  }
  function wireLogForm(f) {
    const upd = () => {
      const a = actById(f.value('activityId'));
      const cat = a ? a.category : '';
      const p = CFG.logPrompts[cat] || [];
      f.show('physician', p.includes('physician'));
      f.show('specialty', p.includes('specialty'));
      f.show('setting', p.includes('setting'));
    };
    f.on('activityId', 'change', upd); upd();
  }
  function openLogModal(defaults, existing) {
    if (!S.all('activities').length) {
      U.openModal({ title: 'Add an activity first', body: h('p', { class: 'ink2' }, 'Hours are logged against an activity (a hospital, a lab, a club). Create one and come back.'), actions: [{ label: 'Cancel' }, { label: 'Add activity', kind: 'primary', onClick: () => { openActivityModal(); return true; } }] });
      return;
    }
    const f = U.form(logSpec(existing, defaults), existing || {});
    wireLogForm(f);
    const save = async (again) => {
      const v = f.read(); if (!v) return false;
      const doc = Object.assign({}, existing || {}, v);
      if (doc.endDate && doc.endDate < doc.date) { f.setError('endDate', 'End date is before the start date'); return false; }
      await S.save('logs', doc);
      U.toast((existing ? 'Updated' : 'Logged') + ' ' + hrs(v.hours) + ' h · ' + actName(v.activityId));
      if (again) { openLogModal({ activityId: v.activityId }); return true; }
      return true;
    };
    U.openModal({ title: existing ? 'Edit entry' : 'Log hours', body: f.el, sticky: true, actions: [
      { label: 'Cancel' },
      existing ? null : { label: 'Save & add another', onClick: () => save(true) },
      { label: existing ? 'Save changes' : 'Save entry', kind: 'primary', onClick: () => save(false) },
    ].filter(Boolean) });
  }

  // ---------- activity form ----------
  function activitySpec(existing) {
    existing = existing || {};
    return [
      { key: 'name', label: 'Activity name', type: 'text', required: true, placeholder: 'Stormont Vail Health', full: true, max: CFG.amcas.nameChars, help: 'How it should appear on AMCAS and your resume. Advisors report a 60-character limit in the AMCAS form.' },
      { key: 'org', label: 'Organization', type: 'text', placeholder: 'Cornell Health, Weill Cornell, a lab name…' },
      { key: 'role', label: 'Your role / title', type: 'text', placeholder: 'Volunteer, Research Assistant, Co-Founder' },
      { key: 'category', label: 'Tracker category', type: 'select', options: CFG.categories.map(c => ({ value: c.key, label: c.label })), required: true, default: 'clinical' },
      { key: 'amcasType', label: 'AMCAS experience type', type: 'select', options: CFG.amcasTypes, placeholder: 'Choose…', help: 'The category AMCAS will ask for. Set once; changes with the tracker category until you pick one yourself.' },
      { key: 'status', label: 'Status', type: 'select', options: CFG.activityStatuses, default: 'Active' },
      { key: 'location', label: 'City, State', type: 'text', placeholder: 'Ithaca, NY', help: 'AMCAS asks for city, state and country.' },
      { key: 'start', label: 'Start date', type: 'date', required: true },
      { key: 'end', label: 'End date', type: 'date', help: 'Leave blank while it is ongoing.' },
      { key: 'hoursPerWeek', label: 'Typical hours per week', type: 'number', step: 0.5, min: 0, placeholder: '3' },
      { key: 'weeksPerYear', label: 'Weeks per year', type: 'number', step: 1, min: 1, max: 52, placeholder: '47', help: 'Used only to estimate hours you have not logged.' },
      { key: 'contactName', label: 'Contact name', type: 'text', placeholder: 'Supervisor or coordinator' },
      { key: 'contactTitle', label: 'Contact title', type: 'text', placeholder: 'Volunteer Coordinator' },
      { key: 'contactEmail', label: 'Contact email', type: 'text', placeholder: 'name@org.org' },
      { key: 'contactPhone', label: 'Contact phone', type: 'text', placeholder: '(607) 555-0100' },
      { key: 'description', label: 'AMCAS description', type: 'textarea', full: true, max: CFG.amcas.descriptionChars, rows: 4, placeholder: 'What you did, how often, and what it showed you. Numbers help (patients served, people led).' },
      { key: 'bullets', label: 'Resume bullets (one per line)', type: 'textarea', full: true, rows: 3, placeholder: 'Acted as a clinical liaison for 3,000+ patients…' },
      { key: 'mostMeaningful', label: 'Most meaningful experience (AMCAS lets you pick 3)', type: 'checkbox', full: true },
      { key: 'meaningfulEssay', label: 'Most meaningful essay draft', type: 'textarea', full: true, max: CFG.amcas.meaningfulChars, rows: 5, placeholder: 'Why this experience mattered. Draft it while it is fresh.' },
      { key: 'tradition', label: 'Cornell Tradition counts as', type: 'select', options: CFG.traditionKinds, default: '', help: 'Only academic-year hours count (never summer). Research and for-credit work never count.' },
      { key: 'traditionSite', label: 'Where', type: 'select', options: ['On campus', 'Off campus'], default: 'Off campus', help: 'Off-campus work and service need a supervisor endorsement each year; on-campus jobs are verified from payroll.' },
      { key: 'endorsement', label: 'Endorsement status (this year)', type: 'select', options: CFG.endorsementStates.map(s => ({ value: s, label: s || '—' })), default: '' },
      { key: 'startedInHS', label: 'Started in high school', type: 'checkbox', help: 'Hours before your counting start date stay visible but are reported separately.' },
      { key: 'includeAmcas', label: 'Include on AMCAS worksheet', type: 'checkbox', default: true },
      { key: 'notes', label: 'Private notes', type: 'textarea', full: true, rows: 2, placeholder: 'Anything else: how you got in, who to thank, ideas.' },
    ];
  }
  function openActivityModal(existing, after) {
    const f = U.form(activitySpec(existing), existing || {});
    let userPickedType = !!(existing && existing.amcasType);
    f.on('amcasType', 'change', () => { userPickedType = true; });
    f.on('category', 'change', () => { if (!userPickedType) f.get('amcasType').value = amcasTypeFor(f.value('category')); });
    if (!existing) f.get('amcasType').value = amcasTypeFor(f.value('category'));
    const updTrad = () => { const on = !!f.value('tradition'); f.show('traditionSite', on); f.show('endorsement', on); };
    f.on('tradition', 'change', updTrad); updTrad();
    U.openModal({ title: existing ? 'Edit activity' : 'New activity', body: f.el, sticky: true, actions: [
      { label: 'Cancel' },
      { label: existing ? 'Save changes' : 'Create activity', kind: 'primary', onClick: async () => {
        const v = f.read(); if (!v) return false;
        if (v.end && v.end < v.start) { f.setError('end', 'End date is before the start date'); return false; }
        const doc = Object.assign({}, existing || {}, v, { ongoing: !v.end });
        const saved = await S.save('activities', doc);
        if (doc.status === 'Completed' && (!existing || existing.status !== 'Completed') && (!doc.contactName || (!doc.contactEmail && !doc.contactPhone))) U.toast('Marked completed. Get an hours letter and a supervisor contact now, while they still remember you.');
        else U.toast(existing ? 'Activity updated' : 'Activity created');
        if (after) after(saved);
        return true;
      } },
    ] });
  }
  async function deleteActivity(a) {
    const n = S.all('logs').filter(l => l.activityId === a.id).length;
    const ok = await U.confirm({ title: 'Delete ' + a.name + '?', text: n ? 'This also deletes its ' + n + ' logged entr' + (n === 1 ? 'y' : 'ies') + '. Export a backup first if you are unsure.' : 'This cannot be undone.', okLabel: 'Delete', danger: true });
    if (!ok) return false;
    for (const l of S.all('logs').filter(l => l.activityId === a.id)) await S.remove('logs', l.id);
    await S.remove('activities', a.id);
    U.toast('Deleted ' + a.name);
    return true;
  }

  // ---------- generic CRUD modal ----------
  function openDocModal(col, title, spec, existing, onSaved) {
    const f = U.form(spec, existing || {});
    U.openModal({ title: (existing ? 'Edit ' : 'New ') + title, body: f.el, sticky: true, actions: [
      { label: 'Cancel' },
      { label: existing ? 'Save changes' : 'Save', kind: 'primary', onClick: async () => {
        const v = f.read(); if (!v) return false;
        const saved = await S.save(col, Object.assign({}, existing || {}, v));
        U.toast('Saved');
        if (onSaved) onSaved(saved);
        return true;
      } },
    ] });
  }
  async function deleteDoc(col, id, label) {
    const ok = await U.confirm({ title: 'Delete ' + (label || 'this entry') + '?', text: 'This cannot be undone.', okLabel: 'Delete', danger: true });
    if (ok) { await S.remove(col, id); U.toast('Deleted'); }
    return ok;
  }
  function editDeleteButtons(onEdit, onDelete) {
    return [btn('', { icon: 'edit', kind: 'ghost', size: 'xs', title: 'Edit', onClick: onEdit }), btn('', { icon: 'trash', kind: 'ghost', size: 'xs', title: 'Delete', onClick: onDelete })];
  }

  // ---------- log list ----------
  function logItem(l, opts) {
    opts = opts || {};
    const a = actById(l.activityId);
    const meta = [];
    if (!opts.hideActivity && a) meta.push(catChip(a.category));
    if (l.endDate) meta.push('through ' + C.fmtDate(l.endDate));
    if (l.physician) meta.push(l.physician + (l.specialty ? ' · ' + l.specialty : ''));
    else if (l.specialty) meta.push(l.specialty);
    if (l.setting) meta.push(l.setting);
    if (l.verifiedBy) meta.push('Verified: ' + l.verifiedBy);
    return U.listItem({
      title: h('span', null, h('span', { class: 'muted small nowrap' }, C.fmtDate(l.date) + ' · '), opts.hideActivity ? (l.note || 'No note') : (a ? a.name : 'Deleted activity')),
      sub: !opts.hideActivity && l.note ? l.note : null,
      meta: meta,
      aside: { v: hrs(l.hours), l: 'hours' },
      actions: editDeleteButtons(() => openLogModal(null, l), () => deleteDoc('logs', l.id, 'this entry')),
    });
  }

  function shadowingStats(A, L, cf) {
    const ids = new Set(A.filter(a => a.category === 'shadowing').map(a => a.id));
    const phys = new Set(), specs = new Set(); let primaryCare = 0;
    for (const l of L) {
      if (!ids.has(l.activityId)) continue;
      if (cf && (l.date || '') < cf) continue;
      if (l.physician) phys.add(l.physician.trim().toLowerCase());
      const sp = (l.specialty || '').trim().toLowerCase();
      if (sp) { specs.add(sp); if (CFG.primaryCareWords.some(w => sp.includes(w))) primaryCare += Number(l.hours) || 0; }
    }
    return { physicians: phys.size, specialties: specs.size, primaryCare: primaryCare };
  }

  // ---------- readiness checks ----------
  function readinessTodos() {
    const A = acts(), L = logs(), today = C.todayISO();
    const todos = [];
    const cutoff = C.toISO(new Date(Date.now() - 45 * 86400000));
    const unlogged = [];
    for (const a of A) {
      if (a.status !== 'Active') continue;
      const last = L.find(l => l.activityId === a.id);
      if (!last) unlogged.push(a);
      else if (last.date < cutoff && (a.start || '') < cutoff) todos.push({ text: a.name + ' has nothing logged since ' + C.fmtDate(last.date) + '.', go: () => openLogModal({ activityId: a.id }) });
    }
    if (unlogged.length === 1) todos.push({ text: 'No hours logged yet for ' + unlogged[0].name + '.', go: () => openLogModal({ activityId: unlogged[0].id }) });
    else if (unlogged.length > 1) todos.push({ text: unlogged.length + ' active activities have no hours yet: ' + unlogged.map(a => a.name.replace(/\s*\(.*\)$/, '')).join(', ') + '.', go: () => U.navigate('log') });
    const missing = C.amcasEntries(A, L, countFrom()).filter(e => e.missing.includes('contact name') || e.missing.includes('contact email or phone'));
    if (missing.length) todos.push({ text: missing.length + ' activit' + (missing.length === 1 ? 'y is' : 'ies are') + ' missing a contact (AMCAS requires a name and email or phone): ' + missing.slice(0, 3).map(e => e.activity.name).join(', ') + (missing.length > 3 ? '…' : ''), go: () => U.navigate('resume', { tab: 'amcas' }) });
    const specialties = new Set(L.filter(l => l.specialty).map(l => l.specialty.trim().toLowerCase()));
    const shadowLogs = L.filter(l => { const a = actById(l.activityId); return a && a.category === 'shadowing'; });
    if (shadowLogs.length && specialties.size < 2) todos.push({ text: 'Shadowing covers ' + (specialties.size || 'no named') + ' specialt' + (specialties.size === 1 ? 'y' : 'ies') + '. Add a primary care physician (family medicine, internal medicine, pediatrics) to show breadth.', go: () => U.navigate('activities') });
    for (const c of S.all('certs')) { const stt = certStatus(c); if (stt.kind === 'bad' || stt.kind === 'warn') todos.push({ text: (c.name === 'Other' ? c.nameOther : c.name) + ': ' + stt.label.toLowerCase() + '. Renew before your next clinical start date.', go: () => U.navigate('awards') }); }
    for (const a of S.all('awards')) { if (!a.renewalDue) continue; const days = C.daysBetween(C.parseISO(C.todayISO()), C.parseISO(a.renewalDue)); if (days <= 45) todos.push({ text: a.name + ' renewal is due ' + C.fmtDate(a.renewalDue) + (days < 0 ? ' (overdue)' : '') + '.', go: () => U.navigate('awards') }); }
    const jl = S.all('journal').sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const jcut = C.toISO(new Date(Date.now() - 30 * 86400000));
    if (!jl || jl.date < jcut) todos.push({ text: 'No reflection in the last 30 days. A five-minute entry after a shift is what secondaries are written from.', go: () => U.navigate('journal') });
    return todos;
  }

  // ---------- DASHBOARD ----------
  const dashboard = { key: 'dashboard', title: 'Dashboard', render(main) {
    const A = acts(), L = logs(), st = S.settings, cf = countFrom();
    const first = (st.profile && st.profile.name || CFG.student.name).split(' ')[0];
    const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    main.appendChild(U.pageHead('Hi, ' + first + '.', todayStr + '. ' + (A.length ? 'Here is where you stand.' : 'Let us set up your ledger.')));

    if (!A.length) {
      const seedBtn = (window.PMT_SEED && S.backend === 'local') ? btn('Load my starting data', { kind: 'primary', onClick: async () => { const n = await S.loadSeed(); U.toast('Loaded ' + n + ' entries'); } }) : null;
      main.appendChild(h('div', { class: 'card stack' },
        h('h2', null, 'Start with your activities'),
        h('p', { class: 'ink2' }, 'Every hour you log attaches to an activity: a hospital, a lab, a club, a job. Add the ones you already have, then log hours as they happen. The dashboard, the AMCAS worksheet and the resume draft all build themselves from there.'),
        h('div', { class: 'btn-row' }, seedBtn, btn('Add an activity', { kind: seedBtn ? '' : 'primary', icon: 'log', onClick: () => openActivityModal() }), btn('Open settings', { onClick: () => U.navigate('settings') }))));
      return;
    }

    const totals = C.categoryTotals(A, L, cf);
    const counted = Object.values(totals).reduce((s, t) => s + t.counted, 0);
    const all = Object.values(totals).reduce((s, t) => s + t.all, 0);
    const weekly = C.trailingWeeklyAverage(L, 4);
    const patient = totals.clinical.counted + totals.shadowing.counted;

    // hero
    main.appendChild(h('div', { class: 'hero' },
      h('div', null, h('div', { class: 'eyebrow' }, 'Hours logged ' + countFromLabel()), h('div', { class: 'hero-num' }, C.fmtNum(Math.round(counted)), h('small', null, 'hours'))),
      h('div', { class: 'hero-side' },
        h('div', { class: 'hero-stat' }, h('span', { class: 'v num' }, C.fmtNum(Math.round(patient))), h('span', { class: 'l' }, 'clinical + shadowing')),
        h('div', { class: 'hero-stat' }, h('span', { class: 'v num' }, hrs(weekly)), h('span', { class: 'l' }, 'hours/week, last 4 weeks')),
        h('div', { class: 'hero-stat' }, h('span', { class: 'v num' }, C.fmtNum(Math.round(all))), h('span', { class: 'l' }, 'all time incl. high school')),
        h('div', { class: 'hero-stat' }, h('span', { class: 'v num' }, String(A.filter(a => a.status === 'Active').length)), h('span', { class: 'l' }, 'active activities')))));

    // goal tiles
    const goals = st.goals || {};
    const submit = allMilestones().find(m => m.key === 'amcas-submit');
    const start = C.parseISO(cf) || C.parseISO(CFG.student.collegeStart), endD = C.parseISO(submit.date), now = new Date();
    const frac = start && endD ? Math.min(1, Math.max(0, (now - start) / (endD - start))) : 0;
    const kpi = h('div', { class: 'grid grid-kpi' });
    for (const c of CFG.categories) {
      const g = Number(goals[c.key]) || 0;
      if (!g) continue;
      const v = totals[c.key].counted;
      const expected = g * frac;
      const behind = v < expected * 0.8 && v < g;
      let detail = v >= g ? 'Goal met' : (Math.round(g - v) + ' to go · ' + (behind ? 'behind pace' : 'on pace'));
      if (c.key === 'shadowing') { const sh = shadowingStats(A, L, cf); detail += ' · ' + sh.physicians + ' physician' + (sh.physicians === 1 ? '' : 's') + ', ' + sh.specialties + ' specialt' + (sh.specialties === 1 ? 'y' : 'ies') + ', primary care ' + hrs(sh.primaryCare) + ' h'; }
      kpi.appendChild(U.tile({ label: c.label, color: U.catColor(c.key), value: hrs(v), unit: '/ ' + g, meter: { value: v, goal: g, warn: behind }, detail: detail, onClick: () => U.navigate('activities', { cat: c.key }) }));
    }
    const others = CFG.categories.filter(c => !goals[c.key] && totals[c.key].counted > 0);
    main.appendChild(U.section('Progress toward your goals', [btn('Edit goals', { size: 'sm', kind: 'ghost', onClick: () => U.navigate('settings') })], kpi,
      others.length ? h('div', { class: 'chip-row', style: { marginTop: '10px' } }, others.map(c => chip(c.short + ' · ' + hrs(totals[c.key].counted) + ' h', '', { color: U.catColor(c.key) }))) : null,
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, 'Pace compares your hours with a straight line from your counting start date to the AMCAS submission milestone (' + C.fmtDate(submit.date, { month: 'long', year: 'numeric' }) + ').')));

    // charts
    const months = C.monthlySeries(A, L, 12);
    const bar = CH.barChart({ rows: months.map(m => ({ label: m.label, value: C.round1(m.total), detail: Object.keys(m.byCat).sort((x, y) => m.byCat[y] - m.byCat[x]).map(k => ({ color: U.catColor(k), value: hrs(m.byCat[k]), label: U.catShort(k) })) })), unit: 'h', labelHeader: 'Month', ariaLabel: 'Hours per month, last 12 months' });
    const segs = CFG.categories.map(c => ({ key: c.key, label: c.label, value: C.round1(totals[c.key].counted), color: U.catColor(c.key) })).filter(s => s.value > 0).sort((a, b) => b.value - a.value);
    let segShown = segs;
    if (segs.length > 6) { const rest = segs.slice(5).reduce((s, x) => s + x.value, 0); segShown = segs.slice(0, 5).concat([{ key: 'rest', label: 'Everything else', value: C.round1(rest), color: 'var(--line-2)' }]); }
    main.appendChild(U.section('Hours over time', null, h('div', { class: 'grid grid-2' },
      h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', { class: 'card-title' }, 'Hours per month'), h('span', { class: 'tiny muted' }, 'last 12 months')), bar),
      h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', { class: 'card-title' }, 'Where the hours go'), h('span', { class: 'tiny muted' }, countFromLabel())), CH.stackedBar(segShown, { ariaLabel: 'Share of hours by category' })))));

    // academics + tradition
    const acad = C.academicSummary(S.all('courses'));
    const trad = C.traditionYears(A, L, st.tradition || CFG.tradition);
    const cur = trad.current, tcfg = trad.targets;
    const tradCard = h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', { class: 'card-title' }, 'Cornell Tradition · ' + (cur ? cur.label : '')), btn('Details', { size: 'xs', kind: 'ghost', onClick: () => U.navigate('activities', { tradition: true }) })));
    if (cur) {
      const row = (label, v, goal, sub) => h('div', { class: 'goal-cell' }, h('div', { class: 'progress-label' }, h('span', null, label, sub ? h('span', { class: 'muted' }, ' · ' + sub) : null), h('span', { class: 'num' }, hrs(v) + ' / ' + goal + ' h')), CH.meter(v, goal, { large: true }));
      tradCard.appendChild(h('div', { class: 'stack' },
        row('Paid work', cur.work, tcfg.workHours),
        row('Service', cur.service, tcfg.serviceHours, 'community ' + hrs(cur.community) + ' / ' + tcfg.communityHours + ' h, campus ' + hrs(cur.campus) + ' h'),
        row('Flex (work or service above the floors)', cur.flex, tcfg.flexHours),
        row('Total', cur.total, tcfg.totalHours),
        h('p', { class: 'tiny muted' }, 'Fellowship year ' + C.fmtDate(cur.from) + ' – ' + C.fmtDate(cur.to) + ' (estimated dates; confirm with tradition@cornell.edu and adjust in Settings). Only academic-year hours count; summer never does. Tag activities as work, community or campus service to count them here.' + (trad.outside ? ' ' + hrs(trad.outside) + ' tagged hours fall outside every fellowship year and do not count.' : ''))));
    }
    main.appendChild(U.section('Academics & fellowship', null, h('div', { class: 'grid grid-2' },
      h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('div', { class: 'card-title' }, 'GPA'), btn('Academics', { size: 'xs', kind: 'ghost', onClick: () => U.navigate('academics') })),
        h('div', { class: 'grid grid-kpi' },
          U.tile({ label: 'Cornell cumulative', value: C.fmtGPA(acad.cornell.gpa), detail: acad.cornell.credits + ' graded credits' }),
          U.tile({ label: 'AMCAS cumulative', value: C.fmtGPA(acad.amcas.gpa), detail: 'A+ counts as 4.0' }),
          U.tile({ label: 'AMCAS BCPM', value: C.fmtGPA(acad.bcpm.gpa), detail: acad.bcpm.credits + ' science/math credits' }),
          U.tile({ label: 'In progress', value: String(acad.creditsInProgress), unit: 'credits', detail: acad.creditsEarned + ' earned so far' }))),
      tradCard)));

    // milestones + recent
    const next = C.nextMilestones(allMilestones(), st.milestonesDone, 3);
    const msList = h('div', { class: 'list' });
    for (const m of next) msList.appendChild(U.listItem({ title: m.label, meta: [C.fmtDate(m.date)], aside: { v: m.days, l: m.days === 1 ? 'day' : 'days' }, onClick: () => U.navigate('timeline') }));
    const recent = L.slice(0, 5);
    const recentList = h('div', { class: 'list' });
    for (const l of recent) recentList.appendChild(logItem(l));
    main.appendChild(U.section('Coming up & recent', null, h('div', { class: 'grid grid-2' },
      h('div', null, h('div', { class: 'section-head' }, h('h2', null, 'Next milestones'), btn('Timeline', { size: 'xs', kind: 'ghost', onClick: () => U.navigate('timeline') })), next.length ? msList : U.empty('All milestones done.')),
      h('div', null, h('div', { class: 'section-head' }, h('h2', null, 'Recent entries'), btn('Log hours', { size: 'xs', kind: 'primary', icon: 'log', onClick: () => openLogModal() })), recent.length ? recentList : U.empty('Nothing logged yet.', btn('Log your first hours', { kind: 'primary', onClick: () => openLogModal() }))))));

    // readiness
    const todos = readinessTodos();
    if (todos.length) {
      const list = h('div', { class: 'stack' });
      for (const t of todos) list.appendChild(h('div', { class: 'todo' }, icon('warn', 'ic-sm'), h('span', { style: { flex: 1 } }, t.text), btn('Go', { size: 'xs', onClick: t.go })));
      main.appendChild(U.section('Things to fix', null, list));
    }
  } };

  function allMilestones() {
    const gap = !!(S.settings.profile && S.settings.profile.gapYear);
    const base = CFG.milestones.map(m => {
      if (!gap || !m.shift) return m;
      const d = C.parseISO(m.date);
      return Object.assign({}, m, { date: d ? C.toISO(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate())) : m.date, shifted: true });
    });
    const custom = (S.settings.customMilestones || []).map(m => Object.assign({ custom: true }, m));
    return base.concat(custom).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  // ---------- LOG ----------
  const logView = { key: 'log', title: 'Log hours', render(main, params) {
    const A = acts(), L = logs();
    const st = U.App.state.log = U.App.state.log || { cat: 'all', activity: '', period: 'all', q: '' };
    if (params && params.activityId) { st.activity = params.activityId; st.cat = 'all'; }
    main.appendChild(U.pageHead('Log hours', 'Log after every shift, meeting or lab session. Small, frequent entries are easier to verify than a guessed total three years later.'));

    // quick add
    if (A.length) {
      const f = U.form(logSpec(null, { activityId: st.activity || (U.App.state.lastActivity || '') }), {});
      wireLogForm(f);
      const card = h('div', { class: 'quick' }, h('div', { class: 'card-head' }, h('div', { class: 'card-title' }, 'Quick entry')), f.el,
        h('div', { class: 'btn-row', style: { marginTop: '12px' } }, btn('Save entry', { kind: 'primary', icon: 'check', onClick: async () => {
          const v = f.read(); if (!v) return;
          if (v.endDate && v.endDate < v.date) { f.setError('endDate', 'End date is before the start date'); return; }
          U.App.state.lastActivity = v.activityId;
          await S.save('logs', v);
          U.toast('Logged ' + hrs(v.hours) + ' h · ' + actName(v.activityId));
          U.render();
        } }), h('span', { class: 'tiny muted' }, 'Tip: the "Log hours" button at the top works from any page.')));
      main.appendChild(card);
    } else {
      main.appendChild(U.empty('Add an activity before logging hours.', btn('Add activity', { kind: 'primary', onClick: () => openActivityModal() })));
    }

    // filters
    const cats = CFG.categories.filter(c => A.some(a => a.category === c.key));
    const chips = h('div', { class: 'filter-chips' });
    const mk = (key, label) => h('button', { class: 'fchip' + (st.cat === key ? ' active' : ''), type: 'button', onClick: () => { st.cat = key; st.activity = ''; U.render(); } }, label);
    chips.appendChild(mk('all', 'All'));
    for (const c of cats) chips.appendChild(mk(c.key, c.short));
    const actSel = h('select', { class: 'select', style: { maxWidth: '260px' }, onChange: e => { st.activity = e.target.value; U.render(); } }, h('option', { value: '' }, 'Every activity'));
    for (const g of activityGroups(true)) { const og = h('optgroup', { label: g.label }); for (const o of g.options) og.appendChild(h('option', { value: o.value, selected: st.activity === o.value }, o.label)); actSel.appendChild(og); }
    const periods = [['all', 'All time'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['count', 'Since counting start'], ['year', 'This calendar year']];
    const perSel = h('select', { class: 'select', style: { maxWidth: '200px' }, onChange: e => { st.period = e.target.value; U.render(); } }, periods.map(p => h('option', { value: p[0], selected: st.period === p[0] }, p[1])));
    const q = h('input', { class: 'input', type: 'search', placeholder: 'Search notes, physicians…', value: st.q, style: { maxWidth: '240px' }, onInput: e => { st.q = e.target.value; renderList(); } });
    main.appendChild(U.section('Entries', null, h('div', { class: 'stack' }, chips, h('div', { class: 'row' }, actSel, perSel, q))));
    const listHost = h('div', { class: 'section', style: { marginTop: '12px' } });
    main.appendChild(listHost);

    function filtered() {
      let from = '';
      if (st.period === '30') from = C.toISO(new Date(Date.now() - 30 * 86400000));
      else if (st.period === '90') from = C.toISO(new Date(Date.now() - 90 * 86400000));
      else if (st.period === 'count') from = countFrom();
      else if (st.period === 'year') from = new Date().getFullYear() + '-01-01';
      const ql = st.q.trim().toLowerCase();
      return L.filter(l => {
        const a = actById(l.activityId);
        if (st.cat !== 'all' && (!a || a.category !== st.cat)) return false;
        if (st.activity && l.activityId !== st.activity) return false;
        if (from && (l.date || '') < from) return false;
        if (ql) { const hay = [(a && a.name) || '', l.note, l.physician, l.specialty, l.setting, l.verifiedBy].join(' ').toLowerCase(); if (!hay.includes(ql)) return false; }
        return true;
      });
    }
    function renderList() {
      listHost.textContent = '';
      const rows = filtered();
      const total = rows.reduce((s, l) => s + (Number(l.hours) || 0), 0);
      listHost.appendChild(h('div', { class: 'section-head' }, h('h2', null, rows.length + ' entr' + (rows.length === 1 ? 'y' : 'ies')), h('span', { class: 'b num' }, hrs(total) + ' hours')));
      if (!rows.length) { listHost.appendChild(U.empty(L.length ? 'No entries match these filters.' : 'No entries yet. Use the quick entry above.')); return; }
      const list = h('div', { class: 'list' });
      const limit = st.showAll ? rows.length : 60;
      for (const l of rows.slice(0, limit)) list.appendChild(logItem(l));
      listHost.appendChild(list);
      if (rows.length > limit) listHost.appendChild(h('div', { class: 'center', style: { marginTop: '10px' } }, btn('Show all ' + rows.length, { onClick: () => { st.showAll = true; renderList(); } })));
    }
    renderList();
  } };

  // ---------- ACTIVITIES ----------
  const activitiesView = { key: 'activities', title: 'Activities', render(main, params) {
    if (params && params.id) return renderActivityDetail(main, params.id);
    const A = acts(), L = logs(), cf = countFrom();
    const st = U.App.state.acts = U.App.state.acts || { cat: 'all' };
    if (params && params.cat) st.cat = params.cat;
    if (params && params.tradition) st.cat = 'tradition';
    main.appendChild(U.pageHead('Activities', 'Everything you will eventually enter on AMCAS, your resume and the Cornell HPAC letter packet. Keep contacts current while you still see these people every week.', [btn('New activity', { kind: 'primary', icon: 'log', onClick: () => openActivityModal(null, a => U.navigate('activities', { id: a.id })) })]));
    const chips = h('div', { class: 'filter-chips' });
    const mk = (key, label, n) => h('button', { class: 'fchip' + (st.cat === key ? ' active' : ''), type: 'button', onClick: () => { st.cat = key; U.render(); } }, label + (n !== undefined ? ' · ' + n : ''));
    chips.appendChild(mk('all', 'All', A.length));
    for (const c of CFG.categories) { const n = A.filter(a => a.category === c.key).length; if (n) chips.appendChild(mk(c.key, c.short, n)); }
    const tn = A.filter(a => a.tradition).length; if (tn) chips.appendChild(mk('tradition', 'Cornell Tradition', tn));
    const mm = A.filter(a => a.mostMeaningful).length; if (mm) chips.appendChild(mk('meaningful', 'Most meaningful', mm));
    main.appendChild(chips);
    const shown = A.filter(a => st.cat === 'all' || (st.cat === 'tradition' ? !!a.tradition : st.cat === 'meaningful' ? !!a.mostMeaningful : a.category === st.cat));
    if (!A.length) { main.appendChild(U.section('', null, U.empty('No activities yet.', btn('Add your first activity', { kind: 'primary', onClick: () => openActivityModal() })))); return; }
    const byStatus = {};
    for (const a of shown) (byStatus[a.status || 'Active'] = byStatus[a.status || 'Active'] || []).push(a);
    for (const stName of ['Active', 'Planned', 'Paused', 'Completed']) {
      const list = byStatus[stName]; if (!list || !list.length) continue;
      const grid = h('div', { class: 'grid grid-cards' });
      for (const a of list) grid.appendChild(activityCard(a, L, cf));
      main.appendChild(U.section(stName + ' · ' + list.length, null, grid));
    }
    if (st.cat === 'tradition') main.appendChild(traditionSection(A, L));
  } };

  function activityCard(a, L, cf) {
    const hh = C.activityHours(a, L, cf);
    const est = C.estimatedHours(a);
    const card = h('div', { class: 'card acard', tabIndex: 0, role: 'button', onClick: () => U.navigate('activities', { id: a.id }), onKeydown: e => { if (e.key === 'Enter') U.navigate('activities', { id: a.id }); } });
    card.appendChild(h('div', { class: 'top' }, h('div', { style: { minWidth: 0 } }, h('div', { class: 'name text-wrap' }, a.mostMeaningful ? h('span', { class: 'star', title: 'Most meaningful' }, '★ ') : null, a.name), h('div', { class: 'org text-wrap' }, [a.role, a.org].filter(Boolean).join(' · '))),
      h('div', { class: 'hours' }, h('div', { class: 'v num' }, hrs(hh.counted)), h('div', { class: 'l' }, 'h ' + countFromLabel()))));
    const meta = [catChip(a.category), statusChip(a.status), chip(C.fmtRange(a.start, a.end, a.ongoing), 'outline')];
    if (a.tradition) meta.push(chip('Tradition · ' + tradLabel(a.tradition), 'accent'));
    if (hsOnly(a)) meta.push(chip('Ended before college', 'warn')); else if (a.startedInHS) meta.push(chip('Began in HS', 'outline'));
    card.appendChild(h('div', { class: 'chip-row' }, meta));
    const foot = [];
    if (hh.all !== hh.counted) foot.push(h('span', { class: 'tiny muted' }, hrs(hh.all) + ' h all time'));
    if (est && !hh.all) foot.push(h('span', { class: 'tiny muted' }, '~' + C.fmtNum(est) + ' h estimated from ' + a.hoursPerWeek + ' h/wk · nothing logged'));
    if (!a.contactName) foot.push(h('span', { class: 'tiny', style: { color: 'var(--warn-ink)' } }, 'No contact yet'));
    if (a.tradition && a.traditionSite === 'Off campus' && a.endorsement !== 'Completed' && a.status === 'Active') foot.push(h('span', { class: 'tiny', style: { color: 'var(--warn-ink)' } }, 'Endorsement ' + (a.endorsement || 'needed').toLowerCase()));
    if (foot.length) card.appendChild(h('div', { class: 'foot' }, foot));
    return card;
  }

  function traditionSection(A, L) {
    const t = C.traditionYears(A, L, S.settings.tradition || CFG.tradition);
    const tcfg = t.targets;
    const rows = t.years.map(y => ({ y: y.label + (y.current ? ' (current)' : ''), range: C.fmtDate(y.from) + ' – ' + C.fmtDate(y.to), work: hrs(y.work), community: hrs(y.community), campus: hrs(y.campus), flex: hrs(y.flex), total: hrs(y.total), met: y.met, past: y.past, future: y.from > C.todayISO() }));
    return U.section('Cornell Tradition by fellowship year', [btn('Edit targets & dates', { size: 'sm', kind: 'ghost', onClick: () => U.navigate('settings') })],
      h('p', { class: 'small ink2', style: { marginBottom: '10px' } }, 'Each fellowship year needs ' + tcfg.workHours + ' h paid work, ' + tcfg.serviceHours + ' h service (at least ' + tcfg.communityHours + ' h community service, the rest community or campus), and ' + tcfg.flexHours + ' flex hours of either, for ' + tcfg.totalHours + ' h in total, plus a ' + tcfg.minGpa + ' cumulative GPA. Hours count only between the Sunday before fall classes and the end of spring classes. Research and for-credit activities never count. Off-campus hours need a supervisor endorsement in the spring re-application.'),
      U.table({ cols: [{ label: 'Year', key: 'y' }, { label: 'Dates', key: 'range' }, { label: 'Work h', key: 'work', num: true }, { label: 'Community h', key: 'community', num: true }, { label: 'Campus h', key: 'campus', num: true }, { label: 'Flex h', key: 'flex', num: true }, { label: 'Total h', key: 'total', num: true }, { label: 'Status', render: r => r.met ? chip('Met', 'good') : r.future ? chip('Not started', 'outline') : r.past ? chip('Short', 'bad') : chip('In progress', 'warn') }], rows }),
      t.outside ? h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, hrs(t.outside) + ' tagged hours fall outside every fellowship year (summer or before Cornell) and are not counted.') : null);
  }

  function renderActivityDetail(main, id) {
    const a = actById(id);
    if (!a) { main.appendChild(U.empty('That activity no longer exists.', btn('Back to activities', { onClick: () => U.navigate('activities') }))); return; }
    const L = logs().filter(l => l.activityId === a.id), cf = countFrom();
    const hh = C.activityHours(a, S.all('logs'), cf);
    const est = C.estimatedHours(a);
    main.appendChild(h('div', { style: { marginBottom: '10px' } }, btn('All activities', { icon: 'back', kind: 'ghost', size: 'sm', onClick: () => U.navigate('activities') })));
    main.appendChild(U.pageHead(h('span', null, a.mostMeaningful ? h('span', { class: 'star' }, '★ ') : null, a.name), [a.role, a.org, a.location].filter(Boolean).join(' · '), [
      btn('Log hours', { kind: 'primary', icon: 'log', onClick: () => openLogModal({ activityId: a.id }) }),
      btn('Edit', { icon: 'edit', onClick: () => openActivityModal(a) }),
      btn('', { icon: 'trash', kind: 'danger', title: 'Delete activity', onClick: async () => { if (await deleteActivity(a)) U.navigate('activities'); } }),
    ]));
    main.appendChild(h('div', { class: 'chip-row', style: { marginBottom: '14px' } }, catChip(a.category), statusChip(a.status), chip(C.fmtRange(a.start, a.end, a.ongoing), 'outline'), a.amcasType ? chip(CFG.amcasTypeAliases[a.amcasType] || a.amcasType, 'outline') : null, a.tradition ? chip('Tradition · ' + tradLabel(a.tradition) + (a.endorsement ? ' · endorsement ' + a.endorsement.toLowerCase() : ''), 'accent') : null, hsOnly(a) ? chip('Ended before college: AMCAS guidance says high-school-only experiences are usually not listed', 'warn') : a.startedInHS ? chip('Began in high school', 'outline') : null, a.includeAmcas === false ? chip('Not on AMCAS', 'warn') : null));
    const months = C.monthlySeries([a], L, 12);
    main.appendChild(h('div', { class: 'grid grid-kpi' },
      U.tile({ label: 'Hours ' + countFromLabel(), value: hrs(hh.counted) }),
      U.tile({ label: 'Hours all time', value: hrs(hh.all), detail: a.startedInHS ? 'includes high school' : undefined }),
      U.tile({ label: 'Estimated from commitment', value: est ? '~' + C.fmtNum(est) : '—', detail: a.hoursPerWeek ? a.hoursPerWeek + ' h/wk × ' + (a.weeksPerYear || 52) + ' wk/yr' : 'set hours per week to estimate' }),
      U.tile({ label: 'Entries', value: String(L.length), detail: L.length ? 'last: ' + C.fmtDate(L[0].date) : 'nothing logged' })));
    const ready = C.amcasEntries([a], S.all('logs'), cf)[0];
    const kv = h('dl', { class: 'kv' });
    const add = (k, v) => { if (v) { kv.appendChild(h('dt', null, k)); kv.appendChild(h('dd', null, v)); } };
    add('Contact', [a.contactName, a.contactTitle].filter(Boolean).join(', '));
    add('Email', a.contactEmail); add('Phone', a.contactPhone);
    add('Commitment', a.hoursPerWeek ? a.hoursPerWeek + ' h/wk, ' + (a.weeksPerYear || 52) + ' wk/yr' : '');
    const left = h('div', { class: 'card stack' }, h('div', { class: 'card-title' }, 'AMCAS description'),
      a.description ? h('p', { class: 'text-wrap', style: { whiteSpace: 'pre-wrap' } }, a.description) : h('p', { class: 'muted' }, 'No description yet. Write it while the details are fresh.'),
      h('div', { class: 'tiny ' + ((a.description || '').length > CFG.amcas.descriptionChars ? 'err' : 'muted') }, (a.description || '').length + ' / ' + CFG.amcas.descriptionChars + ' characters'),
      a.bullets ? h('div', null, h('div', { class: 'eyebrow', style: { margin: '8px 0 4px' } }, 'Resume bullets'), h('ul', { style: { margin: 0, paddingLeft: '18px' } }, a.bullets.split('\n').filter(Boolean).map(b => h('li', { class: 'small' }, b.replace(/^[-•]\s*/, ''))))) : null,
      a.mostMeaningful ? h('div', null, h('div', { class: 'eyebrow', style: { margin: '8px 0 4px' } }, 'Most meaningful essay'), a.meaningfulEssay ? h('p', { class: 'small text-wrap', style: { whiteSpace: 'pre-wrap' } }, a.meaningfulEssay) : h('p', { class: 'muted small' }, 'Not drafted yet.'), h('div', { class: 'tiny ' + ((a.meaningfulEssay || '').length > CFG.amcas.meaningfulChars ? 'err' : 'muted') }, (a.meaningfulEssay || '').length + ' / ' + CFG.amcas.meaningfulChars)) : null,
      a.notes ? h('div', null, h('div', { class: 'eyebrow', style: { margin: '8px 0 4px' } }, 'Private notes'), h('p', { class: 'small text-wrap', style: { whiteSpace: 'pre-wrap' } }, a.notes)) : null);
    const right = h('div', { class: 'card stack' }, h('div', { class: 'card-title' }, 'Contact & readiness'), kv.childElementCount ? kv : h('p', { class: 'muted small' }, 'No contact saved.'),
      ready.missing.length ? h('div', { class: 'todo' }, icon('warn', 'ic-sm'), h('span', null, 'Missing for AMCAS: ' + ready.missing.join(', '))) : h('div', { class: 'chip-row' }, chip('AMCAS fields complete', 'good', { icon: 'check' })),
      h('div', null, h('div', { class: 'eyebrow', style: { margin: '6px 0 4px' } }, 'Hours per month'), CH.barChart({ rows: months.map(m => ({ label: m.label, value: C.round1(m.total) })), unit: 'h', height: 150, labelHeader: 'Month' })));
    main.appendChild(h('div', { class: 'grid grid-2', style: { marginTop: '14px' } }, left, right));
    if (a.category === 'shadowing' && L.length) {
      const byPhys = {};
      for (const l of L) {
        const key = ((l.physician || '').trim() || 'Physician not recorded') + '|' + (l.specialty || '').trim();
        if (!byPhys[key]) byPhys[key] = { physician: (l.physician || '').trim() || 'Physician not recorded', specialty: (l.specialty || '').trim(), settings: new Set(), hours: 0, sessions: 0, first: l.date, last: l.date };
        const r = byPhys[key]; r.hours += Number(l.hours) || 0; r.sessions += 1; if (l.setting) r.settings.add(l.setting);
        if (l.date < r.first) r.first = l.date; if (l.date > r.last) r.last = l.date;
      }
      const rows = Object.values(byPhys).sort((x, y) => y.hours - x.hours);
      main.appendChild(U.section('Physicians shadowed', null, U.table({ cols: [
        { label: 'Physician', render: r => h('span', { class: r.physician === 'Physician not recorded' ? 'muted' : 'b' }, r.physician) },
        { label: 'Specialty', render: r => h('span', null, r.specialty || '—', r.specialty && CFG.primaryCareWords.some(w => r.specialty.toLowerCase().includes(w)) ? chip('primary care', 'good') : null) },
        { label: 'Setting', render: r => Array.from(r.settings).join(', ') },
        { label: 'Sessions', num: true, render: r => String(r.sessions) },
        { label: 'Hours', num: true, render: r => hrs(r.hours) },
        { label: 'Dates', render: r => r.first === r.last ? C.fmtDate(r.first) : C.fmtDate(r.first) + ' – ' + C.fmtDate(r.last) },
      ], rows }), h('p', { class: 'tiny muted', style: { marginTop: '6px' } }, 'Interviewers and secondaries ask who you shadowed and for how long. Record the physician and specialty on every entry.')));
    }
    const list = h('div', { class: 'list' });
    for (const l of L) list.appendChild(logItem(l, { hideActivity: true }));
    main.appendChild(U.section('Logged entries · ' + L.length, [btn('Log hours', { size: 'sm', icon: 'log', onClick: () => openLogModal({ activityId: a.id }) })], L.length ? list : U.empty('Nothing logged for this activity yet.')));
  }

  // ---------- ACADEMICS ----------
  function courseSpec(existing) {
    const terms = Array.from(new Set(S.all('courses').map(c => c.term).filter(Boolean))).sort((a, b) => C.termOrder(b) - C.termOrder(a));
    const nextTerms = suggestTerms();
    const all = Array.from(new Set(terms.concat(nextTerms)));
    return [
      { key: 'term', label: 'Term', type: 'select', options: all.concat(['AP / transfer credit']), required: true, default: existing && existing.term || (terms[0] || nextTerms[0]), help: 'Write "Fall 2027" style names so terms sort correctly.' },
      { key: 'termOther', label: 'Or type a new term', type: 'text', placeholder: 'Summer 2027' },
      { key: 'code', label: 'Course code', type: 'text', required: true, placeholder: 'CHEM 2070' },
      { key: 'title', label: 'Title', type: 'text', placeholder: 'General Chemistry I' },
      { key: 'credits', label: 'Credits', type: 'number', step: 0.5, min: 0, placeholder: '4' },
      { key: 'grade', label: 'Grade', type: 'select', options: CFG.gradeOptions.map(g => ({ value: g, label: g === 'IP' ? 'In progress' : g === 'S' ? 'S (satisfactory)' : g === 'U' ? 'U (unsatisfactory)' : g === 'AP' ? 'AP credit' : g === 'TR' ? 'Transfer credit' : g })), default: 'IP' },
      { key: 'bcpm', label: 'Counts as BCPM (biology, chemistry, physics, math) for AMCAS', type: 'checkbox', full: true },
      { key: 'prereq', label: 'Satisfies prerequisite', type: 'select', options: [{ value: '', label: 'Detect from course code' }].concat(CFG.prereqs.map(p => ({ value: p.key, label: p.label })), [{ value: 'none', label: 'None' }]) },
      { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Professor, lab section, letter-writer potential…' },
    ];
  }
  function suggestTerms() {
    const start = C.parseISO(S.settings.profile && S.settings.profile.collegeStart || CFG.student.collegeStart) || new Date();
    const out = [];
    for (let y = start.getFullYear(); y <= start.getFullYear() + 4; y++) { out.push('Fall ' + y); out.push('Spring ' + (y + 1)); out.push('Summer ' + (y + 1)); }
    const now = new Date();
    const cur = now.getMonth() >= 7 ? 'Fall ' + now.getFullYear() : now.getMonth() >= 5 ? 'Summer ' + now.getFullYear() : 'Spring ' + now.getFullYear();
    return [cur].concat(out.filter(t => t !== cur));
  }
  function openCourseModal(existing) {
    const f = U.form(courseSpec(existing), existing ? Object.assign({}, existing, { bcpm: !!existing.bcpm }) : {});
    let bcpmTouched = !!existing;
    f.on('bcpm', 'change', () => { bcpmTouched = true; });
    f.on('code', 'input', () => { if (!bcpmTouched) f.get('bcpm').checked = C.isBCPMCode(f.value('code')); });
    U.openModal({ title: existing ? 'Edit course' : 'Add course', body: f.el, sticky: true, actions: [
      { label: 'Cancel' },
      { label: existing ? 'Save changes' : 'Add course', kind: 'primary', onClick: async () => {
        const v = f.read(); if (!v) return false;
        if (v.termOther) v.term = v.termOther;
        delete v.termOther;
        v.code = v.code.toUpperCase().replace(/\s+/g, ' ');
        v.credits = v.credits === '' ? 0 : v.credits;
        await S.save('courses', Object.assign({}, existing || {}, v));
        U.toast('Course saved');
        return true;
      } },
    ] });
  }
  const academics = { key: 'academics', title: 'Academics', render(main) {
    const courses = S.all('courses');
    const acad = C.academicSummary(courses);
    main.appendChild(U.pageHead('Academics', 'Grades on two scales (Cornell counts A+ as 4.3, AMCAS caps it at 4.0), your BCPM science GPA, and the standard MD prerequisites.', [btn('Add course', { kind: 'primary', icon: 'log', onClick: () => openCourseModal() })]));
    main.appendChild(h('div', { class: 'grid grid-kpi' },
      U.tile({ label: 'Cornell cumulative GPA', value: C.fmtGPA(acad.cornell.gpa), detail: acad.cornell.credits + ' graded credits' }),
      U.tile({ label: 'AMCAS cumulative GPA', value: C.fmtGPA(acad.amcas.gpa), detail: 'all graded courses' }),
      U.tile({ label: 'AMCAS BCPM GPA', value: C.fmtGPA(acad.bcpm.gpa), detail: acad.bcpm.credits + ' BCPM credits' }),
      U.tile({ label: 'AMCAS AO GPA', value: C.fmtGPA(acad.ao.gpa), detail: 'all other courses' }),
      U.tile({ label: 'Credits earned', value: String(acad.creditsEarned), detail: acad.creditsInProgress + ' in progress' }),
      (function () { const hon = C.latinHonors(acad.cornell.gpa); const next = CFG.latinHonors.slice().reverse().find(x => acad.cornell.gpa !== null && acad.cornell.gpa < x.min); return U.tile({ label: 'Latin honors (final GPA)', value: hon ? hon.label : (acad.cornell.gpa === null ? '—' : 'none yet'), detail: next ? 'next tier ' + next.label + ' at ' + next.min.toFixed(2) : 'cum laude 3.50 · magna 3.75 · summa 4.00' }); })()));
    const gradedTerms = acad.terms.filter(t => t.cornell !== null && t.term !== 'AP / transfer credit');
    if (gradedTerms.length >= 2) {
      main.appendChild(U.section('GPA by term', null, h('div', { class: 'card' }, CH.lineChart({ labels: gradedTerms.map(t => t.term), series: [
        { label: 'Cornell term GPA', color: 'var(--s1)', values: gradedTerms.map(t => t.cornell === null ? null : C.round1(t.cornell * 100) / 100) },
        { label: 'BCPM term GPA (AMCAS)', color: 'var(--s2)', values: gradedTerms.map(t => t.bcpm === null ? null : Math.round(t.bcpm * 100) / 100) },
      ], yMin: 2, yMax: 4.3, yFormat: v => v.toFixed(2), labelHeader: 'Term', ariaLabel: 'GPA by term' }))));
    }
    if (!courses.length) main.appendChild(U.section('Courses', null, U.empty('No courses yet. Add this semester\'s courses with grade "In progress" and update them when grades post.', btn('Add course', { kind: 'primary', onClick: () => openCourseModal() }))));
    for (const t of acad.terms.slice().reverse()) {
      const rows = t.courses.slice().sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      const stat = C.amcasStatus(t.term, S.settings.profile && S.settings.profile.collegeStart);
      const head = [stat ? chip('AMCAS ' + stat, 'accent') : null, t.cornell !== null ? chip('Cornell ' + C.fmtGPA(t.cornell), 'outline') : null, t.bcpm !== null ? chip('BCPM ' + C.fmtGPA(t.bcpm), 'outline') : null, chip((t.credits + t.inProgress) + ' credits', 'outline')];
      main.appendChild(U.section(t.term, head, U.table({ cols: [
        { label: 'Course', render: r => h('span', { class: 'b' }, r.code) },
        { label: 'Title', render: r => r.title || '' },
        { label: 'Credits', num: true, render: r => String(r.credits || 0) },
        { label: 'Grade', render: r => (r.grade || '').toUpperCase() === 'IP' ? chip('In progress', 'warn') : h('span', { class: 'b' }, r.grade || '—') },
        { label: 'BCPM', render: r => r.bcpm ? chip('BCPM', 'accent') : '' },
        { label: 'Prereq', render: r => { const p = CFG.prereqs.find(x => x.key === r.prereq); return p ? p.label : (r.prereq === 'none' ? '' : (C.prereqStatus([r]).find(x => x.courses.length) || {}).label || ''); } },
        { label: '', class: 'nowrap', render: r => h('div', { class: 'row', style: { flexWrap: 'nowrap' }, onClick: e => e.stopPropagation() }, editDeleteButtons(() => openCourseModal(r), () => deleteDoc('courses', r.id, r.code))) },
      ], rows, onRow: r => openCourseModal(r) })));
    }
    const pre = C.prereqStatus(courses);
    const list = h('div', { class: 'card pad-0', style: { padding: '0 16px' } });
    for (const p of pre) list.appendChild(h('div', { class: 'prq is-' + p.state }, h('div', { class: 'pin' }, p.state === 'done' ? icon('check', 'ic-sm') : p.state === 'progress' ? '…' : ''),
      h('div', null, h('div', { class: 'b' }, p.label), h('div', { class: 'hint' }, p.courses.length ? p.courses.map(c => c.code + (c.grade && c.grade !== 'IP' ? ' (' + c.grade + ')' : ' (in progress)')).join(', ') : p.hint)),
      chip(p.state === 'done' ? 'Done' : p.state === 'progress' ? 'In progress' : 'Not yet', p.state === 'done' ? 'good' : p.state === 'progress' ? 'warn' : 'outline')));
    main.appendChild(U.section('MD prerequisites', null, list, h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, 'Detected from course codes; pin a course to a requirement in its edit form when the match is wrong. Requirements vary by school: check each school\'s list in the MSAR before applying.')));
    main.appendChild(U.section('How the GPAs differ', null, h('div', { class: 'note' }, h('b', null, 'Cornell'), ' counts A+ as 4.3 and excludes S/U, W and INC. ', h('b', null, 'AMCAS'), ' recomputes every grade you ever received: A+ becomes 4.0, every attempt of a repeated course counts, S and AP credit are excluded (reported as supplemental hours), and a U may be computed as an F. It splits the result into BCPM (biology, chemistry, physics, math) and AO (all other) by course content, and by year: AMCAS assigns FR/SO/JR/SR by cumulative credits (0–35, 36–65, 66–95, 96+), so the year chips here, which follow the academic year, are a guide only. The BCPM GPA is what admissions committees screen on first. The Bio Sci major requires letter grades for every major course; CALS first-years may take one elective S/U per semester.')));
  } };

  // ---------- RESEARCH & PUBLICATIONS ----------
  function pubSpec() {
    return [
      { key: 'title', label: 'Title', type: 'text', required: true, full: true },
      { key: 'type', label: 'Type', type: 'select', options: CFG.pubTypes, required: true, default: 'Publication' },
      { key: 'role', label: 'Your role', type: 'text', placeholder: 'First author, co-author, presenter' },
      { key: 'venue', label: 'Journal / conference', type: 'text', placeholder: 'Journal of Student Research 13(4)' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'advisor', label: 'Advisor / PI', type: 'text' },
      { key: 'activityId', label: 'Related research activity', type: 'select', groups: activityGroups(true), placeholder: 'None' },
      { key: 'citation', label: 'Full citation', type: 'textarea', full: true, rows: 2, placeholder: 'Jeon, J. (2024). Title. Journal, 13(4). https://doi.org/…' },
      { key: 'url', label: 'Link (DOI or URL)', type: 'text', full: true },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 2 },
    ];
  }
  const research = { key: 'research', title: 'Research & publications', render(main) {
    const A = acts().filter(a => a.category === 'research'), L = logs(), cf = countFrom();
    const pubs = S.all('pubs').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    main.appendChild(U.pageHead('Research & publications', 'Labs and projects live under Activities; this page adds the outputs: papers, posters, talks and conferences.', [btn('Add publication or poster', { kind: 'primary', icon: 'log', onClick: () => openDocModal('pubs', 'publication', pubSpec()) }), btn('New research activity', { onClick: () => openActivityModal({ category: 'research', amcasType: amcasTypeFor('research') }) })]));
    const grid = h('div', { class: 'grid grid-cards' });
    for (const a of A) grid.appendChild(activityCard(a, L, cf));
    main.appendChild(U.section('Research experiences', null, A.length ? grid : U.empty('No research activity yet. Add the lab or project first, then log hours against it.')));
    const list = h('div', { class: 'list' });
    for (const p of pubs) list.appendChild(U.listItem({ title: p.title, sub: [p.role, p.venue].filter(Boolean).join(' · '), meta: [chip(p.type, p.type === 'Publication' ? 'good' : p.type.includes('review') ? 'warn' : 'outline'), hsEra(p.date) ? chip('High-school era', 'outline') : null, p.date ? C.fmtDate(p.date, { month: 'short', year: 'numeric' }) : null, p.advisor ? 'with ' + p.advisor : null, p.url ? h('a', { href: p.url, target: '_blank', rel: 'noopener' }, 'link') : null], actions: editDeleteButtons(() => openDocModal('pubs', 'publication', pubSpec(), p), () => deleteDoc('pubs', p.id, p.title)) }));
    main.appendChild(U.section('Publications, posters & presentations · ' + pubs.length, null, pubs.length ? list : U.empty('Nothing yet. Posters and talks count; add them as soon as they are accepted.')));
    main.appendChild(U.section('', null, h('div', { class: 'note' }, 'AMCAS lists ', h('b', null, 'Publications'), ', ', h('b', null, 'Presentations/Posters'), ' and ', h('b', null, 'Conferences Attended'), ' as separate experience types. Keep full citations here so you can paste them later; a manuscript under review is listed as "submitted", never as published.')));
  } };

  // ---------- AWARDS ----------
  function awardSpec() {
    return [
      { key: 'name', label: 'Award or honor', type: 'text', required: true, full: true },
      { key: 'org', label: 'Awarding organization', type: 'text' },
      { key: 'level', label: 'Level', type: 'select', options: CFG.awardLevels, default: 'University' },
      { key: 'date', label: 'Date received', type: 'date' },
      { key: 'amount', label: 'Amount ($, if a scholarship)', type: 'number', min: 0, step: 1 },
      { key: 'selectivity', label: 'Selectivity', type: 'text', placeholder: '1 of 10 from 13,000 applicants', full: true },
      { key: 'description', label: 'Description', type: 'textarea', full: true, rows: 3, placeholder: 'What it recognizes and why you got it.' },
      { key: 'renewalDue', label: 'Next renewal deadline (if renewable)', type: 'date' },
      { key: 'renewalConditions', label: 'Renewal conditions', type: 'text', placeholder: 'Full-time enrollment, GPA floor, annual form…' },
    ];
  }
  function certSpec() {
    return [
      { key: 'name', label: 'Certification or training', type: 'select', options: CFG.certSuggestions.concat(['Other']), required: true, full: true },
      { key: 'nameOther', label: 'If other, name it', type: 'text', full: true },
      { key: 'issuer', label: 'Issuer', type: 'text', placeholder: 'American Heart Association' },
      { key: 'credential', label: 'Credential / card number', type: 'text' },
      { key: 'issued', label: 'Issued on', type: 'date' },
      { key: 'expires', label: 'Expires on', type: 'date', help: 'BLS cards usually run two years, CITI training three.' },
      { key: 'notes', label: 'Notes', type: 'text', full: true, placeholder: 'Where the PDF is saved, which site required it.' },
    ];
  }
  function certStatus(c) {
    if (!c.expires) return { label: 'No expiry', kind: 'outline' };
    const days = C.daysBetween(C.parseISO(C.todayISO()), C.parseISO(c.expires));
    if (days < 0) return { label: 'Expired ' + C.fmtDate(c.expires), kind: 'bad', days };
    if (days <= 60) return { label: 'Expires in ' + days + ' days', kind: 'warn', days };
    return { label: 'Valid until ' + C.fmtDate(c.expires), kind: 'good', days };
  }
  const awards = { key: 'awards', title: 'Honors & awards', render(main) {
    const list = S.all('awards').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    main.appendChild(U.pageHead('Honors, awards & certifications', 'Scholarships, fellowships, competition results, and the certifications clinical sites ask for. AMCAS groups honors under one "Honors/Awards/Recognition" entry, so the details live here.', [btn('Add award', { kind: 'primary', icon: 'log', onClick: () => openDocModal('awards', 'award', awardSpec()) }), btn('Add certification', { icon: 'log', onClick: () => openCertModal() })]));
    const el = h('div', { class: 'list' });
    for (const a of list) el.appendChild(U.listItem({ title: a.name, sub: [a.org, a.selectivity].filter(Boolean).join(' · '), meta: [chip(a.level || 'Other', 'outline'), hsEra(a.date) ? chip('High-school era', 'outline') : null, a.date ? C.fmtDate(a.date, { month: 'short', year: 'numeric' }) : 'date not set', a.amount ? '$' + C.fmtNum(a.amount) : null, a.renewalDue ? chip('Renewal due ' + C.fmtDate(a.renewalDue), C.daysBetween(C.parseISO(C.todayISO()), C.parseISO(a.renewalDue)) <= 45 ? 'warn' : 'outline') : null, a.description ? h('span', { class: 'text-wrap' }, a.description) : null, a.renewalConditions ? h('span', { class: 'text-wrap' }, 'Renewal: ' + a.renewalConditions) : null], actions: editDeleteButtons(() => openDocModal('awards', 'award', awardSpec(), a), () => deleteDoc('awards', a.id, a.name)) }));
    main.appendChild(U.section('Honors & awards · ' + list.length, null, list.length ? el : U.empty('No honors yet. Latin honors and scholarships count.')));
    const certs = S.all('certs').sort((a, b) => (a.expires || '9999').localeCompare(b.expires || '9999'));
    const cl = h('div', { class: 'list' });
    for (const c of certs) { const stt = certStatus(c); cl.appendChild(U.listItem({ title: c.name === 'Other' ? (c.nameOther || 'Certification') : c.name, sub: [c.issuer, c.credential].filter(Boolean).join(' · '), meta: [chip(stt.label, stt.kind), c.issued ? 'issued ' + C.fmtDate(c.issued) : null, c.notes], actions: editDeleteButtons(() => openCertModal(c), () => deleteDoc('certs', c.id, c.name)) })); }
    main.appendChild(U.section('Certifications & training · ' + certs.length, null, certs.length ? cl : U.empty('None yet. BLS/CPR, HIPAA and CITI training are the usual first three; log expiry dates so renewals never lapse before a clinical start date.')));
  } };
  function openCertModal(existing) {
    const f = U.form(certSpec(), existing || {});
    const upd = () => f.show('nameOther', f.value('name') === 'Other');
    f.on('name', 'change', upd); upd();
    U.openModal({ title: existing ? 'Edit certification' : 'Add certification', body: f.el, sticky: true, actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: async () => { const v = f.read(); if (!v) return false; if (v.issued && v.expires && v.expires < v.issued) { f.setError('expires', 'Expires before it was issued'); return false; } await S.save('certs', Object.assign({}, existing || {}, v)); U.toast('Saved'); return true; } }] });
  }

  // ---------- RESUME & AMCAS ----------
  function currentResume() { return S.all('resume').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null; }
  function generateResume() {
    const st = S.settings, p = st.profile || CFG.student, A = acts(), L = S.all('logs'), cf = countFrom();
    const lines = [];
    lines.push((p.name || CFG.student.name).toUpperCase());
    lines.push([p.email || CFG.student.email, p.phone, p.linkedin].filter(Boolean).join(' | '));
    lines.push('');
    lines.push('EDUCATION');
    lines.push((p.school || CFG.student.school) + ' — ' + (p.major || CFG.student.major) + ', expected May ' + (p.classYear || CFG.student.classYear));
    const acad = C.academicSummary(S.all('courses'));
    if (acad.cornell.gpa !== null) lines.push('GPA ' + C.fmtGPA(acad.cornell.gpa) + (acad.bcpm.gpa !== null ? ' (science ' + C.fmtGPA(acad.bcpm.gpa) + ')' : ''));
    if (p.programs && p.programs.length) lines.push((Array.isArray(p.programs) ? p.programs : String(p.programs).split(/;|,/)).join('; '));
    if (p.hsSummary) lines.push(p.hsSummary);
    const section = (title, items) => {
      if (!items.length) return;
      lines.push(''); lines.push(title);
      for (const a of items) {
        const hh = C.activityHours(a, L, cf);
        const commit = a.hoursPerWeek ? a.hoursPerWeek + ' hrs/wk' + (a.weeksPerYear ? ', ' + a.weeksPerYear + ' wks/yr' : '') : (hh.all ? Math.round(hh.all) + ' hrs total' : '');
        lines.push(a.name + (a.location ? ' — ' + a.location : ''));
        lines.push('  ' + [a.role, commit, C.fmtRange(a.start, a.end, a.ongoing)].filter(Boolean).join(' | '));
        for (const b of (a.bullets || '').split('\n').filter(Boolean)) lines.push('  • ' + b.replace(/^[-•]\s*/, ''));
      }
    };
    const awardsList = S.all('awards').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (awardsList.length) { lines.push(''); lines.push('HONORS & AWARDS'); for (const a of awardsList) { lines.push(a.name + (a.org ? ' — ' + a.org : '') + (a.date ? ' (' + C.fmtDate(a.date, { year: 'numeric' }) + ')' : '')); if (a.description) lines.push('  • ' + a.description); } }
    section('CLINICAL EXPERIENCE', A.filter(a => a.category === 'clinical' || a.category === 'shadowing'));
    section('RESEARCH EXPERIENCE', A.filter(a => a.category === 'research'));
    const pubs = S.all('pubs').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (pubs.length) { lines.push(''); lines.push('PUBLICATIONS & PRESENTATIONS'); for (const pb of pubs) lines.push('• ' + (pb.citation || [pb.title, pb.venue, pb.date ? C.fmtDate(pb.date, { year: 'numeric' }) : ''].filter(Boolean).join('. ')) + (pb.type !== 'Publication' ? ' [' + pb.type + ']' : '')); }
    section('LEADERSHIP & SERVICE', A.filter(a => ['leadership', 'service', 'teaching', 'club'].includes(a.category)));
    section('WORK EXPERIENCE', A.filter(a => a.category === 'work'));
    section('ADDITIONAL', A.filter(a => ['hobby', 'other'].includes(a.category)));
    lines.push(''); lines.push('SKILLS & INTERESTS');
    if (p.languages) lines.push('Languages: ' + p.languages);
    if (p.certifications) lines.push('Certifications: ' + p.certifications);
    if (p.interests) lines.push('Interests: ' + p.interests);
    return lines.join('\n');
  }
  function amcasWorksheet() {
    const entries = C.amcasEntries(acts(), S.all('logs'), countFrom());
    const out = [];
    out.push('AMCAS WORK & ACTIVITIES WORKSHEET — ' + C.fmtDate(C.todayISO()));
    out.push('Up to ' + CFG.amcas.maxEntries + ' entries, ' + CFG.amcas.mostMeaningful + ' most meaningful. Descriptions ' + CFG.amcas.descriptionChars + ' chars, most-meaningful essays ' + CFG.amcas.meaningfulChars + ' chars.');
    entries.forEach((e, i) => {
      const a = e.activity;
      out.push(''); out.push((i + 1) + '. ' + a.name + (a.mostMeaningful ? '  ★ MOST MEANINGFUL' : ''));
      out.push('   Type: ' + (a.amcasType || '(not set)'));
      out.push('   Organization: ' + (a.org || a.name) + (a.location ? ' — ' + a.location : ''));
      out.push('   Dates: ' + C.fmtRange(a.start, a.end, a.ongoing));
      out.push('   Hours: ' + Math.round(e.hours.counted) + ' ' + countFromLabel() + (e.hours.all !== e.hours.counted ? ' (' + Math.round(e.hours.all) + ' all time)' : ''));
      out.push('   Contact: ' + [a.contactName, a.contactTitle, a.contactEmail, a.contactPhone].filter(Boolean).join(', ') || '(none)');
      out.push('   Description (' + (a.description || '').length + '/' + CFG.amcas.descriptionChars + '): ' + (a.description || '(none)'));
      if (a.mostMeaningful) out.push('   Most meaningful essay (' + (a.meaningfulEssay || '').length + '/' + CFG.amcas.meaningfulChars + '): ' + (a.meaningfulEssay || '(none)'));
      if (hsOnly(a)) out.push('   NOTE: ended before college; AAMC guidance says high-school-only experiences are usually not listed.');
      if (e.missing.length) out.push('   MISSING: ' + e.missing.join(', '));
    });
    const awardsList = S.all('awards');
    if (awardsList.length) { out.push(''); out.push('Honors/Awards/Recognitions (one combined entry):'); for (const a of awardsList) out.push('   • ' + a.name + (a.org ? ', ' + a.org : '') + (a.date ? ' (' + C.fmtDate(a.date, { year: 'numeric' }) + ')' : '')); }
    const pubs = S.all('pubs');
    if (pubs.length) { out.push(''); out.push('Publications / Presentations:'); for (const p of pubs) out.push('   • [' + p.type + '] ' + (p.citation || p.title)); }
    return out.join('\n');
  }
  const resumeView = { key: 'resume', title: 'Resume & AMCAS', render(main, params) {
    const st = U.App.state.resume = U.App.state.resume || { tab: 'resume', draft: null, label: '' };
    if (params && params.tab) st.tab = params.tab;
    main.appendChild(U.pageHead('Resume & AMCAS', 'Keep the resume current here; a draft can be rebuilt from your activities any time. The AMCAS worksheet shows exactly what you will have to type into the application.'));
    const seg = h('div', { class: 'seg', style: { marginBottom: '16px' } }, h('button', { class: st.tab === 'resume' ? 'active' : '', type: 'button', onClick: () => { st.tab = 'resume'; U.render(); } }, 'Resume'), h('button', { class: st.tab === 'amcas' ? 'active' : '', type: 'button', onClick: () => { st.tab = 'amcas'; U.render(); } }, 'AMCAS worksheet'), h('button', { class: st.tab === 'essays' ? 'active' : '', type: 'button', onClick: () => { st.tab = 'essays'; U.render(); } }, 'Essays'));
    main.appendChild(seg);
    if (st.tab === 'essays') { renderEssays(main, st); return; }
    if (st.tab === 'amcas') {
      const entries = C.amcasEntries(acts(), S.all('logs'), countFrom());
      const text = amcasWorksheet();
      main.appendChild(h('div', { class: 'row spread', style: { marginBottom: '10px' } }, h('div', { class: 'chip-row' }, chip(entries.length + ' of ' + CFG.amcas.maxEntries + ' entries', entries.length > CFG.amcas.maxEntries ? 'warn' : 'outline'), chip(acts().filter(a => a.mostMeaningful).length + ' of ' + CFG.amcas.mostMeaningful + ' most meaningful', acts().filter(a => a.mostMeaningful).length > CFG.amcas.mostMeaningful ? 'warn' : 'outline'), chip(entries.filter(e => e.missing.length).length + ' with missing fields', entries.some(e => e.missing.length) ? 'warn' : 'good')), btn('Copy worksheet', { icon: 'copy', onClick: async () => { U.toast((await U.copyText(text)) ? 'Copied' : 'Could not copy', 'ok'); } })));
      const tbl = U.table({ cols: [
        { label: '#', render: (r, i) => '' },
        { label: 'Activity', render: r => h('span', null, r.activity.mostMeaningful ? h('span', { class: 'star' }, '★ ') : null, h('span', { class: 'b' }, r.activity.name), h('div', { class: 'tiny muted' }, r.activity.amcasType || 'type not set')) },
        { label: 'Dates', render: r => C.fmtRange(r.activity.start, r.activity.end, r.activity.ongoing) },
        { label: 'Hours', num: true, render: r => h('span', null, String(Math.round(r.hours.counted)), r.hours.all !== r.hours.counted ? h('div', { class: 'tiny muted' }, Math.round(r.hours.all) + ' all') : null) },
        { label: 'Description', render: r => h('span', { class: (r.activity.description || '').length > CFG.amcas.descriptionChars ? 'err' : (r.activity.description ? '' : 'muted') }, (r.activity.description || '').length + '/' + CFG.amcas.descriptionChars) },
        { label: 'Missing', render: r => h('span', null, hsOnly(r.activity) ? chip('Ended before college', 'warn') : null, r.missing.length ? h('span', { class: 'tiny', style: { color: 'var(--warn-ink)' } }, (hsOnly(r.activity) ? ' ' : '') + r.missing.join(', ')) : (hsOnly(r.activity) ? null : chip('Ready', 'good'))) },
      ], rows: entries, onRow: r => U.navigate('activities', { id: r.activity.id }) });
      tbl.querySelectorAll('tbody tr').forEach((tr, i) => { tr.firstChild.textContent = String(i + 1); });
      main.appendChild(tbl);
      main.appendChild(U.section('Worksheet text', null, h('pre', { class: 'pre' }, text)));
      return;
    }
    const cur = currentResume();
    if (st.draft === null) st.draft = cur ? cur.text : '';
    const ta = h('textarea', { class: 'textarea tall', id: 'resume-editor', value: st.draft, spellcheck: true, onInput: e => { st.draft = e.target.value; } });
    ta.dataset.rerenderOk = '';
    const label = h('input', { class: 'input', id: 'resume-label', placeholder: 'Version label, e.g. "Fall 2026 – research apps"', value: st.label, onInput: e => { st.label = e.target.value; } });
    main.appendChild(h('div', { class: 'grid', style: { gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' } },
      h('div', { class: 'stack' },
        h('div', { class: 'row spread' }, h('div', { class: 'card-title' }, cur ? 'Editing from: ' + (cur.label || 'untitled') + ' · ' + C.fmtDate(cur.date || cur.createdAt) : 'No saved version yet'), h('span', { class: 'tiny muted num' }, st.draft.length + ' chars')),
        ta,
        h('div', { class: 'inline-form' }, h('div', { class: 'field', style: { flex: '1 1 220px' } }, label), btn('Save as new version', { kind: 'primary', icon: 'check', onClick: async () => {
          if (!st.draft.trim()) { U.toast('Nothing to save', 'bad'); return; }
          await S.save('resume', { label: st.label || ('Version ' + (S.count('resume') + 1)), date: C.todayISO(), text: st.draft });
          st.label = ''; U.toast('Version saved'); U.render();
        } }), btn('Copy', { icon: 'copy', onClick: async () => { U.toast((await U.copyText(st.draft)) ? 'Copied' : 'Could not copy'); } }), btn('Rebuild from tracker', { onClick: async () => {
          const gen = generateResume();
          if (st.draft.trim() && st.draft !== gen) { const ok = await U.confirm({ title: 'Replace the editor text?', text: 'The draft in the editor will be replaced with a resume generated from your activities, awards and publications. Saved versions are not affected.', okLabel: 'Replace' }); if (!ok) return; }
          st.draft = gen; U.render(); U.toast('Draft rebuilt. Edit, then save a version.');
        } })),
        h('p', { class: 'tiny muted' }, 'Plain text keeps the history small and pastes cleanly into Word or Google Docs. Resume bullets come from each activity\'s edit form.')),
      h('div', { class: 'stack' }, h('div', { class: 'card-title' }, 'Versions'), versionsList(st))));
    main.appendChild(U.section('Tips', null, h('div', { class: 'note' }, 'Update this every semester, not the week before an application. Add numbers to bullets (patients, hours, people led, dollars raised). Keep one line per role for commitment: "3 hrs/wk, 47 wks/yr" matches how AMCAS asks for it.')));
  } };
  function renderEssays(main, st) {
    st.essays = st.essays || {};
    const essays = [
      { id: 'personal-statement', title: 'Personal statement (AMCAS Personal Comments)', max: CFG.amcas.personalStatementChars, help: 'Why medicine, in your own moments. Draft from the journal; the limit includes spaces. Plain text only: AMCAS strips formatting.' },
      { id: 'other-impactful', title: 'Other impactful experiences', max: CFG.amcas.otherImpactfulChars, help: 'Optional AMCAS essay about challenges or context (family, finances, community, education) that shaped you.' },
    ];
    const grid = h('div', { class: 'stack' });
    for (const e of essays) {
      const doc = S.get('essays', e.id);
      const text = st.essays[e.id] !== undefined ? st.essays[e.id] : (doc ? doc.text || '' : '');
      const counter = h('span', { class: 'tiny muted num' }, text.length + ' / ' + e.max);
      const ta = h('textarea', { class: 'textarea tall', id: 'essay-' + e.id, value: text, spellcheck: true, onInput: ev => { st.essays[e.id] = ev.target.value; counter.textContent = ev.target.value.length + ' / ' + e.max; counter.classList.toggle('err', ev.target.value.length > e.max); } });
      const save = async () => { const cur = S.get('essays', e.id); if (cur && cur.text === (st.essays[e.id] !== undefined ? st.essays[e.id] : cur.text)) return; await S.save('essays', { id: e.id, text: st.essays[e.id] !== undefined ? st.essays[e.id] : text }); U.toast('Essay saved'); };
      grid.appendChild(h('div', { class: 'card stack' }, h('div', { class: 'row spread' }, h('div', { class: 'card-title' }, e.title), counter), h('p', { class: 'tiny muted' }, e.help), ta,
        h('div', { class: 'row' }, btn('Save', { kind: 'primary', size: 'sm', icon: 'check', onClick: save }), btn('Copy', { size: 'sm', icon: 'copy', onClick: async () => { U.toast((await U.copyText(ta.value)) ? 'Copied' : 'Could not copy'); } }), doc && doc.updatedAt ? h('span', { class: 'tiny muted' }, 'last saved ' + C.fmtDate(doc.updatedAt.slice(0, 10))) : null)));
    }
    main.appendChild(grid);
    main.appendChild(U.section('', null, h('div', { class: 'note' }, 'Start the personal statement the summer before you apply, from the specific moments in your journal. Readers want one or two scenes that show why medicine, not a list of activities. Characters count with spaces; AMCAS will not let you edit after submission.')));
  }
  function versionsList(st) {
    const vs = S.all('resume').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (!vs.length) return U.empty('No versions saved. Rebuild from the tracker or paste your current resume, then save.');
    const list = h('div', { class: 'list' });
    for (const v of vs) list.appendChild(U.listItem({ title: v.label || 'Untitled', meta: [C.fmtDate(v.date || v.createdAt), (v.text || '').length + ' chars'], actions: [btn('Open', { size: 'xs', onClick: () => { st.draft = v.text; U.render(); } }), btn('', { icon: 'trash', kind: 'ghost', size: 'xs', title: 'Delete version', onClick: () => deleteDoc('resume', v.id, 'this version') })] }));
    return list;
  }

  // ---------- JOURNAL ----------
  function openJournalModal(existing) {
    const spec = [
      { key: 'date', label: 'Date', type: 'date', required: true, default: C.todayISO() },
      { key: 'activityId', label: 'Related activity', type: 'select', groups: activityGroups(true), placeholder: 'None' },
      { key: 'title', label: 'Title', type: 'text', full: true, placeholder: 'The patient who asked me to stay' },
      { key: 'text', label: 'Reflection', type: 'textarea', full: true, tall: true, required: true, placeholder: 'What happened, what you felt, what you learned. No patient names or identifying details.' },
    ];
    const f = U.form(spec, existing || {});
    const selected = new Set((existing && existing.tags) || []);
    const tagRow = h('div', { class: 'field full' }, h('label', null, h('span', null, 'Tags')));
    const chipsEl = h('div', { class: 'filter-chips' });
    for (const t of CFG.journalTags) { const b = h('button', { class: 'fchip' + (selected.has(t) ? ' active' : ''), type: 'button', onClick: () => { if (selected.has(t)) selected.delete(t); else selected.add(t); b.classList.toggle('active'); } }, t); chipsEl.appendChild(b); }
    tagRow.appendChild(chipsEl); f.el.appendChild(tagRow);
    U.openModal({ title: existing ? 'Edit reflection' : 'New reflection', body: f.el, sticky: true, actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: async () => { const v = f.read(); if (!v) return false; v.tags = Array.from(selected); await S.save('journal', Object.assign({}, existing || {}, v)); U.toast('Saved'); return true; } }] });
  }
  const journal = { key: 'journal', title: 'Reflection journal', render(main) {
    const st = U.App.state.journal = U.App.state.journal || { tag: '' };
    const entries = S.all('journal').filter(e => !st.tag || (e.tags || []).includes(st.tag)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    main.appendChild(U.pageHead('Reflection journal', 'Personal statements and secondaries are built from specific moments. Write them down the week they happen.', [btn('New reflection', { kind: 'primary', icon: 'log', onClick: () => openJournalModal() })]));
    const chips = h('div', { class: 'filter-chips', style: { marginBottom: '14px' } }, h('button', { class: 'fchip' + (!st.tag ? ' active' : ''), type: 'button', onClick: () => { st.tag = ''; U.render(); } }, 'All'));
    for (const t of CFG.journalTags) { const n = S.all('journal').filter(e => (e.tags || []).includes(t)).length; if (n) chips.appendChild(h('button', { class: 'fchip' + (st.tag === t ? ' active' : ''), type: 'button', onClick: () => { st.tag = t; U.render(); } }, t + ' · ' + n)); }
    main.appendChild(chips);
    if (!entries.length) { main.appendChild(U.empty(S.count('journal') ? 'No entries with that tag.' : 'No reflections yet. Prompts: What surprised you? What did a patient teach you? When were you uncomfortable, and what did you do?', btn('Write one now', { kind: 'primary', onClick: () => openJournalModal() }))); return; }
    const list = h('div', { class: 'list' });
    for (const e of entries) list.appendChild(U.listItem({ title: e.title || C.fmtDate(e.date), sub: h('span', { style: { whiteSpace: 'pre-wrap' } }, e.text), meta: [C.fmtDate(e.date), e.activityId ? actName(e.activityId) : null].concat((e.tags || []).map(t => chip(t, 'outline'))), actions: editDeleteButtons(() => openJournalModal(e), () => deleteDoc('journal', e.id, 'this reflection')) }));
    main.appendChild(list);
  } };

  // ---------- LETTERS ----------
  function letterSpec() {
    return [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'title', label: 'Title / role', type: 'text', placeholder: 'Professor of Chemistry' },
      { key: 'type', label: 'Letter type', type: 'select', options: CFG.letterTypes, default: 'Science faculty' },
      { key: 'status', label: 'Status', type: 'select', options: CFG.letterStatuses, default: 'Potential' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'context', label: 'How they know you', type: 'text', full: true, placeholder: 'CHEM 2070 Fall 2026, office hours weekly; research assistant since…' },
      { key: 'askedOn', label: 'Asked on', type: 'date' },
      { key: 'dueOn', label: 'Needed by', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 2, placeholder: 'What to send them: resume, personal statement draft, the list of schools, deadlines.' },
    ];
  }
  const letters = { key: 'letters', title: 'Letter writers', render(main) {
    const list = S.all('letters').sort((a, b) => CFG.letterStatuses.indexOf(b.status) - CFG.letterStatuses.indexOf(a.status) || (a.name || '').localeCompare(b.name || ''));
    main.appendChild(U.pageHead('Letter writers', 'Most MD schools want two science faculty letters, one non-science faculty letter, and letters from research or clinical supervisors. Cornell\'s HPAC Letter Packet bundles 2–5 of them with a cover letter, delivered through PrivateFolio.', [btn('Add person', { kind: 'primary', icon: 'log', onClick: () => openDocModal('letters', 'letter writer', letterSpec()) })]));
    const counts = {};
    for (const l of list) counts[l.type] = (counts[l.type] || 0) + 1;
    main.appendChild(h('div', { class: 'chip-row', style: { marginBottom: '14px' } }, CFG.letterTypes.map(t => chip(t + ' · ' + (counts[t] || 0), counts[t] ? 'good' : 'outline'))));
    const el = h('div', { class: 'list' });
    for (const l of list) el.appendChild(U.listItem({ title: l.name, sub: [l.title, l.context].filter(Boolean).join(' · '), meta: [chip(l.type, 'outline'), chip(l.status, l.status === 'Submitted' || l.status === 'Confirmed' ? 'good' : l.status === 'Asked' ? 'warn' : ''), l.email, l.askedOn ? 'asked ' + C.fmtDate(l.askedOn) : null, l.dueOn ? 'due ' + C.fmtDate(l.dueOn) : null], actions: editDeleteButtons(() => openDocModal('letters', 'letter writer', letterSpec(), l), () => deleteDoc('letters', l.id, l.name)) }));
    main.appendChild(list.length ? el : U.empty('No one listed yet. Add professors whose office hours you attend and every supervisor who sees your work.'));
    main.appendChild(U.section('', null, h('div', { class: 'note' }, 'Ask in person, early in the semester you finish with them, and give writers your resume, a draft personal statement, the activity list and the deadline. A professor who taught you a year ago remembers less every month; a short update email each semester keeps the relationship warm.')));
  } };

  // ---------- TIMELINE ----------
  const timeline = { key: 'timeline', title: 'Timeline', render(main) {
    const done = S.settings.milestonesDone || {};
    const ms = C.milestoneView(allMilestones(), done);
    const gap = !!(S.settings.profile && S.settings.profile.gapYear);
    main.appendChild(U.pageHead('Timeline to medical school', gap ? 'One-gap-year plan: MCAT spring 2030, AMCAS June 2030, matriculate fall 2031. Application milestones are shifted a year later; turn this off in Settings.' : 'Straight-through plan for the Class of 2030: MCAT spring 2029, AMCAS June 2029, matriculate fall 2030. Turn on the gap-year option in Settings to shift the application milestones a year later.', [btn('Add milestone', { icon: 'log', onClick: () => openDocModal(null, 'milestone', [{ key: 'label', label: 'Milestone', type: 'text', required: true, full: true }, { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'detail', label: 'Detail', type: 'textarea', full: true, rows: 2 }]) })]));
    const next = ms.find(m => !m.done && !m.past);
    if (next) main.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'Next up'), h('div', { class: 'hero-num' }, String(next.days), h('small', null, 'days'))), h('div', { class: 'hero-side' }, h('div', { class: 'hero-stat' }, h('span', { class: 'v' }, next.label), h('span', { class: 'l' }, C.fmtDate(next.date))))));
    const tl = h('div', { class: 'tl' });
    for (const m of ms) {
      const item = h('div', { class: 'tl-item' + (m.done ? ' done' : '') + (m.past ? ' past' : '') });
      const pin = h('button', { class: 'pin', type: 'button', title: m.done ? 'Mark not done' : 'Mark done', onClick: async () => { const d = Object.assign({}, S.settings.milestonesDone || {}); if (d[m.key]) delete d[m.key]; else d[m.key] = true; await S.saveSettings({ milestonesDone: d }); } }, m.done ? icon('check', 'ic-sm') : '');
      item.appendChild(pin);
      item.appendChild(h('div', null, h('div', { class: 'when' }, C.fmtDate(m.date) + (m.done ? '' : m.past ? ' · ' + Math.abs(m.days) + ' days ago' : ' · in ' + m.days + ' days')), h('div', { class: 'row spread' }, h('div', { class: 't' }, m.label), m.custom ? btn('', { icon: 'trash', kind: 'ghost', size: 'xs', title: 'Remove', onClick: async () => { await S.saveSettings({ customMilestones: (S.settings.customMilestones || []).filter(x => x.key !== m.key) }); } }) : m.shifted ? chip('gap year', 'outline') : null), m.detail ? h('div', { class: 'd' }, m.detail) : null));
      tl.appendChild(item);
    }
    main.appendChild(tl);
  } };
  // custom milestones are saved into settings, not a collection: patch openDocModal for col === null
  const _openDocModal = openDocModal;
  openDocModal = function (col, title, spec, existing, onSaved) {
    if (col !== null) return _openDocModal(col, title, spec, existing, onSaved);
    const f = U.form(spec, existing || {});
    U.openModal({ title: 'New ' + title, body: f.el, sticky: true, actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: async () => { const v = f.read(); if (!v) return false; v.key = 'custom-' + S.newId(); await S.saveSettings({ customMilestones: (S.settings.customMilestones || []).concat([v]) }); U.toast('Milestone added'); return true; } }] });
  };

  // ---------- SETTINGS ----------
  const settings = { key: 'settings', title: 'Settings', render(main) {
    const st = S.settings, p = st.profile || {};
    main.appendChild(U.pageHead('Settings', 'Goals, counting rules, your profile and backups.'));

    // counting rule
    const cfForm = U.form([
      { key: 'rule', label: 'Count hours toward AMCAS from', type: 'radio', full: true, options: [
        { value: CFG.student.hsGraduation, label: 'High school graduation (' + C.fmtDate(CFG.student.hsGraduation) + ')', help: 'Recommended. AMCAS asks for experiences after high school; the summer before college counts.' },
        { value: CFG.student.collegeStart, label: 'First day at Cornell (' + C.fmtDate(CFG.student.collegeStart) + ')', help: 'Stricter: only hours during college.' },
        { value: 'custom', label: 'Custom date' },
        { value: '', label: 'Count everything (including high school)' },
      ], default: [CFG.student.hsGraduation, CFG.student.collegeStart, ''].includes(st.countFrom) ? st.countFrom : 'custom' },
      { key: 'custom', label: 'Custom date', type: 'date', default: st.countFrom },
    ], {});
    const updCustom = () => cfForm.show('custom', cfForm.value('rule') === 'custom');
    cfForm.el.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', updCustom)); updCustom();
    main.appendChild(U.section('Hour counting', null, h('div', { class: 'card stack' }, cfForm.el, h('div', null, btn('Save counting rule', { kind: 'primary', size: 'sm', onClick: async () => { const v = cfForm.read(); if (!v) return; const cf = v.rule === 'custom' ? v.custom : v.rule; await S.saveSettings({ countFrom: cf }); U.toast('Counting from ' + (cf ? C.fmtDate(cf) : 'the beginning')); } })),
      h('p', { class: 'tiny muted' }, 'Hours before this date stay in the ledger and show as "all time". Activities that began in high school and continued into college are still listed on AMCAS with their full date range; only the hours you report should match the rule you choose.'))));

    // goals
    const goalSpec = CFG.categories.filter(c => ['clinical', 'shadowing', 'service', 'research', 'leadership', 'teaching'].includes(c.key)).map(c => ({ key: c.key, label: c.label + ' (hours)', type: 'number', min: 0, step: 10, default: (st.goals || {})[c.key] }));
    const gf = U.form(goalSpec, {});
    main.appendChild(U.section('Hour goals by application time', null, h('div', { class: 'card stack' }, gf.el, h('div', null, btn('Save goals', { kind: 'primary', size: 'sm', onClick: async () => { const v = gf.read(); if (!v) return; const goals = {}; for (const k in v) goals[k] = v[k] === '' ? 0 : v[k]; await S.saveSettings({ goals }); U.toast('Goals saved'); } })), h('p', { class: 'tiny muted' }, 'Set a goal to 0 to hide its tile. Defaults reflect what competitive MD applicants commonly report; schools that emphasize service expect more volunteering.'))));

    // tradition
    const t = Object.assign({}, CFG.tradition, st.tradition || {});
    const windows = (t.windows && t.windows.length ? t.windows : CFG.tradition.windows);
    const tf = U.form([
      { key: 'workHours', label: 'Paid work hours per year', type: 'number', min: 0, default: t.workHours },
      { key: 'serviceHours', label: 'Service hours per year', type: 'number', min: 0, default: t.serviceHours },
      { key: 'communityHours', label: 'Of which community service (minimum)', type: 'number', min: 0, default: t.communityHours },
      { key: 'flexHours', label: 'Flex hours (work or service)', type: 'number', min: 0, default: t.flexHours },
      { key: 'totalHours', label: 'Total hours per year', type: 'number', min: 0, default: t.totalHours },
      { key: 'minGpa', label: 'Minimum cumulative GPA', type: 'number', min: 0, step: 0.1, default: t.minGpa },
    ], {});
    const wf = U.form(windows.flatMap((w, i) => [
      { key: 'label' + i, label: 'Fellowship year ' + (i + 1) + ' label', type: 'text', default: w.label },
      { key: 'from' + i, label: 'Counts from (Sunday before fall classes)', type: 'date', default: w.from },
      { key: 'to' + i, label: 'Counts through (end of spring classes)', type: 'date', default: w.to },
    ]), {});
    main.appendChild(U.section('Cornell Tradition', null, h('div', { class: 'card stack' }, h('div', { class: 'card-title' }, 'Annual targets'), tf.el, h('div', { class: 'card-title', style: { marginTop: '8px' } }, 'Fellowship-year windows'), h('p', { class: 'tiny muted' }, 'Hours count only between these dates. The defaults are estimates (the Sunday before fall classes through early May); the program announces the exact dates each year, so update them here.'), wf.el,
      h('div', null, btn('Save Tradition settings', { kind: 'primary', size: 'sm', onClick: async () => {
        const v = tf.read(), w = wf.read(); if (!v || !w) return;
        const newWindows = windows.map((x, i) => ({ label: w['label' + i] || x.label, from: w['from' + i] || x.from, to: w['to' + i] || x.to }));
        await S.saveSettings({ tradition: { workHours: v.workHours || 0, serviceHours: v.serviceHours || 0, communityHours: v.communityHours || 0, flexHours: v.flexHours || 0, totalHours: v.totalHours || 0, minGpa: v.minGpa || 0, windows: newWindows } });
        U.toast('Tradition settings saved');
      } })),
      h('p', { class: 'tiny muted' }, 'Defaults follow the published Cornell Tradition policies: 100 h paid work, 100 h service (15 community), 50 flex, 250 total, 2.3 GPA, academic year only. Confirm each spring with tradition@cornell.edu.'))));

    // profile
    const pf = U.form([
      { key: 'name', label: 'Name', type: 'text', default: p.name },
      { key: 'email', label: 'Email', type: 'text', default: p.email },
      { key: 'phone', label: 'Phone', type: 'text', default: p.phone },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', default: p.linkedin },
      { key: 'school', label: 'School', type: 'text', default: p.school },
      { key: 'major', label: 'Degree & major', type: 'text', default: p.major },
      { key: 'classYear', label: 'Graduation year', type: 'number', default: p.classYear },
      { key: 'collegeStart', label: 'College start date', type: 'date', default: p.collegeStart },
      { key: 'programs', label: 'Programs & fellowships (semicolon separated)', type: 'text', default: Array.isArray(p.programs) ? p.programs.join('; ') : (p.programs || ''), full: true },
      { key: 'hsSummary', label: 'High school summary line', type: 'text', default: p.hsSummary, full: true },
      { key: 'languages', label: 'Languages', type: 'text', default: p.languages },
      { key: 'certifications', label: 'Certifications (BLS, EMT, CNA…)', type: 'text', default: p.certifications },
      { key: 'interests', label: 'Interests', type: 'text', default: p.interests, full: true },
      { key: 'mcatDate', label: 'Planned MCAT date', type: 'date', default: p.mcatDate },
      { key: 'mcatScore', label: 'MCAT score (when known)', type: 'text', default: p.mcatScore },
      { key: 'gapYear', label: 'Planning one gap year (apply June 2030, matriculate 2031)', type: 'checkbox', full: true, default: !!p.gapYear, help: 'Shifts the MCAT and application milestones on the Timeline one year later.' },
    ], {});
    main.appendChild(U.section('Profile', null, h('div', { class: 'card stack' }, pf.el, h('div', null, btn('Save profile', { kind: 'primary', size: 'sm', onClick: async () => { const v = pf.read(); if (!v) return; v.programs = v.programs.split(';').map(s => s.trim()).filter(Boolean); await S.saveSettings({ profile: v }); U.toast('Profile saved'); } })))));

    // data
    const counts = S.COLLECTIONS.map(c => S.count(c) + ' ' + c).join(' · ');
    main.appendChild(U.section('Your data', null, h('div', { class: 'card stack' },
      h('div', { class: 'sync ' + (S.status.kind || '') }, S.status.text),
      h('p', { class: 'small muted' }, counts),
      h('div', { class: 'btn-row' }, btn('Export backup (JSON)', { icon: 'down', onClick: U.exportBackup }), btn('Import backup', { icon: 'up', onClick: U.importBackup }),
        window.PMT_SEED ? btn('Load starting data', { onClick: async () => { const ok = await U.confirm({ title: 'Load starting data?', text: 'Adds the activities, courses, awards and publications from your resume and transcript. Existing entries with the same ids are overwritten; everything else is kept.', okLabel: 'Load' }); if (ok) { const n = await S.loadSeed(); U.toast('Loaded ' + n + ' entries'); } } }) : null,
        btn('Delete everything', { kind: 'danger', icon: 'trash', onClick: async () => { const ok = await U.confirm({ title: 'Delete all data?', text: 'Every activity, entry, course, award, reflection and resume version will be removed. Export a backup first.', okLabel: 'Delete everything', danger: true }); if (ok) { await S.clearAll(); U.toast('All data deleted'); U.navigate('dashboard'); } } })),
      h('p', { class: 'tiny muted' }, S.backend === 'db' ? 'Your data lives in this artifact\'s database on claude.ai and follows you across devices while signed in. Export a JSON backup each semester anyway.' : 'Your data lives only in this browser. Export a backup after big updates and import it on another device.'))));
  } };

  // ---------- registry ----------
  window.PMT_VIEWS = {
    dashboard, log: logView, activities: activitiesView, academics, research, awards, resume: resumeView, journal, letters, timeline, settings,
    openLogModal, openActivityModal,
  };
})();
