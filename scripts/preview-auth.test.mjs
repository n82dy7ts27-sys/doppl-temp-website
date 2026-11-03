import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreviewWorker } from '../worker/preview.mjs';

const origin = 'https://preview.example';
const media = new TextEncoder().encode('0123456789');
const assets = { '/index.html': { size: 10, type: 'text/html', sha256: 'sample' }, '/work/phase/index.html': { size: 10, type: 'text/html', sha256: 'sample' }, '/mascot/movie.webm': { size: 10, type: 'video/webm', sha256: 'sample' } };
const worker = createPreviewWorker({ assets, buildId: 'build', wordmark: '<svg></svg>' });
let reads = 0;
const env = {
  DOPPL_PREVIEW_PASSWORD: 'test-password', DOPPL_PREVIEW_SECRET: 'test-signing-secret', DOPPL_ASSET_UPLOAD_TOKEN: 'test-upload-secret',
  DOPPL_ASSETS: {
    async get(key, options) { reads++; const range = options?.range; return { body: range ? media.slice(range.offset, range.offset + range.length) : media }; },
    async head() { reads++; return { size: 10 }; },
    async put() { throw new Error('An unauthorised request must never reach storage.'); },
  },
};
const request = (path, options) => new Request(origin + path, options);
async function login(password = env.DOPPL_PREVIEW_PASSWORD, returnTo = '/') {
  return worker.fetch(request('/_preview/login', { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password, returnTo }) }), env);
}

test('unauthenticated pages show only the gate; media cannot be downloaded', async () => {
  reads = 0;
  const page = await worker.fetch(request('/work/phase/'), env);
  assert.match(await page.text(), /Enter studio/);
  const video = await worker.fetch(request('/mascot/movie.webm'), env);
  assert.equal(video.status, 401);
  assert.equal(reads, 0);
});
test('wrong passwords fail and correct passwords issue a secure signed session', async () => {
  assert.equal((await login('incorrect')).status, 401);
  const response = await login();
  assert.equal(response.status, 303);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /Secure; HttpOnly; SameSite=Lax/);
  assert.equal(cookie.includes(env.DOPPL_PREVIEW_PASSWORD), false);
  const authorized = await worker.fetch(request('/', { headers: { cookie: cookie.split(';')[0] } }), env);
  assert.equal(authorized.status, 200);
  assert.equal(await authorized.text(), '0123456789');
});
test('tampering, expired sessions and password changes invalidate access', async () => {
  const cookie = (await login()).headers.get('set-cookie').split(';')[0];
  for (const candidate of [cookie + '0', cookie.replace(/=\d+/, '=1000000000')]) {
    assert.equal((await worker.fetch(request('/mascot/movie.webm', { headers: { cookie: candidate } }), env)).status, 401);
  }
  assert.equal((await worker.fetch(request('/mascot/movie.webm', { headers: { cookie } }), { ...env, DOPPL_PREVIEW_PASSWORD: 'changed' })).status, 401);
});
test('video byte ranges and HEAD preserve media metadata after authentication', async () => {
  const cookie = (await login()).headers.get('set-cookie').split(';')[0];
  for (const [range, text, contentRange] of [['bytes=2-5', '2345', 'bytes 2-5/10'], ['bytes=-3', '789', 'bytes 7-9/10'], ['bytes=8-', '89', 'bytes 8-9/10']]) {
    const response = await worker.fetch(request('/mascot/movie.webm', { headers: { cookie, range } }), env);
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-range'), contentRange);
    assert.equal(response.headers.get('content-type'), 'video/webm');
    assert.equal(await response.text(), text);
  }
  assert.equal((await worker.fetch(request('/mascot/movie.webm', { headers: { cookie, range: 'bytes=50-' } }), env)).status, 416);
  const head = await worker.fetch(request('/mascot/movie.webm', { method: 'HEAD', headers: { cookie } }), env);
  assert.equal(head.headers.get('content-length'), '10');
  assert.equal(await head.text(), '');
});
test('external redirects and cross-origin login are rejected', async () => {
  assert.equal((await login(env.DOPPL_PREVIEW_PASSWORD, '//external.example')).headers.get('location'), '/');
  assert.equal((await login(env.DOPPL_PREVIEW_PASSWORD, '/work/phase/')).headers.get('location'), '/work/phase/');
  const response = await worker.fetch(request('/_preview/login', { method: 'POST', headers: { origin: 'https://external.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'password=test-password' }), env);
  assert.equal(response.status, 403);
});
test('missing configuration fails closed and viewer sessions cannot upload', async () => {
  assert.equal((await worker.fetch(request('/'), { ...env, DOPPL_PREVIEW_SECRET: '' })).status, 503);
  assert.equal((await worker.fetch(request('/_preview/upload?path=/index.html'), env)).status, 404);
});
