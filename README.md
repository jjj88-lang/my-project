# Pre-Med Ledger

A personal tracker for a pre-med college career: hours (clinical, shadowing, volunteering, research, leadership, teaching, work, clubs), activities with the contact details AMCAS will ask for, courses and GPA on both the Cornell and AMCAS scales, honors, publications, a resume with version history, a reflection journal, a letter-writer roster, a Class of 2030 application timeline, and a Cornell Tradition fellowship tracker.

It is a static site: plain HTML, CSS and JavaScript, no build step and no server.

## Two ways to run it

1. **As a claude.ai artifact (recommended).** The published artifact stores every entry in the artifact's shared database, so the same ledger is available on a phone and a laptop while signed in. Claude can also read and add to that database on request.
2. **As plain files.** Open `index.html` directly, or host the folder on GitHub Pages. Data is then saved in that browser's local storage only; the starting data from `seed.js` loads on first run, and Settings has export/import for JSON backups.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell, icon sprite, script order |
| `styles.css` | Design tokens (light and dark), layout, components |
| `config.js` | Categories, AMCAS experience types and limits, hour goals, Cornell Tradition targets and fellowship-year windows, grade scales, BCPM prefixes, MD prerequisites, timeline milestones |
| `calc.js` | Pure calculations: hour totals, monthly series, Tradition years, GPAs, prerequisite status, milestones |
| `store.js` | Storage layer: artifact database when available, otherwise local storage; import/export |
| `charts.js` | Small SVG charts (bars, lines, stacked bar, meters) with tooltips and table twins |
| `app.js` | Shell: DOM helpers, navigation, modals, forms, backups |
| `views.js` | Every page |
| `seed.js` | Starting data from the October 2026 resume and high-school transcript |
| `build-artifact.js` | Produces the artifact version of the page (`node build-artifact.js dist-artifact`) |

## Rules the defaults follow

- **AMCAS Work & Activities:** 15 entries, 700-character descriptions, 3 most meaningful with 1,325 more characters, 19 experience types (2027 application), up to 4 date ranges per entry, a verifying contact per entry. High-school-only experiences should not be listed; activities that continued into college can be, so the tracker counts hours from high-school graduation by default and keeps earlier hours visible separately.
- **Cornell Tradition:** per academic year, 100 hours of paid legal work, 100 hours of service (at least 15 community service, the rest community or campus), 50 flex hours, 250 total, and a 2.3 cumulative GPA. Only hours between the Sunday before fall classes and the end of spring classes count; summer never counts; research and for-credit activities never count; off-campus hours need a supervisor endorsement in the spring re-application. Confirm the exact window dates each year.
- **GPA:** Cornell counts A+ as 4.3 and excludes S/U, W and INC. AMCAS caps A+ at 4.0, counts every attempt of a repeated course, excludes S and AP credit, may treat a U as an F, and splits the GPA into BCPM (biology, chemistry, physics, math) and AO (all other).
- **Timeline:** straight-through plan for a May 2030 graduate (HPAC Application Module October 2028, MCAT spring 2029, AMCAS June 2029, matriculate fall 2030); the gap-year option in Settings shifts the application milestones one year later.

Change any of these in Settings; the numbers in `config.js` are only the starting values.
