import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '_site');
const copy = (source, destination) => cpSync(resolve(root, source), resolve(output, destination), { recursive: true });

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

copy('site', '.');
copy('hobbit-threejs/luna/dist', 'hobbit-threejs/luna');
copy('hobbit-threejs/sol/index.html', 'hobbit-threejs/sol/index.html');

const required = [
  'index.html',
  'hobbit-threejs/luna/index.html',
  'hobbit-threejs/luna/audio/narration.wav',
  'hobbit-threejs/sol/index.html',
];

const missing = required.filter((path) => !existsSync(resolve(output, path)));
if (missing.length > 0) {
  throw new Error(`Pages assembly is missing: ${missing.join(', ')}`);
}

console.log(`Assembled ${required.length} required Pages entries in ${output}`);
