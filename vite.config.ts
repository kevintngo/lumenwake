import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

const dataUrl = (type: string, text: string): string => `data:${type},${encodeURIComponent(text.trim())}`;

/**
 * The whole game in one file: the icon and the web-app manifest go into index.html as data URLs, and in a build the
 * script and the styles are written into it too, so the page loads nothing but itself. (The only other file is
 * og.jpg, the picture link previews show; the game never asks for it.)
 */
function selfContained(): Plugin {
  const icon = dataUrl('image/svg+xml', readFileSync('src/ui/icon.svg', 'utf8'));
  const manifest = JSON.parse(readFileSync('src/ui/manifest.json', 'utf8'));
  manifest.icons = [
    { src: icon, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: icon, sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
  ];
  return {
    name: 'lumenwake-self-contained',
    enforce: 'post',
    transformIndexHtml: (html) =>
      html
        .replace('%LUMENWAKE_ICON%', () => icon)
        .replace('%LUMENWAKE_MANIFEST%', () => dataUrl('application/manifest+json', JSON.stringify(manifest))),
    generateBundle(_options, bundle) {
      const page = bundle['index.html'];
      if (!page || page.type !== 'asset') return;
      let html = String(page.source);
      for (const [file, out] of Object.entries(bundle)) {
        const ref = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (out.type === 'chunk' && out.isEntry) {
          const code = out.code.replace(/<\/(script)/gi, '<\\/$1');
          html = html.replace(new RegExp(`<script type="module" crossorigin src="[^"]*${ref}"></script>`), () => `<script type="module">${code}</script>`);
          delete bundle[file];
        } else if (out.type === 'asset' && file.endsWith('.css')) {
          html = html.replace(new RegExp(`<link rel="stylesheet" crossorigin href="[^"]*${ref}">`), () => `<style>${String(out.source)}</style>`);
          delete bundle[file];
        }
      }
      if (/<script[^>]+src=|<link[^>]+stylesheet/.test(html)) this.error('index.html still points at a script or stylesheet file');
      page.source = html;
    },
  };
}

/** GLSL without its comments and layout: directives keep their own lines (#include is matched by line). */
export function minifyGlsl(src: string): string {
  const out: string[] = [];
  let run = '';
  const flush = (): void => {
    if (run) out.push(run);
    run = '';
  };
  const body = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      flush();
      out.push(line.replace(/[ \t]+/g, ' '));
      continue;
    }
    const tight = line
      .replace(/\s+/g, ' ')
      // drop spaces next to punctuation, but never join two + or two - into ++ or --
      .replace(/ ?([{}()[\];,=<>!&|?:*\/^%]) ?/g, '$1')
      .replace(/([^+-]) ([+-])/g, '$1$2')
      .replace(/([+-]) ([^+-])/g, '$1$2');
    run += (run && /[\w.]$/.test(run) && /^[\w.]/.test(tight) ? ' ' : '') + tight;
  }
  flush();
  return out.join('\n') + '\n';
}

function glslMinify(): Plugin {
  return {
    name: 'lumenwake-glsl-minify',
    apply: 'build',
    enforce: 'pre',
    load(id) {
      const [file, query] = id.split('?');
      if (!file.endsWith('.glsl') || query !== 'raw') return null;
      return `export default ${JSON.stringify(minifyGlsl(readFileSync(file, 'utf8')))};`;
    },
  };
}

export default defineConfig({
  plugins: [preact(), glslMinify(), selfContained()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    modulePreload: false,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1200,
  },
});
