import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderErrorPages } from '../src/error-pages.mjs';
import { isSectionPath, renderSite, sections } from '../src/pages.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const publicRoot = join(root, 'public');
const topics = ['profile', ...Object.keys(sections).filter((slug) => slug !== 'cv')];

async function fileHash(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

const data = Object.fromEntries(await Promise.all(topics.map(async (topic) => {
  const filename = `${topic}.json`;
  try {
    const value = JSON.parse(await readFile(join(root, 'content', filename), 'utf8'));
    if (topic !== 'profile' && !Array.isArray(value)) throw new Error('Expected an array of entries');
    return [topic, value];
  } catch (error) {
    throw new Error(`content/${filename}: ${error.message}`, { cause: error });
  }
})));

data.cvPreview = JSON.parse(await readFile(join(publicRoot, 'assets/cv/manifest.json'), 'utf8'));
const cvHash = await fileHash(join(publicRoot, data.profile.cv));
if (data.cvPreview.source !== data.profile.cv || data.cvPreview.sha256 !== cvHash) {
  throw new Error('The inline CV preview is out of date. Run node scripts/render-cv.mjs, then build again.');
}

// InfinityFree caches static assets in the browser. New pages should request the matching assets.
data.assets = Object.fromEntries(await Promise.all(['site.css', 'router.js'].map(async (filename) => {
  const hash = await fileHash(join(publicRoot, 'assets', filename));
  return [filename, `/assets/${filename}?v=${hash.slice(0, 12)}`];
})));

const index = renderSite(data);

async function checkUploadFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await checkUploadFiles(path);
      continue;
    }
    if (!entry.isFile()) throw new Error(`Expected a regular upload file: ${path}`);
    const extension = extname(entry.name).toLowerCase();
    const limit = entry.name === '.htaccess' ? 10_000 : ['.html', '.js', '.php'].includes(extension) ? 1_000_000 : 10_000_000;
    if ((await stat(path)).size > limit) throw new Error(`${path} exceeds InfinityFree’s file limit (${limit} bytes)`);
  }
}

const output = await mkdtemp(join(root, '.dist-build-'));
try {
  await cp(publicRoot, output, { recursive: true });
  await writeFile(join(output, 'index.html'), index);
  for (const [filename, html] of renderErrorPages()) {
    await writeFile(join(output, 'err', filename), html);
  }

  for (const [, pathname] of index.matchAll(/\b(?:href|src)="(\/(?!\/)[^"?#]*)/g)) {
    if (isSectionPath(pathname)) continue;
    const target = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = await stat(join(output, target)).catch(() => null);
    if (!file?.isFile()) throw new Error(`index.html links to a missing file: ${pathname}`);
  }

  await checkUploadFiles(output);
  await rm(dist, { recursive: true, force: true });
  await rename(output, dist);
  console.log(`Built and validated the site in ${dist}`);
} finally {
  await rm(output, { recursive: true, force: true });
}
