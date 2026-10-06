'use strict';
/* Interface: barra lateral, painéis, notificações, minimapa, menus */
(function (KM) {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  KM.esc = esc;
  const ri = (r) => KM.icon(KM.RES[r].i);
  const costStr = (c) => Object.keys(c).map((r) => `${ri(r)}${c[r]}`).join(' ');
  const ME = () => KM.me;
  // ícone da construção: miniatura 3D renderizada (usa emblema vetorial enquanto carrega)
  const hic = (t) => (KM.R && KM.R.icons && KM.R.icons[t] ? `<i class="hic hic-${t}"></i>` : KM.icon(KM.HOUSES[t].i));
  // ícone de unidade (soldado ou profissão): miniatura do personagem
  const uic = (t) => (KM.R && KM.R.icons && KM.R.icons['u_' + t] ? `<i class="hic uic hic-u_${t}"></i>` : KM.icon((KM.SOLDIERS[t] || KM.PROF[t]).i));
  const portrait = (t) => (KM.R && KM.R.icons && KM.R.icons['p_' + t] ? `<i class="hic portrait hic-p_${t}" aria-hidden="true"></i>` : uic(t));

  const ui = KM.ui = {
    tool: null, hover: null, drag: null, box: null, selHouse: 0, selUnits: [], selGroups: [], selSet: new Set(),
    tab: 'build', miniDirty: true, lastPanel: '', lastTab: '', t: 0,

    init() {
      KM.initIcons();
      this.buildTabs();
      $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) this.setTab(b.dataset.tab); });
      $('#tabcontent').addEventListener('click', (e) => this.onTabClick(e));
      $('#sbtoggle').addEventListener('click', () => document.body.classList.toggle('sb-open'));
      // sliders de volume: aplica ao arrastar e não redesenha a aba no meio do gesto
      $('#tabcontent').addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.vol; if (k) { this.sliding = true; KM.setAudio(k, e.target.value / 100); } });
      $('#tabcontent').addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.vol) { this.sliding = false; if (e.target.dataset.vol !== 'music') KM.sfx('click'); } });
      try { KM.edgeScroll = localStorage.getItem('rm_edge') !== '0'; } catch (e) { /* ok */ }
      $('#selpanel').addEventListener('click', (e) => this.onPanelClick(e));
      $('#topbar').addEventListener('click', (e) => {
        const b = e.target.closest('[data-speed]'); if (b) this.setSpeed(+b.dataset.speed);
        if (e.target.closest('[data-goals]')) this.setTab('goals');
        if (e.target.closest('[data-economy]')) this.openEconomy();
      });
      for (const el of ['#tabcontent', '#selpanel', '#topbar']) {
        $(el).addEventListener('mousemove', (e) => this.onTip(e));
        $(el).addEventListener('mouseleave', () => this.hideTip());
      }
      const mm = $('#minimap');
      const mmNav = (e) => {
        if (!KM.S) return;
        const r = mm.getBoundingClientRect();
        KM.R.centerOn(((e.clientX - r.left) / r.width) * KM.MAP_W, ((e.clientY - r.top) / r.height) * KM.MAP_H);
      };
      mm.addEventListener('mousedown', (e) => { if (e.button !== 0) return; mmNav(e); this.mmDrag = true; });
      // botão direito no minimapa: manda as tropas selecionadas para lá
      mm.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const gs = this.myGroups();
        if (!KM.S || !gs.length) return;
        const r = mm.getBoundingClientRect();
        const x = Math.floor(((e.clientX - r.left) / r.width) * KM.MAP_W), y = Math.floor(((e.clientY - r.top) / r.height) * KM.MAP_H);
        KM.issue({ c: 'move', g: gs.map((g) => g.id), x, y, am: !!e.shiftKey });
        this.pings = (this.pings || []).concat([{ x, y, t: performance.now() / 1000, c: '#7cff6a' }]);
        KM.sfx && KM.sfx('order'); KM.voice && KM.voice('order');
      });
      window.addEventListener('mousemove', (e) => { if (this.mmDrag) mmNav(e); });
      window.addEventListener('mouseup', () => { this.mmDrag = false; });
      this.initMenu();
    },

    // ---------- abas ----------
    buildTabs() {
      const tabs = [['build', '<i class=ui-icon data-icon=build aria-hidden=true></i>', 'Construir'], ['stock', '<i class=ui-icon data-icon=crate aria-hidden=true></i>', 'Estoque'], ['people', '<i class=ui-icon data-icon=people aria-hidden=true></i>', 'Povo'], ['goals', '<i class=ui-icon data-icon=target aria-hidden=true></i>', 'Objetivos'], ['menu', '<i class=ui-icon data-icon=settings aria-hidden=true></i>', 'Menu']];
      $('#tabs').innerHTML = tabs.map(([k, i, n]) => `<button data-tab="${k}" class="${k === this.tab ? 'active' : ''}" title="${n}"><span>${i}</span><small>${n}</small></button>`).join('');
    },
    setTab(t) {
      this.tab = t; this.lastTab = '';
      document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === (t === 'economy' ? 'stock' : t)));
      this.renderTab(true);
    },
    openEconomy() {
      this.setTab('economy');
      if (KM.touchUI) document.body.classList.add('sb-open');
    },
    houseCounts() {
      const counts = {};
      for (const h of Object.values(KM.S.houses)) {
        if (h.owner !== ME()) continue;
        const c = counts[h.type] || (counts[h.type] = { built: 0, site: 0, plan: 0 });
        c[h.state]++;
      }
      return counts;
    },
    houseCountText(c = { built: 0, site: 0, plan: 0 }) {
      return `${c.built} pronta${c.built === 1 ? '' : 's'} · ${c.site} em construção · ${c.plan} planejada${c.plan === 1 ? '' : 's'}`;
    },
    buildFocusType() {
      const S = KM.S;
      if (!S || S.editor) return null;
      if (this.tool) return this.tool.build || null;
      const h = S.houses[this.selHouse];
      return h && h.owner === ME() ? h.type : null;
    },
    locateHouse(type) {
      if (!Object.hasOwn(KM.HOUSES, type) || !KM.S || KM.S.editor) return;
      const houses = Object.values(KM.S.houses).filter(h => h.owner === ME() && h.type === type)
        .sort((a, b) => (a.state !== 'built') - (b.state !== 'built') || a.id - b.id);
      if (!houses.length) return;
      const h = houses[(houses.findIndex(h => h.id === this.selHouse) + 1) % houses.length];
      this.setTool(null); this.selectHouse(h.id);
      KM.R.centerOn(KM.hcx(h), KM.hcy(h));
      this.renderPanel(); this.renderMini();
      if (KM.touchUI) document.body.classList.remove('sb-open');
    },
    renderTab(force) {
      const S = KM.S;
      if (!S) return;
      if (S.editor) { KM.editor.renderPanel(force); return; }
      const P = S.players[ME()];
      let html = '';
      if (this.tab === 'build') {
        const counts = this.houseCounts();
        const sig = JSON.stringify(P.built || {}) + (P.all ? 'A' : '') + JSON.stringify(counts);
        if (!force && this.lastTab === 'build' && sig === this.buildSig) { this.markTool(); return; }
        this.buildSig = sig;
        // próximo passo da progressão
        const next = KM.nextUnlocks(S, ME());
        if (!P.all) {
          const shown = next.slice(0, 3);
          if (shown.length) {
            html += `<div class="progress-card"><div class="pc-title">Próximos passos</div>${shown.map((n) => `<div class="pc-row"><span>${hic(n.t)}</span><div>Construa <b>${KM.HOUSES[n.t].n}</b><small>libera ${n.gives.map((g) => KM.HOUSES[g].n).join(', ')}</small></div></div>`).join('')}<button class="pc-more" data-act="tree">Ver árvore completa ›</button></div>`;
          } else {
            const locked = Object.keys(KM.HOUSES).filter((t) => !KM.houseUnlocked(S, ME(), t)).length;
            if (!locked) html += `<div class="progress-card done"><div class="pc-title">Reino completo</div><small>Todas as construções estão liberadas.</small></div>`;
          }
        }
        const tools = [['road', '<i class=ui-icon data-icon=road aria-hidden=true></i>', 'Estrada', 'R', 'Clique e arraste. Carregadores só entregam por estradas! Cada trecho custa 1 <i class=ui-icon data-icon=stone aria-hidden=true></i>.'], ['field', '<i class=ui-icon data-icon=wheat aria-hidden=true></i>', 'Campo de trigo', 'F', 'Arraste para desenhar vários. Perto de uma Fazenda.'], ['vine', '<i class=ui-icon data-icon=grapes aria-hidden=true></i>', 'Vinhedo', 'V', 'Arraste para desenhar vários. Perto de uma Vinícola.'], ['demolish', '<i class=ui-icon data-icon=cross aria-hidden=true></i>', 'Demolir', 'X', 'Remove casas, estradas ou campos.']];
        html += `<div class="tools">${tools.map(([k, i, n, key, tip]) => `<button class="tool" data-tool="${k}" data-tip="${n} <kbd>${key}</kbd><br><small>${tip}</small>"><span>${i}</span><small>${n}</small></button>`).join('')}</div>`;
        for (const grp of KM.HOUSE_GROUPS) {
          html += `<h4>${grp}</h4><div class="grid">`;
          for (const k in KM.HOUSES) {
            const d = KM.HOUSES[k];
            if (d.g !== grp) continue;
            const open = KM.houseUnlocked(S, ME(), k);
            const isNew = open && KM.TECH[k] && !(P.built || {})[k] && !P.all;
            if (open) {
              const c = counts[k] || { built: 0, site: 0, plan: 0 }, works = c.site + c.plan;
              html += `<button class="bbtn ${isNew ? 'new' : ''}" data-build="${k}" aria-label="${esc(`Construir ${d.n}. ${this.houseCountText(c)}`)}" data-tip="${esc(this.houseTip(k, c))}"><span class="ic">${hic(k)}</span><span class="bcount ${c.built ? '' : 'zero'}" aria-hidden="true">${c.built}</span><span class="nm">${d.n}</span>${works ? `<span class="bworks" aria-hidden="true">+${works} ${works === 1 ? 'obra' : 'obras'}</span>` : ''}<span class="cost">${costStr(d.cost)}</span>${isNew ? '<i class="badge-new">novo</i>' : ''}</button>`;
            }
            else html += `<button class="bbtn locked" data-locked="${k}" data-tip="${esc(`<b><i class=ui-icon data-icon=lock aria-hidden=true></i> ${d.n}</b><br>Para liberar, construa: ${KM.reqNames(KM.TECH[k])}<br><small>${d.desc || ''}</small>`)}"><span class="ic">${hic(k)}</span><span class="nm">${d.n}</span><span class="cost"><i class=ui-icon data-icon=lock aria-hidden=true></i> bloqueado</span></button>`;
          }
          html += '</div>';
        }
        const focusedBuild = document.activeElement && document.activeElement.dataset.build;
        $('#tabcontent').innerHTML = html;
        if (focusedBuild && Object.hasOwn(KM.HOUSES, focusedBuild)) document.querySelector(`#tabcontent [data-build="${focusedBuild}"]`)?.focus({ preventScroll: true });
        this.lastTab = 'build';
        this.markTool();
        return;
      }
      if (this.tab === 'stock') {
        const tot = {};
        for (const id in S.houses) { const h = S.houses[id]; if (h.owner === ME() && h.type === 'storehouse' && h.state === 'built') for (const r in h.inv) KM.add(tot, r, h.inv[r]); }
        html = `<h4>Estoque dos armazéns</h4><div class="stock">${KM.RES_ORDER.map((r) => `<div class="srow ${tot[r] ? '' : 'zero'}" data-tip="${KM.RES[r].n}"><span>${ri(r)}</span><span class="sn">${KM.RES[r].n}</span><b>${tot[r] || 0}</b></div>`).join('')}</div>`;
        html = `<button class="mbtn wide" data-act="economy"><i class=ui-icon data-icon=chart aria-hidden=true></i> Produção e consumo</button>` + html;
        const dist = P.dist;
        html += `<h4 data-tip="Quanto de cada recurso cada tipo de casa pode pedir (0 a 5). Use para decidir, por exemplo, se o carvão vai para armas ou para ouro.">Distribuição ⓘ</h4>`;
        for (const r in dist) {
          html += `<div class="dist"><div class="dh">${ri(r)} ${KM.RES[r].n}</div>`;
          for (const t in dist[r]) html += `<div class="ratio"><span>${KM.icon(KM.HOUSES[t].i)} ${KM.HOUSES[t].n}</span><button data-act="dist:${r}:${t}:-1">−</button><b>${dist[r][t]}</b><button data-act="dist:${r}:${t}:1">+</button></div>`;
          html += '</div>';
        }
      } else if (this.tab === 'economy') {
        const flow = KM.resourceRates(S, ME());
        html = `<div class="economy-heading"><h4>Produção e consumo</h4><span class="economy-live ${S.paused ? 'paused' : ''}">${S.paused ? 'Pausado' : 'Ao vivo'}</span></div>
          <p class="muted">Últimos 60 s de jogo · ${flow.seconds >= 60 ? 'unidades por minuto' : `janela inicial: ${Math.floor(flow.seconds)}/60 s, sem projeção`}.</p>
          <table class="economy-table"><caption class="sr-only">Produção, gasto e saldo por recurso do seu reino nos últimos 60 segundos de jogo</caption>
          <thead><tr><th scope="col">Recurso</th><th scope="col">Produzido</th><th scope="col">Gasto</th><th scope="col">Saldo</th></tr></thead><tbody>${KM.RES_ORDER.map(r => {
            const p = flow.produced[r] || 0, c = flow.spent[r] || 0, net = p - c;
            return `<tr class="${p || c ? '' : 'economy-idle'}"><th scope="row">${ri(r)} ${KM.RES[r].n}</th><td class="good">${p}</td><td class="bad">${c}</td><td class="${net > 0 ? 'good' : net < 0 ? 'bad' : ''}">${net > 0 ? '+' : ''}${net}</td></tr>`;
          }).join('')}</tbody></table>
          <p class="muted">Produzido: coleta, fabricação e compras no Mercado. Gasto: receitas, alimentação, obras, estradas, treino, equipamentos, torres e vendas no Mercado. Transportar entre casas não conta.</p>
          <button class="mbtn wide" data-act="stock"><i class=ui-icon data-icon=crate aria-hidden=true></i> Ver estoque e distribuição</button>`;
      } else if (this.tab === 'people') {
        const c = {}, idle = {}, sold = {};
        let hunger = 0, nc = 0, starving = 0, sh = 0, ns = 0;
        for (const id in S.units) {
          const u = S.units[id];
          if (u.owner !== ME()) continue;
          if (KM.isSoldier(u.type)) { KM.add(sold, u.type, 1); sh += u.hunger; ns++; continue; }
          KM.add(c, u.type, 1); nc++; hunger += u.hunger; if (u.hunger <= 0) starving++;
          const free = u.type === 'serf' || u.type === 'laborer' ? !u.task : !u.home;
          if (free) KM.add(idle, u.type, 1);
        }
        let rec = 0; for (const id in S.houses) { const h = S.houses[id]; if (h.owner === ME() && h.type === 'barracks') rec += h.recruits; }
        const st = S.stats[ME()];
        html = `<h4>Cidadãos (${nc})</h4>
          <div class="meter" data-tip="Fome média. Construa uma Taverna e mantenha comida nela."><span>Alimentação</span><div class="mbar"><i style="width:${nc ? hunger / nc : 0}%"></i></div></div>
          ${starving ? `<div class="warn"><i class=ui-icon data-icon=warning aria-hidden=true></i> ${starving} cidadão(s) passando fome: trabalham na metade da velocidade!</div>` : ''}
          <div class="plist">${KM.PROF_ORDER.filter((p) => c[p]).map((p) => `<div class="prow"><span>${uic(p)}</span><span class="sn">${KM.PROF[p].n}</span><b>${c[p]}</b><em>${idle[p] ? idle[p] + ' livre' + (idle[p] > 1 ? 's' : '') : ''}</em></div>`).join('')}</div>
          <label class="chk" data-tip="A Escola treina automaticamente os trabalhadores que suas casas precisam e mantém carregadores suficientes."><input type="checkbox" data-act="auto" ${P.autoTrain ? 'checked' : ''}> Treino automático na Escola</label>
          <h4>Exército (${ns})</h4>
          ${ns ? `<div class="meter" data-tip="Soldados com fome recebem comida dos carregadores. Com fome zero, eles perdem vida."><span>Tropas</span><div class="mbar"><i style="width:${sh / ns}%"></i></div></div>` : ''}
          <div class="plist">${KM.SOLDIER_ORDER.filter((t) => sold[t]).map((t) => `<div class="prow"><span>${uic(t)}</span><span class="sn">${KM.SOLDIERS[t].n}</span><b>${sold[t]}</b></div>`).join('') || '<div class="muted">Nenhum soldado.</div>'}</div>
          ${rec ? `<div class="muted"><i class=ui-icon data-icon=helmet aria-hidden=true></i> ${rec} recruta(s) aguardando no quartel</div>` : ''}
          <h4>Estatísticas</h4>
          <div class="muted">Casas construídas: ${st.built} · Treinados: ${st.trained}<br>Inimigos abatidos: ${st.killed} · Perdas: ${st.lost}</div>`;
      } else if (this.tab === 'goals') {
        const mis = S.mission && KM.findMission(S.mission, S.diff);
        html = `<h4>${mis ? esc(mis.n) : S.mp ? 'Multijogador' : 'Escaramuça'}</h4>${this.goalsHtml(S, false)}`;
        html += `<div class="muted"><i class=ui-icon data-icon=leaf aria-hidden=true></i> ${KM.biome(S.map).n}: ${KM.biome(S.map).desc}</div>`;
        if (S.sites && S.sites.length) html += `<h4>Pontos estratégicos</h4>${S.sites.map((s) => `<button class="mbtn wide" data-act="goto:${s.x}:${s.y}"><i class=ui-icon data-icon=flag aria-hidden=true></i> ${esc(s.n)} · ${s.contested ? 'contestado' : s.owner >= 0 ? esc(S.players[s.owner].name) : 'sem controle'}</button>`).join('')}<div class="muted">Mantenha 3 soldados sem rivais no raio de 6 casas. ${S.sites.some((s) => s.outpost) ? 'Os postos exigem também um Armazém conectado à base por estrada pronta.' : ''}</div>`;
        if (mis) html += `<button class="mbtn wide" data-act="brief"><i class=ui-icon data-icon=scroll aria-hidden=true></i> Rever briefing</button>`;
        if (!P.all) {
          const total = Object.keys(KM.HOUSES).length, open = Object.keys(KM.HOUSES).filter((t) => KM.houseUnlocked(S, ME(), t)).length;
          html += `<h4>Progresso do reino</h4><div class="meter"><span><i class=ui-icon data-icon=build aria-hidden=true></i> ${open}/${total} construções</span><div class="mbar"><i style="width:${(open / total) * 100}%"></i></div></div><button class="mbtn wide" data-act="tree"><i class=ui-icon data-icon=tree aria-hidden=true></i> Árvore de progresso</button>`;
        }
        html += `<button class="mbtn wide" data-act="stats"><i class=ui-icon data-icon=chart aria-hidden=true></i> Estatísticas da partida</button>`;
        const log = (this.msgLog || []).slice(0, 8);
        if (log.length) html += `<h4>Mensagens recentes</h4><div class="msglog">${log.map((l) => `<button class="msg ${l.kind}" ${l.pos ? `data-act="goto:${l.pos.x}:${l.pos.y}"` : ''}><small>${KM.fmtTime(l.t)}</small> ${esc(l.msg)}${l.pos ? ' <i class=ui-icon data-icon=pin aria-hidden=true></i>' : ''}</button>`).join('')}</div><div class="muted"><kbd>Z</kbd> vai até o último aviso.</div>`;
        html += `<h4>Jogadores</h4><div class="plist">${S.players.map((p, i) => `<div class="prow"><span class="dot" style="background:${p.color}"></span><span class="sn">${esc(p.name)}${i === ME() ? ' (você)' : ''}</span><em class="${p.out ? 'bad' : KM.hostile(S, ME(), i) ? 'bad' : 'good'}">${p.out ? 'derrotado' : i === ME() ? '' : KM.hostile(S, ME(), i) ? 'inimigo' : 'aliado'}</em></div>`).join('')}</div>`;
        const ais = S.players.filter((p, i) => p.ai && p.ai.mode !== 'none' && KM.hostile(S, ME(), i) && !p.out);
        const peace = Math.min(...ais.map((p) => p.ai.next - S.time).filter((x) => x > 0), Infinity);
        if (isFinite(peace)) html += `<div class="muted">Próxima ameaça conhecida em <b>${KM.fmtTime(peace)}</b></div>`;
      } else if (this.tab === 'menu') {
        html = `<h4>Jogo</h4>
          <div class="mgrid">
            <button class="mbtn" data-act="pause">${S.paused ? '<i class=ui-icon data-icon=play aria-hidden=true></i> Continuar' : '<i class=ui-icon data-icon=pause aria-hidden=true></i> Pausar'} <kbd>P</kbd></button>
            <button class="mbtn" data-act="grid">${KM.R.showGrid ? '▦ Ocultar grade' : '▦ Mostrar grade'} <kbd>G</kbd></button>
            <button class="mbtn" data-act="help"><i class=ui-icon data-icon=help aria-hidden=true></i> Como jogar <kbd>F1</kbd></button>
            ${S.mission === 't1' ? '<button class="mbtn" data-act="tutorial"><i class=ui-icon data-icon=book aria-hidden=true></i> Reabrir tutorial completo</button>' : ''}
          </div>
          <h4>Opções</h4>
          <div class="opts">
            <label><span>Volume geral</span><input type="range" min="0" max="100" data-vol="master" value="${Math.round(KM.audioCfg.master * 100)}"></label>
            <label><span>Música</span><input type="range" min="0" max="100" data-vol="music" value="${Math.round(KM.audioCfg.music * 100)}"></label>
            <label><span>Efeitos</span><input type="range" min="0" max="100" data-vol="sfx" value="${Math.round(KM.audioCfg.sfx * 100)}"></label>
          </div>
          <div class="mgrid">
            <button class="mbtn" data-act="sound">${KM.audioOn ? '<i class=ui-icon data-icon=sound aria-hidden=true></i> Efeitos ligados' : '<i class=ui-icon data-icon=sound aria-hidden=true></i> Efeitos desligados'}</button>
            <button class="mbtn" data-act="music">${KM.musicOn ? '<i class=ui-icon data-icon=music aria-hidden=true></i> Música ligada' : '<i class=ui-icon data-icon=music aria-hidden=true></i> Música desligada'} <kbd>M</kbd></button>
            <button class="mbtn" data-act="musicmode" data-tip="Gravada: trilhas medievais de RandomMind (CC0). Gerada: música composta pelo jogo na hora"><i class=ui-icon data-icon=music aria-hidden=true></i> Música: ${KM.audioCfg.musicMode === 'gerada' ? 'gerada' : 'gravada'}</button>
            <button class="mbtn" data-act="voices" data-tip="Os soldados respondem às ordens com voz sintetizada do navegador">${KM.audioCfg.voices ? '<i class=ui-icon data-icon=voice aria-hidden=true></i> Vozes ligadas' : '<i class=ui-icon data-icon=voice aria-hidden=true></i> Vozes desligadas'}</button>
            <button class="mbtn" data-act="gfx" data-tip="Alta: sombras nítidas e grama · Média: sombras simples · Baixa: sem sombras nem grama (PCs fracos)"><i class=ui-icon data-icon=screen aria-hidden=true></i> Gráficos: ${{ high: 'alta', medium: 'média', low: 'baixa' }[KM.R.gfx]}</button>
            <button class="mbtn" data-act="edge">${KM.edgeScroll !== false ? '<i class=ui-icon data-icon=mouse aria-hidden=true></i> Rolar pela borda: sim' : '<i class=ui-icon data-icon=mouse aria-hidden=true></i> Rolar pela borda: não'}</button>
          </div>
          ${S.mp ? '<div class="muted">Salvar não está disponível no multijogador.</div>' : `<h4>Salvar / Carregar</h4>
          ${[1, 2, 3].map((s) => { const meta = KM.saveMeta(s); return `<div class="slot"><div><b>Espaço ${s}</b><br><small>${meta ? `${esc(meta.name || '')} · ${KM.fmtTime(meta.time)} · ${new Date(meta.date).toLocaleString('pt-BR')}` : 'vazio'}</small></div><button data-act="save:${s}" title="Salvar no espaço ${s}" aria-label="Salvar no espaço ${s}"><i class=ui-icon data-icon=save aria-hidden=true></i></button><button data-act="load:${s}" title="Carregar espaço ${s}" aria-label="Carregar espaço ${s}" ${meta ? '' : 'disabled'}><i class=ui-icon data-icon=folder aria-hidden=true></i></button></div>`; }).join('')}
          <div class="muted">Salvamento automático a cada 3 min (<kbd>F5</kbd> salva rápido, <kbd>F9</kbd> carrega).</div>`}
          <h4>Partida</h4>
          ${S.mission ? '<button class="mbtn wide" data-act="restart"><i class=ui-icon data-icon=reset aria-hidden=true></i> Reiniciar missão</button>' : ''}
          <button class="mbtn wide danger" data-act="quit"><i class=ui-icon data-icon=home aria-hidden=true></i> Voltar ao menu principal</button>`;
      }
      if (this.sliding && !force) return;
      if (html !== this.lastTabHtml || force) {
        const focusAct = this.tab === 'economy' ? document.activeElement?.dataset?.act : null;
        $('#tabcontent').innerHTML = html; this.lastTabHtml = html;
        if (focusAct === 'stock') $('#tabcontent [data-act="stock"]')?.focus({ preventScroll: true });
      }
      this.lastTab = this.tab;
    },
    markTool() {
      document.querySelectorAll('#tabcontent [data-tool],#tabcontent [data-build]').forEach((b) => {
        const on = this.tool && ((this.tool.build && this.tool.build === b.dataset.build) || this.tool === b.dataset.tool);
        b.classList.toggle('active', !!on);
      });
    },
    houseTip(k, count) {
      const d = KM.HOUSES[k];
      let s = `<b>${KM.icon(d.i)} ${d.n}</b><br>${d.desc || ''}<br><small>Custo: ${costStr(d.cost)}</small>`;
      if (d.worker) s += `<br><small>Trabalhador: ${KM.icon(KM.PROF[d.worker].i)} ${KM.PROF[d.worker].n}</small>`;
      if (d.recipes) s += '<br><small>' + d.recipes.map((r) => `${Object.keys(r.in).map((x) => ri(x) + (r.in[x] > 1 ? '×' + r.in[x] : '')).join('+') || '<i class=ui-icon data-icon=terrain aria-hidden=true></i>'} → ${Object.keys(r.out).map((x) => ri(x) + (r.out[x] > 1 ? '×' + r.out[x] : '')).join('+')}`).join('<br>') + '</small>';
      if (d.gather) s += `<br><small>Produz: ${ri(d.out)} ${KM.RES[d.out].n}</small>`;
      s += `<br><small>Seu reino: ${this.houseCountText(count || this.houseCounts()[k])}</small>`;
      return s;
    },
    onTabClick(e) {
      if (KM.S && KM.S.editor) { KM.editor.onClick(e); return; }
      const b = e.target.closest('button,input');
      if (!b) return;
      if (b.dataset.tool) { this.setTool(this.tool === b.dataset.tool ? null : b.dataset.tool); if (KM.touchUI) document.body.classList.remove('sb-open'); return; }
      if (b.dataset.build) { this.setTool(this.tool && this.tool.build === b.dataset.build ? null : { build: b.dataset.build }); if (KM.touchUI && this.tool) { document.body.classList.remove('sb-open'); this.toast('Toque no mapa onde quer construir.', 'info'); } return; }
      if (b.dataset.locked) { const k = b.dataset.locked; this.toast(`${KM.HOUSES[k].n}: construa antes ${KM.reqNames(KM.TECH[k])}.`, 'warn'); KM.sfx && KM.sfx('error'); return; }
      if (b.dataset.act) this.act(b.dataset.act, b, e);
    },
    setTool(t) {
      this.tool = t; this.drag = null;
      if (t) this.clearSel();
      this.markTool();
      document.body.classList.toggle('placing', !!t);
    },
    // gira a casa em construção 90° (a escolha vale para as próximas casas também)
    rotateBuild(dir) {
      this.buildRot = ((this.buildRot || 0) + dir + 4) & 3;
      KM.sfx && KM.sfx('click');
    },

    act(a, el) {
      const S = KM.S;
      const [k, v, w, z] = a.split(':');
      if (k === 'economy') { this.openEconomy(); return; }
      if (k === 'stock') { this.setTab('stock'); return; }
      if (k === 'auto') { KM.issue({ c: 'auto', v: el.checked }); return; }
      if (k === 'dist') { KM.issue({ c: 'dist', r: v, t: w, v: S.players[ME()].dist[v][w] + +z }); setTimeout(() => this.renderTab(true), 120); return; }
      if (k === 'pause') this.setSpeed(0);
      if (k === 'grid') { KM.R.showGrid = !KM.R.showGrid; this.renderTab(true); }
      if (k === 'sound') { KM.toggleSfx(); this.renderTab(true); }
      if (k === 'musicmode') { KM.music.setMode(KM.audioCfg.musicMode === 'gerada' ? 'gravada' : 'gerada'); this.renderTab(true); }
      if (k === 'voices') { KM.setAudio('voices', !KM.audioCfg.voices); this.renderTab(true); if (KM.audioCfg.voices) KM.voice('select'); }
      if (k === 'gfx') { KM.R.setGfx({ high: 'medium', medium: 'low', low: 'high' }[KM.R.gfx]); this.renderTab(true); }
      if (k === 'edge') { KM.edgeScroll = KM.edgeScroll === false; try { localStorage.setItem('rm_edge', KM.edgeScroll ? '1' : '0'); } catch (e) { /* ok */ } this.renderTab(true); }
      if (k === 'music') { this.toggleMusic(); this.renderTab(true); }
      if (k === 'help') this.showHelp(true);
      if (k === 'brief') { if (!S.mp) S.paused = true; this.showBriefing(S); }
      if (k === 'tree') this.showTree(true);
      if (k === 'stats') this.showStats();
      if (k === 'tutorial') KM.tutorial.start(S, true);
      if (k === 'goto') KM.R.centerOn(+v, +w);
      if (k === 'restart') { if (confirm('Reiniciar a missão do começo?')) KM.startGame({ mission: S.mission, diff: S.diff }); }
      if (k === 'save') { KM.save(+v); this.toast(`Jogo salvo no espaço ${v}`, 'ok'); this.renderTab(true); }
      if (k === 'load') { if (KM.load(+v)) this.toast(`Jogo carregado do espaço ${v}`, 'ok'); }
      if (k === 'quit') { if (confirm('Sair para o menu principal? O progresso não salvo será perdido.')) KM.quitToMenu(); }
    },
    toggleMusic() {
      KM.musicOn = !KM.musicOn;
      if (KM.musicOn) KM.music.start(); else KM.music.stop();
      try { localStorage.setItem('rm_music', KM.musicOn ? '1' : '0'); } catch (e) { /* ok */ }
    },

    // ---------- seleção ----------
    clearSel() { this.selHouse = 0; this.selUnits = []; this.selGroups = []; this.selSet = new Set(); this.lastPanel = null; },
    selectHouse(id) { this.clearSel(); this.selHouse = id; },
    selectUnits(list) { this.clearSel(); this.selUnits = list.map((u) => u.id); this.refreshSelSet(); },
    selectGroups(gids) {
      this.clearSel(); this.selGroups = [...new Set(gids)]; this.refreshSelSet();
      if (this.myGroups().length) { KM.sfx && KM.sfx('select'); KM.voice && KM.voice('select'); }
    },
    refreshSelSet() {
      const S = KM.S, s = new Set(this.selUnits);
      for (const gid of this.selGroups) { const g = S && S.army[gid]; if (g) for (const id of g.m) s.add(id); }
      this.selSet = s;
    },
    onRemoved(k, id) {
      if (k === 'h' && this.selHouse === id) this.selHouse = 0;
      if (k === 'u' && this.selSet.has(id)) { this.selUnits = this.selUnits.filter((x) => x !== id); this.selSet.delete(id); }
      if (k === 'g') this.selGroups = this.selGroups.filter((x) => x !== id);
    },
    selectedGroups() { const S = KM.S; return this.selGroups.map((id) => S.army[id]).filter(Boolean); },
    myGroups() { return this.selectedGroups().filter((g) => g.owner === ME()); },
    selectedUnits() { return this.selUnits.map((id) => KM.S.units[id]).filter(Boolean); },

    renderPanel() {
      const S = KM.S;
      if (S.editor) { const el = $('#selpanel'); const html = KM.editor.hint(); if (html !== this.lastPanel) { el.innerHTML = html; this.lastPanel = html; el.classList.add('empty'); el.classList.remove('building-hint'); } return; }
      this.refreshSelSet();
      let html = '';
      if (this.selHouse && S.houses[this.selHouse]) html = this.housePanel(S, S.houses[this.selHouse]);
      else if (this.selGroups.length && this.selectedGroups().length) html = this.groupPanel(S, this.selectedGroups());
      else if (this.selUnits.length && this.selectedUnits().length) html = this.unitPanel(S, this.selectedUnits()[0]);
      else if (this.tool && this.tool.build) {
        const d = KM.HOUSES[this.tool.build], rg = d.radius || (d.mine && KM.MINE_RADIUS) || d.shoot;
        const c = this.houseCounts()[this.tool.build], total = c && c.built + c.site + c.plan;
        html = `<div class="hint">${KM.icon(d.i)} <b>${d.n}</b> · porta para o <b>${KM.DOOR_DIR[this.buildRot || 0]}</b> <button class="mbtn" data-act2="rotb">⟳ Girar</button> <kbd>R</kbd>${rg ? ` · <i class=ui-icon data-icon=ruler aria-hidden=true></i> alcance <b>${rg}</b>` : ''} · <kbd>Shift</kbd> constrói várias<div class="building-summary"><span>Seu reino: <b>${this.houseCountText(c)}</b></span><button class="mbtn" data-act2="locate:${this.tool.build}" ${total ? '' : 'disabled'}>Localizar</button></div><small>Dourado: prontas · tracejado azul: obras. Contagem de prédios, mesmo pausados ou esgotados.</small></div>`;
      } else html = `<div class="hint"><i class=ui-icon data-icon=mouse aria-hidden=true></i> <b>Clique</b> para selecionar · <b>arraste</b> para selecionar tropas · <b>botão direito</b> para ordenar · <kbd>WASD</kbd> câmera · <kbd>Espaço</kbd> base${S.mp ? ' · <kbd>Enter</kbd> chat' : ''}</div>`;
      if (html !== this.lastPanel) {
        const el = $('#selpanel');
        el.innerHTML = html; this.lastPanel = html;
        el.classList.toggle('empty', html.startsWith('<div class="hint">'));
        el.classList.toggle('building-hint', !!(this.tool && this.tool.build && html.startsWith('<div class="hint">')));
      }
    },

    housePanel(S, h) {
      const d = KM.def(h), mine = h.owner === ME();
      const states = { plan: 'Planejada: aguardando construtor', site: 'Em construção', built: h.paused ? 'Pausada' : 'Pronta' };
      const rel = mine ? states[h.state] : KM.hostile(S, ME(), h.owner) ? `<span class="enemy">Inimigo · ${esc(S.players[h.owner].name)}</span>` : `<span class="good">Aliado · ${esc(S.players[h.owner].name)}</span>`;
      let s = `<div class="ph"><span class="big">${hic(h.type)}</span><div><b>${d.n}</b><br><small>${rel}</small></div></div>`;
      s += `<div class="hp"><i style="width:${(h.hp / h.maxHp) * 100}%" class="${mine ? '' : 'e'}"></i><span>${Math.ceil(h.hp)}/${h.maxHp}</span></div>`;
      if (mine) s += `<div class="building-summary"><span>${this.houseCountText(this.houseCounts()[h.type])}</span><button class="mbtn" data-act2="locate:${h.type}">Localizar próxima</button></div>`;
      const rg = KM.houseRange(h);
      if (rg) s += `<div class="row" data-tip="O círculo no chão mostra até onde ${d.shoot ? 'a torre atira' : d.mine ? 'a mina extrai minério' : 'o trabalhador vai buscar'}"><i class=ui-icon data-icon=ruler aria-hidden=true></i> ${rg.n}: <b>${rg.r}</b> casas</div>`;
      if (!mine) return s;
      if (h.state !== 'built') {
        s += '<div class="io">';
        for (const r in h.mat) { const mt = h.mat[r]; s += `<div class="chip" data-tip="${KM.RES[r].n}: entregue/necessário">${ri(r)} ${mt.got}/${mt.need}${mt.inc ? ` <em>+${mt.inc}</em>` : ''}</div>`; }
        s += '</div>';
        const prog = h.total ? h.used / h.total : 0;
        s += `<div class="pbar"><i style="width:${prog * 100}%"></i></div>`;
        const road = S.map.road[h.ey * S.map.W + h.ex] === 2;
        const comp = KM.rt.comp && KM.rt.comp[h.ey * S.map.W + h.ex];
        if (!road) s += '<div class="warn">A estrada da entrada ainda não foi construída.</div>';
        else if (!this.connected(S, comp)) s += '<div class="warn">Sem estrada até um armazém: os materiais não chegam!</div>';
        s += `<div class="mgrid"><button class="mbtn ${h.noDeliv ? 'on' : ''}" data-act2="hset:noDeliv:${h.noDeliv ? 0 : 1}">${h.noDeliv ? '<i class=ui-icon data-icon=block aria-hidden=true></i> Entregas bloqueadas' : '<i class=ui-icon data-icon=delivery aria-hidden=true></i> Entregas liberadas'}</button><button class="mbtn ${h.prio ? 'on' : ''}" data-act2="hset:prio:${h.prio ? 0 : 1}" data-tip="Construtores e carregadores atendem esta obra antes das outras">${h.prio ? '<i class=ui-icon data-icon=star aria-hidden=true></i> Prioridade: sim' : '☆ Dar prioridade'}</button><button class="mbtn danger" data-act2="demolish"><i class=ui-icon data-icon=cross aria-hidden=true></i> Cancelar</button></div>`;
        return s;
      }
      if (d.worker) {
        const w = h.worker && S.units[h.worker];
        s += `<div class="row">${KM.icon(KM.PROF[d.worker].i)} ${KM.PROF[d.worker].n}: ${w ? (w.inside === h.id || (w.task && w.task.type === 'gather') ? '<span class="good">trabalhando</span>' : w.task && w.task.type === 'eat' ? '<span class="warnc">comendo</span>' : '<span class="warnc">a caminho</span>') : '<span class="bad">nenhum: treine na Escola</span>'}${w && w.hunger < 25 ? ' <i class=ui-icon data-icon=meat aria-hidden=true></i>' : ''}</div>`;
      }
      const acc = KM.houseAccepts(h);
      if (acc.length && h.type !== 'barracks') {
        s += `<div class="lbl">Entrada</div><div class="io">${acc.map((r) => `<div class="chip" data-tip="${KM.RES[r].n} (máx. ${KM.houseCap(S, h, r)})">${ri(r)} ${h.inv[r] || 0}${h.inc[r] ? `<em>+${h.inc[r]}</em>` : ''}</div>`).join('')}</div>`;
      }
      const outs = Object.keys(h.out);
      if (outs.length) s += `<div class="lbl">Saída</div><div class="io">${outs.map((r) => `<div class="chip" data-tip="${KM.RES[r].n}">${ri(r)} ${h.out[r]}</div>`).join('')}</div>`;
      if (h.work) s += `<div class="pbar"><i style="width:${(1 - h.work.t / h.work.T) * 100}%"></i></div>`;
      // produção acumulada e aproveitamento (tempo trabalhando / tempo pronta)
      if (d.recipes && h.upT > 30) {
        let made = 0;
        d.recipes.forEach((rc, i) => { const q = Object.values(rc.out).reduce((a, b) => a + b, 0); made += (h.cnt[i] || 0) * q; });
        const eff = Math.round((100 * (h.busyT || 0)) / h.upT);
        s += `<div class="row" data-tip="Aproveitamento: parte do tempo em que a casa estava produzindo"><i class=ui-icon data-icon=chart aria-hidden=true></i> Produziu <b>${made}</b> · aproveitamento <b class="${eff < 40 ? 'bad' : eff < 70 ? 'warnc' : 'good'}">${eff}%</b></div>`;
        if (eff < 40 && !h.paused && h.upT > 120 && !(h.orders && !h.orders.some((q) => q > 0))) s += `<div class="warn">Parada boa parte do tempo: ${h.worker ? 'falta matéria-prima (confira estradas, carregadores e distribuição)' : 'sem trabalhador'}.</div>`;
      }
      if (d.mine && h.depleted) s += '<div class="warn">O minério próximo acabou.</div>';
      if (h.orders) {
        const any = h.orders.some((o) => o > 0);
        s += `<div class="lbl">Encomendas ${any ? '' : '<span class="bad">(nenhuma: a oficina está parada)</span>'}</div>`;
        d.recipes.forEach((rc, i) => {
          const o = Object.keys(rc.out)[0], v = h.orders[i];
          s += `<div class="ratio"><span>${ri(o)} ${KM.RES[o].n}</span><button data-act2="ord:${i}:-1" data-tip="Shift: −10">−</button><b>${v >= KM.INF ? '∞' : v}</b><button data-act2="ord:${i}:1" data-tip="Shift: +10">+</button><button data-act2="ord:${i}:inf" data-tip="Produção contínua">∞</button></div>`;
        });
      }
      if (d.market) {
        const t = h.trade || { sell: 'stone', buy: 'gold', n: 0 }, rate = KM.tradeRate(t.sell, t.buy);
        const TRADE = ['trunk', 'stone', 'wood', 'coal', 'ironore', 'goldore', 'iron', 'gold', 'corn', 'flour', 'bread', 'pig', 'skin', 'sausages', 'leather', 'wine', 'fish', 'horse', 'axe', 'bow', 'lance', 'shield', 'armor'];
        const grid = (sel, key) => `<div class="io sgridres">${TRADE.map((r) => `<button class="chip ${r === sel ? 'sel' : ''}" data-act2="${key}:${r}" data-tip="${KM.RES[r].n}">${ri(r)}</button>`).join('')}</div>`;
        s += `<div class="trade"><div class="rate">${rate.sellN} ${ri(t.sell)} → ${rate.buyN} ${ri(t.buy)}</div><small class="muted">${KM.RES[t.sell].n} por ${KM.RES[t.buy].n} (taxa do mercador incluída)</small></div>`;
        s += `<div class="lbl">Vender</div>${grid(t.sell, 'tsell')}<div class="lbl">Comprar</div>${grid(t.buy, 'tbuy')}`;
        s += `<div class="ratio"><span>Trocas encomendadas</span><button data-act2="tn:-1" data-tip="Shift: −10">−</button><b>${t.n >= KM.INF ? '∞' : t.n}</b><button data-act2="tn:1" data-tip="Shift: +10">+</button><button data-act2="tn:inf" data-tip="Trocar sem parar">∞</button></div>`;
        s += `<div class="row"><i class=ui-icon data-icon=crate aria-hidden=true></i> Aguardando: ${h.inv[t.sell] || 0}/${rate.sellN} ${ri(t.sell)}${h.tradeT > 0 ? ' · <span class="good">negociando…</span>' : ''} · Trocas feitas: <b>${h.traded || 0}</b></div>`;
        if (!t.n) s += '<div class="muted">Encomende trocas para os carregadores começarem a trazer a mercadoria.</div>';
      }
      if (h.type === 'storehouse') {
        s += `<div class="lbl">Clique para bloquear a entrada de um recurso</div><div class="io sgridres">${KM.RES_ORDER.map((r) => `<button class="chip ${h.block && h.block[r] ? 'blocked' : ''} ${h.inv[r] ? '' : 'zero'}" data-act2="block:${r}" data-tip="${KM.RES[r].n}${h.block && h.block[r] ? ' (bloqueado)' : ''}">${ri(r)} ${h.inv[r] || 0}</button>`).join('')}</div>`;
      }
      if (h.type === 'school') {
        const P = S.players[ME()];
        s += `<div class="lbl">Fila de treino ${h.trainT ? `: ${KM.PROF[h.queue[0]].n}` : (h.queue.length && !(h.inv.gold > 0) ? ': <span class="bad">sem ouro!</span>' : '')}</div>`;
        if (h.trainT) s += `<div class="pbar"><i style="width:${(1 - h.trainT / h.trainMax) * 100}%"></i></div>`;
        s += `<div class="queue">${h.queue.map((p, i) => `<button data-act2="unq:${i}" data-tip="Remover ${KM.PROF[p].n}" aria-label="Remover ${KM.PROF[p].n}">${uic(p)}<span class="queue-remove">×</span></button>`).join('') || '<small class="muted">vazia</small>'}</div>`;
        s += `<div class="lbl">Profissionais <span class="muted">· 1 ouro por treino</span></div><div class="tgrid">${KM.PROF_ORDER.map((p) => {
          if (KM.profUnlocked(S, ME(), p)) return `<button data-act2="train:${p}" aria-label="Treinar ${KM.PROF[p].n}" data-tip="${KM.PROF[p].n} · ${KM.PROF[p].t}s">${portrait(p)}<small>${KM.PROF[p].n}</small></button>`;
          const need = p === 'recruit' ? 'Construa um <i class=ui-icon data-icon=sword aria-hidden=true></i> Quartel' : 'Libere uma construção que use este profissional: ' + Object.keys(KM.HOUSES).filter((t) => KM.HOUSES[t].worker === p).map((t) => KM.HOUSES[t].n).join(', ');
          return `<button class="locked" data-act2="lockedp:${p}" aria-label="${KM.PROF[p].n} bloqueado" data-tip="<b>${KM.PROF[p].n}</b><br>${need}">${portrait(p)}<small>${KM.PROF[p].n}</small><em class="train-lock"><i class=ui-icon data-icon=lock aria-hidden=true></i> Bloqueado</em></button>`;
        }).join('')}</div>`;
        s += `<label class="chk"><input type="checkbox" data-act2="auto" ${P.autoTrain ? 'checked' : ''}> Treino automático</label>`;
      }
      if (h.type === 'barracks') {
        s += `<div class="row"><i class=ui-icon data-icon=helmet aria-hidden=true></i> Recrutas: <b>${h.recruits}</b> <small class="muted">(treine "Recruta" na Escola)</small></div><div class="muted">Botão direito no mapa define o ponto de encontro dos novos soldados.</div>`;
        s += `<div class="io">${KM.WEAPONS.map((r) => `<div class="chip ${h.inv[r] ? '' : 'zero'}" data-tip="${KM.RES[r].n}">${ri(r)} ${h.inv[r] || 0}</div>`).join('')}</div>`;
        s += `<div class="lbl">Equipar soldado <small class="muted">(Shift: 5 de uma vez)</small></div><div class="sgrid">${KM.SOLDIER_ORDER.map((t) => {
          const sd = KM.SOLDIERS[t];
          if (!KM.soldierUnlocked(S, ME(), t)) return `<button class="locked" data-act2="lockeds:${t}" data-tip="<b><i class=ui-icon data-icon=lock aria-hidden=true></i> ${sd.n}</b><br>Para liberar, construa: ${esc(KM.reqNames(KM.SOLDIER_REQ[t]))}"><span>${uic(t)}</span><small>${sd.n}</small><em><i class=ui-icon data-icon=lock aria-hidden=true></i> bloqueado</em></button>`;
          const ok = h.recruits > 0 && Object.keys(sd.cost).every((r) => (h.inv[r] || 0) >= sd.cost[r]);
          return `<button data-act2="equip:${t}" class="${ok ? '' : 'off'}" data-tip="<b>${sd.n}</b><br>Vida ${sd.hp} · Ataque ${sd.atk} · Defesa ${sd.def}${sd.range ? ' · Alcance ' + sd.range : ''}${sd.antiCav ? '<br>Forte contra cavalaria' : ''}<br>Custo: <i class=ui-icon data-icon=helmet aria-hidden=true></i>${Object.keys(sd.cost).length ? ' + ' + costStr(sd.cost) : ' (sem arma)'}"><span>${uic(t)}</span><small>${sd.n}</small><em>${costStr(sd.cost) || 'só <i class=ui-icon data-icon=helmet aria-hidden=true></i>'}</em></button>`;
        }).join('')}</div>`;
      }
      if (h.type === 'tower') s += `<div class="row">Munição: ${h.shots} tiros prontos + ${h.inv.stone || 0} <i class=ui-icon data-icon=stone aria-hidden=true></i></div>`;
      s += `<div class="mgrid">`;
      if (d.recipes || d.gather) s += `<button class="mbtn ${h.paused ? 'on' : ''}" data-act2="hset:paused:${h.paused ? 0 : 1}">${h.paused ? '<i class=ui-icon data-icon=play aria-hidden=true></i> Retomar' : '<i class=ui-icon data-icon=pause aria-hidden=true></i> Pausar'}</button>`;
      if (acc.length) s += `<button class="mbtn ${h.noDeliv ? 'on' : ''}" data-act2="hset:noDeliv:${h.noDeliv ? 0 : 1}">${h.noDeliv ? '<i class=ui-icon data-icon=block aria-hidden=true></i> Entregas bloqueadas' : '<i class=ui-icon data-icon=delivery aria-hidden=true></i> Entregas liberadas'}</button>`;
      s += `<button class="mbtn ${h.repair ? '' : 'on'}" data-act2="hset:repair:${h.repair ? 0 : 1}" data-tip="Construtores consertam a casa quando danificada">${h.repair ? '<i class=ui-icon data-icon=wrench aria-hidden=true></i> Reparo: sim' : '<i class=ui-icon data-icon=wrench aria-hidden=true></i> Reparo: não'}</button>`;
      const onlySchool = h.type === 'school' && !Object.values(S.houses).some((x) => x !== h && x.owner === h.owner && x.type === 'school' && x.state === 'built');
      s += onlySchool ? `<button class="mbtn off" disabled data-tip="É dela que vem todo o seu povo"><i class=ui-icon data-icon=book aria-hidden=true></i> Escola não pode ser demolida</button></div>` : `<button class="mbtn danger" data-act2="demolish"><i class=ui-icon data-icon=cross aria-hidden=true></i> Demolir</button></div>`;
      return s;
    },
    connected(S, comp) {
      if (comp == null || comp < 0) return false;
      for (const id in S.houses) { const o = S.houses[id]; if (o.owner === ME() && o.type === 'storehouse' && o.state === 'built' && KM.rt.comp[o.ey * S.map.W + o.ex] === comp) return true; }
      return false;
    },
    unitPanel(S, u) {
      const sd = KM.SOLDIERS[u.type], p = KM.PROF[u.type];
      const nm = sd ? sd.n : p.n;
      const mine = u.owner === ME();
      let s = `<div class="ph"><span class="big">${uic(u.type)}</span><div><b>${nm}</b><br><small>${mine ? KM.taskText(S, u) : `<span class="${KM.hostile(S, ME(), u.owner) ? 'enemy' : 'good'}">${esc(S.players[u.owner].name)}</span>`}</small></div></div>`;
      s += `<div class="hp"><i style="width:${(u.hp / u.maxHp) * 100}%" class="${mine ? '' : 'e'}"></i><span>${Math.ceil(u.hp)}/${u.maxHp}</span></div>`;
      if (mine) s += `<div class="meter"><span>Fome</span><div class="mbar"><i style="width:${u.hunger}%"></i></div></div>`;
      return s;
    },
    groupPanel(S, groups) {
      const mine = groups[0].owner === ME();
      let n = 0, hp = 0, mhp = 0, hun = 0;
      const c = {};
      for (const g of groups) for (const u of KM.groupUnits(S, g)) { n++; hp += u.hp; mhp += u.maxHp; hun += u.hunger; KM.add(c, u.type, 1); }
      if (!n) return '';
      const sd = KM.SOLDIERS[groups[0].type];
      let s = `<div class="ph"><span class="big">${groups.length > 1 ? '<i class=ui-icon data-icon=sword aria-hidden=true></i>' : KM.icon(sd.i)}</span><div><b>${groups.length > 1 ? groups.length + ' grupos' : sd.n}</b> · ${n} soldado${n > 1 ? 's' : ''}<br><small>${mine ? this.groupState(S, groups[0]) : `<span class="${KM.hostile(S, ME(), groups[0].owner) ? 'enemy' : 'good'}">${esc(S.players[groups[0].owner].name)}</span>`}</small></div></div>`;
      s += `<div class="hp"><i style="width:${(hp / mhp) * 100}%" class="${mine ? '' : 'e'}"></i><span>Vida ${Math.round((hp / mhp) * 100)}%</span></div>`;
      if (groups.length > 1) s += `<div class="io">${Object.keys(c).map((t) => `<div class="chip">${KM.icon(KM.SOLDIERS[t].i)} ${c[t]}</div>`).join('')}</div>`;
      else s += `<div class="muted">Ataque ${sd.atk} · Defesa ${sd.def}${sd.range ? ' · Alcance ' + sd.range : ''}${sd.antiCav ? ' · anti-cavalaria' : ''}</div>`;
      if (!mine) return s;
      s += `<div class="meter"><span>Comida</span><div class="mbar"><i style="width:${hun / n}%"></i></div></div>`;
      s += `<div class="cmds">
        <button data-act2="stop" aria-label="Parar" data-tip="Parar <kbd>Shift</kbd>+<kbd>S</kbd>"><i class=ui-icon data-icon=stop aria-hidden=true></i></button>
        <button data-act2="turn:-1" aria-label="Girar à esquerda" data-tip="Girar à esquerda <kbd>Q</kbd>">↺</button>
        <button data-act2="turn:1" aria-label="Girar à direita" data-tip="Girar à direita <kbd>E</kbd>">↻</button>
        <button data-act2="cols:-1" aria-label="Menos colunas" data-tip="Menos colunas <kbd>[</kbd>">⇤</button>
        <button data-act2="cols:1" aria-label="Mais colunas" data-tip="Mais colunas <kbd>]</kbd>">⇥</button>
        <button data-act2="split" aria-label="Dividir grupo" data-tip="Dividir grupo ao meio <kbd>T</kbd>"><i class=ui-icon data-icon=split aria-hidden=true></i></button>
        <button data-act2="link" aria-label="Unir grupos" data-tip="Unir grupos selecionados do mesmo tipo <kbd>L</kbd>" ${groups.length > 1 ? '' : 'disabled'}><i class=ui-icon data-icon=link aria-hidden=true></i></button>
        <button data-act2="feed" aria-label="Pedir comida" data-tip="Chamar carregadores com comida <kbd>H</kbd>"><i class=ui-icon data-icon=meat aria-hidden=true></i></button>
        <button data-act2="amove" aria-label="Atacar e mover" data-tip="Atacar-mover <kbd>Shift</kbd>+<kbd>A</kbd>"><i class=ui-icon data-icon=sword aria-hidden=true></i></button>
      </div><div class="muted">Colunas: ${groups[0].cols} · <kbd>Ctrl</kbd>+<kbd>1-9</kbd> cria atalho</div>`;
      return s;
    },
    groupState(S, g) {
      const us = KM.groupUnits(S, g);
      if (us.some((u) => u.target)) return 'Em combate';
      if (us.some((u) => u.order)) return 'Marchando';
      if (us.some((u) => u.hunger < 35)) return 'Com fome';
      return 'Em formação';
    },
    onPanelClick(e) {
      const b = e.target.closest('[data-act2]');
      if (!b) return;
      const S = KM.S, h = S.houses[this.selHouse];
      const [k, a, bb] = b.dataset.act2.split(':');
      if (k === 'rotb') { this.rotateBuild(1); return; }
      if (k === 'locate') { this.locateHouse(a); return; }
      const gids = this.myGroups().map((g) => g.id);
      if (k === 'demolish' && h) { KM.issue({ c: 'demolish', id: h.id }); KM.sfx && KM.sfx('demolish'); this.clearSel(); }
      if (k === 'hset' && h) KM.issue({ c: 'hset', id: h.id, k: a, v: bb === '1' });
      if (k === 'ord' && h) {
        const cur = h.orders[+a];
        const v = bb === 'inf' ? (cur >= KM.INF ? 0 : KM.INF) : KM.clamp((cur >= KM.INF ? 99 : cur) + +bb * (e.shiftKey ? 10 : 1), 0, 99);
        KM.issue({ c: 'order', id: h.id, i: +a, v });
      }
      if (k === 'block' && h) KM.issue({ c: 'block', id: h.id, r: a });
      if ((k === 'tsell' || k === 'tbuy' || k === 'tn') && h) {
        const t = h.trade || { sell: 'stone', buy: 'gold', n: 0 };
        let { sell, buy, n } = t;
        if (k === 'tsell') sell = a; if (k === 'tbuy') buy = a;
        if (sell === buy) { this.toast('Escolha recursos diferentes para vender e comprar.', 'warn'); return; }
        if (k === 'tn') n = a === 'inf' ? (n >= KM.INF ? 0 : KM.INF) : KM.clamp((n >= KM.INF ? 99 : n) + +a * (e.shiftKey ? 10 : 1), 0, 99);
        KM.issue({ c: 'trade', id: h.id, sell, buy, n });
        KM.sfx && KM.sfx('click');
      }
      if (k === 'train' && h) { if (h.queue.length < 10) KM.issue({ c: 'train', id: h.id, p: a }); else this.toast('Fila cheia (máx. 10).', 'warn'); }
      if (k === 'lockedp') this.toast(`${KM.PROF[a].n} ainda não está disponível. ${a === 'recruit' ? 'Construa um Quartel.' : 'Libere a construção onde ele trabalha.'}`, 'warn');
      if (k === 'lockeds') this.toast(`${KM.SOLDIERS[a].n}: construa antes ${KM.reqNames(KM.SOLDIER_REQ[a])}.`, 'warn');
      if (k === 'unq' && h) KM.issue({ c: 'unq', id: h.id, i: +a });
      if (k === 'auto') KM.issue({ c: 'auto', v: b.checked });
      if (k === 'equip' && h) {
        const sd = KM.SOLDIERS[a];
        const ok = h.recruits > 0 && Object.keys(sd.cost).every((r) => (h.inv[r] || 0) >= sd.cost[r]);
        if (!KM.soldierUnlocked(S, ME(), a)) this.toast(`${sd.n}: construa antes ${KM.reqNames(KM.SOLDIER_REQ[a])}.`, 'warn');
        else if (!ok) this.toast(h.recruits < 1 ? 'Sem recrutas! Treine "Recruta" na Escola.' : 'Faltam armas ou armaduras no quartel.', 'warn');
        else { KM.issue({ c: 'equip', id: h.id, t: a, n: e.shiftKey ? 5 : 1 }); KM.sfx && KM.sfx('click'); }
      }
      if (k === 'stop') KM.issue({ c: 'stop', g: gids });
      if (k === 'turn') KM.issue({ c: 'turn', g: gids, d: +a });
      if (k === 'cols') KM.issue({ c: 'cols', g: gids, d: +a });
      if (k === 'split') KM.issue({ c: 'split', g: gids });
      if (k === 'link') KM.issue({ c: 'link', g: gids });
      if (k === 'feed') { KM.issue({ c: 'feed', g: gids }); this.toast('Carregadores levarão comida às tropas.', 'info'); }
      if (k === 'amove') { this.attackMove = true; this.toast('Clique com o botão direito no destino do ataque.', 'info'); }
      this.lastPanel = null;
      setTimeout(() => { this.lastPanel = null; this.renderPanel(); }, 80);
    },

    // ---------- tooltip ----------
    onTip(e) {
      const el = e.target.closest('[data-tip]');
      const tip = $('#tooltip');
      if (!el) { tip.style.display = 'none'; return; }
      tip.innerHTML = el.dataset.tip;
      tip.style.display = 'block';
      const x = Math.min(e.clientX + 16, innerWidth - tip.offsetWidth - 8), y = Math.min(e.clientY + 12, innerHeight - tip.offsetHeight - 8);
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    },
    hideTip() { $('#tooltip').style.display = 'none'; },

    // ---------- notificações ----------
    toast(msg, kind, pos) {
      const box = $('#toasts');
      if (!box) return;
      const el = document.createElement('div');
      el.className = 'toast ' + (kind || 'info');
      el.innerHTML = esc(msg) + (pos ? ' <span class="go"><i class=ui-icon data-icon=pin aria-hidden=true></i></span>' : '');
      if (pos) { el.style.cursor = 'pointer'; el.onclick = () => KM.R.centerOn(pos.x, pos.y); this.lastPos = pos; }
      if (pos && (kind === 'danger' || kind === 'warn')) {
        this.pings = (this.pings || []).filter((p) => Math.hypot(p.x - pos.x, p.y - pos.y) > 4);
        this.pings.push({ x: pos.x, y: pos.y, t: performance.now() / 1000, c: kind === 'danger' ? '#ff4a3a' : '#ffc23a' });
      }
      // registro de mensagens (aba Objetivos)
      if (KM.S && kind !== 'info') { this.msgLog = this.msgLog || []; this.msgLog.unshift({ msg, kind, pos, t: KM.S.time }); if (this.msgLog.length > 25) this.msgLog.pop(); }
      box.prepend(el);
      while (box.children.length > 6) box.lastChild.remove();
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, kind === 'danger' ? 9000 : 5500);
    },

    // ---------- barra superior ----------
    renderTop() {
      const S = KM.S;
      if (S.editor) { const html = KM.editor.top(); if (html !== this.lastTop) { $('#topbar').innerHTML = html; this.lastTop = html; } return; }
      const tot = {};
      let cit = 0, sol = 0;
      for (const id in S.houses) { const h = S.houses[id]; if (h.owner === ME() && h.type === 'storehouse' && h.state === 'built') for (const r in h.inv) KM.add(tot, r, h.inv[r]); }
      for (const id in S.units) { const u = S.units[id]; if (u.owner !== ME()) continue; if (KM.isSoldier(u.type)) sol++; else cit++; }
      const food = (tot.bread || 0) + (tot.sausages || 0) + (tot.wine || 0) + (tot.fish || 0);
      const ais = S.players.filter((p, i) => p.ai && p.ai.mode !== 'none' && p.ai.mode !== 'outpost' && KM.hostile(S, ME(), i) && !p.out);
      const peace = Math.min(...ais.map((p) => (p.ai.wave === 0 ? p.ai.next - S.time : Infinity)));
      const waves = ais.reduce((a, p) => a + p.ai.wave, 0);
      let threat = '';
      if (KM.zone(S, ME())) threat = `<span class="peace" data-tip="Tempo de paz. Até ele acabar, cada reino só constrói, anda e ataca no próprio quadrante do mapa (cerca de luz no chão, tracejado no minimapa)"><i class=ui-icon data-icon=peace aria-hidden=true></i> Paz ${KM.fmtTime(S.peaceEnd - S.time)} <i class=ui-icon data-icon=block aria-hidden=true></i></span>`;
      else if (ais.length) threat = isFinite(peace) && peace > 0 ? `<span class="peace" data-tip="Tempo de paz antes do primeiro ataque"><i class=ui-icon data-icon=peace aria-hidden=true></i> Paz ${KM.fmtTime(peace)}</span>` : `<span class="muted">Ataques: ${waves}</span>`;
      // tendência: variação por minuto (janela de ~1 min de jogo)
      const vals = { wood: tot.wood || 0, stone: tot.stone || 0, gold: tot.gold || 0, food };
      if (this.trendS !== S) { this.trendS = S; this.trendBuf = []; }
      const TB = this.trendBuf;
      if (!TB.length || S.time - TB[TB.length - 1].t >= 5) { TB.push({ t: S.time, v: vals }); while (TB.length > 2 && S.time - TB[0].t > 65) TB.shift(); }
      const span = S.time - TB[0].t;
      const tr = (k) => {
        const r = span > 20 ? Math.round(((vals[k] - TB[0].v[k]) * 60) / span) : 0;
        return r ? `<em class="${r > 0 ? 'up' : 'down'}">${r > 0 ? '▲' : '▼'}${Math.abs(r)}</em>` : '';
      };
      const req = S.goals.filter((g) => !g.opt), opt = S.goals.filter((g) => g.opt);
      const done = req.filter((g) => KM.goalStatus(S, g).done).length;
      const crowns = opt.length ? ` · <i class=ui-icon data-icon=crown aria-hidden=true></i> ${opt.filter((g) => KM.goalStatus(S, g).done).length}/${opt.length}` : '';
      const net = S.mp && KM.net ? `<span class="${KM.net.lag > 0.5 ? 'threat' : 'muted'}" data-tip="Conexão multijogador"><i class=ui-icon data-icon=signal aria-hidden=true></i> ${KM.net.ping}ms</span>` : '';
      const html = `<div class="tb-group"><span><i class=ui-icon data-icon=clock aria-hidden=true></i> ${KM.fmtTime(S.time)}</span> ${threat} ${net} <button class="goalsbtn" data-goals="1" data-tip="Objetivos e desafios"><i class=ui-icon data-icon=target aria-hidden=true></i> ${done}/${req.length}${crowns}</button></div>
        <div class="tb-group res"><button class="goalsbtn" data-economy="1" aria-label="Abrir produção e consumo de recursos" data-tip="Produção e consumo de recursos em tempo real"><i class=ui-icon data-icon=chart aria-hidden=true></i></button><span data-tip="Madeira (variação por minuto)"><i class=ui-icon data-icon=wood aria-hidden=true></i> ${tot.wood || 0}${tr('wood')}</span><span data-tip="Pedra (variação por minuto)"><i class=ui-icon data-icon=stone aria-hidden=true></i> ${tot.stone || 0}${tr('stone')}</span><span data-tip="Ouro (variação por minuto)"><i class=ui-icon data-icon=coin aria-hidden=true></i> ${tot.gold || 0}${tr('gold')}</span><span data-tip="Comida: pão, salsicha, vinho, peixe (variação por minuto)"><i class=ui-icon data-icon=bread aria-hidden=true></i> ${food}${tr('food')}</span><span data-tip="Cidadãos"><i class=ui-icon data-icon=people aria-hidden=true></i> ${cit}</span><span data-tip="Soldados"><i class=ui-icon data-icon=sword aria-hidden=true></i> ${sol}</span></div>
        <div class="tb-group speed">${(S.mp ? [1, 2, 3] : [0, 1, 2, 3, 5]).map((v) => `<button data-speed="${v}" aria-label="${v === 0 ? (S.paused ? 'Continuar' : 'Pausar') : 'Velocidade ' + v + ' vezes'}" class="${(v === 0 ? S.paused : !S.paused && S.speed === v) ? 'active' : ''}">${v === 0 ? '<i class=ui-icon data-icon=pause aria-hidden=true></i>' : v + '×'}</button>`).join('')}</div>`;
      if (html !== this.lastTop) { $('#topbar').innerHTML = html; this.lastTop = html; }
    },
    setSpeed(v) {
      const S = KM.S;
      if (S.mp) {
        if (KM.me !== 0) { this.toast('Só o anfitrião muda a velocidade.', 'warn'); return; }
        if (v === 0) { this.toast('Não há pausa no multijogador.', 'warn'); return; }
        KM.issue({ c: 'speed', v }); return;
      }
      if (v === 0) S.paused = !S.paused; else { S.paused = false; S.speed = v; }
      this.renderTop();
    },

    // ---------- minimapa ----------
    renderMini() {
      const S = KM.S, cv = $('#minimap'), g = cv.getContext('2d'), m = S.map;
      if (!this.mmImg || this.mmImg.width !== m.W) this.mmImg = g.createImageData(m.W, m.H);
      const d = this.mmImg.data, bit = 1 << ME();
      const col = { 0: [92, 138, 58], 1: [38, 100, 150], 2: [128, 118, 106], 3: [208, 190, 140] };
      col[0] = KM.biome(m).grass.map((c) => Math.round(c * 255));
      col[3] = KM.biome(m).sand.map((c) => Math.round(c * 255));
      for (let i = 0; i < m.W * m.H; i++) {
        let c = col[m.terrain[i]];
        const x = i % m.W, y = (i / m.W) | 0;
        const hl = (KM.vh(m, x + 1, y + 1) - KM.vh(m, x, y)) * 10;
        if (m.tree[i] >= 3) c = [48, 92, 38];
        if (m.stone[i]) c = [170, 165, 155];
        if (m.road[i] === 2) c = [170, 140, 95];
        if (m.field[i] === 2 || m.field[i] === 4) c = [150, 120, 60];
        if (!S.editor && !(m.explored[i] & bit)) { d[i * 4] = 8; d[i * 4 + 1] = 10; d[i * 4 + 2] = 14; d[i * 4 + 3] = 255; continue; }
        d[i * 4] = KM.clamp(c[0] + hl, 0, 255); d[i * 4 + 1] = KM.clamp(c[1] + hl, 0, 255); d[i * 4 + 2] = KM.clamp(c[2] + hl, 0, 255); d[i * 4 + 3] = 255;
      }
      const put = (x, y, c) => { if (!KM.inb(x, y)) return; const i = (y * m.W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; };
      const pc = S.players.map((p) => { const v = parseInt(p.color.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; });
      for (const id in S.houses) {
        const h = S.houses[id];
        if (!S.editor && h.owner !== ME() && !(m.explored[h.y * m.W + h.x] & bit)) continue;
        for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) put(x, y, pc[h.owner] || [255, 255, 255]);
      }
      for (const id in S.units) {
        const u = S.units[id];
        if (u.inside) continue;
        const x = Math.round(u.x), y = Math.round(u.y);
        if (u.owner !== ME() && !(m.explored[y * m.W + x] & bit)) continue;
        put(x, y, u.owner === ME() ? [220, 240, 255] : pc[u.owner].map((v) => Math.min(255, v + 60)));
      }
      if (S.editor && S.edStarts) for (const [k, s] of S.edStarts.entries()) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(s.x + dx, s.y + dy, pc[k] || [255, 255, 255]);
      if (!this.mmTmp || this.mmTmp.width !== m.W) { this.mmTmp = document.createElement('canvas'); this.mmTmp.width = m.W; this.mmTmp.height = m.H; }
      this.mmTmp.getContext('2d').putImageData(this.mmImg, 0, 0);
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, cv.width, cv.height);
      g.drawImage(this.mmTmp, 0, 0, cv.width, cv.height);
      const poly = KM.R.poly, sx = cv.width / m.W, sy = cv.height / m.H;
      const focus = this.buildFocusType();
      if (focus) for (const h of Object.values(S.houses)) {
        if (h.owner !== ME() || h.type !== focus) continue;
        g.strokeStyle = h.state === 'built' ? '#ffe066' : '#8dd8ff'; g.lineWidth = 2.5;
        g.setLineDash(h.state === 'built' ? [] : [3, 2]);
        g.strokeRect(h.x * sx - 2, h.y * sy - 2, h.w * sx + 4, h.h * sy + 4);
      }
      g.setLineDash([]);
      for (const site of S.sites || []) {
        g.strokeStyle = site.contested ? '#ff6050' : site.owner >= 0 ? S.players[site.owner].color : '#ffe066';
        g.lineWidth = 2; g.strokeRect(site.x * sx - 5, site.y * sy - 5, 10, 10);
      }
      // paz: cruz tracejada dos quadrantes e o território do jogador destacado
      const z = KM.zone(S, ME());
      if (z) {
        g.setLineDash([4, 3]); g.strokeStyle = 'rgba(255,240,200,0.75)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo((m.W >> 1) * sx, 0); g.lineTo((m.W >> 1) * sx, cv.height); g.moveTo(0, (m.H >> 1) * sy); g.lineTo(cv.width, (m.H >> 1) * sy); g.stroke();
        g.setLineDash([]); g.strokeStyle = KM.pcolor(S, ME()); g.lineWidth = 2;
        g.strokeRect(z.x0 * sx + 1, z.y0 * sy + 1, (z.x1 - z.x0 + 1) * sx - 2, (z.y1 - z.y0 + 1) * sy - 2);
      }
      if (poly) {
        g.strokeStyle = '#ffe066'; g.lineWidth = 1.5;
        g.beginPath();
        poly.forEach(([x, y], i) => (i ? g.lineTo(x * sx, y * sy) : g.moveTo(x * sx, y * sy)));
        g.closePath(); g.stroke();
      }
      // alertas piscando no minimapa (ataques, avisos)
      const now = performance.now() / 1000;
      this.pings = (this.pings || []).filter((p) => now - p.t < 7);
      for (const p of this.pings) {
        const a = now - p.t;
        g.globalAlpha = Math.max(0, 1 - a / 7);
        g.strokeStyle = p.c; g.lineWidth = 2.5;
        for (const k of [0, 0.5]) { const r = 3 + ((a * 1.4 + k) % 1) * 14; g.beginPath(); g.arc((p.x + 0.5) * sx, (p.y + 0.5) * sy, r, 0, 7); g.stroke(); }
        g.fillStyle = p.c; g.beginPath(); g.arc((p.x + 0.5) * sx, (p.y + 0.5) * sy, 3, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    },

    update(dt) {
      if (!KM.S) return;
      this.t += dt;
      this.mt = (this.mt || 0) + dt;
      if (this.mt > 0.25) {
        this.mt = 0;
        this.renderTop();
        this.renderPanel();
        this.renderTab(false);
      }
      this.mmt = (this.mmt || 0) + dt;
      if (this.mmt > (this.pings && this.pings.length ? 0.08 : 0.5)) { this.mmt = 0; this.renderMini(); }
      KM.tutorial.update(KM.S, dt);
      this.advT = (this.advT || 0) + dt;
      if (this.advT > 3) { this.advT = 0; this.advise(KM.S); }
    },

    // ---------- conselheiro: avisa sobre gargalos da economia (no máximo um aviso a cada 2 min por assunto) ----------
    advise(S) {
      if (!S || S.editor || S.paused || S.over || S.time < 20) return;
      const o = ME(), P = S.players[o];
      if (!P || P.out || !P.eco) return;
      const tot = {}, have = {};
      let starving = 0, cit = 0, sitesNeed = { wood: 0, stone: 0 };
      for (const id in S.houses) {
        const h = S.houses[id];
        if (h.owner !== o) continue;
        if (h.state === 'built') { have[h.type] = (have[h.type] || 0) + 1; if (h.type === 'storehouse') for (const r in h.inv) KM.add(tot, r, h.inv[r]); }
        else for (const r in h.mat || {}) { const mt = h.mat[r]; if (sitesNeed[r] != null) sitesNeed[r] += Math.max(0, mt.need - mt.got - (mt.inc || 0)); }
      }
      for (const id in S.units) { const u = S.units[id]; if (u.owner !== o || KM.isSoldier(u.type)) continue; cit++; if (u.hunger <= 0) starving++; }
      const adv = S.adv || (S.adv = {});
      const say = (k, msg) => { if (S.time - (adv[k] || -999) < 120) return; adv[k] = S.time; this.toast(msg, 'warn'); };
      const name = (t) => KM.HOUSES[t].n;
      const path = (t) => (KM.houseUnlocked(S, o, t) ? `construa ${name(t)}` : `libere e construa ${name(t)} (antes: ${KM.reqNames(KM.TECH[t])})`);
      const school = Object.values(S.houses).find((h) => h.owner === o && h.type === 'school' && h.state === 'built');
      if (school && school.queue.length && !(tot.gold > 0) && !(school.inv.gold > 0)) {
        say('gold', `Acabou o ouro: a Escola parou de treinar. Para produzir ouro, ${have.goldmine ? path('goldsmelter') : path('goldmine')} perto de montanhas com pontos dourados.`);
      }
      if (sitesNeed.stone > 0 && !(tot.stone > 0)) say('stone', `Acabou a pedra e há obras esperando. ${have.quarry ? 'Construa mais uma' : 'Construa uma'} ${name('quarry')} perto de rochas cinzentas.`);
      if (sitesNeed.wood > 0 && !(tot.wood > 0)) say('wood', (tot.trunk > 0 && !have.sawmill) ? `Há troncos, mas falta madeira: ${path('sawmill')}.` : `Acabou a madeira. Mais ${name('woodcutter')} e uma ${name('sawmill')} ajudam.`);
      if (starving >= 3 && starving >= cit * 0.2) {
        if (!have.inn) say('food', `${starving} cidadãos com fome trabalham pela metade. ${path('inn').replace(/^./, (c) => c.toUpperCase())}.`);
        else say('food', `${starving} cidadãos com fome e sem comida na Taverna. Produza pão (Fazenda → Moinho → Padaria), peixe, vinho ou salsichas.`);
      }
    },

    // ---------- menus ----------
    initMenu() {
      try { KM.musicOn = localStorage.getItem('rm_music') !== '0'; } catch (e) { /* ok */ }
      $('#menu-version').textContent = 'v' + KM.VERSION;
      $('#menu').addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.new) {
          const seedv = $('#seed').value.trim();
          const mapName = $('#smap').value;
          const map = mapName ? KM.editor.loadMapData(mapName) : null;
          if (mapName && !map) return;
          const mt = $('#mtype').value, TYPES = ['continente', 'rio', 'lagos', 'cordilheiras', 'floresta', 'planalto'];
          try {
            KM.startGame({ diff: $('#diff').value, aiMode: $('#aimode').value, opponents: +$('#opps').value, ally: $('#ally').checked, allUnlocked: $('#allun').checked, map, biome: $('#biome').value, mapType: mt === 'surpresa' ? TYPES[Math.floor(Math.random() * TYPES.length)] : mt, seed: seedv ? (parseInt(seedv, 10) || seedv.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) : 0 });
          } catch (e) { this.toast('Não foi possível iniciar a escaramuça: ' + e.message, 'danger'); }
        }
        if (b.dataset.cont) KM.load(+b.dataset.cont);
        if (b.dataset.help) this.showHelp(true);
        if (b.dataset.screen) {
          // sair da tela do multijogador fecha a sala/conexão que ainda não virou partida
          if (b.dataset.screen !== 'mp' && KM.net && !KM.net.active && KM.net.role) { KM.net.close(); $('#mpbox').innerHTML = ''; }
          this.menuScreen(b.dataset.screen);
        }
        if (b.dataset.mission) KM.startGame({ mission: b.dataset.mission, diff: $('#cdiff').value });
        if (b.dataset.conquest) KM.startGame({ mission: b.dataset.conquest, diff: $('#qdiff').value });
        if (b.dataset.editor) KM.editor.open(b.dataset.editor);
        if (b.dataset.net) KM.net.menu(b.dataset.net, b);
      });
      $('#help').addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target.id === 'help') this.showHelp(false); });
      $('#brief').addEventListener('click', (e) => {
        if (e.target.closest('[data-go]')) { $('#brief').classList.add('hidden'); if (KM.S && !KM.S.mp) KM.S.paused = false; KM.music && KM.music.start(); }
      });
      $('#endscreen').addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.cont) {
          $('#endscreen').classList.add('hidden'); KM.S.over = 'ignored';
          if (KM.analytics) KM.analytics.start(KM.S, 'continue');
        }
        if (b.dataset.menu) KM.quitToMenu();
        if (b.dataset.next) KM.startGame({ mission: b.dataset.next, diff: KM.S.diff });
        if (b.dataset.retry) KM.startGame({ mission: KM.S.mission, diff: KM.S.diff });
      });
      this.refreshMenu();
    },
    menuScreen(s) {
      $('#menu').dataset.screen = s;
      document.querySelectorAll('#menu .screen').forEach((el) => el.classList.toggle('hidden', el.dataset.s !== s));
      if (s === 'campaign') this.renderCampaign();
      if (s === 'conquest') this.renderConquest();
      if (s === 'skirmish' || s === 'editor') KM.editor.fillMapLists();
      if (s === 'skirmish') this.renderBiomes();
      $('#menu .hero').scrollTop = 0;
      if ($('#menu').contains(document.activeElement)) {
        const heading = $('#menu .screen:not(.hidden) h3') || $('#menu h1');
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    },
    renderBiomes() {
      const el = $('#biome'), current = el.value, open = KM.conquestProgress().open;
      el.innerHTML = Object.entries(KM.BIOMES).map(([id, b]) => `<option value="${id}" ${open < b.unlock ? 'disabled' : ''}>${b.n}${open < b.unlock ? ' · descoberta na fase ' + b.unlock : ''}</option>`).join('');
      el.value = KM.BIOMES[current] && open >= KM.BIOMES[current].unlock ? current : 'pradaria';
      const hint = () => { $('#biomehint').textContent = KM.BIOMES[el.value].desc; };
      if (!this.biomeBound) { el.addEventListener('change', hint); this.biomeBound = true; }
      hint();
    },
    renderConquest() {
      const P = KM.conquestProgress(), diff = $('#qdiff').value;
      if (!this.qBound) { this.qBound = true; $('#qdiff').addEventListener('change', () => this.renderConquest()); }
      $('#conquests').innerHTML = KM.conquestList(diff).map((m, i) => {
        const open = i + 1 <= P.open, cr = P.crowns[m.id] || 0;
        const foes = m.players.slice(1).map((p, k) => `<i class="shield" style="background:${KM.COLORS[k + 1]}" title="${esc(p.name)}"></i>`).join('');
        return `<button class="mission conq ${open ? '' : 'locked'}" ${open ? `data-conquest="${m.id}"` : 'disabled'}><span>${cr ? '<i class=ui-icon data-icon=trophy aria-hidden=true></i>' : open ? '<i class=ui-icon data-icon=sword aria-hidden=true></i>' : '<i class=ui-icon data-icon=lock aria-hidden=true></i>'}</span><div><b>${esc(m.n)}</b><small>${open ? `${foes} ${m.players.length - 1} reino${m.players.length > 2 ? 's' : ''} rival${m.players.length > 2 ? 'is' : ''} · ${KM.BIOMES[m.biome].n} · ${m.W}×${m.W}` : 'Vença a fase anterior · ' + KM.BIOMES[m.biome].n}</small></div><em class="cr">${[1, 2, 3, 4].map((k) => `<span class="${k <= cr ? 'on' : ''}"><i class=ui-icon data-icon=crown aria-hidden=true></i></span>`).join('')}</em></button>`;
      }).join('');
    },
    renderCampaign() {
      const prog = KM.campaignProgress();
      $('#missions').innerHTML = KM.MISSIONS.map((m, i) => {
        const open = i + 1 <= prog, done = i + 1 < prog;
        const fake = { houses: {}, units: {}, time: 0, players: [] };
        return `<button class="mission ${open ? '' : 'locked'}" ${open ? `data-mission="${m.id}"` : 'disabled'}><span>${done ? '<i class=ui-icon data-icon=check aria-hidden=true></i>' : open ? '<i class=ui-icon data-icon=sword aria-hidden=true></i>' : '<i class=ui-icon data-icon=lock aria-hidden=true></i>'}</span><div><b>${m.n}</b><small>${open ? m.goals.map((g) => KM.goalStatus(fake, g).text).join(' · ') : 'Complete a missão anterior'}</small></div></button>`;
      }).join('');
    },
    refreshMenu() {
      const slots = [0, 1, 2, 3].map((s) => ({ s, m: KM.saveMeta(s) })).filter((x) => x.m && x.m.v3).sort((a, b) => b.m.date - a.m.date).slice(0, 2);
      $('#continue').innerHTML = slots.length ? '<p class="menu-section">Partidas salvas</p>' + slots.map(({ s, m }, i) => `<button class="mbtn resume-game ${i === 0 ? 'latest' : ''}" data-cont="${s}"><i class=ui-icon data-icon=folder aria-hidden=true></i><span><b>${i === 0 ? 'Continuar partida' : s === 0 ? 'Autosave' : 'Espaço ' + s}</b><small>${esc(m.name || 'Partida salva')} · ${KM.fmtTime(m.time)} · ${s === 0 ? 'Autosave' : 'Espaço ' + s}</small></span></button>`).join('') : '';
      this.menuScreen('main');
    },
    showHelp(on) { $('#help').classList.toggle('hidden', !on); },
    // árvore de progresso: colunas por "era", do básico ao militar
    showTree(on) {
      let el = $('#tree');
      if (!el) {
        el = document.createElement('div'); el.id = 'tree'; el.className = 'hidden';
        document.body.appendChild(el);
        el.addEventListener('click', (e) => { if (e.target.id === 'tree' || e.target.closest('[data-close]')) this.showTree(false); });
      }
      if (!on || !KM.S) { el.classList.add('hidden'); return; }
      const S = KM.S, P = S.players[ME()], built = P.built || {};
      const depth = {};
      const dep = (t) => { if (depth[t] != null) return depth[t]; const r = KM.TECH[t]; return (depth[t] = r ? 1 + Math.max(...r.map(dep)) : 0); };
      Object.keys(KM.HOUSES).forEach(dep);
      const cols = [];
      for (const t in depth) (cols[depth[t]] = cols[depth[t]] || []).push(t);
      const ERAS = ['Fundação', 'Serraria', 'Comida e oficinas', 'Criação e minas', 'Metal e quartel', 'Forja', 'Elite'];
      const card = (t) => {
        const d = KM.HOUSES[t], open = KM.houseUnlocked(S, ME(), t), done = built[t];
        const st = done ? 'done' : open ? 'open' : 'lock';
        return `<div class="tcard ${st}" data-tip="${esc(this.houseTip(t))}"><span class="ti">${hic(t)}</span><div><b>${d.n}</b><small>${done ? '<i class=ui-icon data-icon=check aria-hidden=true></i> construída' : open ? '<i class=ui-icon data-icon=unlock aria-hidden=true></i> disponível' : '<i class=ui-icon data-icon=lock aria-hidden=true></i> ' + esc(KM.reqNames(KM.TECH[t]))}</small></div></div>`;
      };
      const sol = KM.SOLDIER_ORDER.map((t) => {
        const sd = KM.SOLDIERS[t], open = KM.soldierUnlocked(S, ME(), t);
        return `<div class="tcard ${open ? 'open' : 'lock'}"><span class="ti">${uic(t)}</span><div><b>${sd.n}</b><small>${open ? '<i class=ui-icon data-icon=unlock aria-hidden=true></i> disponível no Quartel' : '<i class=ui-icon data-icon=lock aria-hidden=true></i> ' + esc(KM.reqNames(KM.SOLDIER_REQ[t]))}</small></div></div>`;
      }).join('');
      el.innerHTML = `<div class="card treecard"><button class="close" data-close="1">✕</button>
        <h2>Árvore de progresso</h2>
        <p class="muted">Cada construção erguida libera novas opções. Siga da esquerda para a direita.</p>
        <div class="tcols">${cols.map((c, i) => `<div class="tcol"><div class="tera">${ERAS[i] || 'Era ' + (i + 1)}</div>${c.map(card).join('')}</div>`).join('')}</div>
        <h3>Soldados</h3><div class="tsol">${sol}</div></div>`;
      el.classList.remove('hidden');
      el.addEventListener('mousemove', (e) => this.onTip(e));
      el.addEventListener('mouseleave', () => this.hideTip());
    },
    // objetivo principal + desafios opcionais (coroas)
    goalsHtml(S, brief) {
      const row = (g) => {
        const st = KM.goalStatus(S, g);
        const ic = brief ? (g.opt ? '<i class=ui-icon data-icon=crown aria-hidden=true></i>' : '<i class=ui-icon data-icon=target aria-hidden=true></i>') : st.done ? '<i class=ui-icon data-icon=check aria-hidden=true></i>' : st.fail ? '<i class=ui-icon data-icon=cross aria-hidden=true></i>' : '<i class=ui-icon data-icon=empty aria-hidden=true></i>';
        return `<div class="goal ${st.done && !brief ? 'done' : ''} ${st.fail ? 'fail' : ''}"><span>${ic}</span><div>${st.text}${brief ? '' : `<small>${st.prog || ''}</small>`}</div></div>`;
      };
      const req = S.goals.filter((g) => !g.opt), opt = S.goals.filter((g) => g.opt);
      let s = `${brief ? '<h3>Objetivo</h3>' : ''}<div class="goals">${req.map(row).join('')}</div>`;
      if (opt.length) s += `${brief ? '<h3>Desafios opcionais</h3>' : '<h4>Desafios opcionais <i class=ui-icon data-icon=crown aria-hidden=true></i></h4>'}<div class="goals opt">${opt.map(row).join('')}</div>${brief ? '<div class="muted">Cada desafio cumprido vale uma coroa. Não são necessários para vencer.</div>' : ''}`;
      return s;
    },
    showBriefing(S) {
      const mis = KM.findMission(S.mission, S.diff);
      if (!mis) return;
      $('#brief').innerHTML = `<div class="card brief"><div class="seal"><i class=ui-icon data-icon=scroll aria-hidden=true></i></div><h2>${esc(mis.n)}</h2><div class="btext">${mis.brief}</div>
        ${this.goalsHtml(S, true)}
        ${S.players.length > 1 ? `<h3>Jogadores</h3><div class="plist">${S.players.map((p, i) => `<div class="prow"><span class="dot" style="background:${p.color}"></span><span class="sn">${esc(p.name)}</span><em class="${i === ME() ? '' : KM.hostile(S, ME(), i) ? 'bad' : 'good'}">${i === ME() ? 'você' : KM.hostile(S, ME(), i) ? 'inimigo' : 'aliado'}</em></div>`).join('')}</div>` : ''}
        <button class="mbtn primary" data-go="1">${S.time > 0 ? 'Voltar ao jogo' : 'Começar'}</button></div>`;
      $('#brief').classList.remove('hidden');
    },
    showStats() {
      let el = $('#statsm');
      if (!el) {
        el = document.createElement('div'); el.id = 'statsm';
        document.body.appendChild(el);
        el.addEventListener('click', (e) => { if (e.target.id === 'statsm' || e.target.closest('[data-close]')) el.classList.add('hidden'); });
      }
      const S = KM.S;
      KM.recordHist(S);
      el.innerHTML = `<div class="card endcard"><button class="close" data-close="1">✕</button><h2>Estatísticas</h2>${this.statsHtml(S)}</div>`;
      el.classList.remove('hidden');
      this.bindStats(el, S);
      // a amostra extra não entra no histórico definitivo
      S.hist.t.pop(); S.hist.d.forEach((r) => r.pop());
    },
    showEnd(res) {
      if (KM.analytics) KM.analytics.finish(res);
      const S = KM.S, el = $('#endscreen');
      if (!S.hist || !S.hist.t.length || S.hist.t[S.hist.t.length - 1] < S.time - 5) KM.recordHist(S);
      const nextId = res === 'win' ? KM.nextMission(S.mission) : null, next = nextId && KM.findMission(nextId, S.diff);
      const conq = S.mission && S.mission[0] === 'c';
      const txt = res === 'win' ? (conq ? (next ? 'Objetivo cumprido. Novas terras aguardam a sua coroa.' : 'Sua conquista está completa. Todo o continente se curva à sua coroa!') : S.mission === 't1' ? 'Você aprendeu a construir, abastecer e comandar seu reino. A Conquista espera por você!' : S.mission ? (next ? 'Missão cumprida! O Rei aguarda suas próximas ordens.' : 'Todos os traidores caíram. O Reino de Aldor está reunido sob sua bandeira!') : 'Todos os inimigos foram derrotados. Seu reino prospera!') : S.defeatReason || 'Seu reino caiu. Os mercadores fugiram e os cavaleiros depuseram as armas.';
      el.innerHTML = `<div class="card endcard"><h1>${res === 'win' ? '<i class=ui-icon data-icon=trophy aria-hidden=true></i> Vitória!' : '<i class=ui-icon data-icon=skull aria-hidden=true></i> Derrota'}</h1><p>${txt}</p>
        ${conq && res === 'win' ? `<div class="crowns">${[1, 2, 3, 4].map((k) => `<span class="${k <= (S.crowns || 1) ? 'on' : ''}"><i class=ui-icon data-icon=crown aria-hidden=true></i></span>`).join('')}</div><div class="muted">1 coroa pela vitória + 1 por desafio cumprido</div>` : ''}
        ${res === 'win' && S.unlockedBiomes && S.unlockedBiomes.length ? `<p><i class=ui-icon data-icon=leaf aria-hidden=true></i> Novo bioma disponível na Escaramuça: <b>${S.unlockedBiomes.map((id) => KM.BIOMES[id].n).join(', ')}</b></p>` : ''}
        ${this.statsHtml(S)}
        <div class="mgrid">${next ? `<button class="mbtn primary" data-next="${next.id}"><i class=ui-icon data-icon=next aria-hidden=true></i> ${conq ? 'Próxima fase' : 'Próxima missão'}</button>` : ''}${res === 'win' ? '<button class="mbtn" data-cont="1">Continuar jogando</button>' : ''}${res === 'lose' && S.mission ? '<button class="mbtn" data-retry="1"><i class=ui-icon data-icon=reset aria-hidden=true></i> Tentar de novo</button>' : ''}<button class="mbtn" data-menu="1">Menu principal</button></div></div>`;
      el.classList.remove('hidden');
      this.bindStats(el, S);
      KM.sfx && KM.sfx(res === 'win' ? 'win' : 'horn');
      if (res === 'win' && KM.music.victory) KM.music.victory();
    },
    // estatísticas da partida (tela final e aba Objetivos): tabela por jogador + gráfico ao longo do tempo
    statsHtml(S) {
      const rows = S.players.map((p, o) => {
        const st = S.stats[o] || {};
        return `<tr><td><span class="dot" style="background:${p.color}"></span>${esc(p.name)}${o === ME() ? ' <small>(você)</small>' : ''}</td><td>${st.built || 0}</td><td>${st.trained || 0}</td><td>${st.killed || 0}</td><td>${st.lost || 0}</td><td>${st.razed || 0}</td></tr>`;
      }).join('');
      return `<div class="stats"><div class="muted">Duração: <b>${KM.fmtTime(S.time)}</b></div>
        <table class="stable"><tr><th>Jogador</th><th title="Casas construídas"><i class=ui-icon data-icon=home aria-hidden=true></i></th><th title="Cidadãos treinados"><i class=ui-icon data-icon=book aria-hidden=true></i></th><th title="Inimigos abatidos"><i class=ui-icon data-icon=sword aria-hidden=true></i></th><th title="Perdas"><i class=ui-icon data-icon=skull aria-hidden=true></i></th><th title="Casas inimigas destruídas"><i class=ui-icon data-icon=fire aria-hidden=true></i></th></tr>${rows}</table>
        <div class="chartbar">${[['0', '<i class=ui-icon data-icon=people aria-hidden=true></i> Cidadãos'], ['1', '<i class=ui-icon data-icon=sword aria-hidden=true></i> Soldados'], ['2', '<i class=ui-icon data-icon=home aria-hidden=true></i> Casas'], ['3', '<i class=ui-icon data-icon=crate aria-hidden=true></i> Recursos']].map(([k, n]) => `<button class="${k === '1' ? 'active' : ''}" data-chart="${k}">${n}</button>`).join('')}</div>
        <canvas class="chart" width="560" height="190"></canvas></div>`;
    },
    bindStats(el, S) {
      const cv = el.querySelector('canvas.chart');
      if (!cv) return;
      const draw = (k) => this.drawChart(cv, S, +k);
      el.querySelectorAll('[data-chart]').forEach((b) => b.addEventListener('click', () => {
        el.querySelectorAll('[data-chart]').forEach((x) => x.classList.toggle('active', x === b));
        draw(b.dataset.chart);
      }));
      draw(1);
    },
    drawChart(cv, S, k) {
      const g = cv.getContext('2d'), W = cv.width, H = cv.height, P = { l: 36, r: 10, t: 10, b: 22 };
      g.clearRect(0, 0, W, H);
      const hs = S.hist || { t: [], d: [] };
      const T = hs.t;
      g.font = '11px "Alegreya Sans", sans-serif'; g.fillStyle = '#b3a283';
      if (T.length < 2) { g.textAlign = 'center'; g.fillText('Partida curta demais para o gráfico.', W / 2, H / 2); return; }
      let max = 1;
      hs.d.forEach((rows) => rows.forEach((r) => { max = Math.max(max, r[k]); }));
      max = Math.ceil(max * 1.1);
      const X = (i) => P.l + (T[i] / T[T.length - 1]) * (W - P.l - P.r), Y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
      g.strokeStyle = 'rgba(227,185,92,0.15)'; g.lineWidth = 1;
      for (let q = 0; q <= 4; q++) { const y = Y((max * q) / 4); g.beginPath(); g.moveTo(P.l, y); g.lineTo(W - P.r, y); g.stroke(); g.textAlign = 'right'; g.fillText(Math.round((max * q) / 4), P.l - 5, y + 4); }
      g.textAlign = 'center';
      for (let q = 0; q <= 4; q++) { const tt = (T[T.length - 1] * q) / 4; g.fillText(KM.fmtTime(tt), P.l + (q / 4) * (W - P.l - P.r), H - 6); }
      hs.d.forEach((rows, o) => {
        if (!rows.length) return;
        g.strokeStyle = S.players[o].color; g.lineWidth = o === ME() ? 3 : 2;
        g.beginPath();
        rows.forEach((r, i) => (i ? g.lineTo(X(i), Y(r[k])) : g.moveTo(X(i), Y(r[k]))));
        g.stroke();
      });
    },
  };
})(window.KM);
