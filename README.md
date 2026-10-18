# Dashboard de groupe GTA RP

Site Node.js qui reçoit les logs de ton serveur FiveM par webhook et les affiche : logs, coffre (images + catégories), membres, argent. Mise à jour en direct, plusieurs mots de passe avec des droits différents, et un panneau Réglages pour tout régler.

## Installation

```bash
npm install
cp .env.example .env      # puis remplis WEBHOOK_SECRET (et les mots de passe si tu veux les choisir)
npm start
```

Au premier lancement, si `ADMIN_PASSWORD` et `MEMBER_PASSWORD` sont vides, le site génère deux mots de passe et les affiche **une seule fois** dans la console. Note-les.

Pour voir le rendu avec des données de démo, dans un autre terminal :

```bash
WEBHOOK_SECRET=<ton secret> npm run seed
```

Ouvre http://localhost:3000.

## Mots de passe et droits

Le site est toujours protégé. Chaque mot de passe est un « accès » avec ses propres droits :

| Accès | Par défaut |
|-------|------------|
| **Admin** | Voit tout, accède aux Réglages |
| **Membre** | Voit toutes les pages, sans les Réglages |
| **Tes propres accès** | Tu choisis les pages et les détails visibles |

Dans **Réglages > Accès** (admin), tu peux :
- créer autant d'accès que tu veux (ex. « Recrues » qui ne voit que le coffre, « Comptable » qui ne voit que l'argent) ;
- choisir pour chacun les pages, l'argent sale, les images, les noms dans les logs, les dernières connexions ;
- masquer des catégories du coffre pour un seul accès ;
- changer un mot de passe (les personnes connectées avec l'ancien sont déconnectées aussitôt), désactiver ou supprimer un accès.

Les mots de passe sont stockés hachés (scrypt), jamais en clair. Les droits sont appliqués par le serveur : une donnée interdite n'est jamais envoyée au navigateur.

## Réglages (admin)

- **Général** : nom du site, pied de page, adresse des images, nombre de logs conservés, thème par défaut, noms des groupes.
- **Fonctions** : un interrupteur par page et par détail. Coupé = caché pour tout le monde sauf les administrateurs, tout de suite, même pour les personnes déjà connectées.
- **Accès** : les mots de passe, voir plus haut.
- **Catégories** : masquer une catégorie du coffre et des logs pour tous les non-administrateurs.
- **Webhook** : l'adresse à utiliser, l'état de la connexion avec ton serveur, la config à copier.
- **Données** : export JSON (sans mots de passe), vidage des logs, du coffre, de l'argent ou des membres.
- **Journal** : qui a changé quoi, et quand.

Garde-fous : il reste toujours au moins un administrateur actif, tu ne peux pas supprimer ou désactiver ton propre accès, et les accès Admin et Membre de départ ne se suppriment pas (seulement se modifient).

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

- Adresse commune dans Réglages > Général, ex. `https://ton-cdn.com/items/{name}.png`
- Ou un champ `image` (URL) par item dans le snapshot
- Sans image : deux lettres colorées s'affichent.

## Catégories du coffre

Armes, Munitions, Drogues, Farm, Argent et valeurs, Outils, Matériaux, Autre. La catégorie est devinée depuis le nom de l'item (`weapon_*` → Armes, `weed_leaf` → Farm, `weed_bag` → Drogues), ou envoyée par ton script via `category` (`armes`, `munitions`, `drogues`, `farm`, `argent`, `outils`, `materiaux`, `autre`). Pour changer les règles, modifie `CATEGORY_RULES` dans `server.js`.

## Données

Tout est enregistré dans `data.json` (logs, coffre, accès, réglages). Chez un hébergeur, mets `DATA_DIR` sur un disque persistant, sinon les données disparaissent à chaque redéploiement. Pense à faire un export de temps en temps.

## Mise en ligne

Mets le site derrière HTTPS (Caddy, Nginx, Cloudflare Tunnel…). Ne publie jamais ton `.env` ni `data.json` (ajoute-les à `.gitignore`).
