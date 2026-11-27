import { useEffect, useRef, useState } from '../dom';
import type { CineCardPayload } from '../../types/events';
import type { GameContext } from '../../types/game-context';

interface CinemaOverlayProps {
  game: GameContext;
  onLayout: () => void;
}

interface CardState {
  kind: CineCardPayload['kind'];
  title: string;
  sub: string;
}

export function CinemaOverlay({ game, onLayout }: CinemaOverlayProps) {
  const [skipShown, setSkipShown] = useState(false);
  const [card, setCard] = useState<CardState | null>(null);
  const [cardVisible, setCardVisible] = useState(false);
  const [caption, setCaption] = useState('');
  const [captionShown, setCaptionShown] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bus = game.bus;
    const unsubs = [
      bus.on('cine:begin', (d) => {
        document.body.classList.toggle('cine', d.blocking);
        document.body.classList.toggle('cine-bars', d.bars);
        setSkipShown(d.skip);
        onLayout();
      }),
      bus.on('cine:end', () => {
        document.body.classList.remove('cine', 'cine-bars');
        setSkipShown(false);
        setCardVisible(false);
        setCaptionShown(false);
        onLayout();
      }),
      bus.on('cine:card', (c) => {
        if (!c) {
          setCardVisible(false);
          return;
        }
        setCardVisible(false);
        setCard({ kind: c.kind, title: c.title, sub: c.sub });
      }),
      bus.on('cine:caption', (text) => {
        if (text) setCaption(text);
        setCaptionShown(Boolean(text));
      }),
    ];
    return () => {
      for (const off of unsubs) off();
      document.body.classList.remove('cine', 'cine-bars');
    };
  }, [game, onLayout]);

  useEffect(() => {
    if (!card) return;
    const el = cardRef.current;
    if (el) void el.offsetWidth;
    setCardVisible(true);
  }, [card]);

  const cardClass = card
    ? `cine-card ${card.kind}${cardVisible ? ' show' : ''}`
    : 'cine-card';

  return (
    <div id="cine">
      <div class="bar top" />
      <div class="bar bottom" />
      <div ref={cardRef} id="cine-card" class={cardClass} role="status" aria-live="polite">
        <strong id="cine-title">{card?.title || ''}</strong>
        <span id="cine-sub">{card?.sub || ''}</span>
      </div>
      <p id="cine-caption" class={captionShown ? 'show' : undefined} role="status" aria-live="polite">
        {caption}
      </p>
      <button
        type="button"
        id="cine-skip"
        hidden={!skipShown}
        aria-label="Skip this scene, key Escape"
        onClick={(e) => {
          game.cinema.askSkip();
          if (e.detail) e.currentTarget.blur();
        }}
      >
        Skip
        <kbd>Esc</kbd>
      </button>
    </div>
  );
}
