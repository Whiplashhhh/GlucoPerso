# Sécurité de GlucoPerso

GlucoPerso garde les **données de santé** d'une jeune femme diabétique de
type 1 : repas, glucides, doses d'insuline, glycémies, photos, notes. Ce
document résume le modèle de menace, les protections en place (avec le code
et les tests qui les prouvent), les risques résiduels et la check-list de
l'opérateur. Dernière revue : 2026-10-10.

- [Modèle de menace](#modèle-de-menace)
- [Protections en place](#protections-en-place)
- [Tests de sécurité](#tests-de-sécurité)
- [Risques résiduels](#risques-résiduels)
- [Check-list de l'opérateur](#check-list-de-lopérateur)

## Modèle de menace

**À protéger** : les données de santé et les photos (confidentialité), leur
exactitude (une dose ou un ratio modifié peut avoir des conséquences
médicales), le compte (mot de passe, sessions, codes de secours).

**Contexte** : appli auto-hébergée, un ou quelques comptes, derrière un
reverse proxy HTTPS (Caddy), PostgreSQL non exposé.

| Attaquant                                   | Ce qu'il tente                                                       | Principales parades                                                  |
| ------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Anonyme sur Internet                        | deviner un mot de passe, créer un compte, deviner un code de secours | argon2id, limitation + verrouillage progressif, invitations, 60 bits |
| Site malveillant visité par l'utilisatrice  | CSRF, clickjacking, lecture cross-origin                             | contrôle d'origine, SameSite=Lax, `frame-ancestors 'none'`, CORP     |
| Contenu injecté (nom de plat, note…)        | XSS                                                                  | React (échappement), CSP stricte à nonce, `'strict-dynamic'`         |
| Autre utilisateur de la même instance       | lire ou modifier les données d'un autre compte (IDOR)                | chaque requête filtrée par l'`userId` de la session, testé           |
| Quelqu'un qui récupère le téléphone / un PC | lire des données en cache                                            | service worker sans données, cache vidé à la déconnexion             |
| Accès aux journaux ou aux sauvegardes       | lire des données de santé dans les logs, les dumps                   | journaux sans données, sauvegardes en 700/600, à chiffrer hors site  |

Hors périmètre : compromission du serveur lui-même (root), de l'appareil de
l'utilisatrice, ou de l'opérateur.

## Protections en place

### 1. Mots de passe et sessions

- **argon2id** (`@node-rs/argon2`, paramètres OWASP : 19 Mio, t=2, p=1) dans
  `src/lib/auth.ts`. Longueur 10 à 128 caractères.
- Cookies de session Better Auth **httpOnly**, **SameSite=Lax**, **Secure**
  dès que `BETTER_AUTH_URL` est en https (`useSecureCookies`). Préfixe
  `__Secure-` en https.
- **Nouveau jeton à chaque connexion** (jamais de fixation de session) ;
  réinitialisation du mot de passe ou récupération par code → toutes les
  sessions sont révoquées.
- Erreur identique pour « email inconnu » et « mauvais mot de passe »
  (Better Auth hache quand même le mot de passe pour égaliser le temps).
- Endpoints Better Auth inutilisés désactivés (`disabledPaths` : update-user,
  change-email/password, delete-user, comptes sociaux, jetons…).
  L'inscription HTTP directe répond 403 : seuls la Server Action et son
  contrôle de `REGISTRATION_MODE` créent des comptes.

### 2. Limitation des tentatives

- Better Auth `rateLimit` stocké en base : connexion 6/min, demande de
  réinitialisation 3/5 min, réinitialisation 5/5 min, 120/min sinon (par IP).
- **Verrouillage progressif** (`src/server/throttle.ts`,
  `src/lib/security/lockout.ts`) : après 5 échecs, 30 s puis doublement
  jusqu'à 1 h ; clé = hachage de l'email (jamais l'email en clair). Appliqué à
  la connexion (hooks Better Auth), à la récupération (email **et** IP), à
  l'inscription (IP, échecs seulement) et à la suppression de compte.
- Le compteur est **atomique** (`SELECT … FOR UPDATE`) : une rafale de
  requêtes parallèles compte chaque échec.
- **IP du client** (`src/lib/security/ip.ts`) : mêmes règles que Better
  Auth. Avec `TRUSTED_PROXIES`, `X-Forwarded-For` est lu de droite à gauche ;
  sans, seul un en-tête à une valeur est cru (Caddy écrase l'en-tête). Sinon :
  compteur commun « unknown ». `X-Real-IP` est ignoré.

### 3. CSRF et méthodes

- **Server Actions** (`src/server/actions/*.ts`, toutes `"use server"`) :
  contrôle `Origin`/`Host` de Next.js, et chacune commence par
  `requireUser()`/`requireAppUser()`.
- **Route Handlers** :

  | Route                | Méthodes  | Auth          | Effet de bord                    |
  | -------------------- | --------- | ------------- | -------------------------------- |
  | `/api/auth/[...all]` | GET, POST | Better Auth   | POST seulement, origine vérifiée |
  | `/api/photos`        | POST      | session       | oui, `isSameOrigin` obligatoire  |
  | `/api/photos/[id]`   | GET       | session+owner | aucun                            |
  | `/api/dishes/search` | GET       | session       | aucun                            |
  | `/api/export/csv`    | GET       | session       | aucun                            |
  | `/api/export/pdf`    | GET       | session       | aucun                            |
  | `/api/export/all`    | GET       | session       | aucun                            |

  Seul `GET /api/auth/get-session` prolonge l'expiration d'une session : pas
  d'effet exploitable.

### 4. Isolation stricte par utilisatrice

Toutes les requêtes Prisma de `src/server/**` filtrent par l'`userId` de la
session : lectures par `findFirst({ id, userId })`, écritures par
`updateMany`/`deleteMany({ id, userId })` (le compte retourné indique si la
ligne était à elle), fusions de plats dans une transaction qui vérifie les
deux plats. Une photo ne peut être rattachée qu'à un repas du même compte et
si elle est libre. Les identifiants des routes dynamiques sont validés par
Zod avant toute requête (`src/server/params.ts`). Prouvé par
`tests/integration/isolation.test.ts`.

### 5. Photos

- Stockées **hors de `public/`** (`PHOTOS_DIR`, dossier 700, fichiers 600),
  servies uniquement par `/api/photos/[id]` après contrôle de session et de
  propriété (404 identique pour « absente » et « pas à toi »).
- Type réel lu dans les **octets magiques** ; HEIC refusé avec un message.
- **10 Mo max**, compté pendant la réception (`src/server/body.ts`) même sans
  `Content-Length` ; Caddy limite à 12 Mo ; Server Actions et tampon du proxy
  limités à 1 Mo.
- **Réencodage WebP** avec redimensionnement (1600 px) et miniature (480 px),
  orientation appliquée, **toutes les métadonnées supprimées** (EXIF, GPS,
  XMP, ICC, IPTC — prouvé par `tests/integration/photos.test.ts`).
- Noms de fichiers aléatoires (`randomBytes(18)`, base64url), dossier par
  utilisatrice nettoyé, aucun chemin venant du client : pas de traversée de
  répertoire.

### 6. En-têtes HTTP

- Pages (proxy `src/proxy.ts`) : CSP à **nonce** par requête,
  `'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'none'`,
  `upgrade-insecure-requests` en https.
- Partout (`next.config.ts`) : HSTS 2 ans + preload, `nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
  COOP, **CORP same-origin**, `Permissions-Policy` (caméra : seulement
  l'appli). CSP de repli **sans aucun script** pour tout ce que le proxy ne
  voit pas (fichiers statiques, 404) ; CSP `default-src 'none'` pour
  `/api/*` ; CSP dédiée pour `/sw.js`.
- `style-src 'unsafe-inline'` reste nécessaire (Motion anime via `style`).

### 7. Validation des entrées et SQL

- Zod sur toutes les Server Actions, les paramètres de recherche et de
  période, les segments `[id]` et les paramètres des routes API.
- SQL brut uniquement en gabarits étiquetés (`$queryRaw`/`$executeRaw`),
  jamais `$queryRawUnsafe`/`$executeRawUnsafe` (motifs `LIKE` échappés).

### 8. Secrets

- Aucun secret dans le code : `.env.example` documenté,
  `npm run setup` (`scripts/setup-env.mjs`, fichier en 600) et l'entrypoint
  Docker (`/data/secrets.env`, 600) génèrent `BETTER_AUTH_SECRET`.
- Seul mot de passe en dur : celui du compte de démo (public, documenté), le
  seed refuse la production sans `DEMO_SEED_ALLOW_PRODUCTION=1`.

### 9. Journaux

- Pas de journalisation des requêtes Prisma.
- Les erreurs de validation Prisma (qui recopient tous les arguments : noms,
  notes, glycémies) sont remplacées par un message sans argument
  (`src/lib/db.ts`) avant que Next.js ne les journalise.
- Logger Better Auth : erreurs seulement, emails masqués, aucun argument
  supplémentaire (`src/lib/security/redact.ts`).
- `app/error.tsx` et `app/global-error.tsx` n'affichent jamais
  `error.message`.
- Caddy retire le paramètre de recherche `q` de ses journaux.

### 10. Sauvegardes

`scripts/backup.sh` travaille sous `umask 077` (dossiers 700, fichiers 600),
vérifie le dump et écrit des sommes de contrôle ; `scripts/restore.sh` vérifie
les sommes et fait une sauvegarde de sécurité avant de restaurer.
`scripts/backup-offsite.sh` chiffre la copie hors serveur avec age : le
serveur n'a que la clé publique, une fuite du serveur ou de la destination
n'expose donc aucune sauvegarde. Voir
[deploiement.md](deploiement.md#sauvegardes-et-restauration).

### 11. Dépendances

`npm audit --omit=dev` : 0 vulnérabilité. `mysql2` et `deepmerge-ts`
(dépendances de Prisma / Better Auth) sont forcés vers des versions
corrigées par `overrides` dans `package.json`. Voir les risques résiduels
pour l'avis restant (outil de développement).

### 12. Autres points vérifiés

- **Suppression du compte** et **export RGPD** : uniquement pour la session
  courante, mot de passe redemandé pour la suppression (échecs limités).
- Exports en `Cache-Control: no-store`, en pièce jointe ; CSV : cellules
  commençant (après d'éventuels espaces) par `= + - @` neutralisées.
- **Redirections** : `callbackURL` de Better Auth contrôlé par
  `trustedOrigins` (l'URL de l'appli) ; le proxy redirige toujours vers
  `/connexion` sans paramètre.
- **Service worker** (`public/sw.js`) : jamais `/api/*`, photos, payloads RSC
  ni HTML authentifié en cache ; seul `/hors-ligne` (public).
- **Saisie hors ligne** : un repas noté sans réseau est chiffré tout de suite
  dans le navigateur pour une clé publique P-256 du serveur (ECDH éphémère →
  HKDF-SHA-256 → AES-256-GCM, `src/lib/offline/envelope.ts`) puis rangé dans
  IndexedDB. L'appareil ne garde aucune clé capable de le relire : seul le
  serveur l'ouvre à la synchro, qui vérifie qu'il a été noté pour le compte
  connecté (`userId` dans le contenu chiffré) et ne crée jamais un repas deux
  fois (`Meal.clientId`). En clair dans IndexedDB : la clé publique, son id
  utilisateur et son unité de glycémie, effacés dès qu'une page « déconnectée »
  s'affiche.
- Déconnexion : `Clear-Site-Data: "cache"` (photos en cache privé).
- **Inscription** : `REGISTRATION_MODE` `closed` / `invite` / `open` ; code
  d'invitation **réservé atomiquement** avant la création du compte, libéré
  en cas d'échec.
- **Codes de secours** : 60 bits, hachés SHA-256, usage unique (mise à jour
  conditionnelle atomique), régénérés en bloc.
- **Énumération** : mêmes réponses à la connexion, à la récupération et à la
  demande de lien par email ; l'inscription demande un code d'invitation
  valable.
- Comparaisons de secrets : codes comparés par leur hachage en base (pas de
  comparaison caractère par caractère en JavaScript), mots de passe via
  argon2.

## Tests de sécurité

| Fichier                               | Ce qui est prouvé                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `tests/integration/isolation.test.ts` | B ne lit ni ne modifie rien de A : repas, photos, plats, suggestions, ratios, réglages, lente, exports, codes   |
| `tests/integration/photos.test.ts`    | GPS/EXIF/XMP/ICC supprimés, WebP, redimensionnement, noms aléatoires, pas de traversée, octets magiques         |
| `tests/integration/auth.test.ts`      | argon2id, nouveau jeton par connexion, erreurs identiques, verrouillage sous rafale, invitations à usage unique |
| `tests/integration/errors.test.ts`    | les erreurs Prisma ne recopient pas les données                                                                 |
| `tests/unit/security.test.ts`         | codes, verrouillage, IP depuis `X-Forwarded-For`, contrôle d'origine, masquage des journaux                     |
| `tests/unit/body.test.ts`             | arrêt de la lecture au-delà de la limite                                                                        |
| `tests/unit/export.test.ts`           | injection de formules CSV                                                                                       |
| `tests/e2e/auth.spec.ts`              | en-têtes sur pages / API / statiques / sw, inscription HTTP fermée, endpoints désactivés, cache vidé            |
| `tests/e2e/meal-entry.spec.ts`        | upload refusé hors origine ou si ce n'est pas une image                                                         |

Lancer : `npm run test:unit`, `npm run test:integration` (base
`INTEGRATION_DATABASE_URL`, par défaut `glucoperso_integration_test` sur le
Postgres de dev, créée au besoin), `npm run test:e2e`.

## Risques résiduels

- **Port 3000 exposé directement** : `X-Forwarded-For` devient forgeable et
  la limitation par IP de l'inscription et de la récupération contournable
  (le verrouillage par email reste). Garder `APP_BIND=127.0.0.1` derrière
  Caddy.
- **Verrouillage par email = déni de service possible** : quelqu'un qui
  connaît l'email peut bloquer la connexion jusqu'à 1 h. Compromis assumé ;
  la récupération par code reste possible (autre clé).
- **Rafale initiale** : des tentatives parallèles lancées avant que le
  premier échec soit compté passent toutes (au plus une poignée par IP
  avec la limite Better Auth) ; elles sont ensuite toutes comptées.
- **`style-src 'unsafe-inline'`** (Motion) : une injection HTML pourrait
  styler la page, pas exécuter de script.
- **Requêtes de préchargement** (`Next-Router-Prefetch`, `Purpose: prefetch`)
  ne passent pas par le proxy : réponses RSC sans nonce mais sous la CSP de
  repli sans script ; les pages revérifient la session.
- **Cache HTTP des photos** (privé, 1 an) sur l'appareil tant qu'elle reste
  connectée ; vidé à la déconnexion (`Clear-Site-Data`, contexte sécurisé
  requis).
- **Sessions** valables 30 jours (renouvelées chaque jour d'usage) ;
  l'ancienne session d'un autre appareil reste valable jusqu'à sa
  déconnexion ou à un changement de mot de passe.
- **Inscription** : avec un code d'invitation valable, l'échec « email déjà
  utilisé » se distingue d'un succès (inhérent à l'inscription) ; le code est
  libéré et les échecs sont limités par IP.
- **Pas de chiffrement applicatif** des données en base ni des photos sur
  disque : s'appuyer sur le chiffrement du disque du serveur.
- **`npm audit` (dev)** : `braces` (via `eslint-config-next` →
  `fast-glob`/`micromatch`) n'a pas de version corrigée ; outil de
  développement uniquement, absent de l'image de production.

## Check-list de l'opérateur

- [ ] `BETTER_AUTH_URL` en **https**, identique à l'URL tapée dans le
      navigateur.
- [ ] `BETTER_AUTH_SECRET` généré (32+ caractères), `.env` en `chmod 600`,
      jamais commité.
- [ ] Appli publiée sur `127.0.0.1` uniquement, Caddy (ou autre proxy) devant ;
      `TRUSTED_PROXIES` renseigné seulement s'il y a un proxy/CDN de plus.
- [ ] PostgreSQL sans port publié (réseau Docker interne).
- [ ] `REGISTRATION_MODE=closed` une fois les comptes créés.
- [ ] Sauvegardes quotidiennes (`scripts/schedule-backup.sh`), copie
      **chiffrée** hors du serveur (`BACKUP_OFFSITE`, clé privée age gardée
      ailleurs), restauration testée.
- [ ] Mises à jour : `git pull`, `docker compose up -d --build` ;
      `npm audit --omit=dev` propre.
- [ ] Journaux (`docker compose logs app`, Caddy) conservés peu longtemps et
      non partagés.
- [ ] Disque du serveur chiffré si possible (données et photos en clair sur
      disque).
- [ ] SMTP (optionnel) : identifiants dédiés, TLS.
