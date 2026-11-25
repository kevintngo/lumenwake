import './styles/index.css';
import { render } from 'preact';
import type { GameContext } from '../types/game-context';
import { UiRoot } from './components/ui-root';

export function mountUI(game: GameContext): () => void {
  const root = document.getElementById('ui-root');
  if (!root) return () => {};
  render(<UiRoot game={game} />, root);
  return () => {
    render(null, root);
  };
}
