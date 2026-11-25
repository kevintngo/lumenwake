#!/usr/bin/env node
// Builds static/sfx/<name>.wav from tools/sfx/manifest.json: each source is decoded by headless Chrome's own Web Audio
// (it reads the Kenney packs' Ogg Vorbis and the generated WAVs alike), cut where its sound starts, kept to `max`
// seconds with a short fade, summed to mono, resampled to 24 kHz and levelled to its `peak`, then written as 16-bit
// WAV: small, and with no encoder delay, so a blow is heard on the frame it lands.
//   KENNEY=/path/to/unzipped/packs node tools/sfx/build.mjs
// (KENNEY holds one folder per pack, named zip-<pack>/x/Audio/*.ogg as kenney.nl's zips unpack.)
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(HERE, '../../static/sfx');
const KENNEY = process.env.KENNEY;
if (!KENNEY) { console.error('set KENNEY to the folder with the unzipped Kenney packs'); process.exit(1); }
const list = JSON.parse(readFileSync(path.join(HERE, 'manifest.json'), 'utf8'));
const fileOf = (src) => src.startsWith('k:') ? path.join(KENNEY, 'zip-' + src.slice(2).split('/')[0], 'x/Audio', src.slice(2).split('/').slice(1).join('/')) : path.join(HERE, 'raw', src.slice(2) + '.wav');
const server = createServer((req, res) => {
  try { const name = decodeURIComponent(req.url.slice(1)); res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); res.end(readFileSync(fileOf(list[name][0]))); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const port = 9300 + Math.floor(Math.random() * 400), profile = path.join(tmpdir(), 'sfx-build-' + port);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws = null;
for (let i = 0; i < 80 && !ws; i++) { await sleep(150); try { const t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page'); if (t) ws = new WebSocket(t.webSocketDebuggerUrl); } catch { /* not up */ } }
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const wait = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
const send = (method, params) => new Promise((r) => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };

const PAGE = `async (url, peakDb, max, from, loop) => {
  const RATE = 24000;
  const data = await (await fetch(url)).arrayBuffer();
  const src = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(data);
  // mono, at the source's rate
  const n0 = src.length, mono = new Float32Array(n0);
  for (let c = 0; c < src.numberOfChannels; c++) { const d = src.getChannelData(c); for (let i = 0; i < n0; i++) mono[i] += d[i] / src.numberOfChannels; }
  let peak = 0; for (const v of mono) peak = Math.max(peak, Math.abs(v));
  // where it starts (the first sample above -40 dB of its peak, less 2 ms) and where it has died away (-50 dB)
  let a = Math.floor((from || 0) * src.sampleRate); while (!loop && a < n0 && Math.abs(mono[a]) < peak * 0.01) a++;
  a = loop ? 0 : Math.max(0, a - Math.round(0.002 * src.sampleRate));
  let b = n0 - 1; while (!loop && b > a && Math.abs(mono[b]) < peak * 0.003) b--;
  b = loop ? n0 : Math.min(b + Math.round(0.02 * src.sampleRate), n0, a + Math.round((max || 10) * src.sampleRate));
  const cut = src.sampleRate === RATE ? null : new OfflineAudioContext(1, Math.ceil((b - a) * RATE / src.sampleRate), RATE);
  let out;
  if (cut) { const buf = cut.createBuffer(1, b - a, src.sampleRate); buf.copyToChannel(mono.subarray(a, b), 0); const s = cut.createBufferSource(); s.buffer = buf; s.connect(cut.destination); s.start(); out = (await cut.startRendering()).getChannelData(0); }
  else out = mono.slice(a, b);
  const fade = loop ? 0 : Math.min(out.length >> 2, Math.round(0.04 * RATE));
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  let p2 = 0; for (const v of out) p2 = Math.max(p2, Math.abs(v));
  const gain = Math.pow(10, peakDb / 20) / Math.max(p2, 1e-6);
  const pcm = new Int16Array(out.length); for (let i = 0; i < out.length; i++) pcm[i] = Math.max(-32767, Math.min(32767, Math.round(out[i] * gain * 32767)));
  const head = new DataView(new ArrayBuffer(44)), str = (o, s) => [...s].forEach((c, q) => head.setUint8(o + q, c.charCodeAt(0)));
  str(0, 'RIFF'); head.setUint32(4, 36 + pcm.byteLength, true); str(8, 'WAVE'); str(12, 'fmt '); head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 1, true);
  head.setUint32(24, RATE, true); head.setUint32(28, RATE * 2, true); head.setUint16(32, 2, true); head.setUint16(34, 16, true); str(36, 'data'); head.setUint32(40, pcm.byteLength, true);
  const bytes = new Uint8Array(44 + pcm.byteLength); bytes.set(new Uint8Array(head.buffer), 0); bytes.set(new Uint8Array(pcm.buffer), 44);
  let bin = ''; for (let q = 0; q < bytes.length; q += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(q, q + 0x8000));
  return { b64: btoa(bin), seconds: out.length / RATE, srcSeconds: n0 / src.sampleRate };
}`;
mkdirSync(OUT, { recursive: true });
let total = 0;
for (const name of Object.keys(list).filter((k) => !k.startsWith('_'))) {
  const [src, peak = -6, max = 0, from = 0, loop = false] = list[name];
  const r = await ev(`(${PAGE})(${JSON.stringify(base + '/' + encodeURIComponent(name))}, ${peak}, ${max}, ${from}, ${loop})`);
  const bytes = Buffer.from(r.b64, 'base64');
  writeFileSync(path.join(OUT, name + '.wav'), bytes);
  total += bytes.length;
  console.log(`${name.padEnd(14)} ${r.seconds.toFixed(2)} s (of ${r.srcSeconds.toFixed(2)})  ${src}`);
}
console.log(`${Object.keys(list).length - 1} files, ${(total / 1024).toFixed(0)} KB in static/sfx`);
ws.close(); chrome.kill(); server.close(); await sleep(200); rmSync(profile, { recursive: true, force: true });
