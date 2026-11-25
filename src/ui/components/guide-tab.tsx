interface GuideTabProps {
  touch: boolean;
}

const TOUCH_COLS: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  [
    'Move and look',
    [
      ['Stick', 'Walk'],
      ['Tap', 'Move, attack or talk'],
      ['Arrow', 'Jump'],
      ['Drag', 'Turn the view'],
      ['Pinch', 'Zoom'],
    ],
  ],
  [
    'Fight',
    [
      ['Sword', 'Attack. Hold to keep going'],
      ['Round', 'Abilities'],
      ['Arrows', 'Next target'],
      ['Flasks', 'Tonic, Draught'],
      ['Lumen', 'Its burst, when full'],
    ],
  ],
  [
    'Menus',
    [
      ['Figure', 'Character'],
      ['Frame', 'Gear'],
      ['Light', 'Lumen'],
      ['Lines', 'Pause and settings'],
    ],
  ],
];

const DESKTOP_COLS: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  [
    'Move and look',
    [
      ['W A S D', 'Walk'],
      ['Click', 'Move, attack or talk'],
      ['Space', 'Jump'],
      ['Right-drag', 'Turn the view'],
      ['Wheel', 'Zoom'],
    ],
  ],
  [
    'Fight',
    [
      ['F', 'Attack, or talk'],
      ['Tab', 'Next target'],
      ['1 2 3 4', 'Abilities'],
      ['R T', 'Tonic, Draught'],
      ['G', 'Lumen’s burst'],
    ],
  ],
  [
    'Menus',
    [
      ['C', 'Character'],
      ['B', 'Gear'],
      ['L', 'Lumen'],
      ['J', 'Contract'],
      ['H', 'This guide'],
      ['M', 'Sound on or off'],
      ['Esc', 'Close, or pause'],
    ],
  ],
];

const NOTES: readonly (readonly [string, string])[] = [
  ['Loot', 'Walk over it. Pods open once their island is quiet.'],
  [
    'Relics and parts',
    'Elders carry relics, likelier at higher threat. Salvage spare gear for parts and hone what you keep.',
  ],
  ['Threat', 'A place is harder each time you go back, and pays more. Lose there and it eases.'],
  ['Side islands', 'Marks pay extra. A beacon maps the rest. A crystal lends a boon.'],
  ['Your lumen', 'Feed it what creatures drop. What it eats decides its shape.'],
];

export function GuideTab({ touch }: GuideTabProps) {
  const cols = touch ? TOUCH_COLS : DESKTOP_COLS;

  return (
    <div class="guideview">
      <div class="guide-cols">
        {cols.map(([title, rows]) => (
          <section key={title}>
            <h3 class="label">{title}</h3>
            <div class="keys-list">
              {rows.map(([keys, desc]) => (
                <>
                  <span key={`${keys}-k`} class="keys">
                    {keys.split(' ').map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                  <span key={`${keys}-d`}>{desc}</span>
                </>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div class="guide-notes">
        {NOTES.map(([title, text]) => (
          <div key={title} class="card">
            <strong>{title}</strong>
            <small>{text}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
