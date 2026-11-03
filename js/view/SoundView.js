/* Vista (audio): efectos y música chiptune sintetizados con WebAudio. Reacciona a eventos del modelo. */
(function (S) {
  'use strict';
  const U = S.util;
  let ac = null, master = null, sfxGain = null, musGain = null;
  let muted = false;
  try { muted = localStorage.getItem('sgm.muted') === '1'; } catch (e) { /* sin almacenamiento */ }

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
      sfxGain = ac.createGain(); sfxGain.gain.value = 0.6; sfxGain.connect(master);
      musGain = ac.createGain(); musGain.gain.value = 0.22; musGain.connect(master);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function tone(o) {
    const a = ctx(); if (!a) return;
    const t0 = (o.at || a.currentTime) + (o.delay || 0);
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.wave || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.d);
    if (o.detune) osc.detune.value = o.detune;
    const v = o.v != null ? o.v : 0.3;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    osc.connect(g); g.connect(o.out || sfxGain); osc.start(t0); osc.stop(t0 + o.d + 0.05);
  }
  function noise(d, v, f, at, out) {
    const a = ctx(); if (!a) return;
    const t0 = at || a.currentTime;
    const len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const flt = a.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = f || 2000;
    const g = a.createGain(); g.gain.setValueAtTime(v || 0.3, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(flt); flt.connect(g); g.connect(out || sfxGain); src.start(t0);
  }
  const seq = (notes, step, wave, v) => notes.forEach((n, i) => n && tone({ f: mtof(n), d: step * 1.1, delay: i * step, wave: wave || 'square', v: v || 0.2 }));

  const SFX = {
    jump: () => tone({ f: 300, f2: 700, d: 0.14, v: 0.18 }),
    doubleJump: () => { tone({ f: 500, f2: 1200, d: 0.16, v: 0.16, wave: 'triangle' }); tone({ f: 900, f2: 1800, d: 0.1, v: 0.1, delay: 0.05 }); },
    swim: () => tone({ f: 220, f2: 420, d: 0.12, v: 0.12, wave: 'sine' }),
    stomp: () => { tone({ f: 600, f2: 150, d: 0.12, v: 0.25 }); noise(0.06, 0.2, 1500); },
    kill: () => tone({ f: 800, f2: 100, d: 0.25, v: 0.2 }),
    pop: () => tone({ f: 1200, f2: 300, d: 0.1, v: 0.2, wave: 'sine' }),
    coin: () => { tone({ f: mtof(83), d: 0.07, v: 0.15 }); tone({ f: mtof(88), d: 0.25, v: 0.15, delay: 0.07 }); },
    bump: () => tone({ f: 180, f2: 120, d: 0.1, v: 0.25, wave: 'triangle' }),
    bumpSoft: () => tone({ f: 140, f2: 90, d: 0.08, v: 0.2, wave: 'triangle' }),
    break: () => { noise(0.25, 0.4, 3000); tone({ f: 200, f2: 60, d: 0.2, v: 0.2 }); },
    itemAppear: () => seq([60, 64, 67, 72], 0.05, 'triangle', 0.18),
    evolve: (d) => seq(d.special ? [55, 58, 62, 67, 70, 74, 79] : [60, 64, 67, 72, 76, 79, 84], 0.06, 'square', 0.16),
    powerup: () => seq([72, 76, 79], 0.06, 'square', 0.15),
    star: () => seq([72, 74, 76, 79, 81, 84, 86, 88], 0.04, 'triangle', 0.18),
    oneUp: () => seq([64, 67, 76, 72, 74, 79], 0.08, 'square', 0.16),
    shrink: () => seq([72, 67, 64, 60], 0.06, 'square', 0.18),
    die: () => { seq([71, 0, 67, 64, 60, 55, 52, 48], 0.11, 'square', 0.2); },
    pound: (d) => { noise(0.2, d.heavy ? 0.6 : 0.35, 600); tone({ f: 120, f2: 40, d: 0.25, v: 0.35, wave: 'sine' }); },
    poundStart: () => tone({ f: 900, f2: 300, d: 0.15, v: 0.1, wave: 'triangle' }),
    bounce: (d) => tone({ f: d.soft ? 200 : 260, f2: d.soft ? 500 : 900, d: 0.2, v: 0.18, wave: 'sine' }),
    spring: () => tone({ f: 200, f2: 1100, d: 0.25, v: 0.2, wave: 'triangle' }),
    shoot: (d) => d.type === 'poop' ? tone({ f: 160, f2: 80, d: 0.12, v: 0.25, wave: 'sawtooth' }) : tone({ f: 900, f2: 400, d: 0.08, v: 0.15 }),
    shotHit: () => noise(0.05, 0.12, 2500),
    splat: () => { noise(0.12, 0.2, 600); },
    starWave: () => { seq([84, 79, 76, 72], 0.04, 'triangle', 0.15); noise(0.3, 0.3, 900); },
    enemyShoot: () => tone({ f: 500, f2: 250, d: 0.1, v: 0.12, wave: 'sawtooth' }),
    cannon: () => { noise(0.25, 0.4, 500); tone({ f: 100, f2: 40, d: 0.25, v: 0.3, wave: 'sine' }); },
    glitchTp: () => tone({ f: 1500, f2: 200, d: 0.12, v: 0.1, wave: 'sawtooth' }),
    glitch: () => { for (let i = 0; i < 5; i++) tone({ f: U.rand(200, 2000), d: 0.04, v: 0.1, delay: i * 0.04, wave: 'sawtooth' }); },
    drip: () => tone({ f: 1400, f2: 600, d: 0.1, v: 0.12, wave: 'sine' }),
    enemyHop: () => tone({ f: 200, f2: 350, d: 0.1, v: 0.08, wave: 'sine' }),
    pickCatch: () => tone({ f: 1200, f2: 1600, d: 0.08, v: 0.08, wave: 'triangle' }),
    squidPulse: () => tone({ f: 260, f2: 140, d: 0.14, v: 0.07, wave: 'sine' }),
    squidInk: () => { noise(0.35, 0.12, 300); tone({ f: 180, f2: 90, d: 0.25, v: 0.08, wave: 'triangle' }); },
    checkpoint: () => seq([67, 72, 76, 79, 84], 0.07, 'square', 0.16),
    wind: () => noise(1.2, 0.15, 400),
    bossJump: () => tone({ f: 150, f2: 400, d: 0.3, v: 0.2, wave: 'sawtooth' }),
    bossLand: () => { noise(0.3, 0.5, 400); tone({ f: 80, f2: 30, d: 0.3, v: 0.4, wave: 'sine' }); },
    bossHit: () => seq([84, 72, 60], 0.05, 'sawtooth', 0.2),
    bossDown: () => { noise(0.8, 0.5, 1200); seq([60, 64, 67, 72, 76, 79, 84, 88], 0.07, 'square', 0.18); },
    goal: () => seq([60, 64, 67, 72, 67, 72, 76, 79, 84], 0.09, 'square', 0.18),
    tally: () => { if (Math.random() < 0.3) tone({ f: 1800, d: 0.03, v: 0.06 }); },
    gameover: () => seq([67, 0, 64, 0, 60, 55, 48], 0.18, 'triangle', 0.2)
  };

  // ---------- música ----------
  const Music = { timer: null, next: 0, step: 0, theme: null, mode: null, melody: null };
  function buildSong(theme, mode) {
    const m = theme.music, corrupt = mode === 'corrupt';
    const scale = corrupt ? S.Model.Themes.SCALES[m.scale === 'major' ? 'minor' : m.scale === 'pent' ? 'phrygian' : 'harmonic'] : S.Model.Themes.SCALES[m.scale];
    const rnd = U.rng(U.strSeed(theme.id + mode));
    const root = m.root - (corrupt ? 1 : 0);
    const deg = (d) => { const o = Math.floor(d / scale.length); return root + scale[((d % scale.length) + scale.length) % scale.length] + o * 12; };
    const mel = [];
    let cur = 7;
    for (let bar = 0; bar < 8; bar++) {
      const chord = m.prog[bar % m.prog.length];
      for (let s = 0; s < 16; s++) {
        let n = null;
        const strong = s % 4 === 0;
        if (strong || rnd() < 0.45) {
          if (strong) cur = chord + [0, 2, 4][Math.floor(rnd() * 3)] + 7;
          else cur += Math.floor(rnd() * 5) - 2;
          cur = U.clamp(cur, 4, 14);
          n = deg(cur);
          if (rnd() < 0.15 && !strong) n = null;
        }
        mel.push({ mel: n, bass: s % 4 === 0 ? deg(chord) - 24 + (s % 8 === 4 ? 7 : 0) : null, arp: s % 2 === 0 ? deg(chord + [0, 2, 4, 2][(s / 2) % 4]) - 12 : null, drum: s % 4 === 0 ? 'k' : s % 4 === 2 ? 'h' : s % 8 === 4 ? 's' : null });
      }
    }
    // el circo corrupto acelera también la música
    const tf = corrupt ? (theme.effect === 'speedUp' ? 1.3 : 0.88) : 1;
    return { mel, tempo: m.tempo * tf, wave: corrupt ? 'sawtooth' : m.wave, corrupt };
  }
  function schedule() {
    const a = ctx(); if (!a || !Music.song) return;
    const song = Music.song, stepDur = 60 / song.tempo / 4;
    while (Music.next < a.currentTime + 0.2) {
      const s = song.mel[Music.step % song.mel.length], at = Music.next;
      if (s.mel) tone({ f: mtof(s.mel), d: stepDur * 1.6, at, wave: song.wave, v: 0.13, out: musGain, detune: song.corrupt ? U.rand(-25, 25) : 0 });
      if (s.bass) tone({ f: mtof(s.bass), d: stepDur * 3, at, wave: 'triangle', v: 0.32, out: musGain });
      if (s.arp) tone({ f: mtof(s.arp), d: stepDur * 0.8, at, wave: 'square', v: 0.035, out: musGain });
      if (s.drum === 'k') tone({ f: 150, f2: 40, d: 0.12, at, wave: 'sine', v: 0.4, out: musGain });
      if (s.drum === 'h') noise(0.03, 0.06, 8000, at, musGain);
      if (s.drum === 's') noise(0.1, 0.12, 3000, at, musGain);
      Music.next += stepDur; Music.step++;
    }
  }

  const SoundView = {
    init() {
      Object.keys(SFX).forEach((k) => S.events.on('game:' + k, (d) => { if (!muted) SFX[k](d); }));
      S.events.on('ui:click', () => { if (!muted) tone({ f: 660, f2: 880, d: 0.06, v: 0.1, wave: 'triangle' }); });
      S.events.on('ui:place', () => { if (!muted) tone({ f: 520, d: 0.04, v: 0.08, wave: 'triangle' }); });
      S.events.on('ui:erase', () => { if (!muted) tone({ f: 300, f2: 150, d: 0.06, v: 0.08, wave: 'triangle' }); });
      S.events.on('game:goal', () => this.stopMusic());
      S.events.on('game:die', () => this.stopMusic());
      S.events.on('game:star', () => { if (Music.song) Music.song.tempo *= 1.25; });
    },
    unlock() { ctx(); },
    playMusic(theme, mode) {
      const a = ctx(); if (!a) return;
      this.stopMusic();
      Music.song = buildSong(theme, mode); Music.step = 0; Music.next = a.currentTime + 0.1;
      Music.timer = setInterval(schedule, 50);
    },
    stopMusic() { if (Music.timer) clearInterval(Music.timer); Music.timer = null; Music.song = null; },
    toggleMute() {
      muted = !muted; try { localStorage.setItem('sgm.muted', muted ? '1' : '0'); } catch (e) { /* nada */ }
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted: () => muted
  };
  S.View.SoundView = SoundView;
})(window.SGM);
