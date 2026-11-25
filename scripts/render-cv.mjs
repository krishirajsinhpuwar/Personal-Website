import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const profile = JSON.parse(await readFile(join(root, 'content/profile.json'), 'utf8'));
const publicRoot = join(root, 'public');
const source = resolve(publicRoot, `.${profile.cv}`);
if (!profile.cv.startsWith('/') || relative(publicRoot, source).startsWith('..')) {
  throw new Error('The inline CV preview needs a PDF inside public/.');
}

const sha256 = createHash('sha256').update(await readFile(source)).digest('hex');
const { stdout: info } = await run('pdfinfo', [source]);
const pageCount = Number(/^Pages:\s+(\d+)/m.exec(info)?.[1]);
if (!pageCount) throw new Error('Could not read the CV page count.');
const directory = join(publicRoot, 'assets/cv');
await mkdir(directory, { recursive: true });
const pages = [];

for (let page = 1; page <= pageCount; page++) {
  const filename = `page-${page}.svg`;
  const output = join(directory, filename);
  await run('pdftocairo', ['-svg', '-f', String(page), '-l', String(page), source, output]);
  const svg = await readFile(output, 'utf8');
  const bounds = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!bounds) throw new Error(`Could not read the dimensions of CV page ${page}.`);
  const { stdout: text } = await run('pdftotext', ['-f', String(page), '-l', String(page), '-nopgbrk', source, '-']);
  pages.push({ image: `/assets/cv/${filename}`, width: Number(bounds[1]), height: Number(bounds[2]), text: text.trim() });
}

await writeFile(join(directory, 'manifest.json'), `${JSON.stringify({ source: profile.cv, sha256, pages }, null, 2)}\n`);
console.log(`Rendered ${pageCount} CV page${pageCount === 1 ? '' : 's'} for inline viewing.`);
