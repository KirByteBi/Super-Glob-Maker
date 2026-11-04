/* Controlador: MULTIJUGADOR ONLINE (planning 5d). 2-4 jugadores en una sala con SEED estilo GlD.
   Modos:
   - 1 NIVEL: todos juegan el mismo nivel.
   - MULTIMUNDO: hasta 5 niveles seguidos como un "mundo" (hasta 10 si hay niveles).
   - TORNEO: como Multimundo pero compites: gana la ronda quien llega PRIMERO y además se suman
     puntos (enemigos, objetos, Monedas Estrella...). Quien más puntos tenga al final GANA y
     recibe una CORONA en su perfil. En Torneo la norma "sin efectos especiales" es obligatoria.
   Cada jugador juega su propia copia del nivel y ve a los demás Globs moverse en directo
   (se envía su posición ~8 veces por segundo y se interpola). El anfitrión manda: elige modo y
   niveles, arranca cada ronda, recoge las llegadas y reparte los puntos. */
(function (S) {
  'use strict';
  const Room = () => S.Model.Room;
  const SEND_EVERY = 0.125;           // posición: 8 veces por segundo
  const WAIT_AFTER_FIRST = 45;        // s que se espera a los demás tras la 1ª llegada
  const PLACE_PTS = [3000, 2000, 1000, 500];
  const MODES = { one: { max: 1 }, multi: { max: 10 }, tour: { max: 10 } };

  class MultiController {
    constructor(app, room) {
      this.app = app; this.room = room;
      this.mode = 'one'; this.levels = [];          // [{ name, theme, mode, data }] (data solo en el anfitrión)
      this.phase = 'lobby'; this.round = -1; this.total = 0;
      this.totals = {}; this.finishes = {}; this.results = null; this.final = null;
      this.remote = {}; this.sendT = 0; this.firstFinishAt = 0; this.roundStart = 0; this.myFinish = null;
      this.bind();
    }
    get isHost() { return this.room.isHost; }
    me() { return this.room.me; }
    name(id) { const p = this.room.players.find((x) => x.id === id); return p ? p.username : '?'; }

    bind() {
      const r = this.room, toast = (m, ms) => this.app.menu.toast(m, ms);
      r.on('roster', () => { this.checkRoundEnd(); this.refresh(); });
      r.on('joined', (p) => { toast('👋 ' + p.username + ' ha entrado en la sala'); if (this.isHost) this.sendSettings(p.id); });
      r.on('left', (p) => { if (p && p.username) toast('🚪 ' + p.username + ' ha salido'); delete this.remote[p.id]; this.checkRoundEnd(); });
      r.on('globChanged', (d) => toast('Otro jugador ya llevaba ese Glob: ahora eres ' + S.Model.Characters.get(d.glob).name, 3200));
      r.on('full', () => this.app.mpClosed('full'));
      r.on('closed', (d) => this.app.mpClosed(d.reason));
      r.on('msg:settings', (d) => { this.mode = d.mode; this.levels = d.levels || []; if (d.phase && this.phase === 'lobby' && d.phase !== 'lobby') this.phase = 'busy'; this.refresh(); });
      r.on('msg:start', (d) => this.startRound(d));
      r.on('msg:pos', (d) => this.onPos(d));
      r.on('msg:finish', (d) => this.onFinish(d.from, d));
      r.on('msg:roundEnd', (d) => this.showRoundEnd(d));
      r.on('msg:end', (d) => this.showFinal(d));
      r.on('msg:lobby', () => this.backToLobby());
    }

    // ---------------------------------------------------------------- sala (lobby)
    settingsMsg() { return { mode: this.mode, phase: this.phase === 'busy' ? 'lobby' : this.phase, levels: this.levels.map((l) => ({ name: l.name, theme: l.theme, mode: l.mode })) }; }
    sendSettings(to) { if (this.isHost) this.room.send('settings', this.settingsMsg(), to); }
    refresh() { if (this.phase === 'lobby' || this.phase === 'busy') this.app.showRoomLobby(); else if (this.phase === 'waiting') this.showWaiting(); }

    setMode(m) { if (!this.isHost || !MODES[m]) return; this.mode = m; this.levels = this.levels.slice(0, MODES[m].max); this.sendSettings(); this.refresh(); }
    addLevel(data, name) {
      if (!this.isHost) return;
      if (this.levels.length >= MODES[this.mode].max) { this.app.menu.toast(this.mode === 'one' ? 'En 1 Nivel solo se juega un nivel (cambia a Multimundo o Torneo para más)' : 'Máximo 10 niveles', 3000); return; }
      const content = S.Model.Level.content(data);
      this.levels.push({ name: name || data.name || 'Nivel', theme: content.theme, mode: content.mode, data: content });
      this.sendSettings(); this.refresh();
    }
    removeLevel(i) { if (!this.isHost) return; this.levels.splice(i, 1); this.sendSettings(); this.refresh(); }
    moveLevel(i, d) { const j = i + d; if (!this.isHost || j < 0 || j >= this.levels.length) return; const t = this.levels[i]; this.levels[i] = this.levels[j]; this.levels[j] = t; this.sendSettings(); this.refresh(); }

    canStart() {
      if (!this.isHost) return 'Solo el anfitrión empieza la partida';
      if (this.room.players.length < Room().MIN) return 'Hacen falta al menos 2 jugadores';
      if (!this.levels.length) return 'Añade al menos un nivel';
      return null;
    }
    startMatch() {
      const why = this.canStart(); if (why) { this.app.menu.toast(why, 2600); return; }
      this.totals = {}; this.final = null; this.total = this.levels.length;
      this.room.players.forEach((p) => { this.totals[p.id] = 0; });
      this.nextRound(0);
    }
    // El anfitrión empaqueta el nivel (código completo) y lo manda a todos
    async nextRound(i) {
      const L = this.levels[i]; if (!L) return;
      const data = Object.assign({}, L.data, { name: L.name });
      if (this.mode === 'tour') data.noPowers = 1; // Torneo: sin efectos especiales, obligatorio
      const packed = await S.Model.LevelCode.pack(data);
      if (packed.length > 240000) { this.app.menu.toast('Ese nivel es demasiado grande para mandarlo por la sala', 3200); return; }
      const msg = { round: i, total: this.total, mode: this.mode, name: L.name, packed, players: this.room.players.map((p) => p.id) };
      await this.room.send('start', msg);
      this.startRound(msg);
    }

    // ---------------------------------------------------------------- ronda
    async startRound(d) {
      let data;
      try { data = await S.Model.LevelCode.unpack(d.packed); } catch (e) { this.app.menu.toast('No se pudo abrir el nivel de la sala'); return; }
      this.phase = 'play'; this.round = d.round; this.total = d.total; this.mode = d.mode;
      this.roundPlayers = d.players || this.room.players.map((p) => p.id);
      this.finishes = {}; this.firstFinishAt = 0; this.myFinish = null; this.results = null; this.remote = {};
      this.roundStart = performance.now();
      const label = (this.total > 1 ? 'Ronda ' + (d.round + 1) + '/' + this.total + ' · ' : '') + d.name;
      this.app.playLevel(data, { character: this.me().glob, lives: 99, mp: this, mpLabel: label });
      this.app.menu.toast('👥 ' + label + (this.mode === 'tour' ? ' · ¡Torneo: sin efectos especiales!' : ''), 2600);
    }
    // Llamado por GameController cada fotograma
    tick(g, dt) {
      this.sendT -= dt;
      if (this.sendT <= 0 && this.phase === 'play') {
        this.sendT = SEND_EVERY;
        const p = g.player;
        this.room.send('pos', { r: this.round, x: Math.round(p.x), y: Math.round(p.y), f: p.face, e: p.evo, s: p.special || null, d: p.dead ? 1 : 0, z: g.zone || 0, vx: Math.round(p.vx), vy: Math.round(p.vy), o: p.onGround ? 1 : 0, w: p.swimming ? 1 : 0, st: p.star > 0 ? 1 : 0 });
      }
      // interpolación de los demás hacia su última posición conocida
      const k = Math.min(1, dt * 12);
      Object.values(this.remote).forEach((r) => {
        if (r.tx == null) return;
        if (r.x == null || Math.abs(r.tx - r.x) > 300 || Math.abs(r.ty - r.y) > 300) { r.x = r.tx; r.y = r.ty; }
        r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.anim = (r.anim || 0) + dt;
      });
      g.ghosts = Object.values(this.remote).filter((r) => r.x != null && (r.z || 0) === (g.zone || 0));
      g.mpHud = this.hudLines();
      if (this.isHost) this.checkRoundEnd();
    }
    onPos(d) {
      if (d.r !== this.round) return;
      const p = this.room.players.find((x) => x.id === d.from); if (!p) return;
      const r = this.remote[d.from] || (this.remote[d.from] = { id: d.from });
      Object.assign(r, { name: p.username, glob: p.glob, tx: d.x, ty: d.y, face: d.f, evo: d.e, special: d.s, dead: !!d.d, z: d.z, vx: d.vx, vy: d.vy, onGround: !!d.o, swimming: !!d.w, star: !!d.st, done: !!this.finishes[d.from] });
    }
    hudLines() {
      const rows = this.room.players.filter((p) => !this.roundPlayers || this.roundPlayers.includes(p.id)).map((p) => {
        const f = this.finishes[p.id];
        return { name: p.username, me: p.me, glob: p.glob, done: !!f, time: f && f.time, dnf: f && f.dnf };
      });
      rows.sort((a, b) => (a.done !== b.done ? (a.done ? -1 : 1) : (a.time || 0) - (b.time || 0)));
      return rows;
    }

    // El jugador local ha terminado (o se ha rendido)
    onLocalFinished(kind, g) {
      if (this.phase !== 'play' || this.myFinish) return;
      const time = (performance.now() - this.roundStart) / 1000;
      this.myFinish = { time: kind === 'clear' ? time : null, dnf: kind !== 'clear', score: g.score, stars: g.stars || 0, coins: g.coins || 0, secret: !!g.secretClear };
      this.room.send('finish', Object.assign({ round: this.round }, this.myFinish));
      this.onFinish(this.room.id, Object.assign({ round: this.round }, this.myFinish));
      this.phase = 'waiting'; this.showWaiting();
    }
    onFinish(id, d) {
      if (d.round !== this.round || this.finishes[id]) return;
      this.finishes[id] = { time: d.time, dnf: !!d.dnf, score: d.score | 0, stars: d.stars | 0, coins: d.coins | 0, secret: !!d.secret };
      if (!d.dnf && !this.firstFinishAt) this.firstFinishAt = performance.now();
      if (id !== this.room.id && !d.dnf) this.app.menu.toast('🏁 ' + this.name(id) + ' ha llegado a la meta (' + d.time.toFixed(1) + ' s)', 2000);
      if (this.phase === 'waiting') this.showWaiting();
      if (this.isHost) this.checkRoundEnd();
    }
    // Anfitrión: ¿han llegado todos (o se acabó la espera)? -> reparte puntos
    checkRoundEnd() {
      if (!this.isHost || (this.phase !== 'play' && this.phase !== 'waiting') || this.results) return;
      const live = this.room.players.map((p) => p.id).filter((id) => !this.roundPlayers || this.roundPlayers.includes(id));
      if (!live.length) return;
      const all = live.every((id) => this.finishes[id]);
      const late = this.firstFinishAt && (performance.now() - this.firstFinishAt) / 1000 > WAIT_AFTER_FIRST;
      if (!all && !late) return;
      const rows = live.map((id) => {
        const f = this.finishes[id] || { dnf: true, score: 0, stars: 0 };
        const p = this.room.players.find((x) => x.id === id);
        return { id, name: p ? p.username : '?', glob: p ? p.glob : 'green', time: f.time, dnf: !!f.dnf || f.time == null, score: f.score || 0, stars: f.stars || 0 };
      });
      rows.sort((a, b) => (a.dnf !== b.dnf ? (a.dnf ? 1 : -1) : (a.time - b.time)));
      rows.forEach((r, i) => {
        r.place = r.dnf ? null : i + 1;
        // Puntos (cuentan en Torneo; en los otros modos son orientativos): puesto + puntos del nivel + Monedas Estrella
        r.points = (r.dnf ? 0 : PLACE_PTS[i] || 0) + r.score + r.stars * 500;
        this.totals[r.id] = (this.totals[r.id] || 0) + r.points;
      });
      this.results = { round: this.round, total: this.total, mode: this.mode, rows, totals: Object.assign({}, this.totals), last: this.round >= this.total - 1 };
      this.room.send('roundEnd', this.results);
      this.showRoundEnd(this.results);
    }
    showRoundEnd(d) {
      this.results = d; this.totals = Object.assign({}, d.totals); this.phase = 'results';
      this.app.mpRoundResults(d, {
        next: this.isHost ? () => (d.last ? this.finishMatch() : this.nextRound(d.round + 1)) : null,
        leave: () => this.app.mpLeave()
      });
    }
    showWaiting() { this.app.mpWaiting(this.hudLines(), this.myFinish, { leave: () => this.app.mpLeave() }); }

    // ---------------------------------------------------------------- final
    finishMatch() {
      const rows = this.room.players.map((p) => ({ id: p.id, name: p.username, glob: p.glob, points: this.totals[p.id] || 0 })).sort((a, b) => b.points - a.points);
      const d = { mode: this.mode, rows, winner: rows[0] && rows[0].id };
      this.room.send('end', d); this.showFinal(d);
    }
    showFinal(d) {
      this.final = d; this.phase = 'final';
      // Torneo: el ganador se lleva una CORONA a su perfil (la pide su propio cliente)
      if (d.mode === 'tour' && d.winner === this.room.id) S.Model.Gld.awardCrown && S.Model.Gld.awardCrown(this.room.seed).then((r) => { if (r && r.ok) this.app.menu.toast('👑 ¡Corona de Torneo añadida a tu perfil!', 3200); }).catch(() => {});
      this.app.mpFinal(d, { lobby: this.isHost ? () => { this.room.send('lobby', {}); this.backToLobby(); } : null, leave: () => this.app.mpLeave() });
    }
    backToLobby() { this.phase = 'lobby'; this.round = -1; this.results = null; this.app.showRoomLobby(); if (this.isHost) this.sendSettings(); }

    leave() { this.phase = 'gone'; Room().Invites.stop(); this.room.leave(); }
  }
  MultiController.MODES = MODES;
  S.Controller.MultiController = MultiController;
})(window.SGM);
