#!/usr/bin/env node
// Builds the release:  node build.js  ->  dist/index.html  (+ dist/static)
//
// The source tree stays readable and runs unbundled from any static server.
// This script only packs it: shader comments and indentation are stripped, the
// modules are bundled and minified with esbuild, and script + styles are
// inlined into one HTML page. The icons, the share picture and the web app
// manifest in static/ are copied beside it. Needs Node, and network access the
// first time (npx fetches esbuild).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const ESBUILD = 'esbuild@0.24.0';
const kb = (n) => (n / 1000).toFixed(1) + ' kB';

// ---- copy src to a scratch folder, slimming every /* glsl */ template on the way
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brushwild-build-'));
let glslBefore = 0, glslAfter = 0;
const slimGLSL = (code) => code.replace(/\/\* glsl \*\/ `([^`]*)`/g, (_, body) => {
  const out = body.split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter(Boolean)
    .join('\n');
  glslBefore += body.length; glslAfter += out.length;
  return '`\n' + out + '\n`';
});
(function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) copy(a, b);
    else if (entry.name.endsWith('.js')) fs.writeFileSync(b, slimGLSL(fs.readFileSync(a, 'utf8')));
    else fs.copyFileSync(a, b);
  }
})(path.join(ROOT, 'src'), path.join(tmp, 'src'));

// ---- bundle
const bundle = path.join(tmp, 'bundle.js');
execFileSync('npx', ['--yes', ESBUILD, path.join(tmp, 'src', 'main.js'), '--bundle', '--minify', '--format=esm',
  '--target=es2022', '--legal-comments=none', `--outfile=${bundle}`], { stdio: ['ignore', 'ignore', 'inherit'] });
const js = fs.readFileSync(bundle, 'utf8').trim();
if (js.includes('</script')) throw new Error('Bundle contains </script');

// ---- styles
const cssSrc = fs.readFileSync(path.join(ROOT, 'src/ui/ui.css'), 'utf8');
const css = cssSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/ ?([{};,]) ?/g, '$1')
  .replace(/: /g, ':')
  .replace(/;}/g, '}')
  .trim();

// ---- page
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swap = (pattern, replacement) => {
  if (!pattern.test(html)) throw new Error(`index.html: could not find ${pattern}`);
  html = html.replace(pattern, () => replacement);
};
swap(/<link rel="stylesheet" href="\.\/src\/ui\/ui\.css" \/>/, `<style>${css}</style>`);
swap(/<script type="module" src="\.\/src\/main\.js"><\/script>/, `<script type="module">${js}</script>`);
html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim() + '\n';

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/index.html'), html);
// the page's own files: icons, the share picture, the web app manifest
fs.rmSync(path.join(ROOT, 'dist/static'), { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'static'), path.join(ROOT, 'dist/static'), { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`shaders  ${kb(glslBefore)} -> ${kb(glslAfter)}`);
console.log(`script   ${kb(js.length)} minified`);
console.log(`total    dist/index.html  ${kb(Buffer.byteLength(html))}`);
