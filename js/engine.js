// Moteur de chrono, sans DOM : compile une séance en étapes, puis les déroule dans le temps.
// Chaque étape est chronométrée (sec > 0, passe toute seule) ou manuelle (sec = 0, passe sur appui).
// Le temps est toujours fourni par l'appelant (millisecondes), ce qui rend tout testable.

export const fmt = (s) => {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60), r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
};

const exText = (e) => e.name + (e.reps ? ' — ' + e.reps : '');

/** Version allégée (gêne à l'épaule) : remplace (`alt`) ou retire (`drop`) certains exercices. */
export function lighten(ex, light) {
  if (!light) return ex;
  if (ex.drop) return null;
  if (ex.alt) return { ...ex, name: ex.alt, info: ex.altInfo || '' };
  return ex;
}

const REST_MINUTE = { name: 'Repos actif', reps: '', info: 'marche, respiration calme', rest: true };

const builders = {
  emom(sg, si, out, light) {
    const minutes = sg.minutes.map((m) => lighten(m, light) || REST_MINUTE);
    const list = minutes.map(exText);
    for (let r = 1; r <= sg.rounds; r++) {
      minutes.forEach((m, i) => out.push({
        kind: m.rest ? 'rest' : 'work', sec: 60, label: m.name, detail: m.reps + (m.info ? ' · ' + m.info : ''),
        list, hl: i, seg: si, unit: 'Tour', round: r, rounds: sg.rounds, roundEnd: i === minutes.length - 1,
        tag: 'Min ' + (i + 1) + '/' + minutes.length, speak: m.name + (m.reps ? ', ' + m.reps : ''),
      }));
    }
    return { format: 'emom', label: 'EMOM ' + minutes.length + ' min × ' + sg.rounds, target: sg.rounds, list };
  },

  amrap(sg, si, out, light) {
    const n = sg.blocks.length;
    const blocks = sg.blocks.map((b) => ({ name: b.name, list: b.exercises.map((e) => lighten(e, light)).filter(Boolean).map(exText) }));
    blocks.forEach((b, bi) => {
      out.push({
        kind: 'work', sec: sg.blockSec, label: b.name, detail: 'AMRAP ' + sg.blockSec / 60 + ' min',
        list: b.list, hl: -1, seg: si, unit: 'Bloc', round: bi + 1, rounds: n, counter: bi,
        speak: b.name + '. ' + b.list.join(', '),
      });
      if (bi < n - 1 && sg.restSec) out.push({
        kind: 'rest', sec: sg.restSec, label: 'Repos', detail: 'Ensuite : ' + blocks[bi + 1].name,
        list: blocks[bi + 1].list, hl: -1, seg: si, speak: 'Repos',
      });
    });
    return { format: 'amrap', label: n + ' blocs AMRAP de ' + sg.blockSec / 60 + ' min', target: n, blocks: blocks.map((b) => b.name), list: blocks.flatMap((b) => [b.name + ' :', ...b.list.map((l) => '  ' + l)]) };
  },

  rounds(sg, si, out, light) {
    const list = sg.exercises.map((e) => lighten(e, light)).filter(Boolean).map(exText);
    const name = sg.name || 'Complexe';
    for (let r = 1; r <= sg.rounds; r++) {
      out.push({
        kind: 'work', sec: 0, label: name, detail: sg.note || '', list, hl: -1, seg: si, unit: 'Round',
        round: r, rounds: sg.rounds, roundEnd: true, btn: 'Round terminé', speak: 'Round ' + r,
      });
      if (r < sg.rounds && sg.restSec) out.push({
        kind: 'rest', sec: sg.restSec, label: 'Repos', detail: 'Avant le round ' + (r + 1), list, hl: -1, seg: si,
        speak: 'Repos',
      });
    }
    if (sg.finisher) {
      const f = sg.finisher, fl = f.ladder.map((n) => n + ' ' + f.unit);
      f.ladder.forEach((n, i) => out.push({
        kind: 'work', sec: 0, label: f.name, detail: n + ' ' + f.unit, list: fl, hl: i, seg: si, unit: 'Palier',
        round: i + 1, rounds: f.ladder.length, btn: 'Palier terminé', finisher: true, speak: f.name + ', ' + n + ' ' + f.unit,
      }));
    }
    return { format: 'rounds', label: sg.rounds + ' rounds' + (sg.restSec ? ', repos ' + sg.restSec + ' s' : ''), target: sg.rounds, list: sg.finisher ? [...list, 'Finisher ' + sg.finisher.name + ' ' + sg.finisher.ladder.join('-') + ' ' + sg.finisher.unit] : list };
  },

  chipper(sg, si, out, light) {
    const ex = (sg.exercises || []).map((e) => lighten(e, light)).filter(Boolean);
    if (!ex.length) {
      out.push({ kind: 'work', sec: 0, label: 'Chrono libre', detail: 'Split à chaque fin d’exercice', list: [], hl: -1, seg: si, free: true, btn: 'Split', speak: 'Go' });
      return { format: 'chipper', label: 'Chrono libre', target: 0, list: [] };
    }
    const list = ex.map(exText);
    ex.forEach((e, i) => out.push({
      kind: 'work', sec: 0, label: e.name, detail: e.reps + (e.info ? ' · ' + e.info : ''), list, hl: i, seg: si,
      unit: 'Étape', round: i + 1, rounds: ex.length, btn: 'Étape terminée', speak: e.name + ', ' + e.reps,
    }));
    return { format: 'chipper', label: 'Chipper ' + ex.length + ' étapes', target: ex.length, list };
  },

  tabata(sg, si, out) {
    const work = sg.workSec || 20, rest = sg.restSec || 10, e = sg.exercise;
    const list = [exText(e), work + ' s effort / ' + rest + ' s repos × ' + sg.rounds];
    for (let r = 1; r <= sg.rounds; r++) {
      out.push({ kind: 'work', sec: work, label: e.name, detail: 'À fond ' + work + ' s', list, hl: 0, seg: si, unit: 'Round', round: r, rounds: sg.rounds, roundEnd: true, speak: 'À fond' });
      out.push({ kind: 'rest', sec: rest, label: 'Repos', detail: r < sg.rounds ? 'Round ' + (r + 1) + ' ensuite' : 'Dernier repos', list, hl: 1, seg: si, unit: 'Round', round: r, rounds: sg.rounds, speak: 'Repos' });
    }
    return { format: 'tabata', label: 'Tabata ' + sg.rounds + ' rounds', target: sg.rounds, list };
  },

  rest(sg, si, out) {
    out.push({ kind: 'rest', sec: sg.sec, label: 'Repos', detail: sg.note || '', list: [], hl: -1, seg: si, speak: 'Repos' });
    return { format: 'rest', label: 'Repos ' + sg.sec + ' s', target: 0, list: [] };
  },
};

/**
 * Séance → plan d'étapes. `prep` : compte à rebours de départ (s), `light` : version allégée.
 * `timedSec` : somme des étapes chronométrées hors départ ; `manual` : la séance contient des étapes sur appui.
 */
export function compile(session, { prep = 10, light = false } = {}) {
  const steps = [], segments = [];
  session.segments.forEach((sg, si) => {
    const b = builders[sg.format];
    if (!b) throw new Error('format inconnu : ' + sg.format);
    segments.push(b(sg, si, steps, light));
  });
  if (prep > 0) steps.unshift({ kind: 'prep', sec: prep, label: 'Prêt', detail: 'Premier : ' + steps[0].label, list: steps[0].list, hl: steps[0].hl, seg: -1, speak: 'Prêt. ' + steps[0].label });
  const timedSec = steps.filter((s) => s.kind !== 'prep').reduce((a, s) => a + s.sec, 0);
  return { session, light, steps, segments, timedSec, manual: steps.some((s) => s.sec === 0) };
}

/**
 * Déroulement d'un plan. Les méthodes renvoient la liste des événements produits :
 * {type:'step', step} (nouvelle étape), {type:'count', n} (3-2-1 avant la fin d'une étape chronométrée),
 * {type:'finish'} (fin de séance).
 */
export class Runner {
  constructor(plan, { countdown = 3 } = {}) {
    this.plan = plan; this.steps = plan.steps; this.countdown = countdown;
    this.idx = -1; this.acc = 0; this.since = null; this.stepStart = 0; this.prepMs = 0;
    this.done = false; this.complete = false; this.lastCount = '';
    this.counts = {}; this.rounds = {}; this.splits = []; this.lapStart = 0;
  }

  get running() { return this.since !== null; }
  get step() { return this.steps[Math.max(0, Math.min(this.idx, this.steps.length - 1))]; }
  elapsed(now) { return this.acc + (this.since === null ? 0 : now - this.since); }

  start(now) {
    if (this.done || this.running) return [];
    this.since = now;
    return this.idx < 0 ? this._enter(0, 0) : [];
  }

  pause(now) {
    if (!this.running) return;
    this.acc = this.elapsed(now); this.since = null;
  }

  /** À appeler régulièrement : fait passer les étapes chronométrées échues, émet le compte à rebours. */
  update(now) {
    const ev = [];
    while (!this.done && this.idx >= 0) {
      const s = this.steps[this.idx];
      if (!s.sec) break;
      const end = this.stepStart + s.sec * 1000, t = this.elapsed(now);
      if (t >= end) { this._complete(end); ev.push(...this._enter(this.idx + 1, end)); continue; }
      const rem = Math.ceil((end - t) / 1000), key = this.idx + ':' + rem;
      if (rem <= this.countdown && s.sec > this.countdown && this.lastCount !== key) { this.lastCount = key; ev.push({ type: 'count', n: rem }); }
      break;
    }
    return ev;
  }

  /** Étape suivante : fin d'une étape manuelle (round, palier, exercice) ou « Passer ». */
  next(now) {
    if (this.done || this.idx < 0) return [];
    const at = this.elapsed(now);
    this._complete(at);
    return this._enter(this.idx + 1, at);
  }

  /** Temps intermédiaire en chrono libre, sans changer d'étape. */
  lap(now) {
    if (this.done || this.idx < 0 || !this.step.free) return null;
    const at = this.elapsed(now);
    const split = { label: 'Split ' + (this.splits.length + 1), sec: (at - this.lapStart) / 1000, seg: this.step.seg };
    this.splits.push(split); this.lapStart = at;
    return split;
  }

  /** Compteur de tours de l'AMRAP en cours (+1 / -1). */
  addRound(delta = 1) {
    const s = this.step;
    if (this.done || this.idx < 0 || s.counter === undefined) return null;
    const k = s.seg + ':' + s.counter;
    this.counts[k] = Math.max(0, (this.counts[k] || 0) + delta);
    return this.counts[k];
  }
  count(seg, block) { return this.counts[seg + ':' + block] || 0; }

  /** Arrêt : `complete` vrai pour le chrono libre (fin normale), faux pour un abandon. */
  stop(now, complete = false) {
    if (this.done) return [];
    const at = this.elapsed(now);
    if (this.idx >= 0 && this.step.free) this.lap(now);
    this.acc = at; this.since = null; this.done = true; this.complete = complete;
    if (this.idx >= 0 && this.idx < this.steps.length && this.steps[this.idx].kind === 'prep') this.prepMs = at;
    return [{ type: 'finish' }];
  }

  _complete(at) {
    const s = this.steps[this.idx];
    if (s.kind === 'prep') { this.prepMs = at; return; }
    if (s.kind === 'work' && !s.free && (!s.sec || s.unit === 'Étape')) {
      this.splits.push({ label: s.unit === 'Round' ? 'Round ' + s.round : s.unit === 'Palier' ? s.label + ' ' + s.detail : s.label, sec: (at - this.stepStart) / 1000, seg: s.seg });
    }
    if (s.roundEnd) this.rounds[s.seg] = (this.rounds[s.seg] || 0) + 1;
  }

  _enter(i, at) {
    if (i >= this.steps.length) {
      this.idx = this.steps.length; this.acc = at; this.since = null; this.done = true; this.complete = true;
      return [{ type: 'finish' }];
    }
    this.idx = i; this.stepStart = at; this.lapStart = at;
    return [{ type: 'step', step: this.steps[i] }];
  }

  /** État affichable à l'instant `now`. */
  view(now) {
    const t = this.elapsed(now), s = this.step;
    const inStep = this.idx < 0 ? 0 : (t - this.stepStart) / 1000;
    const remaining = s.sec ? (this.idx < 0 ? s.sec : Math.max(0, s.sec - inStep)) : null;
    const work = Math.max(0, t - this.prepMs) / 1000;
    return {
      idx: this.idx, step: s, next: this.steps[this.idx + 1] || null, inStep, remaining,
      elapsed: this.idx >= 0 && s.kind === 'prep' ? 0 : work, lap: (t - this.lapStart) / 1000,
      progress: this.done ? 1 : Math.max(0, this.idx) / this.steps.length,
    };
  }

  /** Résultat de la séance (pour l'écran de fin et l'historique). */
  result() {
    const durationSec = Math.round(Math.max(0, this.acc - this.prepMs) / 1000);
    return {
      durationSec, complete: this.complete,
      segments: this.plan.segments.map((m, si) => {
        const seg = {
          format: m.format, label: m.label, target: m.target, rounds: this.rounds[si] || 0,
          splits: this.splits.filter((x) => x.seg === si).map(({ label, sec }) => ({ label, sec: Math.round(sec) })),
        };
        if (m.blocks) seg.blocks = m.blocks.map((name, b) => ({ name, rounds: this.count(si, b) }));
        return seg;
      }),
    };
  }
}
