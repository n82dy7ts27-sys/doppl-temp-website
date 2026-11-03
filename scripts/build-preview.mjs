import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp4': 'video/mp4' };
const assets = {};
async function walk(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filename);
    else if (entry.isFile()) {
      const bytes = await readFile(filename);
      const pathname = '/' + path.relative('out', filename).split(path.sep).join('/');
      assets[pathname] = { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), type: types[path.extname(filename)] || 'application/octet-stream' };
    } else throw new Error(`Unsupported exported asset: ${filename}`);
  }
}
await walk('out');
const buildId = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0, 24);
const wordmark = (await readFile('public/doppl-wordmark.svg', 'utf8')).replace(/<\?xml[^>]*>/, '').replace(/<!--[^]*?-->/g, '');
await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('worker/preview.mjs', 'dist/server/preview.mjs');
await writeFile('dist/server/index.js', `import { createPreviewWorker } from './preview.mjs';\nexport default createPreviewWorker(${JSON.stringify({ assets, buildId, wordmark })});\n`);
await mkdir('.sites-runtime', { recursive: true });
await writeFile('.sites-runtime/preview-assets.json', JSON.stringify({ assets, buildId }, null, 2) + '\n');
console.log(`Protected preview built: ${Object.keys(assets).length} assets, build ${buildId}.`);
