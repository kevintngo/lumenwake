// Entry point: build the game, attach the interface and audio, start the loop.

import { Game } from './app/game.js';
import { createUI } from './ui/ui.js';

const canvas = document.getElementById('view');
try {
  const game = new Game(canvas);
  window.__game = game; // handy in the console; nothing depends on it
  game.ui = createUI(game);
  import('./audio/audio.js').then((m) => m.createAudio(game)).catch((e) => console.warn('Audio unavailable:', e));
  game.start();
} catch (err) {
  console.error(err);
  const box = document.getElementById('fatal');
  box.hidden = false;
  box.querySelector('p').textContent = String(err.message || err);
}
