/* Modelo: guardado de niveles en localStorage (máx. 207; 258 con la cuenta de Glob Defenders vinculada) */
(function (S) {
  'use strict';
  const KEY = 'sgm.levels.v1';
  const DRAFT = 'sgm.draft.v1';
  const LINK = 'sgm.gldLinked';
  const BASE_LIMIT = 207;
  const read = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  const Storage = {
    BASE_LIMIT,
    // La vinculación real con Glob Defenders está pendiente; de momento solo se guarda el estado
    isLinked() { return read(LINK, false) === true; },
    setLinked(v) { write(LINK, !!v); },
    // Admin (kirbytebi): sin tope de niveles (el único límite es el espacio del navegador)
    limit() { return (S.Model.Gld && S.Model.Gld._admin) ? 9999 : Storage.isLinked() ? Math.floor(BASE_LIMIT * 1.25) : BASE_LIMIT; },
    count() { return read(KEY, []).length; },
    list() { return read(KEY, []).sort((a, b) => (b.updated || 0) - (a.updated || 0)); },
    get(id) { return read(KEY, []).find((l) => l.id === id) || null; },
    // Devuelve 'ok' | 'full' | 'error'
    save(json) {
      const all = read(KEY, []);
      const entry = Object.assign({}, json, { updated: Date.now() });
      const i = all.findIndex((l) => l.id === json.id);
      if (i >= 0) all[i] = entry;
      else { if (all.length >= Storage.limit()) return 'full'; all.push(entry); }
      return write(KEY, all) ? 'ok' : 'error';
    },
    remove(id) { write(KEY, read(KEY, []).filter((l) => l.id !== id)); },
    saveDraft(json) { write(DRAFT, json); },
    loadDraft() { return read(DRAFT, null); }
  };
  S.Model.LevelStorage = Storage;
})(window.SGM);
