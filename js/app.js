// Interface : accueil (séances par phase), brief, chrono, fin de séance, historique, réglages.
import { compile, Runner, fmt } from './engine.js';
import { PHASE1, PHASE2, SESSIONS, tools, plannedDate, findSession, SAFETY, PHASE2_WARNING, ATW_DEF, PHASES } from './presets.js';
import * as H from './history.js';

const VERSION = '2.0.0';
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

/* ------------------------------ Stockage ------------------------------ */

const store = (() => {
  try { localStorage.setItem('_kb', '1'); localStorage.removeItem('_kb'); return localStorage; } catch {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  }
})();

const SETTINGS_KEY = 'chronokb.settings.v1';
const settings = (() => {
  const def = { sound: true, voice: true, vibrate: true, prep: 10, tabataRounds: 8 };
  try {
    const s = JSON.parse(store.getItem(SETTINGS_KEY) || 'null');
    if (s) return { ...def, ...s };
  } catch { /* réglages corrompus : valeurs par défaut */ }
  // Reprise des réglages de la v1.
  if (store.getItem('kb-beep') === '0') def.sound = false;
  if (store.getItem('kb-voice') === '0') def.voice = false;
  return def;
})();
const saveSettings = () => { try { store.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* plein */ } };

let history = H.loadHistory(store);
function persist() {
  try { H.saveHistory(store, history); } catch { toast('Stockage plein : exporte puis supprime d’anciennes séances'); }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* facultatif */ }
}

const allSessions = () => [...SESSIONS, ...tools(settings)];

/* ------------------------------ Alertes ------------------------------ */

let audioCtx = null, wake = null;
function unlockAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; } }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}
function beep(freq, dur, vol = 0.4) {
  if (!settings.sound || !audioCtx) return;
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch { /* audio indisponible */ }
}
function vibrate(pattern) {
  if (!settings.vibrate) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* non pris en charge */ }
}
function say(text) {
  if (!settings.voice || !text || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    speechSynthesis.speak(u);
  } catch { /* synthèse vocale indisponible */ }
}
function requestWake() {
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { wake = l; }).catch(() => {}); } catch { /* non pris en charge */ }
}
function releaseWake() { try { if (wake) wake.release(); } catch { /* déjà libéré */ } wake = null; }

/* ------------------------------ Navigation ------------------------------ */

const VIEWS = ['home', 'brief', 'run', 'end', 'history', 'settings'];
function show(view) {
  VIEWS.forEach((v) => { $('v-' + v).hidden = v !== view; });
  document.body.dataset.view = view;
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.go === view || (t.dataset.go === 'home' && (view === 'brief' || view === 'end'));
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  if (view === 'home') renderHome();
  if (view === 'history') renderHistory();
  if (view === 'settings') renderSettings();
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.go)));

let toastTimer = null;
function toast(text) {
  const t = $('toast');
  t.textContent = text; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

['safetyHome', 'safetyBrief', 'safetyRun'].forEach((id) => { $(id).textContent = SAFETY; });

/* -------------------------------- Accueil -------------------------------- */

const dayFmt = (d) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });

function phaseNote(now = new Date()) {
  const end1 = new Date(2026, 10, 11, 23, 59), start2 = new Date(2026, 10, 14, 0, 0);
  if (now <= end1) return 'Phase 1 en cours : ' + PHASES[0].note + '. Phase 2 dès le 14/11/2026.';
  if (now < start2) return 'Repos avant la Phase 2, qui démarre le samedi 14/11/2026 à 18 h (si accord médical).';
  return 'Phase 2 : ' + PHASES[1].note + '.';
}

function sessionItem(s, rec) {
  const b = el('button', 'item');
  b.type = 'button';
  const plan = compile(s, { prep: 0 });
  b.append(el('b', '', s.name));
  const sub = s.short + (plan.manual ? '' : ' · ' + (plan.timedSec % 60 ? fmt(plan.timedSec) : plan.timedSec / 60 + ' min'));
  b.append(el('span', 'sub', sub));
  const side = el('span', 'side');
  if (rec) { side.append(el('strong', '', rec.text)); side.append(document.createTextNode('record')); }
  else if (s.record && s.record.ref) { side.append(el('strong', '', s.record.ref)); side.append(document.createTextNode('référence')); }
  if (s.phase === 2) {
    const done = history.some((e) => e.sessionId === s.id && e.complete);
    if (done) b.classList.add('done');
    side.append(el('span', '', (side.childNodes.length ? ' · ' : '') + (done ? '✓ faite' : dayFmt(plannedDate(s.n)) + ' 18 h')));
  }
  b.append(side);
  b.addEventListener('click', () => brief(s.id));
  return b;
}

function renderHome() {
  $('phaseNote').textContent = phaseNote();
  const rec = H.records(history, allSessions());
  const fill = (id, list) => { const c = $(id); c.replaceChildren(...list.map((s) => sessionItem(s, rec[s.id]))); };
  fill('listP1', PHASE1); fill('listP2', PHASE2); fill('listTools', tools(settings));
}

/* --------------------------------- Brief --------------------------------- */

let cur = null; // { session, light, plan, runner, timer, entry, pain }

const hasLight = (s) => JSON.stringify(s.segments).match(/"(drop|alt)"/);

function brief(id) {
  const s = findSession(id, settings);
  if (!s) return;
  cur = { session: s, light: false };
  $('bPhase').textContent = s.phase ? 'Phase ' + s.phase + (s.n ? ' · séance ' + s.n + '/9' : '') : 'Outil';
  $('bName').textContent = s.name;
  $('bShort').textContent = s.short + (s.phase === 2 ? ' · prévue ' + dayFmt(plannedDate(s.n)) + ' à 18 h' : '');
  $('bWarn').hidden = s.phase !== 2;
  $('bWarn').textContent = PHASE2_WARNING;
  $('bLightRow').hidden = !hasLight(s);
  $('bLight').checked = false;
  $('bAtw').hidden = !JSON.stringify(s.segments).includes('Around the world');
  $('bAtw').textContent = ATW_DEF;
  $('bTabataRow').hidden = s.id !== 'tool-tabata';
  $('bTabata').value = settings.tabataRounds;
  const rec = H.records(history, [s])[s.id];
  const r = $('bRecord');
  r.hidden = !s.record;
  if (s.record) r.textContent = 'Record : ' + (rec ? rec.text : '—') + (s.record.ref ? ' · référence ' + s.record.ref : '') +
    (s.record.metric === 'time' ? ' (meilleur temps)' : ' (le plus de tours)');
  renderBriefList();
  show('brief');
}

function renderBriefList() {
  const plan = compile(cur.session, { prep: 0, light: cur.light });
  const box = $('bList');
  box.replaceChildren();
  plan.segments.forEach((sg) => {
    box.append(el('b', '', sg.label));
    const ul = el('ul', 'seglist');
    sg.list.forEach((l) => ul.append(el('li', '', l)));
    box.append(ul);
  });
  if (!plan.manual) box.append(el('p', 'muted small', 'Durée : ' + fmt(plan.timedSec) + ' (+ ' + settings.prep + ' s de départ)'));
}

$('bLight').addEventListener('change', (e) => { cur.light = e.target.checked; renderBriefList(); });
$('bTabata').addEventListener('change', (e) => {
  const n = Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 8));
  settings.tabataRounds = n; e.target.value = n; saveSettings();
  cur.session = findSession('tool-tabata', settings); renderBriefList();
});
$('bBack').addEventListener('click', () => show('home'));
$('bStart').addEventListener('click', startRun);

/* --------------------------------- Chrono -------------------------------- */

function startRun() {
  unlockAudio();
  const plan = compile(cur.session, { prep: settings.prep, light: cur.light });
  cur.plan = plan;
  cur.runner = new Runner(plan);
  $('rName').textContent = cur.session.name + (cur.light ? ' (allégée)' : '');
  show('run');
  handle(cur.runner.start(performance.now()));
  requestWake();
  clearInterval(cur.timer);
  cur.timer = setInterval(tick, 100);
  render();
}

function tick() {
  if (!cur || !cur.runner) return;
  handle(cur.runner.update(performance.now()));
  render();
}

function handle(events) {
  for (const ev of events) {
    if (ev.type === 'step') {
      const s = ev.step;
      beep(s.kind === 'rest' ? 700 : s.kind === 'prep' ? 1000 : 1400, 0.35);
      vibrate(s.kind === 'rest' ? [150, 80, 150] : 400);
      say(s.speak);
    } else if (ev.type === 'count') {
      beep(880, 0.12);
      vibrate(80);
      const t = $('rTime'); t.classList.remove('count'); void t.offsetWidth; t.classList.add('count');
    } else if (ev.type === 'finish') {
      beep(1400, 0.2); setTimeout(() => beep(1400, 0.2), 260); setTimeout(() => beep(1800, 0.6), 520);
      vibrate([200, 100, 200, 100, 500]);
      say('Terminé');
      endRun();
      return;
    }
  }
}

function render() {
  const r = cur.runner, now = performance.now(), v = r.view(now), s = v.step, plan = cur.plan;
  const card = $('card');
  card.dataset.kind = r.done ? 'done' : s.kind;
  $('rLabel').textContent = s.label;
  $('rTime').textContent = v.remaining !== null ? fmt(Math.ceil(v.remaining - 1e-6)) : s.free ? fmt(v.lap) : fmt(v.inStep);
  let detail = s.detail || '';
  if (s.counter !== undefined) detail = 'Tours : ' + r.count(s.seg, s.counter) + ' · ' + detail;
  $('rDetail').textContent = detail;
  $('rRound').textContent = s.unit && s.round ? s.unit + ' ' + s.round + '/' + s.rounds + (s.tag ? ' · ' + s.tag : '') : s.free ? 'Splits : ' + r.splits.length : '';
  $('rTotal').textContent = fmt(v.elapsed) + (plan.manual ? '' : ' / ' + fmt(plan.timedSec));
  const prog = plan.manual ? v.progress : Math.min(1, v.elapsed / Math.max(1, plan.timedSec));
  $('rBar').style.width = (prog * 100).toFixed(1) + '%';
  $('rNext').textContent = v.next ? 'Ensuite : ' + v.next.label + (v.next.detail && v.next.kind === 'work' ? ' — ' + v.next.detail : '') : 'Dernière étape';
  $('rSeg').textContent = s.seg >= 0 && plan.segments.length > 1 ? plan.segments[s.seg].label : '';

  const act = $('rAct');
  const counting = s.counter !== undefined && s.kind === 'work';
  if (counting) {
    act.hidden = false;
    act.replaceChildren(document.createTextNode('+1 tour'), el('span', 'n', r.count(s.seg, s.counter) + ' tours dans ce bloc'));
  } else if (s.btn && s.kind === 'work') {
    act.hidden = false;
    act.replaceChildren(document.createTextNode(s.btn), el('span', 'n', s.free ? 'temps intermédiaire' : 'puis étape suivante'));
  } else act.hidden = true;
  act.disabled = !r.running;
  $('rMinus').hidden = !counting;
  $('rPause').textContent = r.running ? 'Pause' : 'Reprendre';
  $('rSkip').hidden = !!s.free;
  $('rStop').textContent = s.free ? 'Fin' : 'Terminer';

  const ul = $('rList');
  const key = s.seg + '|' + (s.list || []).join('|');
  if (ul.dataset.key !== key) {
    ul.dataset.key = key;
    ul.replaceChildren(...(s.list || []).map((l) => el('li', '', l)));
  }
  [...ul.children].forEach((li, i) => li.classList.toggle('on', i === s.hl && s.kind !== 'prep'));
}

$('rAct').addEventListener('click', () => {
  const r = cur.runner, s = r.step, now = performance.now();
  if (!r.running) return;
  if (s.counter !== undefined) { r.addRound(1); beep(1000, 0.08); vibrate(40); }
  else if (s.free) { const x = r.lap(now); if (x) { beep(1200, 0.12); toast(x.label + ' : ' + fmt(x.sec)); } }
  else handle(r.next(now));
  render();
});
$('rMinus').addEventListener('click', () => { cur.runner.addRound(-1); render(); });
$('rPause').addEventListener('click', () => {
  const r = cur.runner, now = performance.now();
  unlockAudio();
  if (r.running) { r.pause(now); releaseWake(); if (window.speechSynthesis) speechSynthesis.cancel(); }
  else { handle(r.start(now)); requestWake(); }
  render();
});
$('rSkip').addEventListener('click', () => { handle(cur.runner.next(performance.now())); render(); });
$('rStop').addEventListener('click', () => {
  const r = cur.runner;
  if (r.step.free) { handle(r.stop(performance.now(), true)); return; }
  if (!confirm('Terminer la séance maintenant ? Elle sera marquée comme non terminée.')) return;
  handle(r.stop(performance.now(), false));
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && cur && cur.runner && cur.runner.running) { requestWake(); tick(); }
});

/* ---------------------------- Fin de séance ---------------------------- */

function endRun() {
  clearInterval(cur.timer); cur.timer = null;
  releaseWake();
  cur.entry = H.makeEntry({ session: cur.session, result: cur.runner.result(), light: cur.light });
  cur.pain = null;
  $('eName').textContent = cur.session.name;
  const ul = $('eRes');
  ul.replaceChildren(...H.resultLines(cur.entry).map(([k, v]) => { const li = el('li'); li.append(el('span', '', k), el('strong', '', v)); return li; }));
  const pain = $('ePain');
  pain.replaceChildren();
  for (let i = 0; i <= 10; i++) {
    const b = el('button', i > 3 ? 'hi' : '', String(i));
    b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { cur.pain = i; updateEnd(); });
    pain.append(b);
  }
  $('eNote').value = '';
  updateEnd();
  show('end');
}

function endEntry() { return { ...cur.entry, pain: cur.pain, note: $('eNote').value.trim().slice(0, 2000) }; }
function updateEnd() {
  [...$('ePain').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === cur.pain)));
  $('ePainWarn').hidden = !(cur.pain > 3);
  $('eText').textContent = H.summaryText(endEntry());
}
$('eNote').addEventListener('input', updateEnd);

async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); toast('Copié'); }
  catch {
    // Repli : sélection manuelle (anciens navigateurs, contexte non sécurisé).
    const ta = el('textarea'); ta.value = text; btn.after(ta); ta.focus(); ta.select();
    toast('Sélectionne le texte puis copie-le');
  }
}
$('eCopy').addEventListener('click', (e) => copyText(H.summaryText(endEntry()), e.currentTarget));
$('eSave').addEventListener('click', () => {
  history = H.mergeEntries(history, [endEntry()]).entries;
  persist();
  toast('Séance enregistrée');
  cur = null;
  show('history');
});
$('eDiscard').addEventListener('click', () => {
  if (!confirm('Ne pas garder cette séance dans l’historique ?')) return;
  cur = null;
  show('home');
});

/* ------------------------------ Historique ------------------------------ */

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const stamp = () => new Date().toISOString().slice(0, 10);

function renderHistory() {
  const sessions = allSessions();
  const rec = H.records(history, sessions);
  const box = $('hRecords');
  box.replaceChildren();
  const rows = sessions.filter((s) => s.record && (rec[s.id] || s.record.ref));
  if (!rows.length) box.append(el('p', 'muted', 'Pas encore de record.'));
  rows.forEach((s) => {
    const d = el('div', 'rec');
    d.append(el('span', '', (s.phase ? 'P' + s.phase + ' · ' : '') + s.name),
      el('strong', '', (rec[s.id] ? rec[s.id].text : '—') + (s.record.ref ? ' (réf. ' + s.record.ref + ')' : '')));
    box.append(d);
  });

  const list = $('hList');
  list.replaceChildren();
  if (!history.length) list.append(el('p', 'muted', 'Aucune séance enregistrée.'));
  history.forEach((e) => {
    const s = sessions.find((x) => x.id === e.sessionId);
    const metric = s && s.record ? s.record.metric : null;
    const val = metric && metric !== 'time' ? ' · ' + H.metricText(H.metricValue(e, metric), metric) : '';
    const d = el('details', 'entry');
    const sum = el('summary', '', new Date(e.date).toLocaleDateString('fr-FR') + ' · ' + e.sessionName + ' · ' + fmt(e.durationSec) + val +
      (e.pain !== null ? ' · douleur ' + e.pain : '') + (e.complete ? '' : ' · arrêtée'));
    const pre = el('pre', '', H.summaryText(e));
    const row = el('div', 'row');
    const cp = el('button', 'btn', 'Copier'); cp.type = 'button';
    cp.addEventListener('click', (ev) => copyText(H.summaryText(e), ev.currentTarget));
    const del = el('button', 'btn danger', 'Supprimer'); del.type = 'button';
    del.addEventListener('click', () => {
      if (!confirm('Supprimer cette séance de l’historique ?')) return;
      history = history.filter((x) => x.id !== e.id); persist(); renderHistory();
    });
    row.append(cp, del);
    d.append(sum, pre, row);
    list.append(d);
  });
}
$('hCsv').addEventListener('click', () => download('chronokb-' + stamp() + '.csv', H.toCSV(history), 'text/csv;charset=utf-8'));
$('hJson').addEventListener('click', () => download('chronokb-' + stamp() + '.json', H.toJSON(history), 'application/json'));
$('hImport').addEventListener('click', () => $('hFile').click());
$('hFile').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const incoming = H.parseImport(await f.text());
    const m = H.mergeEntries(history, incoming);
    history = m.entries; persist(); renderHistory();
    toast(m.added + ' séance' + (m.added > 1 ? 's' : '') + ' importée' + (m.added > 1 ? 's' : ''));
  } catch (err) { toast(err.message); }
});

/* ------------------------------- Réglages ------------------------------- */

function renderSettings() {
  $('sSound').checked = settings.sound;
  $('sVoice').checked = settings.voice;
  $('sVibrate').checked = settings.vibrate;
  $('sVibrateNote').hidden = !!navigator.vibrate;
  $('sPrep').value = String(settings.prep);
  $('sVersion').textContent = 'Version ' + VERSION + ' · licence MIT';
}
$('sSound').addEventListener('change', (e) => { settings.sound = e.target.checked; saveSettings(); });
$('sVoice').addEventListener('change', (e) => { settings.voice = e.target.checked; saveSettings(); if (!e.target.checked && window.speechSynthesis) speechSynthesis.cancel(); });
$('sVibrate').addEventListener('change', (e) => { settings.vibrate = e.target.checked; saveSettings(); });
$('sPrep').addEventListener('change', (e) => { settings.prep = parseInt(e.target.value, 10) || 0; saveSettings(); });
$('sTest').addEventListener('click', () => { unlockAudio(); setTimeout(() => beep(1400, 0.3), 50); vibrate(300); say('Test'); });

/* -------------------------------- Départ -------------------------------- */

window.addEventListener('beforeunload', (e) => { if (cur && cur.runner && !cur.runner.done && cur.runner.idx >= 0) e.preventDefault(); });
show('home');
