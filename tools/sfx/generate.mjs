#!/usr/bin/env node
// Makes the sound effects listed in tools/sfx/generated.json with ElevenLabs (sound effects v2) through fal, as raw
// 24 kHz mono PCM in tools/sfx/raw/<name>.pcm. build.mjs then trims and levels them with the CC0 recordings.
//   FAL_KEY=... node tools/sfx/generate.mjs [name ...]      (or a FAL_API_KEY line in ../.env)
// Costs $0.002 a second of sound (about $0.07 for the whole list). Skips names already made.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), RAW = path.join(HERE, 'raw');
const env = (() => { try { return readFileSync(path.join(HERE, '../../../.env'), 'utf8'); } catch { return ''; } })();
const KEY = process.env.FAL_KEY || (env.match(/^FAL_API_KEY=["']?([^"'\n]+)/m) || [])[1];
if (!KEY) { console.error('no fal key'); process.exit(1); }
const list = JSON.parse(readFileSync(path.join(HERE, 'generated.json'), 'utf8'));
const want = process.argv.slice(2);
mkdirSync(RAW, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ENDPOINT = 'fal-ai/elevenlabs/sound-effects/v2';
async function make(name, [text, seconds]) {
  const out = path.join(RAW, name + '.wav');
  if (existsSync(out)) return 'kept';
  const head = { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json' };
  const sub = await (await fetch(`https://queue.fal.run/${ENDPOINT}`, { method: 'POST', headers: head, body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: 0.6, output_format: 'pcm_24000', loop: name.endsWith('-hum') }) })).json();
  if (!sub.request_id) throw new Error(name + ': ' + JSON.stringify(sub).slice(0, 300));
  for (let i = 0; i < 120; i++) {
    await sleep(1500);
    const st = await (await fetch(sub.status_url, { headers: head })).json();
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED' || st.error) throw new Error(name + ': ' + JSON.stringify(st).slice(0, 300));
  }
  const res = await (await fetch(sub.response_url, { headers: head })).json();
  const url = res.audio && res.audio.url;
  if (!url) throw new Error(name + ': ' + JSON.stringify(res).slice(0, 300));
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(out, bytes);
  return `${((bytes.length - 44) / 96000).toFixed(2)} s`;
}
const names = Object.keys(list).filter((n) => !n.startsWith('_') && (!want.length || want.includes(n)));
for (let i = 0; i < names.length; i += 5) {
  const batch = names.slice(i, i + 5);
  const done = await Promise.all(batch.map((n) => make(n, list[n]).then((r) => `${n}: ${r}`, (e) => `${n}: FAILED ${e.message}`)));
  console.log(done.join('\n'));
}
