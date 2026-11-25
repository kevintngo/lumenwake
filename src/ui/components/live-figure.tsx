import { useEffect, useRef } from 'preact/hooks';
import type { GameContext } from '../../types/game-context';
import { floorRingSvg } from '../icons';

interface LiveFigureProps {
  game: GameContext;
  what: string;
  label: string;
}

export function LiveFigure({ game, what, label }: LiveFigureProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (box) game.portraits.mount(box, what);
  }, [game, what]);

  const kind = what.split(':')[0];

  return (
    <div
      ref={boxRef}
      class={`figure live stage-${kind}`}
      data-stage={what}
      tabIndex={0}
      role="img"
      aria-label={`${label} Drag it, or press the left and right arrow keys, to turn it.`}
    >
      {floorRingSvg()}
      <canvas class="stage" aria-hidden="true" />
      <span class="turn-hint" aria-hidden="true">
        Drag to turn
      </span>
    </div>
  );
}
