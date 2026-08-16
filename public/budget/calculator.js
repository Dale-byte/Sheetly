(function () {
  const style = document.createElement('style');
  style.textContent = `
  .calc-fab {
    position: fixed; right: 20px; bottom: 20px; width: 52px; height: 52px;
    border-radius: 50%; background: #3b82f6; color: #fff; border: none;
    box-shadow: 0 6px 20px rgba(0,0,0,.25); cursor: pointer; z-index: 9998;
    font-size: 22px; display: flex; align-items: center; justify-content: center;
  }
  .calc-fab:hover { background: #2563eb; }
  .calc-panel {
    position: fixed; right: 20px; bottom: 84px; width: 260px;
    background: #1f2937; color: #f3f4f6; border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,.4); z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    overflow: hidden; user-select: none;
  }
  .calc-panel.hidden { display: none; }
  .calc-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; background: #111827; cursor: move; font-size: 13px;
  }
  .calc-close {
    background: none; border: none; color: #9ca3af; font-size: 18px; cursor: pointer;
    line-height: 1; padding: 0 4px;
  }
  .calc-display {
    padding: 12px 14px; text-align: right; font-size: 26px; min-height: 40px;
    background: #111827; overflow-x: auto; white-space: nowrap;
  }
  .calc-sub { font-size: 11px; color: #9ca3af; min-height: 14px; text-align: right; padding: 0 14px 4px; background: #111827; }
  .calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #374151; }
  .calc-grid button {
    background: #1f2937; color: #f3f4f6; border: none; padding: 14px 0;
    font-size: 16px; cursor: pointer;
  }
  .calc-grid button:hover { background: #374151; }
  .calc-grid button.op { background: #374151; color: #93c5fd; }
  .calc-grid button.op:hover { background: #4b5563; }
  .calc-grid button.eq { background: #3b82f6; color: #fff; }
  .calc-grid button.eq:hover { background: #2563eb; }
  .calc-grid button.clr { color: #fca5a5; }
  @media (max-width: 480px) {
    .calc-panel { right: 10px; bottom: 74px; width: calc(100vw - 20px); max-width: 300px; }
    .calc-fab { right: 12px; bottom: 12px; }
  }
  `;
  document.head.appendChild(style);

  const fab = document.createElement('button');
  fab.className = 'calc-fab';
  fab.title = 'Calculator';
  fab.setAttribute('aria-label', 'Open calculator');
  fab.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>';

  const panel = document.createElement('div');
  panel.className = 'calc-panel hidden';
  panel.innerHTML = `
    <div class="calc-head">
      <span>Calculator</span>
      <button class="calc-close" aria-label="Close">&times;</button>
    </div>
    <div class="calc-sub" data-role="sub"></div>
    <div class="calc-display" data-role="display">0</div>
    <div class="calc-grid">
      <button class="clr" data-k="C">C</button>
      <button class="op" data-k="back">⌫</button>
      <button class="op" data-k="%">%</button>
      <button class="op" data-k="/">÷</button>
      <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button>
      <button class="op" data-k="*">×</button>
      <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button>
      <button class="op" data-k="-">−</button>
      <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button>
      <button class="op" data-k="+">+</button>
      <button data-k="0" style="grid-column: span 2;">0</button>
      <button data-k=".">.</button>
      <button class="eq" data-k="=">=</button>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  const display = panel.querySelector('[data-role="display"]');
  const sub = panel.querySelector('[data-role="sub"]');

  let cur = '0', prev = null, op = null, justEvaled = false;

  function fmt(n) {
    if (!isFinite(n)) return 'Error';
    const s = Number(n).toString();
    return s.length > 14 ? Number(n).toPrecision(10) : s;
  }
  function render() {
    display.textContent = cur;
    sub.textContent = prev !== null && op ? `${fmt(prev)} ${opSym(op)}` : '';
  }
  function opSym(o){return {'+':'+','-':'−','*':'×','/':'÷'}[o]||o;}
  function calc(a, b, o) {
    a = Number(a); b = Number(b);
    switch (o) { case '+': return a+b; case '-': return a-b;
      case '*': return a*b; case '/': return b===0 ? NaN : a/b; }
    return b;
  }
  function inputDigit(d) {
    if (justEvaled) { cur = '0'; justEvaled = false; }
    if (d === '.') { if (!cur.includes('.')) cur += '.'; }
    else { cur = cur === '0' ? d : cur + d; }
    render();
  }
  function setOp(o) {
    if (op && prev !== null && !justEvaled) {
      const r = calc(prev, cur, op);
      prev = r; cur = fmt(r);
    } else {
      prev = Number(cur);
    }
    op = o; justEvaled = false;
    cur = '0';
    // show prev in sub
    display.textContent = fmt(prev);
    sub.textContent = `${fmt(prev)} ${opSym(op)}`;
  }
  function equals() {
    if (op === null || prev === null) return;
    const r = calc(prev, cur, op);
    cur = fmt(r); prev = null; op = null; justEvaled = true;
    render();
  }
  function press(k) {
    if (/^[0-9.]$/.test(k)) return inputDigit(k);
    if (k === '+' || k === '-' || k === '*' || k === '/') return setOp(k);
    if (k === '=') return equals();
    if (k === 'C') { cur='0'; prev=null; op=null; justEvaled=false; render(); return; }
    if (k === 'back') { cur = cur.length>1 ? cur.slice(0,-1) : '0'; render(); return; }
    if (k === '%') { cur = fmt(Number(cur)/100); render(); return; }
  }

  panel.querySelector('.calc-grid').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    press(b.dataset.k);
  });
  panel.querySelector('.calc-close').addEventListener('click', () => panel.classList.add('hidden'));
  fab.addEventListener('click', () => panel.classList.toggle('hidden'));

  // Keyboard support while panel open
  document.addEventListener('keydown', (e) => {
    if (panel.classList.contains('hidden')) return;
    if (e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    const k = e.key;
    if (/^[0-9.]$/.test(k)) { press(k); e.preventDefault(); }
    else if (['+','-','*','/'].includes(k)) { press(k); e.preventDefault(); }
    else if (k === 'Enter' || k === '=') { press('='); e.preventDefault(); }
    else if (k === 'Backspace') { press('back'); e.preventDefault(); }
    else if (k === 'Escape') { panel.classList.add('hidden'); }
    else if (k.toLowerCase() === 'c') { press('C'); }
  });

  // Draggable header
  const head = panel.querySelector('.calc-head');
  let drag = null;
  head.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('calc-close')) return;
    const r = panel.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
    panel.style.left = r.left + 'px'; panel.style.top = r.top + 'px';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!drag) return;
    panel.style.left = Math.max(0, e.clientX - drag.dx) + 'px';
    panel.style.top = Math.max(0, e.clientY - drag.dy) + 'px';
  });
  document.addEventListener('mouseup', () => { drag = null; });

  render();
})();
