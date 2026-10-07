#!/usr/bin/env node
// Builds the claude.ai artifact version of the page.
// The artifact tool wraps the page in its own <html>/<head>/<body> skeleton, so it wants only the
// content between the ARTIFACT markers in index.html (title + links first, then the body).
// Usage: node build-artifact.js <outDir>
const fs = require('fs');
const path = require('path');
const root = __dirname;
const out = process.argv[2] || path.join(root, 'dist-artifact');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pick = (tag) => {
  const m = new RegExp('<!--' + tag + '-->([\\s\\S]*?)<!--/' + tag + '-->').exec(html);
  if (!m) throw new Error('marker ' + tag + ' not found in index.html');
  return m[1].trim();
};
fs.writeFileSync(path.join(out, 'index.html'), pick('ARTIFACT-HEAD') + '\n' + pick('ARTIFACT-BODY') + '\n');
for (const f of ['styles.css', 'config.js', 'calc.js', 'store.js', 'charts.js', 'app.js', 'views.js']) fs.copyFileSync(path.join(root, f), path.join(out, f));
// The artifact keeps its records in the shared database, which is seeded separately, so it ships an empty seed.
fs.writeFileSync(path.join(out, 'seed.js'), '// Starting data for the artifact is written to its database, not shipped in the page.\n');
console.log('artifact build written to ' + out);
