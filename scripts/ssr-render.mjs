import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  path.join(root, 'dist/ssr/entry-server.js'),
  path.join(root, 'dist/ssr/src/entry-server.js'),
];

const ssrFile = candidates.find((file) => existsSync(file));
if (!ssrFile) {
  console.error('SSR build not found. Expected one of:');
  for (const file of candidates) console.error(`  ${file}`);
  process.exit(2);
}

try {
  const mod = await import(pathToFileURL(ssrFile).href);
  if (typeof mod.render !== 'function') {
    throw new TypeError('SSR build did not export render()');
  }
  const html = await mod.render();
  process.stdout.write(String(html) + '\n');
  if (!String(html).includes('ssr-ok')) {
    console.error('Rendered markup is missing ssr-ok');
    process.exit(3);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
