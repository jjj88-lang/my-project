// Pre-Med Ledger — pure calculations. No DOM, no storage.
(function () {
  'use strict';
  const CFG = window.PMT_CONFIG;

  // ---------- dates ----------
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // Parse 'YYYY-MM-DD' as a local date (never UTC, so days don't shift).
  function parseISO(s) {
    if (!s || typeof s !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function monthKey(s) { return (s || '').slice(0, 7); }
  function addMonths(d, n) { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); return x; }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function fmtDate(s, opts) {
    const d = parseISO(s);
    if (!d) return '';
    return d.toLocaleDateString(undefined, opts || { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtMonth(s) {
    const d = parseISO(s + '-01');
    return d ? d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : s;
  }
  function fmtRange(start, end, ongoing) {
    const a = start ? fmtDate(start, { month: 'short', year: 'numeric' }) : '';
    const b = ongoing || !end ? 'Present' : fmtDate(end, { month: 'short', year: 'numeric' });
    return a ? a + ' – ' + b : b;
  }

  // ---------- numbers ----------
  function round1(n) { return Math.round(n * 10) / 10; }
  function fmtHours(n) {
    if (!isFinite(n)) return '0';
    const r = round1(n);
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  }
  function fmtNum(n) { return new Intl.NumberFormat().format(n); }

  // ---------- hours ----------
  function logInWindow(log, from, to) {
    const d = log.date || '';
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  // Sum hours of logs, optionally filtered by activity ids and a date window.
  function sumHours(logs, opts) {
    opts = opts || {};
    let total = 0;
    for (const l of logs) {
      if (opts.activityIds && !opts.activityIds.has(l.activityId)) continue;
      if (!logInWindow(l, opts.from, opts.to)) continue;
      total += Number(l.hours) || 0;
    }
    return total;
  }

  function activityHours(activity, logs, countFrom) {
    let all = 0, counted = 0;
    for (const l of logs) {
      if (l.activityId !== activity.id) continue;
      const h = Number(l.hours) || 0;
      all += h;
      if (!countFrom || (l.date || '') >= countFrom) counted += h;
    }
    return { all: all, counted: counted };
  }

  // Totals per tracker category: { clinical: {all, counted, activities: n}, ... }
  function categoryTotals(activities, logs, countFrom) {
    const byAct = {};
    for (const a of activities) byAct[a.id] = a;
    const out = {};
    for (const c of CFG.categories) out[c.key] = { all: 0, counted: 0, activities: 0 };
    for (const a of activities) if (out[a.category]) out[a.category].activities += 1;
    for (const l of logs) {
      const a = byAct[l.activityId];
      if (!a || !out[a.category]) continue;
      const h = Number(l.hours) || 0;
      out[a.category].all += h;
      if (!countFrom || (l.date || '') >= countFrom) out[a.category].counted += h;
    }
    return out;
  }

  // Monthly series for the last N months (inclusive of the current month), per category.
  function monthlySeries(activities, logs, months, endISO) {
    const byAct = {};
    for (const a of activities) byAct[a.id] = a;
    const end = parseISO(endISO || todayISO()) || new Date();
    const keys = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = addMonths(end, -i);
      keys.push(d.getFullYear() + '-' + pad(d.getMonth() + 1));
    }
    const idx = {};
    keys.forEach((k, i) => { idx[k] = i; });
    const rows = keys.map(k => ({ key: k, label: fmtMonth(k), total: 0, byCat: {} }));
    for (const l of logs) {
      const i = idx[monthKey(l.date)];
      if (i === undefined) continue;
      const a = byAct[l.activityId];
      const cat = a ? a.category : 'other';
      const h = Number(l.hours) || 0;
      rows[i].total += h;
      rows[i].byCat[cat] = (rows[i].byCat[cat] || 0) + h;
    }
    return rows;
  }

  // Weekly average over the trailing N weeks.
  function trailingWeeklyAverage(logs, weeks, endISO) {
    const end = parseISO(endISO || todayISO()) || new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - weeks * 7 + 1);
    const from = toISO(start), to = toISO(end);
    return sumHours(logs, { from: from, to: to }) / weeks;
  }

  // Estimated total hours from the weekly commitment on an activity.
  function estimatedHours(a, asOfISO) {
    const hpw = Number(a.hoursPerWeek) || 0;
    if (!hpw) return 0;
    const start = parseISO(a.start);
    if (!start) return 0;
    const endDate = a.ongoing || !a.end ? (parseISO(asOfISO || todayISO()) || new Date()) : parseISO(a.end);
    if (!endDate || endDate < start) return 0;
    const weeks = daysBetween(start, endDate) / 7;
    const wpy = Number(a.weeksPerYear) || 52;
    return Math.round(hpw * weeks * (wpy / 52));
  }

  // ---------- Cornell Tradition ----------
  // Hours count only inside each fellowship-year window (academic year). Returns one row per window
  // with work / community / campus / service / flex / total and whether the targets are met, plus
  // the hours tagged for Tradition that fall outside every window (summer: do not count).
  function traditionYears(activities, logs, trad, todayStr) {
    const byAct = {};
    for (const a of activities) byAct[a.id] = a;
    const cfg = Object.assign({}, CFG.tradition, trad || {});
    const src = (cfg.windows && cfg.windows.length) ? cfg.windows : CFG.tradition.windows;
    const windows = src.map(w => ({ label: w.label, from: w.from, to: w.to, work: 0, community: 0, campus: 0, entries: 0 }));
    let outside = 0;
    for (const l of logs) {
      const a = byAct[l.activityId];
      if (!a || !a.tradition) continue;
      const h = Number(l.hours) || 0, d = l.date || '';
      const w = windows.find(x => d >= x.from && d <= x.to);
      if (!w) { outside += h; continue; }
      if (a.tradition === 'work') w.work += h;
      else if (a.tradition === 'community') w.community += h;
      else if (a.tradition === 'campus') w.campus += h;
      else if (a.tradition === 'service') w.community += h; // legacy value
      w.entries += 1;
    }
    const today = todayStr || todayISO();
    for (const w of windows) {
      w.service = w.community + w.campus;
      const workExtra = Math.max(0, w.work - cfg.workHours), serviceExtra = Math.max(0, w.service - cfg.serviceHours);
      w.flex = Math.min(cfg.flexHours, workExtra + serviceExtra);
      w.total = w.work + w.service;
      w.met = w.work >= cfg.workHours && w.service >= cfg.serviceHours && w.community >= cfg.communityHours && w.total >= cfg.totalHours;
      w.current = today >= w.from && today <= w.to;
      w.past = today > w.to;
    }
    const current = windows.find(w => w.current) || windows.find(w => w.from > today) || windows[windows.length - 1] || null;
    return { years: windows, current: current, outside: outside, targets: cfg };
  }

  // ---------- academics ----------
  function termOrder(term) {
    const m = /^(Winter|Spring|Summer|Fall)\s+(\d{4})/i.exec((term || '').trim());
    if (!m) return 0;
    const season = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    return (+m[2]) + (CFG.termSeasons[season] || 0) / 10;
  }
  function subjectOf(code) {
    const m = /^([A-Z]+)/i.exec((code || '').trim());
    return m ? m[1].toUpperCase() : '';
  }
  function isBCPMCode(code) { return CFG.bcpmPrefixes.includes(subjectOf(code)); }

  function gradePoints(grade, scaleName) {
    const scale = CFG.gradeScales[scaleName || 'cornell'];
    const g = (grade || '').trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(scale, g) ? scale[g] : null;
  }

  // GPA over a list of courses for one scale. Courses with non-GPA grades are skipped.
  function gpaOf(courses, scaleName) {
    let pts = 0, cr = 0;
    for (const c of courses) {
      const gp = gradePoints(c.grade, scaleName);
      const credits = Number(c.credits) || 0;
      if (gp === null || !credits) continue;
      pts += gp * credits;
      cr += credits;
    }
    return { gpa: cr ? pts / cr : null, credits: cr };
  }

  // Full academic summary: cumulative Cornell/AMCAS/BCPM/AO, per-term rows, credits.
  // Grades that earn no credit toward graduation.
  const NOT_EARNED = ['IP', 'W', 'U', 'UX', 'F', 'INC', 'NGR', 'V'];
  function academicSummary(courses) {
    const graded = courses.filter(c => gradePoints(c.grade, 'cornell') !== null);
    const gradedAmcas = courses.filter(c => gradePoints(c.grade, 'amcas') !== null);
    const bcpm = gradedAmcas.filter(c => c.bcpm);
    const ao = gradedAmcas.filter(c => !c.bcpm);
    const terms = {};
    for (const c of courses) {
      const t = c.term || 'Unassigned';
      if (!terms[t]) terms[t] = { term: t, order: termOrder(t), courses: [], credits: 0, inProgress: 0 };
      terms[t].courses.push(c);
      const cr = Number(c.credits) || 0;
      const g = (c.grade || '').toUpperCase();
      if (g === 'IP') terms[t].inProgress += cr; else if (!NOT_EARNED.includes(g)) terms[t].credits += cr;
    }
    const termRows = Object.values(terms).sort((a, b) => a.order - b.order).map(t => {
      const g = gpaOf(t.courses, 'cornell'), am = gpaOf(t.courses, 'amcas');
      const b = gpaOf(t.courses.filter(c => c.bcpm), 'amcas');
      return Object.assign(t, { cornell: g.gpa, amcas: am.gpa, bcpm: b.gpa, gradedCredits: g.credits });
    });
    const earned = courses.reduce((s, c) => {
      const g = (c.grade || '').toUpperCase();
      if (NOT_EARNED.includes(g)) return s;
      return s + (Number(c.credits) || 0);
    }, 0);
    const inProgress = courses.reduce((s, c) => (c.grade || '').toUpperCase() === 'IP' ? s + (Number(c.credits) || 0) : s, 0);
    return {
      cornell: gpaOf(graded, 'cornell'),
      amcas: gpaOf(gradedAmcas, 'amcas'),
      bcpm: gpaOf(bcpm, 'amcas'),
      ao: gpaOf(ao, 'amcas'),
      terms: termRows,
      creditsEarned: earned,
      creditsInProgress: inProgress,
      gradedCount: graded.length,
    };
  }

  function fmtGPA(g) { return g === null || g === undefined ? '—' : g.toFixed(2); }

  // AMCAS academic status for a term, by academic year since college start (FR, SO, JR, SR, PB).
  function amcasStatus(term, collegeStartISO) {
    const o = termOrder(term);
    if (!o) return '';
    const start = parseISO(collegeStartISO || CFG.student.collegeStart);
    if (!start) return '';
    const y = Math.floor(o), season = Math.round((o - y) * 10);
    const ay = season >= 3 ? y : y - 1; // academic year begins in the fall
    const idx = ay - start.getFullYear();
    return ['FR', 'SO', 'JR', 'SR'][idx] || (idx > 3 ? 'PB' : '');
  }
  function latinHonors(gpa) {
    if (gpa === null || gpa === undefined) return null;
    for (const h of CFG.latinHonors) if (gpa >= h.min) return h;
    return null;
  }

  // Prerequisite checklist. A course satisfies a prereq when its code starts with a
  // listed match, or when the user pinned it with course.prereq === key.
  function prereqStatus(courses) {
    return CFG.prereqs.map(p => {
      const hits = courses.filter(c => {
        if (c.prereq === p.key) return true;
        if (c.prereq && c.prereq !== p.key) return false;
        const code = (c.code || '').toUpperCase().replace(/\s+/g, ' ').trim();
        if (p.match.some(m => code.startsWith(m.toUpperCase()))) return true;
        const title = (c.title || '').toLowerCase();
        return !!(p.titleMatch && p.titleMatch.some(t => title.includes(t)));
      });
      const FAILED = ['IP', 'W', 'F', 'U', 'UX', 'INC', 'NGR', 'V'];
      const done = hits.filter(c => !FAILED.includes((c.grade || '').toUpperCase()));
      const inProg = hits.filter(c => (c.grade || '').toUpperCase() === 'IP');
      return { key: p.key, label: p.label, hint: p.hint, courses: hits, done: done, inProgress: inProg,
        state: done.length ? 'done' : inProg.length ? 'progress' : 'todo' };
    });
  }

  // ---------- timeline ----------
  function milestoneView(milestones, doneMap, todayStr) {
    const today = parseISO(todayStr || todayISO());
    return milestones.map(m => {
      const d = parseISO(m.date);
      const days = d ? daysBetween(today, d) : null;
      return Object.assign({}, m, { days: days, done: !!(doneMap && doneMap[m.key]), past: days !== null && days < 0 });
    });
  }
  function nextMilestones(milestones, doneMap, n, todayStr) {
    return milestoneView(milestones, doneMap, todayStr).filter(m => !m.done && !m.past).slice(0, n || 3);
  }

  // ---------- AMCAS readiness ----------
  // Compile activities into AMCAS-style entries with hour totals and missing-field checks.
  function amcasEntries(activities, logs, countFrom) {
    return activities
      .filter(a => a.includeAmcas !== false)
      .map(a => {
        const h = activityHours(a, logs, countFrom);
        const missing = [];
        if (!a.contactName) missing.push('contact name');
        if (!a.contactEmail && !a.contactPhone) missing.push('contact email or phone');
        if (!a.description) missing.push('description');
        if (!a.start) missing.push('start date');
        if (!a.location) missing.push('city/state');
        if (!a.amcasType) missing.push('experience type');
        return { activity: a, hours: h, missing: missing, descriptionOver: (a.description || '').length > CFG.amcas.descriptionChars,
          essayOver: (a.meaningfulEssay || '').length > CFG.amcas.meaningfulChars };
      })
      .sort((x, y) => y.hours.counted - x.hours.counted);
  }

  window.PMT_CALC = {
    todayISO, parseISO, toISO, monthKey, addMonths, daysBetween, fmtDate, fmtMonth, fmtRange,
    round1, fmtHours, fmtNum,
    sumHours, activityHours, categoryTotals, monthlySeries, trailingWeeklyAverage, estimatedHours,
    traditionYears,
    termOrder, subjectOf, isBCPMCode, gradePoints, gpaOf, academicSummary, fmtGPA, prereqStatus, amcasStatus, latinHonors,
    milestoneView, nextMilestones, amcasEntries,
  };
})();
