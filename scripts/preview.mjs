import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { isSectionPath } from '../src/pages.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.argv[2] ?? 8000);
const origin = `http://127.0.0.1:${port}`;
const index = join(dist, 'index.html');
const mediaTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

await stat(index).catch(() => {
  throw new Error('Build the site first with node scripts/build.mjs');
});

async function findFile(url) {
  const pathname = decodeURIComponent(url.pathname);
  const file = resolve(dist, `.${pathname}`);
  if (url.origin !== origin || relative(dist, file).startsWith('..') || pathname.split('/').some((part) => part.startsWith('.'))) return null;

  const entry = await stat(file).catch((error) => {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  });
  if (!entry) return isSectionPath(pathname) ? { file: index } : null;
  if (entry.isDirectory()) {
    if (file === resolve(dist)) return { file: index };
    const directoryIndex = join(file, 'index.html');
    return (await stat(directoryIndex).catch(() => null))?.isFile()
      ? { file: directoryIndex, redirect: !url.pathname.endsWith('/') }
      : null;
  }
  return entry.isFile() ? { file } : null;
}

async function sendFile(request, response, file, statusCode) {
  const { size } = await stat(file);
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': mediaTypes[extname(file)] ?? 'application/octet-stream',
    'Content-Length': size,
  });
  if (request.method === 'HEAD') response.end();
  else await pipeline(createReadStream(file), response);
}

createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  try {
    const url = new URL(request.url, origin);
    const match = await findFile(url);
    if (match?.redirect) {
      response.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
      return;
    }

    await sendFile(request, response, match?.file ?? join(dist, 'err', '404.html'), match ? 200 : 404);
  } catch (error) {
    if (response.headersSent || response.destroyed) {
      response.destroy();
      return;
    }
    const status = error instanceof URIError || error.code === 'ERR_INVALID_URL' ? 400 : 500;
    try {
      await sendFile(request, response, join(dist, 'err', `${status}.html`), status);
    } catch {
      if (response.headersSent) response.destroy();
      else response.writeHead(status).end();
    }
    if (status === 500) console.error(error);
  }
}).listen(port, '127.0.0.1', () => console.log(`Local preview: ${origin}`));
