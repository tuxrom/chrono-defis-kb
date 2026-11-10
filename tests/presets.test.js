import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../js/engine.js';
import { PHASE1, PHASE2, SESSIONS, tools, plannedDate, findSession } from '../js/presets.js';

const min = (id, opts) => compile(findSession(id), { prep: 0, ...opts }).timedSec / 60;

test('identifiants uniques, 9 séances en Phase 2', () => {
  const ids = [...SESSIONS, ...tools()].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(PHASE2.length, 9);
  assert.deepEqual(PHASE2.map((s) => s.n), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('toutes les séances se compilent, avec et sans version allégée', () => {
  for (const s of [...SESSIONS, ...tools()]) {
    for (const light of [false, true]) {
      const plan = compile(s, { light });
      assert.ok(plan.steps.length > 1, s.id);
      for (const st of plan.steps) assert.ok(st.label && (st.sec > 0 || st.btn), s.id + ' : étape sans durée ni bouton');
    }
  }
});

test('durées Phase 1', () => {
  assert.equal(min('p1-moteur'), 30);
  assert.equal(min('p1-moteur-plus'), 36);
  assert.equal(min('p1-circuit'), 3 * 8 + 2 * 2);
  assert.equal(min('p1-circuit-plus'), 28);
  assert.equal(min('p1-boss'), 3, 'Tabata de 6 rounds = 3 min chronométrées après le chipper');
  assert.equal(min('p1-complexe'), 7 * 1.5, '8 rounds = 7 repos de 90 s');
});

test('durées Phase 2', () => {
  assert.equal(min('p2-s1'), 36);
  assert.equal(min('p2-s4'), 40);
  assert.equal(min('p2-s7'), 44);
  assert.equal(min('p2-s2'), 3 * 8 + 2 * 2);
  assert.equal(min('p2-s5'), 3 * 9 + 2 * 2);
  assert.equal(min('p2-s8'), 3 * 10 + 2 * 2);
  assert.equal(min('p2-s3'), 7 * 1.5);
  assert.equal(min('p2-s6'), 8 * 1.5);
  assert.equal(min('p2-s9'), 9 * 1.5);
  assert.equal(min('p2-s1', { light: true }), 36, 'l’EMOM allégé garde sa durée');
});

test('contenu Phase 2 : EMOM de 4 minutes, finishers, halo', () => {
  const s1 = compile(findSession('p2-s1'), { prep: 0 });
  assert.equal(s1.segments[0].list.length, 4);
  assert.deepEqual(s1.steps.slice(0, 4).map((s) => s.detail.split(' · ')[0]), ['12', '6 par bras', '8 par bras', '6 par sens']);
  const s9 = findSession('p2-s9').segments[0];
  assert.equal(s9.rounds, 10);
  assert.deepEqual(s9.finisher.ladder, [16, 14, 12, 10, 8]);
  assert.equal(s9.exercises.find((e) => e.name === 'Halo').reps, '4 par sens');
  const s8 = findSession('p2-s8').segments[0];
  assert.deepEqual(s8.blocks[1].exercises.map((e) => parseInt(e.reps, 10)), [8, 10, 12, 6]);
});

test('version allégée Phase 2 : clean-press remplacé, halo, triceps et around the world retirés', () => {
  const plan = compile(findSession('p2-s3'), { light: true });
  const list = plan.segments[0].list.join(' | ');
  assert.match(list, /Curl press out devant/);
  assert.doesNotMatch(list, /Halo|triceps|Around|Clean/);
});

test('rien de balistique dans les noms d’exercices (pas de swing, snatch, jerk)', () => {
  for (const s of SESSIONS) assert.doesNotMatch(JSON.stringify(s.segments), /swing|snatch|jerk/i, s.id);
});

test('calendrier Phase 2 : 14/11/2026 18 h puis tous les 2 jours', () => {
  const d1 = plannedDate(1), d9 = plannedDate(9);
  assert.deepEqual([d1.getFullYear(), d1.getMonth(), d1.getDate(), d1.getHours()], [2026, 10, 14, 18]);
  assert.deepEqual([d9.getMonth(), d9.getDate()], [10, 30]);
});

test('Phase 1 : Complexe+ présent', () => {
  assert.ok(PHASE1.find((s) => s.name === 'Complexe+'));
});
