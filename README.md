# Dashboard de groupe GTA RP

Site Node.js qui reçoit les logs de ton serveur FiveM via un webhook et les affiche :
logs, coffre (images + catégories), membres, argent. Mise à jour en direct, mot de passe optionnel.

## Installation

```bash
npm install
cp .env.example .env      # puis remplis les valeurs
npm start
```

Pour tester : lance `npm start`, puis dans un autre terminal :

```bash
WEBHOOK_SECRET=<ton secret> npm run seed
```

Ouvre http://localhost:3000.

## Accès au site

Pas de Discord : par défaut le site est ouvert à toute personne qui a le lien.
Pour le protéger, mets un mot de passe dans `.env` (`SITE_PASSWORD=...`). Une page de connexion apparaîtra.

## Côté FiveM

1. Copie `fivem/dashboard_logs` dans `resources/`
2. Dans `server.cfg` :
   ```
   set dashboard_url "https://ton-site.com/api/webhook"
   set dashboard_secret "le même WEBHOOK_SECRET"
   set dashboard_group "default"
   ensure dashboard_logs
   ```
3. Appelle les exports depuis ton framework :
   ```lua
   exports.dashboard_logs:Log(nom, 'deposit', 'Dépôt au coffre', 'weapon_pistol', 1, 'Pistolet')
   exports.dashboard_logs:SyncStock({ {name='weed_bag', label='Weed', count=85} })
   exports.dashboard_logs:SyncMoney(25000, 120000)
   exports.dashboard_logs:SyncMembers({ {identifier='license:xx', name='John', grade='Boss', online=true} })
   ```

## Format du webhook (si tu ne passes pas par le Lua)

`POST /api/webhook` avec l'en-tête `x-webhook-secret`. Corps JSON : un événement ou un tableau.

| type | champs |
|------|--------|
| `log` | `player, action, message, item, label, count, identifier, group, ts` |
| `stock` | `items: [{name, label, count, category?, image?}]` (snapshot complet) |
| `money` | `clean, dirty` |
| `members` | `members: [{identifier, name, grade, online}]` |

`action` = `deposit` / `withdraw` met à jour le coffre automatiquement. Plusieurs groupes possibles via `group`.

## Images des items

- Soit `ITEM_IMAGE_BASE=https://ton-cdn.com/items/{name}.png` dans `.env`
- Soit un champ `image` (URL) par item dans le snapshot
- Sans image : une icône de catégorie s'affiche.

## Catégories du coffre

Armes, Munitions, Drogues, Farm, Argent & valeurs, Outils, Matériaux, Autre. La catégorie est devinée depuis le nom de l'item (ex. `weapon_*` → Armes, `weed_leaf` → Farm, `weed_bag` → Drogues), ou envoyée par ton script via le champ `category` (`armes`, `munitions`, `drogues`, `farm`, `argent`, `outils`, `materiaux`, `autre`). Pour changer les règles de détection, modifie `CATEGORY_RULES` dans `server.js`. Une catégorie inconnue envoyée par ton script est aussi affichée.

## Mise en ligne

Mets le site derrière HTTPS (Caddy, Nginx, Cloudflare Tunnel…). Pense à mettre un `SITE_PASSWORD`.
