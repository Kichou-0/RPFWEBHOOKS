const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Icônes (traits fins, héritent de la couleur du texte) ----------
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c2 .6 3.3 2.3 3.7 5.2"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  logout: '<path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
  palette: '<path d="M12 3a9 9 0 100 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>',
  deposit: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  withdraw: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  target: '<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  gun: '<path d="M3 9h12l2 2h4v3h-6l-1 4H8l1-4H3z"/>',
  ammo: '<path d="M9 3h6l1 5H8z"/><path d="M8 8h8v13H8z"/>',
  pill: '<rect x="2.5" y="9" width="19" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6v2M12 16v2"/>',
  tool: '<path d="M14.7 6.3a4 4 0 005 5L21 13l-8 8a2.1 2.1 0 01-3-3l8-8z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2M16 7l3 3M14 9l2 2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
};
const ico = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const hydrateIcons = (root = document) => root.querySelectorAll('[data-ico]').forEach((el) => { if (!el.querySelector('svg')) el.insertAdjacentHTML('afterbegin', ico(el.dataset.ico)); });

// ---------- Catégories ----------
const CATS = {
  armes: { label: 'Armes', color: '#ff6b6b', icon: 'gun' },
  munitions: { label: 'Munitions', color: '#f0a64a', icon: 'ammo' },
  drogues: { label: 'Drogues', color: '#b08cf0', icon: 'pill' },
  farm: { label: 'Farm', color: '#6fcf7f', icon: 'leaf' },
  argent: { label: 'Argent et valeurs', color: '#e6c15a', icon: 'coin' },
  outils: { label: 'Outils', color: '#5fa8e8', icon: 'tool' },
  materiaux: { label: 'Matériaux', color: '#a4a8b0', icon: 'layers' },
  autre: { label: 'Autre', color: '#c4a77d', icon: 'box' },
};
const CAT_ORDER = Object.keys(CATS);
const catInfo = (c) => CATS[c] || { label: c.charAt(0).toUpperCase() + c.slice(1), color: '#c4a77d', icon: 'box' };

const ACTIONS = { deposit: 'Dépôt', withdraw: 'Retrait', kill: 'Kill', death: 'Mort', join: 'Arrivée', leave: 'Départ', info: 'Info' };
const actLabel = (a) => ACTIONS[a] || a;
const actIcon = (a) => ({ deposit: 'deposit', withdraw: 'withdraw', kill: 'target', death: 'target' }[a] || 'info');

const VIEWS = {
  overview: ['Aperçu', "L'état du groupe en un coup d'œil."],
  stock: ['Coffre', 'Tout ce qui est stocké, rangé par catégorie.'],
  logs: ['Logs', 'Chaque dépôt, retrait et événement envoyé par le serveur.'],
  members: ['Membres', 'Qui est en ligne et qui a été vu récemment.'],
  money: ['Argent', 'Argent propre (nos comptes, saisi sur le site) et argent cash (relevé par le serveur).'],
  settings: ['Réglages', 'Tout ce qui se règle sur le site. Réservé aux administrateurs.'],
  profile: ['Profil', 'Ton accès et la présentation du site, pour toi seulement.'],
};
const PAGE_IDS = ['overview', 'stock', 'logs', 'members', 'money'];
const THEMES = ['navy', 'anthracite', 'feutre', 'minuit', 'clair'];

const state = { layout: null, editing: false, drag: null, me: null, group: 'default', data: null, shelf: 'all', logFilter: '', view: 'overview', chart: null, shown: {} };
const can = (p) => !!state.me?.perms?.[p];
const nf = new Intl.NumberFormat('fr-FR');
const money = (n) => '$' + nf.format(Math.round(n || 0));
const fmtTime = (ts) => new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const ago = (ts, prefix = 'Vu ') => {
  if (!ts) return 'Jamais vu';
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${prefix}il y a ${s} s`;
  if (s < 3600) return `${prefix}il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `${prefix}il y a ${Math.floor(s / 3600)} h`;
  return `${prefix}il y a ${Math.floor(s / 86400)} j`;
};
const plural = (n, w, pl) => `${nf.format(n)} ${n > 1 ? pl || w + 's' : w}`;
const groupLabel = (g) => state.me?.settings?.groupLabels?.[g] || (g === 'default' ? 'Mon groupe' : g);

// ---------- Images : image réelle si dispo, sinon monogramme ----------
function imgUrl(it) {
  if (it.image) return it.image;
  if (state.me?.imageBase) return state.me.imageBase.replace('{name}', encodeURIComponent(it.name));
  return '';
}
const isUrl = (v) => /^(https?:\/\/|\/)/i.test(v);
function plateContent(it) {
  const mono = esc(String(it.label || it.name).trim().slice(0, 2));
  if (it.icon) return isUrl(it.icon)
    ? `<img src="${esc(it.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><b class="mono" hidden>${mono}</b>`
    : `<b class="emo">${esc(it.icon)}</b>`;
  const u = imgUrl(it);
  if (!u) return `<b class="mono">${mono}</b>`;
  return `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><b class="mono" hidden>${mono}</b>`;
}
const catOf = (name) => state.data?.stock.find((s) => s.name === name)?.category || 'autre';

// ---------- Réseau ----------
async function api(url) {
  const r = await fetch(url);
  if (r.status === 401) { location.href = '/login'; throw new Error('401'); }
  return r.json();
}
async function adminApi(method, url, body) {
  const r = await fetch(url, { method, headers: { 'content-type': 'application/json', 'x-requested-with': 'dashboard' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.status === 401) { location.href = '/login'; throw new Error('401'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Une erreur est survenue.');
  return j;
}
async function load() {
  state.data = await api('/api/state?group=' + encodeURIComponent(state.group));
  render();
}
async function loadMe() {
  state.me = await api('/api/me?group=' + encodeURIComponent(state.group));
  state.group = state.me.group;
  if (!state.editing) state.layout = state.me.layout;
}
async function loadAll() {
  await loadMe();
  applyMe();
  await load();
  if (state.view === 'settings' && !SET.editor) await loadSettings();
}

let toastTimer;
function toast(msg, isErr = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('err', isErr);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, isErr ? 5000 : 2200);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copié'); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copié'); } catch { toast('Copie impossible, sélectionne le texte à la main.', true); }
    ta.remove();
  }
}

// ---------- Nombres d'argent qui se comptent ----------
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function countTo(el, to) {
  const key = el.dataset.k;
  const from = state.shown[key] ?? 0;
  state.shown[key] = to;
  if (reduceMotion || document.documentElement.dataset.motion === 'off' || from === to || state.me?.settings?.options?.animateNumbers === false) { el.textContent = money(to); return; }
  const t0 = performance.now(), dur = 650;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = money(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const lastMoney = (d) => d.money[d.money.length - 1] || { clean: 0, dirty: 0 };

const stat = (icon, label, valueHTML, hint = '') =>
  `<div class="card stat"><div class="top"><span class="tile">${ico(icon)}</span>${esc(label)}</div><div class="val">${valueHTML}${hint ? `<span class="hint">${hint}</span>` : ''}</div></div>`;
const moneyNum = (key, cls) => `<span class="num ${cls}" data-k="${key}">$0</span>`;
const startCounts = (root, m) => root.querySelectorAll('.num[data-k]').forEach((el) => countTo(el, el.dataset.k.endsWith('c') ? m.clean : m.dirty));
const deltaText = (d, a, b) => {
  if (!d.money.length) return 'Aucun relevé reçu';
  const v = a - b;
  return v === 0 ? 'Stable sur la période' : `<span class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : '−'}${money(Math.abs(v))}</span> sur la période relevée`;
};

function render() {
  const d = state.data;
  if (!d || !state.me) return;
  renderOverview(d);
  renderStock(d);
  renderLogs(d);
  renderMembers(d);
  renderMoney(d);
}

// ---------- Aperçu ----------
function describe(l) {
  if (l.item) {
    const n = l.count ? `${nf.format(l.count)} × ` : '';
    const verb = l.action === 'deposit' ? 'a déposé' : l.action === 'withdraw' ? 'a retiré' : actLabel(l.action).toLowerCase();
    return `${verb} ${n}${l.label || l.item}`;
  }
  return l.message || actLabel(l.action);
}
function mvRows(list) {
  if (!list.length) return '<div class="empty">Aucun mouvement pour le moment. Chaque dépôt ou retrait fait sur le site apparaît ici.</div>';
  return list
    .map((l) => `<div class="mv"><span class="tile ${esc(l.action)}">${ico(actIcon(l.action))}</span><div class="grow"><div class="who">${esc(l.player)}</div><div class="what">${esc(describe(l))}</div></div><span class="when">${fmtTime(l.ts)}</span></div>`)
    .join('');
}

// ---------- Aperçu : widgets personnalisables ----------
const trendSvg = (d) => {
  const pts = d.money.slice(-60);
  if (pts.length < 2) return '<div class="empty">Pas encore assez de relevés pour tracer une courbe.</div>';
  const line = (k, color) => {
    const vals = pts.map((p) => p[k] ?? 0), lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
    return `<polyline fill="none" stroke="${color}" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round" points="${vals.map((v, i) => `${(i / (vals.length - 1)) * 300},${92 - ((v - lo) / span) * 84}`).join(' ')}"/>`;
  };
  return `<svg class="trend" viewBox="0 0 300 100" preserveAspectRatio="none" role="img" aria-label="Évolution de l’argent">${line('clean', 'var(--clean)')}${can('money.dirty') ? line('dirty', 'var(--dirty)') : ''}</svg>`;
};
const deltaShort = (d, a, b) => {
  if (!d.money.length) return 'Aucun relevé';
  const v = a - b;
  return v === 0 ? 'Stable' : `<span class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : '−'}${money(Math.abs(v))}</span>`;
};
const WIDGETS = {
  'money.clean': { label: 'Argent propre', icon: 'wallet', need: ['view.money'], w: 3, h: 2, min: 2, body: (d) => `<div class="wval">${moneyNum('oc', 'clean')}<span class="hint">${deltaShort(d, lastMoney(d).clean, (d.money[0] || lastMoney(d)).clean)}${can('money.edit') ? ' · <a href="#" class="lnk" data-clean-edit data-acct="clean">Modifier</a>' : ''}</span></div>` },
  'money.dirty': { label: 'Argent cash', icon: 'wallet', need: ['view.money', 'money.dirty'], w: 3, h: 2, min: 2, body: (d) => `<div class="wval">${moneyNum('od', 'dirty')}<span class="hint">${deltaShort(d, lastMoney(d).dirty, (d.money[0] || lastMoney(d)).dirty)}${can('money.cash.edit') ? ' · <a href="#" class="lnk" data-clean-edit data-acct="cash">Modifier</a>' : ''}</span></div>` },
  'stock.count': { label: 'Coffre', icon: 'box', need: ['view.stock'], w: 3, h: 2, min: 2, body: (d) => `<div class="wval"><span class="num">${nf.format(d.stock.length)}</span><span class="hint">réf. · ${plural(d.stock.reduce((a, i) => a + i.count, 0), 'pièce')}</span></div>` },
  'members.online': { label: 'Membres en ligne', icon: 'users', need: ['view.members'], w: 3, h: 2, min: 2, body: (d) => `<div class="wval"><span class="num">${d.members.filter((x) => x.online).length} / ${d.members.length}</span><span class="hint">${d.members.length ? 'connectés' : 'Aucun membre'}</span></div>` },
  'money.trend': { label: 'Évolution de l’argent', icon: 'wallet', need: ['view.money'], w: 6, h: 3, min: 3, body: (d) => trendSvg(d) },
  'logs.recent': { label: 'Derniers mouvements', icon: 'list', need: ['view.logs'], w: 7, h: 5, min: 3, body: (d) => mvRows(d.logs.slice(0, 12)) },
  'stock.shelves': { label: 'Le coffre en bref', icon: 'box', need: ['view.stock'], w: 5, h: 3, min: 3, body: (d) => {
    const by = {};
    for (const it of d.stock) by[it.category] = (by[it.category] || 0) + 1;
    const keys = [...CAT_ORDER, ...Object.keys(by).filter((c) => !CAT_ORDER.includes(c))].filter((c) => by[c]);
    const max = Math.max(1, ...keys.map((k) => by[k]));
    return keys.length
      ? `<div class="bars">${keys.map((k) => { const c = catInfo(k); return `<div class="bar" style="--c:${c.color}"><div class="row"><span>${esc(c.label)}</span><span>${plural(by[k], 'référence')}</span></div><div class="track"><div class="fill" style="width:${(by[k] / max) * 100}%"></div></div></div>`; }).join('')}</div>`
      : '<div class="empty">Le coffre est vide pour le moment.</div>';
  } },
  'members.list': { label: 'Connectés', icon: 'users', need: ['view.members'], w: 5, h: 2, min: 2, body: (d) => {
    const on = d.members.filter((x) => x.online);
    return on.length ? on.map((m) => `<div class="online"><span class="lamp on"></span>${esc(m.name)}<small>${esc(m.grade)}</small></div>`).join('') : '<div class="empty">Personne n’est connecté.</div>';
  } },
  'stock.top': { label: 'Plus grosses quantités', icon: 'box', need: ['view.stock'], w: 4, h: 4, min: 3, body: (d) => {
    const top = [...d.stock].sort((a, b) => b.count - a.count).slice(0, 8);
    return top.length ? top.map((i) => `<div class="toprow"><span class="plate">${plateContent(i)}</span><span class="nm">${esc(i.label)}</span><b>×${nf.format(i.count)}</b></div>`).join('') : '<div class="empty">Le coffre est vide pour le moment.</div>';
  } },
};
const DEFAULT_LAYOUT = ['money.clean', 'money.dirty', 'stock.count', 'members.online', 'logs.recent', 'stock.shelves', 'members.list'];
const widgetOk = (t) => !!WIDGETS[t] && WIDGETS[t].need.every(can);
const currentLayout = () => (state.layout || DEFAULT_LAYOUT.map((t) => ({ t, w: WIDGETS[t].w, h: WIDGETS[t].h })));

function renderOverview(d) {
  if (state.drag) return;
  const canEdit = can('overview.customize');
  if (!canEdit) state.editing = false;
  const grid = $('#wgrid');
  grid.classList.toggle('edit', state.editing);
  const list = currentLayout().filter((x) => widgetOk(x.t));
  grid.innerHTML = list.map((x) => {
    const W = WIDGETS[x.t];
    return `<div class="card widget" data-t="${esc(x.t)}" style="--w:${x.w};--h:${x.h}"><div class="wh"><span class="tile">${ico(W.icon)}</span><b>${esc(W.label)}</b>${state.editing ? `<button class="wx" data-wdel="${esc(x.t)}" aria-label="Retirer ${esc(W.label)}" title="Retirer">${ico('trash')}</button>` : ''}</div><div class="wbody">${W.body(d)}</div>${state.editing ? '<span class="rz" aria-hidden="true"></span>' : ''}</div>`;
  }).join('');
  $('#wEmpty').hidden = list.length > 0;
  const bar = $('#ovBar');
  bar.hidden = !canEdit;
  if (canEdit) {
    const free = Object.keys(WIDGETS).filter((t) => widgetOk(t) && !currentLayout().some((x) => x.t === t));
    bar.innerHTML = state.editing
      ? `<span class="hint">Glisse l’en-tête d’un widget pour le déplacer, tire le coin pour le redimensionner.</span><span class="grow"></span>
         <div class="addwrap"><button class="btn sm" id="wAdd" ${free.length ? '' : 'disabled'}>${ico('plus')}Ajouter un widget</button><div class="addmenu" id="wAddMenu" hidden>${free.map((t) => `<button data-wadd="${esc(t)}">${ico(WIDGETS[t].icon)}${esc(WIDGETS[t].label)}</button>`).join('')}</div></div>
         <button class="btn sm" data-wact="reset">${ico('refresh')}Réinitialiser</button><button class="btn sm primary" data-wact="done">Terminé</button>`
      : `<span class="grow"></span><button class="btn sm" data-wact="edit">${ico('sliders')}Personnaliser</button>`;
  }
  grid.querySelectorAll('.num[data-k]').forEach((el) => countTo(el, el.dataset.k.endsWith('c') ? lastMoney(d).clean : lastMoney(d).dirty));
}

// --- Enregistrement de la disposition (par accès et par groupe)
let layoutTimer;
function saveLayout(now) {
  clearTimeout(layoutTimer);
  const go = () => adminApi('PUT', '/api/layout', { group: state.group, widgets: state.layout }).catch((e) => toast(e.message, true));
  if (now) go(); else layoutTimer = setTimeout(go, 500);
}
const ensureLayout = () => { if (!state.layout) state.layout = currentLayout().map((x) => ({ ...x })); return state.layout; };

$('#ovBar').addEventListener('click', (e) => {
  const act = e.target.closest('[data-wact]')?.dataset.wact;
  if (act === 'edit') { state.editing = true; renderOverview(state.data); }
  else if (act === 'done') { state.editing = false; saveLayout(true); renderOverview(state.data); }
  else if (act === 'reset') {
    if (!confirm('Revenir à la disposition de départ ?')) return;
    state.layout = null; clearTimeout(layoutTimer);
    adminApi('PUT', '/api/layout', { group: state.group, widgets: null }).catch((er) => toast(er.message, true));
    renderOverview(state.data);
  } else if (e.target.closest('#wAdd')) { $('#wAddMenu').hidden = !$('#wAddMenu').hidden; }
  const add = e.target.closest('[data-wadd]')?.dataset.wadd;
  if (add) { const W = WIDGETS[add]; ensureLayout().push({ t: add, w: W.w, h: W.h }); saveLayout(); renderOverview(state.data); }
});
$('#wgrid').addEventListener('click', (e) => {
  const del = e.target.closest('[data-wdel]')?.dataset.wdel;
  if (!del) return;
  state.layout = ensureLayout().filter((x) => x.t !== del); saveLayout(); renderOverview(state.data);
});

// --- Déplacer et redimensionner (souris et tactile)
$('#wgrid').addEventListener('pointerdown', (e) => {
  if (!state.editing || e.button > 0) return;
  const el = e.target.closest('.widget');
  if (!el || e.target.closest('.wx')) return;
  const grid = $('#wgrid'), t = el.dataset.t;
  const item = ensureLayout().find((x) => x.t === t);
  if (!item) return;
  if (e.target.closest('.rz')) {
    e.preventDefault();
    const gap = 14, rowH = 70, rect = el.getBoundingClientRect(), gw = grid.getBoundingClientRect().width;
    const colW = (gw - gap * 11) / 12, min = WIDGETS[t].min || 2;
    state.drag = { type: 'resize' };
    el.classList.add('moving');
    const move = (ev) => {
      item.w = Math.min(12, Math.max(min, Math.round((ev.clientX - rect.left + gap) / (colW + gap))));
      item.h = Math.min(10, Math.max(1, Math.round((ev.clientY - rect.top + gap) / (rowH + gap))));
      el.style.setProperty('--w', item.w); el.style.setProperty('--h', item.h);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); el.classList.remove('moving'); state.drag = null; saveLayout(); };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  } else if (e.target.closest('.wh')) {
    e.preventDefault();
    const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    const ghost = el.cloneNode(true);
    ghost.classList.add('ghost'); ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
    document.body.appendChild(ghost);
    el.classList.add('moving');
    state.drag = { type: 'move' };
    const place = (ev) => { ghost.style.left = ev.clientX - ox + 'px'; ghost.style.top = ev.clientY - oy + 'px'; };
    place(e);
    const move = (ev) => {
      place(ev);
      ghost.hidden = true;
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.widget');
      ghost.hidden = false;
      if (!over || over === el || over.parentNode !== grid) return;
      const b = over.getBoundingClientRect();
      const after = ev.clientY > b.top + b.height / 2 && ev.clientX > b.left + b.width / 2 ? true : ev.clientY > b.bottom - b.height / 4;
      grid.insertBefore(el, after ? over.nextSibling : over);
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      ghost.remove(); el.classList.remove('moving'); state.drag = null;
      const order = [...grid.querySelectorAll('.widget')].map((w) => w.dataset.t);
      const rest = ensureLayout().filter((x) => !order.includes(x.t));
      state.layout = [...order.map((tt) => state.layout.find((x) => x.t === tt)), ...rest];
      saveLayout();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
});

// ---------- Icônes des items (choisies à la main) ----------
const EMOJI_SETS = {
  'Armes & munitions': ['🔫', '🔪', '🗡️', '🪓', '💣', '🧨', '🛡️', '🎯', '🔦', '🧰'],
  'Drogues': ['🌿', '🍃', '💊', '💉', '🍄', '❄️', '🚬', '🧪', '⚗️', '🌱'],
  'Argent': ['💵', '💰', '💎', '🪙', '💳', '🏦', '⌚', '📿', '👑', '🧾'],
  'Outils & matériaux': ['🔧', '🔨', '⚙️', '🔩', '🪛', '🔋', '📡', '📱', '💻', '🔑'],
  'Divers': ['📦', '🎒', '🧱', '🪵', '⛏️', '🍞', '🥤', '🍖', '🚗', '⭐'],
};
function openIconPicker(name) {
  const it = state.data.stock.find((x) => x.name === name);
  if (!it) return;
  document.querySelector('#iconModal')?.remove();
  const m = document.createElement('div');
  m.id = 'iconModal'; m.className = 'modal';
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="Icône de ${esc(it.label)}">
    <div class="card-h"><span class="plate big" id="icPrev">${plateContent(it)}</span><div><h3>${esc(it.label)}</h3><div class="hint">${esc(it.name)}</div></div></div>
    <label class="lbl" for="icInput">Emoji ou adresse d’une image</label>
    <input class="inp" id="icInput" maxlength="300" placeholder="🔫  ou  https://mon-site.com/arme.png" value="${esc(it.icon || '')}" autocomplete="off">
    <div class="emojis">${Object.entries(EMOJI_SETS).map(([g, l]) => `<div class="setgroup">${esc(g)}</div><div class="emrow">${l.map((x) => `<button type="button" data-em="${x}">${x}</button>`).join('')}</div>`).join('')}</div>
    <div class="btns" style="margin-top:18px"><button class="btn primary" data-ic="save">Enregistrer</button><button class="btn" data-ic="clear">Retirer l’icône</button><button class="btn" data-ic="cancel">Annuler</button></div></div>`;
  document.body.appendChild(m);
  const inp = m.querySelector('#icInput');
  const preview = () => { m.querySelector('#icPrev').innerHTML = plateContent({ ...it, icon: inp.value.trim() }); };
  inp.addEventListener('input', preview);
  m.addEventListener('click', (e) => {
    if (e.target === m) return m.remove();
    const em = e.target.closest('[data-em]');
    if (em) { inp.value = em.dataset.em; preview(); return; }
    const act = e.target.closest('[data-ic]')?.dataset.ic;
    if (!act) return;
    if (act === 'cancel') return m.remove();
    const icon = act === 'clear' ? '' : inp.value.trim();
    adminApi('PUT', '/api/stock/icon', { group: state.group, name, icon }).then(() => { m.remove(); toast(icon ? 'Icône enregistrée' : 'Icône retirée'); return load(); }).catch((er) => toast(er.message, true));
  });
  document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape') { m.remove(); document.removeEventListener('keydown', esc2); } });
  inp.focus();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-icon-edit]');
  if (b) openIconPicker(b.dataset.iconEdit);
});

// ---------- Logs ----------
function renderLogs(d) {
  const q = $('#logSearch').value.trim().toLowerCase();
  const f = state.logFilter;
  const list = d.logs.filter((l) => {
    const okF = !f || (f === 'other' ? l.action !== 'deposit' && l.action !== 'withdraw' : l.action === f);
    return okF && (!q || [l.player, l.item, l.label, l.message, l.action].some((v) => String(v || '').toLowerCase().includes(q)));
  }).slice(0, 300);
  if (!list.length) { $('#logTable').innerHTML = `<div class="empty">${d.logs.length ? 'Aucun log ne correspond.' : 'Aucun log reçu pour le moment.'}</div>`; return; }
  $('#logTable').innerHTML = `<table class="t"><thead><tr><th>Quand</th><th>Joueur</th><th>Action</th><th>Détail</th><th class="q">Qté</th></tr></thead><tbody>${list
    .map((l) => {
      const sign = l.action === 'deposit' ? '+' : l.action === 'withdraw' ? '−' : '';
      const it = l.item ? { name: l.item, label: l.label, category: catOf(l.item) } : null;
      const detail = it
        ? `<div class="cell"><span class="plate thumb" style="--c:${catInfo(it.category).color}">${plateContent(it)}</span><span>${esc(l.label || l.item)}${l.message ? ` <span class="note">${esc(l.message)}</span>` : ''}</span></div>`
        : `<span class="note">${esc(l.message)}</span>`;
      return `<tr><td class="when">${fmtTime(l.ts)}</td><td class="who">${esc(l.player)}</td><td><span class="badge ${esc(l.action)}">${esc(actLabel(l.action))}</span></td><td>${detail}</td><td class="q">${l.count ? sign + nf.format(l.count) : ''}</td></tr>`;
    })
    .join('')}</tbody></table>`;
}

// ---------- Coffre ----------
function renderStock(d) {
  const by = {};
  for (const it of d.stock) (by[it.category] ||= []).push(it);
  const allCats = [...CAT_ORDER, ...Object.keys(by).filter((c) => !CAT_ORDER.includes(c)).sort()];
  if (state.shelf !== 'all' && !by[state.shelf]) state.shelf = 'all';
  const qty = (l = []) => l.reduce((a, i) => a + i.count, 0);

  $('#stockAdd').hidden = !can('stock.edit');
  $('#stockSummary').textContent = `${plural(d.stock.length, 'référence')}, ${plural(qty(d.stock), 'pièce')}`;
  const pill = (key, label, color, n) =>
    `<button class="pill ${state.shelf === key ? 'active' : ''} ${n === 0 ? 'none' : ''}" role="tab" aria-selected="${state.shelf === key}" data-cat="${esc(key)}" style="--c:${color}">${esc(label)} <b>${n}</b></button>`;
  $('#shelves').innerHTML = pill('all', 'Tout', 'var(--text)', d.stock.length) + allCats.map((c) => pill(c, catInfo(c).label, catInfo(c).color, (by[c] || []).length)).join('');

  const q = $('#stockSearch').value.trim().toLowerCase();
  const sort = $('#stockSort').value;
  const sorter = (a, b) => (sort === 'label' ? a.label.localeCompare(b.label, 'fr') : b.count - a.count);
  const show = state.shelf === 'all' ? allCats : [state.shelf];

  let html = '';
  for (const c of show) {
    const list = (by[c] || []).filter((i) => !q || (i.label + ' ' + i.name).toLowerCase().includes(q)).sort(sorter);
    if (!list.length) continue;
    const info = catInfo(c);
    html += `<section class="rack" style="--c:${info.color}"><div class="rack-h"><span class="tile">${ico(info.icon)}</span><h3>${esc(info.label)}</h3><span class="n">${plural(list.length, 'référence')}, ${plural(qty(list), 'pièce')}</span></div><div class="crates">${list
      .map((i) => `<article class="crate" style="--c:${info.color}" title="${esc(i.name)}">${can('stock.edit') || can('stock.icons.edit') ? `<div class="crate-tools">${can('stock.edit') ? `<button class="icon-edit" data-item-edit="${esc(i.name)}" aria-label="Gérer ${esc(i.label)}" title="Gérer : déposer, retirer, renommer">${ico('sliders')}</button>` : ''}${can('stock.icons.edit') ? `<button class="icon-edit" data-icon-edit="${esc(i.name)}" aria-label="Changer l’icône de ${esc(i.label)}" title="Changer l’icône">${ico('edit')}</button>` : ''}</div>` : ''}<div class="plate">${plateContent(i)}</div><span class="qty">×${nf.format(i.count)}</span><div class="info"><div class="name">${esc(i.label)}</div><div class="cat">${esc(info.label)}</div></div></article>`)
      .join('')}</div></section>`;
  }
  $('#stockGrid').innerHTML = html || `<div class="empty">${d.stock.length ? 'Aucun item ne correspond à ta recherche.' : can('stock.edit') ? 'Le coffre est vide. Utilise « Ajouter un item » pour le remplir.' : 'Le coffre est vide pour le moment.'}</div>`;
}

// ---------- Membres ----------
function renderMembers(d) {
  const list = [...d.members].sort((a, b) => Number(b.online) - Number(a.online) || (b.lastSeen || 0) - (a.lastSeen || 0));
  const seen = (m) => (m.online ? 'En ligne' : m.lastSeen == null && !can('members.lastseen') ? 'Hors ligne' : ago(m.lastSeen));
  const ed = can('members.edit');
  $('#memberBar').hidden = !ed;
  $('#memberBar').innerHTML = ed ? `<button class="btn sm primary" id="memberAdd">${ico('plus')}Ajouter un membre</button>` : '';
  $('#memberGrid').innerHTML = list.length
    ? `<div class="people">${list
        .map((m) => `<div class="card person"><span class="avatar">${esc((m.name || '?')[0].toUpperCase())}<i class="${m.online ? 'on' : ''}"></i></span><div class="grow"><div class="nm">${esc(m.name)}</div><span class="badge">${esc(m.grade)}</span><div class="seen">${esc(seen(m))}</div></div>${ed ? `<button class="icon-edit show" data-member-edit="${esc(m.ref)}" aria-label="Modifier ${esc(m.name)}" title="Modifier">${ico('edit')}</button>` : ''}</div>`)
        .join('')}</div>`
    : `<div class="card"><div class="empty">${ed ? 'Aucun membre. Utilise « Ajouter un membre » pour commencer.' : 'Aucun membre pour le moment.'}</div></div>`;
}

// ---------- Saisie manuelle : fenêtres ----------
const whoName = () => { try { return localStorage.getItem('who') || ''; } catch (e) { return ''; } } ;
const setWho = (v) => { try { if (v) localStorage.setItem('who', v); } catch (e) {} };
function modal(id, html, handler) {
  document.querySelector('#' + id)?.remove();
  const m = document.createElement('div');
  m.id = id; m.className = 'modal';
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', k); };
  const k = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', k);
  m.addEventListener('click', (e) => { if (e.target === m) return close(); handler(e, m, close); });
  return m;
}
const field = (id, label, input, hint = '') => `<div style="margin-top:12px"><label class="lbl" for="${id}">${label}</label>${input}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
const whoField = () => field('fWho', 'Qui ?', `<input class="inp" id="fWho" maxlength="40" value="${esc(whoName() || state.me.user.name)}" autocomplete="off">`, 'Le nom qui apparaît dans les logs.');
const catSelect = (cur, withAuto) => `<select class="inp" id="fCat">${withAuto ? '<option value="">Automatique</option>' : ''}${CAT_ORDER.filter((c) => !(state.me.hiddenCategories || []).includes(c)).map((c) => `<option value="${c}"${c === cur ? ' selected' : ''}>${esc(catInfo(c).label)}</option>`).join('')}</select>`;
const doSave = (fn, close, msg) => fn().then(() => { close(); toast(msg); return load(); }).catch((er) => toast(er.message, true));

function openItemModal(name) {
  if (!can('stock.edit')) return;
  const it = name ? state.data.stock.find((x) => x.name === name) : null;
  if (name && !it) return;
  const isNew = !it;
  const iconField = can('stock.icons.edit') ? field('fIcon', 'Icône (facultatif)', `<input class="inp" id="fIcon" maxlength="300" placeholder="🔫  ou  https://mon-site.com/arme.png" value="${esc(it?.icon || '')}" autocomplete="off">`) : '';
  let mode = 'deposit';
  modal('itemModal', `
    <div class="card-h"><span class="plate big">${it ? plateContent(it) : `<b class="emo">📦</b>`}</span><div><h3>${isNew ? 'Nouvel item' : esc(it.label)}</h3>${isNew ? '' : `<div class="hint">En stock : <b>${nf.format(it.count)}</b></div>`}</div></div>
    ${field('fLabel', 'Nom', `<input class="inp" id="fLabel" maxlength="80" value="${esc(it?.label || '')}" placeholder="Ex. Pistolet, Weed, Munitions 9mm" autocomplete="off">`)}
    ${field('fCat', 'Catégorie', catSelect(it?.category, isNew))}
    ${isNew
      ? field('fQty', 'Quantité de départ', '<input class="inp" id="fQty" type="number" min="0" step="1" value="1" inputmode="numeric">')
      : `<div class="setgroup" style="margin-top:16px">Mouvement</div>
         <div class="seg" id="fMode"><button data-m="deposit" class="on">Déposer</button><button data-m="withdraw">Retirer</button><button data-m="set">Corriger</button></div>
         ${field('fQty', '<span id="fQtyLbl">Quantité à déposer</span>', '<input class="inp" id="fQty" type="number" min="0" step="1" inputmode="numeric" placeholder="0">')}`}
    ${field('fNote', 'Note (facultatif)', '<input class="inp" id="fNote" maxlength="120" placeholder="Ex. livraison du mardi" autocomplete="off">')}
    ${whoField()}${iconField}
    <div class="btns" style="margin-top:18px"><button class="btn primary" data-a="save">Enregistrer</button>${isNew ? '' : '<button class="btn danger" data-a="del">Supprimer l’item</button>'}<button class="btn" data-a="cancel">Annuler</button></div>`,
  (e, m, close) => {
    const mb = e.target.closest('[data-m]');
    if (mb) {
      mode = mb.dataset.m; m.querySelectorAll('#fMode button').forEach((b) => b.classList.toggle('on', b === mb));
      m.querySelector('#fQtyLbl').textContent = { deposit: 'Quantité à déposer', withdraw: 'Quantité à retirer', set: 'Nouvelle quantité en stock' }[mode];
      m.querySelector('#fQty').value = mode === 'set' ? it.count : ''; return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'cancel') return close();
    const val = (id) => m.querySelector('#' + id)?.value.trim() ?? '';
    const who = val('fWho'); setWho(who);
    const g = state.group;
    if (a === 'del') {
      if (!confirm(`Supprimer « ${it.label} » du coffre ? Les ${it.count} en stock sont perdus.`)) return;
      return doSave(() => adminApi('POST', '/api/stock/delete', { group: g, name: it.name, who }), close, 'Item supprimé');
    }
    if (!val('fLabel')) return toast('Donne un nom à l’item.', true);
    if (isNew) {
      return doSave(() => adminApi('POST', '/api/stock/item', { group: g, label: val('fLabel'), category: val('fCat'), count: Number(val('fQty') || 0), note: val('fNote'), who, icon: val('fIcon') }), close, 'Item ajouté');
    }
    return doSave(async () => {
      if (val('fLabel') !== it.label || val('fCat') !== it.category) await adminApi('PUT', '/api/stock/item', { group: g, name: it.name, label: val('fLabel'), category: val('fCat') });
      const q = val('fQty');
      if (q !== '' && !(mode === 'set' && Number(q) === it.count)) await adminApi('POST', '/api/stock/move', { group: g, name: it.name, mode, count: Number(q), note: val('fNote'), who });
      if (m.querySelector('#fIcon') && val('fIcon') !== (it.icon || '')) await adminApi('PUT', '/api/stock/icon', { group: g, name: it.name, icon: val('fIcon') });
    }, close, 'Enregistré');
  });
  document.querySelector('#fLabel').focus();
}
document.addEventListener('click', (e) => {
  if (e.target.closest('#stockAdd')) return openItemModal(null);
  const b = e.target.closest('[data-item-edit]');
  if (b) openItemModal(b.dataset.itemEdit);
});

function openMemberModal(ref) {
  if (!can('members.edit')) return;
  const mem = ref ? state.data.members.find((x) => x.ref === ref) : null;
  if (ref && !mem) return;
  const grades = [...new Set(state.data.members.map((x) => x.grade).filter(Boolean))];
  modal('memberModal', `
    <div class="card-h"><span class="tile">${ico('users')}</span><h3>${mem ? esc(mem.name) : 'Nouveau membre'}</h3></div>
    ${field('mName', 'Nom', `<input class="inp" id="mName" maxlength="80" value="${esc(mem?.name || '')}" autocomplete="off">`)}
    ${field('mGrade', 'Grade', `<input class="inp" id="mGrade" maxlength="40" list="mGrades" value="${esc(mem?.grade || '')}" placeholder="Ex. Boss, Soldat, Recrue" autocomplete="off"><datalist id="mGrades">${grades.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>`)}
    <div class="setrow" style="margin-top:8px"><div class="tx"><b>En ligne</b><span>Pour afficher qui est présent.</span></div>${sw('id="mOnline"', !!mem?.online)}</div>
    <div class="btns" style="margin-top:18px"><button class="btn primary" data-a="save">Enregistrer</button>${mem ? '<button class="btn danger" data-a="del">Retirer</button>' : ''}<button class="btn" data-a="cancel">Annuler</button></div>`,
  (e, m, close) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'cancel') return close();
    if (a === 'del') {
      if (!confirm(`Retirer « ${mem.name} » de la liste des membres ?`)) return;
      return doSave(() => adminApi('POST', '/api/members/delete', { group: state.group, ref }), close, 'Membre retiré');
    }
    const name = m.querySelector('#mName').value.trim();
    if (!name) return toast('Donne un nom au membre.', true);
    doSave(() => adminApi('POST', '/api/members/save', { group: state.group, ref, name, grade: m.querySelector('#mGrade').value.trim(), online: m.querySelector('#mOnline').checked }), close, mem ? 'Membre modifié' : 'Membre ajouté');
  });
  document.querySelector('#mName').focus();
}
document.addEventListener('click', (e) => {
  if (e.target.closest('#memberAdd')) return openMemberModal(null);
  const b = e.target.closest('[data-member-edit]');
  if (b) openMemberModal(b.dataset.memberEdit);
});

// ---------- Argent ----------
// L'argent propre (nos comptes) n'est pas dans les logs : il se saisit ici, avec la permission « Modifier l'argent propre ».
function renderCleanCard(d) {
  const el = $('#cardCleanEdit'), canEdit = can('money.edit') || can('money.cash.edit');
  const edits = d.moneyEdits || [];
  const txt = (e) => {
    const lab = e.acct === 'cash' ? 'cash' : 'propre';
    return (e.mode === 'add' ? `${e.delta >= 0 ? 'a ajouté' : 'a retiré'} ${money(Math.abs(e.delta))} (argent ${lab})` : `a défini l’argent ${lab} à ${money(e.value)}`) + (e.note ? ` (${esc(e.note)})` : '');
  };
  el.innerHTML = `<div class="card-h"><span class="tile">${ico('wallet')}</span><h3>Modifier l’argent</h3>${canEdit ? `<button class="btn sm primary" data-clean-edit style="margin-left:auto">${ico('edit')}Modifier</button>` : ''}</div>
    <div class="hint" style="margin:-6px 0 10px">L’argent propre (nos comptes) et l’argent cash se saisissent à la main sur le site.</div>
    ${edits.length ? edits.map((e) => `<div class="au"><span class="t">${fmtTime(e.ts)}</span><span><b>${esc(e.by)}</b> ${txt(e)}</span></div>`).join('') : '<div class="empty" style="padding:10px 6px">Aucune modification pour le moment.</div>'}`;
}
function openCleanModal(acct0) {
  const accts = [can('money.edit') && 'clean', can('money.cash.edit') && 'cash'].filter(Boolean);
  if (!accts.length) return;
  let acct = accts.includes(acct0) ? acct0 : accts[0], mode = 'set';
  const cur = () => (acct === 'cash' ? lastMoney(state.data).dirty : lastMoney(state.data).clean);
  const name = (a) => (a === 'cash' ? 'Argent cash' : 'Argent propre');
  const m = modal('cleanModal', `
    <div class="card-h"><span class="tile">${ico('wallet')}</span><div><h3 id="cmTitle"></h3><div class="hint">Solde actuel : <b id="cmCur"></b></div></div></div>
    ${accts.length > 1 ? `<div class="seg" id="cmAcct" style="margin-bottom:10px">${accts.map((a) => `<button data-acct="${a}">${name(a)}</button>`).join('')}</div>` : ''}
    <div class="seg" id="cmMode" style="margin-bottom:14px"><button data-m="set" class="on">Définir le solde</button><button data-m="add">Ajouter</button><button data-m="sub">Retirer</button></div>
    <label class="lbl" for="cmAmount" id="cmLbl">Nouveau solde</label>
    <input class="inp" id="cmAmount" type="number" inputmode="numeric" step="1" autocomplete="off">
    ${field('cmNote', 'Note (facultatif)', '<input class="inp" id="cmNote" maxlength="80" placeholder="Ex. versement de la semaine" autocomplete="off">')}
    ${whoField()}
    <div class="hint" id="cmPrev" style="margin-top:10px"></div>
    <div class="btns" style="margin-top:16px"><button class="btn primary" data-cm="save">Enregistrer</button><button class="btn" data-cm="cancel">Annuler</button></div>`,
  (e, mm, close) => {
    const ab = e.target.closest('[data-acct]');
    if (ab) { acct = ab.dataset.acct; refresh(true); return; }
    const mb = e.target.closest('[data-m]');
    if (mb) { mode = mb.dataset.m; mm.querySelectorAll('#cmMode button').forEach((b) => b.classList.toggle('on', b === mb)); refresh(true); return; }
    const act = e.target.closest('[data-cm]')?.dataset.cm;
    if (act === 'cancel') return close();
    if (act === 'save') {
      const raw = mm.querySelector('#cmAmount').value, v = Number(raw);
      if (raw === '' || !Number.isFinite(v)) return toast('Entre un montant.', true);
      const who = mm.querySelector('#fWho').value.trim(); setWho(who);
      doSave(() => adminApi('PUT', '/api/money/clean', { group: state.group, account: acct, mode: mode === 'set' ? 'set' : 'add', amount: mode === 'sub' ? -v : v, note: mm.querySelector('#cmNote').value, who }), close, `${name(acct)} mis à jour`);
    }
  });
  const amt = m.querySelector('#cmAmount'), prev = m.querySelector('#cmPrev');
  function refresh(reset) {
    m.querySelector('#cmTitle').textContent = name(acct);
    m.querySelector('#cmCur').textContent = money(cur());
    m.querySelectorAll('#cmAcct button').forEach((b) => b.classList.toggle('on', b.dataset.acct === acct));
    m.querySelector('#cmLbl').textContent = mode === 'set' ? 'Nouveau solde' : 'Montant';
    if (reset) amt.value = mode === 'set' ? cur() : '';
    const v = Number(amt.value) || 0;
    prev.textContent = `Nouveau solde : ${money(mode === 'set' ? v : mode === 'add' ? cur() + v : cur() - v)}`;
  }
  amt.addEventListener('input', () => refresh(false));
  refresh(true); amt.focus(); amt.select();
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-clean-edit]'); if (b) { e.preventDefault(); openCleanModal(b.dataset.acct); } });

function renderMoney(d) {
  if (!can('view.money')) return;
  const dirtyOk = can('money.dirty');
  const m = lastMoney(d), f = d.money[0] || m;
  const box = $('#statsMoney');
  const v = (a, b) => { const x = a - b; return `<span class="num ${x >= 0 ? 'clean' : 'dirty'}">${x >= 0 ? '+' : '−'}${money(Math.abs(x))}</span>`; };
  box.innerHTML =
    stat('wallet', 'Argent propre', moneyNum('mc', 'clean')) +
    (dirtyOk ? stat('wallet', 'Argent cash', moneyNum('md', 'dirty')) : '') +
    stat('wallet', 'Variation propre', v(m.clean, f.clean), 'depuis le premier relevé') +
    (dirtyOk ? stat('wallet', 'Variation cash', v(m.dirty, f.dirty), 'depuis le premier relevé') : '');
  startCounts(box, m);
  renderCleanCard(d);
  if (state.view !== 'money') return;
  if (typeof Chart === 'undefined') {
    const cv = $('#moneyChart');
    if (cv) cv.parentElement.innerHTML = '<div class="emptybox"><b>Le graphique n’a pas pu se charger</b><span>Il a besoin d’une connexion internet pour s’afficher. Recharge la page.</span></div>';
    return;
  }
  state.chart?.destroy();
  const css = getComputedStyle(document.documentElement);
  const clean = css.getPropertyValue('--clean').trim(), dirty = css.getPropertyValue('--dirty').trim(), dim = css.getPropertyValue('--dim').trim();
  const grid = css.getPropertyValue('--line').trim();
  const sets = [{ label: 'Propre', data: d.money.map((p) => p.clean), borderColor: clean, backgroundColor: clean + '1f', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 }];
  if (dirtyOk) sets.push({ label: 'Cash', data: d.money.map((p) => p.dirty), borderColor: dirty, backgroundColor: dirty + '1a', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 });
  state.chart = new Chart($('#moneyChart'), {
    type: 'line',
    data: { labels: d.money.map((p) => fmtTime(p.ts)), datasets: sets },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: dim, usePointStyle: true, pointStyle: 'circle' } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${money(c.parsed.y)}` } } },
      scales: { x: { ticks: { color: dim, maxTicksLimit: 8 }, grid: { color: grid } }, y: { ticks: { color: dim, callback: (x) => money(x) }, grid: { color: grid } } },
    },
  });
}

// =====================================================================
// Réglages (administrateurs)
// =====================================================================
const SET = { tab: 'features', data: null, editor: null, reveal: null, defTheme: 'anthracite' };
const isGlobal = () => !!state.me?.user?.global;
const SET_TABS_ALL = [['groups', 'Groupes', 1], ['features', 'Ce groupe'], ['access', 'Accès'], ['categories', 'Catégories'], ['data', 'Données'], ['audit', 'Journal'], ['general', 'Général', 1], ['webhook', 'Webhook', 1]];
const setTabs = () => SET_TABS_ALL.filter((t) => !t[2] || isGlobal());
const sw = (attrs, on) => `<label class="sw"><input type="checkbox" ${attrs} ${on ? 'checked' : ''}><span></span></label>`;
const cardHead = (icon, title, extra = '') => `<div class="card-h"><span class="tile">${ico(icon)}</span><h3>${esc(title)}</h3>${extra}</div>`;

async function loadSettings() {
  try {
    SET.data = await adminApi('GET', '/api/admin/settings?group=' + encodeURIComponent(state.group));
    if (SET.data.settings) SET.defTheme = SET.data.settings.defaultTheme;
    if (!setTabs().some((t) => t[0] === SET.tab)) SET.tab = 'features';
    renderSettings();
  } catch (e) { toast(e.message, true); }
}

function renderSettings() {
  if (!SET.data) { $('#setBody').innerHTML = '<div class="empty">Chargement…</div>'; return; }
  $('#setTabs').innerHTML = setTabs().map(([id, label]) => `<button data-tab="${id}" class="${SET.tab === id ? 'on' : ''}">${esc(label)}</button>`).join('');
  const fn = { groups: tabGroups, general: tabGeneral, features: tabFeatures, access: tabAccess, categories: tabCategories, webhook: tabWebhook, data: tabData, audit: tabAudit }[SET.tab];
  $('#setBody').innerHTML = fn();
}

function tabGeneral() {
  const s = SET.data.settings;
  const opt = (k, t, d) => `<div class="setrow"><div class="tx"><b>${t}</b><span>${d}</span></div>${sw(`data-opt="${k}"`, s.options[k])}</div>`;
  return `<div class="card">
    ${cardHead('sliders', 'Général')}
    <div class="fgrid">
      <div><label class="lbl" for="gSite">Nom du site</label><input class="inp" id="gSite" maxlength="60" value="${esc(s.siteName)}"></div>
      <div><label class="lbl" for="gFooter">Texte du pied de page</label><input class="inp" id="gFooter" maxlength="160" value="${esc(s.footerText)}"></div>
      <div><label class="lbl" for="gImg">Adresse des images d’items</label><input class="inp" id="gImg" placeholder="https://mon-site.com/items/{name}.png" value="${esc(s.imageBase)}"><div class="hint">{name} est remplacé par le nom de l’item. Vide : deux lettres à la place des images.</div></div>
      <div><label class="lbl" for="gMax">Logs conservés par groupe</label><input class="inp" id="gMax" type="number" min="100" max="50000" value="${s.maxLogs}"><div class="hint">Entre 100 et 50 000. Les plus anciens sont supprimés.</div></div>
    </div>
    <div class="setgroup">Thème par défaut</div>
    <div class="seg" id="gTheme">${THEMES.map((t) => `<button data-deftheme="${t}" class="${SET.defTheme === t ? 'on' : ''}">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('')}</div>
    <div class="setgroup">Affichage</div>
    ${opt('showFooter', 'Pied de page', 'Affiche le nom du site et le texte en bas de chaque page.')}
    ${opt('showLive', 'Indicateur « en direct »', 'Montre si la page reçoit les mises à jour en temps réel.')}
    ${opt('allowThemes', 'Choix du thème', 'Laisse chacun changer de thème. Sinon tout le monde voit le thème par défaut.')}
    ${opt('animateNumbers', 'Chiffres animés', 'Les montants d’argent « se comptent » quand ils changent.')}
    <div class="setgroup">Fonctions coupées pour tous les groupes</div>
    <div class="hint" style="margin-bottom:6px">Prioritaire sur les réglages de chaque groupe. Enregistré tout de suite.</div>
    ${SET.data.perms.map((p) => `<div class="setrow"><div class="tx"><b>${esc(p.label)}</b><span>${esc(p.desc)}</span></div>${sw(`data-gfeat="${esc(p.id)}"`, s.features[p.id] !== false)}</div>`).join('')}
    <div class="setgroup">Connexion</div>
    ${opt('listGroups', 'Liste des groupes à la connexion', 'Affiche la liste de tous les groupes. Désactivé : il faut taper le code ou le nom du groupe pour se connecter (les groupes restent cachés).')}
    <div class="btns" style="margin-top:20px"><button class="btn primary" data-act="saveGeneral">Enregistrer</button></div>
  </div>`;
}

function tabFeatures() {
  const g = SET.data.group;
  const f = g.features || {};
  const gl = SET.data.settings?.features || {};
  const groups = {};
  for (const p of SET.data.perms) (groups[p.group] ||= []).push(p);
  return `<div class="card">${cardHead('sliders', 'Nom et identité du groupe')}
    <div class="fgrid"><div><label class="lbl" for="glabel">Nom affiché</label><input class="inp" id="glabel" maxlength="40" value="${esc(g.label)}" placeholder="${esc(g.id)}"><div class="hint">Code du groupe pour la connexion et le webhook : <b>${esc(g.id)}</b></div></div></div>
    <div class="btns" style="margin-top:14px"><button class="btn primary" data-act="saveLabel">Enregistrer le nom</button></div>
  </div>
  <div class="note-card" style="margin-top:14px">Un interrupteur coupé cache la fonction à tous les membres de « ${esc(g.shown)} », sauf aux administrateurs. Appliqué tout de suite, même aux personnes déjà connectées.</div>
  <div class="card">${cardHead('sliders', 'Fonctions visibles')}
    ${Object.entries(groups).map(([gn, list]) => `<div class="setgroup">${esc(gn)}</div>${list.map((p) => `<div class="setrow"><div class="tx"><b>${esc(p.label)}</b><span>${esc(p.desc)}${gl[p.id] === false ? ' — coupée pour tous les groupes par l’administrateur général' : ''}</span></div>${sw(`data-feat="${esc(p.id)}"`, f[p.id] !== false)}</div>`).join('')}`).join('')}
  </div>${webhookCard()}`;
}

function webhookCard() {
  const g = SET.data.group, w = g.webhook, url = `${location.origin}/api/webhook/${g.id}`;
  const cfg = `set dashboard_url "${url}"\nset dashboard_secret "${w.secret}"\nensure dashboard_logs`;
  return `<div class="card" style="margin-top:14px">${cardHead('refresh', 'Import depuis un serveur de jeu (facultatif)')}
    <div class="setrow" style="border-top:0"><div class="tx"><b>Autoriser le webhook</b><span>Désactivé : le coffre, les membres et l’argent se gèrent uniquement sur le site. Activé : un serveur de jeu peut aussi envoyer ses données à « ${esc(g.shown)} ».</span></div>${sw('data-whenable', w.enabled)}</div>
    ${w.enabled ? `<div class="note-card">Ce lien est propre à « ${esc(g.shown)} » : tout ce qu’il reçoit va dans ce groupe, jamais ailleurs. À mettre dans le <b>server.cfg</b> du serveur de ce groupe.</div>
    <div class="stats" style="margin:14px 0">
      <div class="stat"><div class="top" style="margin-bottom:8px">Dernier événement</div><div class="val"><span class="num" style="font-size:20px">${w.last ? esc(ago(w.last, '')) : 'Aucun'}</span></div></div>
      <div class="stat"><div class="top" style="margin-bottom:8px">Événements reçus</div><div class="val"><span class="num" style="font-size:20px">${nf.format(w.count)}</span></div></div>
    </div>
    <label class="lbl">Adresse du webhook</label>
    <div class="copyline"><input class="inp" readonly value="${esc(url)}" aria-label="Adresse du webhook"><button class="btn" data-copy="${esc(url)}">${ico('copy')}Copier</button></div>
    <label class="lbl" style="margin-top:12px">Secret</label>
    <div class="copyline"><input class="inp" id="whSecret" type="password" readonly value="${esc(w.secret)}" aria-label="Secret du webhook"><button class="btn" data-act="showSecret">Afficher</button><button class="btn" data-copy="${esc(w.secret)}">${ico('copy')}Copier</button></div>
    <div class="setgroup">À mettre dans le server.cfg</div>
    <pre class="code">${esc(cfg)}</pre>
    <div class="btns" style="margin-top:10px"><button class="btn sm" data-copy="${esc(cfg)}">${ico('copy')}Copier la config</button><button class="btn sm danger" data-act="regenSecret">${ico('refresh')}Nouveau secret</button></div>
    <div class="hint" style="margin-top:10px">Un nouveau secret coupe tout de suite l’ancien : pense à mettre à jour le server.cfg.</div>` : ''}
  </div>`;
}

function tabGroups() {
  const list = SET.data.groupsInfo || [];
  const r = SET.reveal;
  return `${r && r.list ? `<div class="reveal" style="display:block"><div class="tx"><b>Groupe créé : mots de passe à noter maintenant</b><span>Ils ne seront plus jamais affichés.</span></div>${r.list.map((c) => `<div class="pwline"><span>${esc(c.name)}${c.admin ? ' (admin du groupe)' : ''}</span><code>${esc(c.password)}</code><button class="btn sm" data-copy="${esc(c.password)}">${ico('copy')}Copier</button></div>`).join('')}<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="hideReveal">J’ai noté</button></div></div>` : ''}
  <div class="note-card">Chaque groupe a ses propres données, ses réglages et ses mots de passe. Au moment de se connecter, on choisit son groupe. Le mot de passe « Admin » d’un groupe en fait un administrateur local : il gère ce groupe seulement. Toi (administrateur général), tu peux tout gérer.</div>
  <div class="card editor">${cardHead('plus', 'Nouveau groupe')}
    <div class="fgrid">
      <div><label class="lbl" for="ngId">Code du groupe</label><input class="inp" id="ngId" maxlength="30" placeholder="ex. ballas" autocomplete="off"><div class="hint">Lettres minuscules, chiffres, - ou _. C’est aussi la valeur de <b>dashboard_group</b> côté FiveM.</div></div>
      <div><label class="lbl" for="ngLabel">Nom affiché</label><input class="inp" id="ngLabel" maxlength="40" placeholder="ex. Les Ballas"></div>
    </div>
    <div class="btns" style="margin-top:14px"><button class="btn primary" data-act="createGroup">${ico('plus')}Créer le groupe</button></div>
    <div class="hint" style="margin-top:8px">Un accès « Admin » et un accès « Membre » sont créés avec des mots de passe aléatoires, affichés une seule fois.</div>
  </div>
  <div class="keys" style="margin-top:14px">${list.map((g) => `<div class="card keycard">
    <div class="top"><span class="tile">${ico('users')}</span><div><div class="nm">${esc(g.shown)}</div><div class="meta">Code : ${esc(g.id)}${g.lastActivity ? ' · activité ' + esc(ago(g.lastActivity, '').toLowerCase()) : ' · aucune activité'}</div></div></div>
    <div class="tags">${g.id === state.group ? '<span class="badge you">Affiché</span>' : ''}<span class="badge">${plural(g.keys, 'accès', 'accès')}</span><span class="badge ${g.admins ? '' : 'off'}">${g.admins ? plural(g.admins, 'admin local', 'admins locaux') : 'Aucun admin local'}</span></div>
    <div class="meta">${plural(g.counts.stock, 'référence')} en coffre · ${plural(g.counts.members, 'membre')} · ${plural(g.counts.logs, 'log')}</div>
    <div class="btns"><button class="btn sm" data-act="manageGroup" data-gid="${esc(g.id)}">${ico('edit')}Gérer</button><button class="btn sm danger" data-act="deleteGroup" data-gid="${esc(g.id)}">${ico('trash')}Supprimer</button></div>
  </div>`).join('')}</div>`;
}

function permSummary(k) {
  if (k.admin) return 'Accès complet et réglages';
  const pages = SET.data.perms.filter((p) => p.group === 'Pages' && k.perms[p.id]).map((p) => p.label);
  return pages.length ? 'Pages : ' + pages.join(', ') : 'Aucune page';
}
const visibleKeys = () => SET.data.keys.filter((k) => k.group === '*' || k.group === state.group);
function keyCard(k) {
  const me = k.id === SET.data.me;
  const tags = [
    k.group === '*' ? '<span class="badge admin">Administrateur général</span>' : k.admin ? '<span class="badge admin">Admin du groupe</span>' : k.builtin === 'member' ? '<span class="badge">Membre</span>' : '<span class="badge">Personnalisé</span>',
    k.enabled ? '' : '<span class="badge off">Désactivé</span>',
    me ? '<span class="badge you">Ton accès</span>' : '',
    k.hiddenCategories.length ? `<span class="badge">${k.hiddenCategories.length} catégorie${k.hiddenCategories.length > 1 ? 's' : ''} masquée${k.hiddenCategories.length > 1 ? 's' : ''}</span>` : '',
  ].join('');
  return `<div class="card keycard ${k.enabled ? '' : 'off'}">
    <div class="top"><span class="tile">${ico(k.admin ? 'shield' : 'key')}</span><div><div class="nm">${esc(k.name)}</div><div class="meta">${k.lastUsed ? 'Utilisé ' + esc(ago(k.lastUsed, '').toLowerCase()) : 'Jamais utilisé'}</div></div></div>
    <div class="tags">${tags}</div>
    <div class="meta">${esc(permSummary(k))}</div>
    <div class="btns">
      <button class="btn sm" data-act="editKey" data-id="${esc(k.id)}">${ico('edit')}Modifier</button>
      <button class="btn sm" data-act="resetKey" data-id="${esc(k.id)}">${ico('refresh')}Nouveau mot de passe</button>
      ${me ? '' : `<button class="btn sm" data-act="toggleKey" data-id="${esc(k.id)}">${k.enabled ? 'Désactiver' : 'Activer'}</button>`}
      ${k.builtin || me ? '' : `<button class="btn sm danger" data-act="deleteKey" data-id="${esc(k.id)}">${ico('trash')}Supprimer</button>`}
    </div></div>`;
}
function keyEditor() {
  const e = SET.editor;
  const isNew = !e.id;
  return `<div class="card editor">
    ${cardHead('key', isNew ? 'Nouvel accès' : 'Modifier « ' + e.origName + ' »')}
    <div class="fgrid">
      <div><label class="lbl" for="eName">Nom de l’accès</label><input class="inp" id="eName" maxlength="40" value="${esc(e.name)}" placeholder="Ex. Recrues, Comptable…"></div>
      ${isNew && isGlobal() ? `<div><label class="lbl" for="eScope">Portée</label><select class="inp" id="eScope"><option value="">Seulement « ${esc(SET.data.group.shown)} »</option><option value="*"${e.scope === '*' ? ' selected' : ''}>Tous les groupes (administrateur général)</option></select></div>` : ''}
      <div><label class="lbl" for="ePw">${isNew ? 'Mot de passe' : 'Nouveau mot de passe'}</label><input class="inp" id="ePw" autocomplete="off" placeholder="${isNew ? 'Laisse vide pour en générer un' : 'Laisse vide pour ne pas le changer'}"><div class="hint">6 caractères minimum. Chaque accès a un mot de passe différent.</div></div>
    </div>
    <div class="setrow"><div class="tx"><b>Administrateur</b><span>Accès à tout dans son groupe, y compris cette page de réglages. Il peut créer d’autres accès pour son groupe.</span></div>${sw('id="eAdmin"', e.admin)}</div>
    ${e.admin
      ? '<div class="note-card" style="margin:8px 0 0">Un administrateur voit tout et peut tout régler : les permissions ci-dessous ne s’appliquent pas.</div>'
      : `${['Pages', 'Détails'].map((g) => `<div class="setgroup">${g === 'Pages' ? 'Pages visibles' : 'Détails visibles'}</div><div class="permgrid">${SET.data.perms.filter((p) => p.group === g).map((p) => `<div class="setrow"><div class="tx"><b>${esc(p.label)}</b><span>${esc(p.desc)}</span></div>${sw(`data-eperm="${esc(p.id)}"`, !!e.perms[p.id])}</div>`).join('')}</div>`).join('')}
         <div class="setgroup">Catégories du coffre masquées pour cet accès</div>
         <div class="checks">${CAT_ORDER.map((c) => `<label style="--c:${CATS[c].color}"><input type="checkbox" data-ecat="${c}" ${e.hidden.includes(c) ? 'checked' : ''}><i></i>${esc(CATS[c].label)}</label>`).join('')}</div>`}
    <div class="btns" style="margin-top:20px"><button class="btn primary" data-act="saveKey">${isNew ? 'Créer l’accès' : 'Enregistrer'}</button><button class="btn" data-act="cancelKey">Annuler</button></div>
  </div>`;
}
function tabAccess() {
  const r = SET.reveal;
  return `${r ? `<div class="reveal"><div class="tx"><b>Mot de passe de « ${esc(r.name)} »</b><span>Note-le maintenant : il ne sera plus jamais affiché.</span></div><code>${esc(r.password)}</code><button class="btn sm" data-act="copyPw">${ico('copy')}Copier</button><button class="btn sm" data-act="hideReveal">J’ai noté</button></div>` : ''}
  <div class="note-card">Accès du groupe « ${esc(SET.data.group.shown)} ». Chaque mot de passe ouvre ce groupe avec ses propres permissions. Changer un mot de passe déconnecte aussitôt les personnes qui l’utilisaient.</div>
  ${SET.editor ? keyEditor() : `<div class="btns" style="margin-bottom:14px"><button class="btn primary" data-act="newKey">${ico('plus')}Nouvel accès</button></div>`}
  <div class="keys">${visibleKeys().map(keyCard).join('')}</div>`;
}

function tabCategories() {
  const hidden = SET.data.group.hiddenCategories;
  const by = {};
  for (const it of state.data?.stock || []) by[it.category] = (by[it.category] || 0) + 1;
  return `<div class="note-card">Une catégorie masquée disparaît du coffre et des logs de ce groupe pour tous les non-administrateurs. Tu peux aussi en masquer pour un seul accès, dans l’onglet Accès.</div>
  <div class="card">${cardHead('box', 'Catégories du coffre')}
    ${CAT_ORDER.map((c) => `<div class="setrow"><span class="tile" style="color:${CATS[c].color}">${ico(CATS[c].icon)}</span><div class="tx"><b>${esc(CATS[c].label)}</b><span>${by[c] ? plural(by[c], 'référence') : 'Vide'}</span></div>${sw(`data-catvis="${c}"`, !hidden.includes(c))}</div>`).join('')}
    <div class="hint" style="margin-top:12px">Interrupteur allumé : visible.</div>
  </div>`;
}

function tabWebhook() {
  const w = SET.data.webhook, url = location.origin + '/api/webhook';
  const cfg = `set dashboard_url "${url}"\nset dashboard_secret "ton WEBHOOK_SECRET"\nset dashboard_group "${state.group}"\nensure dashboard_logs`;
  return `<div class="card">${cardHead('refresh', 'Connexion avec ton serveur de jeu')}
    <div class="stats" style="margin-bottom:14px">
      <div class="stat"><div class="top" style="margin-bottom:8px">Dernier événement reçu</div><div class="val"><span class="num" style="font-size:20px">${w.last ? esc(ago(w.last, '')) : 'Aucun'}</span></div></div>
      <div class="stat"><div class="top" style="margin-bottom:8px">Événements reçus</div><div class="val"><span class="num" style="font-size:20px">${nf.format(w.count)}</span></div></div>
      <div class="stat"><div class="top" style="margin-bottom:8px">Secret du webhook</div><div class="val"><span class="num" style="font-size:20px">${w.secretSet ? 'Défini' : 'Manquant'}</span></div></div>
    </div>
    <div class="note-card" style="margin-top:0">Le coffre, les membres et l’argent se gèrent sur le site. Le webhook est facultatif et coupé par défaut : chaque groupe l’autorise dans l’onglet « Ce groupe ». Chaque groupe a son propre lien et son propre secret. Celui-ci est le lien général : il utilise le <b>WEBHOOK_SECRET</b> du .env et range chaque événement dans le groupe indiqué par son champ <b>group</b>.</div>
    <label class="lbl">Adresse du webhook général</label>
    <div class="copyline"><input class="inp" readonly value="${esc(url)}" aria-label="Adresse du webhook"><button class="btn" data-copy="${esc(url)}">${ico('copy')}Copier</button></div>
    <div class="setgroup">À mettre dans le server.cfg de ton serveur FiveM</div>
    <pre class="code">${esc(cfg)}</pre>
    <div class="btns" style="margin-top:10px"><button class="btn sm" data-copy="${esc(cfg)}">${ico('copy')}Copier la config</button></div>
    <div class="hint" style="margin-top:12px">Le secret se règle dans le fichier .env du site (WEBHOOK_SECRET), il ne s’affiche jamais ici.</div>
  </div>`;
}

function tabData() {
  const groups = SET.data.groups;
  return `<div class="card">${cardHead('download', 'Sauvegarde')}
    <div class="setrow"><div class="tx"><b>Exporter les données</b><span>Télécharge un fichier avec les logs, le coffre, l’argent et les membres. Les mots de passe n’y sont jamais inclus.</span></div><a class="btn" href="/api/admin/export?group=${encodeURIComponent(state.group)}" download>${ico('download')}Ce groupe</a>${isGlobal() ? `<a class="btn" href="/api/admin/export?group=*" download>${ico('download')}Tout</a>` : ''}</div>
  </div>
  <div class="card dz" style="margin-top:14px">${cardHead('trash', 'Zone sensible')}
    <div class="note-card">Ces actions sont définitives. Une confirmation est demandée.</div>
    <label class="lbl" for="pgGroup">Groupe concerné</label>
    <select class="inp" id="pgGroup" style="max-width:300px">${groups.map((g) => `<option value="${esc(g)}"${g === state.group ? ' selected' : ''}>${esc(groupLabel(g))}</option>`).join('')}${groups.length > 1 ? '<option value="*">Tous les groupes</option>' : ''}</select>
    <div class="btns" style="margin-top:14px">
      ${[['logs', 'Vider les logs'], ['stock', 'Vider le coffre'], ['money', 'Vider l’historique d’argent'], ['members', 'Vider les membres'], ['all', 'Tout vider']].map(([w, t]) => `<button class="btn danger" data-act="purge" data-what="${w}" ${groups.length ? '' : 'disabled'}>${t}</button>`).join('')}
    </div>
  </div>`;
}

function tabAudit() {
  const a = SET.data.audit;
  return `<div class="card">${cardHead('list', 'Journal d’administration')}
    ${a.length ? a.map((x) => `<div class="au"><span class="t">${fmtTime(x.ts)}</span><span><b>${esc(x.who)}</b> ${esc(x.text)}</span></div>`).join('') : '<div class="empty">Rien pour le moment.</div>'}
  </div>`;
}

// --- Lecture du formulaire d'accès
function readEditor() {
  const e = SET.editor;
  if (!e || !$('#eName')) return;
  e.name = $('#eName').value;
  e.admin = $('#eAdmin').checked;
  if ($('#eScope')) e.scope = $('#eScope').value;
  e.pw = $('#ePw').value;
  if (!e.admin) {
    document.querySelectorAll('[data-eperm]').forEach((c) => { e.perms[c.dataset.eperm] = c.checked; });
    e.hidden = [...document.querySelectorAll('[data-ecat]')].filter((c) => c.checked).map((c) => c.dataset.ecat);
  }
}
const newEditor = () => ({ id: null, name: '', origName: '', admin: false, pw: '', scope: '', perms: Object.fromEntries(SET.data.perms.map((p) => [p.id, true])), hidden: [] });

async function guarded(fn) {
  try { await fn(); } catch (e) { toast(e.message, true); }
}

// --- Actions (clics)
$('#setBody').addEventListener('click', (ev) => {
  const cp = ev.target.closest('[data-copy]');
  if (cp) { copyText(cp.dataset.copy); return; }
  const th = ev.target.closest('[data-deftheme]');
  if (th) { SET.defTheme = th.dataset.deftheme; document.querySelectorAll('[data-deftheme]').forEach((b) => b.classList.toggle('on', b === th)); return; }
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  const k = SET.data.keys.find((x) => x.id === id);
  const gidAttr = b.dataset.gid;
  guarded(async () => {
    switch (b.dataset.act) {
      case 'saveGeneral': {
        const options = {};
        document.querySelectorAll('[data-opt]').forEach((c) => { options[c.dataset.opt] = c.checked; });
        const r = await adminApi('PUT', '/api/admin/settings', { siteName: $('#gSite').value, footerText: $('#gFooter').value, imageBase: $('#gImg').value, maxLogs: $('#gMax').value, defaultTheme: SET.defTheme, options });
        SET.data.settings = r.settings;
        toast('Réglages enregistrés');
        break;
      }
      case 'newKey': SET.editor = newEditor(); renderSettings(); $('#eName')?.focus(); break;
      case 'editKey': SET.editor = { id: k.id, name: k.name, origName: k.name, admin: k.admin, pw: '', perms: { ...k.perms }, hidden: [...k.hiddenCategories] }; renderSettings(); $('#eName')?.focus(); break;
      case 'cancelKey': SET.editor = null; renderSettings(); break;
      case 'saveKey': {
        readEditor();
        const e = SET.editor;
        const body = { name: e.name, admin: e.admin, perms: e.perms, hiddenCategories: e.hidden };
        if (!e.id) body.group = e.scope === '*' ? '*' : state.group;
        if (e.pw) body.password = e.pw;
        const r = e.id ? await adminApi('PATCH', '/api/admin/keys/' + e.id, body) : await adminApi('POST', '/api/admin/keys', body);
        SET.reveal = r.password ? { name: r.key.name, password: r.password } : null;
        SET.editor = null;
        await loadSettings();
        toast(e.id ? 'Accès modifié' : 'Accès créé');
        break;
      }
      case 'resetKey': {
        if (!confirm(`Générer un nouveau mot de passe pour « ${k.name} » ? L’ancien ne marchera plus et les personnes connectées seront déconnectées.`)) return;
        const r = await adminApi('PATCH', '/api/admin/keys/' + id, { regenerate: true });
        SET.reveal = { name: k.name, password: r.password };
        await loadSettings();
        break;
      }
      case 'toggleKey': {
        await adminApi('PATCH', '/api/admin/keys/' + id, { enabled: !k.enabled });
        await loadSettings();
        toast(k.enabled ? 'Accès désactivé' : 'Accès activé');
        break;
      }
      case 'deleteKey': {
        if (!confirm(`Supprimer l’accès « ${k.name} » ? Son mot de passe ne marchera plus.`)) return;
        await adminApi('DELETE', '/api/admin/keys/' + id);
        await loadSettings();
        toast('Accès supprimé');
        break;
      }
      case 'saveLabel': {
        await adminApi('PUT', '/api/admin/groups/' + encodeURIComponent(state.group) + '/settings', { label: $('#glabel').value });
        toast('Nom enregistré');
        await loadAll();
        break;
      }
      case 'createGroup': {
        const r = await adminApi('POST', '/api/admin/groups', { id: $('#ngId').value, label: $('#ngLabel').value });
        SET.reveal = { list: r.created };
        await loadAll();
        toast('Groupe créé');
        break;
      }
      case 'manageGroup': {
        state.group = gidAttr; state.shelf = 'all'; state.shown = {}; SET.tab = 'access'; SET.editor = null;
        await loadAll();
        break;
      }
      case 'deleteGroup': {
        const nm = groupLabel(gidAttr);
        if (!confirm(`Supprimer le groupe « ${nm} » avec toutes ses données et tous ses accès ? C’est définitif.`)) return;
        if (prompt(`Pour confirmer, tape le code du groupe : ${gidAttr}`) !== gidAttr) { toast('Suppression annulée', true); return; }
        await adminApi('DELETE', '/api/admin/groups/' + encodeURIComponent(gidAttr));
        if (state.group === gidAttr) state.group = 'default';
        await loadAll();
        toast('Groupe supprimé');
        break;
      }
      case 'showSecret': { const i = $('#whSecret'); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Afficher' : 'Masquer'; break; }
      case 'regenSecret': {
        if (!confirm('Générer un nouveau secret ? L’ancien arrête de fonctionner immédiatement : il faudra mettre à jour le server.cfg.')) return;
        const r = await adminApi('POST', '/api/admin/groups/' + encodeURIComponent(state.group) + '/webhook-secret');
        SET.data.group = r.group; renderSettings(); toast('Nouveau secret généré');
        break;
      }
      case 'copyPw': copyText(SET.reveal.password); break;
      case 'hideReveal': SET.reveal = null; renderSettings(); break;
      case 'purge': {
        const g = $('#pgGroup').value, gl = g === '*' ? 'tous les groupes' : `le groupe « ${groupLabel(g)} »`;
        if (!confirm(`${b.textContent.trim()} pour ${gl} ? Cette action est définitive.`)) return;
        await adminApi('POST', '/api/admin/purge', { what: b.dataset.what, group: g });
        toast('C’est fait');
        break;
      }
    }
  });
});

// --- Interrupteurs (enregistrés tout de suite)
$('#setBody').addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'eAdmin') { readEditor(); renderSettings(); return; }
  if (t.dataset.whenable !== undefined) {
    guarded(async () => {
      const r = await adminApi('PUT', '/api/admin/groups/' + encodeURIComponent(state.group) + '/settings', { webhookEnabled: t.checked });
      SET.data.group = r.group; renderSettings(); toast(t.checked ? 'Webhook autorisé' : 'Webhook coupé');
    }).catch(() => {});
  } else if (t.dataset.gfeat) {
    guarded(async () => {
      const r = await adminApi('PUT', '/api/admin/settings', { features: { [t.dataset.gfeat]: t.checked } });
      SET.data.settings = r.settings;
      toast(t.checked ? 'Fonction autorisée' : 'Fonction coupée pour tous les groupes');
    }).catch(() => {});
  } else if (t.dataset.feat) {
    guarded(async () => {
      const r = await adminApi('PUT', '/api/admin/groups/' + encodeURIComponent(state.group) + '/settings', { features: { [t.dataset.feat]: t.checked } });
      SET.data.group = r.group;
      toast(t.checked ? 'Fonction visible' : 'Fonction masquée');
    }).catch(() => {});
  } else if (t.dataset.catvis) {
    guarded(async () => {
      const hidden = [...document.querySelectorAll('[data-catvis]')].filter((c) => !c.checked).map((c) => c.dataset.catvis);
      const r = await adminApi('PUT', '/api/admin/groups/' + encodeURIComponent(state.group) + '/settings', { hiddenCategories: hidden });
      SET.data.group = r.group;
      toast(t.checked ? 'Catégorie visible' : 'Catégorie masquée');
    });
  }
});
$('#setTabs').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-tab]');
  if (!b) return;
  if (SET.editor) readEditor();
  SET.tab = b.dataset.tab;
  renderSettings();
});

// ---------- Navigation ----------
function allowedViews() {
  const v = PAGE_IDS.filter((p) => can('view.' + p));
  if (state.me?.user?.admin) v.push('settings');
  return v;
}
function setView(v) {
  state.view = v;
  document.querySelectorAll('#nav button').forEach((x) => x.classList.toggle('active', x.dataset.view === v));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.id === 'view-' + v));
  $('#pageTitle').textContent = VIEWS[v][0];
  $('#pageSub').textContent = VIEWS[v][1];
  if (v === 'settings') loadSettings();
  if (v === 'profile') renderProfile();
  render();
  scrollTo({ top: 0 });
}
$('#nav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); });
$('#shelves').addEventListener('click', (e) => { const c = e.target.closest('.pill'); if (c) { state.shelf = c.dataset.cat; renderStock(state.data); } });
$('#logSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.logFilter = b.dataset.f;
  document.querySelectorAll('#logSeg button').forEach((x) => x.classList.toggle('on', x === b));
  renderLogs(state.data);
});
$('#logSearch').addEventListener('input', () => renderLogs(state.data));
$('#stockSearch').addEventListener('input', () => renderStock(state.data));
$('#stockSort').addEventListener('change', () => renderStock(state.data));

// ---------- Menu profil : groupes, thème, déconnexion ----------
const menu = $('#menu'), userBtn = $('#userBtn');
const setMenu = (open) => { menu.hidden = !open; userBtn.setAttribute('aria-expanded', String(open)); };
userBtn.addEventListener('click', (e) => { e.stopPropagation(); setMenu(menu.hidden); });
document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// ---------- Profil : style de présentation (par personne, gardé dans ce navigateur) ----------
const THEME_META = { navy: ['Navy', '#0b1322', '#192843'], anthracite: ['Anthracite', '#1a1b1f', '#2a2b31'], feutre: ['Feutre', '#0d211d', '#1a4037'], minuit: ['Minuit', '#12101c', '#241f36'], clair: ['Clair', '#f3f4f7', '#ffffff'] };
const ACCENTS = { default: ['Neutre', '#d9dbe1'], blue: ['Bleu', '#5b8def'], green: ['Vert', '#3fbf8a'], violet: ['Violet', '#9b7bff'], rose: ['Rose', '#f06fa5'], orange: ['Orange', '#f59e3a'], gold: ['Or', '#d1a84e'] };
const PREF_DEFAULT = { theme: '', accent: 'default', density: 'comfort', radius: 'soft', stockview: 'cards', motion: true };
function loadPrefs() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem('prefs') || '{}'); if (!p.theme) p.theme = localStorage.getItem('theme') || ''; } catch (e) {}
  return { ...PREF_DEFAULT, ...p };
}
state.prefs = loadPrefs();
function savePrefs() { try { localStorage.setItem('prefs', JSON.stringify(state.prefs)); } catch (e) {} }
// Applique le style. Sans le droit « style de présentation », on revient au style par défaut du site.
function applyPrefs() {
  const s = state.me?.settings, ok = can('profile.style');
  const p = ok ? state.prefs : PREF_DEFAULT;
  const theme = ok && s?.options.allowThemes && THEMES.includes(p.theme) ? p.theme : s?.defaultTheme || 'anthracite';
  const d = document.documentElement.dataset;
  d.theme = theme; d.accent = p.accent; d.density = p.density; d.radius = p.radius; d.stockview = p.stockview;
  if (p.motion === false) d.motion = 'off'; else delete d.motion;
  if (state.view === 'money' && state.data) renderMoney(state.data);
}

function renderProfile() {
  const me = state.me;
  if (!me) return;
  const u = me.user, p = state.prefs, ok = can('profile.style'), o = me.settings.options;
  const role = u.global ? 'Administrateur général' : u.admin ? 'Admin du groupe' : u.builtin === 'member' ? 'Membre' : 'Accès personnalisé';
  const pages = PAGE_IDS.filter((x) => can('view.' + x)).map((x) => VIEWS[x][0]);
  const seg = (key, items) => `<div class="seg">${items.map(([v, l]) => `<button data-pref="${key}" data-v="${v}" class="${String(p[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const row = (t, d, ctl) => `<div class="setrow"><div class="tx"><b>${t}</b><span>${d}</span></div>${ctl}</div>`;
  $('#profileBody').innerHTML = `
  <div class="card prof-id">
    <span class="avatar big">${esc((u.name[0] || '?').toUpperCase())}</span>
    <div class="who"><div class="nm">${esc(u.name)}</div><div class="tags"><span class="badge ${u.admin ? 'admin' : ''}">${esc(role)}</span><span class="badge">${esc(groupLabel(state.group))}</span></div></div>
    <a class="btn danger" href="/logout">${ico('logout')}Se déconnecter</a>
  </div>
  <div class="card" style="margin-top:14px">${cardHead('users', 'Mon accès')}
    ${row('Pages accessibles', pages.length ? pages.join(', ') : 'Aucune', '')}
    ${u.global ? row('Portée', 'Tu peux ouvrir tous les groupes depuis le menu en haut à gauche.', '') : ''}
  </div>
  <div class="card" style="margin-top:14px">${cardHead('palette', 'Style de présentation')}
    ${ok ? `${o.allowThemes ? `<div class="setgroup">Thème</div><div class="swatches">${THEMES.map((t) => `<button class="tsw ${(THEMES.includes(p.theme) ? p.theme : me.settings.defaultTheme) === t ? 'on' : ''}" data-pref="theme" data-v="${t}"><span class="tprev" style="background:${THEME_META[t][1]}"><i style="background:${THEME_META[t][2]}"></i><i style="background:${THEME_META[t][2]}"></i></span>${THEME_META[t][0]}</button>`).join('')}</div>` : ''}
    <div class="setgroup">Couleur d’accent</div><div class="swatches">${Object.entries(ACCENTS).map(([k, [l, c]]) => `<button class="adot ${p.accent === k ? 'on' : ''}" style="--c:${c}" data-pref="accent" data-v="${k}" title="${l}" aria-label="${l}"></button>`).join('')}</div>
    <div class="setgroup">Affichage</div>
    ${row('Densité', 'Compact : plus d’informations à l’écran.', seg('density', [['comfort', 'Confortable'], ['compact', 'Compact']]))}
    ${row('Arrondis', 'La forme des cartes et des boutons.', seg('radius', [['square', 'Carrés'], ['soft', 'Doux'], ['round', 'Ronds']]))}
    ${row('Coffre', 'Les items en cartes ou en liste.', seg('stockview', [['cards', 'Cartes'], ['list', 'Liste']]))}
    ${row('Animations', 'Transitions et chiffres qui se comptent.', sw('data-pref-motion', p.motion !== false))}
    <div class="btns" style="margin-top:18px"><button class="btn sm" data-pref-reset>${ico('refresh')}Réinitialiser mon style</button></div>
    <div class="hint" style="margin-top:10px">Ces choix ne changent que ton affichage, sur cet appareil.</div>` : '<div class="note-card" style="margin:0">Le style de présentation est réglé par ton administrateur.</div>'}
  </div>`;
}
$('#profileBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pref]');
  if (b) { state.prefs[b.dataset.pref] = b.dataset.v; savePrefs(); applyPrefs(); renderProfile(); render(); return; }
  if (e.target.closest('[data-pref-reset]')) { state.prefs = { ...PREF_DEFAULT }; savePrefs(); applyPrefs(); renderProfile(); render(); }
});
$('#profileBody').addEventListener('change', (e) => {
  if (e.target.dataset.prefMotion !== undefined) { state.prefs.motion = e.target.checked; savePrefs(); applyPrefs(); }
});

function paintGroup() {
  const name = groupLabel(state.group), letter = esc(name[0]?.toUpperCase() || 'G');
  $('#groupName').textContent = name; $('#groupName2').textContent = name;
  $('#avatar').textContent = letter; $('#avatar2').textContent = letter;
  const groups = state.me.groups.length ? state.me.groups : ['default'];
  $('#groupList').innerHTML = groups.length > 1
    ? groups.map((g) => `<button class="menu-item" data-g="${esc(g)}">${esc(groupLabel(g))}${g === state.group ? '<span class="check">✓</span>' : ''}</button>`).join('') : '';
}
$('#logoutRow').addEventListener('click', (e) => { if (e.target.closest('#goProfile')) { setMenu(false); setView('profile'); } });
$('#groupList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-g]');
  if (!b) return;
  state.group = b.dataset.g; state.shelf = 'all'; state.shown = {};
  paintGroup(); setMenu(false); SET.editor = null; loadAll().catch(() => {});
});

// Applique tout ce que dit /api/me : nom du site, thème, pages visibles, options.
function applyMe() {
  const me = state.me, s = me.settings, o = s.options;
  document.title = s.siteName;
  $('#footer').hidden = !o.showFooter;
  $('#footer').textContent = `© ${new Date().getFullYear()} ${s.siteName}${s.footerText ? ', ' + s.footerText.charAt(0).toLowerCase() + s.footerText.slice(1) : ''}`;
  $('#live').hidden = !o.showLive; $('#sepLive').hidden = !o.showLive;
  applyPrefs();
  $('#keyName').textContent = `Accès : ${me.user.name}${me.user.admin ? ' (administrateur)' : ''}`;
  $('#logoutRow').innerHTML = `<div class="menu-sep"></div><div class="menu-actions"><button class="menu-item" id="goProfile">${ico('users')}<span>Profil</span></button><a class="menu-item danger" href="/logout">${ico('logout')}<span>Quitter</span></a></div>`;
  paintGroup();

  const allowed = allowedViews();
  document.querySelectorAll('#nav button').forEach((b) => { b.hidden = !allowed.includes(b.dataset.view); });
  $('#noAccess').hidden = allowed.length > 0;
  $('.page-head').hidden = allowed.length === 0;
  if (!allowed.length) { document.querySelectorAll('.view').forEach((v) => v.classList.remove('active')); return; }
  if ((!allowed.includes(state.view) && state.view !== 'profile') || !document.querySelector('.view.active')) setView(allowed.includes(state.view) ? state.view : allowed[0]);
}

// ---------- Démarrage + temps réel ----------
function connectLive() {
  const es = new EventSource('/api/stream');
  const live = $('#live');
  es.onopen = () => { live.classList.add('on'); live.lastElementChild.textContent = 'en direct'; };
  es.onmessage = (e) => { (e.data === 'config' ? loadAll() : load()).catch(() => {}); };
  es.onerror = () => { live.classList.remove('on'); live.lastElementChild.textContent = 'reconnexion'; };
}

(async function init() {
  hydrateIcons();
  await loadMe();
  applyMe();
  await load();
  connectLive();
})();
