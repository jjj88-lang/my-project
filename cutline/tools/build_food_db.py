#!/usr/bin/env python3
"""Build Cutline's searchable food database from USDA FoodData Central (public domain).

Download and unzip these from https://fdc.nal.usda.gov/download-datasets into one folder:
  FoodData_Central_survey_food_csv_*.zip      (FNDDS: foods and mixed dishes as eaten)
  FoodData_Central_sr_legacy_food_csv_*.zip   (SR Legacy: standard reference foods)
  FoodData_Central_branded_food_csv_*.zip     (label data for packaged products)

  python3 build_food_db.py <folder with the unzipped datasets> <output folder>

Output (published beside the page as db/...):
  meta.json   counts and shard sizes
  g.json      generic foods, loaded whole and searched in memory
  d/N.json    branded products, ~1,350 per file, ordered shortest name first
  i/N.json    word -> product ids (base-36 deltas), sharded by the word's first two letters
"""
import csv, sys, re, glob, os, json, collections
csv.field_size_limit(10**9)
SRC, OUT = sys.argv[1], sys.argv[2]
DSH, ISH = 300, 120
STOP = {'and','with','the','of','in','for','oz','or','to','no','by','per'}

def folder(pat):
    return glob.glob(os.path.join(SRC, '**', f'*{pat}*', ''), recursive=True)[-1]
# nutrient ids (SR/branded) and legacy nutrient numbers (survey) -> kcal, protein, fat, carbs
NUT = {'1008':0,'2047':0,'2048':0,'208':0,'1003':1,'203':1,'1004':2,'204':2,'1005':3,'205':3}
def nutrients(fo):
    out, pri = {}, {}
    with open(fo+'food_nutrient.csv', newline='', encoding='utf8') as f:
        r = csv.reader(f); next(r)
        for row in r:
            k = NUT.get(row[2])
            if k is None: continue
            try: v = float(row[3])
            except ValueError: continue
            a = out.setdefault(row[1], [None]*4)
            if k == 0:
                p = 1 if row[2] in ('1008','208') else 0
                if a[0] is None or p > pri.get(row[1], -1): a[0] = v; pri[row[1]] = p
            else: a[k] = v
    return out
def names(fo):
    with open(fo+'food.csv', newline='', encoding='utf8') as f:
        r = csv.reader(f); next(r); return {row[0]: row[2] for row in r}
def clean(s): return re.sub(r'\s+', ' ', s.replace('|', ' ')).strip()
def tokens(s):
    out = []
    for t in re.sub(r'[^a-z0-9]+', ' ', s.lower()).split():
        if len(t) > 3 and t.endswith('s'): t = t[:-1]
        if len(t) >= 2 and t not in STOP and t not in out: out.append(t)
    return out
def title(s):
    if s.upper() != s: return s
    return re.sub(r"[A-Za-z][A-Za-z']*", lambda m: m.group(0)[0] + m.group(0)[1:].lower(), s)
def tidy(name):
    parts = [p.strip() for p in name.split(',') if p.strip()]
    if len(parts) > 1:
        head = set(tokens(' '.join(parts[:-1])))
        if set(tokens(parts[-1])) <= head: parts = parts[:-1]
    return title(', '.join(parts))[:90]
def num(x):
    x = round(x, 1); return int(x) if x == int(x) else x

# ---------- generic foods
gen = []
for pat, src in (('survey_food', 'S'), ('sr_legacy', 'L')):
    fo = folder(pat); nm = names(fo); nu = nutrients(fo); por = collections.defaultdict(list)
    with open(fo+'food_portion.csv', newline='', encoding='utf8') as f:
        r = csv.reader(f); next(r)
        for row in r:
            try: g = float(row[7])
            except ValueError: continue
            desc = row[5] if src == 'S' else ((row[3] or '1') + ' ' + row[6]).strip()
            desc = clean(re.sub(r'\.0\b', '', desc))
            if g <= 0 or not desc or 'not specified' in desc.lower(): continue
            por[row[1]].append([desc[:40], num(g)])
    for fid, name in nm.items():
        a = nu.get(fid)
        if not a or a[0] is None: continue
        gen.append([src, clean(name)] + [num(x or 0) for x in (a[0], a[1], a[3], a[2])] + [por.get(fid, [])[:12]])
print('generic foods', len(gen))

# ---------- branded products: newest record per barcode, then one per (name, brand, kcal)
fo = folder('branded_food'); nm = names(fo); nu = nutrients(fo); best = {}
with open(fo+'branded_food.csv', newline='', encoding='utf8') as f:
    r = csv.reader(f); ix = {k: i for i, k in enumerate(next(r))}
    for row in r:
        fid = row[0]; a = nu.get(fid)
        if not a or a[0] is None or row[ix['market_country']] not in ('United States', ''): continue
        kcal, p, fat, c = a[0], a[1] or 0, a[2] or 0, a[3] or 0
        if not 0 <= kcal <= 902 or max(p, fat, c) > 100: continue
        gt = row[ix['gtin_upc']].lstrip('0') or fid; date = row[ix['modified_date']]
        if gt in best and best[gt][0] >= date: continue
        try: ss = float(row[ix['serving_size']])
        except ValueError: ss = 0
        unit = 'ml' if row[ix['serving_size_unit']].lower().startswith('m') else 'g'
        brand = title(clean(row[ix['brand_name']] or row[ix['brand_owner']]))[:40]
        best[gt] = (date, tidy(clean(nm.get(fid, ''))), brand, round(kcal), num(p), num(c), num(fat), num(ss), unit,
                    clean(row[ix['household_serving_fulltext']])[:30])
seen, items = set(), []
for v in best.values():
    k = (v[1].lower(), v[2].lower(), v[3])
    if v[1] and k not in seen: seen.add(k); items.append(v[1:])
items = [(tokens(x[0]), x) for x in items]
items.sort(key=lambda t: (len(t[0]), t[1][0].lower()))
print('branded products', len(items))

os.makedirs(OUT+'/d', exist_ok=True); os.makedirs(OUT+'/i', exist_ok=True)
per = -(-len(items) // DSH)
index = [collections.defaultdict(list) for _ in range(ISH)]
for i, (tk, x) in enumerate(items):
    for t in dict.fromkeys(tk + tokens(x[1])):
        index[(ord(t[0]) * 41 + ord(t[1])) % ISH][t].append(i)
def b36(n):
    s = ''
    while True:
        n, r = divmod(n, 36); s = '0123456789abcdefghijklmnopqrstuvwxyz'[r] + s
        if not n: return s
dump = lambda o, p: json.dump(o, open(p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
for s in range(DSH):
    dump(['|'.join(str(v) for v in x) for _, x in items[s*per:(s+1)*per]], f'{OUT}/d/{s}.json')
for s, sh in enumerate(index):
    dump({t: ' '.join(b36(b - a) for a, b in zip([0] + ids, ids)) for t, ids in sh.items()}, f'{OUT}/i/{s}.json')
dump(gen, OUT+'/g.json')
dump({'n': len(items), 'per': per, 'dsh': DSH, 'ish': ISH, 'generic': len(gen),
      'source': 'USDA FoodData Central: FNDDS 2021-2023, SR Legacy 2018, Branded Foods 2025-04'}, OUT+'/meta.json')
