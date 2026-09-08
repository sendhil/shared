import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function assemblePages({
  root = defaultRoot,
  output = resolve(root, '_site'),
} = {}) {
  const copy = (source, destination) => cpSync(
    resolve(root, source),
    resolve(output, destination),
    { recursive: true },
  );

  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });

  copy('site', '.');
  copy('hobbit-threejs/luna/dist', 'hobbit-threejs/luna');
  copy('hobbit-threejs/sol/dist', 'hobbit-threejs/sol');
  copy('hobbit-threejs/astra/dist', 'hobbit-threejs/astra');
  copy('hobbit-threejs/terra/dist', 'hobbit-threejs/terra');
  copy('hobbit-threejs/shared-prompt.md', 'hobbit-threejs/shared-prompt.md');

  const required = [
    'index.html',
    'hobbit-threejs/luna/index.html',
    'hobbit-threejs/luna/audio/narration.wav',
    'hobbit-threejs/sol/index.html',
    'hobbit-threejs/sol/audio/narration.m4a',
    'hobbit-threejs/sol/audio/narration.mp3',
    'hobbit-threejs/astra/index.html',
    'hobbit-threejs/astra/audio/narration.wav',
    'hobbit-threejs/terra/index.html',
    'hobbit-threejs/terra/audio/narration.m4a',
    'hobbit-threejs/shared-prompt.md',
  ];

  const missing = required.filter((path) => !existsSync(resolve(output, path)));
  if (missing.length > 0) {
    throw new Error(`Pages assembly is missing: ${missing.join(', ')}`);
  }

  console.log(`Assembled ${required.length} required Pages entries in ${output}`);
  return { output, required };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assemblePages();
}
