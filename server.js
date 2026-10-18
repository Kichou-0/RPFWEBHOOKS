import express from 'express';
import session from 'express-session';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Mini chargeur .env (pas de dépendance supplémentaire) -----------------
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const {
  PORT = 3000,
  WEBHOOK_SECRET = '',
  SESSION_SECRET = crypto.randomBytes(32).toString('hex'),
  ADMIN_PASSWORD = '',
  MEMBER_PASSWORD = '',
  SITE_PASSWORD = '', // ancien nom : sert de mot de passe « membre »
  ITEM_IMAGE_BASE = '',
  DATA_DIR = '',
} = process.env;

if (!WEBHOOK_SECRET) console.error('⚠️  WEBHOOK_SECRET manquant dans .env : le webhook refusera toutes les requêtes.');

// --- Permissions ------------------------------------------------------------
// Chaque accès (mot de passe) reçoit un sous-ensemble de ces permissions.
// Un administrateur peut aussi couper une permission pour tout le monde (« fonctions »).
const PERMS = [
  { id: 'view.overview', group: 'Pages', label: 'Aperçu', desc: 'Page d’accueil avec les chiffres clés.' },
  { id: 'view.stock', group: 'Pages', label: 'Coffre', desc: 'Items stockés, rangés par catégorie.' },
  { id: 'view.logs', group: 'Pages', label: 'Logs', desc: 'Historique des dépôts, retraits et événements.' },
  { id: 'view.members', group: 'Pages', label: 'Membres', desc: 'Liste des membres et présence en ligne.' },
  { id: 'view.money', group: 'Pages', label: 'Argent', desc: 'Soldes et courbe d’évolution.' },
  { id: 'money.dirty', group: 'Détails', label: 'Argent sale', desc: 'Voir le montant d’argent sale.' },
  { id: 'stock.images', group: 'Détails', label: 'Images des items', desc: 'Afficher les images, sinon deux lettres.' },
  { id: 'logs.players', group: 'Détails', label: 'Noms dans les logs', desc: 'Sinon les joueurs apparaissent comme « Membre ».' },
  { id: 'members.lastseen', group: 'Détails', label: 'Dernières connexions', desc: 'Voir quand chaque membre a été vu.' },
];
const PERM_IDS = PERMS.map((p) => p.id);
const THEMES = ['navy', 'anthracite', 'feutre'];
const allTrue = () => Object.fromEntries(PERM_IDS.map((id) => [id, true]));

// --- Utilitaires -------------------------------------------------------------
const clip = (v, n = 200) => (v == null ? '' : String(v).slice(0, n));
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const toMs = (ts) => {
  const n = Number(ts);
  if (!n) return Date.now();
  return n < 1e12 ? n * 1000 : n; // accepte secondes (os.time) ou ms
};
const safeEq = (a, b) => {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};
const newId = () => crypto.randomBytes(6).toString('hex');
const PW_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randPw = (n = 12) => {
  const b = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += PW_ALPHABET[b[i] % PW_ALPHABET.length];
  return s;
};
const hashPw = (pw) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(pw, salt, 32).toString('hex') };
};
const checkPw = (pw, k) => {
  try {
    const h = crypto.scryptSync(String(pw), k.salt, 32);
    const e = Buffer.from(k.hash, 'hex');
    return h.length === e.length && crypto.timingSafeEqual(h, e);
  } catch {
    return false;
  }
};

// --- Données ------------------------------------------------------------------
if (DATA_DIR) fs.mkdirSync(DATA_DIR, { recursive: true });
const DATA_FILE = path.join(DATA_DIR || __dirname, 'data.json');

const defaultSettings = () => ({
  siteName: 'Tableau de bord du groupe',
  defaultTheme: 'anthracite',
  imageBase: ITEM_IMAGE_BASE,
  maxLogs: 5000,
  footerText: 'Données en direct depuis le serveur',
  groupLabels: {},
  hiddenCategories: [],
  options: { showFooter: true, showLive: true, allowThemes: true, animateNumbers: true },
  features: Object.fromEntries(PERM_IDS.map((id) => [id, true])),
});

let db = { groups: {}, settings: {}, keys: [], audit: [], meta: {} };
try {
  if (fs.existsSync(DATA_FILE)) db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
} catch (e) {
  console.error('data.json illisible, démarrage à vide:', e.message);
}
{
  const base = defaultSettings();
  const s = db.settings || {};
  db.settings = {
    ...base,
    ...s,
    options: { ...base.options, ...(s.options || {}) },
    features: { ...base.features, ...(s.features || {}) },
    groupLabels: { ...(s.groupLabels || {}) },
    hiddenCategories: Array.isArray(s.hiddenCategories) ? s.hiddenCategories : [],
  };
  if (!Array.isArray(db.keys)) db.keys = [];
  if (!Array.isArray(db.audit)) db.audit = [];
  if (!db.meta || typeof db.meta !== 'object') db.meta = {};
  if (!db.groups || typeof db.groups !== 'object') db.groups = {};
}

let saveTimer;
const flush = () => {
  clearTimeout(saveTimer);
  try {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error('Sauvegarde impossible:', e.message);
  }
};
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 500);
};
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { flush(); process.exit(0); });

const grp = (name) => (db.groups[name] ??= { logs: [], stock: {}, members: {}, money: [] });
const audit = (who, text) => {
  db.audit.unshift({ ts: Date.now(), who: clip(who, 40), text: clip(text, 200) });
  if (db.audit.length > 200) db.audit.length = 200;
};

// --- Accès : deux mots de passe créés au premier démarrage ---------------------
const passwordTaken = (pw, exceptId) => db.keys.some((k) => k.id !== exceptId && k.enabled && checkPw(pw, k));
const makeKey = (o) => ({
  id: newId(), name: 'Accès', admin: false, builtin: undefined, perms: allTrue(), hiddenCategories: [],
  enabled: true, ver: 1, createdAt: Date.now(), lastUsed: 0, ...o,
});
function seedKeys() {
  const shown = [];
  if (!db.keys.some((k) => k.builtin === 'admin')) {
    const pw = ADMIN_PASSWORD || randPw();
    db.keys.push(makeKey({ name: 'Admin', admin: true, builtin: 'admin', ...hashPw(pw) }));
    if (!ADMIN_PASSWORD) shown.push(['Admin', pw]);
  }
  if (!db.keys.some((k) => k.builtin === 'member')) {
    let pw = MEMBER_PASSWORD || SITE_PASSWORD;
    let generated = false;
    if (!pw || passwordTaken(pw)) { pw = randPw(); generated = true; }
    db.keys.push(makeKey({ name: 'Membre', builtin: 'member', ...hashPw(pw) }));
    if (generated) shown.push(['Membre', pw]);
  }
  if (shown.length) {
    console.log('\n🔑 Mots de passe générés (affichés une seule fois, change-les dans Réglages > Accès) :');
    for (const [n, p] of shown) console.log(`   ${n.padEnd(8)} ${p}`);
    console.log('');
    flush();
  }
}
seedKeys();

const pub = (k) => ({
  id: k.id, name: k.name, admin: !!k.admin, builtin: k.builtin || null, perms: k.perms || {},
  hiddenCategories: k.hiddenCategories || [], enabled: !!k.enabled, createdAt: k.createdAt, lastUsed: k.lastUsed || 0,
});
const cleanPerms = (o) => Object.fromEntries(PERM_IDS.map((id) => [id, !!(o && o[id])]));
const cleanCats = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string').map((x) => clip(x, 30)))].slice(0, 50) : []);

// Permissions réelles d'un accès = ses permissions ET l'interrupteur global (sauf admin).
function effective(key) {
  if (key.admin) return { admin: true, perms: allTrue(), hidden: [] };
  const perms = {};
  for (const id of PERM_IDS) perms[id] = !!key.perms?.[id] && db.settings.features[id] !== false;
  return { admin: false, perms, hidden: [...new Set([...(key.hiddenCategories || []), ...db.settings.hiddenCategories])] };
}

// --- Catégories automatiques ------------------------------------------------
const CATEGORY_RULES = [
  ['armes', /^weapon_|arme|gun|pistol|rifle|smg|shotgun|knife|couteau|taser|bat$/i],
  ['munitions', /ammo|munition|cartouche|bullet|clip|chargeur/i],
  // Récoltes / matières premières brutes (avant "drogues" pour que weed_leaf soit du farm)
  ['farm', /leaf|feuille|raw|brut|plant|minerai|(^|_)ore(_|$)|harvest|recolte|farm|poppy|pavot|seed|graine|fruit|coca_?leaf|champignon|mushroom/i],
  ['drogues', /weed|coke|meth|cannabis|joint|heroin|lsd|pooch|drug|opium|crack|ecstasy|oxy|fentanyl|pill|pilule|amphet|shroom|sachet|pochon/i],
  ['argent', /money|cash|dirty|black|argent|billet|cheque|gold|(^|_)or_|bijou|jewel|diamond|rolex|chain/i],
  ['outils', /lockpick|pince|tool|outil|drill|perceuse|laptop|phone|telephone|radio|vest|armor|gilet|kit|gps|hack|usb|thermite|cle|key/i],
  ['materiaux', /iron|steel|copper|plastic|wire|metal|scrap|piece|part|material|bois|wood|acier|fer|cuivre|rubber|glass|aluminium|battery|batterie/i],
];
const guessCategory = (name = '') => {
  for (const [cat, re] of CATEGORY_RULES) if (re.test(name)) return cat;
  return 'autre';
};

// --- Flux temps réel -----------------------------------------------------------
const sseClients = new Set();
const broadcast = (kind = 'update') => {
  for (const res of sseClients) res.write(`data: ${kind}\n\n`);
};

// --- Traitement des événements du webhook ------------------------------------
function applyStockDelta(g, e) {
  const name = clip(e.item, 80);
  const count = Math.abs(num(e.count, 0));
  if (!name || !count) return;
  const sign = e.action === 'deposit' ? 1 : e.action === 'withdraw' ? -1 : 0;
  if (!sign) return;
  const cur = (g.stock[name] ??= {
    name, label: clip(e.label || name, 80), count: 0,
    category: clip(e.category, 30) || guessCategory(name), image: clip(e.image, 400),
  });
  cur.count += sign * count;
  if (cur.count <= 0) delete g.stock[name];
}

function handleEvent(e) {
  if (!e || typeof e !== 'object') return;
  const g = grp(clip(e.group || 'default', 50));
  switch (e.type) {
    case 'log': {
      const entry = {
        id: newId(), ts: toMs(e.ts), player: clip(e.player, 80) || 'Inconnu', identifier: clip(e.identifier, 80),
        action: clip(e.action, 40) || 'info', item: clip(e.item, 80), label: clip(e.label, 80),
        count: num(e.count, 0), message: clip(e.message, 400),
      };
      g.logs.unshift(entry);
      if (g.logs.length > db.settings.maxLogs) g.logs.length = db.settings.maxLogs;
      applyStockDelta(g, e);
      if (entry.identifier && g.members[entry.identifier]) g.members[entry.identifier].lastSeen = entry.ts;
      break;
    }
    case 'stock': {
      const stock = {};
      for (const it of (Array.isArray(e.items) ? e.items : []).slice(0, 2000)) {
        const name = clip(it.name, 80);
        const count = num(it.count, 0);
        if (!name || count <= 0) continue;
        stock[name] = {
          name, label: clip(it.label || name, 80), count,
          category: clip(it.category, 30) || guessCategory(name), image: clip(it.image, 400),
        };
      }
      g.stock = stock;
      break;
    }
    case 'money':
      g.money.push({ ts: toMs(e.ts), clean: num(e.clean), dirty: num(e.dirty) });
      if (g.money.length > 2000) g.money.splice(0, g.money.length - 2000);
      break;
    case 'member':
    case 'members': {
      const list = Array.isArray(e.members) ? e.members : [e];
      for (const m of list.slice(0, 500)) {
        const id = clip(m.identifier || m.name, 80);
        if (!id) continue;
        const prev = g.members[id] || {};
        g.members[id] = {
          identifier: id, name: clip(m.name, 80) || prev.name || id, grade: clip(m.grade, 40) || prev.grade || 'Membre',
          online: m.online == null ? !!prev.online : !!m.online,
          lastSeen: m.online ? Date.now() : prev.lastSeen || toMs(m.lastSeen),
        };
      }
      break;
    }
    default:
      break;
  }
}

// Données renvoyées à un accès : tout ce qui est interdit est retiré ICI, côté serveur.
function stateFor(eff, groupName) {
  const g = db.groups[groupName] || { logs: [], stock: {}, members: {}, money: [] };
  const P = eff.perms;
  const hidden = new Set(eff.hidden);
  const catOf = (n) => g.stock[n]?.category || guessCategory(n);
  const out = { group: groupName, stock: [], members: [], money: [], logs: [], totalLogs: 0 };
  if (P['view.stock']) {
    out.stock = Object.values(g.stock).filter((i) => !hidden.has(i.category)).map((i) => (P['stock.images'] ? i : { ...i, image: '' }));
  }
  if (P['view.members']) {
    out.members = Object.values(g.members).map((m) => ({
      ...(eff.admin ? { identifier: m.identifier } : {}), name: m.name, grade: m.grade, online: m.online,
      lastSeen: P['members.lastseen'] ? m.lastSeen : null,
    }));
  }
  if (P['view.money']) {
    out.money = g.money.slice(-300).map((m) => ({ ts: m.ts, clean: m.clean, dirty: P['money.dirty'] ? m.dirty : null }));
  }
  if (P['view.logs']) {
    const logs = g.logs.filter((l) => !l.item || !hidden.has(catOf(l.item)));
    out.totalLogs = logs.length;
    out.logs = logs.slice(0, 500).map((l) => {
      const { identifier, ...rest } = l;
      const r = eff.admin ? l : rest;
      return P['logs.players'] ? r : { ...r, player: 'Membre' };
    });
  }
  return out;
}

// --- App ------------------------------------------------------------------------
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// Webhook (authentifié par secret, pas par session)
app.post('/api/webhook', express.json({ limit: '2mb' }), (req, res) => {
  if (!WEBHOOK_SECRET || !safeEq(req.get('x-webhook-secret') || '', WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const events = Array.isArray(req.body) ? req.body : [req.body];
  for (const e of events.slice(0, 500)) handleEvent(e);
  db.meta.lastWebhookAt = Date.now();
  db.meta.eventCount = (db.meta.eventCount || 0) + Math.min(events.length, 500);
  save();
  broadcast('update');
  res.json({ ok: true, count: events.length });
});

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loginPage = (err = '') => `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(db.settings.siteName)}</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:radial-gradient(900px 300px at 50% -80px,rgba(96,150,170,.2),transparent 70%),#1a1b1f;color:#f2f3f5;font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}
form{width:100%;max-width:360px;background:#202126;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:28px;display:flex;flex-direction:column;gap:14px}
.ic{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:#2a2b31;border:1px solid rgba(255,255,255,.08);color:#9b9da6}
h1{margin:6px 0 0;font-size:22px;letter-spacing:-.03em}p{margin:0;color:#9b9da6;font-size:14px}
.f{display:flex;align-items:center;background:#1a1b1f;border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:0 6px 0 16px;height:44px}
.f:focus-within{border-color:rgba(255,255,255,.2)}input{flex:1;min-width:0;background:none;border:0;outline:0;color:#f2f3f5;font:inherit}
.f button{background:none;border:0;color:#9b9da6;cursor:pointer;padding:8px 10px;font:inherit;font-size:13px}
.go{background:#f2f3f5;color:#16171a;border:0;border-radius:999px;height:44px;font:inherit;font-weight:700;cursor:pointer}
.go:hover{background:#fff}.e{color:#ff6b6b;font-size:13.5px;min-height:20px}
</style>
<form method="post" action="/login">
<span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg></span>
<div><h1>${escHtml(db.settings.siteName)}</h1><p>Entre le mot de passe qu’on t’a donné.</p></div>
<label class="f"><input id="pw" type="password" name="password" placeholder="Mot de passe" autocomplete="current-password" autofocus required><button type="button" id="t">Afficher</button></label>
<div class="e" role="alert">${escHtml(err)}</div>
<button class="go">Entrer</button>
</form>
<script>var p=document.getElementById('pw'),t=document.getElementById('t');t.onclick=function(){var s=p.type==='password';p.type=s?'text':'password';t.textContent=s?'Masquer':'Afficher'}</script>
</html>`;

const getAuth = (req) => {
  const id = req.session?.keyId;
  if (!id) return null;
  const key = db.keys.find((k) => k.id === id);
  if (!key || !key.enabled || key.ver !== req.session.ver) return null;
  return { key, eff: effective(key) };
};

app.get('/login', (req, res) => {
  if (getAuth(req)) return res.redirect('/');
  res.type('html').send(loginPage());
});

const attempts = new Map(); // anti brute-force simple par IP
app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  const ip = req.ip || 'x';
  const a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 10 * 60 * 1000) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 8) return res.status(429).type('html').send(loginPage('Trop d’essais. Réessaie dans quelques minutes.'));
  const pw = String(req.body?.password || '');
  const key = pw ? db.keys.find((k) => k.enabled && checkPw(pw, k)) : null;
  if (!key) {
    a.n++; attempts.set(ip, a);
    return res.status(401).type('html').send(loginPage('Mot de passe incorrect.'));
  }
  attempts.delete(ip);
  key.lastUsed = Date.now();
  if (key.admin) audit(key.name, 's’est connecté');
  save();
  req.session.regenerate(() => {
    req.session.keyId = key.id;
    req.session.ver = key.ver;
    res.redirect('/');
  });
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// Tout le reste nécessite un accès valide
app.use((req, res, next) => {
  const auth = getAuth(req);
  if (auth) { req.auth = auth; return next(); }
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'unauthenticated' });
  res.redirect('/login');
});

app.get('/api/me', (req, res) => {
  const { key, eff } = req.auth;
  const s = db.settings;
  res.json({
    user: { name: key.name, admin: eff.admin, builtin: key.builtin || null },
    perms: eff.perms,
    hiddenCategories: eff.hidden,
    imageBase: eff.perms['stock.images'] ? s.imageBase : '',
    settings: { siteName: s.siteName, defaultTheme: s.defaultTheme, footerText: s.footerText, options: s.options, groupLabels: s.groupLabels },
    groups: Object.keys(db.groups),
  });
});

app.get('/api/state', (req, res) => {
  res.json(stateFor(req.auth.eff, clip(req.query.group || 'default', 50)));
});

app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  sseClients.add(res);
  const ka = setInterval(() => res.write(': ka\n\n'), 25000);
  req.on('close', () => { clearInterval(ka); sseClients.delete(res); });
});

// --- API d'administration -------------------------------------------------------
const admin = express.Router();
admin.use((req, res, next) => {
  if (!req.auth.eff.admin) return res.status(403).json({ error: 'Réservé aux administrateurs.' });
  if (req.method !== 'GET' && req.get('x-requested-with') !== 'dashboard') return res.status(403).json({ error: 'Requête refusée.' });
  next();
});
admin.use(express.json({ limit: '100kb' }));

const who = (req) => req.auth.key.name;

admin.get('/settings', (req, res) => {
  res.json({
    settings: db.settings,
    keys: db.keys.map(pub),
    audit: db.audit.slice(0, 100),
    webhook: { last: db.meta.lastWebhookAt || 0, count: db.meta.eventCount || 0, secretSet: !!WEBHOOK_SECRET },
    perms: PERMS,
    groups: Object.keys(db.groups),
    me: req.auth.key.id,
  });
});

admin.put('/settings', (req, res) => {
  const b = req.body || {};
  const s = db.settings;
  const notes = [];
  if (typeof b.siteName === 'string' && b.siteName.trim()) { s.siteName = clip(b.siteName.trim(), 60); notes.push('nom du site'); }
  if (THEMES.includes(b.defaultTheme)) { s.defaultTheme = b.defaultTheme; notes.push('thème par défaut'); }
  if (typeof b.imageBase === 'string') {
    const v = b.imageBase.trim();
    if (v && !/^(https?:\/\/|\/)/i.test(v)) return res.status(400).json({ error: 'L’adresse des images doit commencer par http://, https:// ou /.' });
    s.imageBase = clip(v, 300); notes.push('adresse des images');
  }
  if (b.maxLogs != null && Number.isFinite(Number(b.maxLogs))) {
    s.maxLogs = Math.min(50000, Math.max(100, Math.round(Number(b.maxLogs))));
    for (const g of Object.values(db.groups)) if (g.logs.length > s.maxLogs) g.logs.length = s.maxLogs;
    notes.push('conservation des logs');
  }
  if (typeof b.footerText === 'string') { s.footerText = clip(b.footerText.trim(), 160); notes.push('pied de page'); }
  if (b.options && typeof b.options === 'object') {
    for (const k of Object.keys(s.options)) if (typeof b.options[k] === 'boolean') s.options[k] = b.options[k];
    notes.push('options d’affichage');
  }
  if (b.features && typeof b.features === 'object') {
    for (const id of PERM_IDS) if (typeof b.features[id] === 'boolean') s.features[id] = b.features[id];
    notes.push('fonctions visibles');
  }
  if (Array.isArray(b.hiddenCategories)) { s.hiddenCategories = cleanCats(b.hiddenCategories); notes.push('catégories masquées'); }
  if (b.groupLabels && typeof b.groupLabels === 'object') {
    for (const [g, l] of Object.entries(b.groupLabels).slice(0, 50)) {
      const label = clip(String(l).trim(), 40);
      if (label) s.groupLabels[clip(g, 50)] = label; else delete s.groupLabels[clip(g, 50)];
    }
    notes.push('noms des groupes');
  }
  if (notes.length) audit(who(req), `a modifié : ${notes.join(', ')}`);
  save();
  broadcast('config');
  res.json({ ok: true, settings: s });
});

admin.post('/keys', (req, res) => {
  const b = req.body || {};
  const name = clip(String(b.name || '').trim(), 40);
  if (!name) return res.status(400).json({ error: 'Donne un nom à cet accès.' });
  if (db.keys.some((k) => k.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Un accès porte déjà ce nom.' });
  let pw = typeof b.password === 'string' && b.password ? b.password : '';
  if (pw && pw.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum).' });
  const generated = !pw;
  if (generated) { do pw = randPw(); while (passwordTaken(pw)); }
  else if (passwordTaken(pw)) return res.status(409).json({ error: 'Ce mot de passe est déjà utilisé par un autre accès.' });
  const key = makeKey({ name, admin: !!b.admin, perms: cleanPerms(b.perms), hiddenCategories: cleanCats(b.hiddenCategories), ...hashPw(pw) });
  db.keys.push(key);
  audit(who(req), `a créé l’accès « ${name} »${key.admin ? ' (administrateur)' : ''}`);
  save();
  res.json({ key: pub(key), password: generated ? pw : undefined });
});

admin.patch('/keys/:id', (req, res) => {
  const key = db.keys.find((k) => k.id === req.params.id);
  if (!key) return res.status(404).json({ error: 'Accès introuvable.' });
  const b = req.body || {};
  const self = key.id === req.auth.key.id;
  const next = { ...key, perms: { ...key.perms } };
  let revealed;

  if (typeof b.name === 'string') {
    const name = clip(b.name.trim(), 40);
    if (!name) return res.status(400).json({ error: 'Le nom ne peut pas être vide.' });
    if (db.keys.some((k) => k.id !== key.id && k.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Un accès porte déjà ce nom.' });
    next.name = name;
  }
  if (typeof b.admin === 'boolean') next.admin = b.admin;
  if (b.perms && typeof b.perms === 'object') next.perms = cleanPerms(b.perms);
  if (Array.isArray(b.hiddenCategories)) next.hiddenCategories = cleanCats(b.hiddenCategories);
  if (typeof b.enabled === 'boolean') next.enabled = b.enabled;

  if (self && (!next.enabled || !next.admin)) return res.status(400).json({ error: 'Tu ne peux pas te retirer ton propre accès administrateur.' });
  if (key.builtin === 'admin' && !next.admin) return res.status(400).json({ error: 'L’accès Admin doit rester administrateur.' });

  if (b.regenerate || (typeof b.password === 'string' && b.password)) {
    let pw = typeof b.password === 'string' ? b.password : '';
    if (pw && pw.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum).' });
    if (!pw) { do pw = randPw(); while (passwordTaken(pw, key.id)); revealed = pw; }
    else if (passwordTaken(pw, key.id)) return res.status(409).json({ error: 'Ce mot de passe est déjà utilisé par un autre accès.' });
    Object.assign(next, hashPw(pw));
    next.ver = (key.ver || 1) + 1; // déconnecte les sessions ouvertes avec l'ancien mot de passe
  }
  if (!next.enabled && key.enabled) next.ver = (next.ver || 1) + 1;

  const others = db.keys.map((k) => (k.id === key.id ? next : k));
  if (!others.some((k) => k.admin && k.enabled)) return res.status(400).json({ error: 'Il doit rester au moins un administrateur actif.' });

  Object.assign(key, next);
  const bits = [];
  if (typeof b.name === 'string') bits.push('nom');
  if (typeof b.admin === 'boolean' || b.perms) bits.push('permissions');
  if (Array.isArray(b.hiddenCategories)) bits.push('catégories masquées');
  if (typeof b.enabled === 'boolean') bits.push(next.enabled ? 'activé' : 'désactivé');
  if (b.regenerate || b.password) bits.push('mot de passe');
  audit(who(req), `a modifié l’accès « ${key.name} » (${bits.join(', ') || 'rien'})`);
  save();
  broadcast('config');
  res.json({ key: pub(key), password: revealed });
});

admin.delete('/keys/:id', (req, res) => {
  const key = db.keys.find((k) => k.id === req.params.id);
  if (!key) return res.status(404).json({ error: 'Accès introuvable.' });
  if (key.builtin) return res.status(400).json({ error: 'Les accès Admin et Membre ne peuvent pas être supprimés, seulement modifiés.' });
  if (key.id === req.auth.key.id) return res.status(400).json({ error: 'Tu ne peux pas supprimer l’accès que tu utilises.' });
  db.keys = db.keys.filter((k) => k.id !== key.id);
  if (!db.keys.some((k) => k.admin && k.enabled)) { db.keys.push(key); return res.status(400).json({ error: 'Il doit rester au moins un administrateur actif.' }); }
  audit(who(req), `a supprimé l’accès « ${key.name} »`);
  save();
  broadcast('config');
  res.json({ ok: true });
});

admin.post('/purge', (req, res) => {
  const what = req.body?.what;
  const groupName = clip(req.body?.group || '', 50);
  const parts = { logs: ['logs'], stock: ['stock'], money: ['money'], members: ['members'], all: ['logs', 'stock', 'money', 'members'] }[what];
  if (!parts) return res.status(400).json({ error: 'Choix inconnu.' });
  const targets = groupName === '*' ? Object.keys(db.groups) : [groupName];
  if (groupName !== '*' && !db.groups[groupName]) return res.status(404).json({ error: 'Groupe introuvable.' });
  for (const t of targets) for (const p of parts) db.groups[t][p] = p === 'logs' || p === 'money' ? [] : {};
  audit(who(req), `a vidé ${what === 'all' ? 'toutes les données' : what} (${groupName === '*' ? 'tous les groupes' : groupName})`);
  save();
  broadcast('update');
  res.json({ ok: true });
});

admin.get('/export', (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="sauvegarde-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ exportedAt: new Date().toISOString(), settings: db.settings, groups: db.groups });
});

app.use('/api/admin', admin);
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`✅ Dashboard sur http://localhost:${PORT}`);
});
