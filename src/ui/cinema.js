// A cinematic's frame on the page: the two bars, the lettering the director
// asks for (a place, an elder's name, a contract, a line of caption) and the
// Skip button. It only listens: app/cinema.js says what to show and when.

const $ = (id) => document.getElementById(id);

export function createCinemaUI(game, relayout) {
  const body = document.body, card = $('cine-card'), title = $('cine-title'), sub = $('cine-sub'), caption = $('cine-caption'), skip = $('cine-skip');

  game.bus.on('cine:begin', (d) => {
    body.classList.toggle('cine', d.blocking);         // the HUD steps aside while the controls are held
    body.classList.toggle('cine-bars', d.bars);
    skip.hidden = !d.skip;
    relayout();
  });
  game.bus.on('cine:end', () => {
    body.classList.remove('cine', 'cine-bars');
    skip.hidden = true;
    card.classList.remove('show');
    caption.classList.remove('show');
    relayout();
  });
  game.bus.on('cine:card', (c) => {
    if (!c) { card.classList.remove('show'); return; }
    card.className = 'cine-card ' + c.kind;
    title.textContent = c.title;
    sub.textContent = c.sub;
    void card.offsetWidth;           // so the card comes in afresh even straight after another
    card.classList.add('show');
  });
  game.bus.on('cine:caption', (text) => {
    if (text) caption.textContent = text;
    caption.classList.toggle('show', !!text);
  });
  skip.addEventListener('click', (e) => { game.cinema.askSkip(); if (e.detail) skip.blur(); });
}
