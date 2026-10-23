# RPF Dev Stock

Site Node.js basé sur ton dashboard de groupe, réduit à ce qu'il y a dans l'Excel ton Excel.

## Pages
- **Accueil** : Argent valeur (argent + armes + objets), Argent, Nombre d'armes, Graine, Plantation, Acheter, Objets vendus (calculés, comme l'Excel).
- **Armes** : quantité, valeur, valeur totale, nombre d'armes, valeur totale estimée.
- **Matériel** : Argent, Disqueuse, Kit, Pochon, Graine, Lumiere, Pot, Fertilisant, Bouteille.
- **Objets** : quantité, prix unitaire (ancienne feuille « calcule »), valeur, prix total, Vendu ?
- **Plantation** : nombre de plantations (graines ÷ graines par plantation), On a / Faut / Prix, Acheter ?, Fait ?
- **Réglages** (admin) : nom du groupe, accès et mots de passe, groupes (admin général), export JSON, retour aux valeurs de l'Excel.
- **Profil** (menu en haut à gauche) : changer son propre mot de passe, 5 thèmes, couleurs d'accent, animations.

## Mots de passe
Tu choisis tous les mots de passe toi-même (4 caractères minimum) : à la création d'un accès, au changement dans Réglages, et chacun peut changer le sien depuis Profil. Si tu laisses le champ vide dans Réglages, un mot de passe aléatoire est généré et affiché une seule fois.

Retiré par rapport au dashboard : logs, membres, argent propre/cash, webhook FiveM, aperçu personnalisable.
Conservés : groupes séparés, mots de passe hachés (scrypt), droits (Admin / Peut modifier / Lecture seule), mise à jour en direct, PostgreSQL ou data.json.

## Installation
```bash
npm install
cp .env.example .env
npm start
```
Au premier lancement, les mots de passe (admin général, Admin et Membre du groupe RPF Dev) sont affichés une seule fois dans la console. Ouvre http://localhost:3000.

## Mise en ligne (Render)
Mets le dossier sur GitHub (sans `.env` ni `data.json`), puis **New > Blueprint** : `render.yaml` crée le site et la base. Saisis `ADMIN_PASSWORD` quand Render le demande.
