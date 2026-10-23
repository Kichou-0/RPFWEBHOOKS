import express from 'express';
import session from 'express-session';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Mini chargeur .env ------------------------------------------------------
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const { PORT = 3000, SESSION_SECRET = crypto.randomBytes(32).toString('hex'), ADMIN_PASSWORD = '', DATA_DIR = '', DATABASE_URL = '' } = process.env;

// --- Utilitaires -------------------------------------------------------------
const hash = (p) => { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(p, s, 32).toString('hex'); };
const check = (p, h) => { try { const [s, k] = h.split(':'); return crypto.timingSafeEqual(crypto.scryptSync(p, s, 32), Buffer.from(k, 'hex')); } catch { return false; } };
const rnd = () => crypto.randomBytes(6).toString('base64url');
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const s = (v, n = 80) => String(v ?? '').slice(0, n);
const num = (v) => { v = +v; return Number.isFinite(v) ? Math.max(-1e12, Math.min(1e12, v)) : 0; };
const arr = (a, f) => (Array.isArray(a) ? a : []).slice(0, 500).map(f);
const ROLES = ['admin', 'edit', 'view'];
const RANK = { view: 1, edit: 2, admin: 3 };

// --- Données de départ : le contenu de l'Excel K13 ---------------------------
const excel = () => ({
  seeds: 9,
  g: { vendu: 'Non', acheter: 'oui', fait: 'non' },
  mat: [['Argent', 36000], ['Disqueuse', 0], ['Kit', 0], ['Pochon', 100], ['Graine', 750], ['Lumiere', 40], ['Pot', 750], ['Fertilisant', 750], ['Bouteille', 2250]].map(([n, q]) => ({ n, q })),
  armes: [['Batte', 3, 10000], ['Cran d’arrêt', 1, 20000], ['Tac machette', 1, 15000]].map(([n, q, v]) => ({ n, q, v })),
  objets: [['Tableau', 14, 225], ['Bouteille', 0, 110], ['Statue falcon', 4, 110], ['Culotte', 81, 10], ['Clé ancienne', 7, 55], ['Livre d’enfant', 2, 15], ['Chicha', 2, 15], ['Fiole mystère', 0, 15], ['Buste grecque', 0, 120]].map(([n, q, p]) => ({ n, q, p })),
  rec: [['Lumiere', 2, 18], ['Pot', 9, 9], ['Fertilisant', 9, 9], ['Bouteille', 27, 9]].map(([n, k, p]) => ({ n, k, p })),
});
// Nouveau groupe : mêmes lignes et mêmes prix, mais tout à zéro.
const blank = () => { const d = excel(); d.mat.forEach((x) => (x.q = 0)); d.objets.forEach((x) => (x.q = 0)); d.armes = []; return d; };
const clean = (d = {}) => ({
  seeds: num(d.seeds) || 9,
  g: { vendu: d.g?.vendu === 'Oui' ? 'Oui' : 'Non', acheter: d.g?.acheter === 'non' ? 'non' : 'oui', fait: d.g?.fait === 'oui' ? 'oui' : 'non' },
  mat: arr(d.mat, (x) => ({ n: s(x?.n), q: num(x?.q) })),
  armes: arr(d.armes, (x) => ({ n: s(x?.n), q: num(x?.q), v: num(x?.v) })),
  objets: arr(d.objets, (x) => ({ n: s(x?.n), q: num(x?.q), p: num(x?.p) })),
  rec: arr(d.rec, (x) => ({ n: s(x?.n), k: num(x?.k), p: num(x?.p) })),
});
const newGroup = (name, data) => {
  const a = rnd(), m = rnd();
  return { group: { name, rev: 1, data, access: [{ id: crypto.randomUUID(), name: 'Admin', role: 'admin', hash: hash(a) }, { id: crypto.randomUUID(), name: 'Membre', role: 'edit', hash: hash(m) }] }, a, m };
};

// --- Stockage : PostgreSQL si DATABASE_URL, sinon data.json -----------------
const FILE = path.join(DATA_DIR || __dirname, 'data.json');
let DB, pool = null;
async function load() {
  if (DATABASE_URL) {
    const pg = (await import('pg')).default;
    pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });
    await pool.query('create table if not exists kv (k text primary key, v jsonb)');
    DB = (await pool.query("select v from kv where k = 'db'")).rows[0]?.v;
  } else if (fs.existsSync(FILE)) DB = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (DB) return;
  const adminPw = ADMIN_PASSWORD || rnd();
  const { group, a, m } = newGroup('K13', excel());
  DB = { admin: { hash: hash(adminPw) }, groups: { k13: group } };
  console.log('\n=== Premier démarrage : note ces mots de passe, ils ne seront plus affichés ===');
  console.log('Administrateur général :', adminPw);
  console.log('Groupe K13 – Admin :', a, '| Membre :', m, '\n');
  persist();
}
let timer;
async function persist() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try { if (pool) await pool.query("insert into kv (k, v) values ('db', $1) on conflict (k) do update set v = $1", [JSON.stringify(DB)]); else fs.writeFileSync(FILE, JSON.stringify(DB)); }
    catch (e) { console.error('Sauvegarde impossible :', e.message); }
  }, 300);
}
await load();

// --- Application -------------------------------------------------------------
const app = express();
app.set('trust proxy', 1);
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 30 * 864e5 } }));
const json = express.json({ limit: '300kb' });
const auth = (req, res, next) => (req.session.user && DB.groups[req.session.group] ? next() : res.status(401).json({ error: 'auth' }));
const need = (role) => [auth, (req, res, next) => (RANK[req.session.user.role] >= RANK[role] ? next() : res.status(403).json({ error: 'Droits insuffisants' }))];
const needSA = [auth, (req, res, next) => (req.session.user.sa ? next() : res.status(403).json({ error: 'Réservé à l’administrateur général' }))];
const grp = (req) => DB.groups[req.session.group];

// Connexion
const fails = new Map();
const page = (body) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>K13 – Connexion</title><link rel="stylesheet" href="/style.css"><script>try{var p=JSON.parse(localStorage.getItem('prefs')||'{}');for(var k in p)document.documentElement.dataset[k]=p[k]}catch(e){}</script></head><body class="login">${body}</body></html>`;
app.get('/login', (req, res) => {
  const opts = Object.entries(DB.groups).map(([c, g]) => `<option value="${esc(c)}">${esc(g.name)}</option>`).join('');
  res.send(page(`<form class="card loginbox" method="post" action="/login"><h1>K13 · Stock</h1><p class="sub">Choisis ton groupe et entre ton mot de passe.</p>${req.query.e ? '<p class="err">Mot de passe incorrect.</p>' : ''}<label>Groupe<select class="inp" name="group">${opts}</select></label><label>Mot de passe<input class="inp" type="password" name="password" autocomplete="current-password" autofocus required></label><button class="btn primary">Se connecter</button></form>`));
});
app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  const ip = req.ip, f = fails.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 6e5) { f.n = 0; f.t = Date.now(); }
  if (f.n >= 10) return res.status(429).send(page('<div class="card loginbox"><p class="err">Trop d’essais. Réessaie dans quelques minutes.</p></div>'));
  const code = DB.groups[req.body.group] ? req.body.group : null, pw = s(req.body.password, 200);
  let user = null;
  if (code && DB.admin && check(pw, DB.admin.hash)) user = { sa: true, role: 'admin', name: 'Administrateur général' };
  else { const a = code && DB.groups[code].access.find((x) => check(pw, x.hash)); if (a) user = { sa: false, id: a.id, role: a.role, name: a.name }; }
  if (!user) { f.n++; fails.set(ip, f); return res.redirect('/login?e=1'); }
  req.session.regenerate(() => { req.session.user = user; req.session.group = code; req.session.save(() => res.redirect('/')); });
});
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// Pages
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.get('/', (req, res) => (req.session.user && DB.groups[req.session.group] ? res.sendFile(path.join(__dirname, 'public', 'index.html')) : res.redirect('/login')));

// Données du groupe
const subs = new Map();
const push = (code, rev) => subs.get(code)?.forEach((r) => r.write(`data: ${rev}\n\n`));
app.get('/api/me', auth, (req, res) => {
  const u = req.session.user;
  res.json({ name: u.name, role: u.role, sa: u.sa, group: req.session.group, groupName: grp(req).name, groups: u.sa ? Object.entries(DB.groups).map(([code, g]) => ({ code, name: g.name })) : [] });
});
app.get('/api/data', auth, (req, res) => res.json({ rev: grp(req).rev, data: grp(req).data }));
app.put('/api/data', need('edit'), json, (req, res) => {
  const g = grp(req); g.data = clean(req.body); g.rev++; persist(); push(req.session.group, g.rev); res.json({ rev: g.rev });
});
app.get('/api/stream', auth, (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }); res.flushHeaders();
  const code = req.session.group; if (!subs.has(code)) subs.set(code, new Set()); subs.get(code).add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); subs.get(code)?.delete(res); });
});
app.get('/api/export', need('admin'), (req, res) => { res.set('Content-Disposition', `attachment; filename="k13-${req.session.group}.json"`); res.json(grp(req).data); });
app.post('/api/reset', need('admin'), (req, res) => { const g = grp(req); g.data = excel(); g.rev++; persist(); push(req.session.group, g.rev); res.json({ ok: true }); });

// Réglages : groupe, accès, groupes
app.post('/api/me/password', auth, json, (req, res) => {
  const u = req.session.user, cur = s(req.body.current, 200), pw = s(req.body.password, 100);
  if (pw.length < 4) return res.status(400).json({ error: 'Mot de passe : 4 caractères minimum' });
  if (u.sa) { if (!check(cur, DB.admin.hash)) return res.status(400).json({ error: 'Mot de passe actuel incorrect' }); DB.admin.hash = hash(pw); }
  else { const a = grp(req).access.find((x) => x.id === u.id); if (!a || !check(cur, a.hash)) return res.status(400).json({ error: 'Mot de passe actuel incorrect' }); a.hash = hash(pw); }
  persist(); res.json({ ok: true });
});
app.put('/api/group', need('admin'), json, (req, res) => { grp(req).name = s(req.body.name, 40) || grp(req).name; persist(); res.json({ ok: true }); });
app.get('/api/access', need('admin'), (req, res) => res.json(grp(req).access.map(({ id, name, role }) => ({ id, name, role }))));
app.post('/api/access', need('admin'), json, (req, res) => {
  const pw = s(req.body.password, 100) || rnd();
  if (pw.length < 4) return res.status(400).json({ error: 'Mot de passe : 4 caractères minimum' });
  const a = { id: crypto.randomUUID(), name: s(req.body.name, 40) || 'Accès', role: ROLES.includes(req.body.role) ? req.body.role : 'view', hash: hash(pw) };
  grp(req).access.push(a); persist(); res.json({ id: a.id, password: pw });
});
const lastAdmin = (g, a) => a.role === 'admin' && g.access.filter((x) => x.role === 'admin').length < 2;
app.put('/api/access/:id', need('admin'), json, (req, res) => {
  const g = grp(req), a = g.access.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Accès introuvable' });
  if (req.body.role && ROLES.includes(req.body.role) && req.body.role !== a.role) { if (lastAdmin(g, a)) return res.status(400).json({ error: 'Il faut garder au moins un admin' }); a.role = req.body.role; }
  if (req.body.name) a.name = s(req.body.name, 40);
  let password;
  if (req.body.password) { password = s(req.body.password, 100); if (password.length < 4) return res.status(400).json({ error: 'Mot de passe : 4 caractères minimum' }); a.hash = hash(password); }
  else if (req.body.newPassword) { password = rnd(); a.hash = hash(password); }
  persist(); res.json({ password });
});
app.delete('/api/access/:id', need('admin'), (req, res) => {
  const g = grp(req), a = g.access.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Accès introuvable' });
  if (lastAdmin(g, a)) return res.status(400).json({ error: 'Il faut garder au moins un admin' });
  g.access = g.access.filter((x) => x !== a); persist(); res.json({ ok: true });
});
app.post('/api/groups', needSA, json, (req, res) => {
  const name = s(req.body.name, 40).trim(); if (!name) return res.status(400).json({ error: 'Nom requis' });
  let code = name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'g'; if (DB.groups[code]) code += '-' + rnd().slice(0, 3).toLowerCase();
  const { group, a, m } = newGroup(name, blank()); DB.groups[code] = group; persist(); res.json({ code, admin: a, member: m });
});
app.delete('/api/groups/:code', needSA, (req, res) => {
  if (!DB.groups[req.params.code] || Object.keys(DB.groups).length < 2) return res.status(400).json({ error: 'Impossible de supprimer ce groupe' });
  delete DB.groups[req.params.code]; if (req.session.group === req.params.code) req.session.group = Object.keys(DB.groups)[0]; persist(); res.json({ ok: true });
});
app.post('/api/switch', needSA, json, (req, res) => { if (!DB.groups[req.body.group]) return res.status(400).json({ error: 'Groupe inconnu' }); req.session.group = req.body.group; res.json({ ok: true }); });

app.listen(PORT, () => console.log(`K13 Stock sur http://localhost:${PORT}`));
