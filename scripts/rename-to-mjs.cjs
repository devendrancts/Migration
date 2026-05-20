// Post-build: rename .js → .mjs and fix imports so Node always treats output as ESM.
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

const jsFiles = walk(distDir);

// 1. Rewrite .js imports/exports to .mjs in all files
for (const file of jsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  // Match: from './foo.js' or from '../bar.js' — replace .js with .mjs
  content = content.replace(/(from\s+['"])(\.[^'"]*?)\.js(['"])/g, '$1$2.mjs$3');
  // Match: import('./foo.js') dynamic imports
  content = content.replace(/(import\s*\(\s*['"])(\.[^'"]*?)\.js(['"]\s*\))/g, '$1$2.mjs$3');
  fs.writeFileSync(file, content, 'utf8');
}

// 2. Rename .js → .mjs
for (const file of jsFiles) {
  const mjsPath = file.replace(/\.js$/, '.mjs');
  fs.renameSync(file, mjsPath);
}

// 3. Also rename .js.map → .mjs.map
for (const file of jsFiles) {
  const mapFile = file + '.map';
  if (fs.existsSync(mapFile)) {
    fs.renameSync(mapFile, file.replace(/\.js$/, '.mjs') + '.map');
  }
}

console.log(`Renamed ${jsFiles.length} files from .js to .mjs`);
