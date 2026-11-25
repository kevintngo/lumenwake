import { CLASSES } from '../../data/classes';
import { LUMENS } from '../../data/lumens';
import { PEOPLES } from '../../data/peoples';
import { BOONS } from '../../data/sites';
import type { BoonId, ClassId, LumenId, PeopleId } from '../../types/domain';
import { dropMeterIcon, heartMeterIcon, MENU_ICONS } from '../icons';
import { art, highlightNumbers } from '../ui-helpers';

export interface StatusSnapshot {
  name: string;
  people: PeopleId;
  cls: ClassId;
  level: number;
  glint: number;
  hp: number;
  maxHp: number;
  hpRatio: number;
  low: boolean;
  focus: number;
  maxFocus: number;
  focusRatio: number;
  xpPct: number;
  xpRatio: number;
  boon: BoonId | null;
  due: boolean;
  lumenKind: LumenId;
  lumenLevel: number;
  lumenCharge: number;
  lumenFull: boolean;
  tracker: string;
}

interface StatusPlatesProps {
  hud: StatusSnapshot;
  bust: string;
  onLumenClick: () => void;
  onMenuOpen: (id: 'character' | 'bag' | 'lumen' | 'menu') => void;
}

export function StatusPlates({ hud, bust, onLumenClick, onMenuOpen }: StatusPlatesProps) {
  const boonDef = hud.boon ? BOONS[hud.boon] : null;
  const lumenDef = LUMENS[hud.lumenKind];
  const trackerSegs = hud.tracker ? highlightNumbers(hud.tracker) : [];

  return (
    <div id="hero">
      <section id="status" class="plate" aria-label="Your character">
        <div class="face">
          <img id="hero-face" src={bust || undefined} alt="" />
          <div class="badge" id="lvl" title="Level">
            {hud.level}
          </div>
        </div>
        <div class="bars">
          <div class="who">
            <span class="names">
              <span id="pname" class={`c-${hud.cls}`}>
                {hud.name}
              </span>
              <small id="pkind">
                {PEOPLES[hud.people].name} {CLASSES[hud.cls].name}
              </small>
            </span>
            <span id="boon" class="boon" hidden={!boonDef} title={boonDef?.desc}>
              {boonDef?.name || ''}
            </span>
            <span id="glint" class="coin" title="Glint">
              {hud.glint}
            </span>
          </div>
          <div class="meter">
            {heartMeterIcon()}
            <div
              class={hud.low ? 'bar hp low' : 'bar hp'}
              id="hp-bar"
              role="meter"
              aria-label="Health"
              aria-valuemin={0}
              aria-valuenow={hud.hp}
              aria-valuemax={hud.maxHp}
            >
              <i id="hp-fill" style={{ transform: `scaleX(${hud.hpRatio.toFixed(3)})` }} />
            </div>
            <b id="hp-text">
              {hud.hp} / {hud.maxHp}
            </b>
          </div>
          <div class="meter">
            {dropMeterIcon()}
            <div
              class="bar fo"
              id="fo-bar"
              role="meter"
              aria-label="Focus"
              aria-valuemin={0}
              aria-valuenow={hud.focus}
              aria-valuemax={hud.maxFocus}
            >
              <i id="fo-fill" style={{ transform: `scaleX(${hud.focusRatio.toFixed(3)})` }} />
            </div>
            <b id="fo-text">
              {hud.focus} / {hud.maxFocus}
            </b>
          </div>
          <div
            class="bar xp"
            id="xp-bar"
            role="meter"
            aria-label="Experience toward the next level"
            aria-valuemin={0}
            aria-valuenow={hud.xpPct}
            aria-valuemax={100}
          >
            <i id="xp-fill" style={{ transform: `scaleX(${hud.xpRatio.toFixed(3)})` }} />
          </div>
        </div>
      </section>

      <section id="lumen" class={hud.lumenFull ? 'plate full' : 'plate'} aria-label="Your lumen">
        <button
          type="button"
          id="lumen-btn"
          aria-label="Your lumen: let its burst go, key G"
          onClick={(e) => {
            onLumenClick();
            if (e.detail) e.currentTarget.blur();
          }}
        >
          <span class="face">
            <img id="lumen-face" src={art(`lumen-${hud.lumenKind}`)} alt="" />
          </span>
          <span class="lumen-words">
            <strong id="lumen-name">{lumenDef.name}</strong>
            <small id="lumen-sub">
              {hud.lumenFull ? `${lumenDef.burst.name} is ready` : `Level ${hud.lumenLevel}`}
            </small>
            <span
              class="bar lu"
              role="meter"
              aria-label="How full it is"
              aria-valuemin={0}
              aria-valuenow={hud.lumenCharge}
              aria-valuemax={100}
              id="lumen-bar"
            >
              <i id="lumen-fill" style={{ transform: `scaleX(${(hud.lumenCharge / 100).toFixed(3)})` }} />
            </span>
          </span>
          <kbd>G</kbd>
        </button>
      </section>

      <nav id="menu" aria-label="Menus">
        <button
          type="button"
          class={hud.due ? 'alert' : undefined}
          data-open="character"
          title="Character (C)"
          aria-label="Character, key C"
          onClick={(e) => {
            onMenuOpen('character');
            if (e.detail) e.currentTarget.blur();
          }}
        >
          {MENU_ICONS.character()}
        </button>
        <button
          type="button"
          data-open="bag"
          title="Gear (B)"
          aria-label="Gear, key B"
          onClick={(e) => {
            onMenuOpen('bag');
            if (e.detail) e.currentTarget.blur();
          }}
        >
          {MENU_ICONS.gear()}
        </button>
        <button
          type="button"
          data-open="lumen"
          title="Lumen (L)"
          aria-label="Your lumen, key L"
          onClick={(e) => {
            onMenuOpen('lumen');
            if (e.detail) e.currentTarget.blur();
          }}
        >
          {MENU_ICONS.lumen()}
        </button>
        <button
          type="button"
          data-open="menu"
          title="Menu (Esc)"
          aria-label="Pause menu and settings, key Escape"
          onClick={(e) => {
            onMenuOpen('menu');
            if (e.detail) e.currentTarget.blur();
          }}
        >
          {MENU_ICONS.menu()}
        </button>
      </nav>

      <section id="tracker" class="plate small" aria-label="Contract" hidden={!hud.tracker}>
        <div class="label">Contract</div>
        <div id="tracker-text">
          {trackerSegs.map((seg, i) =>
            seg.bold ? (
              <b key={i} class={seg.className}>
                {seg.text}
              </b>
            ) : (
              seg.text
            ),
          )}
        </div>
      </section>
    </div>
  );
}
