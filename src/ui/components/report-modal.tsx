import { useEffect, useRef } from 'preact/hooks';
import { biomeById } from '../../data/biomes';
import { GOALS } from '../../sim/missions/missions-system';
import type { GameContext } from '../../types/game-context';
import type { MissionReport } from '../../types/mission';
import { TOOL_ICONS } from '../icons';
import { art, formatDuration } from '../ui-helpers';
import { describe } from '../../sim/inventory/gear-service';
import { ItemCard } from './item-detail';

interface ReportModalProps {
  game: GameContext;
  report: MissionReport | null;
  onClose: () => void;
}

export function ReportModal({ game, report, onClose }: ReportModalProps) {
  const boxRef = useRef<HTMLElement | null>(null);
  const okRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (report && okRef.current) {
      okRef.current.focus({ preventScroll: true });
    }
  }, [report]);

  const handleClose = (): void => {
    if (!report) return;
    if (boxRef.current && document.activeElement instanceof HTMLElement && boxRef.current.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    onClose();
  };

  const B = report ? biomeById(report.offer.biome) : null;

  return (
    <section
      ref={boxRef}
      id="report"
      class={report && (!report.won || report.lost) ? 'plate lost' : 'plate'}
      role="dialog"
      aria-labelledby="report-name"
      hidden={!report}
    >
      <button
        type="button"
        class="x"
        id="report-x"
        aria-label="Close"
        title="Close (Esc)"
        onClick={handleClose}
      >
        ×
      </button>
      <div class="report-art">
        <img id="report-art" src={report ? art(`place-${report.offer.biome}`) : undefined} alt="" />
        <div class="stamp" id="report-kind">
          {report ? (report.lost ? 'Fell' : report.won ? 'Paid' : 'Lifted out') : ''}
        </div>
      </div>
      <div class="report-body">
        <h2 id="report-name">{report?.offer.name || ''}</h2>
        <p id="report-line">
          {report && (
            <>
              <b class="c-place">{B?.name || report.offer.biome}</b> ·{' '}
              <b class={`c-goal-${report.offer.goal}`}>{GOALS[report.offer.goal].name}</b>
              {!report.won && (
                <>
                  {' '}
                  · <span class="c-bad">Not paid: it is still on the board</span>
                </>
              )}
              {(report.cleared || 0) > 1 && (
                <>
                  {' '}
                  · Down to depth <b class="c-num">{report.cleared}</b>
                  {report.record && <b class="c-good"> (your deepest yet)</b>}
                </>
              )}
              {report.won && report.markNeed > 0 && (
                <>
                  {' '}
                  · Marks <b class="c-num">{report.marks}</b> of <b class="c-num">{report.markNeed}</b>
                </>
              )}
              {report.threat && (
                <>
                  <br />
                  {report.threat.now > report.threat.was ? (
                    <>
                      It will be more dangerous next time: <b class="c-foe">{report.threat.name}</b>.
                    </>
                  ) : (
                    <>
                      It has settled a little: <b class="c-foe">{report.threat.name}</b>.
                    </>
                  )}
                </>
              )}
            </>
          )}
        </p>
        <div class="report-stats" id="report-stats">
          {report && (
            <>
              <div>
                <small>Time</small>
                <b class="c-ink">{formatDuration(report.time)}</b>
              </div>
              <div>
                <small>Felled</small>
                <b class="c-foe">{report.kills}</b>
              </div>
              <div>
                <small>Experience</small>
                <b class="c-xp">+{report.xp}</b>
              </div>
              <div>
                <small>Glint</small>
                <b class="c-coin">+{report.glint}</b>
              </div>
            </>
          )}
        </div>
        {report?.lost && (
          <p class="report-lost">
            {TOOL_ICONS.warn()}
            <span>
              You fell at depth <b class="c-num">{report.depth}</b> and lost half the haul:{' '}
              <b class="c-coin">{report.lost.glint} glint</b>, <b class="c-xp">{report.lost.xp} xp</b>
              {report.lost.items.length > 0 && (
                <>
                  {' '}
                  and {report.lost.items.length === 1 ? 'a piece' : `${report.lost.items.length} pieces`}
                  {' ('}
                  {report.lost.items.map((it, i) => (
                    <>
                      {i > 0 && ', '}
                      <b style={{ color: describe(it).color }}>{describe(it).name}</b>
                    </>
                  ))}
                  {')'}
                </>
              )}
              . What you wore came home with you.
            </span>
          </p>
        )}
        <div id="report-prize">
          {report?.relic && (
            <>
              <div class="label c-relic">Relic found</div>
              <div class="gear item-card">
                <ItemCard game={game} item={report.relic} />
              </div>
            </>
          )}
          {report?.prize && (
            <>
              <div class="label">
                {(report.cleared || 0) > 1 ? 'Best piece paid on the way' : 'Also paid'}
              </div>
              <div class="gear item-card">
                <ItemCard game={game} item={report.prize} />
              </div>
            </>
          )}
        </div>
        <div class="report-foot">
          <button
            ref={okRef}
            type="button"
            class="btn primary"
            id="report-ok"
            onClick={handleClose}
          >
            Continue
          </button>
        </div>
      </div>
    </section>
  );
}
