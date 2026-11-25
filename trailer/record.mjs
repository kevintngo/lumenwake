#!/usr/bin/env node
// Films the trailer from the real game, one frame at a time, with the game's own sound.
//
//   node trailer/record.mjs frames out/frames            every frame as a JPEG, and out/sound.wav
//   node trailer/record.mjs stills out/stills 0,150,300  only these frames, as PNG (the same simulation)
//
// Headless Chrome runs the game from this folder's parent with its clock taken away: requestAnimationFrame
// never fires, timers and performance.now follow a virtual clock, Math.random is seeded, so director.js steps
// the game exactly 1/60 s per frame and two runs film the same thing. The game's sound is rendered in step
// with the picture by the browser's own Web Audio (an OfflineAudioContext, see director.js), so every blow,
// roar and chord lands on the frame it belongs to. The window is square: 720 x 720 at 1.5x, 1080 x 1080.
// Needs Node 22+ and Chrome. encode.swift then joins the frames and the sound into an MP4.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(HERE);
const [mode = 'frames', out = path.join(HERE, 'out/frames'), list = ''] = process.argv.slice(2);
const [W, H] = [720, 720], DPR = 1.5;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- a static server for the game
const TYPES = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', json: 'application/json', woff2: 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT)) throw new Error('outside');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[file.split('.').pop()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// ---- the browser
const port = 9500 + Math.floor(Math.random() * 400), profile = path.join(tmpdir(), 'lumenwake-trailer-' + port);
const chrome = spawn(CHROME, ['--headless=new', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', `--force-device-scale-factor=${DPR}`, `--window-size=${W},${H}`,
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--mute-audio', '--no-first-run', '--disable-extensions', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ws = null;
for (let i = 0; i < 80 && !ws; i++) {
  await sleep(150);
  try { const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); if (page) ws = new WebSocket(page.webSocketDebuggerUrl); } catch { /* not up yet */ }
}
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; console.log('[exception]', String(d.exception?.description || d.text).slice(0, 700)); }
  else if (m.method === 'Runtime.consoleAPICalled' && /error|warning/.test(m.params.type)) console.log(`[console.${m.params.type}]`, m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result.result.value;
};
process.on('uncaughtException', (e) => { console.error(String(e.message || e).slice(0, 1600)); chrome.kill(); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error(String((e && e.message) || e).slice(0, 1600)); chrome.kill(); process.exit(1); });
const quit = async (code = 0) => { try { ws.close(); } catch { /* closed */ } chrome.kill(); server.close(); await sleep(200); await rm(profile, { recursive: true, force: true }); process.exit(code); };

// ---- the page's own clock (and its own sound) are taken away before any of its scripts run
const CLOCK = `(() => {
  let seed = 20261125;
  Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const real = { setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window), now: performance.now.bind(performance) };
  window.__real = real;
  window.requestAnimationFrame = () => 0;
  let now = 0, next = 1e6; const queue = new Map();
  performance.now = () => 1000 + now;
  window.setTimeout = (fn, ms = 0, ...a) => { const k = next++; queue.set(k, { at: now + ms, fn, a }); return k; };
  window.clearTimeout = (k) => { if (!queue.delete(k)) real.clearTimeout(k); };
  window.__advance = (ms) => { now += ms; for (const [k, t] of [...queue]) if (t.at <= now) { queue.delete(k); try { t.fn(...t.a); } catch (e) { console.error(e); } } };
  // the game's own sound is not made here: director.js makes one that renders offline, in step with the picture
  window.__AudioContext = window.AudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined;
  Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
})()`;
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: CLOCK });
await send('Page.navigate', { url: `${base}/index.html?new` });
await sleep(1500);
const total = await ev(readFileSync(path.join(HERE, process.env.DIRECTOR || 'director.js'), 'utf8'));
console.log(`director ready: ${total} frames (${(total / 60).toFixed(2)} s)`);

const shot = async (format, quality) => Buffer.from((await send('Page.captureScreenshot', { format, quality, captureBeyondViewport: false })).result.data, 'base64');
const started = Date.now();
await mkdir(out, { recursive: true });
if (mode === 'stills') {
  const want = new Set(list.split(',').filter(Boolean).map(Number));
  const last = Math.max(...want);
  for (let f = 0; f <= last && f < total; f++) {
    const info = await ev('__dir.step()');
    if (want.has(f)) { await writeFile(path.join(out, `f${String(f).padStart(4, '0')}.png`), await shot('png')); console.log('still', f, info); }
  }
} else {
  for (let f = 0; f < total; f++) {
    const info = await ev('__dir.step()');
    await writeFile(path.join(out, `f${String(f).padStart(5, '0')}.jpg`), await shot('jpeg', 95));
    if (f % 150 === 0) console.log(`frame ${f}/${total} ${info} ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  // the sound, rendered alongside: 16-bit stereo WAV, handed over in pieces
  const n = await ev('__dir.finishSound()');
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(Buffer.from(await ev(`__dir.soundPart(${i})`), 'base64'));
  await writeFile(path.join(path.dirname(out), 'sound.wav'), Buffer.concat(parts));
  console.log('wrote', out, 'and sound.wav', ((Date.now() - started) / 1000).toFixed(0) + 's');
}
await quit();
