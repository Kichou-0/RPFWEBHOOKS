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
  // Mot de passe optionnel pour protéger le site. Vide = site ouvert à tous.
  SITE_PASSWORD = '',
  // Ex: https://mon-cdn.com/items/{name}.png
  ITEM_IMAGE_BASE = '',
} = process.env;

const PROTECTED = !!SITE_PASSWORD;

if (!WEBHOOK_SECRET) {
  console.error('⚠️  WEBHOOK_SECRET manquant dans .env — le webhook refusera toutes les requêtes.');
}
if (!PROTECTED) {
  console.error('ℹ️  SITE_PASSWORD vide : le site est accessible sans connexion à toute personne ayant le lien.');
}

// --- Stockage JSON simple ---------------------------------------------------
const DATA_FILE = path.join(__dirname, 'data.json');
let db = { groups: {} };
try {
  if (fs.existsSync(DATA_FILE)) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (e) {
  console.error('data.json illisible, démarrage à vide:', e.message);
}
let saveTimer;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DATA_FILE, JSON.stringify(db), () => {}), 500);
};
const grp = (name) => (db.groups[name] ??= { logs: [], stock: {}, members: {}, money: [] });

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

const sseClients = new Set();
const broadcast = () => {
  for (const res of sseClients) res.write('data: update\n\n');
};

// --- Traitement des événements du webhook ------------------------------------
function applyStockDelta(g, e) {
  const name = clip(e.item, 80);
  const count = Math.abs(num(e.count, 0));
  if (!name || !count) return;
  const sign = e.action === 'deposit' ? 1 : e.action === 'withdraw' ? -1 : 0;
  if (!sign) return;
  const cur = (g.stock[name] ??= {
    name,
    label: clip(e.label || name, 80),
    count: 0,
    category: clip(e.category, 30) || guessCategory(name),
    image: clip(e.image, 400),
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
        id: crypto.randomBytes(6).toString('hex'),
        ts: toMs(e.ts),
        player: clip(e.player, 80) || 'Inconnu',
        identifier: clip(e.identifier, 80),
        action: clip(e.action, 40) || 'info',
        item: clip(e.item, 80),
        label: clip(e.label, 80),
        count: num(e.count, 0),
        message: clip(e.message, 400),
      };
      g.logs.unshift(entry);
      if (g.logs.length > 5000) g.logs.length = 5000;
      applyStockDelta(g, e);
      if (entry.identifier && g.members[entry.identifier]) g.members[entry.identifier].lastSeen = entry.ts;
      break;
    }
    case 'stock': {
      // Snapshot complet du coffre : remplace l'état actuel.
      const items = Array.isArray(e.items) ? e.items : [];
      const stock = {};
      for (const it of items.slice(0, 2000)) {
        const name = clip(it.name, 80);
        const count = num(it.count, 0);
        if (!name || count <= 0) continue;
        stock[name] = {
          name,
          label: clip(it.label || name, 80),
          count,
          category: clip(it.category, 30) || guessCategory(name),
          image: clip(it.image, 400),
        };
      }
      g.stock = stock;
      break;
    }
    case 'money': {
      g.money.push({ ts: toMs(e.ts), clean: num(e.clean), dirty: num(e.dirty) });
      if (g.money.length > 2000) g.money.splice(0, g.money.length - 2000);
      break;
    }
    case 'member':
    case 'members': {
      const list = Array.isArray(e.members) ? e.members : [e];
      for (const m of list.slice(0, 500)) {
        const id = clip(m.identifier || m.name, 80);
        if (!id) continue;
        const prev = g.members[id] || {};
        g.members[id] = {
          identifier: id,
          name: clip(m.name, 80) || prev.name || id,
          grade: clip(m.grade, 40) || prev.grade || 'Membre',
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

// --- App ------------------------------------------------------------------------
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Webhook (authentifié par secret, pas par session)
app.post('/api/webhook', express.json({ limit: '2mb' }), (req, res) => {
  if (!WEBHOOK_SECRET || !safeEq(req.get('x-webhook-secret') || '', WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const events = Array.isArray(req.body) ? req.body : [req.body];
  for (const e of events.slice(0, 500)) handleEvent(e);
  save();
  broadcast();
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

// Connexion par mot de passe (uniquement si SITE_PASSWORD est défini)
const loginPage = (err = '') => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connexion</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(900px 320px at 50% -80px,rgba(96,150,170,.18),transparent 70%),#1a1b1f;color:#f2f3f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
form{background:#202126;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:28px;width:min(340px,92vw);display:flex;flex-direction:column;gap:14px}
h1{margin:0;font-size:22px;letter-spacing:-.03em}p{margin:-6px 0 4px;color:#9b9da6;font-size:14px}
input{background:#2a2b31;color:#f2f3f5;border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:12px 16px;font:inherit;outline:0}input:focus{border-color:rgba(255,255,255,.25)}
button{background:#f2f3f5;color:#16171a;border:0;padding:12px;border-radius:999px;font:inherit;font-weight:600;cursor:pointer}button:hover{background:#fff}
.e{color:#ff7b7b;font-size:13px;min-height:16px;margin-top:-6px}</style>
<form method="post" action="/login"><h1>Accès réservé</h1><p>Entre le mot de passe du groupe pour voir le tableau de bord.</p><input type="password" name="password" placeholder="Mot de passe" autofocus required aria-label="Mot de passe"><div class="e" role="alert">${err}</div><button>Entrer</button></form>`;

app.get('/login', (req, res) => {
  if (!PROTECTED || req.session.user) return res.redirect('/');
  res.type('html').send(loginPage());
});

const attempts = new Map(); // anti brute-force simple par IP
app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  if (!PROTECTED) return res.redirect('/');
  const ip = req.ip;
  const a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 10 * 60 * 1000) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 8) return res.status(429).type('html').send(loginPage('Trop d\'essais, réessaie dans quelques minutes.'));
  if (!safeEq(req.body.password || '', SITE_PASSWORD)) {
    a.n++; attempts.set(ip, a);
    return res.status(401).type('html').send(loginPage('Mot de passe incorrect.'));
  }
  attempts.delete(ip);
  req.session.user = { id: 'member', username: 'Membre', avatar: '' };
  res.redirect('/');
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// Tout le reste : ouvert si pas de mot de passe, sinon connexion requise
const requireAuth = (req, res, next) => {
  if (!PROTECTED) {
    req.user = { id: 'guest', username: 'Visiteur', avatar: '' };
    return next();
  }
  if (req.session.user) {
    req.user = req.session.user;
    return next();
  }
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'unauthenticated' });
  res.redirect('/login');
};
app.use(requireAuth);

app.get('/api/me', (req, res) => {
  res.json({ user: req.user, imageBase: ITEM_IMAGE_BASE, groups: Object.keys(db.groups), demo: !PROTECTED });
});

app.get('/api/state', (req, res) => {
  const name = clip(req.query.group || 'default', 50);
  const g = db.groups[name] || { logs: [], stock: {}, members: {}, money: [] };
  res.json({
    group: name,
    stock: Object.values(g.stock),
    members: Object.values(g.members),
    money: g.money.slice(-300),
    logs: g.logs.slice(0, 500),
    totalLogs: g.logs.length,
  });
});

app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  sseClients.add(res);
  const ka = setInterval(() => res.write(': ka\n\n'), 25000);
  req.on('close', () => {
    clearInterval(ka);
    sseClients.delete(res);
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`✅ Dashboard sur http://localhost:${PORT}${PROTECTED ? '' : '  (site ouvert, pas de mot de passe)'}`);
});
