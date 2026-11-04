/* Vista: FORMATO RICO de los ✉ Mensajes (estilo Discord), sin HTML crudo: todo se construye
   con nodos del DOM (textContent), así un mensaje nunca puede meter código en la página.
     **negrita**   *cursiva* o _cursiva_   ~~tachado~~   __subrayado__   `código`   ||spoiler||
     [texto](https://enlace)   https://enlace-suelto   @usuario   > cita   # título   - lista
     KX47-2B91-R3T8  -> TARJETA del nivel (miniatura, nombre, autor, ▶ Jugar y ⬇)
   h (opcional) = { author(name), play(row), download(row) } */
(function (S) {
  'use strict';
  const CODE_RE = /\b[A-HJ-NP-Z]{2}\d{2}-\d[A-HJ-NP-Z]\d{2}-[A-HJ-NP-Z]\d[A-HJ-NP-Z]\d\b/;
  // orden = prioridad. Cada patrón: [regex (anclado al principio), constructor]
  const INLINE = [
    [/^`([^`\n]{1,200})`/, (m) => node('code', 'rt-code', m[1])],
    [/^\|\|([^|\n]{1,300})\|\|/, (m, h, d) => { const s = wrap('span', 'rt-spoiler', m[1], h, d); s.tabIndex = 0; s.setAttribute('role', 'button'); s.setAttribute('aria-label', 'Spoiler: pulsa para verlo'); const show = () => s.classList.add('on'); s.onclick = show; s.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') show(); }; return s; }],
    [/^\[([^\]\n]{1,100})\]\((https?:\/\/[^\s)]{1,300})\)/, (m) => link(m[2], m[1])],
    [/^\*\*([^\n]+?)\*\*/, (m, h, d) => wrap('strong', '', m[1], h, d)],
    [/^__([^\n]+?)__/, (m, h, d) => wrap('u', '', m[1], h, d)],
    [/^~~([^\n]+?)~~/, (m, h, d) => wrap('s', '', m[1], h, d)],
    [/^\*([^*\n]+?)\*/, (m, h, d) => wrap('em', '', m[1], h, d)],
    [/^_([^_\n]+?)_(?![A-Za-z0-9])/, (m, h, d) => wrap('em', '', m[1], h, d)],
    [/^https?:\/\/[^\s<>()]{2,300}/, (m) => link(m[0], m[0])],
    [/^@([a-z0-9_.-]{2,23}[a-z0-9_-])/i, (m, h) => mention(m[1], h)], // sin el punto final de la frase
    [new RegExp('^' + CODE_RE.source.replace(/^\\b/, '')), (m) => node('span', 'rt-levelref', m[0])]
  ];
  function node(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function wrap(tag, cls, inner, h, d) { const e = node(tag, cls); e.appendChild(inline(inner, h, d + 1)); return e; }
  function link(href, text) {
    let ok = false; try { const u = new URL(href); ok = u.protocol === 'https:' || u.protocol === 'http:'; } catch (e) { /* no */ }
    if (!ok) return document.createTextNode(text);
    const a = node('a', 'rt-link', text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer nofollow';
    return a;
  }
  function mention(name, h) {
    if (!h || !h.author) return node('b', 'rt-mention', '@' + name);
    const b = node('button', 'link rt-mention', '@' + name); b.type = 'button'; b.onclick = () => h.author(name); return b;
  }
  // Texto en línea -> fragmento (d = profundidad, por si alguien anida muchísimo)
  function inline(str, h, d) {
    d = d || 0;
    const frag = document.createDocumentFragment();
    if (d > 6) { frag.appendChild(document.createTextNode(str)); return frag; }
    let buf = '', i = 0;
    const flush = () => { if (buf) { frag.appendChild(document.createTextNode(buf)); buf = ''; } };
    while (i < str.length) {
      const rest = str.slice(i);
      // los patrones solo empiezan en un carácter "especial" (o al inicio de palabra para @, enlaces y códigos)
      const prev = i ? str[i - 1] : ' ';
      let hit = null;
      if ('`|[*_~h@ABCDEFGHJKLMNPQRSTUVWXYZ'.includes(rest[0])) {
        for (const [re, make] of INLINE) {
          const m = rest.match(re); if (!m) continue;
          // @, enlaces sueltos, códigos y _cursiva_ solo al empezar palabra (no dentro de nombre_con_guiones)
          if ((re.source.startsWith('^@') || re.source.startsWith('^https') || re.source.startsWith('^_(') || /^\^\[A-HJ/.test(re.source)) && /[A-Za-z0-9]/.test(prev)) continue;
          hit = [m, make]; break;
        }
      }
      if (hit) { flush(); frag.appendChild(hit[1](hit[0], h, d)); i += hit[0][0].length; }
      else { buf += str[i]; i++; }
    }
    flush();
    return frag;
  }
  // Bloques: líneas con > cita, # título, - lista; el resto párrafos con saltos de línea
  function render(text, h) {
    const root = node('div', 'rt');
    const lines = String(text || '').replace(/\r/g, '').slice(0, 4000).split('\n');
    let list = null, para = null;
    const endList = () => { list = null; }, endPara = () => { para = null; };
    lines.forEach((ln) => {
      let m;
      if ((m = ln.match(/^\s*[-•]\s+(.*)$/))) { endPara(); if (!list) { list = node('ul', 'rt-list'); root.appendChild(list); } const li = node('li'); li.appendChild(inline(m[1], h)); list.appendChild(li); return; }
      endList();
      if ((m = ln.match(/^\s*>\s?(.*)$/))) { endPara(); const q = node('blockquote', 'rt-quote'); q.appendChild(inline(m[1], h)); root.appendChild(q); return; }
      if ((m = ln.match(/^\s*#{1,3}\s+(.*)$/))) { endPara(); const t = node('div', 'rt-title'); t.appendChild(inline(m[1], h)); root.appendChild(t); return; }
      if (!ln.trim()) { endPara(); return; }
      if (!para) { para = node('p', 'rt-p'); root.appendChild(para); } else para.appendChild(node('br'));
      para.appendChild(inline(ln, h));
    });
    // Tarjetas de nivel: una por código distinto (máx. 3), debajo del texto
    const codes = [...new Set((String(text || '').match(new RegExp(CODE_RE.source, 'g')) || []))].slice(0, 3);
    codes.forEach((code) => root.appendChild(levelCard(code, h)));
    return root;
  }
  // Tarjeta de un nivel publicado a partir de su código (se rellena al llegar la respuesta)
  function levelCard(code, h) {
    const card = node('div', 'level-row rt-card');
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 90; cv.className = 'rt-thumb'; card.appendChild(cv);
    const info = node('div', 'info'); info.appendChild(node('b', '', '🔢 ' + code)); const sub = node('small', '', S.tr ? S.tr('Cargando…') : 'Cargando…'); info.appendChild(sub);
    card.appendChild(info);
    const Gld = S.Model.Gld;
    if (!Gld || !Gld.configured() || !Gld.findBySeed) { sub.textContent = code; return card; }
    Gld.findBySeed(code).then((r) => {
      const row = r && r.ok && r.rows && r.rows[0];
      if (!row) { sub.textContent = S.tr ? S.tr('No hay ningún nivel publicado con ese código') : 'No hay ningún nivel publicado con ese código'; card.classList.add('missing'); return; }
      const theme = S.Model.Themes.get(row.theme || 'lake');
      if (S.app && S.app.menu && S.app.menu.drawThemeThumb) S.app.menu.drawThemeThumb(cv, theme, row.mode || 'peace');
      info.firstChild.textContent = row.name;
      sub.textContent = (row.author ? '@' + row.author + ' · ' : '') + S.Model.Themes.name(theme, row.mode || 'peace') + ' · 👍 ' + (row.likes | 0) + ' · ▶ ' + (row.plays | 0) + ' · ' + code;
      if (h && h.play) { const b = S.View.button('▶ Jugar', 'primary', () => h.play(row)); card.appendChild(b); }
      if (h && h.download) { const b = S.View.button('⬇', '', () => h.download(row)); b.title = S.tr ? S.tr('Descargar a Mis niveles (solo para jugar)') : 'Descargar a Mis niveles (solo para jugar)'; card.appendChild(b); }
    }).catch(() => { sub.textContent = code; });
    return card;
  }
  // Chuleta de formato (para el que escribe)
  const HELP = '**negrita** · *cursiva* · __subrayado__ · ~~tachado~~ · `código` · ||spoiler|| · [texto](https://…) · @usuario · > cita · - lista · código de nivel = tarjeta';

  S.View.RichText = { render, inline, HELP, CODE_RE };
})(window.SGM);
