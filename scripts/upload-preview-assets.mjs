import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Credentials arrive over hidden stdin, never command arguments or source files.
if (process.stdin.isTTY) process.stdin.setRawMode(true);
console.error('Ready for preview upload JSON on stdin (input is hidden).');
const input = await new Promise((resolve, reject) => {
  let data = '';
  const onData = (chunk) => {
    data += chunk;
    if (data.includes('\u0003')) reject(new Error('Cancelled'));
    if (data.includes('\n') || data.includes('\r')) {
      process.stdin.off('data', onData);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      try { resolve(JSON.parse(data.trim())); } catch (error) { reject(error); }
    }
  };
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', onData);
  process.stdin.resume();
});
const origin = new URL(input.url).origin;
if (!origin.endsWith('.chatgpt.site') || !origin.startsWith('https://')) throw new Error('Expected a secure Sites origin.');
const { assets, buildId } = JSON.parse(await readFile('.sites-runtime/preview-assets.json', 'utf8'));
const queue = Object.entries(assets);
let count = 0;
const access = input.bypass ? { 'OAI-Sites-Authorization': input.bypass } : {};
async function upload() {
  while (queue.length) {
    const [pathname, asset] = queue.shift();
    const bytes = await readFile(path.join('out', pathname.slice(1)));
    if (bytes.length !== asset.size || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`Source changed: ${pathname}`);
    const url = new URL('/_preview/upload', origin);
    url.searchParams.set('path', pathname);
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url, { method: 'PUT', headers: { ...access, 'x-doppl-upload-token': input.uploadToken, 'content-type': asset.type, 'content-length': String(bytes.length) }, body: bytes, signal: AbortSignal.timeout(90000), redirect: 'error' });
      if (response.ok || response.status < 500) break;
      await response.arrayBuffer();
    }
    if (response.status !== 201) throw new Error(`Upload failed: ${pathname} (${response.status})`);
    await response.arrayBuffer();
    count++;
    if (count % 10 === 0) console.log(`Verified and uploaded ${count}/${Object.keys(assets).length} files.`);
  }
}
await Promise.all(Array.from({ length: 4 }, upload));
console.log(JSON.stringify({ uploaded: count, buildId }));
