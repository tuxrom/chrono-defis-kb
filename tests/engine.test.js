import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, Runner, fmt, lighten } from '../js/engine.js';

const S = 1000;
const E = (name, reps = '', o = {}) => ({ name, reps, ...o });

/** Fait avancer le chrono seconde par seconde de `from` à `to` (ms) et collecte les événements. */
function run(r, from, to, step = 250) {
  const ev = [];
  for (let t = from; t <= to; t += step) ev.push(...r.update(t));
  return ev;
}

test('fmt', () => {
  assert.equal(fmt(0), '00:00');
  assert.equal(fmt(65), '01:05');
  assert.equal(fmt(1810), '30:10');
  assert.equal(fmt(-3), '00:00');
});

test('EMOM : une minute par exercice, tours comptés, compte à rebours 3-2-1', () => {
  const plan = compile({ segments: [{ format: 'emom', rounds: 2, minutes: [E('A', '10'), E('B', '6')] }] }, { prep: 5 });
  assert.equal(plan.steps.length, 1 + 4);
  assert.equal(plan.timedSec, 240);
  assert.equal(plan.manual, false);
  const r = new Runner(plan);
  const first = r.start(0);
  assert.equal(first[0].step.kind, 'prep');
  const ev = run(r, 0, 5 * S + 60 * S);
  assert.deepEqual(ev.filter((e) => e.type === 'count').map((e) => e.n), [3, 2, 1, 3, 2, 1]);
  assert.equal(r.view(5 * S + 60 * S).step.label, 'B');
  assert.equal(r.view(5 * S + 60 * S).step.round, 1);
  run(r, 65 * S, 245 * S);
  assert.equal(r.done, true);
  const res = r.result();
  assert.equal(res.durationSec, 240);
  assert.equal(res.complete, true);
  assert.equal(res.segments[0].rounds, 2);
});

test('EMOM : la pause gèle le temps', () => {
  const r = new Runner(compile({ segments: [{ format: 'emom', rounds: 1, minutes: [E('A')] }] }, { prep: 0 }));
  r.start(0);
  r.update(30 * S);
  r.pause(30 * S);
  assert.equal(Math.round(r.view(500 * S).remaining), 30);
  r.start(500 * S);
  assert.equal(Math.round(r.view(510 * S).remaining), 20);
  run(r, 510 * S, 531 * S);
  assert.equal(r.done, true);
  assert.equal(r.result().durationSec, 60);
});

test('AMRAP : blocs, repos entre blocs, compteur par bloc', () => {
  const plan = compile({ segments: [{ format: 'amrap', blockSec: 480, restSec: 120, blocks: [
    { name: 'B1', exercises: [E('x')] }, { name: 'B2', exercises: [E('y')] }, { name: 'B3', exercises: [E('z')] }] }] }, { prep: 0 });
  assert.deepEqual(plan.steps.map((s) => s.kind), ['work', 'rest', 'work', 'rest', 'work']);
  assert.equal(plan.timedSec, 3 * 480 + 2 * 120);
  const r = new Runner(plan);
  r.start(0);
  r.addRound(); r.addRound(); r.addRound(); r.addRound(-1);
  run(r, 0, 490 * S);
  assert.equal(r.step.kind, 'rest');
  assert.equal(r.addRound(), null, 'pas de compteur pendant le repos');
  run(r, 490 * S, 610 * S);
  assert.equal(r.step.label, 'B2');
  for (let i = 0; i < 5; i++) r.addRound();
  run(r, 610 * S, 1680 * S, 1000);
  assert.equal(r.done, true);
  const seg = r.result().segments[0];
  assert.deepEqual(seg.blocks.map((b) => b.rounds), [2, 5, 0]);
});

test('Rounds : rounds manuels, repos fixe, finisher en paliers, splits', () => {
  const plan = compile({ segments: [{ format: 'rounds', rounds: 3, restSec: 90, exercises: [E('a', '5')],
    finisher: { name: 'Wood chop', ladder: [6, 4], unit: 'par côté' } }] }, { prep: 0 });
  assert.deepEqual(plan.steps.map((s) => s.kind + (s.sec ? s.sec : '')), ['work', 'rest90', 'work', 'rest90', 'work', 'work', 'work']);
  const r = new Runner(plan);
  r.start(0);
  r.next(100 * S);                  // round 1 en 100 s
  run(r, 100 * S, 190 * S);         // repos 90 s
  assert.equal(r.step.round, 2);
  r.next(310 * S);                  // round 2 en 120 s
  run(r, 310 * S, 400 * S);
  r.next(500 * S);                  // round 3
  assert.equal(r.step.unit, 'Palier');
  r.next(530 * S); r.next(550 * S);
  assert.equal(r.done, true);
  const seg = r.result().segments[0];
  assert.equal(seg.rounds, 3);
  assert.deepEqual(seg.splits.map((s) => s.sec), [100, 120, 100, 30, 20]);
  assert.equal(r.result().durationSec, 550);
});

test('Chipper : une étape par exercice, split à chaque étape', () => {
  const r = new Runner(compile({ segments: [{ format: 'chipper', exercises: [E('A', '×50'), E('B', '×40')] }] }, { prep: 3 }));
  r.start(0);
  run(r, 0, 3 * S);
  assert.equal(r.step.label, 'A');
  r.next(200 * S);
  r.next(320 * S);
  assert.equal(r.done, true);
  assert.deepEqual(r.result().segments[0].splits, [{ label: 'A', sec: 197 }, { label: 'B', sec: 120 }]);
  assert.equal(r.result().durationSec, 317);
});

test('Chrono libre : splits à la volée, fin normale', () => {
  const r = new Runner(compile({ segments: [{ format: 'chipper', exercises: [] }] }, { prep: 0 }));
  r.start(0);
  r.lap(40 * S); r.lap(100 * S);
  r.stop(130 * S, true);
  const res = r.result();
  assert.equal(res.complete, true);
  assert.deepEqual(res.segments[0].splits.map((s) => s.sec), [40, 60, 30]);
});

test('Tabata : 20/10, rounds réglables, durée 30 s par round', () => {
  const plan = compile({ segments: [{ format: 'tabata', rounds: 6, exercise: E('Squat') }] }, { prep: 0 });
  assert.equal(plan.timedSec, 180);
  const r = new Runner(plan);
  r.start(0);
  const ev = run(r, 0, 180 * S);
  assert.equal(r.done, true);
  assert.equal(ev.filter((e) => e.type === 'step').length, 11);
  assert.equal(ev.filter((e) => e.type === 'count').length, 6 * 3 + 6 * 3);
  assert.equal(r.result().segments[0].rounds, 6);
});

test('Enchaînement sans repos : chipper puis tabata', () => {
  const r = new Runner(compile({ segments: [
    { format: 'chipper', exercises: [E('A')] },
    { format: 'tabata', rounds: 2, exercise: E('S') }] }, { prep: 0 }));
  r.start(0);
  r.next(60 * S);
  assert.equal(r.step.label, 'S');
  run(r, 60 * S, 120 * S);
  assert.equal(r.done, true);
  assert.equal(r.result().durationSec, 120);
});

test('Arrêt anticipé : séance non terminée', () => {
  const r = new Runner(compile({ segments: [{ format: 'emom', rounds: 5, minutes: [E('A')] }] }, { prep: 10 }));
  r.start(0);
  run(r, 0, 100 * S);
  r.stop(100 * S);
  const res = r.result();
  assert.equal(res.complete, false);
  assert.equal(res.durationSec, 90);
  assert.equal(res.segments[0].rounds, 1);
});

test('Passer une étape chronométrée', () => {
  const r = new Runner(compile({ segments: [{ format: 'emom', rounds: 1, minutes: [E('A'), E('B')] }] }, { prep: 0 }));
  r.start(0);
  r.next(10 * S);
  assert.equal(r.step.label, 'B');
  assert.equal(Math.round(r.view(10 * S).remaining), 60);
});

test('Version allégée : remplace ou retire', () => {
  assert.equal(lighten(E('X', '', { drop: true }), true), null);
  assert.equal(lighten(E('X', '', { alt: 'Y' }), true).name, 'Y');
  assert.equal(lighten(E('X', '', { drop: true }), false).name, 'X');
  const plan = compile({ segments: [{ format: 'emom', rounds: 1, minutes: [E('A'), E('B', '', { drop: true })] }] }, { prep: 0, light: true });
  assert.equal(plan.steps[1].kind, 'rest', 'une minute retirée devient du repos actif');
  assert.equal(plan.timedSec, 120, 'la durée de l’EMOM ne change pas');
});
