/* Modelo: SALA del multijugador (planning 5d), con Supabase Realtime como Glob Defenders.
   - Se entra por SEED, con el MISMO formato que GlD: letra G/K/P/W/B/N/A + 6 caracteres
     (p. ej. "G123456"). Los niveles usan otro formato (códigos tipo SMM), así no se lían.
   - Canal "sgm-room-<SEED>": presencia (quién está, qué Glob lleva) + mensajes (broadcast).
   - Entre 2 y 4 jugadores. Si entra un 5º, se le echa (como en GlD).
   - Anfitrión = el que lleva más tiempo dentro. Si el anfitrión se va, la sala se cierra.
   - Nunca puede haber 2 Globs iguales: si dos eligen el mismo, se lo queda el que entró antes
     y al otro se le asigna uno libre.
   No necesita SQL: Realtime no guarda nada en la base de datos. */
(function (S) {
  'use strict';
  const MAX = 4, MIN = 2;
  const FIRST = ['G', 'K', 'P', 'W', 'B', 'N', 'A'];
  const SEED_RE = /^[A-Z][A-Z0-9]{6}$/; // igual que loadSeed() de GlD
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : S.util.uid() + S.util.uid());

  // Igual que generateSeed() de Glob Defenders (con sus easter eggs)
  function newSeed() {
    const start = FIRST[Math.floor(Math.random() * FIRST.length)];
    let n = '';
    if (Math.random() < 0.05) n = ['637', '6307', '7001'][Math.floor(Math.random() * 3)];
    while (n.length < 6) { const r = Math.floor(Math.random() * 36).toString(36).toUpperCase(); if (r !== 'O' && r !== 'I') n += r; }
    return start + n;
  }
  const cleanSeed = (s) => String(s || '').toUpperCase().replace(/^\s*SEED\s*:?\s*/, '').replace(/\s/g, '');
  const isSeed = (s) => SEED_RE.test(cleanSeed(s));

  class Room {
    constructor(seed, username, glob) {
      this.seed = cleanSeed(seed);
      this.id = uid();
      this.me = { id: this.id, username: username || 'Jugador', glob: glob || 'green', joinedAt: Date.now(), isHost: false };
      this.players = []; this.hostId = null; this.isHost = false;
      this.handlers = {}; this.channel = null; this.connected = false; this.closed = false;
      this.prevIds = new Set();
    }
    on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return this; }
    emit(ev, d) { (this.handlers[ev] || []).forEach((f) => { try { f(d); } catch (e) { console.error(e); } }); }

    async connect() {
      const c = await S.Model.Gld.client();
      if (!c) throw new Error('offline');
      this.channel = c.channel('sgm-room-' + this.seed, { config: { broadcast: { self: false, ack: false }, presence: { key: this.id } } });
      this.channel
        .on('broadcast', { event: 'm' }, (msg) => this.onMsg(msg.payload))
        .on('presence', { event: 'sync' }, () => this.sync())
        .on('presence', { event: 'leave' }, () => setTimeout(() => this.sync(), 50));
      await new Promise((res, rej) => {
        let done = false;
        const to = setTimeout(() => { if (!done) { done = true; rej(new Error('timeout')); } }, 10000);
        this.channel.subscribe((status) => {
          if (status === 'SUBSCRIBED' && !done) { done = true; clearTimeout(to); this.connected = true; res(); }
          else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
            if (!done) { done = true; clearTimeout(to); rej(new Error(status)); }
            else if (this.connected && !this.closed) { this.connected = false; this.emit('closed', { reason: 'lost' }); }
          }
        });
      });
      const r = await this.channel.track(this.me);
      if (r !== 'ok') throw new Error('presence');
      await new Promise((r2) => setTimeout(r2, 500));
      this.sync();
      if (this.closed) throw new Error(this.fullOnJoin ? 'full' : 'closed'); // p. ej. sala llena al entrar
    }

    // Lista de jugadores ordenada por llegada (el 1º es el anfitrión)
    readPlayers() {
      const st = this.channel ? this.channel.presenceState() : {};
      const all = Object.values(st).flat().filter((p) => p && typeof p.id === 'string');
      const by = new Map(); all.forEach((p) => by.set(p.id, p)); // por si hay duplicados
      return [...by.values()].sort((a, b) => (a.joinedAt - b.joinedAt) || a.id.localeCompare(b.id));
    }
    sync() {
      if (!this.connected || this.closed) return;
      const list = this.readPlayers();
      if (!list.some((p) => p.id === this.id)) return;
      // sala llena: los 4 primeros se quedan
      if (list.length > MAX && list.findIndex((p) => p.id === this.id) >= MAX) { this.fullOnJoin = true; this.emit('full', {}); this.leave(); return; }
      const players = list.slice(0, MAX);
      const prevHost = this.hostId;
      this.hostId = players[0].id; this.isHost = this.hostId === this.id;
      // el anfitrión se ha ido -> la sala se cierra (como en GlD)
      if (prevHost && prevHost !== this.id && !players.some((p) => p.id === prevHost)) { this.emit('closed', { reason: 'host' }); this.leave(); return; }
      // Globs repetidos: se lo queda el que entró antes
      const taken = new Set();
      let fix = null;
      players.forEach((p) => { if (taken.has(p.glob) && p.id === this.id) fix = true; taken.add(p.glob); });
      if (fix) {
        // el primero que no lleve NADIE más (así no le quitas el Glob a otro)
        const others = new Set(players.filter((p) => p.id !== this.id).map((p) => p.glob));
        const free = S.Model.Characters.list.find((c) => !others.has(c.id));
        if (free && free.id !== this.me.glob) { this.me.glob = free.id; this.channel.track(this.me); this.emit('globChanged', { glob: free.id }); }
      }
      const ids = new Set(players.map((p) => p.id));
      players.forEach((p) => { if (!this.prevIds.has(p.id) && p.id !== this.id && this.prevIds.size) this.emit('joined', p); });
      this.prevIds.forEach((id) => { if (!ids.has(id)) { const old = (this.players.find((p) => p.id === id) || {}); this.emit('left', old); } });
      this.prevIds = ids;
      this.players = players.map((p) => ({ id: p.id, username: p.username, glob: p.glob, isHost: p.id === this.hostId, me: p.id === this.id }));
      this.emit('roster', this.players);
    }
    // Globs que ya llevan los OTROS jugadores
    takenGlobs() { return this.players.filter((p) => !p.me).map((p) => p.glob); }
    setGlob(id) {
      if (this.takenGlobs().includes(id)) return false;
      this.me.glob = id; if (this.channel) this.channel.track(this.me);
      return true;
    }

    // Mensajes: { t: tipo, d: datos, from, to? }
    send(t, d, to) {
      if (!this.channel || this.closed) return Promise.resolve();
      return this.channel.send({ type: 'broadcast', event: 'm', payload: { t, d: d || {}, from: this.id, to: to || null } });
    }
    onMsg(m) {
      if (!m || typeof m.t !== 'string' || m.from === this.id || (m.to && m.to !== this.id)) return;
      // el anfitrión avisa de que cierra la sala (más rápido que esperar a la presencia)
      if (m.t === 'bye') { if (m.from === this.hostId && !this.closed) { this.emit('closed', { reason: 'host' }); this.leave(); } else setTimeout(() => this.sync(), 50); return; }
      // los mensajes de control solo valen si vienen del anfitrión
      if (['settings', 'start', 'roundEnd', 'end', 'lobby'].includes(m.t) && m.from !== this.hostId) return;
      this.emit('msg:' + m.t, Object.assign({ from: m.from }, m.d));
    }

    leave() {
      if (this.closed) return; this.closed = true;
      const ch = this.channel; this.channel = null; this.connected = false;
      if (!ch) return;
      // avisa (bye), deja de estar presente y luego cierra el canal
      const bye = ch.send({ type: 'broadcast', event: 'm', payload: { t: 'bye', d: {}, from: this.id, to: null } }).catch(() => {});
      Promise.resolve(bye).then(() => ch.untrack()).catch(() => {})
        .then(() => S.Model.Gld.client()).then((c) => c && c.removeChannel(ch)).catch(() => {});
    }
  }

  // ---------------------------------------------------------------- invitaciones
  // Canal común "sgm-invites": el anfitrión repite la invitación cada pocos segundos MIENTRAS la
  // sala siga en pie y él siga dentro. Quien esté en el juego la recibe al momento o en cuanto
  // entre; si la sala se cierra o el anfitrión se va, deja de llegar (caduca sola).
  const Invites = {
    ch: null, me: null, onInvite: null, sending: {}, seen: {},
    async ensure() {
      if (this.ch) return this.ch;
      const c = await S.Model.Gld.client(); if (!c) return null;
      if (this.ch) return this.ch;
      this.ch = c.channel('sgm-invites', { config: { broadcast: { self: false } } });
      this.ch.on('broadcast', { event: 'inv' }, (msg) => {
        const p = msg.payload || {};
        if (!this.me || !p.to || p.to !== this.me || !isSeed(p.seed)) return;
        const k = p.seed + ':' + p.from;
        if (this.seen[k] && Date.now() - this.seen[k] < 60000) return; // no repetir el aviso cada 4 s
        this.seen[k] = Date.now();
        if (this.onInvite) this.onInvite(p);
      });
      this.ch.subscribe();
      return this.ch;
    },
    async listen(username, onInvite) {
      this.me = String(username || '').toLowerCase(); this.onInvite = onInvite;
      if (this.me) await this.ensure();
    },
    // empieza a invitar a 'to' a la sala (se repite hasta stop)
    async invite(room, to) {
      const name = String(to || '').trim().toLowerCase(); if (!name) return;
      if (!(await this.ensure())) return;
      const key = room.seed + ':' + name;
      if (this.sending[key]) return;
      const fire = () => {
        if (room.closed || !room.isHost) { this.stop(key); return; }
        this.ch.send({ type: 'broadcast', event: 'inv', payload: { to: name, from: room.me.username, seed: room.seed, players: room.players.length } });
      };
      fire(); this.sending[key] = setInterval(fire, 4000);
    },
    stop(key) { if (key) { clearInterval(this.sending[key]); delete this.sending[key]; return; } Object.keys(this.sending).forEach((k) => this.stop(k)); }
  };

  S.Model.Room = Room;
  Object.assign(Room, { MAX, MIN, newSeed, isSeed, cleanSeed, Invites });
})(window.SGM);
