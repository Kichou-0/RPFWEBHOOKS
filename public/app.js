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
  money: ['Argent', 'Argent propre et sale, tel que relevé par le serveur.'],
};

const state = { me: null, group: 'default', data: null, shelf: 'all', logFilter: '', view: 'overview', chart: null, shown: {} };
const nf = new Intl.NumberFormat('fr-FR');
const money = (n) => '$' + nf.format(Math.round(n || 0));
const fmtTime = (ts) => new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const ago = (ts) => {
  if (!ts) return 'Jamais vu';
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `Vu il y a ${s} s`;
  if (s < 3600) return `Vu il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Vu il y a ${Math.floor(s / 3600)} h`;
  return `Vu il y a ${Math.floor(s / 86400)} j`;
};
const plural = (n, w) => `${nf.format(n)} ${w}${n > 1 ? 's' : ''}`;
const groupLabel = (g) => (g === 'default' ? 'Mon groupe' : g);

// ---------- Images : image réelle si dispo, sinon monogramme ----------
function imgUrl(it) {
  if (it.image) return it.image;
  if (state.me?.imageBase) return state.me.imageBase.replace('{name}', encodeURIComponent(it.name));
  return '';
}
function plateContent(it) {
  const mono = esc(String(it.label || it.name).trim().slice(0, 2));
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
async function load() {
  state.data = await api('/api/state?group=' + encodeURIComponent(state.group));
  render();
}

// ---------- Nombres d'argent qui se comptent ----------
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function countTo(el, to) {
  const key = el.dataset.k;
  const from = state.shown[key] ?? 0;
  state.shown[key] = to;
  if (reduceMotion || from === to) { el.textContent = money(to); return; }
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
  if (!d) return;
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
  if (!list.length) return '<div class="empty">Aucun log reçu pour le moment. Dès que ton serveur envoie un événement, il apparaît ici.</div>';
  return list
    .map((l) => `<div class="mv"><span class="tile ${esc(l.action)}">${ico(actIcon(l.action))}</span><div class="grow"><div class="who">${esc(l.player)}</div><div class="what">${esc(describe(l))}</div></div><span class="when">${fmtTime(l.ts)}</span></div>`)
    .join('');
}

function renderOverview(d) {
  const m = lastMoney(d), f = d.money[0] || m;
  const total = d.stock.reduce((a, i) => a + i.count, 0);
  const on = d.members.filter((x) => x.online);
  const box = $('#statsOverview');
  box.innerHTML =
    stat('wallet', 'Argent propre', moneyNum('oc', 'clean'), deltaText(d, m.clean, f.clean)) +
    stat('wallet', 'Argent sale', moneyNum('od', 'dirty'), deltaText(d, m.dirty, f.dirty)) +
    stat('box', 'Coffre', `<span class="num">${nf.format(d.stock.length)}</span>`, `références, ${plural(total, 'pièce')} au total`) +
    stat('users', 'Membres en ligne', `<span class="num">${on.length} / ${d.members.length}</span>`, d.members.length ? 'connectés maintenant' : 'Aucun membre reçu');
  startCounts(box, m);

  $('#recentLogs').innerHTML = mvRows(d.logs.slice(0, 8));

  const by = {};
  for (const it of d.stock) by[it.category] = (by[it.category] || 0) + 1;
  const keys = [...CAT_ORDER, ...Object.keys(by).filter((c) => !CAT_ORDER.includes(c))].filter((c) => by[c]);
  const max = Math.max(1, ...keys.map((k) => by[k]));
  $('#shelfBars').innerHTML = keys.length
    ? `<div class="bars">${keys.map((k) => { const c = catInfo(k); return `<div class="bar" style="--c:${c.color}"><div class="row"><span>${esc(c.label)}</span><span>${plural(by[k], 'référence')}</span></div><div class="track"><div class="fill" style="width:${(by[k] / max) * 100}%"></div></div></div>`; }).join('')}</div>`
    : '<div class="empty">Le coffre est vide pour le moment.</div>';

  $('#onlineList').innerHTML = on.length
    ? on.map((m2) => `<div class="online"><span class="lamp on"></span>${esc(m2.name)}<small>${esc(m2.grade)}</small></div>`).join('')
    : '<div class="empty">Personne n’est connecté.</div>';
}

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
      .map((i) => `<article class="crate" style="--c:${info.color}" title="${esc(i.name)}"><div class="plate">${plateContent(i)}</div><span class="qty">×${nf.format(i.count)}</span><div class="info"><div class="name">${esc(i.label)}</div><div class="cat">${esc(info.label)}</div></div></article>`)
      .join('')}</div></section>`;
  }
  $('#stockGrid').innerHTML = html || `<div class="empty">${d.stock.length ? 'Aucun item ne correspond à ta recherche.' : 'Le coffre est vide. Envoie un snapshot depuis ton serveur pour le remplir.'}</div>`;
}

// ---------- Membres ----------
function renderMembers(d) {
  const list = [...d.members].sort((a, b) => Number(b.online) - Number(a.online) || (b.lastSeen || 0) - (a.lastSeen || 0));
  $('#memberGrid').innerHTML = list.length
    ? `<div class="people">${list
        .map((m) => `<div class="card person"><span class="avatar">${esc((m.name || '?')[0].toUpperCase())}<i class="${m.online ? 'on' : ''}"></i></span><div><div class="nm">${esc(m.name)}</div><span class="badge">${esc(m.grade)}</span><div class="seen">${m.online ? 'En ligne' : esc(ago(m.lastSeen))}</div></div></div>`)
        .join('')}</div>`
    : '<div class="card"><div class="empty">Aucun membre reçu. Envoie la liste depuis ton serveur avec SyncMembers.</div></div>';
}

// ---------- Argent ----------
function renderMoney(d) {
  const m = lastMoney(d), f = d.money[0] || m;
  const box = $('#statsMoney');
  const v = (a, b) => { const x = a - b; return `<span class="num ${x >= 0 ? 'clean' : 'dirty'}">${x >= 0 ? '+' : '−'}${money(Math.abs(x))}</span>`; };
  box.innerHTML =
    stat('wallet', 'Argent propre', moneyNum('mc', 'clean')) +
    stat('wallet', 'Argent sale', moneyNum('md', 'dirty')) +
    stat('wallet', 'Variation propre', v(m.clean, f.clean), 'depuis le premier relevé') +
    stat('wallet', 'Variation sale', v(m.dirty, f.dirty), 'depuis le premier relevé');
  startCounts(box, m);
  if (state.view !== 'money' || typeof Chart === 'undefined') return;
  state.chart?.destroy();
  const css = getComputedStyle(document.documentElement);
  const clean = css.getPropertyValue('--clean').trim(), dirty = css.getPropertyValue('--dirty').trim(), dim = css.getPropertyValue('--dim').trim();
  const grid = css.getPropertyValue('--line').trim();
  state.chart = new Chart($('#moneyChart'), {
    type: 'line',
    data: {
      labels: d.money.map((p) => fmtTime(p.ts)),
      datasets: [
        { label: 'Propre', data: d.money.map((p) => p.clean), borderColor: clean, backgroundColor: clean + '1f', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 },
        { label: 'Sale', data: d.money.map((p) => p.dirty), borderColor: dirty, backgroundColor: dirty + '1a', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: dim, usePointStyle: true, pointStyle: 'circle' } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${money(c.parsed.y)}` } } },
      scales: { x: { ticks: { color: dim, maxTicksLimit: 8 }, grid: { color: grid } }, y: { ticks: { color: dim, callback: (x) => money(x) }, grid: { color: grid } } },
    },
  });
}

// ---------- Navigation ----------
function setView(v) {
  state.view = v;
  document.querySelectorAll('#nav button').forEach((x) => x.classList.toggle('active', x.dataset.view === v));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.id === 'view-' + v));
  $('#pageTitle').textContent = VIEWS[v][0];
  $('#pageSub').textContent = VIEWS[v][1];
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

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch (e) {}
  document.querySelectorAll('#themeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.theme === t));
  if (state.view === 'money' && state.data) renderMoney(state.data);
}
$('#themeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) applyTheme(b.dataset.theme); });

function paintGroup() {
  const name = groupLabel(state.group), letter = esc(name[0]?.toUpperCase() || 'G');
  $('#groupName').textContent = name; $('#groupName2').textContent = name;
  $('#avatar').textContent = letter; $('#avatar2').textContent = letter;
  const groups = state.me.groups.length ? state.me.groups : ['default'];
  $('#groupList').innerHTML = groups.length > 1
    ? groups.map((g) => `<button class="menu-item" data-g="${esc(g)}">${esc(groupLabel(g))}${g === state.group ? '<span class="check">✓</span>' : ''}</button>`).join('') : '';
}
$('#groupList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-g]');
  if (!b) return;
  state.group = b.dataset.g; state.shelf = 'all'; state.shown = {};
  paintGroup(); setMenu(false); load();
});

// ---------- Démarrage + temps réel ----------
function connectLive() {
  const es = new EventSource('/api/stream');
  const live = $('#live');
  es.onopen = () => { live.classList.add('on'); live.lastElementChild.textContent = 'en direct'; };
  es.onmessage = () => load();
  es.onerror = () => { live.classList.remove('on'); live.lastElementChild.textContent = 'reconnexion'; };
}

(async function init() {
  hydrateIcons();
  applyTheme(document.documentElement.dataset.theme || 'anthracite');
  setView('overview');
  state.me = await api('/api/me');
  const groups = state.me.groups.length ? state.me.groups : ['default'];
  state.group = groups.includes('default') ? 'default' : groups[0];
  paintGroup();
  $('#logoutRow').innerHTML = state.me.demo ? '' : `<div class="menu-sep"></div><a class="menu-item danger" href="/logout">${ico('logout')}<span>Se déconnecter</span></a>`;
  await load();
  connectLive();
})();
