// K13 Stock — interface. Pages = les feuilles de l'Excel + Réglages (admin) + Profil.
const $ = (s) => document.querySelector(s);
const N = (v) => +v || 0, sum = (a) => a.reduce((x, y) => x + y, 0);
const f = (n) => N(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const TABS = [['acc', 'Accueil'], ['arm', 'Armes'], ['mat', 'Matériel'], ['obj', 'Objets'], ['pla', 'Plantation']];
const THEMES = [['anthracite', 'Anthracite'], ['navy', 'Navy'], ['feutre', 'Feutre'], ['minuit', 'Minuit'], ['clair', 'Clair']];
const ACCENTS = [['', 'Défaut', '#9b9da6'], ['blue', 'Bleu', '#5b8def'], ['green', 'Vert', '#3fbf8a'], ['violet', 'Violet', '#9b7bff'], ['rose', 'Rose', '#f06fa5'], ['orange', 'Orange', '#f59e3a'], ['gold', 'Or', '#d1a84e']];
let ME, D, tab = 'acc', rev = 0, ro = true, pending = false, st;

async function api(u, m = 'GET', b) {
  const r = await fetch(u, { method: m, headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
  if (r.status === 401) { location = '/login'; throw new Error('auth'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}
function toast(t) { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (e.hidden = true), 2600); }
function live(s) { const e = $('#live'); e.className = 'live ' + (s === 'ok' ? '' : s); e.lastElementChild.textContent = s === 'ok' ? 'en direct' : s === 'wait' ? 'enregistrement…' : 'hors ligne'; }

// ---- Calculs (les formules de l'Excel) ------------------------------------
function C() {
  const mq = (n) => N((D.mat.find((m) => String(m.n).trim().toLowerCase() === String(n).trim().toLowerCase()) || {}).q);
  const A = D.armes.map((a) => N(a.q) * N(a.v)), O = D.objets.map((o) => N(o.q) * N(o.p));
  const at = sum(A), ot = sum(O), gr = mq('Graine'), nb = N(D.seeds) ? gr / N(D.seeds) : 0, arg = mq('Argent');
  const R = D.rec.map((r) => { const need = N(r.k) * nb, have = mq(r.n), faut = Math.max(0, need - have); return { have, faut, cost: faut * N(r.p) }; });
  return { A, O, at, ot, gr, nb, R, arg, rt: sum(R.map((r) => r.cost)), val: arg + at + ot, narm: sum(D.armes.map((a) => N(a.q))),
    plant: gr === 0 ? 'Rien' : D.g.fait === 'oui' ? 'Fait' : 'Pas fait',
    ach: gr === 0 ? 'Rien' : D.g.acheter === 'oui' ? 'Oui' : 'Non',
    vendu: D.g.vendu === 'Non' ? (ot === 0 ? 'Rien' : 'Non') : 'Oui' };
}

// ---- Briques HTML -----------------------------------------------------------
const dis = () => (ro ? ' disabled' : '');
const inp = (t, i, k, v, num) => `<input data-t="${t}" data-i="${i}" data-f="${k}" ${num ? 'type="number" inputmode="decimal" step="any"' : 'type="text"'} value="${esc(v)}" aria-label="${k}"${dis()}>`;
const del = (t, i) => (ro ? '<td></td>' : `<td><button class="x" data-del="${t}" data-i="${i}" aria-label="Supprimer">✕</button></td>`);
const add = (t, l) => (ro ? '' : `<button class="btn" data-add="${t}">+ ${l}</button>`);
const tot = (k) => `<span data-k="${k}"></span>`;
const badge = (k) => `<span class="badge" data-k="${k}"></span>`;
const sel = (k, o) => `<select data-t="g" data-f="${k}"${dis()}>${o.map(([v, l]) => `<option value="${v}"${D.g[k] === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
const stat = (l, v, cls = '') => `<div class="stat ${cls}"><span>${l}</span><div class="val">${v}</div></div>`;

const V = {
  acc: () => `<div class="stats">${stat('Argent valeur', '<span data-k="val"></span><small>argent + armes + objets</small>', 'wide')}
${stat('Argent', '<span data-k="arg"></span>')}${stat('Nombre d’armes', '<span data-k="narm"></span>')}${stat('Graine', '<span data-k="gr"></span>')}
${stat('Plantation', badge('plant'))}${stat('Acheter', badge('ach'))}${stat('Objets vendus', badge('vendu'))}</div>
<p class="note">Page calculée automatiquement : rien à modifier ici.</p>`,
  arm: () => `<div class="card"><div class="tw"><table><thead><tr><th>Arme</th><th>Quantité</th><th>Valeur</th><th>Valeur totale</th><th></th></tr></thead><tbody>
${D.armes.map((a, i) => `<tr><td>${inp('armes', i, 'n', a.n)}</td><td>${inp('armes', i, 'q', a.q, 1)}</td><td>${inp('armes', i, 'v', a.v, 1)}</td><td class="n" data-k="a${i}"></td>${del('armes', i)}</tr>`).join('')}
</tbody><tfoot><tr><td>Nombre d’armes : ${tot('narm')}</td><td></td><td>Valeur totale estimée :</td><td class="n">${tot('at')}</td><td></td></tr></tfoot></table></div>${add('armes', 'Ajouter une arme')}</div>`,
  mat: () => `<div class="card"><div class="tw"><table><thead><tr><th>Matériel</th><th>Quantité</th><th></th></tr></thead><tbody>
${D.mat.map((a, i) => `<tr><td>${inp('mat', i, 'n', a.n)}</td><td>${inp('mat', i, 'q', a.q, 1)}</td>${del('mat', i)}</tr>`).join('')}</tbody></table></div>${add('mat', 'Ajouter du matériel')}
<p class="note">« Argent » et « Graine » alimentent l’accueil et la plantation. Lumiere, Pot, Fertilisant et Bouteille servent au calcul de plantation.</p></div>`,
  obj: () => `<div class="card"><div class="tw"><table><thead><tr><th>Objet</th><th>Quantité</th><th>Prix unitaire</th><th>Valeur</th><th></th></tr></thead><tbody>
${D.objets.map((a, i) => `<tr><td>${inp('objets', i, 'n', a.n)}</td><td>${inp('objets', i, 'q', a.q, 1)}</td><td>${inp('objets', i, 'p', a.p, 1)}</td><td class="n" data-k="o${i}"></td>${del('objets', i)}</tr>`).join('')}
</tbody><tfoot><tr><td>Prix total :</td><td></td><td></td><td class="n">${tot('ot')}</td><td></td></tr></tfoot></table></div>
<div class="grid2"><label>Vendu ?${sel('vendu', [['Non', 'Non'], ['Oui', 'Oui']])}</label></div>${add('objets', 'Ajouter un objet')}</div>`,
  pla: () => `<div class="stats">${stat('Graine', '<span data-k="gr"></span>')}${stat('Prix', '<span data-k="rt"></span>')}${stat('Nombre de plantations', '<span data-k="nb"></span>')}</div>
<div class="card" style="margin-top:14px"><div class="tw"><table><thead><tr><th>Matériel</th><th>Qté / plantation</th><th>Prix unitaire</th><th>On a</th><th>Faut</th><th>Prix</th><th></th></tr></thead><tbody>
${D.rec.map((r, i) => `<tr><td>${inp('rec', i, 'n', r.n)}</td><td>${inp('rec', i, 'k', r.k, 1)}</td><td>${inp('rec', i, 'p', r.p, 1)}</td><td class="n" data-k="rh${i}"></td><td class="n" data-k="rf${i}"></td><td class="n" data-k="rc${i}"></td>${del('rec', i)}</tr>`).join('')}
</tbody></table></div>
<div class="grid2"><label>Graines par plantation<input data-t="s" data-f="seeds" type="number" step="any" value="${esc(D.seeds)}"${dis()}></label>
<label>Acheter ?${sel('acheter', [['oui', 'Oui'], ['non', 'Non']])}</label><label>Fait ?${sel('fait', [['non', 'Non'], ['oui', 'Oui']])}</label></div>${add('rec', 'Ajouter une ligne')}
<p class="note">« On a » vient de l’onglet Matériel (même nom). Faut = besoin − stock, jamais sous 0.</p></div>`,
  pro: () => {
    const p = prefs();
    return `<div class="card"><div class="card-h"><h3>Ton accès</h3></div><p style="margin:0">${esc(ME.name)} · ${{ admin: 'Admin', edit: 'Peut modifier', view: 'Lecture seule' }[ME.role]} · groupe ${esc(ME.groupName)}</p></div>
<div class="card"><div class="card-h"><h3>Mon mot de passe</h3></div><div class="grid2"><label>Mot de passe actuel<input id="pcur" type="password" autocomplete="current-password"></label><label>Nouveau mot de passe<input id="pnew" type="password" autocomplete="new-password" placeholder="4 caractères minimum"></label></div><button class="btn primary" data-act="mypw">Changer mon mot de passe</button><div id="pmsg"></div></div>
<div class="card"><div class="card-h"><h3>Thème</h3></div><div class="sw">${THEMES.map(([k, l]) => `<button data-pref="theme" data-v="${k}" class="${(p.theme || 'anthracite') === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
<div class="card"><div class="card-h"><h3>Couleur d’accent</h3></div><div class="sw">${ACCENTS.map(([k, l, c]) => `<button class="dot ${(p.accent || '') === k ? 'on' : ''}" style="--c:${c}" data-pref="accent" data-v="${k}" title="${l}" aria-label="${l}"></button>`).join('')}</div></div>
<div class="card"><div class="card-h"><h3>Animations</h3></div><div class="sw"><button data-pref="motion" data-v="" class="${p.motion ? '' : 'on'}">Activées</button><button data-pref="motion" data-v="off" class="${p.motion ? 'on' : ''}">Coupées</button></div></div>`;
  },
  set: () => '<div id="setBody"><p class="note">Chargement…</p></div>',
};
const TITLES = { acc: 'Accueil', arm: 'Armes', mat: 'Matériel', obj: 'Objets', pla: 'Plantation', pro: 'Profil', set: 'Réglages' };

// ---- Réglages (admin) -------------------------------------------------------
async function renderSettings() {
  const acc = await api('/api/access');
  const roles = [['admin', 'Admin'], ['edit', 'Peut modifier'], ['view', 'Lecture seule']];
  $('#setBody').innerHTML = `<div class="card"><div class="card-h"><h3>Ce groupe</h3></div>
<div class="row"><input id="gname" value="${esc(ME.groupName)}" aria-label="Nom du groupe"><button class="btn sm primary" data-act="rename">Renommer</button></div></div>
<div class="card"><div class="card-h"><h3>Accès (mots de passe)</h3></div>
${acc.map((a) => `<div class="row"><span>${esc(a.name)}</span><select data-ar="${a.id}">${roles.map(([v, l]) => `<option value="${v}"${a.role === v ? ' selected' : ''}>${l}</option>`).join('')}</select><input type="text" id="pw-${a.id}" placeholder="Nouveau mot de passe (vide = au hasard)" aria-label="Nouveau mot de passe" autocomplete="off"><button class="btn sm" data-act="pw" data-id="${a.id}">Changer</button><button class="btn sm danger" data-act="delacc" data-id="${a.id}">Supprimer</button></div>`).join('')}
<div class="row"><input id="an" placeholder="Nom du nouvel accès" aria-label="Nom du nouvel accès"><input type="text" id="apw" placeholder="Mot de passe (vide = au hasard)" aria-label="Mot de passe du nouvel accès" autocomplete="off"><select id="ar">${roles.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><button class="btn sm primary" data-act="addacc">Créer</button></div>
<div id="smsg"></div></div>
${ME.sa ? `<div class="card"><div class="card-h"><h3>Groupes</h3></div>${ME.groups.map((g) => `<div class="row"><span>${esc(g.name)} <small class="note">(${esc(g.code)})</small></span><button class="btn sm danger" data-act="delgrp" data-id="${esc(g.code)}">Supprimer</button></div>`).join('')}
<div class="row"><input id="gn" placeholder="Nom du nouveau groupe" aria-label="Nom du nouveau groupe"><button class="btn sm primary" data-act="addgrp">Créer</button></div>
<p class="note">Un nouveau groupe démarre avec les mêmes lignes et prix que l’Excel, mais tout à zéro.</p><div id="gmsg"></div></div>` : ''}
<div class="card"><div class="card-h"><h3>Données</h3></div><a class="btn" href="/api/export" style="display:inline-block;text-decoration:none">Exporter (JSON)</a>
<button class="btn danger" data-act="reset">Remettre les valeurs de l’Excel</button></div>`;
}
const showPw = (el, t) => { $(el).innerHTML = `<div class="msg">${t}<br><small class="note">À noter maintenant : il ne sera plus affiché.</small></div>`; };
async function act(b) {
  const d = b.dataset;
  try {
    if (d.act === 'rename') { await api('/api/group', 'PUT', { name: $('#gname').value }); ME.groupName = $('#gname').value; $('#groupName').textContent = ME.groupName; toast('Groupe renommé'); }
    if (d.act === 'pw') { const v = $('#pw-' + d.id).value.trim(); const r = await api('/api/access/' + d.id, 'PUT', v ? { password: v } : { newPassword: true }); showPw('#smsg', 'Nouveau mot de passe : ' + esc(r.password)); }
    if (d.act === 'mypw') { await api('/api/me/password', 'POST', { current: $('#pcur').value, password: $('#pnew').value }); $('#pcur').value = $('#pnew').value = ''; $('#pmsg').innerHTML = '<div class="msg">Mot de passe changé.</div>'; }
    if (d.act === 'delacc') { await api('/api/access/' + d.id, 'DELETE'); await renderSettings(); }
    if (d.act === 'addacc') { const r = await api('/api/access', 'POST', { name: $('#an').value, role: $('#ar').value, password: $('#apw').value.trim() }); await renderSettings(); showPw('#smsg', 'Accès créé. Mot de passe : ' + esc(r.password)); }
    if (d.act === 'addgrp') { const r = await api('/api/groups', 'POST', { name: $('#gn').value }); ME.groups = (await api('/api/me')).groups; await renderSettings(); showPw('#gmsg', `Groupe « ${esc(r.code)} » créé. Admin : ${esc(r.admin)} · Membre : ${esc(r.member)}`); }
    if (d.act === 'delgrp') { if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Sûr ? Clique encore'; return; } await api('/api/groups/' + d.id, 'DELETE'); location.reload(); }
    if (d.act === 'reset') { if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Sûr ? Clique encore'; return; } await api('/api/reset', 'POST', {}); await loadData(); toast('Valeurs de l’Excel remises'); }
  } catch (e) { toast(e.message); }
}

// ---- Affichage ----------------------------------------------------------------
function prefs() { try { return JSON.parse(localStorage.getItem('prefs') || '{}'); } catch { return {}; } }
function setPref(k, v) { const p = prefs(); if (v) p[k] = v; else delete p[k]; try { localStorage.setItem('prefs', JSON.stringify(p)); } catch {} const d = document.documentElement.dataset; if (v) d[k] = v; else delete d[k]; if (k === 'theme' && !v) d.theme = 'anthracite'; render(); }
function upd() {
  const c = C(), K = { val: c.val, arg: c.arg, narm: c.narm, gr: c.gr, at: c.at, ot: c.ot, nb: c.nb, rt: c.rt, plant: c.plant, ach: c.ach, vendu: c.vendu };
  c.A.forEach((v, i) => (K['a' + i] = v)); c.O.forEach((v, i) => (K['o' + i] = v));
  c.R.forEach((r, i) => { K['rh' + i] = r.have; K['rf' + i] = r.faut; K['rc' + i] = r.cost; });
  document.querySelectorAll('[data-k]').forEach((e) => { const v = K[e.dataset.k]; e.textContent = typeof v === 'number' ? f(v) : v; if (e.classList.contains('badge')) e.dataset.s = v; });
}
function render() {
  const tabs = [...TABS, ...(ME.role === 'admin' ? [['set', 'Réglages']] : [])];
  $('#nav').innerHTML = tabs.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'active' : ''}">${l}</button>`).join('');
  $('#pageTitle').textContent = TITLES[tab];
  $('#v').innerHTML = V[tab]();
  if (tab === 'set') renderSettings().catch((e) => toast(e.message)); else upd();
}
function menu() {
  const m = $('#menu');
  m.innerHTML = `<small>${esc(ME.name)}</small>${ME.sa ? '<small>Changer de groupe</small>' + ME.groups.map((g) => `<button data-grp="${esc(g.code)}">${g.code === ME.group ? '✓ ' : ''}${esc(g.name)}</button>`).join('') : ''}<button data-tab="pro">Profil et style</button><button data-out="1">Quitter</button>`;
}

// ---- Données et live ------------------------------------------------------------
async function loadData() { const r = await api('/api/data'); D = r.data; rev = r.rev; pending = false; render(); live('ok'); }
function save() { clearTimeout(st); live('wait'); st = setTimeout(async () => { try { rev = (await api('/api/data', 'PUT', D)).rev; live('ok'); } catch (e) { live('err'); toast(e.message); } }, 400); }
function stream() {
  const es = new EventSource('/api/stream');
  es.onmessage = (e) => { if (+e.data <= rev) return; if (document.activeElement?.matches('input,select')) pending = true; else loadData().catch(() => {}); };
  es.onerror = () => live('err'); es.onopen = () => live('ok');
}
const NEW = { armes: { n: '', q: 0, v: 0 }, mat: { n: '', q: 0 }, objets: { n: '', q: 0, p: 0 }, rec: { n: '', k: 0, p: 0 } };
document.addEventListener('input', (e) => {
  const d = e.target.dataset; if (!d.t || ro) return;
  let v = e.target.value; if (e.target.type === 'number') v = v === '' ? 0 : +v;
  if (d.t === 'g') D.g[d.f] = v; else if (d.t === 's') D[d.f] = v; else D[d.t][d.i][d.f] = v;
  upd(); save();
});
document.addEventListener('focusout', () => { if (pending) setTimeout(() => { if (!document.activeElement?.matches('input,select')) loadData().catch(() => {}); }, 100); });
document.addEventListener('change', async (e) => {
  if (!e.target.dataset.ar) return;
  try { await api('/api/access/' + e.target.dataset.ar, 'PUT', { role: e.target.value }); toast('Droits modifiés'); } catch (x) { toast(x.message); renderSettings(); }
});
document.addEventListener('click', async (e) => {
  const menuEl = $('#menu'), pill = e.target.closest('#userBtn');
  if (pill) { menu(); menuEl.hidden = !menuEl.hidden; pill.setAttribute('aria-expanded', !menuEl.hidden); return; }
  if (!e.target.closest('#menu')) menuEl.hidden = true;
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.tab) { tab = d.tab; menuEl.hidden = true; return render(); }
  if (d.out) return (location = '/logout');
  if (d.grp) { await api('/api/switch', 'POST', { group: d.grp }); return location.reload(); }
  if (d.pref) return setPref(d.pref, d.v);
  if (d.act) return act(b);
  if (d.add && !ro) { D[d.add].push({ ...NEW[d.add] }); save(); render(); }
  if (d.del && !ro) { D[d.del].splice(+d.i, 1); save(); render(); }
});

(async () => {
  try {
    ME = await api('/api/me'); ro = ME.role === 'view';
    $('#groupName').textContent = ME.groupName; $('#avatar').textContent = ME.groupName.slice(0, 1).toUpperCase();
    await loadData(); stream();
  } catch (e) { if (e.message !== 'auth') toast(e.message); }
})();
