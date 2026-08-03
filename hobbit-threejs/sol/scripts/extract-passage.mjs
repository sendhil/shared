import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/extract-passage.mjs <request.txt>');
const request = readFileSync(resolve(source), 'utf8').replace(/\r\n/g, '\n');
const match = request.match(/SOURCE PASSAGE\n\n([\s\S]*?)\n\nPRIMARY OBJECTIVE/);
if (!match) throw new Error('SOURCE PASSAGE block was not found');
const passage = match[1].trim();
const paragraphs = passage.split(/\n\n+/);
if (paragraphs.length !== 3) throw new Error(`Expected 3 paragraphs, received ${paragraphs.length}`);
const output = `export const PASSAGE = ${JSON.stringify(passage)} as const;\n` +
  `export const PASSAGE_PARAGRAPHS = ${JSON.stringify(paragraphs, null, 2)} as const;\n`;
const destination = resolve('src/content/passage.ts');
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, output);
