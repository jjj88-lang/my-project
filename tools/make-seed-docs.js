// Turns seed.js into one JSON file per document for ArtifactData batch writes.
// Usage: node make-seed-docs.js <projectDir> <outDir>
const fs = require('fs');
const path = require('path');
const [,, projectDir, outDir] = process.argv;
global.window = {};
require(path.join(projectDir, 'seed.js'));
const seed = global.window.PMT_SEED;
fs.mkdirSync(outDir, { recursive: true });
const manifest = [];
for (const col of ['activities', 'logs', 'courses', 'awards', 'pubs', 'letters', 'journal', 'resume']) {
  for (const doc of seed[col] || []) {
    const body = Object.assign({}, doc); delete body.id;
    const file = path.join(outDir, col + '__' + doc.id + '.json');
    fs.writeFileSync(file, JSON.stringify(body));
    manifest.push({ op: 'set', collection: col, doc_id: doc.id, file_path: file });
  }
}
const settingsFile = path.join(outDir, 'meta__settings.json');
fs.writeFileSync(settingsFile, JSON.stringify(Object.assign({}, seed.settings, { seededAt: new Date().toISOString() })));
manifest.push({ op: 'set', collection: 'meta', doc_id: 'settings', file_path: settingsFile });
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(manifest.length + ' documents prepared');
