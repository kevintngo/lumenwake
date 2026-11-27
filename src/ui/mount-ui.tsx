import './styles/index.css';
import { render } from './dom';
import type { GameContext } from '../types/game-context';
import { UiRoot } from './components/ui-root';
import { setPictureSource } from './ui-helpers';

export function mountUI(game: GameContext): () => void {
  const root = document.getElementById('ui-root');
  if (!root) return () => {};
  setPictureSource((name) => game.portraits.picture(name));
  render(<UiRoot game={game} />, root);
  return () => {
    render(null, root);
  };
}
