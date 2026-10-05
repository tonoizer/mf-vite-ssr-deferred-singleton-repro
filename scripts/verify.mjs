import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MF_ERROR = /TypeError: __mf_\w+ is not a function/;

const matrix = [
  {
    version: '1.22.1',
    expect: 'pass',
    label: 'SSR success (rendered markup with #ssr-ok)',
  },
  {
    version: '1.23.2',
    expect: 'fail',
    label: 'TypeError: __mf_N is not a function',
  },
];

function combined(result) {
  const parts = [
    result.stdout ?? '',
    result.stderr ?? '',
    result.error ? String(result.error) : '',
  ];
  return parts.filter(Boolean).join('\n');
}

function run(command, args, timeoutMs) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
  });
}

function npmInstall(args) {
  const result = run(
    'npm',
    ['install', '--no-fund', '--no-audit', '--no-package-lock', ...args],
    180_000
  );
  if (result.status !== 0) {
    throw new Error(`npm install ${args.join(' ')} failed:\n${combined(result)}`);
  }
}

function evaluateCase({ version, expect }) {
  console.log(`\n======== @module-federation/vite@${version} (expect ${expect}) ========`);
  npmInstall(['--no-save', `@module-federation/vite@${version}`]);
  rmSync(path.join(root, 'dist'), { recursive: true, force: true });

  const build = run(
    'npx',
    ['vite', 'build', '--ssr', 'src/entry-server.js', '--outDir', 'dist/ssr'],
    120_000
  );
  let output = combined(build);
  let outcome = 'fail';
  let markup = '';

  if (build.status === 0) {
    const render = run(process.execPath, ['scripts/ssr-render.mjs'], 30_000);
    output += `\n${combined(render)}`;
    if (render.status === 0 && /ssr-ok/.test(render.stdout ?? '')) {
      outcome = 'pass';
      markup = (render.stdout ?? '').trim();
    }
  }

  const matchedError = MF_ERROR.test(output);
  const ok =
    expect === 'pass' ? outcome === 'pass' : outcome === 'fail' && matchedError;

  process.stdout.write(output);
  if (markup) console.log(`markup: ${markup}`);
  console.log(
    `--> actual=${outcome} expected=${expect} mfError=${matchedError} ${ok ? 'OK' : 'UNEXPECTED'}`
  );

  return { version, expect, outcome, matchedError, ok, output };
}

console.log('Installing base dependencies (vite 7.x, vue 3)...');
npmInstall([]);

const results = [];
for (const item of matrix) {
  results.push(evaluateCase(item));
}

console.log('\n======== SUMMARY ========');
for (const result of results) {
  const errorNote = result.matchedError ? ' (__mf_N is not a function)' : '';
  console.log(
    `${result.ok ? 'PASS' : 'UNEXPECTED'}  @module-federation/vite@${result.version}  expected=${result.expect} actual=${result.outcome}${errorNote}`
  );
}

const reproduced = results.every((result) => result.ok);
if (!reproduced) {
  console.error(
    '\nMatrix did not match: expected 1.22.1 SSR success and 1.23.2 TypeError: __mf_N is not a function.'
  );
  process.exit(1);
}

console.log('\nReproduced: 1.22.1 SSR OK, 1.23.2 TypeError: __mf_N is not a function');
