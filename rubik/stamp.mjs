// Release helper: tag every module import with one version, so a browser
// never mixes a cached old module with new ones right after a deploy.
// Run from the repository root before committing: node rubik/stamp.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const version = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
const files = readdirSync(here).filter(name => name.endsWith('.mjs') && name !== 'stamp.mjs').concat('index.html');
for (const name of files) {
  const path = join(here, name);
  const before = readFileSync(path, 'utf8');
  const after = before
    .replace(/(['"])\.\/([\w-]+\.mjs)(\?v=\d+)?\1/g, `$1./$2?v=${version}$1`)
    .replace(/src="app\.mjs(\?v=\d+)?"/, `src="app.mjs?v=${version}"`)
    .replace(/href="rubik\.css(\?v=\d+)?"/, `href="rubik.css?v=${version}"`);
  if (after !== before) writeFileSync(path, after);
}
console.log(`stamped ${version}`);
