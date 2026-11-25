import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderErrorPages } from '../src/error-pages.mjs';
import { renderPages, renderSitemap, sections, socialCardPath } from '../src/pages.mjs';

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

const pages = renderPages(data);
const sitemapUrl = new URL('/sitemap.xml', data.profile.siteUrl);

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
  for (const { path, markup } of pages) {
    const filename = join(output, path, 'index.html');
    await mkdir(dirname(filename), { recursive: true });
    await writeFile(filename, markup);
  }
  for (const [filename, html] of renderErrorPages()) {
    await writeFile(join(output, 'err', filename), html);
  }
  await writeFile(join(output, 'sitemap.xml'), renderSitemap(pages));
  await writeFile(join(output, 'robots.txt'), `User-agent: *
Allow: /

# AI search crawlers
User-agent: OAI-SearchBot
User-agent: Claude-SearchBot
User-agent: PerplexityBot
Allow: /

Sitemap: ${sitemapUrl.href}
`);

  const localPaths = new Set([socialCardPath]);
  for (const { markup } of pages) {
    for (const [, pathname] of markup.matchAll(/\b(?:href|src)="(\/(?!\/)[^"?#]*)/g)) localPaths.add(pathname);
  }
  for (const pathname of localPaths) {
    const target = pathname.endsWith('/') ? join(pathname, 'index.html') : pathname;
    const file = await stat(join(output, target)).catch(() => null);
    if (!file?.isFile()) throw new Error(`The site links to a missing file: ${pathname}`);
  }

  await checkUploadFiles(output);
  await rm(dist, { recursive: true, force: true });
  await rename(output, dist);
  console.log(`Built and validated the site in ${dist}`);
} finally {
  await rm(output, { recursive: true, force: true });
}
