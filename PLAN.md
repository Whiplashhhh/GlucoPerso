# GlucoPerso — Plan

Appli web mobile-first (PWA) de suivi repas / insuline rapide, avec un ratio glucides/insuline adaptatif.
Ce document décrit l'architecture, le modèle de données, les écrans et l'ordre de travail.
Les choix ponctuels et leurs raisons sont consignés dans [`DECISIONS.md`](./DECISIONS.md).

## 1. Architecture

```
src/
  app/
    (auth)/connexion, inscription, recuperation      → pages publiques
    (onboarding)/bienvenue                            → onboarding 4 écrans + codes de récupération
    (app)/                                            → layout authentifié (nav basse, FAB +)
      page.tsx                                        → accueil (ratio héros, retours en attente, lente, mot du jour)
      repas/nouveau, repas/[id]                       → saisie / détail-édition d'un repas
      retour/[id]                                     → « Comment ça s'est passé ? »
      calendrier                                      → vue mois + jour
      recherche                                       → recherche globale
      plats, plats/[id]                               → bibliothèque « Mes plats »
      moi, moi/ratios, moi/evolution, moi/donnees     → paramètres, historique ratios, stats, export/RGPD
    api/
      auth/[...all]                                   → Better Auth
      photos (POST), photos/[id] (GET)                → upload + service authentifié
      dishes/search                                   → autocomplétion floue
      export/csv, export/pdf, export/all              → exports
    manifest.ts, icon, sw (public/sw.js)
  lib/
    ratio/        → algorithme pur du ratio adaptatif (100 % testé)
    dose.ts       → calcul indicatif de dose (pur)
    glucose.ts    → conversions g/L ↔ mg/dL, pré-sélection du résultat (pur)
    moments.ts    → moments de la journée (pur)
    validation/   → schémas Zod partagés client/serveur
    copy/         → microcopie (encouragements, mots du jour, salutations)
    photos/       → magic bytes + traitement sharp
    security/     → rate limiting / verrouillage progressif, vérification d'origine
    auth.ts, auth-client.ts, db.ts, env.ts
  server/
    session.ts    → requireUser() pour Server Components / Actions
    repos/        → accès données, TOUJOURS filtré par userId
    actions/      → Server Actions (Zod → repo)
  components/
    ui/           → primitives (Card, Button, Sheet, NumPad, Chip, Toast, Skeleton…)
    illustrations/→ SVG originaux (aliments mignons, nuages, étoiles)
    features…
prisma/
  schema.prisma, migrations/, seed.ts
tests/
  unit/ (Vitest), integration/ (Vitest + Postgres : isolation des données), e2e/ (Playwright)
docker/ Dockerfile, docker-compose.yml, Caddyfile, scripts/backup.sh, restore.sh
```

- **Rendu** : Server Components par défaut, Server Actions pour les mutations (protégées CSRF par Next : vérification Origin/Host), Client Components pour l'interactif.
- **Auth** : Better Auth email + mot de passe, sessions en base, hachage argon2id (`@node-rs/argon2`), cookies `httpOnly`/`Secure`/`SameSite=Lax`.
- **Données santé** : chaque fonction de `server/repos` prend `userId` en premier argument et filtre dessus. Aucune requête n'utilise un identifiant venant du client sans ce filtre.
- **Fuseau horaire** : stocké dans les paramètres (détecté au navigateur), utilisé pour le moment de la journée, le calendrier et « aujourd'hui ».

## 2. Modèle de données (Prisma / PostgreSQL)

| Modèle | Rôle | Champs clés |
|---|---|---|
| `User`, `Session`, `Account`, `Verification` | Better Auth | `name` = prénom |
| `UserSettings` | préférences | unité glycémie, incrément stylo, seuil hypo (g/L), seuil confirmation dose, bornes ratio, thème, fuseau, `onboardedAt` |
| `Ratio` | ratio courant par moment | `moment` (`DEFAULT`, `BREAKFAST`, `LUNCH`, `AFTERNOON_SNACK`, `DINNER`, `SNACK`), `gramsPerUnit` |
| `RatioChange` | historique | ancien, nouveau, origine (`ONBOARDING`/`MANUAL`/`SUGGESTION`), justification |
| `RatioSuggestion` | suggestions proposées | valeur actuelle/suggérée, repas concernés, statut, date (règle des 7 jours) |
| `Dish` | plat regroupé | `name`, `normalizedName` (index GIN trigram), `isFavorite` |
| `Meal` | repas | date, moment, glucides, unités, correction, glycémie avant, tags[], notes, résultat, glycémies après/min/max, hypo ressucrée, note de retour, `deletedAt` (annulation) |
| `Photo` | photo WebP | clé aléatoire, dimensions, propriétaire, repas |
| `BasalLog` | insuline lente | jour, unités, heure |
| `RecoveryCode` | codes de récupération | hash SHA-256, `usedAt` |
| `InviteCode` | invitations | hash, expiration, `usedAt` |
| `AuthThrottle` | verrouillage progressif | clé, échecs, `lockedUntil` |

Glycémies stockées en **g/L** (canonique), converties à l'affichage.

## 3. Écrans

1. Connexion / inscription (code d'invitation) / récupération (code ou email si SMTP).
2. Codes de récupération (affichés une fois, téléchargeables).
3. Onboarding : prénom → unité → stylo → ratios (+ par moment) → seuil hypo.
4. Accueil : salutation, carte ratio héros (swipe entre moments, confiance), cartes « Comment ça s'est passé ? », suggestion de ratio, lente du jour, mot du jour, mention médicale.
5. Saisie repas (bottom sheet plein écran) : photo, nom + « Déjà mangé », moment/date, pavé numérique glucides, calcul indicatif, unités, correction, glycémie avant, tags, notes, garde-fou.
6. Retour d'expérience : 3 grosses réponses, glycémies, hypo ressucrée, note, célébration.
7. Calendrier mois (swipe) + liste du jour + détail repas (édition, suppression avec annulation).
8. Recherche globale.
9. Mes plats + fiche plat (galerie, moyennes, meilleure dose, taux pile poil, notes, favoris, fusion).
10. Moi : paramètres, ratios + historique, thème, codes, export, suppression du compte.
11. Mon évolution : courbe des ratios, répartition des résultats, export CSV/PDF.

## 4. Ordre de travail (une branche + une PR par étape)

1. `chore/scaffold` — Next.js, TS strict, ESLint, Prettier, Husky, commitlint, Vitest, Playwright, CI GitHub Actions, Docker Postgres de dev.
2. `feat/auth` — Prisma, Better Auth, invitation, codes de récupération, rate limiting, onboarding, paramètres de base.
3. `feat/meal-entry` — saisie repas + photo + autocomplétion « Déjà mangé ».
4. `feat/meal-feedback` — retour d'expérience.
5. `feat/home` — accueil avec ratio héros.
6. `feat/calendar` — calendrier, détail, édition, suppression/annulation, recherche.
7. `feat/adaptive-ratio` — algorithme + tests 100 % + cartes de suggestion + historique.
8. `style/polish-1`, `style/polish-2` — deux passes de polish visuel avec captures Playwright.
9. `feat/dishes` — bibliothèque de plats.
10. `feat/demo-seed` — seed de démonstration.
11. `feat/basal-stats-export` — lente, stats, exports, RGPD.
12. `fix/security-review` — revue sécurité complète + tests d'isolation.
13. `chore/docker` — Dockerfile, compose, Caddyfile, sauvegardes, README, RAPPORT.

À chaque étape : `typecheck`, `lint`, `format:check`, tests et `build` passent (localement et en CI) avant fusion.

## 5. Todo

- [ ] Scaffold + outillage + CI
- [ ] Auth + onboarding
- [ ] Saisie repas + photo
- [ ] Retour d'expérience
- [ ] Accueil
- [ ] Calendrier + recherche
- [ ] Ratio adaptatif
- [ ] Polish passe 1
- [ ] Polish passe 2
- [ ] Mes plats
- [ ] Seed démo
- [ ] Lente, stats, exports
- [ ] Revue sécurité
- [ ] Docker, README, RAPPORT
