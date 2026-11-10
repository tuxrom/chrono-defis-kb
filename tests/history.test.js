import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, Runner } from '../js/engine.js';
import { findSession, SESSIONS } from '../js/presets.js';
import {
  makeEntry, records, toCSV, toJSON, parseImport, mergeEntries, summaryText, loadHistory, saveHistory, HISTORY_KEY,
} from '../js/history.js';

const S = 1000;

/** Joue un AMRAP de Phase 2 avec un nombre de tours donné par bloc. */
function circuitEntry(counts, date) {
  const session = findSession('p2-s2');
  const r = new Runner(compile(session, { prep: 0 }));
  r.start(0);
  for (let b = 0; b < 3; b++) {
    for (let i = 0; i < counts[b]; i++) r.addRound();
    for (let t = 0; t < (b < 2 ? 600 : 480); t++) r.update((b * 600 + t + 1) * S);
  }
  return makeEntry({ session, result: r.result(), pain: 2, note: 'RAS', date });
}

function chipperEntry(sec, complete = true, date = '2026-11-05T18:00:00Z') {
  const session = findSession('p1-chipper');
  return makeEntry({ session, result: { durationSec: sec, complete, segments: [{ format: 'chipper', label: '', target: 6, rounds: 0, splits: [{ label: 'Goblet squat', sec: 200 }] }] }, date });
}

test('entrée : tours par bloc, durée, douleur bornée', () => {
  const e = circuitEntry([5, 4, 6], '2026-11-16T18:00:00Z');
  assert.equal(e.durationSec, 28 * 60);
  assert.deepEqual(e.segments[0].blocks.map((b) => b.rounds), [5, 4, 6]);
  assert.equal(makeEntry({ session: findSession('p1-moteur'), result: { durationSec: 1, complete: true, segments: [] }, pain: 14 }).pain, 10);
});

test('records : plus de tours en AMRAP, meilleur temps terminé au chipper', () => {
  const entries = [circuitEntry([5, 4, 6]), circuitEntry([6, 5, 6]), chipperEntry(900), chipperEntry(820), chipperEntry(500, false)];
  const rec = records(entries, SESSIONS);
  assert.equal(rec['p2-s2'].value, 17);
  assert.equal(rec['p2-s2'].text, '17 tours');
  assert.equal(rec['p1-chipper'].value, 820, 'une séance abandonnée ne compte pas');
  assert.equal(rec['p1-chipper'].text, '13:40');
  assert.equal(rec['p1-moteur'], undefined);
});

test('récapitulatif texte : durée, tours par bloc, splits, douleur, note', () => {
  const txt = summaryText(circuitEntry([5, 4, 6], '2026-11-16T04:00:00Z'));
  assert.match(txt, /^S2 Circuit \(Phase 2\) — /);
  assert.match(txt, /Durée : 28:00/);
  assert.match(txt, /Bloc 1 : 5 tours/);
  assert.match(txt, /Total AMRAP : 15 tours/);
  assert.match(txt, /Douleur : 2\/10/);
  assert.match(txt, /Note : RAS/);
  assert.match(summaryText(chipperEntry(830)), /Goblet squat : 03:20/);
  const hurt = makeEntry({ session: findSession('p1-moteur'), result: { durationSec: 60, complete: false, segments: [] }, pain: 5 });
  assert.match(summaryText(hurt), /Douleur > 3\/10/);
});

test('CSV : en-tête, séparateur, guillemets', () => {
  const e = circuitEntry([5, 4, 6]);
  e.note = 'genou; un peu "raide"';
  const csv = toCSV([e]);
  const lines = csv.replace('﻿', '').trim().split('\r\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^date;seance;phase;complete;duree/);
  assert.match(lines[1], /;28:00;1680;0;5\/4\/6;/);
  assert.match(lines[1], /"genou; un peu ""raide"""$/);
});

test('JSON : export puis import identiques, fusion sans doublon', () => {
  const a = [circuitEntry([5, 4, 6], '2026-11-16T18:00:00Z'), chipperEntry(830)];
  const back = parseImport(toJSON(a));
  assert.deepEqual(back, a);
  const { entries, added } = mergeEntries([a[0]], back);
  assert.equal(added, 1);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].sessionId, 'p2-s2', 'tri du plus récent au plus ancien');
});

test('import : fichier invalide, entrées incomplètes filtrées et bornées', () => {
  assert.throws(() => parseImport('pas du json'), /illisible/);
  assert.throws(() => parseImport('{"foo":1}'), /Aucune séance/);
  const list = parseImport(JSON.stringify([{ sessionId: 'x', date: '2026-11-01', durationSec: 60, pain: 99, note: 'a'.repeat(5000) }, { date: 'nope' }]));
  assert.equal(list.length, 1);
  assert.equal(list[0].pain, 10);
  assert.equal(list[0].note.length, 2000);
});

test('stockage local', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(loadHistory(storage), []);
  const e = chipperEntry(830);
  saveHistory(storage, [e]);
  assert.ok(mem.has(HISTORY_KEY));
  assert.deepEqual(loadHistory(storage), [e]);
  mem.set(HISTORY_KEY, '{corrompu');
  assert.deepEqual(loadHistory(storage), []);
});
