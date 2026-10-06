'use strict';
/* Multijogador P2P (WebRTC DataChannel) com lockstep determinístico, de 2 a 4 jogadores.
   Sem servidor: topologia em estrela, o anfitrião (vaga 0) tem uma conexão com cada convidado
   (vagas 1 a 3) e repassa a todos as jogadas que recebe. */
(function (KM) {
  const $ = (s) => document.querySelector(s);
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
  const MAXP = 4;
  const MODES = { versus: 'Todos contra todos', coop: 'Cooperativo contra a IA', '2x2': '2 contra 2' };
  const MAX_PACKET = 64 * 1024, MAX_COMMANDS = 128, MAX_HASH_AGE = 1000;
  const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const int = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
  const only = (o, allowed) => Object.keys(o).every((k) => allowed.includes(k));

  const net = KM.net = {
    active: false, connected: false, started: false, role: null, humans: 2, DELAY: 3,
    peers: {}, // vaga -> { id, pc, dc, o (jogador na partida), ping }
    inbox: {}, pending: [], pendingSize: 0, hashes: {}, drops: {}, last: {}, turn: -1, ping: 0, lag: 0, waitT: 0, rejected: 0,

    // ---------- salas por código (apresentação pelo ntfy.sh; depois a partida é direta entre os navegadores) ----------
    RELAY: 'https://ntfy.sh/',
    roomTopic(code) { return 'ultimo-feudo-sala-' + code.toLowerCase(); },
    post(msg) { return fetch(this.RELAY + this.roomTopic(this.code), { method: 'POST', body: JSON.stringify(msg) }).catch(() => this.status('<div class="warn">Sem conexão com o servidor de salas. Tente o modo manual.</div>')); },
    listen(onMsg) {
      if (this.es) this.es.close();
      const es = this.es = new EventSource(this.RELAY + this.roomTopic(this.code) + '/sse');
      es.onmessage = (e) => { try { const m = JSON.parse(e.data); if (m.event === 'message') { const d = JSON.parse(m.message); if (d.from !== this.myId) onMsg(d); } } catch (err) { /* ignora */ } };
      return new Promise((res) => { es.onopen = res; setTimeout(res, 5000); });
    },
    stopListen() { if (this.es) { this.es.close(); this.es = null; } },
    async roomHost() {
      this.close(true);
      this.role = 'host'; this.started = false; this.myId = 'h' + Math.random().toString(36).slice(2, 9);
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      this.code = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join('');
      this.status('<p class="muted">Abrindo sala...</p>');
      await this.listen((d) => this.onRoomMsg(d));
      this.renderLobby();
    },
    // mensagens do servidor de salas recebidas pelo anfitrião: cada "hello" ganha a próxima vaga livre
    async onRoomMsg(d) {
      if (d.t === 'hello') {
        if (Object.values(this.peers).some((p) => p.id === d.from)) return;
        const slot = this.started ? 0 : this.freeSlot();
        if (!slot) { this.post({ t: 'full', from: this.myId, to: d.from }); return; }
        const pc = this.newPeer(slot, d.from);
        this.bind(slot, pc.createDataChannel('km', { ordered: true }));
        this.renderLobby();
        try {
          await pc.setLocalDescription(await pc.createOffer());
          await this.gather(pc);
          if (this.peers[slot] && this.peers[slot].pc === pc) this.post({ t: 'offer', from: this.myId, to: d.from, slot, sdp: pc.localDescription });
        } catch (e) { this.peerLost(slot); }
      }
      if (d.t === 'answer' && d.to === this.myId) {
        const p = Object.values(this.peers).find((x) => x.id === d.from);
        if (p && p.pc) { try { await p.pc.setRemoteDescription(d.sdp); } catch (e) { /* conexão descartada */ } }
      }
    },
    freeSlot() { for (let s = 1; s < MAXP; s++) if (!this.peers[s]) return s; return 0; },
    async roomJoin(code) {
      code = (code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{5}$/.test(code)) { KM.ui.toast('O código da sala tem 5 letras/números.', 'warn'); return; }
      this.close(true);
      this.role = 'guest'; this.myId = 'g' + Math.random().toString(36).slice(2, 9); this.code = code;
      this.status('<p class="muted">Procurando a sala...</p>');
      await this.listen(async (d) => {
        if (d.to !== this.myId) return;
        if (d.t === 'full') { this.stopListen(); this.status('<div class="warn">Essa sala já está cheia (máximo de 4 jogadores) ou a partida já começou.</div>'); return; }
        if (d.t === 'offer' && !this.peers[0]) {
          const pc = this.newPeer(0, d.from);
          pc.ondatachannel = (e) => this.bind(0, e.channel);
          await pc.setRemoteDescription(d.sdp);
          await pc.setLocalDescription(await pc.createAnswer());
          await this.gather(pc);
          this.post({ t: 'answer', from: this.myId, to: d.from, sdp: pc.localDescription });
          this.stopListen();
          this.status('<p class="muted">Conectando...</p>');
        }
      });
      this.post({ t: 'hello', from: this.myId });
      // se o anfitrião não responder, avisa
      setTimeout(() => { if (!this.connected && this.role === 'guest' && this.es) this.status('<div class="warn">Sala não encontrada. Confira o código e se o anfitrião está com a sala aberta (a sala fecha quando a partida começa).</div><button class="mbtn" data-net="enter">Tentar de novo</button>'); }, 15000);
    },

    // ---------- tela de conexão ----------
    menu(action) {
      const box = $('#mpbox');
      // trocar de opção com a sala aberta fecha a sala (ninguém fica esperando numa sala abandonada)
      if (['enter', 'manual', 'join'].includes(action) && !this.active) this.close();
      if (action === 'room') this.roomHost();
      if (action === 'enter') {
        box.innerHTML = `<p class="muted">Digite o <b>código da sala</b> que seu amigo passou:</p><input id="mpcode" maxlength="5" placeholder="EX: K7Q2M" class="codein">
          <button class="mbtn primary" data-net="enterok">Entrar</button>`;
        setTimeout(() => { const i = $('#mpcode'); if (i) i.focus(); }, 50);
      }
      if (action === 'enterok') this.roomJoin($('#mpcode').value);
      if (action === 'copycode') { navigator.clipboard && navigator.clipboard.writeText(this.code); KM.ui.toast('Código copiado!', 'ok'); }
      if (action === 'manual') box.innerHTML = `<p class="muted">Modo manual: troquem os códigos longos por mensagem (não usa servidor de salas, só 2 jogadores).</p><div class="mgrid"><button class="mbtn" data-net="host">Criar (manual)</button><button class="mbtn" data-net="join">Entrar (manual)</button></div>`;
      if (action === 'host') this.host();
      if (action === 'join') {
        box.innerHTML = `<p class="muted">Cole aqui o <b>código do anfitrião</b>:</p><textarea id="mpin" rows="4"></textarea>
          <button class="mbtn primary" data-net="answer">Gerar meu código de resposta</button>`;
      }
      if (action === 'answer') this.join($('#mpin').value);
      if (action === 'accept') this.accept($('#mpin').value);
      if (action === 'copy') { const t = $('#mpout'); t.select(); navigator.clipboard && navigator.clipboard.writeText(t.value); KM.ui.toast('Código copiado!', 'ok'); }
      if (action === 'start') this.startHost();
    },
    status(html) { $('#mpbox').innerHTML = html; },
    showCode(code, next) {
      this.status(`<p class="muted">${next}</p><textarea id="mpout" rows="4" readonly>${code}</textarea>
        <button class="mbtn" data-net="copy">Copiar código</button>
        ${this.role === 'host' ? `<p class="muted">Depois cole o <b>código de resposta</b> do seu amigo:</p><textarea id="mpin" rows="3"></textarea><button class="mbtn primary" data-net="accept">Conectar</button>` : '<p class="muted">Aguardando o anfitrião conectar...</p>'}`);
    },

    // ---------- sala de espera do anfitrião ----------
    guests() { return Object.keys(this.peers).map(Number).filter((s) => s > 0 && this.isOpen(s)).sort((a, b) => a - b); },
    isOpen(slot) { const p = this.peers[slot]; return !!(p && p.dc && p.dc.readyState === 'open'); },
    renderLobby() {
      if (this.role !== 'host' || this.started || !$('#mpbox')) return;
      if (!$('#mpslots')) {
        const diffs = [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']];
        this.status(`${this.code ? `<p class="muted">Passe este código para até 3 amigos:</p><div class="roomcode">${this.code}</div>
          <button class="mbtn" data-net="copycode">Copiar código</button>` : ''}
          <div id="mpslots" class="mpslots"></div>
          <div class="form">
            <label>Modo<select id="mpteams">${Object.entries(MODES).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
            <label>Dificuldade da IA<select id="mpdiff">${diffs.map(([k, n]) => `<option value="${k}"${k === 'normal' ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
            <label>IAs nas vagas livres<select id="mpopp"></select></label>
            <label>Semente<input id="mpseed" placeholder="aleatória"></label>
          </div>
          <p id="mpnote" class="muted"></p>
          <button class="mbtn primary" id="mpstart" data-net="start">Começar partida</button>`);
        const t = $('#mpteams'); if (t) t.onchange = () => this.renderLobby();
      }
      const n = 1 + this.guests().length;
      const rows = [];
      for (let s = 0; s < MAXP; s++) {
        const p = this.peers[s];
        const st = s === 0 ? 'você (anfitrião)' : this.isOpen(s) ? 'conectado' : p ? 'conectando...' : 'vaga livre';
        rows.push(`<div class="mpslot${s === 0 || this.isOpen(s) ? ' on' : ''}"><span class="dot" style="background:${KM.COLORS ? KM.COLORS[s] : '#999'}"></span> Vaga ${s + 1}: ${st}</div>`);
      }
      $('#mpslots').innerHTML = rows.join('');
      const mode = $('#mpteams').value, sel = $('#mpopp'), free = MAXP - n;
      const lo = mode === 'coop' ? 1 : 0, prev = sel.value;
      if (mode === '2x2') sel.innerHTML = `<option value="${free}">${free} (completa os times)</option>`;
      else sel.innerHTML = Array.from({ length: Math.max(0, free - lo + 1) }, (_, k) => `<option value="${lo + k}">${lo + k}</option>`).join('');
      if (prev !== '' && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
      else if (sel.options.length) sel.value = sel.options[0].value;
      sel.disabled = mode === '2x2';
      const why = this.lobbyBlock(n, mode);
      $('#mpnote').textContent = why || `${n} jogadores na sala. ${mode === '2x2' ? 'Vagas 1 e 2 contra 3 e 4.' : ''}`;
      $('#mpstart').disabled = !!why;
      this.sendRaw({ t: 'lobby', n });
    },
    lobbyBlock(n, mode) {
      if (n < 2) return 'Aguardando pelo menos 1 jogador entrar na sala...';
      if (mode === 'coop' && n >= MAXP) return 'No cooperativo precisa sobrar uma vaga para a IA inimiga: use Todos contra todos ou 2 contra 2.';
      return '';
    },

    async gather(pc) {
      if (pc.iceGatheringState === 'complete') return;
      await new Promise((res) => {
        const to = setTimeout(res, 4000);
        pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(to); res(); } });
      });
    },
    newPeer(slot, id) {
      const pc = new RTCPeerConnection({ iceServers: ICE });
      this.peers[slot] = { id, pc, dc: null, o: slot, ping: 0 };
      pc.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) this.peerLost(slot, pc); };
      return pc;
    },
    async host() {
      try {
        this.close(true);
        this.role = 'host'; this.started = false; this.code = null;
        const pc = this.newPeer(1, 'manual');
        this.bind(1, pc.createDataChannel('km', { ordered: true }));
        await pc.setLocalDescription(await pc.createOffer());
        this.status('<p class="muted">Gerando código...</p>');
        await this.gather(pc);
        this.showCode(enc(pc.localDescription), 'Envie este <b>código de convite</b> para o seu amigo:');
      } catch (e) { this.status(`<div class="warn">Erro: ${KM.esc(e.message)}</div>`); }
    },
    async join(code) {
      try {
        this.close(true);
        this.role = 'guest';
        const pc = this.newPeer(0, 'manual');
        pc.ondatachannel = (e) => this.bind(0, e.channel);
        await pc.setRemoteDescription(dec(code));
        await pc.setLocalDescription(await pc.createAnswer());
        this.status('<p class="muted">Gerando código...</p>');
        await this.gather(pc);
        this.showCode(enc(pc.localDescription), 'Envie este <b>código de resposta</b> de volta ao anfitrião:');
      } catch (e) { this.status(`<div class="warn">Código inválido: ${KM.esc(e.message)}</div>`); }
    },
    async accept(code) {
      try { await this.peers[1].pc.setRemoteDescription(dec(code)); this.status('<p class="muted">Conectando...</p>'); }
      catch (e) { this.status(`<div class="warn">Código inválido: ${KM.esc(e.message)}</div>`); }
    },
    bind(slot, dc) {
      const peer = this.peers[slot];
      if (!peer) return;
      peer.dc = dc;
      dc.onopen = () => {
        if (this.peers[slot] !== peer) return;
        this.connected = true;
        if (!this.pingTimer) this.pingTimer = setInterval(() => this.sendRaw({ t: 'ping', ts: performance.now() }), 2000);
        if (this.role === 'host') this.renderLobby();
        else this.status('<div class="good">Conectado! Aguardando o anfitrião começar a partida...</div><p id="mpcount" class="muted"></p>');
      };
      dc.onmessage = (e) => { if (this.peers[slot] === peer) this.receive(e && e.data, slot); };
      dc.onclose = () => this.peerLost(slot, peer.pc);
    },
    startHost() {
      if (this.role !== 'host' || this.started) return;
      const teams = $('#mpteams').value;
      const slots = this.guests(), n = 1 + slots.length;
      const why = this.lobbyBlock(n, teams);
      if (why) { KM.ui.toast(why, 'warn'); return; }
      let opp = +$('#mpopp').value || 0;
      if (teams === 'coop') opp = Math.max(1, opp);
      opp = Math.min(opp, MAXP - n);
      const enteredSeed = parseInt($('#mpseed').value, 10);
      const seed = int(enteredSeed, -0x80000000, 0x7fffffff) && enteredSeed !== 0 ? enteredSeed : Math.floor(Math.random() * 1e9);
      const opts = { mp: true, humans: n, teams, diff: $('#mpdiff').value, opponents: opp, aiMode: 'economy', seed };
      // conexões ainda não abertas ficam de fora; as vagas são compactadas (jogadores 1..n-1)
      this.started = true;
      this.stopListen();
      for (const s of Object.keys(this.peers).map(Number)) {
        if (s > 0 && !slots.includes(s)) { const p = this.peers[s]; delete this.peers[s]; try { p.pc && p.pc.close(); } catch (e) { /* ok */ } }
      }
      slots.forEach((s, i) => { this.peers[s].o = i + 1; this.sendTo(s, { t: 'start', opts, me: i + 1 }); });
      this.begin(opts, 0);
    },
    begin(opts, me) {
      if (!this.validStart(opts, me)) return this.reject();
      this.active = true; this.started = true;
      this.inbox = {}; this.pending = []; this.pendingSize = 0; this.hashes = {}; this.drops = {}; this.last = {}; this.rejected = 0;
      this.turn = -1; this.waitT = 0; this.lag = 0; this.warned = false; this.desync = false;
      this.humans = opts.humans || 2;
      this.DELAY = this.humans > 2 ? 4 : 3;
      KM.startGame(Object.assign({}, opts, { me }));
      return true;
    },

    // ---------- lockstep ----------
    // jogador o ainda manda comandos no turno? (quem saiu deixa de ser esperado a partir do turno combinado)
    playing(o, turn) { return this.drops[o] == null || turn < this.drops[o]; },
    reject() { this.rejected++; return false; },
    validStart(opts, me) {
      return isRecord(opts) && only(opts, ['mp', 'humans', 'teams', 'diff', 'opponents', 'aiMode', 'seed']) &&
        opts.mp === true && int(opts.humans, 2, MAXP) && Object.prototype.hasOwnProperty.call(MODES, opts.teams) &&
        !!(KM.DIFF && own(KM.DIFF, opts.diff)) && int(opts.opponents, 0, MAXP - opts.humans) && opts.aiMode === 'economy' &&
        int(opts.seed, -0x80000000, 0x7fffffff) && int(me, 0, opts.humans - 1);
    },
    turnInWindow(n) { return int(n, this.DELAY, Number.MAX_SAFE_INTEGER) && n > this.turn && n <= Math.max(this.DELAY, this.turn + 2 * this.DELAY); },
    hashInWindow(n) { return int(n, 0, Number.MAX_SAFE_INTEGER) && n % 50 === 0 && n >= Math.max(0, this.turn - MAX_HASH_AGE) && n <= Math.max(this.DELAY, this.turn + 2 * this.DELAY); },
    validPacket(m) {
      if (!isRecord(m) || typeof m.t !== 'string') return false;
      switch (m.t) {
        case 'turn':
          return only(m, ['t', 'n', 'o', 'c']) && this.turnInWindow(m.n) &&
            (!own(m, 'o') || int(m.o, 0, MAXP - 1)) && Array.isArray(m.c) && m.c.length <= MAX_COMMANDS &&
            m.c.every((c) => KM.validCommand && KM.validCommand(c, false, KM.S));
        case 'start':
          return only(m, ['t', 'opts', 'me']) && this.validStart(m.opts, m.me);
        case 'drop':
          return only(m, ['t', 'o', 'n']) && int(m.o, 0, this.humans - 1) && m.o !== KM.me && this.turnInWindow(m.n);
        case 'lobby':
          return only(m, ['t', 'n']) && int(m.n, 1, MAXP);
        case 'ping': case 'pong':
          return only(m, ['t', 'ts']) && typeof m.ts === 'number' && Number.isFinite(m.ts) && m.ts >= 0 && m.ts <= 1e12;
        case 'hash':
          return only(m, ['t', 'n', 'h', 'o']) && this.hashInWindow(m.n) && int(m.h, -0x80000000, 0x7fffffff) &&
            (!own(m, 'o') || int(m.o, 0, this.humans - 1));
        case 'chat':
          return only(m, ['t', 'm', 'name']) && typeof m.m === 'string' && m.m.length <= 200 && typeof m.name === 'string' && m.name.length <= 64;
        case 'bye': return only(m, ['t']);
        default: return false;
      }
    },
    receive(data, slot) {
      if (typeof data !== 'string' || data.length > MAX_PACKET) return this.reject();
      let m;
      try { m = JSON.parse(data); } catch (e) { return this.reject(); }
      try { return this.onMsg(m, slot); } catch (e) { return this.reject(); }
    },
    queue(c) {
      if (!KM.validCommand || !KM.validCommand(c, true, KM.S) || this.pending.length >= MAX_COMMANDS) return this.reject();
      let size;
      try { size = JSON.stringify(c).length; } catch (e) { return this.reject(); }
      if (this.pendingSize + size > MAX_PACKET - 256) return this.reject();
      this.pending.push(c); this.pendingSize += size;
      return true;
    },
    ready(turn) {
      if (!int(turn, 0, Number.MAX_SAFE_INTEGER)) return false;
      if (turn < this.DELAY) return true;
      const box = this.inbox[turn] || {};
      for (let o = 0; o < this.humans; o++) if (this.playing(o, turn) && !Array.isArray(box[o])) return false;
      return true;
    },
    take(turn) {
      if (!int(turn, 0, Number.MAX_SAFE_INTEGER)) return [];
      const box = this.inbox[turn] || {};
      delete this.inbox[turn];
      this.waitT = 0; this.lag = 0;
      const out = [];
      for (let o = 0; o < this.humans; o++) if (this.drops[o] === turn) out.push({ c: 'leave', o });
      for (let o = 0; o < this.humans; o++) if (this.playing(o, turn) && Array.isArray(box[o])) {
        for (const c of box[o]) if (KM.validCommand && KM.validCommand(c, false, KM.S)) out.push(Object.assign({}, c, { o }));
      }
      return out;
    },
    send(turn) {
      if (!int(turn, 0, Number.MAX_SAFE_INTEGER)) return this.reject();
      this.turn = turn;
      const target = turn + this.DELAY;
      const cmds = this.pending; this.pending = [];
      this.pendingSize = 0;
      if (!this.store(target, KM.me, cmds)) return this.reject();
      this.sendRaw({ t: 'turn', n: target, o: KM.me, c: cmds });
      return true;
    },
    store(n, o, c) {
      if (!this.turnInWindow(n) || !int(o, 0, this.humans - 1) || !Array.isArray(c) || c.length > MAX_COMMANDS ||
        !c.every((cmd) => KM.validCommand && KM.validCommand(cmd, false, KM.S))) return false;
      const box = this.inbox[n] || {};
      if (own(box, o)) return false;
      (this.inbox[n] = box)[o] = c.map((cmd) => Object.assign({}, cmd, { o }));
      if (!(this.last[o] >= n)) this.last[o] = n;
      return true;
    },
    stalled(el) {
      this.waitT += el; this.lag = this.waitT;
      if (this.waitT > 3 && !this.warned) { this.warned = true; KM.ui.toast(this.humans > 2 ? 'Aguardando os outros jogadores...' : 'Aguardando o outro jogador...', 'warn'); }
    },
    saveHash(turn, o, h) {
      const row = this.hashes[turn] || (this.hashes[turn] = {});
      if (own(row, o)) return row[o] === h;
      row[o] = h;
      const mine = row[KM.me];
      if (mine != null && Object.keys(row).some((id) => +id !== KM.me && row[id] !== mine) && !this.desync) {
        this.desync = true;
        KM.ui.toast('Dessincronização detectada entre os jogadores.', 'danger');
      }
      for (const key of Object.keys(this.hashes)) if (+key < this.turn - MAX_HASH_AGE) delete this.hashes[key];
      return true;
    },
    sendHash(turn, h) {
      if (!this.hashInWindow(turn) || !int(h, -0x80000000, 0x7fffffff)) return this.reject();
      if (!this.saveHash(turn, KM.me, h)) return this.reject();
      this.sendRaw({ t: 'hash', n: turn, h, o: KM.me });
      return true;
    },
    sendTo(slot, o) { const p = this.peers[slot]; try { if (p && p.dc && p.dc.readyState === 'open') p.dc.send(JSON.stringify(o)); } catch (e) { /* ok */ } },
    // anfitrião: envia a todos os convidados (menos a vaga "except"); convidado: envia ao anfitrião
    sendRaw(o, except) { for (const s of Object.keys(this.peers).map(Number)) if (s !== except) this.sendTo(s, o); },
    onMsg(m, slot) {
      try { if (!isRecord(m) || JSON.stringify(m).length > MAX_PACKET || !this.validPacket(m)) return this.reject(); }
      catch (e) { return this.reject(); }
      const host = this.role === 'host', peer = this.peers[slot];
      if (!peer) return this.reject();
      if (m.t === 'turn') {
        if (!this.active) return this.reject();
        if (host) {
          // A vaga da conexao define o dono; o campo enviado pelo convidado nao tem autoridade.
          if (slot === 0 || !int(peer.o, 1, this.humans - 1)) return this.reject();
          const o = peer.o;
          if (this.drops[o] != null || !this.store(m.n, o, m.c)) return this.reject();
          this.sendRaw({ t: 'turn', n: m.n, o, c: this.inbox[m.n][o] }, slot);
        } else {
          if (slot !== 0 || !own(m, 'o') || !int(m.o, 0, this.humans - 1) || m.o === KM.me ||
            (this.drops[m.o] != null && m.n >= this.drops[m.o]) || !this.store(m.n, m.o, m.c)) return this.reject();
        }
        this.warned = false;
      }
      else if (m.t === 'start') {
        if (host || slot !== 0 || this.active || this.started || !this.begin(m.opts, m.me)) return this.reject();
      }
      else if (m.t === 'drop') {
        if (host || slot !== 0 || !this.active || this.drops[m.o] != null) return this.reject();
        this.drops[m.o] = m.n;
      }
      else if (m.t === 'lobby') {
        if (host || slot !== 0 || this.active) return this.reject();
        const el = $('#mpcount'); if (el) el.textContent = m.n + ' jogadores na sala.';
      }
      else if (m.t === 'ping') this.sendTo(slot, { t: 'pong', ts: m.ts });
      else if (m.t === 'pong') { peer.ping = Math.round(performance.now() - m.ts); this.ping = Math.max(0, ...Object.values(this.peers).map((p) => p.ping || 0)); }
      else if (m.t === 'hash') {
        if (!this.active || (host ? slot === 0 : slot !== 0 || !own(m, 'o') || m.o === KM.me)) return this.reject();
        const o = host ? peer.o : m.o;
        if (!int(o, 0, this.humans - 1) || !this.saveHash(m.n, o, m.h)) return this.reject();
        if (host) this.sendRaw({ t: 'hash', n: m.n, h: m.h, o }, slot);
      }
      else if (m.t === 'chat') {
        if (!this.active || (host ? slot === 0 : slot !== 0)) return this.reject();
        if (host) this.sendRaw(m, slot);
        KM.ui.toast(`${KM.esc(m.name)}: ${KM.esc(m.m)}`, 'info');
      }
      else if (m.t === 'bye') this.peerLost(slot);
      return true;
    },
    chatPrompt() {
      const msg = prompt(this.humans > 2 ? 'Mensagem para os outros jogadores:' : 'Mensagem para o outro jogador:');
      if (!msg) return;
      const name = KM.S.players[KM.me].name;
      this.sendRaw({ t: 'chat', m: msg.slice(0, 200), name });
      KM.ui.toast(`Você: ${KM.esc(msg.slice(0, 200))}`, 'ok');
    },

    // ---------- quedas ----------
    peerLost(slot, pc) {
      const p = this.peers[slot];
      if (!p || (pc && p.pc !== pc)) return;
      delete this.peers[slot];
      try { p.dc && p.dc.close(); } catch (e) { /* ok */ }
      try { p.pc && p.pc.close(); } catch (e) { /* ok */ }
      this.connected = Object.keys(this.peers).some((s) => this.isOpen(+s));
      if (this.role === 'host') {
        if (this.active) this.dropPlayer(p.o);
        else this.renderLobby();
      } else this.lost();
    },
    // anfitrião: o jogador o saiu. Todos o trocam pela IA no mesmo turno n, que ninguém executou ainda:
    // o anfitrião já enviou seus comandos até turn+DELAY, então ninguém passa de lá sem ouvir este aviso.
    dropPlayer(o) {
      if (this.drops[o] != null || o === KM.me) return;
      const n = this.turn + this.DELAY + 1;
      // turnos que o jogador não chegou a enviar contam como vazios (o anfitrião não executou nenhum deles)
      for (let t = Math.max(this.DELAY, (this.last[o] != null ? this.last[o] : -1) + 1); t < n; t++) {
        if (this.inbox[t] && this.inbox[t][o]) continue;
        this.store(t, o, []);
        this.sendRaw({ t: 'turn', n: t, o, c: [] });
      }
      this.drops[o] = n;
      this.sendRaw({ t: 'drop', o, n });
      KM.ui.toast(`${KM.S && KM.S.players[o] ? KM.S.players[o].name : 'Um jogador'} desconectou. A IA vai assumir o reino.`, 'warn');
    },
    // convidado: perdeu o anfitrião. Sem rede, a partida continua só neste navegador.
    lost() {
      if (this.role === 'host') return;
      const wasActive = this.active;
      this.active = false; this.connected = false;
      clearInterval(this.pingTimer); this.pingTimer = null;
      if (wasActive && KM.S) {
        KM.ui.toast(this.humans > 2 ? 'O anfitrião desconectou. A partida continua localmente e a IA assume os outros reinos.' : 'O outro jogador desconectou. A partida continua localmente.', 'danger');
        KM.S.players.forEach((p, o) => { if (o !== KM.me && p.human) KM.exec(KM.S, { o, c: 'leave' }); });
      } else if (!wasActive && this.started === false && $('#mpbox')) {
        this.status('<div class="warn">A conexão com o anfitrião caiu.</div><button class="mbtn" data-net="enter">Tentar de novo</button>');
      }
    },
    close(silent) {
      this.sendRaw({ t: 'bye' });
      for (const s of Object.keys(this.peers)) {
        const p = this.peers[s];
        try { p.dc && p.dc.close(); } catch (e) { /* ok */ }
        try { p.pc && p.pc.close(); } catch (e) { /* ok */ }
      }
      this.peers = {};
      clearInterval(this.pingTimer); this.pingTimer = null;
      if (!silent) this.stopListen();
      this.active = false; this.connected = false; this.started = false; this.role = null;
    },
  };
})(window.KM);
