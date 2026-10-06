'use strict';
/* Tempo real de partida em foco. Não usa S.time nem altera saves/lockstep. */
(function (KM) {
  let session = null;
  const seconds = (ms) => Math.round(ms) / 1000;

  function send(name, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
    } catch (e) { /* A medição nunca deve interromper o jogo. */ }
  }

  function eligible() {
    const S = session && session.state;
    return !!(S && KM.S === S && !S.editor && !S.paused &&
      (!S.over || S.over === 'ignored') && !document.hidden && document.hasFocus());
  }

  function flush() {
    if (!session || session.pending < 1) return;
    send('game_play_time', Object.assign({}, session.params, {
      play_time_seconds: seconds(session.pending),
      play_time_minutes: seconds(session.pending) / 60
    }));
    session.pending = 0;
  }

  const analytics = KM.analytics = {
    start(S, source) {
      this.finish('replaced');
      if (!S || S.editor || (S.over && S.over !== 'ignored') || typeof window.gtag !== 'function') return;
      session = {
        state: S, last: performance.now(), active: false, total: 0, pending: 0,
        params: {
          game_mode: S.mp ? 'multiplayer' : S.mission === 't1' ? 'tutorial' :
            S.mission ? (S.mission[0] === 'c' ? 'conquest' : 'campaign') : 'skirmish',
          mission_id: S.mission || 'none', difficulty: S.diff || 'normal',
          entry_source: source || 'new'
        }
      };
      session.active = eligible();
      send('game_start', session.params);
    },
    update() {
      if (!session) return;
      const now = performance.now();
      // Intervalos longos sem quadros podem indicar suspensão do navegador.
      const elapsed = Math.max(0, Math.min(2000, now - session.last));
      session.last = now;
      if (session.active) { session.total += elapsed; session.pending += elapsed; }
      session.active = eligible();
      if (!session.active || session.pending >= 30000) flush();
    },
    finish(reason) {
      if (!session) return;
      this.update();
      flush();
      send('game_end', Object.assign({}, session.params, {
        end_reason: reason, session_play_seconds: seconds(session.total),
        session_play_minutes: seconds(session.total) / 60
      }));
      session = null;
    }
  };

  // Envia o saldo antes de ocultar/sair, sem depender de unload (inclusive no celular).
  document.addEventListener('visibilitychange', () => analytics.update());
  window.addEventListener('blur', () => analytics.update());
  window.addEventListener('focus', () => analytics.update());
  window.addEventListener('pagehide', () => analytics.finish('page_exit'));
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) analytics.start(KM.S, 'restore');
  });
})(window.KM);
