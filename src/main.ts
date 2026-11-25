import { Game } from './app/game';
import { createAudio } from './audio/audio-engine';
import { mountUI } from './ui/mount-ui';

const canvas = document.getElementById('view') as HTMLCanvasElement | null;
try {
  if (!canvas) throw new Error('Canvas element #view not found');
  const game = new Game(canvas);
  mountUI(game);
  try {
    createAudio(game);
  } catch (err) {
    console.warn('Audio unavailable:', err);
  }
  game.start();
} catch (err) {
  console.error(err);
  const box = document.getElementById('fatal');
  if (box) {
    box.hidden = false;
    const p = box.querySelector('p');
    if (p) p.textContent = String(err instanceof Error ? err.message : err);
  }
}
