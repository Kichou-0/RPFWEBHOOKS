// Envoie des données factices au dashboard pour tester le rendu.
// Usage: WEBHOOK_SECRET=... node seed.js [url]
const URL_ = process.argv[2] || 'http://localhost:3000/api/webhook';
const SECRET = process.env.WEBHOOK_SECRET || 'test';
const G = 'default';

const items = [
  ['weapon_pistol', 'Pistolet', 4], ['weapon_smg', 'SMG', 2], ['weapon_knife', 'Couteau', 7], ['weapon_bat', 'Batte', 3],
  ['pistol_ammo', 'Munitions 9mm', 320], ['rifle_ammo', 'Munitions 5.56', 150], ['shotgun_ammo', 'Cartouches', 60],
  ['weed_bag', 'Sachet de weed', 85], ['coke_pouch', 'Pochon de coke', 40], ['meth_bag', 'Sachet de meth', 22], ['oxy_pill', 'Oxy', 35],
  ['weed_leaf', 'Feuille de cannabis', 240], ['coca_leaf', 'Feuille de coca', 180], ['copper_ore', 'Minerai de cuivre', 95], ['poppy_seed', 'Graine de pavot', 120],
  ['black_money', 'Argent cash', 18500], ['gold_chain', 'Chaîne en or', 9], ['rolex', 'Rolex', 4],
  ['lockpick', 'Crochet', 12], ['armor_vest', 'Gilet pare-balles', 6], ['usb_hack', 'Clé USB', 3], ['phone', 'Téléphone', 5], ['drill', 'Perceuse', 2],
  ['iron', 'Fer', 140], ['plastic', 'Plastique', 95], ['steel', 'Acier', 70],
  ['sandwich', 'Sandwich', 30], ['water', 'Eau', 45],
];
const members = [
  ['lic:1', 'Marco Rossi', 'Boss', true], ['lic:2', 'Tony Vega', 'Capo', true], ['lic:3', 'Léa Moreau', 'Soldat', false],
  ['lic:4', 'Sam Carter', 'Soldat', true], ['lic:5', 'Nino Costa', 'Recrue', false],
];

const events = [];
events.push({ type: 'stock', group: G, items: items.map(([name, label, count]) => ({ name, label, count })) });
events.push({ type: 'members', group: G, members: members.map(([identifier, name, grade, online]) => ({ identifier, name, grade, online })) });
let clean = 12000, dirty = 40000;
const now = Math.floor(Date.now() / 1000);
for (let i = 24; i >= 0; i--) {
  clean += Math.round((Math.random() - 0.35) * 3000);
  dirty += Math.round((Math.random() - 0.3) * 6000);
  events.push({ type: 'money', group: G, ts: now - i * 3600, clean: Math.max(0, clean), dirty: Math.max(0, dirty) });
}
const actions = ['deposit', 'withdraw', 'kill', 'info'];
for (let i = 0; i < 30; i++) {
  const m = members[i % members.length];
  const a = actions[i % actions.length];
  const it = items[(i * 3) % items.length];
  events.push({
    type: 'log', group: G, ts: now - i * 900, player: m[1], identifier: m[0], action: a,
    ...(a === 'deposit' || a === 'withdraw' ? { item: it[0], label: it[1], count: 1 + (i % 4), message: a === 'deposit' ? 'Dépôt au coffre' : 'Retrait du coffre' } : { message: a === 'kill' ? 'Élimination en zone' : 'Connexion au serveur' }),
  });
}

const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-webhook-secret': SECRET }, body: JSON.stringify(events) });
console.log(r.status, await r.text());
