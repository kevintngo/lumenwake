import { biomeById } from '../../data/biomes';
import { CREATURES } from '../../data/creatures';
import { GOALS } from '../../sim/missions/missions-system';
import type { GameContext } from '../../types/game-context';
import { elderPic } from '../icons';
import { art } from '../ui-helpers';
import { AlsoPays, ThreatRow } from './contract-tab';

interface BountyViewProps {
  game: GameContext;
  onMutate: () => void;
}

export function BountyView({ game, onMutate }: BountyViewProps) {
  const ms = game.missions;
  const taken = ms.pending;

  return (
    <div class="boardview">
      {ms.offers.map((o, i) => {
        const B = biomeById(o.biome);
        const bossId = o.goal === 'hunt' && B?.boss ? B.boss : null;
        const elder = bossId ? CREATURES[bossId] : null;
        const pic = bossId ? elderPic(bossId) : '';
        const isTaken = taken === o;

        return (
          <div key={`${o.seed}-${i}`} class={`contract${isTaken ? ' taken' : ''}`}>
            <div class="contract-art">
              <img src={art(`place-${o.biome}`)} alt="" />
              <span class="tier">
                Level <b class="c-num">{o.tier}</b>
              </span>
            </div>
            <div class="contract-words">
              <strong>{o.name}</strong>
              <small>
                <b class="c-place">{B?.name || o.biome}</b>
              </small>
              <small>
                <b class={`c-goal-${o.goal}`}>{GOALS[o.goal].name}</b>
                {elder && (
                  <>
                    : <b class="c-foe">{elder.name}</b>
                  </>
                )}
              </small>
              {elder && pic && <img class="elder-chip" src={pic} alt="" />}
            </div>
            <ThreatRow offer={o} />
            <div class="stats pay">
              <div>
                <span>Experience</span>
                <b class="c-xp">{o.xp}</b>
              </div>
              <div>
                <span>Glint</span>
                <b class="c-coin">{o.glint}</b>
              </div>
              <div>
                <span>Islands</span>
                <b>{o.rooms}</b>
              </div>
              <AlsoPays game={game} offer={o} />
            </div>
            {isTaken ? (
              <button
                type="button"
                class="btn"
                data-act="abandon"
                onClick={() => {
                  game.missions.drop();
                  onMutate();
                }}
              >
                Hand it back
              </button>
            ) : (
              <button
                type="button"
                class={`btn${taken ? '' : ' primary'}`}
                data-act="accept"
                data-arg={String(i)}
                aria-label={`Take ${o.name}`}
                onClick={() => {
                  game.missions.accept(i);
                  onMutate();
                }}
              >
                Take it
              </button>
            )}
          </div>
        );
      })}
      <p class="board-note">
        After the last island you can lift out with the haul, or go deeper: another place below, harder each time,
        with a stronger elder and more pay. Fall down there and half the haul is lost.
        {(game.player.sheet.deepest || 0) > 1 && (
          <>
            {' '}
            Your deepest: depth <b class="c-num">{game.player.sheet.deepest}</b>.
          </>
        )}
      </p>
    </div>
  );
}
