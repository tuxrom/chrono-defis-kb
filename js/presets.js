// Séances. Tout se fait avec 1 kettlebell de 10 kg et le poids du corps.
// `drop` : exercice retiré en version allégée ; `alt` : exercice de remplacement en version allégée.
// `record.metric` : 'rounds' (tours EMOM, plus = mieux), 'amrap' (tours cumulés, plus = mieux),
// 'time' (durée d'une séance terminée, moins = mieux). `record.ref` : référence connue (texte libre).

const E = (name, reps, o = {}) => ({ name, reps, ...o });

export const SAFETY = 'Douleur > 3/10 = arrêt immédiat. Rien de balistique.';
export const ATW_DEF =
  'Around the world : 1 rep = 2 rotations du KB autour de l’abdomen, la seconde finit par un passage de main à ' +
  'hauteur d’épaule, puis changement de sens.';

export const PHASES = [
  { phase: 1, name: 'Phase 1', end: '2026-11-11', note: '9 séances, se termine le 11/11/2026' },
  { phase: 2, name: 'Phase 2', start: '2026-11-14', note: '9 séances dès le 14/11/2026, 1 jour de repos entre deux, à 18 h' },
];

/* ------------------------------- Phase 1 ------------------------------- */

const P1_EMOM = [
  E('Goblet squat', '10'),
  E('Alt bent over row', '6 par bras'),
  E('Curl press out', '6 par bras', { info: 'poussée devant toi, pas au-dessus de la tête' }),
];

const P1_CIRCUIT = [
  { name: 'Bloc 1 · Jambes', exercises: [E('March to lunge', '6 par jambe'), E('Goblet squat', '10'), E('Squat sauté', '5')] },
  { name: 'Bloc 2 · Dos et bras', exercises: [E('Alt bent over row', '8 par bras'), E('Curl marteau', '10 par bras'), E('Curl to rotation', '6 par côté')] },
  { name: 'Bloc 3 · Gainage', exercises: [E('Wood chop', '8 par côté'), E('Deadlift', '10'), E('Relevé de jambes', '10')] },
];

const P1_COMPLEXE = [
  E('Deadlift', '5'), E('Rowing penché à deux mains', '5'), E('Goblet squat', '5'),
  E('Curl press out', '5'), E('March to lunge', '5 par jambe'),
];

const P1_CHIPPER = [
  E('Goblet squat', '×50'), E('Deadlift', '×40'), E('Rowing penché', '×30'),
  E('Curl press out', '×20'), E('March to lunge', '×20'), E('Wood chop', '×20'),
];

const WOOD_CHOP = 'Wood chop demi-agenouillé';

const p1Complexe = (id, name, rounds, ladder) => ({
  id, phase: 1, name, short: rounds + ' rounds + finisher', record: { metric: 'time' },
  segments: [{ format: 'rounds', name: 'Complexe', rounds, restSec: 90, note: 'Sans poser le kettlebell', exercises: P1_COMPLEXE,
    finisher: { name: WOOD_CHOP, ladder, unit: 'par côté' } }],
});

const P1_TABATA = { format: 'tabata', rounds: 6, workSec: 20, restSec: 10, exercise: E('Squats sautés', '') };

export const PHASE1 = [
  { id: 'p1-moteur', phase: 1, name: 'Moteur', short: 'EMOM × 10 tours', record: { metric: 'rounds', ref: '30:10' },
    segments: [{ format: 'emom', rounds: 10, minutes: P1_EMOM }] },
  { id: 'p1-moteur-plus', phase: 1, name: 'Moteur+', short: 'EMOM × 12 tours', record: { metric: 'rounds' },
    segments: [{ format: 'emom', rounds: 12, minutes: P1_EMOM }] },
  p1Complexe('p1-complexe', 'Complexe', 8, [12, 10, 8, 6, 4]),
  p1Complexe('p1-complexe-plus', 'Complexe+', 8, [12, 10, 8, 6, 4]),
  { id: 'p1-circuit', phase: 1, name: 'Circuit', short: '3 × AMRAP 8 min', record: { metric: 'amrap', ref: '12 tours' },
    segments: [{ format: 'amrap', blockSec: 480, restSec: 120, blocks: P1_CIRCUIT }] },
  { id: 'p1-circuit-plus', phase: 1, name: 'Circuit+', short: '3 × AMRAP 8 min', record: { metric: 'amrap', ref: '12 tours' },
    segments: [{ format: 'amrap', blockSec: 480, restSec: 120, blocks: P1_CIRCUIT }] },
  { id: 'p1-chipper', phase: 1, name: 'Chipper', short: '6 étapes, splits', record: { metric: 'time', ref: '13:52' },
    segments: [{ format: 'chipper', exercises: P1_CHIPPER }] },
  { id: 'p1-boss', phase: 1, name: 'Boss final', short: 'Chipper + Tabata 6', record: { metric: 'time' },
    segments: [{ format: 'chipper', exercises: P1_CHIPPER }, P1_TABATA] },
];

/* ------------------------------- Phase 2 ------------------------------- */

const goblet = (n) => E('Goblet squat', String(n));
const cleanPress = (n) => E('Clean + développé strict', n + ' par bras', { alt: 'Curl press out devant', altInfo: 'poussée devant toi' });
const row = (n) => E('Rowing penché', n + ' par bras');
const atw = (n) => E('Around the world', n + ' par sens', { drop: true, info: '2 rotations + passage de main' });
const triceps = (n) => E('Extension triceps', String(n), { drop: true });
const halo = (n) => E('Halo', n + ' par sens', { drop: true });

const moteur2 = (id, n, name, rounds, [g, cp, r, a]) => ({
  id, phase: 2, n, name, short: 'EMOM 4 min × ' + rounds, record: { metric: 'rounds' },
  segments: [{ format: 'emom', rounds, minutes: [goblet(g), cleanPress(cp), row(r), atw(a)] }],
});

const circuit2 = (id, n, name, min, [[a1, a2, a3], [b1, b2, b3, b4], [c1, c2, c3]]) => ({
  id, phase: 2, n, name, short: '3 × AMRAP ' + min + ' min, repos 2 min', record: { metric: 'amrap' },
  segments: [{ format: 'amrap', blockSec: min * 60, restSec: 120, blocks: [
    { name: 'Bloc 1', exercises: [goblet(a1), E('Sumo deadlift', String(a2)), E('Squat sauté', String(a3))] },
    { name: 'Bloc 2', exercises: [cleanPress(b1), row(b2), triceps(b3), halo(b4)] },
    { name: 'Bloc 3', exercises: [E('Wood chop', c1 + ' par côté'), atw(c2), E('Relevé de jambes', String(c3))] },
  ] }],
});

const complexe2 = (id, n, name, rounds, reps, haloReps, ladder) => ({
  id, phase: 2, n, name, short: rounds + ' rounds, repos 90 s + finisher', record: { metric: 'time' },
  segments: [{ format: 'rounds', name: 'Complexe', rounds, restSec: 90, note: 'KB jamais posé pendant un round',
    exercises: [E('Sumo deadlift', String(reps)), E('Rowing 2 mains', String(reps)), goblet(reps), cleanPress(reps), triceps(reps), halo(haloReps)],
    finisher: { name: WOOD_CHOP, ladder, unit: 'par côté' } }],
});

export const PHASE2 = [
  moteur2('p2-s1', 1, 'S1 Moteur', 9, [12, 6, 8, 6]),
  circuit2('p2-s2', 2, 'S2 Circuit', 8, [[12, 10, 8], [6, 8, 8, 4], [8, 6, 10]]),
  complexe2('p2-s3', 3, 'S3 Complexe', 8, 5, 3, [12, 10, 8, 6, 4]),
  moteur2('p2-s4', 4, 'S4 Moteur+', 10, [14, 7, 10, 8]),
  circuit2('p2-s5', 5, 'S5 Circuit+', 9, [[14, 12, 10], [7, 10, 10, 5], [10, 8, 12]]),
  complexe2('p2-s6', 6, 'S6 Complexe+', 9, 6, 4, [14, 12, 10, 8, 6]),
  moteur2('p2-s7', 7, 'S7 Moteur++', 11, [15, 8, 10, 8]),
  circuit2('p2-s8', 8, 'S8 Circuit++', 10, [[16, 14, 12], [8, 10, 12, 6], [12, 10, 15]]),
  complexe2('p2-s9', 9, 'S9 Complexe++ (Boss final)', 10, 7, 4, [16, 14, 12, 10, 8]),
];

/** Date prévue d'une séance de Phase 2 : à partir du 14/11/2026, tous les 2 jours, à 18 h (heure locale). */
export function plannedDate(n) {
  const d = new Date(2026, 10, 14, 18, 0, 0);
  d.setDate(d.getDate() + (n - 1) * 2);
  return d;
}

/* -------------------------------- Outils ------------------------------- */

export const tools = ({ tabataRounds = 8 } = {}) => [
  { id: 'tool-tabata', phase: 0, name: 'Tabata', short: '20 s / 10 s × ' + tabataRounds, record: { metric: 'rounds' },
    segments: [{ format: 'tabata', rounds: tabataRounds, workSec: 20, restSec: 10, exercise: E('Effort', '') }] },
  { id: 'tool-rest', phase: 0, name: 'Repos 90 s', short: 'entre deux rounds', record: null,
    segments: [{ format: 'rest', sec: 90, note: 'Souffle, épaules relâchées' }] },
  { id: 'tool-free', phase: 0, name: 'Chrono libre', short: 'splits à la volée', record: null,
    segments: [{ format: 'chipper', exercises: [] }] },
];

export const SESSIONS = [...PHASE1, ...PHASE2];
export const findSession = (id, opts) => [...SESSIONS, ...tools(opts)].find((s) => s.id === id) || null;
