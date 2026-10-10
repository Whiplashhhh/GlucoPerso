# Déploiement de GlucoPerso

GlucoPerso contient des données de santé : l'appli est pensée pour être
auto-hébergée sur un petit serveur (VPS, Raspberry Pi 64 bits, NAS…), servie
en **HTTPS** derrière un reverse proxy.

- [Lancer en local (développement)](#lancer-en-local-développement)
- [Production avec Docker](#production-avec-docker)
- [HTTPS avec Caddy](#https-avec-caddy)
- [Premier code d'invitation](#premier-code-dinvitation)
- [Sauvegardes et restauration](#sauvegardes-et-restauration)
- [Mettre à jour](#mettre-à-jour)
- [Appli installable (PWA)](#appli-installable-pwa)

## Lancer en local (développement)

Prérequis : Node.js 24 (voir `.nvmrc`), Docker (pour PostgreSQL).

```bash
npm ci
npm run setup        # crée .env à partir de .env.example et génère les secrets
npm run db:up        # PostgreSQL de dev sur 127.0.0.1:5433
npm run db:migrate   # applique les migrations
npm run invite       # affiche un code d'invitation
npm run dev          # http://localhost:3000
```

Pour tester le build de production en local : `npm run build && npm start`
(le service worker n'est enregistré qu'en production).

## Production avec Docker

La pile `docker-compose.yml` contient :

| Service | Rôle                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `db`    | PostgreSQL 17, sur un réseau interne sans accès extérieur, **aucun port publié**.                                           |
| `app`   | Serveur Next.js (utilisateur non-root, système de fichiers en lecture seule), publié sur `127.0.0.1:3000` uniquement.       |
| `caddy` | Optionnel (profil `caddy`) : reverse proxy HTTPS avec certificats automatiques. Voir [HTTPS avec Caddy](#https-avec-caddy). |

Volumes :

- `db-data` : la base de données ;
- `app-data` (monté sur `/data`) : les photos (`/data/photos`) et le secret de
  session généré au premier démarrage (`/data/secrets.env`, droits 600) ;
- `./backups/` (dossier de l'hôte) : les sauvegardes faites par
  `scripts/backup.sh`.

Au démarrage, le conteneur `app` :

1. génère `BETTER_AUTH_SECRET` s'il n'est pas fourni et le conserve dans
   `/data/secrets.env` ;
2. applique les migrations (`prisma migrate deploy`, avec quelques essais si la
   base n'est pas encore prête) ;
3. lance le serveur (`node server.js`) — un `HEALTHCHECK` surveille
   `/connexion`.

### Installation

```bash
git clone <dépôt> glucoperso && cd glucoperso
cp .env.example .env
chmod 600 .env
```

Dans `.env`, renseigner au minimum (section « Docker » en bas du fichier) :

| Variable                | Valeur                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `POSTGRES_PASSWORD`     | mot de passe de la base, lettres et chiffres uniquement : `openssl rand -hex 32`                             |
| `BETTER_AUTH_URL`       | l'URL publique exacte, en https : `https://glucoperso.example.org`                                           |
| `BETTER_AUTH_SECRET`    | laisser vide (généré par le conteneur) ou mettre une valeur de 32+ caractères                                |
| `REGISTRATION_MODE`     | `invite` (défaut), ou `closed` une fois les comptes créés                                                    |
| `APP_BIND` / `APP_PORT` | où publier l'appli sur l'hôte (défaut `127.0.0.1:3000`, à garder derrière un proxy)                          |
| `TRUSTED_PROXIES`       | voir ci-dessous                                                                                              |
| `SMTP_*`                | optionnel, pour la réinitialisation du mot de passe par e-mail (les codes de récupération marchent toujours) |
| `DOMAIN` / `ACME_EMAIL` | seulement avec le Caddy intégré                                                                              |

`DATABASE_URL` et `PHOTOS_DIR` de `.env` sont ignorées par la pile Docker : elle
les fixe elle-même.

Puis :

```bash
docker compose up -d --build     # construit l'image et démarre db + app
docker compose ps                # app doit passer « healthy »
docker compose logs -f app
```

**IP des clients et `TRUSTED_PROXIES`** — la limitation des tentatives de
connexion se base sur l'en-tête `X-Forwarded-For`. Caddy le remplace par l'IP
réelle du client : avec Caddy (intégré ou sur l'hôte), `TRUSTED_PROXIES` peut
rester vide. Si un autre proxy _ajoute_ son IP à la chaîne (ou si Caddy est
lui-même derrière un CDN), lister les IP/CIDR de ces proxys dans
`TRUSTED_PROXIES` (séparées par des virgules). Ne jamais exposer le port 3000
directement sur Internet : n'importe qui pourrait alors forger cet en-tête.

## HTTPS avec Caddy

Deux options, au choix :

**A. Caddy intégré à la pile** (le plus simple sur un serveur dédié) :

```bash
# .env : DOMAIN=glucoperso.example.org, ACME_EMAIL=toi@example.org,
#        BETTER_AUTH_URL=https://glucoperso.example.org
docker compose --profile caddy up -d --build
```

Le DNS de `DOMAIN` doit pointer vers le serveur et les ports 80 et 443 doivent
être ouverts : le certificat est obtenu et renouvelé automatiquement. La
configuration est dans [`docker/Caddyfile`](../docker/Caddyfile) : compression,
limite de 12 Mo par requête (photos), en-têtes de sécurité laissés à l'appli
(qui envoie déjà CSP, HSTS, etc. — ne pas les dupliquer), termes de recherche
retirés des journaux.

**B. Reverse proxy déjà présent sur l'hôte** (Caddy, nginx, Traefik…) : lancer
la pile sans profil (`docker compose up -d --build`) et faire pointer le proxy
vers `127.0.0.1:3000`. Avec Caddy installé sur l'hôte, reprendre
`docker/Caddyfile` en remplaçant `app:3000` par `127.0.0.1:3000`. Pour nginx,
penser à `client_max_body_size 12m;` et à transmettre `Host`,
`X-Forwarded-For` et `X-Forwarded-Proto`.

## Premier code d'invitation

L'inscription se fait sur invitation (`REGISTRATION_MODE=invite`). Créer un code
à usage unique :

```bash
docker compose exec app invite
docker compose exec app invite --days 3 --note "Pour Léa"   # options
```

(`invite` est la version empaquetée de `npm run invite`, qui n'existe pas dans
l'image de production.) Le code n'est affiché qu'une fois et stocké haché.
Une fois tous les comptes créés, passer `REGISTRATION_MODE=closed` puis
`docker compose up -d`.

## Sauvegardes et restauration

### Sauvegarder

```bash
scripts/backup.sh
```

Crée `backups/<horodatage UTC>/` contenant :

- `db.dump` — la base (`pg_dump` au format custom, vérifié avec `pg_restore --list`) ;
- `data.tar.gz` — le volume de données : photos **et** `secrets.env` ;
- `SHA256SUMS` — les empreintes.

Seules les 14 dernières sauvegardes sont gardées (`BACKUP_KEEP=30` pour en
garder plus, `BACKUP_DIR=/chemin` pour changer de dossier). Le script marche
que l'appli tourne ou non (la base doit tourner).

Planification quotidienne (crontab de l'utilisateur qui gère Docker) :

```cron
15 3 * * * cd /srv/glucoperso && scripts/backup.sh >> backups/backup.log 2>&1
```

Les sauvegardes contiennent des données de santé : dossier en droits 700,
et copie hors du serveur **chiffrée** (par exemple `restic`, `borg` ou
`age`).

### Restaurer

```bash
scripts/restore.sh backups/20261010T031500Z
```

Le script :

1. vérifie les empreintes de la sauvegarde ;
2. demande de taper « restaurer » (ou `--yes` pour sauter la question) ;
3. fait d'abord une **sauvegarde de sécurité** de l'état actuel dans
   `backups/pre-restore/` ;
4. arrête l'appli ;
5. restaure la base avec `pg_restore --clean --if-exists` en une seule
   transaction (en cas d'erreur, rien n'est modifié) ;
6. remplace le contenu du volume de données (photos et secrets) ;
7. redémarre l'appli, qui applique les éventuelles migrations plus récentes.

Pour restaurer sur un nouveau serveur : installer la pile comme ci-dessus
(même `.env`), `docker compose up -d --build`, copier le dossier de sauvegarde
puis lancer `scripts/restore.sh`.

## Mettre à jour

```bash
scripts/backup.sh                  # toujours sauvegarder avant
git pull
docker compose up -d --build       # reconstruit l'image ; les migrations s'appliquent au démarrage
docker compose ps                  # vérifier que app est « healthy »
docker image prune -f              # optionnel : supprime les anciennes images
```

Pour mettre à jour PostgreSQL vers une nouvelle version majeure (18…) : faire
une sauvegarde, changer l'image, repartir d'un volume `db-data` vide puis
restaurer avec `scripts/restore.sh`.

## Appli installable (PWA)

- Manifeste : `src/app/manifest.ts` ; icônes et écrans de lancement iOS :
  `public/icons/`, `public/apple-touch-icon.png`, `public/splash/`, générés
  par `npm run icons` à partir de la mascotte (`scripts/generate-icons.mjs`).
- Service worker : `public/sw.js`, enregistré en production uniquement. Il ne
  garde en cache que la page `/hors-ligne` et les fichiers statiques (JS, CSS,
  polices, icônes). **Jamais** les réponses `/api/*`, les photos ni le HTML
  des autres pages : aucune donnée de santé ne reste dans le cache du
  téléphone. Changer `VERSION` dans `sw.js` quand sa logique ou les icônes
  changent.
- Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ». Sur Android :
  menu de Chrome → « Installer l'application ».
