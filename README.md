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

## Groupes, mots de passe et droits

Le site gère **plusieurs groupes séparés**. Chaque groupe a ses propres données (logs, coffre, membres, argent), ses réglages et ses mots de passe. À la connexion, on **choisit son groupe** puis on entre son mot de passe. Un mot de passe ne donne accès qu'à son groupe.

| Accès | Portée |
|-------|--------|
| **Administrateur général** (mot de passe `ADMIN_PASSWORD`) | Tous les groupes : crée/supprime les groupes, change de groupe depuis le menu, règle tout |
| **Admin du groupe** (administrateur local) | Son groupe seulement : ses accès, ses fonctions visibles, ses catégories, ses données |
| **Membre / accès personnalisés** | Son groupe, avec les pages et détails que l'admin a autorisés |

Créer un groupe (**Réglages > Groupes**, administrateur général) génère automatiquement un accès « Admin » (administrateur local) et un accès « Membre », avec des mots de passe aléatoires affichés une seule fois. Donne le mot de passe Admin au chef du groupe : il pourra créer ses propres accès, couper des fonctions et masquer des catégories **dans son groupe uniquement**.

Le même mot de passe peut exister dans deux groupes différents sans problème. Les mots de passe sont hachés (scrypt), les droits sont appliqués par le serveur : une donnée interdite ou d'un autre groupe n'est jamais envoyée au navigateur.

Dans **Réglages > Général > Connexion**, tu peux cacher la liste des groupes : il faut alors taper le code ou le nom du groupe pour se connecter.

## Aperçu personnalisable et icônes des items

- **Aperçu** : avec la permission « Personnaliser l'aperçu », bouton **Personnaliser** : ajouter, retirer, déplacer (glisser l'en-tête) et redimensionner (tirer le coin) les widgets. La disposition est enregistrée **par accès et par groupe**. 9 widgets : argent propre, argent cash, coffre, membres en ligne, évolution de l'argent, derniers mouvements, coffre en bref, connectés, plus grosses quantités. Un widget n'apparaît que si l'accès a le droit de voir les données correspondantes.
- **Icônes** : avec la permission « Choisir les icônes des items », un bouton crayon apparaît sur chaque item du coffre (au survol) : emoji au choix ou adresse d'une image. L'icône est gardée même si ton serveur renvoie un nouveau snapshot du coffre.
- Les deux se règlent comme les autres droits : Réglages > Accès (par accès), Réglages > Ce groupe (coupure pour tout le groupe) et Général (coupure pour tous les groupes). Pour un accès existant, ces deux droits sont désactivés tant que tu ne les coches pas.

## Argent cash et argent propre

- **Argent cash** : l'argent qui passe dans les logs, envoyé par ton serveur de jeu (`SyncMoney(cash)`).
- **Argent propre** : l'argent de vos comptes, qui n'est pas dans les logs. Il se saisit sur le site (page Argent, ou le lien « Modifier » du widget) : définir le solde, ajouter ou retirer, avec une note. Chaque modification est gardée avec son auteur. Le champ `clean` envoyé par un serveur de jeu est ignoré.
- Deux permissions : « Argent cash » (voir) et « Modifier l'argent propre » (saisir). La seconde est désactivée d'office pour les accès existants et pour les membres des nouveaux groupes.

## Page Profil et styles de présentation

Le menu en haut à gauche a deux boutons côte à côte : **Profil** et **Quitter**. La page Profil montre ton accès (rôle, groupe, pages visibles) et, avec la permission « Changer le style de présentation », des choix qui ne touchent que ton affichage, sur ton appareil : 5 thèmes (Navy, Anthracite, Feutre, Minuit, Clair), 7 couleurs d'accent, densité (confortable/compact), arrondis (carrés/doux/ronds), coffre en cartes ou en liste, animations. Sans cette permission, le style par défaut du site s'applique. Elle se règle comme les autres droits (par accès, par groupe ou pour tous les groupes), et elle est activée d'office pour les accès existants.

## Réglages

- **Groupes** *(général)* : créer, gérer, supprimer des groupes.
- **Ce groupe** : nom affiché, fonctions visibles (un interrupteur par page et par détail, appliqué tout de suite).
- **Accès** : les mots de passe du groupe (créer, modifier les droits, changer le mot de passe, désactiver, supprimer). L'administrateur général peut aussi créer un accès « tous les groupes ».
- **Catégories** : masquer des catégories du coffre pour ce groupe.
- **Données** : export JSON, vidage des logs, du coffre, de l'argent ou des membres.
- **Journal** : qui a changé quoi, et quand.
- **Général** *(général)* : nom du site, pied de page, images, logs conservés, thème, fonctions coupées pour tous les groupes, liste des groupes à la connexion.
- **Webhook** *(général)* : adresse et état de la connexion avec ton serveur.

Garde-fous : il reste toujours au moins un administrateur général actif, on ne peut pas supprimer ou désactiver son propre accès, les accès de départ ne se suppriment pas, et un administrateur local ne voit jamais un autre groupe.

**Si tu mettais déjà le site à jour :** les accès existants sont migrés automatiquement (l'ancien « Admin » devient administrateur général, les autres restent dans le groupe `default`).

## Côté FiveM : un webhook par groupe

Chaque groupe a **son propre lien et son propre secret** (Réglages > **Ce groupe** > Webhook de ce groupe). Tout ce qu'il reçoit va dans ce groupe, jamais dans un autre, même si l'événement indique un autre `group`. L'admin local de chaque groupe peut voir et renouveler son secret.

1. Copie `fivem/dashboard_logs` dans `resources/` du serveur FiveM de ce groupe
2. Dans son `server.cfg` (la carte est affichée toute prête sur le site, il suffit de la copier) :
   ```
   set dashboard_url "https://ton-site.com/api/webhook/ballas"
   set dashboard_secret "wh_le-secret-de-ce-groupe"
   ensure dashboard_logs
   ```
3. Appelle les exports depuis ton framework :
   ```lua
   exports.dashboard_logs:Log(nom, 'deposit', 'Dépôt au coffre', 'weapon_pistol', 1, 'Pistolet')
   exports.dashboard_logs:SyncStock({ {name='weed_bag', label='Weed', count=85} })
   exports.dashboard_logs:SyncMoney(120000)   -- argent cash
   exports.dashboard_logs:SyncMembers({ {identifier='license:xx', name='John', grade='Boss', online=true} })
   ```

Le lien général `/api/webhook` (secret `WEBHOOK_SECRET` du `.env`) existe toujours : il range chaque événement dans le groupe de son champ `group`.

## Format du webhook (si tu ne passes pas par le Lua)

`POST /api/webhook` avec l'en-tête `x-webhook-secret`. Corps JSON : un événement ou un tableau.

| type | champs |
|------|--------|
| `log` | `player, action, message, item, label, count, identifier, group, ts` |
| `stock` | `items: [{name, label, count, category?, image?}]` (snapshot complet) |
| `money` | `cash` (l'argent cash ; `dirty` marche aussi) |
| `members` | `members: [{identifier, name, grade, online}]` |

`action` = `deposit` / `withdraw` met à jour le coffre automatiquement. Le champ `group` est le code du groupe : un événement pour un groupe qui n'existe pas encore le crée automatiquement (sans accès : crée ses mots de passe dans Réglages > Groupes ou Accès).

## Images des items

- Adresse commune dans Réglages > Général, ex. `https://ton-cdn.com/items/{name}.png`
- Ou un champ `image` (URL) par item dans le snapshot
- Sans image : deux lettres colorées s'affichent.

## Catégories du coffre

Armes, Munitions, Drogues, Farm, Argent et valeurs, Outils, Matériaux, Autre. La catégorie est devinée depuis le nom de l'item (`weapon_*` → Armes, `weed_leaf` → Farm, `weed_bag` → Drogues), ou envoyée par ton script via `category` (`armes`, `munitions`, `drogues`, `farm`, `argent`, `outils`, `materiaux`, `autre`). Pour changer les règles, modifie `CATEGORY_RULES` dans `server.js`.

## Données et base PostgreSQL

Avec `DATABASE_URL`, tout est enregistré dans PostgreSQL : logs, coffre, membres, argent, groupes, mots de passe (hachés), réglages, journal **et les connexions**. Rien ne se perd à un redémarrage ou à une mise à jour. Seul ce qui a changé est réécrit. Sans `DATABASE_URL`, le site utilise `data.json` (mets alors `DATA_DIR` sur un disque persistant).

Au premier démarrage sur une base vide, un `data.json` existant est importé tout seul.

## Mise en ligne sur Render

1. Mets le dossier sur GitHub (sans `.env` ni `data.json`, déjà dans `.gitignore`).
2. Sur Render : **New > Blueprint**, choisis ton dépôt : `render.yaml` crée le site et la base PostgreSQL et les relie.
3. Saisis `ADMIN_PASSWORD` quand Render le demande. `WEBHOOK_SECRET` et `SESSION_SECRET` sont générés.
4. Ton site est en HTTPS. Crée tes groupes dans Réglages > Groupes et copie le webhook de chacun dans son `server.cfg`.

À savoir : sur Render, la base PostgreSQL gratuite est supprimée au bout de 30 jours et le site gratuit s'endort (les webhooks arrivés pendant le sommeil peuvent être perdus). `render.yaml` prend donc des plans payants. Pour rester gratuit, prends une base externe (Neon, Supabase) et colle son adresse dans `DATABASE_URL`.

Ne publie jamais ton `.env`.
