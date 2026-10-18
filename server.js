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
  { id: 'overview.customize', group: 'Détails', label: 'Personnaliser l’aperçu', desc: 'Ajouter, retirer, déplacer et redimensionner les widgets de la page Aperçu.' },
  { id: 'profile.style', group: 'Détails', label: 'Changer le style de présentation', desc: 'Page Profil : thème, couleur, densité, arrondis et affichage du coffre, pour soi seulement.' },
  { id: 'stock.icons.edit', group: 'Détails', label: 'Choisir les icônes des items', desc: 'Définir soi-même l’icône (emoji ou image) de chaque item du coffre.' },
];
// Widgets de l'aperçu (la liste sert à valider ce qu'un utilisateur enregistre).
const WIDGET_TYPES = ['money.clean', 'money.dirty', 'stock.count', 'members.online', 'money.trend', 'logs.recent', 'stock.shelves', 'members.list', 'stock.top'];
const PERM_IDS = PERMS.map((p) => p.id);
const THEMES = ['navy', 'anthracite', 'feutre', 'minuit', 'clair'];
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
  options: { showFooter: true, showLive: true, allowThemes: true, animateNumbers: true, listGroups: true },
  features: Object.fromEntries(PERM_IDS.map((id) => [id, true])),
});

// --- Stockage -------------------------------------------------------------------
// PostgreSQL si DATABASE_URL est défini (recommandé en ligne : tout est conservé),
// sinon un simple fichier data.json. Une ligne par groupe + une ligne « core » (réglages, accès, journal).
const { DATABASE_URL = '', DATABASE_SSL = '' } = process.env;
let pool = null;
const lastWritten = new Map();
let db = { groups: {}, settings: {}, keys: [], audit: [], meta: {} };
if (DATABASE_URL) {
  let pg;
  try { pg = (await import('pg')).default; } catch { console.error('❌ DATABASE_URL est défini mais le paquet « pg » est absent. Lance « npm install ».'); process.exit(1); }
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL);
  pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5, ssl: DATABASE_SSL === 'false' || local ? false : { rejectUnauthorized: false } });
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS kv (k text PRIMARY KEY, v jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
    await pool.query('CREATE TABLE IF NOT EXISTS sessions (sid text PRIMARY KEY, sess jsonb NOT NULL, expire timestamptz NOT NULL)');
    const { rows } = await pool.query('SELECT k, v FROM kv');
    for (const { k, v } of rows) {
      if (k === 'core') db = { ...db, ...v };
      else if (k.startsWith('group:')) db.groups[k.slice(6)] = v;
      lastWritten.set(k, JSON.stringify(v));
    }
    if (!rows.length && fs.existsSync(DATA_FILE)) {
      db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
      console.log('📦 data.json importé dans PostgreSQL.');
    }
  } catch (e) {
    console.error('❌ Connexion à PostgreSQL impossible :', e.message);
    process.exit(1);
  }
} else {
  try {
    if (fs.existsSync(DATA_FILE)) db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
  } catch (e) {
    console.error('data.json illisible, démarrage à vide:', e.message);
  }
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

// --- Groupes ---------------------------------------------------------------------
// Chaque groupe a ses données (logs, coffre, membres, argent) ET ses réglages (cfg) :
// nom affiché, fonctions coupées, catégories masquées.
const GID_RE = /^[a-z0-9][a-z0-9_-]{0,29}$/;
const gid = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^[-_]+/, '').slice(0, 30) || 'default';
const newSecret = () => 'wh_' + crypto.randomBytes(18).toString('hex');
const newGroup = (label = '') => ({ logs: [], stock: {}, members: {}, money: [], icons: {}, cfg: { label, features: {}, hiddenCategories: [], webhookSecret: newSecret(), lastWebhookAt: 0, eventCount: 0 } });
const ensureGroup = (g) => {
  g.logs ||= []; g.stock ||= {}; g.members ||= {}; g.money ||= []; g.icons ||= {};
  g.cfg = { label: '', features: {}, hiddenCategories: [], lastWebhookAt: 0, eventCount: 0, ...(g.cfg || {}) };
  if (!g.cfg.webhookSecret) g.cfg.webhookSecret = newSecret();
  return g;
};
for (const g of Object.values(db.groups)) ensureGroup(g);
if (!Object.keys(db.groups).length) db.groups.default = newGroup();
for (const [n, l] of Object.entries(db.settings.groupLabels || {})) if (db.groups[n] && !db.groups[n].cfg.label) db.groups[n].cfg.label = String(l);
const firstGroup = () => (db.groups.default ? 'default' : Object.keys(db.groups)[0]);
const labelOf = (g) => db.groups[g]?.cfg.label || db.settings.groupLabels[g] || (g === 'default' ? 'Mon groupe' : g);
// Les accès créés avant les groupes : l'admin devient administrateur général, les autres gardent le groupe de départ.
for (const k of db.keys) if (!k.group) k.group = k.admin ? '*' : firstGroup();
// Nouveau droit « style de présentation » : activé d'office pour les accès existants (c'était le cas avec le choix du thème).
for (const k of db.keys) if (k.perms && k.perms['profile.style'] === undefined) k.perms['profile.style'] = true;

let saveTimer;
let chain = Promise.resolve();
const snapshot = () => {
  const m = new Map();
  m.set('core', JSON.stringify({ settings: db.settings, keys: db.keys, audit: db.audit, meta: db.meta }));
  for (const [id, g] of Object.entries(db.groups)) m.set('group:' + id, JSON.stringify(g));
  return m;
};
// N'écrit que ce qui a changé depuis la dernière sauvegarde.
const flush = () => {
  clearTimeout(saveTimer);
  if (!pool) {
    try {
      const tmp = DATA_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DATA_FILE);
    } catch (e) {
      console.error('Sauvegarde impossible:', e.message);
    }
    return Promise.resolve();
  }
  chain = chain.then(async () => {
    const snap = snapshot();
    for (const [k, v] of snap) {
      if (lastWritten.get(k) === v) continue;
      await pool.query('INSERT INTO kv (k, v, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = now()', [k, v]);
      lastWritten.set(k, v);
    }
    for (const k of [...lastWritten.keys()]) {
      if (snap.has(k)) continue;
      await pool.query('DELETE FROM kv WHERE k = $1', [k]);
      lastWritten.delete(k);
    }
  }).catch((e) => console.error('Sauvegarde impossible:', e.message));
  return chain;
};
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, pool ? 800 : 500);
};
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await flush(); if (pool) await pool.end().catch(() => {}); process.exit(0); });

const grp = (name) => (db.groups[name] ??= newGroup());
const audit = (who, text, group = null) => {
  db.audit.unshift({ ts: Date.now(), who: clip(who, 40), text: clip(text, 200), group });
  if (db.audit.length > 200) db.audit.length = 200;
};

// --- Accès -----------------------------------------------------------------------
// Chaque accès (mot de passe) a une portée : '*' = tous les groupes (administrateur général),
// ou le code d'un seul groupe. Un mot de passe ne doit pas être ambigu dans sa portée.
const passwordTaken = (pw, group, exceptId) =>
  db.keys.some((k) => k.id !== exceptId && k.enabled && (group === '*' || k.group === '*' || k.group === group) && checkPw(pw, k));
const makeKey = (o) => ({
  id: newId(), name: 'Accès', admin: false, builtin: undefined, group: firstGroup(), perms: allTrue(), hiddenCategories: [],
  enabled: true, ver: 1, createdAt: Date.now(), lastUsed: 0, ...o,
});
function seedKeys() {
  const shown = [];
  if (!db.keys.some((k) => k.builtin === 'admin')) {
    const pw = ADMIN_PASSWORD || randPw();
    db.keys.push(makeKey({ name: 'Admin', admin: true, builtin: 'admin', group: '*', ...hashPw(pw) }));
    if (!ADMIN_PASSWORD) shown.push(['Admin', pw]);
  }
  if (!db.keys.some((k) => k.builtin === 'member')) {
    let pw = MEMBER_PASSWORD || SITE_PASSWORD;
    let generated = false;
    if (!pw || passwordTaken(pw, firstGroup())) { pw = randPw(); generated = true; }
    db.keys.push(makeKey({ name: 'Membre', builtin: 'member', group: firstGroup(), perms: { ...allTrue(), 'stock.icons.edit': false }, ...hashPw(pw) }));
    if (generated) shown.push(['Membre', pw]);
  }
  if (shown.length) {
    console.log('\n🔑 Mots de passe générés (affichés une seule fois, change-les dans Réglages > Accès) :');
    for (const [n, p] of shown) console.log(`   ${n.padEnd(8)} ${p}`);
    console.log('');
    save();
  }
}
seedKeys();
await flush();

const pub = (k) => ({
  id: k.id, name: k.name, group: k.group, admin: !!k.admin, builtin: k.builtin || null, perms: k.perms || {},
  hiddenCategories: k.hiddenCategories || [], enabled: !!k.enabled, createdAt: k.createdAt, lastUsed: k.lastUsed || 0,
});
const cleanPerms = (o) => Object.fromEntries(PERM_IDS.map((id) => [id, !!(o && o[id])]));
const cleanCats = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string').map((x) => clip(x, 30)))].slice(0, 50) : []);

// Permissions réelles d'un accès dans un groupe = ses permissions ET les interrupteurs
// globaux ET ceux du groupe (sauf administrateur, qui voit tout dans sa portée).
function effective(key, groupName) {
  if (key.admin) return { admin: true, perms: allTrue(), hidden: [] };
  const cfg = db.groups[groupName]?.cfg || {};
  const perms = {};
  for (const id of PERM_IDS) perms[id] = !!key.perms?.[id] && db.settings.features[id] !== false && cfg.features?.[id] !== false;
  const hidden = [...new Set([...(key.hiddenCategories || []), ...db.settings.hiddenCategories, ...(cfg.hiddenCategories || [])])];
  return { admin: false, perms, hidden };
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
// Chaque client reçoit seulement les mises à jour de son groupe ('*' = tous).
const sseClients = new Set();
const broadcast = (kind = 'update', group = '*') => {
  for (const c of sseClients) if (kind === 'config' || group === '*' || c.scope === '*' || c.scope === group) c.res.write(`data: ${kind}\n\n`);
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
  const raw = clip(e.group || 'default', 50);
  const name = db.groups[raw] ? raw : gid(raw);
  const g = grp(name);
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
  return name;
}

// Données renvoyées à un accès : tout ce qui est interdit est retiré ICI, côté serveur.
function stateFor(eff, groupName) {
  const g = db.groups[groupName] || { logs: [], stock: {}, members: {}, money: [] };
  const P = eff.perms;
  const hidden = new Set(eff.hidden);
  const catOf = (n) => g.stock[n]?.category || guessCategory(n);
  const out = { group: groupName, stock: [], members: [], money: [], logs: [], totalLogs: 0 };
  if (P['view.stock']) {
    out.stock = Object.values(g.stock).filter((i) => !hidden.has(i.category)).map((i) => ({ ...(P['stock.images'] ? i : { ...i, image: '' }), icon: g.icons?.[i.name] || '' }));
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

// Webhooks (authentifiés par secret, pas par session)
const secretOf = (req) => req.get('x-webhook-secret') || (req.get('authorization') || '').replace(/^Bearer\s+/i, '') || '';
function ingest(req, res, forced) {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  const touched = new Set();
  for (const e of events.slice(0, 500)) {
    if (!e || typeof e !== 'object') continue;
    const n = handleEvent(forced ? { ...e, group: forced } : e);
    if (n) touched.add(n);
  }
  const count = Math.min(events.length, 500);
  db.meta.lastWebhookAt = Date.now();
  db.meta.eventCount = (db.meta.eventCount || 0) + count;
  for (const n of touched) { const c = db.groups[n].cfg; c.lastWebhookAt = Date.now(); c.eventCount = (c.eventCount || 0) + count; }
  save();
  broadcast('update', touched.size === 1 ? [...touched][0] : '*');
  res.json({ ok: true, count: events.length });
}
// Un lien par groupe, avec son propre secret : /api/webhook/<code du groupe>
app.post('/api/webhook/:group', express.json({ limit: '2mb' }), (req, res) => {
  const g = db.groups[String(req.params.group).toLowerCase()];
  if (!g || !safeEq(secretOf(req), g.cfg.webhookSecret)) return res.status(401).json({ error: 'unauthorized' });
  ingest(req, res, String(req.params.group).toLowerCase());
});
// Lien général (secret WEBHOOK_SECRET du .env) : le groupe vient du champ « group » des événements.
app.post('/api/webhook', express.json({ limit: '2mb' }), (req, res) => {
  if (!WEBHOOK_SECRET || !safeEq(secretOf(req), WEBHOOK_SECRET)) return res.status(401).json({ error: 'unauthorized' });
  ingest(req, res, null);
});

// Avec PostgreSQL, les connexions survivent aux redémarrages et aux mises à jour du site.
class PgStore extends session.Store {
  get(sid, cb) { pool.query('SELECT sess FROM sessions WHERE sid = $1 AND expire > now()', [sid]).then((r) => cb(null, r.rows[0]?.sess || null), cb); }
  set(sid, sess, cb) {
    const exp = new Date(sess?.cookie?.expires || Date.now() + 7 * 864e5);
    pool.query('INSERT INTO sessions (sid, sess, expire) VALUES ($1, $2::jsonb, $3) ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire', [sid, JSON.stringify(sess), exp]).then(() => cb && cb(), (e) => cb && cb(e));
  }
  destroy(sid, cb) { pool.query('DELETE FROM sessions WHERE sid = $1', [sid]).then(() => cb && cb(), (e) => cb && cb(e)); }
}
if (pool) setInterval(() => pool.query('DELETE FROM sessions WHERE expire < now()').catch(() => {}), 3600e3).unref();
app.use(
  session({
    ...(pool ? { store: new PgStore() } : {}),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const groupField = (sel = '') => {
  const ids = Object.keys(db.groups);
  if (db.settings.options.listGroups) {
    return `<label class="f"><select name="group" aria-label="Groupe"${sel ? ' data-sel="1"' : ''}>${ids.map((id) => `<option value="${escHtml(id)}"${id === sel ? ' selected' : ''}>${escHtml(labelOf(id))}</option>`).join('')}</select></label>`;
  }
  return `<label class="f"><input name="group" value="${escHtml(sel)}" placeholder="Code du groupe" autocomplete="off" autocapitalize="off" spellcheck="false"${sel ? ' data-sel="1"' : ''} required></label>`;
};
const loginPage = (err = '', sel = '') => `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(db.settings.siteName)}</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:radial-gradient(900px 300px at 50% -80px,rgba(96,150,170,.2),transparent 70%),#1a1b1f;color:#f2f3f5;font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}
form{width:100%;max-width:360px;background:#202126;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:28px;display:flex;flex-direction:column;gap:14px}
.ic{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:#2a2b31;border:1px solid rgba(255,255,255,.08);color:#9b9da6}
h1{margin:6px 0 0;font-size:22px;letter-spacing:-.03em}p{margin:0;color:#9b9da6;font-size:14px}
.f{display:flex;align-items:center;background:#1a1b1f;border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:0 6px 0 16px;height:44px}
.f:focus-within{border-color:rgba(255,255,255,.2)}select{flex:1;min-width:0;height:100%;background:none;border:0;outline:0;color:#f2f3f5;font:inherit;cursor:pointer}select option{background:#202126}input{flex:1;min-width:0;background:none;border:0;outline:0;color:#f2f3f5;font:inherit}
.f button{background:none;border:0;color:#9b9da6;cursor:pointer;padding:8px 10px;font:inherit;font-size:13px}
.go{background:#f2f3f5;color:#16171a;border:0;border-radius:999px;height:44px;font:inherit;font-weight:700;cursor:pointer}
.go:hover{background:#fff}.e{color:#ff6b6b;font-size:13.5px;min-height:20px}
</style>
<form method="post" action="/login">
<span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg></span>
<div><h1>${escHtml(db.settings.siteName)}</h1><p>Choisis ton groupe, puis entre le mot de passe qu’on t’a donné.</p></div>
${groupField(sel)}
<label class="f"><input id="pw" type="password" name="password" placeholder="Mot de passe" autocomplete="current-password" autofocus required><button type="button" id="t">Afficher</button></label>
<div class="e" role="alert">${escHtml(err)}</div>
<button class="go">Entrer</button>
</form>
<script>var p=document.getElementById('pw'),t=document.getElementById('t');t.onclick=function(){var s=p.type==='password';p.type=s?'text':'password';t.textContent=s?'Masquer':'Afficher'}</script>
<script>try{var g=document.querySelector('[name=group]'),l=localStorage.getItem('lastGroup');if(g&&l&&!g.dataset.sel){if(g.tagName==='SELECT'){for(var i=0;i<g.options.length;i++)if(g.options[i].value===l)g.value=l}else if(!g.value)g.value=l}document.querySelector('form').addEventListener('submit',function(){if(g)localStorage.setItem('lastGroup',g.value)})}catch(e){}</script>
</html>`;

// Un accès global ('*') peut ouvrir n'importe quel groupe ; les autres sont enfermés dans le leur.
const getAuth = (req) => {
  const id = req.session?.keyId;
  if (!id) return null;
  const key = db.keys.find((k) => k.id === id);
  if (!key || !key.enabled || key.ver !== req.session.ver) return null;
  const isGlobal = key.group === '*';
  let group = isGlobal ? req.session.group : key.group;
  if (!db.groups[group]) {
    if (!isGlobal) return null;
    group = firstGroup();
  }
  return { key, global: isGlobal, group, eff: effective(key, group) };
};

app.get('/login', (req, res) => {
  if (getAuth(req)) return res.redirect('/');
  res.type('html').send(loginPage('', String(req.query.g || '')));
});

const attempts = new Map(); // anti brute-force simple par IP
app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  const ip = req.ip || 'x';
  const a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 10 * 60 * 1000) { a.n = 0; a.t = Date.now(); }
  const gIn = String(req.body?.group || '').trim().slice(0, 60);
  if (a.n >= 8) return res.status(429).type('html').send(loginPage('Trop d’essais. Réessaie dans quelques minutes.', gIn));
  const pw = String(req.body?.password || '');
  // Le groupe peut être saisi par son code ou par son nom affiché.
  const low = gIn.toLowerCase();
  const group = !gIn ? null : db.groups[gIn] ? gIn : db.groups[low] ? low : Object.keys(db.groups).find((id) => labelOf(id).toLowerCase() === low) || null;
  const key = pw ? db.keys.find((k) => k.enabled && (k.group === '*' || (group && k.group === group)) && checkPw(pw, k)) : null;
  if (!key) {
    a.n++; attempts.set(ip, a);
    return res.status(401).type('html').send(loginPage('Groupe ou mot de passe incorrect.', gIn));
  }
  attempts.delete(ip);
  key.lastUsed = Date.now();
  const landing = key.group === '*' ? group || firstGroup() : key.group;
  if (key.admin) audit(key.name, `s’est connecté (${labelOf(landing)})`, key.group === '*' ? null : key.group);
  save();
  req.session.regenerate(() => {
    req.session.keyId = key.id;
    req.session.ver = key.ver;
    req.session.group = landing;
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

// Groupe réellement affiché : un accès global choisit, les autres n'ont pas le choix.
const viewGroup = (auth, asked) => (auth.global && db.groups[String(asked || '')] ? String(asked) : auth.group);

app.get('/api/me', (req, res) => {
  const { key, global: isGlobal } = req.auth;
  const group = viewGroup(req.auth, req.query.group);
  const eff = effective(key, group);
  const s = db.settings;
  const visible = isGlobal ? Object.keys(db.groups) : [group];
  res.json({
    user: { name: key.name, admin: eff.admin, builtin: key.builtin || null, global: isGlobal },
    group,
    perms: eff.perms,
    hiddenCategories: eff.hidden,
    imageBase: eff.perms['stock.images'] ? s.imageBase : '',
    settings: {
      siteName: s.siteName, defaultTheme: s.defaultTheme, footerText: s.footerText, options: s.options,
      groupLabels: Object.fromEntries(visible.map((g) => [g, labelOf(g)])),
    },
    groups: visible,
    layout: key.layouts?.[group] || null,
  });
});

app.get('/api/state', (req, res) => {
  const group = viewGroup(req.auth, req.query.group);
  res.json(stateFor(effective(req.auth.key, group), group));
});

// --- Personnalisation (réservée par permission, pas besoin d'être admin) ---------
app.use(['/api/layout', '/api/stock/icon'], express.json({ limit: '20kb' }), (req, res, next) => {
  if (req.get('x-requested-with') !== 'dashboard') return res.status(403).json({ error: 'Requête refusée.' });
  next();
});
const ICON_URL = /^(https?:\/\/|\/)[^\s<>"']{1,290}$/i;
app.put('/api/layout', (req, res) => {
  const group = viewGroup(req.auth, req.body?.group);
  const eff = effective(req.auth.key, group);
  if (!eff.perms['overview.customize']) return res.status(403).json({ error: 'Tu n’as pas le droit de personnaliser l’aperçu.' });
  const key = req.auth.key;
  key.layouts = key.layouts && typeof key.layouts === 'object' ? key.layouts : {};
  if (req.body?.widgets === null) delete key.layouts[group];
  else {
    if (!Array.isArray(req.body?.widgets)) return res.status(400).json({ error: 'Disposition invalide.' });
    const seen = new Set();
    const list = [];
    for (const w of req.body.widgets.slice(0, 30)) {
      if (!w || !WIDGET_TYPES.includes(w.t) || seen.has(w.t)) continue;
      seen.add(w.t);
      list.push({ t: w.t, w: Math.min(12, Math.max(1, Math.round(num(w.w, 4)))), h: Math.min(10, Math.max(1, Math.round(num(w.h, 2)))) });
    }
    key.layouts[group] = list;
  }
  save();
  res.json({ ok: true, layout: key.layouts[group] || null });
});
app.put('/api/stock/icon', (req, res) => {
  const group = viewGroup(req.auth, req.body?.group);
  const eff = effective(req.auth.key, group);
  if (!eff.perms['stock.icons.edit'] || !eff.perms['view.stock']) return res.status(403).json({ error: 'Tu n’as pas le droit de changer les icônes.' });
  const g = db.groups[group];
  const name = clip(req.body?.name, 100);
  const item = g.stock[name];
  if (!item || eff.hidden.includes(item.category)) return res.status(404).json({ error: 'Item introuvable.' });
  let icon = typeof req.body?.icon === 'string' ? req.body.icon.trim() : '';
  if (icon && !ICON_URL.test(icon)) {
    // Sinon : un emoji ou un très court texte, jamais de balisage.
    if (/[<>"'&]/.test(icon) || [...icon].length > 6) return res.status(400).json({ error: 'Icône invalide : un emoji ou une adresse d’image (https://…).' });
  }
  if (icon) g.icons[name] = icon; else delete g.icons[name];
  audit(req.auth.key.name, `a ${icon ? 'changé' : 'retiré'} l’icône de « ${item.label || name} »`, group);
  save();
  broadcast('update', group);
  res.json({ ok: true, icon });
});

app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  const client = { res, scope: req.auth.global ? '*' : req.auth.group };
  sseClients.add(client);
  const ka = setInterval(() => res.write(': ka\n\n'), 25000);
  req.on('close', () => { clearInterval(ka); sseClients.delete(client); });
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

// Aides de portée : l'administrateur général gère tout, l'administrateur local seulement son groupe.
const onlyGlobal = (req, res, next) => (req.auth.global ? next() : res.status(403).json({ error: 'Réservé à l’administrateur général.' }));
const adminGroup = (req, asked) => (req.auth.global && db.groups[String(asked || '')] ? String(asked) : req.auth.group);
const canKey = (req, key) => req.auth.global || key.group === req.auth.group;
const scopeTag = (g) => (g === '*' ? null : g);
const groupCfg = (g) => {
  const c = db.groups[g].cfg;
  return { id: g, label: c.label, shown: labelOf(g), features: c.features, hiddenCategories: c.hiddenCategories, webhook: { secret: c.webhookSecret, last: c.lastWebhookAt || 0, count: c.eventCount || 0 } };
};
const stripGroup = (g) => ({ ...g, cfg: { ...g.cfg, webhookSecret: undefined } });
const groupInfo = (id) => {
  const g = db.groups[id];
  const ks = db.keys.filter((k) => k.group === id);
  return {
    id, label: g.cfg.label, shown: labelOf(id),
    counts: { stock: Object.keys(g.stock).length, members: Object.keys(g.members).length, logs: g.logs.length },
    keys: ks.length, admins: ks.filter((k) => k.admin && k.enabled).length, lastActivity: g.logs[0]?.ts || 0,
  };
};
const globalAdmins = (keys) => keys.filter((k) => k.admin && k.enabled && k.group === '*').length;

admin.get('/settings', (req, res) => {
  const g = adminGroup(req, req.query.group);
  const body = {
    scope: { global: req.auth.global, group: req.auth.group },
    group: groupCfg(g),
    keys: db.keys.filter((k) => req.auth.global || k.group === g).map(pub),
    audit: db.audit.filter((a) => req.auth.global || a.group === g).slice(0, 100),
    perms: PERMS,
    groups: req.auth.global ? Object.keys(db.groups) : [g],
    me: req.auth.key.id,
  };
  if (req.auth.global) {
    body.settings = db.settings;
    body.groupsInfo = Object.keys(db.groups).map(groupInfo);
    body.webhook = { last: db.meta.lastWebhookAt || 0, count: db.meta.eventCount || 0, secretSet: !!WEBHOOK_SECRET };
  }
  res.json(body);
});

// --- Réglages généraux (tous les groupes) : administrateur général seulement
admin.put('/settings', onlyGlobal, (req, res) => {
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
    notes.push('fonctions visibles pour tous les groupes');
  }
  if (Array.isArray(b.hiddenCategories)) { s.hiddenCategories = cleanCats(b.hiddenCategories); notes.push('catégories masquées pour tous les groupes'); }
  if (notes.length) audit(who(req), `a modifié : ${notes.join(', ')}`);
  save();
  broadcast('config');
  res.json({ ok: true, settings: s });
});

// --- Réglages d'un groupe : administrateur général ou administrateur local de CE groupe
admin.put('/groups/:g/settings', (req, res) => {
  const g = String(req.params.g);
  if (!db.groups[g]) return res.status(404).json({ error: 'Groupe introuvable.' });
  if (!req.auth.global && g !== req.auth.group) return res.status(403).json({ error: 'Tu ne gères pas ce groupe.' });
  const cfg = db.groups[g].cfg;
  const b = req.body || {};
  const notes = [];
  if (typeof b.label === 'string') { cfg.label = clip(b.label.trim(), 40); notes.push('nom affiché'); }
  if (b.features && typeof b.features === 'object') {
    for (const id of PERM_IDS) if (typeof b.features[id] === 'boolean') cfg.features[id] = b.features[id];
    notes.push('fonctions visibles');
  }
  if (Array.isArray(b.hiddenCategories)) { cfg.hiddenCategories = cleanCats(b.hiddenCategories); notes.push('catégories masquées'); }
  if (notes.length) audit(who(req), `a modifié le groupe « ${labelOf(g)} » : ${notes.join(', ')}`, g);
  save();
  broadcast('config');
  res.json({ ok: true, group: groupCfg(g) });
});

// --- Nouveau secret de webhook pour un groupe (son admin local ou l'administrateur général)
admin.post('/groups/:g/webhook-secret', (req, res) => {
  const g = String(req.params.g);
  if (!db.groups[g]) return res.status(404).json({ error: 'Groupe introuvable.' });
  if (!req.auth.global && g !== req.auth.group) return res.status(403).json({ error: 'Tu ne gères pas ce groupe.' });
  db.groups[g].cfg.webhookSecret = newSecret();
  audit(who(req), `a renouvelé le secret du webhook du groupe « ${labelOf(g)} »`, g);
  save();
  res.json({ ok: true, group: groupCfg(g) });
});

// --- Créer / supprimer un groupe : administrateur général seulement
admin.post('/groups', onlyGlobal, (req, res) => {
  const b = req.body || {};
  const id = String(b.id || '').trim().toLowerCase();
  if (!GID_RE.test(id)) return res.status(400).json({ error: 'Code du groupe invalide : 1 à 30 caractères, lettres minuscules, chiffres, - ou _.' });
  if (db.groups[id]) return res.status(409).json({ error: 'Ce code de groupe existe déjà.' });
  const label = clip(String(b.label || '').trim(), 40);
  db.groups[id] = newGroup(label);
  const created = [];
  if (b.createAccess !== false) {
    for (const [name, isAdmin] of [['Admin', true], ['Membre', false]]) {
      let pw;
      do pw = randPw(); while (passwordTaken(pw, id));
      db.keys.push(makeKey({ name, admin: isAdmin, group: id, perms: { ...allTrue(), 'stock.icons.edit': isAdmin }, ...hashPw(pw) }));
      created.push({ name, admin: isAdmin, password: pw });
    }
  }
  audit(who(req), `a créé le groupe « ${label || id} »`, id);
  save();
  broadcast('config');
  res.json({ ok: true, id, created });
});

admin.delete('/groups/:g', onlyGlobal, (req, res) => {
  const g = String(req.params.g);
  if (!db.groups[g]) return res.status(404).json({ error: 'Groupe introuvable.' });
  if (Object.keys(db.groups).length <= 1) return res.status(400).json({ error: 'Il doit rester au moins un groupe.' });
  const name = labelOf(g);
  delete db.groups[g];
  db.keys = db.keys.filter((k) => k.group !== g);
  audit(who(req), `a supprimé le groupe « ${name} » et tous ses accès`);
  save();
  broadcast('config');
  res.json({ ok: true });
});

// --- Accès (mots de passe)
admin.post('/keys', (req, res) => {
  const b = req.body || {};
  const group = req.auth.global ? (b.group === '*' ? '*' : String(b.group || req.auth.group)) : req.auth.group;
  if (group !== '*' && !db.groups[group]) return res.status(400).json({ error: 'Groupe introuvable.' });
  const name = clip(String(b.name || '').trim(), 40);
  if (!name) return res.status(400).json({ error: 'Donne un nom à cet accès.' });
  if (db.keys.some((k) => k.group === group && k.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Un accès porte déjà ce nom dans ce groupe.' });
  let pw = typeof b.password === 'string' && b.password ? b.password : '';
  if (pw && pw.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum).' });
  const generated = !pw;
  if (generated) { do pw = randPw(); while (passwordTaken(pw, group)); }
  else if (passwordTaken(pw, group)) return res.status(409).json({ error: 'Ce mot de passe est déjà utilisé par un autre accès de ce groupe.' });
  const key = makeKey({ name, group, admin: !!b.admin, perms: cleanPerms(b.perms), hiddenCategories: cleanCats(b.hiddenCategories), ...hashPw(pw) });
  db.keys.push(key);
  audit(who(req), `a créé l’accès « ${name} »${key.admin ? (group === '*' ? ' (administrateur général)' : ' (administrateur du groupe)') : ''}`, scopeTag(group));
  save();
  res.json({ key: pub(key), password: generated ? pw : undefined });
});

admin.patch('/keys/:id', (req, res) => {
  const key = db.keys.find((k) => k.id === req.params.id);
  if (!key || !canKey(req, key)) return res.status(404).json({ error: 'Accès introuvable.' });
  const b = req.body || {};
  const self = key.id === req.auth.key.id;
  const next = { ...key, perms: { ...key.perms } };
  let revealed;

  if (typeof b.name === 'string') {
    const name = clip(b.name.trim(), 40);
    if (!name) return res.status(400).json({ error: 'Le nom ne peut pas être vide.' });
    if (db.keys.some((k) => k.id !== key.id && k.group === key.group && k.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Un accès porte déjà ce nom dans ce groupe.' });
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
    if (!pw) { do pw = randPw(); while (passwordTaken(pw, key.group, key.id)); revealed = pw; }
    else if (passwordTaken(pw, key.group, key.id)) return res.status(409).json({ error: 'Ce mot de passe est déjà utilisé par un autre accès de ce groupe.' });
    Object.assign(next, hashPw(pw));
    next.ver = (key.ver || 1) + 1; // déconnecte les sessions ouvertes avec l'ancien mot de passe
  }
  if (!next.enabled && key.enabled) next.ver = (next.ver || 1) + 1;

  const others = db.keys.map((k) => (k.id === key.id ? next : k));
  if (!globalAdmins(others)) return res.status(400).json({ error: 'Il doit rester au moins un administrateur général actif.' });

  Object.assign(key, next);
  const bits = [];
  if (typeof b.name === 'string') bits.push('nom');
  if (typeof b.admin === 'boolean' || b.perms) bits.push('permissions');
  if (Array.isArray(b.hiddenCategories)) bits.push('catégories masquées');
  if (typeof b.enabled === 'boolean') bits.push(next.enabled ? 'activé' : 'désactivé');
  if (b.regenerate || b.password) bits.push('mot de passe');
  audit(who(req), `a modifié l’accès « ${key.name} » (${bits.join(', ') || 'rien'})`, scopeTag(key.group));
  save();
  broadcast('config');
  res.json({ key: pub(key), password: revealed });
});

admin.delete('/keys/:id', (req, res) => {
  const key = db.keys.find((k) => k.id === req.params.id);
  if (!key || !canKey(req, key)) return res.status(404).json({ error: 'Accès introuvable.' });
  if (key.builtin) return res.status(400).json({ error: 'Les accès Admin et Membre de départ ne peuvent pas être supprimés, seulement modifiés.' });
  if (key.id === req.auth.key.id) return res.status(400).json({ error: 'Tu ne peux pas supprimer l’accès que tu utilises.' });
  const rest = db.keys.filter((k) => k.id !== key.id);
  if (!globalAdmins(rest)) return res.status(400).json({ error: 'Il doit rester au moins un administrateur général actif.' });
  db.keys = rest;
  audit(who(req), `a supprimé l’accès « ${key.name} »`, scopeTag(key.group));
  save();
  broadcast('config');
  res.json({ ok: true });
});

// --- Données
admin.post('/purge', (req, res) => {
  const what = req.body?.what;
  const groupName = clip(req.body?.group || req.auth.group, 50);
  const parts = { logs: ['logs'], stock: ['stock'], money: ['money'], members: ['members'], all: ['logs', 'stock', 'money', 'members'] }[what];
  if (!parts) return res.status(400).json({ error: 'Choix inconnu.' });
  if (groupName === '*') { if (!req.auth.global) return res.status(403).json({ error: 'Réservé à l’administrateur général.' }); }
  else if (!db.groups[groupName]) return res.status(404).json({ error: 'Groupe introuvable.' });
  else if (!req.auth.global && groupName !== req.auth.group) return res.status(403).json({ error: 'Tu ne gères pas ce groupe.' });
  const targets = groupName === '*' ? Object.keys(db.groups) : [groupName];
  for (const t of targets) for (const p of parts) db.groups[t][p] = p === 'logs' || p === 'money' ? [] : {};
  audit(who(req), `a vidé ${what === 'all' ? 'toutes les données' : what} (${groupName === '*' ? 'tous les groupes' : labelOf(groupName)})`, scopeTag(groupName));
  save();
  broadcast('update', groupName);
  res.json({ ok: true });
});

admin.get('/export', (req, res) => {
  const q = String(req.query.group || (req.auth.global ? '*' : req.auth.group));
  let payload;
  if (q === '*') {
    if (!req.auth.global) return res.status(403).json({ error: 'Réservé à l’administrateur général.' });
    payload = { exportedAt: new Date().toISOString(), settings: db.settings, groups: Object.fromEntries(Object.entries(db.groups).map(([k, v]) => [k, stripGroup(v)])) };
  } else {
    if (!db.groups[q]) return res.status(404).json({ error: 'Groupe introuvable.' });
    if (!req.auth.global && q !== req.auth.group) return res.status(403).json({ error: 'Tu ne gères pas ce groupe.' });
    payload = { exportedAt: new Date().toISOString(), group: q, data: stripGroup(db.groups[q]) };
  }
  res.setHeader('Content-Disposition', `attachment; filename="sauvegarde-${q === '*' ? 'tout' : q}-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(payload);
});

app.use('/api/admin', admin);
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`✅ Dashboard sur http://localhost:${PORT} (stockage : ${pool ? 'PostgreSQL' : 'fichier data.json'})`);
});
