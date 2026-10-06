'use strict';
// Regressões de medição: relógio e foco controlados, sem enviar dados ao Google.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../js/analytics.js'), 'utf8');

function browser(tag = true) {
  let now = 0, focus = true;
  const events = [], listeners = {};
  const KM = {};
  const on = (type, callback) => { listeners[type] = callback; };
  const document = { hidden: false, hasFocus: () => focus, addEventListener: on };
  const window = { KM, addEventListener: on };
  if (tag) window.gtag = (_, name, params) => events.push({ name, params });
  const context = { window, document, performance: { now: () => now }, setInterval() {}, requestAnimationFrame() {} };
  vm.createContext(context);
  vm.runInContext(source, context);
  const state = (opts = {}) => Object.assign({ paused: false, over: null, diff: 'normal' }, opts);
  return {
    KM, events, state, document, context,
    load(name) { vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/' + name + '.js'), 'utf8'), context); },
    start(S = state(), entry) { KM.S = S; KM.analytics.start(S, entry); return S; },
    wait(ms) {
      for (let left = ms; left > 0;) {
        const dt = Math.min(left, 1000); now += dt; left -= dt; KM.analytics.update();
      }
    },
    focus(value) { focus = value; listeners[value ? 'focus' : 'blur'](); },
    hide(value) { document.hidden = value; listeners.visibilitychange(); },
    dispatch(type, event = {}) { listeners[type](event); },
    suspend(ms) { now += ms; KM.analytics.update(); },
    total() { return events.filter((e) => e.name === 'game_play_time').reduce((sum, e) => sum + e.params.play_time_seconds, 0); }
  };
}

let passed = 0;
function check(name, fn) { fn(); passed++; console.log('OK: ' + name); }

check('Conta tempo real sem multiplicar pela velocidade e exclui pausa/segundo plano', () => {
  const b = browser(), S = b.start({ paused: true, diff: 'hard', mission: 'c2', speed: 5 });
  b.wait(10000); assert.equal(b.total(), 0); // briefing
  S.paused = false; b.KM.analytics.update(); b.wait(30000);
  assert.equal(b.total(), 30);
  S.paused = true; b.KM.analytics.update(); b.wait(10000);
  S.paused = false; b.KM.analytics.update(); b.wait(5000);
  b.focus(false); b.wait(10000); b.focus(true); b.wait(5000);
  b.hide(true); b.wait(10000); b.hide(false); b.wait(5000);
  b.KM.analytics.finish('menu');
  assert.equal(b.total(), 45);
  assert.equal(b.events.at(-1).params.session_play_seconds, 45);
  assert.equal(b.events[0].params.game_mode, 'conquest');
});

check('Encerramento/vitória não duplicam intervalos nem contam tela de resultado/menu', () => {
  const b = browser(), S = b.start(); b.wait(65000);
  S.over = 'win'; b.KM.analytics.finish('win');
  b.wait(10000); b.KM.analytics.finish('menu');
  assert.equal(b.total(), 65);
  assert.equal(b.events.filter((e) => e.name === 'game_end').length, 1);
  S.over = 'ignored'; b.KM.analytics.start(S, 'continue');
  b.wait(5000); b.KM.analytics.finish('menu');
  assert.equal(b.total(), 70);
  assert.equal(b.events.at(-1).params.session_play_seconds, 5);
});

check('Carregar/reiniciar começa novo trecho, sem herdar tempo da simulação/save', () => {
  const b = browser(); b.start(b.state({ mission: 't1', time: 5000 })); b.wait(7000);
  b.start(b.state({ mp: true, time: 10000 }), 'load'); b.wait(4000);
  b.KM.analytics.finish('lose');
  assert.equal(b.total(), 11);
  assert.deepEqual(b.events.filter((e) => e.name === 'game_end').map((e) => e.params.session_play_seconds), [7, 4]);
  assert.equal(b.events.at(-1).params.game_mode, 'multiplayer');
  assert.equal(b.events.at(-1).params.entry_source, 'load');
});

check('Editor, tela final e ausência da tag não geram eventos', () => {
  const b = browser(); b.start(b.state({ editor: true })); b.wait(5000);
  b.start(b.state({ over: 'win' })); b.wait(5000);
  assert.equal(b.events.length, 0);
  const local = browser(false); local.start(); local.wait(35000); local.KM.analytics.finish('menu');
  assert.equal(local.events.length, 0);
});

check('Fechar/restaurar pelo histórico preserva saldos sem duplicar fechamento', () => {
  const b = browser(); b.start(); b.wait(9000); b.hide(true);
  b.dispatch('pagehide'); b.dispatch('pagehide'); b.wait(20000);
  b.hide(false); b.dispatch('pageshow', { persisted: true }); b.wait(6000);
  b.KM.analytics.finish('menu');
  assert.equal(b.total(), 15);
  assert.equal(b.events.filter((e) => e.name === 'game_end').length, 2);
  assert.equal(b.events.at(-1).params.entry_source, 'restore');
});

check('Suspensão longa não é contabilizada integralmente e falhas da tag não quebram o jogo', () => {
  const b = browser(); b.start(); b.suspend(120000); b.KM.analytics.finish('page_exit');
  assert.equal(b.total(), 2);
  b.KM.S = b.state();
  // Substitui a tag na próxima instância antes da medição.
  vm.runInNewContext(source, {
    window: { KM: b.KM, gtag() { throw new Error('blocked'); }, addEventListener() {} },
    document: { hidden: false, hasFocus: () => true, addEventListener() {} },
    performance: { now: () => 0 }
  });
  assert.doesNotThrow(() => { b.KM.analytics.start(b.KM.S); b.KM.analytics.finish('menu'); });
});

check('Fluxo real do jogo aciona medição ao iniciar, salvar/carregar, vencer, continuar e sair', () => {
  const b = browser(), KM = b.KM, noop = () => {}, nodes = new Map(), storage = new Map();
  b.document.querySelector = (id) => {
    if (!nodes.has(id)) nodes.set(id, { dataset: {}, classList: { add: noop, remove: noop, toggle: noop },
      addEventListener(type, fn) { this[type] = fn; } });
    return nodes.get(id);
  };
  b.document.body = { classList: { toggle: noop, remove: noop } };
  b.context.localStorage = { getItem: (k) => storage.get(k) || null, setItem: (k, value) => storage.set(k, value) };
  b.load('ui');
  Object.assign(KM.ui, { clearSel: noop, setTool: noop, setTab: noop, toast: noop, refreshMenu: noop,
    statsHtml: () => '', bindStats: noop });
  Object.assign(KM, { SAVE_V: 1, setMapSize: noop, computeRoadComps: noop, ambientStop: noop,
    R: { buildBase: noop, centerOn: noop }, music: { start: noop, victory: noop },
    tutorial: { hide: noop }, isSoldier: () => false, nextMission: () => null,
    newState: () => b.state({ v: 1, time: 0, map: { W: 40, H: 40 }, houses: {}, units: {},
      starts: [{ x: 5, y: 5 }], players: [{}], hist: { t: [0], d: [[]] } }) });
  b.load('main');
  KM.ui.initMenu();
  KM.startGame(); b.wait(4000); KM.save(0);
  assert.equal(storage.get('rm_save_0').includes('play_time'), false);
  assert.equal(KM.load(0), true); b.wait(5000);
  KM.S.over = 'win'; KM.ui.showEnd('win'); b.wait(10000);
  assert.equal(b.total(), 9);
  nodes.get('#endscreen').click({ target: { closest: () => ({ dataset: { cont: '1' } }) } });
  b.wait(3000); KM.quitToMenu(); b.wait(10000);
  assert.equal(b.total(), 12);
  assert.deepEqual(b.events.filter((e) => e.name === 'game_start').map((e) => e.params.entry_source), ['new', 'load', 'continue']);
  assert.deepEqual(b.events.filter((e) => e.name === 'game_end').map((e) => e.params.end_reason), ['replaced', 'win', 'menu']);
});

console.log(passed + ' grupos de verificação passaram.');
