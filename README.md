# GlucoPerso 🍑

Ton carnet de repas et d'insuline, tout en douceur.

GlucoPerso est une appli web mobile-first (installable comme une appli) pour une personne
diabétique de type 1 sous stylos : noter un repas en moins de 30 secondes, dire comment ça s'est
passé, et voir son ratio « 1 U pour X g » s'affiner doucement au fil des retours. Toute
l'interface est en français, chaleureuse, sans jamais culpabiliser.

> Indications basées sur ton historique, à titre indicatif seulement. Ne remplace pas l'avis de
> ton équipe médicale.

## Fonctionnalités

- **Saisie express** : bouton « + » central, photo (appareil ou galerie), autocomplétion floue
  « Déjà mangé » avec rappel des notes, pavé numérique, dose indicative arrondie au stylo,
  correction séparée (exclue du ratio), glycémie avant, tags, garde-fou sur les grosses doses.
- **« Comment ça s'est passé ? »** 2 h après : trois réponses bienveillantes, glycémies
  facultatives qui pré-sélectionnent, hypo ressucrée, petite fête quand c'est pile poil.
- **Ratio adaptatif** : un ratio par moment de la journée, toujours visible en grand ; suggestions
  prudentes (±10 % max, jamais appliquées sans elle), historique complet, indicateur de confiance.
- **Calendrier** mensuel avec pastilles (forme + couleur), détail, modification, suppression
  annulable, recherche.
- **Mes plats** : regroupement automatique, favoris, dose qui a le mieux marché, fusion.
- **Lente du jour**, **Mon évolution** (courbes, répartition positive), **exports CSV/PDF** pour
  le diabéto, **export RGPD** complet et suppression du compte.
- **PWA** installable avec mode hors ligne prudent, mode sombre soigné, accessibilité (cibles
  48 px, `prefers-reduced-motion`, contraste AA).

## Stack

Next.js 16 (App Router) · TypeScript strict · PostgreSQL + Prisma 7 (`pg_trgm`) · Better Auth
(argon2id) · Tailwind CSS 4 · Motion · lucide-react · Recharts · Zod · sharp · Vitest · Playwright
· Docker + Caddy.

## Lancer en local

Prérequis : Node.js ≥ 22 (24 recommandé), Docker (pour PostgreSQL).

```bash
npm ci
npm run setup        # crée .env depuis .env.example et génère le secret de session
npm run db:up        # PostgreSQL de dev sur 127.0.0.1:5433
npm run db:migrate   # applique les migrations
npm run invite       # affiche un code d'invitation à usage unique
npm run dev          # http://localhost:3000 → « Créer mon carnet » avec le code
```

### Compte de démonstration

```bash
npm run seed:demo    # demo@demo.local / glucoperso-demo, 6 semaines de données
```

Détails dans [`docs/demo.md`](docs/demo.md). Le seed refuse de tourner en production.

## Créer un compte (code d'invitation)

L'appli est personnelle : `REGISTRATION_MODE=invite` par défaut (`open` pour des tests locaux,
`closed` pour fermer complètement). Chaque code est à usage unique, expire après 7 jours par défaut
et n'est stocké que haché :

```bash
npm run invite -- --days 3 --note "Pour Léa"     # en local
docker compose exec app invite --days 3          # en production
```

À l'inscription, 8 codes de récupération sont affichés **une seule fois** (à télécharger) : ils
permettent de choisir un nouveau mot de passe sans serveur mail. Si `SMTP_*` est configuré, la
réinitialisation par email est aussi proposée.

## Déploiement (Docker + Caddy)

```bash
cp .env.example .env            # DOMAIN, BETTER_AUTH_URL=https://…, mots de passe Postgres…
docker compose up -d --build    # app + postgres (+ volume photos), migrations au démarrage
docker compose --profile caddy up -d --build   # avec HTTPS automatique via Caddy
docker compose exec app invite  # premier code d'invitation
```

Le secret de session est généré au premier lancement et conservé dans le volume de données.
Guide complet (Caddy ou autre proxy, mise à jour, PWA) : [`docs/deploiement.md`](docs/deploiement.md).

## Sauvegardes

```bash
scripts/backup.sh                              # pg_dump + photos + secret, 14 dernières gardées
scripts/restore.sh backups/20261010T031500Z    # restauration (sauvegarde de sécurité d'abord)
scripts/backup-offsite.sh                      # copie chiffrée (age) hors du serveur : rsync, dossier monté ou rclone
scripts/schedule-backup.sh                     # tâche cron quotidienne (03:15)
```

Clé de chiffrement, destinations et procédure détaillée dans [`docs/deploiement.md`](docs/deploiement.md#sauvegardes-et-restauration).

## Sécurité

Données de santé : sessions en base avec cookies `httpOnly`/`Secure`/`SameSite=Lax`, verrouillage
progressif, CSP stricte à nonce, isolation par utilisatrice testée, photos hors du dossier public
ré-encodées sans métadonnées. Détails et risques résiduels : [`docs/securite.md`](docs/securite.md).

## Développement

| Commande                                      | Rôle                                           |
| --------------------------------------------- | ---------------------------------------------- |
| `npm run lint` / `format:check` / `typecheck` | Qualité (aussi en CI et en pre-commit)         |
| `npm run test:unit`                           | Logique métier (Vitest, ratio couvert à 100 %) |
| `npm run test:integration`                    | Isolation des données contre une vraie base    |
| `npm run test:e2e`                            | Parcours Playwright (mobile 390×844)           |
| `npm run screens`                             | Captures clair/sombre pour la revue visuelle   |
| `npm run icons`                               | Régénère icônes et écrans de démarrage         |

Flux Git : une branche par sujet, Pull Request, CI verte (lint, types, tests, build, e2e, image
Docker, titre conventionnel), fusion en squash. Messages au format Conventional Commits (vérifiés
par commitlint).

Documents : [`PLAN.md`](PLAN.md) · [`DECISIONS.md`](DECISIONS.md) · [`RAPPORT.md`](RAPPORT.md) ·
[`TODO.md`](TODO.md)
