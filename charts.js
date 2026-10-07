// Pre-Med Ledger — small SVG charts built to the data-viz method:
// thin marks, hairline grid, one scale, hover tooltips, a table twin for every chart.
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, attrs[k]);
    return el;
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function niceMax(v) {
    if (v <= 0) return 10;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return m * p;
  }
  function fmt(v) {
    if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  function tooltipFor(wrap) {
    const t = el('div', 'tooltip');
    t.hidden = true;
    wrap.appendChild(t);
    return {
      show(x, y, rows) {
        t.textContent = '';
        for (const r of rows) {
          const line = el('div', 'tr');
          if (r.color) { const k = el('i', 'tk'); k.style.background = r.color; line.appendChild(k); }
          if (r.value !== undefined) line.appendChild(el('span', 'tv', r.value));
          line.appendChild(el('span', '', r.label));
          t.appendChild(line);
        }
        t.hidden = false;
        const w = wrap.clientWidth, tw = t.offsetWidth;
        let left = x + 12;
        if (left + tw > w) left = Math.max(0, x - tw - 12);
        t.style.left = left + 'px';
        t.style.top = Math.max(0, y - 10) + 'px';
      },
      hide() { t.hidden = true; },
    };
  }

  function tableTwin(cols, rows) {
    const wrap = el('div', 'table-wrap');
    const tbl = el('table', 'tbl');
    const thead = el('thead'); const trh = el('tr');
    for (const c of cols) { const th = el('th', c.num ? 'num' : '', c.label); trh.appendChild(th); }
    thead.appendChild(trh); tbl.appendChild(thead);
    const tb = el('tbody');
    for (const r of rows) {
      const tr = el('tr');
      cols.forEach((c, i) => { tr.appendChild(el('td', c.num ? 'num' : '', r[i])); });
      tb.appendChild(tr);
    }
    tbl.appendChild(tb); wrap.appendChild(tbl);
    return wrap;
  }

  function withToggle(chartEl, tableEl) {
    const wrap = el('div', 'chart-block');
    const toggle = el('div', 'chart-toggle');
    const btn = el('button', '', 'Show table'); btn.type = 'button';
    tableEl.hidden = true;
    btn.addEventListener('click', () => {
      const showTable = tableEl.hidden;
      tableEl.hidden = !showTable; chartEl.hidden = showTable;
      btn.textContent = showTable ? 'Show chart' : 'Show table';
    });
    toggle.appendChild(btn);
    wrap.appendChild(chartEl); wrap.appendChild(tableEl); wrap.appendChild(toggle);
    return wrap;
  }

  // Single-series column chart. rows: [{label, value, detail?}]
  function barChart(opts) {
    const rows = opts.rows || [];
    const W = 640, H = opts.height || 220, padL = 36, padR = 8, padT = 14, padB = 26;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const maxV = niceMax(Math.max(0, ...rows.map(r => r.value)) * 1.05);
    const wrap = el('div', 'chart');
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.ariaLabel || 'Bar chart' });
    const tip = tooltipFor(wrap);
    // grid: 4 lines
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = maxV * i / ticks, y = padT + innerH - innerH * i / ticks;
      svg.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: i === 0 ? 'base-line' : 'grid-line' }));
      const t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', class: 'axis-text' }); t.textContent = fmt(v); svg.appendChild(t);
    }
    const n = rows.length || 1;
    const slot = innerW / n;
    const barW = Math.min(24, slot * 0.6);
    let maxIdx = -1, maxVal = -1;
    rows.forEach((r, i) => { if (r.value > maxVal) { maxVal = r.value; maxIdx = i; } });
    rows.forEach((r, i) => {
      const x = padL + slot * i + (slot - barW) / 2;
      const h = maxV ? innerH * r.value / maxV : 0;
      const y = padT + innerH - h;
      const rect = svgEl('rect', { x: x, y: y, width: barW, height: Math.max(0, h), rx: 4, class: 'bar' });
      // square the baseline end: overlay a small rect at the bottom
      svg.appendChild(rect);
      if (h > 4) svg.appendChild(svgEl('rect', { x: x, y: padT + innerH - Math.min(4, h), width: barW, height: Math.min(4, h), class: 'bar' }));
      const lbl = svgEl('text', { x: x + barW / 2, y: H - 8, 'text-anchor': 'middle', class: 'axis-text' });
      lbl.textContent = (n > 8 && i % 2 === 1 && !opts.allLabels) ? '' : r.label;
      svg.appendChild(lbl);
      if ((i === maxIdx && r.value > 0) || (i === n - 1 && r.value > 0 && i !== maxIdx)) {
        const vt = svgEl('text', { x: x + barW / 2, y: y - 4, 'text-anchor': 'middle', class: 'val-text' });
        vt.textContent = fmt(r.value); svg.appendChild(vt);
      }
      const hit = svgEl('rect', { x: padL + slot * i, y: padT, width: slot, height: innerH, class: 'bar-hit', tabindex: 0 });
      const show = () => {
        rect.classList.add('hover');
        const cx = (padL + slot * i + slot / 2) / W * wrap.clientWidth;
        const cy = y / H * (wrap.clientWidth * H / W);
        const trows = [{ value: fmt(r.value) + (opts.unit ? ' ' + opts.unit : ''), label: r.label }];
        if (r.detail) for (const d of r.detail) trows.push(d);
        tip.show(cx, cy, trows);
      };
      const hide = () => { rect.classList.remove('hover'); tip.hide(); };
      hit.addEventListener('pointerenter', show); hit.addEventListener('pointermove', show); hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', show); hit.addEventListener('blur', hide);
      svg.appendChild(hit);
    });
    wrap.appendChild(svg);
    const table = tableTwin([{ label: opts.labelHeader || 'Period' }, { label: opts.unit ? 'Hours' : 'Value', num: true }], rows.map(r => [r.label, fmt(r.value)]));
    return withToggle(wrap, table);
  }

  // Multi-series line chart. series: [{label, color, values: [number|null]}], labels: [string]
  function lineChart(opts) {
    const labels = opts.labels || [], series = opts.series || [];
    const W = 640, H = opts.height || 200, padL = 36, padR = 12, padT = 14, padB = 26;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const allVals = series.flatMap(s => s.values.filter(v => v !== null && v !== undefined));
    let yMin = opts.yMin !== undefined ? opts.yMin : Math.min(...allVals, 0);
    let yMax = opts.yMax !== undefined ? opts.yMax : niceMax(Math.max(...allVals, 1));
    if (yMax <= yMin) yMax = yMin + 1;
    const wrap = el('div', 'chart');
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.ariaLabel || 'Line chart' });
    const tip = tooltipFor(wrap);
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = yMin + (yMax - yMin) * i / ticks, y = padT + innerH - innerH * i / ticks;
      svg.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: i === 0 ? 'base-line' : 'grid-line' }));
      const t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', class: 'axis-text' }); t.textContent = opts.yFormat ? opts.yFormat(v) : fmt(v); svg.appendChild(t);
    }
    const n = labels.length;
    const xOf = i => n <= 1 ? padL + innerW / 2 : padL + innerW * i / (n - 1);
    const yOf = v => padT + innerH - innerH * (v - yMin) / (yMax - yMin);
    labels.forEach((l, i) => {
      const t = svgEl('text', { x: xOf(i), y: H - 8, 'text-anchor': i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle', class: 'axis-text' });
      t.textContent = l; svg.appendChild(t);
    });
    series.forEach(s => {
      let d = '', started = false;
      s.values.forEach((v, i) => {
        if (v === null || v === undefined) { started = false; return; }
        d += (started ? ' L' : ' M') + xOf(i).toFixed(1) + ' ' + yOf(v).toFixed(1); started = true;
      });
      const path = svgEl('path', { d: d.trim(), class: 'line', stroke: s.color }); svg.appendChild(path);
      s.values.forEach((v, i) => {
        if (v === null || v === undefined) return;
        svg.appendChild(svgEl('circle', { cx: xOf(i), cy: yOf(v), r: 4, fill: s.color, class: 'pt' }));
      });
      // end label
      const lastIdx = s.values.map((v, i) => v === null || v === undefined ? -1 : i).filter(i => i >= 0).pop();
      if (lastIdx !== undefined) {
        const t = svgEl('text', { x: xOf(lastIdx), y: yOf(s.values[lastIdx]) - 8, 'text-anchor': lastIdx === n - 1 ? 'end' : 'middle', class: 'val-text' });
        t.textContent = opts.yFormat ? opts.yFormat(s.values[lastIdx]) : fmt(s.values[lastIdx]); svg.appendChild(t);
      }
    });
    // crosshair
    const cross = svgEl('line', { x1: 0, x2: 0, y1: padT, y2: padT + innerH, class: 'crosshair' }); cross.setAttribute('visibility', 'hidden'); svg.appendChild(cross);
    const hit = svgEl('rect', { x: padL, y: padT, width: innerW, height: innerH, fill: 'transparent' });
    hit.addEventListener('pointermove', ev => {
      const rect = svg.getBoundingClientRect();
      const px = (ev.clientX - rect.left) / rect.width * W;
      let best = 0, bd = Infinity;
      for (let i = 0; i < n; i++) { const d = Math.abs(xOf(i) - px); if (d < bd) { bd = d; best = i; } }
      cross.setAttribute('x1', xOf(best)); cross.setAttribute('x2', xOf(best)); cross.setAttribute('visibility', 'visible');
      const rows = [{ label: labels[best] }];
      for (const s of series) { const v = s.values[best]; if (v !== null && v !== undefined) rows.push({ color: s.color, value: opts.yFormat ? opts.yFormat(v) : fmt(v), label: s.label }); }
      tip.show(xOf(best) / W * wrap.clientWidth, (ev.clientY - rect.top), rows);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); tip.hide(); });
    svg.appendChild(hit);
    wrap.appendChild(svg);
    if (series.length > 1) {
      const lg = el('div', 'legend');
      for (const s of series) { const sp = el('span'); const k = el('i', 'tk'); k.style.cssText = 'display:inline-block;width:14px;height:2px;background:' + s.color; sp.appendChild(k); sp.appendChild(document.createTextNode(s.label)); lg.appendChild(sp); }
      wrap.appendChild(lg);
    }
    const cols = [{ label: opts.labelHeader || 'Term' }].concat(series.map(s => ({ label: s.label, num: true })));
    const rows = labels.map((l, i) => [l].concat(series.map(s => { const v = s.values[i]; return v === null || v === undefined ? '—' : (opts.yFormat ? opts.yFormat(v) : fmt(v)); })));
    return withToggle(wrap, tableTwin(cols, rows));
  }

  // Horizontal 100% stacked bar with legend rows. segments: [{label, value, color}]
  function stackedBar(segments, opts) {
    opts = opts || {};
    const total = segments.reduce((s, x) => s + x.value, 0);
    const wrap = el('div', 'chart');
    const bar = el('div', 'stackbar');
    bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', opts.ariaLabel || 'Share by category');
    const tip = tooltipFor(wrap);
    const shown = segments.filter(s => s.value > 0);
    if (!total) { const e = el('div', 'muted small', 'No hours logged yet.'); wrap.appendChild(e); return wrap; }
    for (const s of shown) {
      const i = el('i'); i.style.width = (s.value / total * 100) + '%'; i.style.background = s.color; i.tabIndex = 0;
      const show = ev => { const r = wrap.getBoundingClientRect(); tip.show((ev && ev.clientX ? ev.clientX - r.left : 20), 0, [{ color: s.color, value: fmt(s.value) + ' h', label: s.label + ' · ' + Math.round(s.value / total * 100) + '%' }]); };
      i.addEventListener('pointerenter', show); i.addEventListener('pointermove', show); i.addEventListener('pointerleave', () => tip.hide());
      i.addEventListener('focus', show); i.addEventListener('blur', () => tip.hide());
      bar.appendChild(i);
    }
    wrap.appendChild(bar);
    const lg = el('div', 'stack-legend');
    for (const s of segments) {
      const sw = el('span', 'swatch'); sw.style.background = s.color; lg.appendChild(sw);
      lg.appendChild(el('span', 'k', s.label));
      lg.appendChild(el('span', 'v', fmt(s.value) + ' h'));
      lg.appendChild(el('span', 'p', total ? Math.round(s.value / total * 100) + '%' : '0%'));
    }
    wrap.appendChild(lg);
    return wrap;
  }

  // Goal meter. Fill color by state: behind pace → warning, met → good.
  function meter(value, goal, opts) {
    opts = opts || {};
    const pct = goal > 0 ? Math.min(100, value / goal * 100) : 0;
    const m = el('div', 'meter' + (opts.large ? ' lg' : '') + (pct >= 100 ? ' good' : (opts.warn ? ' warn' : '')));
    m.setAttribute('role', 'progressbar'); m.setAttribute('aria-valuenow', Math.round(value)); m.setAttribute('aria-valuemax', goal);
    const i = el('i'); i.style.width = pct + '%'; m.appendChild(i);
    return m;
  }

  function sparkline(values, color, w, h) {
    w = w || 80; h = h || 22;
    const max = Math.max(1, ...values);
    const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, 'aria-hidden': 'true' });
    const n = values.length;
    let d = '';
    values.forEach((v, i) => { const x = n <= 1 ? w / 2 : i / (n - 1) * (w - 4) + 2; const y = h - 2 - (h - 6) * v / max; d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); });
    svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: color || 'var(--s1)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }));
    if (n) { const x = n <= 1 ? w / 2 : (w - 2); const y = h - 2 - (h - 6) * values[n - 1] / max; svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 2.5, fill: color || 'var(--s1)' })); }
    return svg;
  }

  window.PMT_CHARTS = { barChart, lineChart, stackedBar, meter, sparkline, tableTwin };
})();
