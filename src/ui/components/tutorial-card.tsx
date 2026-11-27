import { useEffect, useRef, useState } from '../dom';
import type { GuideStepPayload, GuideTipPayload } from '../../types/events';
import type { GameContext } from '../../types/game-context';

interface TutorialCardProps {
  game: GameContext;
  touch: boolean;
}

export function TutorialCard({ game, touch }: TutorialCardProps) {
  const [step, setStep] = useState<GuideStepPayload | null>(null);
  const [tip, setTip] = useState<GuideTipPayload | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const bus = game.bus;
    const unsubs = [
      bus.on('guide', (d) => {
        setStep(d);
        document.body.classList.toggle('guiding', Boolean(d));
        if (d) {
          requestAnimationFrame(() => {
            const el = cardRef.current;
            if (!el) return;
            el.classList.remove('fresh');
            void el.offsetWidth;
            el.classList.add('fresh');
          });
        }
      }),
      bus.on('guide:step', () => {
        const el = cardRef.current;
        if (!el) return;
        el.classList.remove('tick');
        void el.offsetWidth;
        el.classList.add('tick');
      }),
      bus.on('guide:tip', (d) => {
        setTip(d);
      }),
    ];
    return () => {
      for (const off of unsubs) off();
      document.body.classList.remove('guiding');
    };
  }, [game]);

  return (
    <div id="tutor-stack">
      <section id="tutor-tip" class="plate small" role="status" hidden={!tip}>
        {tip && !touch && tip.keys?.map((k) => <kbd key={k}>{k}</kbd>)}
        {tip && <span>{touch && tip.touch ? tip.touch : tip.text}</span>}
      </section>
      <section ref={cardRef} id="tutor" class="plate" aria-label="First steps" hidden={!step}>
        <div class="tutor-head">
          <span class="tutor-title">{step?.title || ''}</span>
          <span
            class="tutor-pips"
            aria-label={step ? `Step ${step.index + 1} of ${step.total}` : undefined}
          >
            {step &&
              Array.from({ length: step.total }, (_, k) => (
                <i key={k} class={k < step.index ? 'done' : k === step.index ? 'now' : undefined} />
              ))}
          </span>
        </div>
        <p class="tutor-line" role="status" aria-live="polite">
          {step && !touch && step.keys?.map((k) => <kbd key={k}>{k}</kbd>)}
          {step && <span>{touch && step.touch ? step.touch : step.text}</span>}
        </p>
        <button
          type="button"
          class="btn tutor-skip"
          aria-label="Skip the first steps"
          onClick={(e) => {
            game.bus.emit('guide:skip', undefined);
            if (e.detail) e.currentTarget.blur();
          }}
        >
          Skip
        </button>
      </section>
    </div>
  );
}
