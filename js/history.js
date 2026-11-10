// Historique local des séances (localStorage), records, export CSV/JSON, import JSON, texte récapitulatif.
// Aucune donnée ne quitte l'appareil.

import { fmt } from './engine.js';

export const HISTORY_KEY = 'chronokb.history.v1';
const MAX_NOTE = 2000;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clampInt = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; };

/** Entrée d'historique à partir d'un résultat du moteur. */
export function makeEntry({ session, result, pain = null, note = '', light = false, date = new Date() }) {
  return {
    id: uid(), date: new Date(date).toISOString(), sessionId: session.id, sessionName: session.name,
    phase: session.phase || 0, light: !!light, complete: !!result.complete, durationSec: result.durationSec,
    segments: result.segments, pain: pain === null ? null : clampInt(pain, 0, 10), note: String(note || '').slice(0, MAX_NOTE),
  };
}

export function loadHistory(storage) {
  try { return sanitizeList(JSON.parse(storage.getItem(HISTORY_KEY) || '[]')); } catch { return []; }
}
export function saveHistory(storage, entries) {
  storage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

/* -------------------------------- Records ------------------------------- */

export const amrapTotal = (e) => e.segments.reduce((a, s) => a + (s.blocks ? s.blocks.reduce((b, x) => b + x.rounds, 0) : 0), 0);
export const roundsTotal = (e) => e.segments.reduce((a, s) => a + (s.rounds || 0), 0);

/** Valeur d'une entrée pour une métrique (null si elle ne compte pas). */
export function metricValue(entry, metric) {
  if (metric === 'time') return entry.complete ? entry.durationSec : null;
  if (metric === 'amrap') return amrapTotal(entry);
  if (metric === 'rounds') return roundsTotal(entry);
  return null;
}
export const metricText = (v, metric) => (v === null || v === undefined ? '—' : metric === 'time' ? fmt(v) : v + ' tours');

/** Meilleure entrée par séance : { [sessionId]: { value, text, entry } }. `sessions` fournit la métrique. */
export function records(entries, sessions) {
  const out = {};
  for (const s of sessions) {
    if (!s.record) continue;
    const m = s.record.metric;
    let best = null;
    for (const e of entries) {
      if (e.sessionId !== s.id) continue;
      const v = metricValue(e, m);
      if (v === null) continue;
      if (!best || (m === 'time' ? v < best.value : v > best.value)) best = { value: v, entry: e };
    }
    if (best) out[s.id] = { ...best, text: metricText(best.value, m) };
  }
  return out;
}

/* ------------------------------ Récapitulatif ---------------------------- */

const dateText = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

/** Lignes [libellé, valeur] du résultat (écran de fin). */
export function resultLines(entry) {
  const L = [['Durée', fmt(entry.durationSec) + (entry.complete ? '' : ' (arrêtée avant la fin)')]];
  for (const s of entry.segments) {
    if (s.format === 'amrap' && s.blocks) {
      s.blocks.forEach((b) => L.push([b.name, b.rounds + ' tours']));
      L.push(['Total AMRAP', s.blocks.reduce((a, b) => a + b.rounds, 0) + ' tours']);
    } else if (s.format === 'emom' || s.format === 'tabata') {
      L.push([s.format === 'emom' ? 'Tours EMOM' : 'Rounds Tabata', s.rounds + '/' + s.target]);
    } else if (s.format === 'rounds') {
      L.push(['Rounds', s.rounds + '/' + s.target]);
    }
    if (s.splits && s.splits.length) s.splits.forEach((x) => L.push([x.label, fmt(x.sec)]));
  }
  if (entry.pain !== null && entry.pain !== undefined) L.push(['Douleur', entry.pain + '/10']);
  if (entry.light) L.push(['Version', 'allégée']);
  return L;
}

/** Texte prêt à copier-coller. */
export function summaryText(entry) {
  const lines = [entry.sessionName + (entry.phase ? ' (Phase ' + entry.phase + ')' : '') + ' — ' + dateText(entry.date)];
  for (const [k, v] of resultLines(entry)) lines.push(k + ' : ' + v);
  if (entry.pain !== null && entry.pain > 3) lines.push('⚠️ Douleur > 3/10 : séance à arrêter, avis médical.');
  if (entry.note) lines.push('Note : ' + entry.note);
  return lines.join('\n');
}

/* --------------------------------- Export -------------------------------- */

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

/** CSV séparé par des points-virgules (Excel/Numbers en français), avec BOM UTF-8. */
export function toCSV(entries) {
  const head = ['date', 'seance', 'phase', 'complete', 'duree', 'duree_s', 'tours', 'tours_par_bloc', 'splits', 'douleur', 'allegee', 'note'];
  const rows = entries.map((e) => [
    e.date, e.sessionName, e.phase, e.complete ? 'oui' : 'non', fmt(e.durationSec), e.durationSec, roundsTotal(e),
    e.segments.filter((s) => s.blocks).flatMap((s) => s.blocks.map((b) => b.rounds)).join('/'),
    e.segments.flatMap((s) => s.splits || []).map((x) => x.label + ' ' + fmt(x.sec)).join(' | '),
    e.pain === null ? '' : e.pain, e.light ? 'oui' : 'non', e.note,
  ]);
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

export function toJSON(entries) {
  return JSON.stringify({ app: 'chronokb', version: 1, exportedAt: new Date().toISOString(), entries }, null, 2);
}

/* --------------------------------- Import -------------------------------- */

function sanitizeSegment(s) {
  if (!s || typeof s !== 'object') return null;
  const out = {
    format: String(s.format || ''), label: String(s.label || ''), target: clampInt(s.target, 0, 999) || 0,
    rounds: clampInt(s.rounds, 0, 9999) || 0,
    splits: Array.isArray(s.splits) ? s.splits.map((x) => ({ label: String(x && x.label || ''), sec: clampInt(x && x.sec, 0, 86400) || 0 })) : [],
  };
  if (Array.isArray(s.blocks)) out.blocks = s.blocks.map((b) => ({ name: String(b && b.name || ''), rounds: clampInt(b && b.rounds, 0, 9999) || 0 }));
  return out;
}

function sanitizeEntry(e) {
  if (!e || typeof e !== 'object' || typeof e.sessionId !== 'string' || isNaN(Date.parse(e.date))) return null;
  const dur = clampInt(e.durationSec, 0, 86400);
  if (dur === null) return null;
  return {
    id: typeof e.id === 'string' && e.id ? e.id.slice(0, 40) : uid(), date: new Date(e.date).toISOString(),
    sessionId: e.sessionId.slice(0, 60), sessionName: String(e.sessionName || e.sessionId).slice(0, 80),
    phase: clampInt(e.phase, 0, 9) || 0, light: !!e.light, complete: e.complete !== false, durationSec: dur,
    segments: (Array.isArray(e.segments) ? e.segments : []).map(sanitizeSegment).filter(Boolean),
    pain: e.pain === null || e.pain === undefined || e.pain === '' ? null : clampInt(e.pain, 0, 10),
    note: String(e.note || '').slice(0, MAX_NOTE),
  };
}
const sanitizeList = (list) => (Array.isArray(list) ? list.map(sanitizeEntry).filter(Boolean) : []);

/** Lit un export JSON (ou une simple liste d'entrées). Lève une erreur lisible si le fichier n'est pas valable. */
export function parseImport(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Fichier JSON illisible'); }
  const list = Array.isArray(data) ? data : data && Array.isArray(data.entries) ? data.entries : null;
  if (!list) throw new Error('Aucune séance trouvée dans ce fichier');
  return sanitizeList(list);
}

/** Fusionne sans doublon (même id), du plus récent au plus ancien. */
export function mergeEntries(current, incoming) {
  const map = new Map(current.map((e) => [e.id, e]));
  let added = 0;
  for (const e of incoming) if (!map.has(e.id)) { map.set(e.id, e); added++; }
  return { entries: [...map.values()].sort((a, b) => b.date.localeCompare(a.date)), added };
}
